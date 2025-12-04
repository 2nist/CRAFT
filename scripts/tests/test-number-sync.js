/**
 * Test script to verify Number Generator sync to NAS
 * 
 * This script will:
 * 1. Check both local and NAS databases for the generated_numbers table
 * 2. Show recent generated numbers in both databases
 * 3. Compare counts to verify sync is working
 */

import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkDatabase(dbPath, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Checking ${label}: ${dbPath}`);
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
      console.log('❌ generated_numbers table does NOT exist');
      await db.close();
      return;
    }

    console.log('✅ generated_numbers table exists');

    // Get table schema
    const schema = await db.all(`PRAGMA table_info(generated_numbers)`);
    console.log('\n📋 Table Schema:');
    schema.forEach(col => {
      console.log(`   ${col.name} (${col.type})`);
    });

    // Get count
    const countResult = await db.get(`SELECT COUNT(*) as count FROM generated_numbers`);
    console.log(`\n📊 Total records: ${countResult.count}`);

    // Get recent records
    const recentRecords = await db.all(`
      SELECT * FROM generated_numbers 
      ORDER BY generated_at DESC 
      LIMIT 5
    `);

    if (recentRecords.length > 0) {
      console.log('\n📝 Most Recent Records:');
      recentRecords.forEach((record, index) => {
        console.log(`\n   ${index + 1}. ${record.fullId}`);
        console.log(`      Type: ${record.type}`);
        console.log(`      Customer: ${record.customerName} (${record.customerCode})`);
        console.log(`      Generated: ${record.generated_at}`);
        if (record.updated_at) console.log(`      Updated: ${record.updated_at}`);
        if (record.synced_at) console.log(`      Synced: ${record.synced_at}`);
      });
    } else {
      console.log('\n   No records found');
    }

    // Check for unsynced records
    const unsyncedCount = await db.get(`
      SELECT COUNT(*) as count 
      FROM generated_numbers 
      WHERE synced_at IS NULL OR synced_at < updated_at
    `);
    
    if (unsyncedCount.count > 0) {
      console.log(`\n⚠️  ${unsyncedCount.count} records need syncing`);
    } else {
      console.log('\n✅ All records are synced');
    }

    await db.close();
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('❌ Database file does NOT exist');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

async function main() {
  console.log('\n🔍 Number Generator Sync Test');
  console.log('='.repeat(60));

  // Determine paths
  const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'electron-vite-react-app');
  const localDbPath = path.join(userDataPath, 'database', 'server.db');
  
  // Check for NAS path - you may need to adjust this
  const nasDbPath = '\\\\CraftAuto-Sales\\Craft Hub Runtime\\database\\server.db';

  // Check local database
  await checkDatabase(localDbPath, 'LOCAL DATABASE');

  // Check NAS database
  await checkDatabase(nasDbPath, 'NAS DATABASE');

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test Complete');
  console.log('='.repeat(60));
  console.log('\nIf you see different counts:');
  console.log('1. Generate a number in the app');
  console.log('2. Wait for automatic sync (2 hours) OR');
  console.log('3. Trigger manual sync from the app');
  console.log('4. Run this script again to verify\n');
}

main().catch(console.error);
