import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Helper function for queries
export async function query(text, params) {
    const result = await pool.query(text, params);
    return result;
}

// Get a single row
export async function queryOne(text, params) {
    const result = await pool.query(text, params);
    return result.rows[0];
}

// Get all rows
export async function queryAll(text, params) {
    const result = await pool.query(text, params);
    return result.rows;
}

export { pool };
export default pool;
