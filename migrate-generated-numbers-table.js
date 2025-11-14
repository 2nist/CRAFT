/**
 * Migration script to add sync columns to generated_numbers table
 * Run this script while the app is NOT running!
 */

import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateDatabase(dbPath, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Migrating ${label}: ${dbPath}`);
  console.log('='.repeat(60));

  try {
    // Check if database file exists
    await fs.access(dbPath);
    console.log('✅ Database file exists');

    // Open database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Check if generated_numbers table exists
    const tableExists = await db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='generated_numbers'`
    );

    if (!tableExists) {
      console.log('⚠️  generated_numbers table does not exist, skipping migration');
      await db.close();
      return;
    }

    console.log('✅ generated_numbers table exists');

    // Check existing columns
    const existingColumns = await db.all(`PRAGMA table_info(generated_numbers)`);
    const columnNames = existingColumns.map(col => col.name);
    
    console.log('\n📋 Current columns:', columnNames.join(', '));

    // Add missing columns
    const columnsToAdd = [
      { name: 'updated_at', type: 'DATETIME' },
      { name: 'updated_by', type: 'TEXT' },
      { name: 'synced_at', type: 'DATETIME' }
    ];

    let migrationsPerformed = 0;

    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        console.log(`\n➕ Adding column: ${column.name} (${column.type})`);
        try {
          await db.exec(`ALTER TABLE generated_numbers ADD COLUMN ${column.name} ${column.type}`);
          console.log(`   ✅ Added ${column.name}`);
          migrationsPerformed++;
        } catch (error) {
          console.error(`   ❌ Failed to add ${column.name}:`, error.message);
        }
      } else {
        console.log(`✓ Column ${column.name} already exists`);
      }
    }

    if (migrationsPerformed > 0) {
      console.log(`\n✅ Migration complete! Added ${migrationsPerformed} column(s)`);
      
      // Update all existing records to have updated_at = generated_at and updated_by = 'system'
      console.log('\n🔄 Updating existing records...');
      try {
        const result = await db.run(`
          UPDATE generated_numbers 
          SET updated_at = COALESCE(updated_at, generated_at),
              updated_by = COALESCE(updated_by, 'system')
          WHERE id IS NOT NULL
        `);
        console.log(`   ✅ Updated ${result.changes} record(s)`);
      } catch (error) {
        console.error(`   ⚠️  Could not update existing records:`, error.message);
      }
    } else {
      console.log('\n✅ No migration needed - all columns already exist');
    }

    // Show final schema
    const finalColumns = await db.all(`PRAGMA table_info(generated_numbers)`);
    console.log('\n📋 Final Schema:');
    finalColumns.forEach(col => {
      console.log(`   ${col.name} (${col.type})`);
    });

    await db.close();
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('⚠️  Database file does not exist - will be created when app starts');
    } else {
      console.error('❌ Migration error:', error.message);
      throw error;
    }
  }
}

async function main() {
  console.log('\n🔧 Generated Numbers Table Migration');
  console.log('='.repeat(60));
  console.log('This script will add sync tracking columns to the generated_numbers table');
  console.log('⚠️  Make sure the Electron app is NOT running!\n');

  // Determine paths
  const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'electron-vite-react-app');
  const localServerDbPath = path.join(userDataPath, 'database', 'server.db');
  const localGeneratedDbPath = path.join(userDataPath, 'database', 'generated_numbers.db');
  
  // Check for NAS path - updated to CACPQDB location
  const nasServerDbPath = '\\\\192.168.1.99\\CraftAuto-Sales\\CACPQDB\\database\\server.db';
  const nasGeneratedDbPath = '\\\\192.168.1.99\\CraftAuto-Sales\\CACPQDB\\database\\generated_numbers.db';

  // Migrate local server.db
  await migrateDatabase(localServerDbPath, 'LOCAL SERVER DATABASE');

  // Migrate local generated_numbers.db
  await migrateDatabase(localGeneratedDbPath, 'LOCAL GENERATED NUMBERS DATABASE');

  // Migrate NAS server database (if accessible)
  console.log('\n');
  try {
    await migrateDatabase(nasServerDbPath, 'NAS SERVER DATABASE');
  } catch (error) {
    console.log('⚠️  NAS server database not accessible - will be synced later');
  }

  // Migrate NAS generated numbers database (if accessible)
  console.log('\n');
  try {
    await migrateDatabase(nasGeneratedDbPath, 'NAS GENERATED NUMBERS DATABASE');
  } catch (error) {
    console.log('⚠️  NAS generated numbers database not accessible - will be synced later');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration Complete!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Start the Electron app');
  console.log('2. Generate a quote or project number');
  console.log('3. Click the "Sync Now" button in the UI');
  console.log('4. Check NAS database to verify sync worked\n');
}

main().catch(console.error);
