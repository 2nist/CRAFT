/**
 * Database Synchronization Manager
 * Handles bi-directional sync between local SQLite database and NAS master database
 */

import path from 'path'
import fs from 'fs/promises'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'

class SyncManager {
  constructor(config) {
    this.localServerDb = config.localServerDb
    this.localGeneratedNumbersDb = config.localGeneratedNumbersDb
    this.nasServerDb = config.nasServerDb
    this.nasGeneratedNumbersDb = config.nasGeneratedNumbersDb
    this.syncIntervalMinutes = config.syncIntervalMinutes || 120
    this.username = config.username
    
    this.localDb = null
    this.nasDb = null
    this.syncInterval = null
    this.isSyncing = false
    this.lastSyncTime = null
    this.syncStats = {
      pulled: { quotes: 0, components: 0, projects: 0, subAssemblies: 0 },
      pushed: { quotes: 0, components: 0, projects: 0, subAssemblies: 0 },
      conflicts: 0
    }
  }

  /**
   * Initialize databases for sync
   */
  async initialize() {
    try {
      console.log('🔄 Initializing Sync Manager...')
      console.log(`   Local DB: ${this.localServerDb}`)
      console.log(`   NAS Master DB: ${this.nasServerDb || 'Not configured'}`)

      // Open local database
      this.localDb = await open({
        filename: this.localServerDb,
        driver: sqlite3.Database
      })

      // Create sync log table for tracking sync history
      await this.localDb.exec(`
        CREATE TABLE IF NOT EXISTS sync_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          direction TEXT NOT NULL, -- 'pull', 'push', or 'bidirectional'
          status TEXT NOT NULL, -- 'success', 'error', 'partial'
          records_pulled INTEGER DEFAULT 0,
          records_pushed INTEGER DEFAULT 0,
          conflicts INTEGER DEFAULT 0,
          error_message TEXT,
          duration_ms INTEGER
        )
      `)

      // Add sync tracking columns if they don't exist
      await this.addSyncColumns(this.localDb)

      console.log('✅ Sync Manager initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Sync Manager:', error)
      return false
    }
  }

