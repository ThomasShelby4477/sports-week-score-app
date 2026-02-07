import Database from 'better-sqlite3';
const db = new Database('db/sports_week.db', { fileMustExist: true });

try {
    const updates = [
        { oldCode: 'DFIS', newCode: 'BTech-MTech', newName: 'BTech-MTech' },
        { oldCode: 'MBA', newCode: 'BBA-MBA', newName: 'BBA-MBA' },
        { oldCode: 'FSC', newCode: 'BSc-MSc', newName: 'BSc-MSc Forensic Sciences/BSc-MSc Criminology' }
    ];

    db.transaction(() => {
        for (const update of updates) {
            const info = db.prepare('UPDATE departments SET short_code = ?, name = ? WHERE short_code = ?')
                .run(update.newCode, update.newName, update.oldCode);
            console.log(`Updated ${update.oldCode} -> ${update.newCode}: ${info.changes} changes`);
        }
    })();
} catch (e) {
    console.error(e);
}
