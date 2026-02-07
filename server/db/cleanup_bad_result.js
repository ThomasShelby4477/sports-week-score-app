
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function cleanup() {
    try {
        console.log('Cleaning up incorrect result...');
        const res = await pool.query("DELETE FROM results WHERE participant_name LIKE '%Varun%' AND position = 3");
        console.log('Deleted rows:', res.rowCount);
    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        await pool.end();
    }
}

cleanup();
