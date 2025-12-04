import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(process.env.APPDATA, 'electron-vite-react-app', 'data', 'database', 'craft_tools.db');
console.log('DB Path:', dbPath);

const db = new sqlite3.Database(dbPath);

db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Tables:', rows.map(r => r.name));
    // Check for manual_quotes table
    const hasManualQuotes = rows.some(r => r.name === 'manual_quotes');
    console.log('manual_quotes table exists:', hasManualQuotes);
  }
  db.close();
});