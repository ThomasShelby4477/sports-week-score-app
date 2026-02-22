/**
 * Safe Additive Migration: Add Boys/Girls to Chess & Carrom + Weight Categories to Arm Wrestling
 * 
 * This script ONLY performs INSERT and UPDATE operations.
 * It does NOT delete or modify any existing events, results, or matches.
 * 
 * Run: node server/scripts/add_categories_safe.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('🔒 Transaction started — all changes are atomic\n');

        // ─────────────────────────────────────────────
        // 1. Update Chess (sport_id=9): enable gender tabs
        // ─────────────────────────────────────────────
        await client.query(`UPDATE sports SET has_gender_categories = TRUE WHERE id = 9`);
        console.log('✅ Chess: has_gender_categories → TRUE');

        // Insert boys & girls events for Chess (skip if already exist)
        const chessEvents = [
            { name: 'Chess', category: 'boys', event_type: 'team' },
            { name: 'Chess', category: 'girls', event_type: 'team' },
        ];
        for (const ev of chessEvents) {
            const exists = await client.query(
                `SELECT id FROM events WHERE sport_id = 9 AND name = $1 AND category = $2`,
                [ev.name, ev.category]
            );
            if (exists.rows.length === 0) {
                const res = await client.query(
                    `INSERT INTO events (sport_id, name, category, event_type, status) VALUES (9, $1, $2, $3, 'upcoming') RETURNING id`,
                    [ev.name, ev.category, ev.event_type]
                );
                console.log(`   ➕ Inserted Chess event: ${ev.name} (${ev.category}) → id=${res.rows[0].id}`);
            } else {
                console.log(`   ⏭️  Chess event already exists: ${ev.name} (${ev.category}) → id=${exists.rows[0].id}`);
            }
        }

        // ─────────────────────────────────────────────
        // 2. Update Carrom (sport_id=10): enable gender tabs
        // ─────────────────────────────────────────────
        await client.query(`UPDATE sports SET has_gender_categories = TRUE WHERE id = 10`);
        console.log('\n✅ Carrom: has_gender_categories → TRUE');

        // Insert boys & girls events for Carrom (skip if already exist)
        const carromEvents = [
            { name: 'Carrom Doubles', category: 'boys', event_type: 'team' },
            { name: 'Carrom Doubles', category: 'girls', event_type: 'team' },
        ];
        for (const ev of carromEvents) {
            const exists = await client.query(
                `SELECT id FROM events WHERE sport_id = 10 AND name = $1 AND category = $2`,
                [ev.name, ev.category]
            );
            if (exists.rows.length === 0) {
                const res = await client.query(
                    `INSERT INTO events (sport_id, name, category, event_type, status) VALUES (10, $1, $2, $3, 'upcoming') RETURNING id`,
                    [ev.name, ev.category, ev.event_type]
                );
                console.log(`   ➕ Inserted Carrom event: ${ev.name} (${ev.category}) → id=${res.rows[0].id}`);
            } else {
                console.log(`   ⏭️  Carrom event already exists: ${ev.name} (${ev.category}) → id=${exists.rows[0].id}`);
            }
        }

        // ─────────────────────────────────────────────
        // 3. Insert Arm Wrestling weight categories (sport_id=13)
        //    Existing 'Arm Wrestling' boys/girls events are NOT touched.
        // ─────────────────────────────────────────────
        console.log('\n✅ Arm Wrestling: Adding weight category events');

        const weightCategories = ['Below 60kg', '60-70kg', '70-80kg', 'Above 80kg'];
        const genders = ['boys', 'girls'];

        for (const gender of genders) {
            for (const weight of weightCategories) {
                const exists = await client.query(
                    `SELECT id FROM events WHERE sport_id = 13 AND name = $1 AND category = $2`,
                    [weight, gender]
                );
                if (exists.rows.length === 0) {
                    const res = await client.query(
                        `INSERT INTO events (sport_id, name, category, event_type, status) VALUES (13, $1, $2, 'individual', 'upcoming') RETURNING id`,
                        [weight, gender]
                    );
                    console.log(`   ➕ Inserted Arm Wrestling event: ${weight} (${gender}) → id=${res.rows[0].id}`);
                } else {
                    console.log(`   ⏭️  Arm Wrestling event already exists: ${weight} (${gender}) → id=${exists.rows[0].id}`);
                }
            }
        }

        await client.query('COMMIT');
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Migration completed successfully!');
        console.log('   No existing data was deleted or modified.');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Migration failed — all changes rolled back:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
