import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initDatabase() {
    try {
        // Read and execute schema
        const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
        await pool.query(schema);
        console.log('✅ Schema created successfully');

        // Read and execute seed data
        const seed = readFileSync(join(__dirname, 'seed.sql'), 'utf8');
        await pool.query(seed);
        console.log('✅ Seed data inserted successfully');

        // Create admin user
        const adminPassword = process.env.ADMIN_PASSWORD || 'Cric@2026';
        const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
        await pool.query(`
            INSERT INTO users (username, password_hash, role, display_name)
            VALUES ($1, $2, 'admin', $3)
            ON CONFLICT (username) DO NOTHING
        `, ['Thomas', adminPasswordHash, 'Thomas (Admin)']);
        console.log('✅ Admin user created: Thomas');

        // Create organiser accounts
        const organisers = [
            { username: 'organiser1', password: process.env.ORGANISER_PASSWORD || 'Sports@2026', name: 'Sports Manager 1' },
            { username: 'organiser2', password: process.env.ORGANISER_PASSWORD || 'Sports@2026', name: 'Sports Manager 2' },
            { username: 'organiser3', password: process.env.ORGANISER_PASSWORD || 'Sports@2026', name: 'Sports Manager 3' },
            { username: 'organiser4', password: process.env.ORGANISER_PASSWORD || 'Sports@2026', name: 'Sports Manager 4' },
            { username: 'organiser5', password: process.env.ORGANISER_PASSWORD || 'Sports@2026', name: 'Sports Manager 5' },
            { username: 'organiser6', password: process.env.ORGANISER_PASSWORD || 'Sports@2026', name: 'Sports Manager 6' }
        ];

        for (const org of organisers) {
            const hash = await bcrypt.hash(org.password, 10);
            await pool.query(`
                INSERT INTO users (username, password_hash, role, display_name)
                VALUES ($1, $2, 'organiser', $3)
                ON CONFLICT (username) DO NOTHING
            `, [org.username, hash, org.name]);
        }
        console.log('✅ 6 Organiser accounts created');

        console.log('\n📋 Login Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Admin:     Thomas / Cric@2026');
        console.log('Organiser: organiser1-6 / Sports@2026');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        console.log('\n✅ Database initialization complete!');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

initDatabase();