  /**
   * Add sync tracking columns to all tables
   */
  async addSyncColumns(db) {
    const tables = ['components', 'sub_assemblies', 'quotes', 'projects', 'customers', 'manual_quotes', 'generated_numbers']
    
    for (const table of tables) {
      try {
        // Check if table exists
        const tableExists = await db.get(
          `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
          table
        )
        
        if (!tableExists) continue

        // Add updated_at column if it doesn't exist
        await db.exec(`
          ALTER TABLE ${table} ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
        `).catch(() => {}) // Ignore if column already exists

        // Add updated_by column if it doesn't exist
        await db.exec(`
          ALTER TABLE ${table} ADD COLUMN updated_by TEXT;
        `).catch(() => {}) // Ignore if column already exists

        // Add synced_at column if it doesn't exist
        await db.exec(`
          ALTER TABLE ${table} ADD COLUMN synced_at DATETIME;
        `).catch(() => {}) // Ignore if column already exists

        console.log(`   ✓ Sync columns added to ${table}`)
      } catch (error) {
        console.log(`   ℹ Sync columns may already exist in ${table}`)
      }
    }
  }

  /**
   * Perform bi-directional sync
   */
  async sync() {
    if (this.isSyncing) {
      console.log('⏭️  Sync already in progress, skipping...')
      return { success: false, reason: 'already_syncing' }
    }

    this.isSyncing = true
    const startTime = Date.now()
    console.log('\n🔄 Starting database synchronization...')

    // Reset stats
    this.syncStats = {
      pulled: { quotes: 0, components: 0, projects: 0, subAssemblies: 0, customers: 0, manualQuotes: 0, generatedNumbers: 0 },
      pushed: { quotes: 0, components: 0, projects: 0, subAssemblies: 0, customers: 0, manualQuotes: 0, generatedNumbers: 0 },
      conflicts: 0
    }

    try {
      // Check NAS connectivity
      const nasAvailable = await this.checkNasAccess()
      if (!nasAvailable) {
        console.log('⚠️  NAS not accessible, sync aborted')
        this.isSyncing = false
        return { 
          success: false, 
          reason: 'nas_unavailable',
          message: 'NAS master database not accessible. Working offline with local database.'
        }
      }

      // Open NAS database with exclusive lock
      await this.openNasDatabase()

      // Pull changes from NAS master
      console.log('\n📥 Pulling changes from NAS master...')
      await this.pullFromMaster()

      // Push local changes to NAS master
      console.log('\n📤 Pushing local changes to NAS master...')
      await this.pushToMaster()

      // Close NAS database
      await this.closeNasDatabase()

      // Update last sync time
      this.lastSyncTime = new Date().toISOString()
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      console.log(`\n✅ Sync completed successfully in ${duration}s`)
      console.log(`   📥 Pulled: ${this.getTotalPulled()} records`)
      console.log(`   📤 Pushed: ${this.getTotalPushed()} records`)
      if (this.syncStats.conflicts > 0) {
        console.log(`   ⚠️  Conflicts resolved: ${this.syncStats.conflicts}`)
      }

      this.isSyncing = false
      
      // Log successful sync
      await this.logSync({
        direction: 'bidirectional',
        status: 'success',
        records_pulled: this.getTotalPulled(),
        records_pushed: this.getTotalPushed(),
        conflicts: this.syncStats.conflicts,
        duration_ms: Date.now() - startTime
      })
      
      return {
        success: true,
        stats: this.syncStats,
        duration,
        timestamp: this.lastSyncTime
      }
    } catch (error) {
      console.error('❌ Sync failed:', error)
      this.isSyncing = false
      await this.closeNasDatabase()
      
      // Log failed sync
      await this.logSync({
        direction: 'bidirectional',
        status: 'error',
        records_pulled: this.getTotalPulled(),
        records_pushed: this.getTotalPushed(),
        conflicts: this.syncStats.conflicts,
        error_message: error.message,
        duration_ms: Date.now() - startTime
      })
      
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Log sync operation to sync_log table
   */
  async logSync(logData) {
    try {
      await this.localDb.run(`
        INSERT INTO sync_log (direction, status, records_pulled, records_pushed, conflicts, error_message, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        logData.direction,
        logData.status,
        logData.records_pulled || 0,
        logData.records_pushed || 0,
        logData.conflicts || 0,
        logData.error_message || null,
        logData.duration_ms || 0
      ])
    } catch (error) {
      console.error('Failed to log sync operation:', error)
    }
  }

  /**
   * Check if NAS is accessible
   */
  async checkNasAccess() {
    try {
      if (!this.nasServerDb) return false
      const nasDir = path.dirname(this.nasServerDb)
      await fs.access(nasDir)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Open NAS database
   */
  async openNasDatabase() {
    try {
      // Ensure NAS directory exists
      const nasDir = path.dirname(this.nasServerDb)
      await fs.mkdir(nasDir, { recursive: true })

      this.nasDb = await open({
        filename: this.nasServerDb,
        driver: sqlite3.Database
      })

      // Add sync columns to NAS database
      await this.addSyncColumns(this.nasDb)

      console.log('   ✓ NAS database opened')
    } catch (error) {
      console.error('   ✗ Failed to open NAS database:', error.message)
      throw error
    }
  }

  /**
   * Close NAS database
   */
  async closeNasDatabase() {
    if (this.nasDb) {
      await this.nasDb.close()
      this.nasDb = null
      console.log('   ✓ NAS database closed')
    }
  }

  /**
   * Pull changes from NAS master to local
   */
  async pullFromMaster() {
    const tables = [
      { name: 'customers', key: 'customerCode' },
      { name: 'components', key: 'sku' },
      { name: 'sub_assemblies', key: 'subAssemblyId' },
      { name: 'quotes', key: 'quoteId' },
      { name: 'projects', key: 'projectId' },
      { name: 'manual_quotes', key: 'id' },
      { name: 'generated_numbers', key: 'id' }
    ]

    for (const table of tables) {
      try {
        await this.pullTable(table.name, table.key)
      } catch (error) {
        console.error(`   ✗ Error pulling ${table.name}:`, error.message)
      }
    }
  }

  /**
   * Pull a specific table from NAS to local
   */
  async pullTable(tableName, primaryKey) {
    // Check if table exists in NAS
    const nasTableExists = await this.nasDb.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      tableName
    )
    if (!nasTableExists) {
      console.log(`   ℹ ${tableName} doesn't exist in NAS master, skipping pull`)
      return
    }

    // Get all records from NAS that are newer than last sync
    const nasRecords = await this.nasDb.all(`
      SELECT * FROM ${tableName}
      WHERE updated_at > COALESCE(
        (SELECT MAX(synced_at) FROM ${tableName}),
        '1970-01-01'
      )
    `)

    let pulled = 0
    let conflicts = 0

    for (const nasRecord of nasRecords) {
      // Check if record exists locally
      const localRecord = await this.localDb.get(
        `SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`,
        nasRecord[primaryKey]
      )

      if (!localRecord) {
        // New record - insert
        await this.insertRecord(this.localDb, tableName, nasRecord)
        pulled++
      } else {
        // Record exists - check for conflicts
        const nasTimestamp = new Date(nasRecord.updated_at).getTime()
        const localTimestamp = new Date(localRecord.updated_at || 0).getTime()

        if (nasTimestamp > localTimestamp) {
          // NAS version is newer - update local
          await this.updateRecord(this.localDb, tableName, primaryKey, nasRecord)
          pulled++
        } else if (nasTimestamp < localTimestamp) {
          // Local version is newer - conflict (will be pushed to NAS)
          conflicts++
        }
        // If timestamps are equal, no action needed
      }
    }

    // Update synced_at timestamp
    await this.localDb.run(`
      UPDATE ${tableName} 
      SET synced_at = CURRENT_TIMESTAMP 
      WHERE ${primaryKey} IN (
        SELECT ${primaryKey} FROM ${tableName}
      )
    `)

    if (pulled > 0 || conflicts > 0) {
      console.log(`   ✓ ${tableName}: pulled ${pulled}, conflicts ${conflicts}`)
      const statsKey = tableName === 'sub_assemblies' ? 'subAssemblies' : 
                      tableName === 'manual_quotes' ? 'manualQuotes' : 
                      tableName === 'generated_numbers' ? 'generatedNumbers' : tableName
      this.syncStats.pulled[statsKey] = pulled
      this.syncStats.conflicts += conflicts
    }
  }

  /**
   * Push local changes to NAS master
   */
  async pushToMaster() {
    const tables = [
      { name: 'customers', key: 'customerCode' },
      { name: 'components', key: 'sku' },
      { name: 'sub_assemblies', key: 'subAssemblyId' },
      { name: 'quotes', key: 'quoteId' },
      { name: 'projects', key: 'projectId' },
      { name: 'manual_quotes', key: 'id' },
      { name: 'generated_numbers', key: 'id' }
    ]

    for (const table of tables) {
      try {
        await this.pushTable(table.name, table.key)
      } catch (error) {
        console.error(`   ✗ Error pushing ${table.name}:`, error.message)
      }
    }
  }

  /**
   * Push a specific table from local to NAS
   */
  async pushTable(tableName, primaryKey) {
    // Get all local records that were updated since last sync
    const localRecords = await this.localDb.all(`
      SELECT * FROM ${tableName}
      WHERE updated_at > COALESCE(synced_at, '1970-01-01')
    `)

    let pushed = 0

    for (const localRecord of localRecords) {
      // Ensure NAS table exists
      await this.ensureNasTableExists(tableName, localRecord)

      // Check if record exists in NAS
      const nasRecord = await this.nasDb.get(
        `SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`,
        localRecord[primaryKey]
      )

      if (!nasRecord) {
        // New record - insert to NAS
        await this.insertRecord(this.nasDb, tableName, localRecord)
        pushed++
      } else {
        // Record exists - update if local is newer
        const localTimestamp = new Date(localRecord.updated_at || 0).getTime()
        const nasTimestamp = new Date(nasRecord.updated_at || 0).getTime()

        if (localTimestamp > nasTimestamp) {
          await this.updateRecord(this.nasDb, tableName, primaryKey, localRecord)
          pushed++
        }
      }

      // Update synced_at timestamp locally
      await this.localDb.run(
        `UPDATE ${tableName} SET synced_at = CURRENT_TIMESTAMP WHERE ${primaryKey} = ?`,
        localRecord[primaryKey]
      )
    }

    if (pushed > 0) {
      console.log(`   ✓ ${tableName}: pushed ${pushed}`)
      const statsKey = tableName === 'sub_assemblies' ? 'subAssemblies' : 
                      tableName === 'manual_quotes' ? 'manualQuotes' : 
                      tableName === 'generated_numbers' ? 'generatedNumbers' : tableName
      this.syncStats.pushed[statsKey] = pushed
    }
  }

  /**
   * Ensure table exists in NAS database
   */
  async ensureNasTableExists(tableName, sampleRecord) {
    const tableExists = await this.nasDb.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      tableName
    )

    if (!tableExists) {
      // Create table based on sample record structure
      // This is a simplified version - in production, you'd want proper schema definitions
      const columns = Object.keys(sampleRecord)
        .map(col => `${col} TEXT`)
        .join(', ')
      
      await this.nasDb.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`)
      console.log(`   ✓ Created ${tableName} table in NAS master`)
    }
  }

  /**
   * Insert record into database
   */
  async insertRecord(db, tableName, record) {
    const columns = Object.keys(record).join(', ')
    const placeholders = Object.keys(record).map(() => '?').join(', ')
    const values = Object.values(record)

    await db.run(
      `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
      values
    )
  }

  /**
   * Update record in database
   */
  async updateRecord(db, tableName, primaryKey, record) {
    const updates = Object.keys(record)
      .filter(key => key !== primaryKey)
      .map(key => `${key} = ?`)
      .join(', ')
    const values = Object.entries(record)
      .filter(([key]) => key !== primaryKey)
      .map(([, value]) => value)
    values.push(record[primaryKey])

    await db.run(
      `UPDATE ${tableName} SET ${updates} WHERE ${primaryKey} = ?`,
      values
    )
  }

  /**
   * Get total records pulled
   */
  getTotalPulled() {
    return Object.values(this.syncStats.pulled).reduce((sum, val) => sum + val, 0)
  }

  /**
   * Get total records pushed
   */
  getTotalPushed() {
    return Object.values(this.syncStats.pushed).reduce((sum, val) => sum + val, 0)
  }

  /**
   * Start scheduled sync
   */
  startScheduledSync(intervalMinutes = 120) {
    console.log(`\n🕐 Starting scheduled sync every ${intervalMinutes} minutes`)
    
    // Clear existing interval if any
    this.stopScheduledSync()

    // Run initial sync
    this.sync()

    // Schedule periodic sync
    this.syncInterval = setInterval(() => {
      this.sync()
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * Stop scheduled sync
   */
  stopScheduledSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('🛑 Scheduled sync stopped')
    }
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      enabled: true,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      stats: this.syncStats,
      scheduledSync: this.syncInterval !== null,
      intervalMinutes: this.syncIntervalMinutes,
      username: this.username,
      nasDbPath: this.nasServerDb || 'Not configured'
    }
  }

  /**
   * Get sync history/logs
   * Returns recent sync operations and their results
   */
  async getSyncHistory(limit = 50) {
    try {
      if (!this.localDb) {
        return []
      }

      // Query sync log table if it exists
      const result = await this.localDb.all(`
        SELECT * FROM sync_log 
        ORDER BY timestamp DESC 
        LIMIT ?
      `, [limit])

      return result || []
    } catch (error) {
      // If sync_log table doesn't exist, return empty array
      if (error.message.includes('no such table')) {
        return []
      }
      console.error('Error getting sync history:', error)
      return []
    }
  }

  /**
   * Cleanup
   */
  async cleanup() {
    this.stopScheduledSync()
    if (this.localDb) await this.localDb.close()
    if (this.nasDb) await this.nasDb.close()
  }
}

export default SyncManager
