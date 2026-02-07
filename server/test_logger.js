
import 'dotenv/config'; // Load .env file
import pool from './db/index.js';
import { logActivity, getActivityLogs } from './utils/logger.js';

async function testLogger() {
    try {
        console.log('Testing logger...');

        // 1. Fetch a valid user ID (admin) to use for logging
        const userRes = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (userRes.rows.length === 0) {
            console.error('No admin user found to test logging.');
            process.exit(1);
        }
        const userId = userRes.rows[0].id;
        console.log(`Using User ID: ${userId} for test log.`);

        // 2. Insert a test log
        const testAction = 'TEST_LOG_ENTRY';
        const testDetails = 'This is a test log entry to verify database insertion.';

        // logActivity is fire-and-forget, but for testing we want to wait a bit
        logActivity(userId, testAction, 'system', 0, testDetails);

        console.log('Log insertion triggered. Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 3. Fetch latest log by timestamp to check for "future" logs
        const result = await pool.query("SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 1");
        const found = result.rows[0];

        if (found) {
            console.log('✅ Latest log found!');
            console.log('Log timestamp (UTC):', found.timestamp);
            console.log('Current System Time (UTC):', new Date().toISOString());
        } else {
            console.error('❌ Log entry NOT found in database even by direct query.');
        }

        process.exit(0);

    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testLogger();
