import { Router } from 'express';
import pool from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireOrganiser } from '../middleware/rbac.js';
import { logActivity } from '../utils/logger.js';
import { broadcast } from '../index.js';

const router = Router();

// Get results for an event
router.get('/event/:eventId', async (req, res) => {
    try {
        const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.eventId]);
        const event = eventResult.rows[0];

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const resultsResult = await pool.query(`
            SELECT r.*, d.name as department_name, d.short_code
            FROM results r
            JOIN departments d ON r.department_id = d.id
            WHERE r.event_id = $1
            ORDER BY r.position ASC
        `, [req.params.eventId]);

        const matchesResult = await pool.query(`
            SELECT 
                m.*,
                COALESCE(m.team1_name, d1.name) as team1_name, d1.short_code as team1_code,
                COALESCE(m.team2_name, d2.name) as team2_name, d2.short_code as team2_code,
                w.name as winner_name, w.short_code as winner_code
            FROM matches m
            JOIN departments d1 ON m.team1_department_id = d1.id
            LEFT JOIN departments d2 ON m.team2_department_id = d2.id
            LEFT JOIN departments w ON m.winner_department_id = w.id
            WHERE m.event_id = $1
            ORDER BY m.id DESC
        `, [req.params.eventId]);

        res.json({ event, results: resultsResult.rows, matches: matchesResult.rows });
    } catch (error) {
        console.error('Error fetching event results:', error);
        res.status(500).json({ error: 'Failed to fetch event results' });
    }
});

// Get all individual results (Organiser+)
router.get('/', authenticateToken, requireOrganiser, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, e.name as event_name, s.name as sport_name, e.category, d.short_code as dept_code, d.name as dept_name
            FROM results r
            JOIN events e ON r.event_id = e.id
            JOIN sports s ON e.sport_id = s.id
            JOIN departments d ON r.department_id = d.id
            ORDER BY r.updated_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching results:', error);
        res.status(500).json({ error: 'Failed to fetch results' });
    }
});

