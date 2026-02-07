const path = require('path');
const dbPath = path.resolve(__dirname, 'server/score_app.db');
const db = require(path.resolve(__dirname, 'server/node_modules/better-sqlite3'))(dbPath);

try {
    const result = db.prepare("UPDATE events SET event_type = 'individual' WHERE name LIKE '%Relay 4x200%'").run();
    console.log(`Updated ${result.changes} events.`);
} catch (e) {
    console.error(e);
}
