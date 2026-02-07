import Database from 'better-sqlite3';
const db = new Database('db/sports_week.db', { fileMustExist: true });

try {
    const result = db.prepare("UPDATE events SET event_type = 'individual' WHERE name LIKE '%Relay%'").run();
    console.log(`Updated ${result.changes} events.`);
} catch (e) {
    console.error(e);
}
