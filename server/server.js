import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection - use a dedicated database directory
const dbDir = path.join(__dirname, '..', 'database');
const dbPath = path.join(dbDir, 'craft_tools.db');

let db;
async function initializeDatabase() {
  try {
    // Ensure database directory exists
    await fs.mkdir(dbDir, { recursive: true });
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log('Connected to SQLite database at:', dbPath);
  } catch (error) {
    console.error('Database connection error:', error);
  }
}

// Initialize database on startup
try {
  await initializeDatabase();
  console.log('Database initialization completed');
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: db ? 'connected' : 'disconnected'
  });
});

// Get all components
app.get('/api/components', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const components = await db.all('SELECT * FROM components LIMIT 100');
    res.json(components);
  } catch (error) {
    console.error('Error fetching components:', error);
    res.status(500).json({ error: 'Failed to fetch components' });
  }
});

// Get component count
app.get('/api/components/count', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const result = await db.get('SELECT COUNT(*) as count FROM components');
    res.json({ count: result.count });
  } catch (error) {
    console.error('Error getting component count:', error);
    res.status(500).json({ error: 'Failed to get component count' });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});