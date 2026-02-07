import Database from 'better-sqlite3';
const db = new Database('db/sports_week.db', { fileMustExist: true });

try {
    const depts = db.prepare('SELECT * FROM departments').all();
    console.log('Current Departments:', depts);

    // Update DFIS (id 4 likely, but checking by name/code to be safe)
    const dfis = depts.find(d => d.short_code === 'DFIS');
    if (dfis) {
        db.prepare('UPDATE departments SET name = ? WHERE id = ?')
            .run('BTech-MTech', dfis.id);
        console.log('Updated DFIS name.');
    }

    // Update PG (id 5 likely)
    const pg = depts.find(d => d.short_code === 'PG');
    if (pg) {
        const newName = 'MSc DFIS/MSc Forensic Science/M.Phil Clinical Psychology/MSc Clinical Psychology/M.A. Criminology';
        db.prepare('UPDATE departments SET name = ? WHERE id = ?')
            .run(newName, pg.id);
        console.log('Updated PG name.');
    }
} catch (e) {
    console.error(e);
}
