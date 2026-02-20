/**
 * Fix girls' Arm Wrestling weight categories:
 * Remove: Below 60kg, 60-70kg, 70-80kg, 80-90kg, Above 90kg
 * Add:    Under 50kg, 50-60kg, 60-70kg, 70-80kg, Above 80kg
 */
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fix() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Remove old girls events that don't match new categories
        const oldNames = ['Below 60kg', '80-90kg', 'Above 90kg'];
        for (const name of oldNames) {
            const ev = await client.query(
                `SELECT id FROM events WHERE sport_id = 13 AND name = $1 AND category = 'girls'`, [name]
            );
            if (ev.rows.length > 0) {
                const rc = await client.query(`SELECT COUNT(*) as c FROM results WHERE event_id = $1`, [ev.rows[0].id]);
                const mc = await client.query(`SELECT COUNT(*) as c FROM matches WHERE event_id = $1`, [ev.rows[0].id]);
                if (parseInt(rc.rows[0].c) === 0 && parseInt(mc.rows[0].c) === 0) {
                    await client.query(`DELETE FROM events WHERE id = $1`, [ev.rows[0].id]);
                    console.log(`🗑️  Deleted girls "${name}" (id=${ev.rows[0].id})`);
                } else {
                    console.log(`⚠️  Skipping girls "${name}" — has data`);
                }
            }
        }

        // Add new girls events
        const newNames = ['Under 50kg', '50-60kg', '60-70kg', '70-80kg', 'Above 80kg'];
        for (const name of newNames) {
            const exists = await client.query(
                `SELECT id FROM events WHERE sport_id = 13 AND name = $1 AND category = 'girls'`, [name]
            );
            if (exists.rows.length === 0) {
                const res = await client.query(
                    `INSERT INTO events (sport_id, name, category, event_type, status) VALUES (13, $1, 'girls', 'individual', 'upcoming') RETURNING id`,
                    [name]
                );
                console.log(`✅ Added girls "${name}" → id=${res.rows[0].id}`);
            } else {
                console.log(`⏭️  Girls "${name}" already exists → id=${exists.rows[0].id}`);
            }
        }

        await client.query('COMMIT');
        console.log('\n✅ Girls categories: Under 50kg, 50-60kg, 60-70kg, 70-80kg, Above 80kg');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fix();
