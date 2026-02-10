import { Router } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin, requireOrganiser } from '../middleware/rbac.js';
import { logActivity, getActivityLogs } from '../utils/logger.js';
import { broadcast } from '../index.js';
import { cache } from '../utils/cache.js';

const router = Router();

// Get all users (Admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, username, role, display_name, created_at 
            FROM users 
            ORDER BY role, username
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create user (Admin only)
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { username, password, role, display_name } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ error: 'Username, password, and role are required' });
        }

        if (!['admin', 'organiser'].includes(role)) {
            return res.status(400).json({ error: 'Role must be admin or organiser' });
        }

        const existingResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingResult.rows.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(`
            INSERT INTO users (username, password_hash, role, display_name)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, [username, hash, role, display_name || username]);

        logActivity(req.user.id, 'CREATE_USER', 'user', result.rows[0].id,
            `Created ${role} user: ${username}`);

        res.status(201).json({ id: result.rows[0].id, username, role });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user (Admin only)
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { password, role, display_name } = req.body;

        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let hash = null;
        if (password) {
            hash = await bcrypt.hash(password, 10);
        }

        await pool.query(`
            UPDATE users SET
                password_hash = COALESCE($1, password_hash),
                role = COALESCE($2, role),
                display_name = COALESCE($3, display_name)
            WHERE id = $4
        `, [hash, role, display_name, req.params.id]);

        logActivity(req.user.id, 'UPDATE_USER', 'user', req.params.id,
            `Updated user: ${user.username}`);

        res.json({ message: 'User updated' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user (Admin only)
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        const user = userResult.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent deleting self
        if (user.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // Helper to nullify references or delete dependent records
        await pool.query('DELETE FROM activity_logs WHERE user_id = $1', [req.params.id]);
        await pool.query('UPDATE results SET updated_by = NULL WHERE updated_by = $1', [req.params.id]);
        await pool.query('UPDATE matches SET updated_by = NULL WHERE updated_by = $1', [req.params.id]);

        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);

        logActivity(req.user.id, 'DELETE_USER', 'user', req.params.id,
            `Deleted user: ${user.username}`);

        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get departments
router.get('/departments', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM departments ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// Create department (Admin only)
router.post('/departments', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, short_code } = req.body;

        if (!name || !short_code) {
            return res.status(400).json({ error: 'Name and short_code are required' });
        }

        const result = await pool.query(
            'INSERT INTO departments (name, short_code) VALUES ($1, $2) RETURNING id',
            [name, short_code]
        );

        logActivity(req.user.id, 'CREATE_DEPARTMENT', 'department', result.rows[0].id,
            `Created department: ${name}`);

        cache.clear();
        res.status(201).json({ id: result.rows[0].id, name, short_code });
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ error: 'Failed to create department' });
    }
});

// Update department (Admin only)
router.put('/departments/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, short_code } = req.body;

        const deptResult = await pool.query('SELECT * FROM departments WHERE id = $1', [req.params.id]);
        const dept = deptResult.rows[0];
        if (!dept) {
            return res.status(404).json({ error: 'Department not found' });
        }

        await pool.query(`
            UPDATE departments SET
                name = COALESCE($1, name),
                short_code = COALESCE($2, short_code)
            WHERE id = $3
        `, [name, short_code, req.params.id]);

        logActivity(req.user.id, 'UPDATE_DEPARTMENT', 'department', req.params.id,
            `Updated department: ${name || dept.name}`);

        cache.clear();
        res.json({ message: 'Department updated' });
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ error: 'Failed to update department' });
    }
});

// Delete department (Admin only)
router.delete('/departments/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const deptResult = await pool.query('SELECT * FROM departments WHERE id = $1', [req.params.id]);
        const dept = deptResult.rows[0];
        if (!dept) {
            return res.status(404).json({ error: 'Department not found' });
        }

        await pool.query('DELETE FROM departments WHERE id = $1', [req.params.id]);

        logActivity(req.user.id, 'DELETE_DEPARTMENT', 'department', req.params.id,
            `Deleted department: ${dept.name}`);

        cache.clear();
        res.json({ message: 'Department deleted' });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ error: 'Failed to delete department' });
    }
});

// Get activity logs (Admin only)
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = await getActivityLogs(limit);
        res.json(logs);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// Get all events (Organiser+)
router.get('/events', authenticateToken, requireOrganiser, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.*, s.name as sport_name, s.day
            FROM events e
            JOIN sports s ON e.sport_id = s.id
            ORDER BY s.day, s.name, e.category, e.name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Create event (Admin only)
router.post('/events', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { sport_id, name, category, event_type } = req.body;

        if (!sport_id || !name || !category) {
            return res.status(400).json({ error: 'sport_id, name, and category are required' });
        }

        const result = await pool.query(`
            INSERT INTO events (sport_id, name, category, event_type, status)
            VALUES ($1, $2, $3, $4, 'upcoming')
            RETURNING id
        `, [sport_id, name, category, event_type || 'individual']);

        logActivity(req.user.id, 'CREATE_EVENT', 'event', result.rows[0].id,
            `Created event: ${name} (${category})`);

        cache.clear();
        res.status(201).json({ id: result.rows[0].id });
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// Get all sports with visibility status (Admin only)
router.get('/sports', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, day, icon, fixtures_visible, visible_rounds
            FROM sports
            ORDER BY day, name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching sports:', error);
        res.status(500).json({ error: 'Failed to fetch sports' });
    }
});

// Toggle sport fixtures visibility (Admin only)
router.put('/sports/:id/visibility', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { visible, visible_rounds } = req.body;

        const sportResult = await pool.query('SELECT * FROM sports WHERE id = $1', [req.params.id]);
        const sport = sportResult.rows[0];
        if (!sport) {
            return res.status(404).json({ error: 'Sport not found' });
        }

        // Update specific rounds visibility if provided
        if (visible_rounds !== undefined) {
            await pool.query('UPDATE sports SET visible_rounds = $1 WHERE id = $2', [visible_rounds, req.params.id]);
            logActivity(req.user.id, 'UPDATE_VISIBILITY', 'sport', req.params.id,
                `Updated visible rounds for ${sport.name} to: ${visible_rounds}`);
        }

        // Update master visibility if provided, or toggle if nothing else provided
        let newVisibility = sport.fixtures_visible;
        if (visible !== undefined) {
            newVisibility = visible;
            await pool.query('UPDATE sports SET fixtures_visible = $1 WHERE id = $2', [newVisibility, req.params.id]);

            logActivity(req.user.id, 'TOGGLE_VISIBILITY', 'sport', req.params.id,
                `${newVisibility ? 'Showed' : 'Hid'} fixtures for: ${sport.name}`);
        } else if (visible_rounds === undefined) {
            // Toggle logic (only if no specific updates were requested)
            newVisibility = !sport.fixtures_visible;
            await pool.query('UPDATE sports SET fixtures_visible = $1 WHERE id = $2', [newVisibility, req.params.id]);

            logActivity(req.user.id, 'TOGGLE_VISIBILITY', 'sport', req.params.id,
                `${newVisibility ? 'Showed' : 'Hid'} fixtures for: ${sport.name}`);
        }

        const updatedResult = await pool.query('SELECT * FROM sports WHERE id = $1', [req.params.id]);
        const updatedSport = updatedResult.rows[0];

        // Broadcast visibility change to all clients
        broadcast({ type: 'visibility_changed', sport_id: req.params.id });

        cache.clear();
        res.json({
            message: 'Visibility updated',
            fixtures_visible: updatedSport.fixtures_visible,
            visible_rounds: updatedSport.visible_rounds
        });
    } catch (error) {
        console.error('Error updating visibility:', error);
        res.status(500).json({ error: 'Failed to update visibility' });
    }
});

// Get all matches for organiser panel (ignores visibility)
router.get('/matches', authenticateToken, requireOrganiser, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                m.*,
                e.name as event_name,
                s.name as sport_name,
                COALESCE(NULLIF(m.team1_name, ''), d1.name) as team1_name, d1.short_code as team1_code,
                COALESCE(NULLIF(m.team2_name, ''), d2.name) as team2_name, d2.short_code as team2_code,
                w.name as winner_name, w.short_code as winner_code
            FROM matches m
            JOIN events e ON m.event_id = e.id
            JOIN sports s ON e.sport_id = s.id
            JOIN departments d1 ON m.team1_department_id = d1.id
            LEFT JOIN departments d2 ON m.team2_department_id = d2.id
            LEFT JOIN departments w ON m.winner_department_id = w.id
            ORDER BY s.name ASC, m.status, m.id DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching matches:', error);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

export default router;
