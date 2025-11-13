import sqlite3 from 'sqlite3';
import path from 'path';
import os from 'os';

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'electron-vite-react-app', 'data', 'database', 'craft_tools.db');
console.log('DB Path:', dbPath);

const db = new sqlite3.Database(dbPath);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS manual_quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quoteNumber TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    projectName TEXT,
    customer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Table created successfully');
    }
  });

  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
      console.error('Error listing tables:', err);
    } else {
      console.log('Tables:', rows.map(r => r.name));
      const hasManualQuotes = rows.some(r => r.name === 'manual_quotes');
      console.log('manual_quotes table exists:', hasManualQuotes);
    }
    db.close();
  });
});