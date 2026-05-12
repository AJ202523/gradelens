const sqlite3 = require('sqlite3').verbose();
const EventEmitter = require('events');
class DatabaseEmitter extends EventEmitter {}
const dbEmitter = new DatabaseEmitter();

const path = require('path');
const dbPath = path.resolve(__dirname, 'gradelens.db');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database at:', dbPath);
        // Initialize tables...
        initializeTables();
    }
});

function initializeTables() {
    // Initialize the users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            username TEXT UNIQUE
        )
    `, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
        } else {
            console.log('users table is ready.');
            db.run(`ALTER TABLE users ADD COLUMN username TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.log('Note on altering users table:', err.message);
                }
            });
        }
    });

    // Initialize the history table
    db.run(`
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT,
            extracted_text TEXT,
            score INTEGER,
            log TEXT,
            timestamp DATETIME DEFAULT (DATETIME('now', '+5 hours', '30 minutes')),
            missed_keywords TEXT,
            user_email TEXT,
            manualReviewFlag BOOLEAN
        )
    `, (err) => {
        if (err) {
            console.error('Error creating history table:', err.message);
        } else {
            console.log('history table is ready.');
            // Add columns if they don't exist
            db.run(`ALTER TABLE history ADD COLUMN missed_keywords TEXT`, () => {});
            db.run(`ALTER TABLE history ADD COLUMN user_email TEXT`, () => {});
            db.run(`ALTER TABLE history ADD COLUMN manualReviewFlag BOOLEAN`, () => {});
        }
    });
}

// Wrap write methods to emit 'change' event
const originalRun = db.run.bind(db);
const originalExec = db.exec.bind(db);

db.run = function(...args) {
    const callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
    return originalRun(...args, function(err, ...rest) {
        if (!err && !args[0].trim().toUpperCase().startsWith('SELECT')) {
            dbEmitter.emit('change', { method: 'run', sql: args[0] });
        }
        if (callback) callback.call(this, err, ...rest);
    });
};

db.exec = function(...args) {
    const callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
    return originalExec(...args, function(err, ...rest) {
        if (!err) {
            dbEmitter.emit('change', { method: 'exec', sql: args[0] });
        }
        if (callback) callback.call(this, err, ...rest);
    });
};

module.exports = { db, dbEmitter };
