const db = require('better-sqlite3')('score_app.db');
try {
    const result = db.prepare("UPDATE events SET event_type = 'individual' WHERE name LIKE '%4x200 Relay%'").run();
    console.log(`Updated ${result.changes} events.`);
} catch (e) {
    console.error(e);
}
