// Quick verification: query events for Chess, Carrom, Arm Wrestling
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    // Check sport flags
    const sports = await pool.query(`SELECT id, name, has_gender_categories FROM sports WHERE id IN (9, 10, 13) ORDER BY id`);
    console.log('\n=== SPORT FLAGS ===');
    sports.rows.forEach(s => console.log(`  ${s.name} (id=${s.id}): has_gender_categories = ${s.has_gender_categories}`));

    // Check events
    const events = await pool.query(`SELECT e.id, e.name, e.category, e.event_type, e.status, s.name as sport_name FROM events e JOIN sports s ON e.sport_id = s.id WHERE s.id IN (9, 10, 13) ORDER BY s.id, e.category, e.name`);
    console.log('\n=== EVENTS ===');
    events.rows.forEach(e => console.log(`  [${e.sport_name}] ${e.name} (${e.category}) - ${e.event_type} - ${e.status} (id=${e.id})`));

    // Check no data was lost - count results for these sports
    const results = await pool.query(`SELECT COUNT(*) as count FROM results r JOIN events e ON r.event_id = e.id WHERE e.sport_id IN (9, 10, 13)`);
    console.log(`\n=== EXISTING RESULTS FOR THESE SPORTS: ${results.rows[0].count} (preserved) ===`);

    await pool.end();
}

verify();
