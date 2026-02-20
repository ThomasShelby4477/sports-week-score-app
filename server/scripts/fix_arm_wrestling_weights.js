/**
 * Fix Arm Wrestling weight categories:
 * - Rename "Above 80kg" → "80-90kg"
 * - Add "Above 90kg" for boys & girls
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

        // Rename "Above 80kg" → "80-90kg"
        const renamed = await client.query(
            `UPDATE events SET name = '80-90kg' WHERE sport_id = 13 AND name = 'Above 80kg' RETURNING id, category`
        );
        renamed.rows.forEach(r => console.log(`✅ Renamed "Above 80kg" → "80-90kg" (${r.category}) id=${r.id}`));

        // Add "Above 90kg" for boys & girls
        for (const gender of ['boys', 'girls']) {
            const exists = await client.query(
                `SELECT id FROM events WHERE sport_id = 13 AND name = 'Above 90kg' AND category = $1`, [gender]
            );
            if (exists.rows.length === 0) {
                const res = await client.query(
                    `INSERT INTO events (sport_id, name, category, event_type, status) VALUES (13, 'Above 90kg', $1, 'individual', 'upcoming') RETURNING id`,
                    [gender]
                );
                console.log(`✅ Added "Above 90kg" (${gender}) → id=${res.rows[0].id}`);
            } else {
                console.log(`⏭️  "Above 90kg" (${gender}) already exists → id=${exists.rows[0].id}`);
            }
        }

        await client.query('COMMIT');
        console.log('\n✅ Done! Categories are now: Below 60kg, 60-70kg, 70-80kg, 80-90kg, Above 90kg');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

fix();
