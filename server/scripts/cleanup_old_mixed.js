/**
 * Remove old "mixed" events for Chess (sport_id=9) and Carrom (sport_id=10)
 * These are replaced by boys/girls events.
 * Only deletes if no results/matches are attached.
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

async function cleanup() {
    const client = await pool.connect();
    try {
        const oldEvents = await client.query(
            `SELECT e.id, e.name, e.category, s.name as sport_name
             FROM events e JOIN sports s ON e.sport_id = s.id
             WHERE e.sport_id IN (9, 10) AND e.category = 'mixed'`
        );

        if (oldEvents.rows.length === 0) {
            console.log('✅ No old mixed events found — already cleaned up.');
            return;
        }

        console.log(`Found ${oldEvents.rows.length} old mixed event(s):\n`);
        for (const ev of oldEvents.rows) {
            const results = await client.query(`SELECT COUNT(*) as count FROM results WHERE event_id = $1`, [ev.id]);
            const matches = await client.query(`SELECT COUNT(*) as count FROM matches WHERE event_id = $1`, [ev.id]);
            const rc = parseInt(results.rows[0].count);
            const mc = parseInt(matches.rows[0].count);

            console.log(`  [${ev.sport_name}] "${ev.name}" (${ev.category}) id=${ev.id} — ${rc} results, ${mc} matches`);

            if (rc > 0 || mc > 0) {
                console.log(`  ⚠️  Skipping — has attached data!`);
            } else {
                await client.query(`DELETE FROM events WHERE id = $1`, [ev.id]);
                console.log(`  🗑️  Deleted.`);
            }
        }
        console.log('\n✅ Cleanup complete.');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanup();