// Add result for individual event (Organiser+)
router.post('/', authenticateToken, requireOrganiser, async (req, res) => {
    try {
        const { event_id, department_id, participant_name, position, score } = req.body;

        if (!event_id || !department_id || !participant_name || !position) {
            return res.status(400).json({ error: 'event_id, department_id, participant_name, and position are required' });
        }

        if (![1, 2, 3].includes(position)) {
            return res.status(400).json({ error: 'Position must be 1, 2, or 3' });
        }

        // Check if position already taken for this event
        const existingResult = await pool.query('SELECT * FROM results WHERE event_id = $1 AND position = $2', [event_id, position]);
        if (existingResult.rows.length > 0) {
            return res.status(400).json({ error: `Position ${position} already assigned for this event` });
        }

        const result = await pool.query(`
            INSERT INTO results (event_id, department_id, participant_name, position, score, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [event_id, department_id, participant_name, position, score, req.user.id]);

        // Update event status if all positions filled
        const countResult = await pool.query('SELECT COUNT(*) as count FROM results WHERE event_id = $1', [event_id]);
        const resultCount = parseInt(countResult.rows[0].count);
        if (resultCount >= 3) {
            await pool.query("UPDATE events SET status = 'completed' WHERE id = $1", [event_id]);
        } else {
            await pool.query("UPDATE events SET status = 'live' WHERE id = $1", [event_id]);
        }

        const medalType = position === 1 ? 'Gold' : position === 2 ? 'Silver' : 'Bronze';
        logActivity(req.user.id, 'ADD_RESULT', 'result', result.rows[0].id,
            `Added ${medalType} for ${participant_name} in event ${event_id}`);

        // Broadcast update to all connected clients
        broadcast({ type: 'result_added', event_id });

        res.status(201).json({ id: result.rows[0].id });
    } catch (error) {
        console.error('Error adding result:', error);
        res.status(500).json({ error: 'Failed to add result' });
    }
});

// Update result (Organiser+)
router.put('/:id', authenticateToken, requireOrganiser, async (req, res) => {
    try {
        const { department_id, participant_name, position, score } = req.body;

        const existingResult = await pool.query('SELECT * FROM results WHERE id = $1', [req.params.id]);
        const existing = existingResult.rows[0];
        if (!existing) {
            return res.status(404).json({ error: 'Result not found' });
        }

        await pool.query(`
            UPDATE results SET
                department_id = COALESCE($1, department_id),
                participant_name = COALESCE($2, participant_name),
                position = COALESCE($3, position),
                score = COALESCE($4, score),
                updated_by = $5,
                updated_at = NOW()
            WHERE id = $6
        `, [department_id, participant_name, position, score, req.user.id, req.params.id]);

        logActivity(req.user.id, 'UPDATE_RESULT', 'result', req.params.id,
            `Updated result for ${participant_name || existing.participant_name}`);

        broadcast({ type: 'result_updated', event_id: existing.event_id });
        res.json({ message: 'Result updated' });
    } catch (error) {
        console.error('Error updating result:', error);
        res.status(500).json({ error: 'Failed to update result' });
    }
});

// Delete result (Organiser+)
router.delete('/:id', authenticateToken, requireOrganiser, async (req, res) => {
    try {
        const existingResult = await pool.query('SELECT * FROM results WHERE id = $1', [req.params.id]);
        const existing = existingResult.rows[0];
        if (!existing) {
            return res.status(404).json({ error: 'Result not found' });
        }

        await pool.query('DELETE FROM results WHERE id = $1', [req.params.id]);

        // Update event status
        const countResult = await pool.query('SELECT COUNT(*) as count FROM results WHERE event_id = $1', [existing.event_id]);
        const resultCount = parseInt(countResult.rows[0].count);
        if (resultCount === 0) {
            await pool.query("UPDATE events SET status = 'upcoming' WHERE id = $1", [existing.event_id]);
        } else if (resultCount < 3) {
            await pool.query("UPDATE events SET status = 'live' WHERE id = $1", [existing.event_id]);
        }

        logActivity(req.user.id, 'DELETE_RESULT', 'result', req.params.id,
            `Deleted result for ${existing.participant_name}`);

        broadcast({ type: 'result_deleted', event_id: existing.event_id });
        res.json({ message: 'Result deleted' });
    } catch (error) {
        console.error('Error deleting result:', error);
        res.status(500).json({ error: 'Failed to delete result' });
    }
});

// Add/Update match result (Organiser+)
router.post('/match', authenticateToken, requireOrganiser, async (req, res) => {
    try {
        const { event_id, team1_department_id, team2_department_id, team1_name, team2_name, team1_score, team2_score, winner_department_id, match_type, status } = req.body;

        if (!event_id || !team1_department_id) {
            return res.status(400).json({ error: 'event_id and team 1 department are required' });
        }

        const result = await pool.query(`
            INSERT INTO matches (event_id, team1_department_id, team2_department_id, team1_name, team2_name, team1_score, team2_score, winner_department_id, match_type, status, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `, [
            event_id,
            team1_department_id,
            team2_department_id,
            team1_name || null,
            team2_name || null,
            team1_score,
            team2_score,
            winner_department_id,
            match_type || 'round1',
            status || 'upcoming',
            req.user.id
        ]);

        // Update event status
        if (status === 'live') {
            await pool.query("UPDATE events SET status = 'live' WHERE id = $1", [event_id]);
        }

        logActivity(req.user.id, 'ADD_MATCH', 'match', result.rows[0].id,
            `Added match for event ${event_id}`);

        broadcast({ type: 'match_added', event_id });
        res.status(201).json({ id: result.rows[0].id });
    } catch (error) {
        console.error('Error adding match:', error);
        res.status(500).json({ error: 'Failed to add match' });
    }
});

// Update match (Organiser+)
router.put('/match/:id', authenticateToken, requireOrganiser, async (req, res) => {
    try {
        const { team1_department_id, team2_department_id, team1_name, team2_name, match_type, team1_score, team2_score, winner_department_id, status } = req.body;

        const existingResult = await pool.query('SELECT * FROM matches WHERE id = $1', [req.params.id]);
        const existing = existingResult.rows[0];
        if (!existing) {
            return res.status(404).json({ error: 'Match not found' });
        }

        await pool.query(`
            UPDATE matches SET
                team1_department_id = COALESCE($1, team1_department_id),
                team2_department_id = COALESCE($2, team2_department_id),
                team1_name = COALESCE($3, team1_name),
                team2_name = COALESCE($4, team2_name),
                match_type = COALESCE($5, match_type),
                team1_score = COALESCE($6, team1_score),
                team2_score = COALESCE($7, team2_score),
                winner_department_id = COALESCE($8, winner_department_id),
                status = COALESCE($9, status),
                updated_by = $10,
                updated_at = NOW()
            WHERE id = $11
        `, [team1_department_id, team2_department_id, team1_name, team2_name, match_type, team1_score, team2_score, winner_department_id, status, req.user.id, req.params.id]);

        // Update event status based on match
        if (status === 'live') {
            await pool.query("UPDATE events SET status = 'live' WHERE id = $1", [existing.event_id]);
        }

        // Always try to clear existing auto-generated results for this match
        // This handles cases where a match is downgraded from Final -> Round 1, or winner changes
        await pool.query('DELETE FROM results WHERE match_id = $1', [req.params.id]);

        if (status === 'completed') {
            const updatedResult = await pool.query('SELECT * FROM matches WHERE id = $1', [req.params.id]);
            const updatedMatch = updatedResult.rows[0];

            if (updatedMatch && updatedMatch.winner_department_id) {
                const updateResult = async (deptId, name, position) => {
                    // Remove existing result for this position/event to avoid duplicates (safeguard)
                    await pool.query('DELETE FROM results WHERE event_id = $1 AND position = $2 AND match_id IS NULL', [updatedMatch.event_id, position]);

                    await pool.query(`
                        INSERT INTO results (event_id, department_id, participant_name, position, updated_by, match_id)
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `, [updatedMatch.event_id, deptId, name, position, req.user.id, req.params.id]);

                    const medal = position === 1 ? 'Gold' : position === 2 ? 'Silver' : 'Bronze';
                    logActivity(req.user.id, 'AUTO_MEDAL', 'result', null, `Auto-assigned ${medal} to ${name}`);

                    // Broadcast result creation so MedalTally updates
                    broadcast({ type: 'result_added', event_id: updatedMatch.event_id });
                };

                const matchTypeLower = (updatedMatch.match_type || '').toLowerCase();

                if (matchTypeLower === 'final') {
                    // Gold (Winner)
                    const winnerName = updatedMatch.winner_department_id === updatedMatch.team1_department_id
                        ? updatedMatch.team1_name
                        : updatedMatch.team2_name;
                    await updateResult(updatedMatch.winner_department_id, winnerName, 1);

                    // Silver (Loser)
                    const loserId = updatedMatch.winner_department_id === updatedMatch.team1_department_id
                        ? updatedMatch.team2_department_id
                        : updatedMatch.team1_department_id;

                    if (loserId) {
                        const loserName = updatedMatch.winner_department_id === updatedMatch.team1_department_id
                            ? updatedMatch.team2_name
                            : updatedMatch.team1_name;
                        await updateResult(loserId, loserName, 2);
                    }
                } else if (matchTypeLower === 'third_place' || matchTypeLower === 'thirdplace') {
                    // Bronze (Winner)
                    const winnerName = updatedMatch.winner_department_id === updatedMatch.team1_department_id
                        ? updatedMatch.team1_name
                        : updatedMatch.team2_name;
                    await updateResult(updatedMatch.winner_department_id, winnerName, 3);
                }
            }

            // Check if all matches for event are complete
            const pendingResult = await pool.query(`
                SELECT COUNT(*) as count FROM matches WHERE event_id = $1 AND status != 'completed'
            `, [existing.event_id]);
            const pendingMatches = parseInt(pendingResult.rows[0].count);

            if (pendingMatches === 0) {
                await pool.query("UPDATE events SET status = 'completed' WHERE id = $1", [existing.event_id]);
            }
        }

        logActivity(req.user.id, 'UPDATE_MATCH', 'match', req.params.id,
            `Updated match ${req.params.id}`);

        broadcast({ type: 'match_updated', event_id: existing.event_id });
        res.json({ message: 'Match updated' });
    } catch (error) {
        console.error('Error updating match:', error);
        res.status(500).json({ error: 'Failed to update match' });
    }
});

// Delete match (Organiser+)
router.delete('/match/:id', authenticateToken, requireOrganiser, async (req, res) => {
    try {
        const existingResult = await pool.query('SELECT * FROM matches WHERE id = $1', [req.params.id]);
        const existing = existingResult.rows[0];
        if (!existing) {
            return res.status(404).json({ error: 'Match not found' });
        }

        await pool.query('DELETE FROM matches WHERE id = $1', [req.params.id]);

        logActivity(req.user.id, 'DELETE_MATCH', 'match', req.params.id,
            `Deleted match ${req.params.id}`);

        broadcast({ type: 'match_deleted', event_id: existing.event_id });
        res.json({ message: 'Match deleted' });
    } catch (error) {
        console.error('Error deleting match:', error);
        res.status(500).json({ error: 'Failed to delete match' });
    }
});

// Update event status (Organiser+)
router.put('/event/:eventId/status', authenticateToken, requireOrganiser, async (req, res) => {
    try {
        const { status } = req.body;

        if (!['upcoming', 'live', 'completed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await pool.query('UPDATE events SET status = $1 WHERE id = $2', [status, req.params.eventId]);

        logActivity(req.user.id, 'UPDATE_EVENT_STATUS', 'event', req.params.eventId,
            `Changed event status to ${status}`);

        broadcast({ type: 'event_status_changed', event_id: req.params.eventId });
        res.json({ message: 'Event status updated' });
    } catch (error) {
        console.error('Error updating event status:', error);
        res.status(500).json({ error: 'Failed to update event status' });
    }
});

export default router;
