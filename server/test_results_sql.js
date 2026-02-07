import Database from 'better-sqlite3';
const db = new Database('db/sports_week.db', { fileMustExist: true });

try {
    const results = db.prepare(`
        SELECT r.*, e.name as event_name, s.name as sport_name, e.category, d.short_code as dept_code, d.name as dept_name
        FROM results r
        JOIN events e ON r.event_id = e.id
        JOIN sports s ON e.sport_id = s.id
        JOIN departments d ON r.department_id = d.id
        ORDER BY r.updated_at DESC
    `).all();
    console.log('Query successful, rows:', results.length);
    if (results.length > 0) console.log('Sample:', results[0]);
} catch (e) {
    console.error('Query failed:', e);
}
