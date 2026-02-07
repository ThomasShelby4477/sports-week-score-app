
import 'dotenv/config';
import pool from './db/index.js';

async function fixTimestamps() {
    try {
        console.log('Fixing timestamps...');

        // 1. Find the ID of the test log (the first "correct" log)
        const res = await pool.query("SELECT id FROM activity_logs WHERE action = 'TEST_LOG_ENTRY' ORDER BY id ASC LIMIT 1");

        let cutoffId;
        if (res.rows.length > 0) {
            cutoffId = res.rows[0].id;
            console.log(`Found cut-off ID: ${cutoffId}. Fixing logs with ID < ${cutoffId}...`);
        } else {
            console.log('Test log not found. Fixing ALL logs (assuming all are old)...');
            // If no test log, maybe fix all? Risky if new logs are flowing in.
            // Let's rely on timeframe. Any log > 5 hours in future?
            // Safer: update logs where timestamp > NOW() + 1 hour?
        }

        // Strategy 2: Check for logs in the future.
        // If a log is > current time + 10 mins, it's definitely wrong.
        const futureRes = await pool.query("SELECT count(*) FROM activity_logs WHERE timestamp > NOW() + INTERVAL '10 minutes'");
        const futureCount = parseInt(futureRes.rows[0].count);
        console.log(`Found ${futureCount} logs in the future.`);

        if (futureCount > 0) {
            const updateRes = await pool.query(`
                UPDATE activity_logs 
                SET timestamp = timestamp - INTERVAL '5 hours 30 minutes' 
                WHERE timestamp > NOW() + INTERVAL '10 minutes'
            `);
            console.log(`✅ Fixed timestamps for ${updateRes.rowCount} logs.`);
        } else {
            console.log('No future logs found. Maybe they are not that far in future?');
            // Fallback: Use the cut-off ID if available
            if (cutoffId) {
                const updateRes = await pool.query(`
                    UPDATE activity_logs 
                    SET timestamp = timestamp - INTERVAL '5 hours 30 minutes' 
                    WHERE id < $1
                `, [cutoffId]);
                console.log(`✅ Fixed timestamps for ${updateRes.rowCount} logs using ID cutoff.`);
            }
        }

        process.exit(0);

    } catch (error) {
        console.error('Fix failed:', error);
        process.exit(1);
    }
}

fixTimestamps();
