
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

async function migrate() {
    try {
        console.log('Adding match_id column to results table...');

        await pool.query(`
            ALTER TABLE results 
            ADD COLUMN IF NOT EXISTS match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE;
        `);

        console.log('✅ match_id column added successfully');

        // Optional: Clean up orphaned results? 
        // For now, we will leave existing data as is, but new logic will use match_id.
        // Actually, we should try to link existing results if possible, but it's hard.

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
