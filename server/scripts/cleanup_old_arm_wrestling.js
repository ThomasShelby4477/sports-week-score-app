/**
 * Remove old generic "Arm Wrestling" events (boys & girls)
 * These are replaced by weight-category events (Below 60kg, 60-70kg, etc.)
 * 
 * Safety: Only deletes events named exactly "Arm Wrestling" for sport_id=13.
 * Checks for attached results/matches first and warns if any exist.
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
        // Find old generic "Arm Wrestling" events
        const oldEvents = await client.query(
            `SELECT e.id, e.name, e.category FROM events e WHERE e.sport_id = 13 AND e.name = 'Arm Wrestling'`
        );

        if (oldEvents.rows.length === 0) {
            console.log('✅ No old "Arm Wrestling" events found — already cleaned up.');
            return;
        }

        console.log(`Found ${oldEvents.rows.length} old "Arm Wrestling" event(s):`);
        for (const ev of oldEvents.rows) {
            // Check for attached results and matches
            const results = await client.query(`SELECT COUNT(*) as count FROM results WHERE event_id = $1`, [ev.id]);
            const matches = await client.query(`SELECT COUNT(*) as count FROM matches WHERE event_id = $1`, [ev.id]);

            const resultCount = parseInt(results.rows[0].count);
            const matchCount = parseInt(matches.rows[0].count);

            console.log(`  Event id=${ev.id}: "${ev.name}" (${ev.category}) — ${resultCount} results, ${matchCount} matches`);

            if (resultCount > 0 || matchCount > 0) {
                console.log(`  ⚠️  Skipping deletion — has attached data!`);
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
