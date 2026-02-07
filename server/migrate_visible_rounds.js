import db from './db/index.js';

console.log('Running migration: Add visible_rounds to sports table...');

try {
    const tableInfo = db.prepare('PRAGMA table_info(sports)').all();
    const hasColumn = tableInfo.some(col => col.name === 'visible_rounds');

    if (!hasColumn) {
        db.prepare('ALTER TABLE sports ADD COLUMN visible_rounds TEXT DEFAULT NULL').run();
        console.log('Successfully added visible_rounds column.');
    } else {
        console.log('Column visible_rounds already exists.');
    }
} catch (error) {
    console.error('Migration failed:', error.message);
}
