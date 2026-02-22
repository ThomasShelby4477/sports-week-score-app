import { Router } from 'express';
import pool from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { logActivity } from '../utils/logger.js';

import { cache } from '../utils/cache.js';

const router = Router();

// Get all sports grouped by day
router.get('/', async (req, res) => {
    try {
        const cachedParams = 'all_sports';
        const cachedData = cache.get(cachedParams);
        if (cachedData) {
            return res.json(cachedData);
        }

        const result = await pool.query(`
            SELECT 
                s.*,
                (SELECT COUNT(*) FROM events e WHERE e.sport_id = s.id AND e.status = 'live')::int as live_events,
                (SELECT COUNT(*) FROM events e WHERE e.sport_id = s.id AND e.status = 'completed')::int as completed_events,
                (SELECT COUNT(*) FROM events e WHERE e.sport_id = s.id)::int as total_events
            FROM sports s
            ORDER BY s.day, s.name
        `);

        // Calculate overall status for each sport
        const sportsWithStatus = result.rows.map(sport => {
            let status = 'upcoming';
            if (sport.live_events > 0) {
                status = 'live';
            } else if (sport.completed_events === sport.total_events && sport.total_events > 0) {
                status = 'completed';
            }
            return { ...sport, status };
        });

        // Group by day
        const day1 = sportsWithStatus.filter(s => s.day === 1);
        const day2 = sportsWithStatus.filter(s => s.day === 2);

        const responseData = { day1, day2 };
        cache.set(cachedParams, responseData);

        res.json(responseData);
    } catch (error) {
        console.error('Error fetching sports:', error);
        res.status(500).json({ error: 'Failed to fetch sports' });
    }
});

// Get single sport with all events and results
router.get('/:id', async (req, res) => {
    try {
        const sportId = req.params.id;
        const cachedKey = `sport_${sportId}`;
        const cachedData = cache.get(cachedKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const sportResult = await pool.query('SELECT * FROM sports WHERE id = $1', [sportId]);
        const sport = sportResult.rows[0];

        if (!sport) {
            // Don't cache 404s
            return res.status(404).json({ error: 'Sport not found' });
        }

        // Get all events for this sport
        const eventsResult = await pool.query(`
            SELECT * FROM events WHERE sport_id = $1 ORDER BY category, id
        `, [sportId]);

        // Get results for each event
        const eventsWithResults = await Promise.all(eventsResult.rows.map(async event => {
            const resultsResult = await pool.query(`
                SELECT r.*, d.name as department_name, d.short_code
                FROM results r
                JOIN departments d ON r.department_id = d.id
                WHERE r.event_id = $1
                ORDER BY r.position ASC
            `, [event.id]);

            // For team events, get matches - but only if fixtures are visible AND specific rounds are permitted
            let matches = [];
            if (sport.fixtures_visible && sport.visible_rounds) {
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
                    ORDER BY m.match_type DESC, m.id DESC
                `, [event.id]);

                const allowedRounds = sport.visible_rounds.split(',');
                matches = matchesResult.rows.filter(m => allowedRounds.includes(m.match_type));
            }

            return { ...event, results: resultsResult.rows, matches };
        }));

        // Separate by category
        const boysEvents = eventsWithResults.filter(e => e.category === 'boys');
        const girlsEvents = eventsWithResults.filter(e => e.category === 'girls');
        const mixedEvents = eventsWithResults.filter(e => e.category === 'mixed');

        const responseData = {
            sport,
            events: {
                boys: boysEvents,
                girls: girlsEvents,
                mixed: mixedEvents
            }
        };

        cache.set(cachedKey, responseData);
        res.json(responseData);
    } catch (error) {
        console.error('Error fetching sport:', error);
        res.status(500).json({ error: 'Failed to fetch sport' });
    }
});

// Create sport (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, day, icon, has_gender_categories, boys_only, girls_only } = req.body;

        if (!name || !day) {
            return res.status(400).json({ error: 'Name and day are required' });
        }

        const result = await pool.query(`
            INSERT INTO sports (name, day, icon, has_gender_categories, boys_only, girls_only)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [name, day, icon || '🏆', has_gender_categories ?? true, boys_only ?? false, girls_only ?? false]);

        logActivity(req.user.id, 'CREATE_SPORT', 'sport', result.rows[0].id, `Created sport: ${name}`);

        res.status(201).json({ id: result.rows[0].id, name, day });
    } catch (error) {
        console.error('Error creating sport:', error);
        res.status(500).json({ error: 'Failed to create sport' });
    }
});

// Update sport (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, day, icon, has_gender_categories, boys_only, girls_only } = req.body;

        const sportResult = await pool.query('SELECT * FROM sports WHERE id = $1', [req.params.id]);
        const sport = sportResult.rows[0];
        if (!sport) {
            return res.status(404).json({ error: 'Sport not found' });
        }

        await pool.query(`
            UPDATE sports SET 
                name = COALESCE($1, name),
                day = COALESCE($2, day),
                icon = COALESCE($3, icon),
                has_gender_categories = COALESCE($4, has_gender_categories),
                boys_only = COALESCE($5, boys_only),
                girls_only = COALESCE($6, girls_only)
            WHERE id = $7
        `, [name, day, icon, has_gender_categories, boys_only, girls_only, req.params.id]);

        logActivity(req.user.id, 'UPDATE_SPORT', 'sport', req.params.id, `Updated sport: ${name || sport.name}`);

        res.json({ message: 'Sport updated' });
    } catch (error) {
        console.error('Error updating sport:', error);
        res.status(500).json({ error: 'Failed to update sport' });
    }
});

// Delete sport (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const sportResult = await pool.query('SELECT * FROM sports WHERE id = $1', [req.params.id]);
        const sport = sportResult.rows[0];
        if (!sport) {
            return res.status(404).json({ error: 'Sport not found' });
        }

        await pool.query('DELETE FROM sports WHERE id = $1', [req.params.id]);

        logActivity(req.user.id, 'DELETE_SPORT', 'sport', req.params.id, `Deleted sport: ${sport.name}`);

        res.json({ message: 'Sport deleted' });
    } catch (error) {
        console.error('Error deleting sport:', error);
        res.status(500).json({ error: 'Failed to delete sport' });
    }
});

export default router;
