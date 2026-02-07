import { Router } from 'express';
import pool from '../db/index.js';
import { cache } from '../utils/cache.js';

const router = Router();

// Get all individual medal winners with sport/event info
router.get('/winners', async (req, res) => {
    try {
        const cachedKey = 'medal_winners';
        const cachedData = cache.get(cachedKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const result = await pool.query(`
            SELECT 
                r.id,
                r.participant_name,
                r.position,
                r.score,
                d.short_code as dept_code,
                d.name as dept_name,
                e.name as event_name,
                e.category,
                s.name as sport_name,
                s.icon as sport_icon
            FROM results r
            JOIN departments d ON r.department_id = d.id
            JOIN events e ON r.event_id = e.id
            JOIN sports s ON e.sport_id = s.id
            ORDER BY r.position ASC, s.name ASC, e.name ASC
        `);

        const winners = result.rows;
        const responseData = {
            gold: winners.filter(w => w.position === 1),
            silver: winners.filter(w => w.position === 2),
            bronze: winners.filter(w => w.position === 3)
        };

        cache.set(cachedKey, responseData);
        res.json(responseData);
    } catch (error) {
        console.error('Error fetching winners:', error);
        res.status(500).json({ error: 'Failed to fetch winners' });
    }
});

// Get overall medal tally by department
router.get('/', async (req, res) => {
    try {
        const cachedKey = 'medal_tally';
        const cachedData = cache.get(cachedKey);
        if (cachedData) {
            return res.json(cachedData);
        }

        const result = await pool.query(`
            SELECT 
                d.id,
                d.name,
                d.short_code,
                COALESCE(SUM(CASE WHEN r.position = 1 THEN 1 ELSE 0 END), 0)::int as gold,
                COALESCE(SUM(CASE WHEN r.position = 2 THEN 1 ELSE 0 END), 0)::int as silver,
                COALESCE(SUM(CASE WHEN r.position = 3 THEN 1 ELSE 0 END), 0)::int as bronze,
                COALESCE(SUM(CASE WHEN r.position IN (1,2,3) THEN 1 ELSE 0 END), 0)::int as total
            FROM departments d
            LEFT JOIN results r ON d.id = r.department_id
            GROUP BY d.id, d.name, d.short_code
            ORDER BY gold DESC, silver DESC, bronze DESC, d.name ASC
        `);

        cache.set(cachedKey, result.rows);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching medal tally:', error);
        res.status(500).json({ error: 'Failed to fetch medal tally' });
    }
});

// Get medal tally for a specific sport
router.get('/sport/:sportId', async (req, res) => {
    try {
        const sportResult = await pool.query('SELECT * FROM sports WHERE id = $1', [req.params.sportId]);
        const sport = sportResult.rows[0];

        if (!sport) {
            return res.status(404).json({ error: 'Sport not found' });
        }

        const result = await pool.query(`
            SELECT 
                d.id,
                d.name,
                d.short_code,
                COALESCE(SUM(CASE WHEN r.position = 1 THEN 1 ELSE 0 END), 0)::int as gold,
                COALESCE(SUM(CASE WHEN r.position = 2 THEN 1 ELSE 0 END), 0)::int as silver,
                COALESCE(SUM(CASE WHEN r.position = 3 THEN 1 ELSE 0 END), 0)::int as bronze,
                COALESCE(SUM(CASE WHEN r.position IN (1,2,3) THEN 1 ELSE 0 END), 0)::int as total
            FROM departments d
            LEFT JOIN results r ON d.id = r.department_id
            LEFT JOIN events e ON r.event_id = e.id
            WHERE e.sport_id = $1 OR e.sport_id IS NULL
            GROUP BY d.id, d.name, d.short_code
            HAVING COALESCE(SUM(CASE WHEN r.position IN (1,2,3) THEN 1 ELSE 0 END), 0) > 0
            ORDER BY gold DESC, silver DESC, bronze DESC, d.name ASC
        `, [req.params.sportId]);

        res.json({ sport, medals: result.rows });
    } catch (error) {
        console.error('Error fetching sport medals:', error);
        res.status(500).json({ error: 'Failed to fetch sport medals' });
    }
});

export default router;
