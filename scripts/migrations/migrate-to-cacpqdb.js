/**
 * Migration script to move data from old location to CACPQDB
 * Run this BEFORE restarting the app with the new environment variable
 */

import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs/promises';

async function copyDatabaseRecords(sourceDbPath, targetDbPath, tableName) {
  console.log(`\n📋 Migrating ${tableName} from old to new location...`);
  
  try {
    // Check if source exists
    await fs.access(sourceDbPath);
  } catch {
    console.log(`   ⚠️  Source database doesn't exist: ${sourceDbPath}`);
    return 0;
  }

  // Open source database
  const sourceDb = await open({
    filename: sourceDbPath,
    driver: sqlite3.Database
  });

  // Check if table exists in source
  const sourceTable = await sourceDb.get(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    tableName
  );

  if (!sourceTable) {
    console.log(`   ℹ️  Table ${tableName} doesn't exist in source database`);
    await sourceDb.close();
    return 0;
  }

  // Get all records from source
  const records = await sourceDb.all(`SELECT * FROM ${tableName}`);
  console.log(`   Found ${records.length} records in source`);

  if (records.length === 0) {
    await sourceDb.close();
    return 0;
  }

  // Open or create target database
  await fs.mkdir(path.dirname(targetDbPath), { recursive: true });
  const targetDb = await open({
    filename: targetDbPath,
    driver: sqlite3.Database
  });

  // Get source table schema
  const schema = await sourceDb.all(`PRAGMA table_info(${tableName})`);
  
  // Create table in target if it doesn't exist
  const targetTable = await targetDb.get(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    tableName
  );

  if (!targetTable) {
    console.log(`   Creating ${tableName} table in target database...`);
    
    // Build CREATE TABLE statement from schema
    const columns = schema.map(col => {
      let colDef = `${col.name} ${col.type}`;
      if (col.notnull) colDef += ' NOT NULL';
      if (col.dflt_value) colDef += ` DEFAULT ${col.dflt_value}`;
      if (col.pk) colDef += ' PRIMARY KEY';
      return colDef;
    }).join(', ');
    
    await targetDb.exec(`CREATE TABLE ${tableName} (${columns})`);
    console.log(`   ✅ Table created`);
  }

  // Insert records into target
  let inserted = 0;
  for (const record of records) {
    const columns = Object.keys(record).join(', ');
    const placeholders = Object.keys(record).map(() => '?').join(', ');
    const values = Object.values(record);

    try {
      await targetDb.run(
        `INSERT OR IGNORE INTO ${tableName} (${columns}) VALUES (${placeholders})`,
        values
      );
      inserted++;
    } catch (error) {
      console.error(`   ⚠️  Failed to insert record:`, error.message);
    }
  }

  console.log(`   ✅ Migrated ${inserted} records to target database`);

  await sourceDb.close();
  await targetDb.close();

  return inserted;
}

async function main() {
  console.log('\n🔄 Migrating databases to CACPQDB location');
  console.log('='.repeat(60));

  const oldLocation = '\\\\192.168.1.99\\CraftAuto-Sales\\Temp_Craft_Tools_Runtime\\updates\\latest\\database';
  const newLocation = '\\\\192.168.1.99\\CraftAuto-Sales\\CACPQDB\\database';

  // Migrate server.db - generated_numbers table
  const oldServerDb = path.join(oldLocation, 'server.db');
  const newServerDb = path.join(newLocation, 'server.db');
  
  console.log('\n📦 Migrating server.db...');
  console.log(`   From: ${oldServerDb}`);
  console.log(`   To: ${newServerDb}`);
  
  const serverRecords = await copyDatabaseRecords(oldServerDb, newServerDb, 'generated_numbers');

  // Migrate generated_numbers.db
  const oldGeneratedDb = path.join(oldLocation, 'generated_numbers.db');
  const newGeneratedDb = path.join(newLocation, 'generated_numbers.db');
  
  console.log('\n📦 Migrating generated_numbers.db...');
  console.log(`   From: ${oldGeneratedDb}`);
  console.log(`   To: ${newGeneratedDb}`);
  
  const generatedRecords = await copyDatabaseRecords(oldGeneratedDb, newGeneratedDb, 'generated_numbers');

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration complete!');
  console.log(`   Total records migrated: ${serverRecords + generatedRecords}`);
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. The CTH_RUNTIME_ROOT environment variable has been updated');
  console.log('2. RESTART the Electron app (close and start again)');
  console.log('3. Generate a new quote/project number');
  console.log('4. The number should now appear in CACPQDB\\database\\');
  console.log('');
}

main().catch(console.error);
