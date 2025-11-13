import path from 'path';
import fs from 'fs/promises';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Test database initialization
async function testDatabaseInit() {
  try {
    console.log('Testing database initialization...');

    // Database path - try NAS first, fallback to local
    const dbDir = path.join(process.cwd(), 'database');
    const dbPath = path.join(dbDir, 'craft_tools.db');

    // Ensure database directory exists
    await fs.mkdir(dbDir, { recursive: true });

    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log('Database connected at:', dbPath);

    // Manual quotes table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS manual_quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quoteNumber TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL, -- 'margin_calculation' or 'bom'
        data TEXT NOT NULL, -- JSON string for the calculation or BOM data
        projectName TEXT,
        customer TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Manual quotes table created successfully');

    // Check if table exists
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='manual_quotes'");
    console.log('Tables found:', tables);

    await db.close();
    console.log('Database test completed successfully');

  } catch (error) {
    console.error('Error during database test:', error);
  }
}

testDatabaseInit();