/**
 * DatabaseSyncService - Handles SQLite <-> Remote SQL database synchronization
 * This runs in the Electron main process
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import axios from 'axios';

class DatabaseSyncService {
  constructor() {
    this.db = null;
    this.remoteApiUrl = null;
    this.remoteApiKey = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the database sync service
   */
  initialize(config = {}) {
    try {
      // Open local SQLite database
      const dbPath = path.join(app.getPath('userData'), 'craft_tools.db');
      this.db = new Database(dbPath);
      
      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      
      // Create sync tables if they don't exist
      this.createSyncTables();
      
      // Set remote API configuration
      this.remoteApiUrl = config.remoteApiUrl || process.env.REMOTE_API_URL;
      this.remoteApiKey = config.remoteApiKey || process.env.REMOTE_API_KEY;
      
      this.isInitialized = true;
      console.log('[DatabaseSyncService] Initialized successfully');
    } catch (error) {
      console.error('[DatabaseSyncService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create tables for sync metadata and entities
   */
  createSyncTables() {
    // Sync metadata table - tracks sync state for each record
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        local_version INTEGER DEFAULT 1,
        remote_version INTEGER DEFAULT 0,
        last_synced_at TEXT,
        sync_status TEXT DEFAULT 'pending',
        conflict_data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(entity_type, entity_id)
      );
    `);

    // Customers table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        company TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zip TEXT,
        country TEXT DEFAULT 'USA',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      );
    `);

    // Quotes table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quotes (
        id TEXT PRIMARY KEY,
        quote_number TEXT UNIQUE NOT NULL,
        customer_id TEXT,
        project_name TEXT,
        status TEXT DEFAULT 'draft',
        total_amount REAL DEFAULT 0,
        discount_percent REAL DEFAULT 0,
        tax_percent REAL DEFAULT 0,
        notes TEXT,
        valid_until TEXT,
        created_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );
    `);

    // Orders table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        quote_id TEXT,
        customer_id TEXT,
        status TEXT DEFAULT 'pending',
        order_date TEXT,
        delivery_date TEXT,
        total_amount REAL DEFAULT 0,
        payment_status TEXT DEFAULT 'unpaid',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        FOREIGN KEY (quote_id) REFERENCES quotes(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );
    `);

    // Sync conflicts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        local_data TEXT NOT NULL,
        remote_data TEXT NOT NULL,
        conflict_type TEXT NOT NULL,
        resolved BOOLEAN DEFAULT 0,
        resolution TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT
      );
    `);

    console.log('[DatabaseSyncService] Sync tables created/verified');
  }

  /**
   * Test connection to remote database API
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.remoteApiUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.remoteApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      return {
        success: response.status === 200,
        message: response.data.message || 'Connected successfully'
      };
    } catch (error) {
      console.error('[DatabaseSyncService] Connection test failed:', error);
      return {
        success: false,
        error: error.message || 'Connection failed'
      };
    }
  }

  /**
   * Sync an entity (customers, quotes, or orders)
   * @param {Object} options - Sync options
   */
  async syncEntity(options) {
    const { entity, direction, conflictResolution } = options;
    
    console.log(`[DatabaseSyncService] Syncing ${entity} (direction: ${direction})`);

    const result = {
      success: true,
      entity,
      pushed: 0,
      pulled: 0,
      conflicts: [],
      errors: []
    };

    try {
      // Pull from remote first (if direction is 'pull' or 'both')
      if (direction === 'pull' || direction === 'both') {
        const pullResult = await this.pullFromRemote(entity, conflictResolution);
        result.pulled = pullResult.count;
        result.conflicts.push(...pullResult.conflicts);
      }

      // Push to remote (if direction is 'push' or 'both')
      if (direction === 'push' || direction === 'both') {
        const pushResult = await this.pushToRemote(entity);
        result.pushed = pushResult.count;
      }

    } catch (error) {
      console.error(`[DatabaseSyncService] Sync failed for ${entity}:`, error);
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Pull records from remote database
   */
  async pullFromRemote(entity, conflictResolution) {
    const result = { count: 0, conflicts: [] };

    try {
      // Get last sync timestamp for this entity
      const lastSync = this.getLastSyncTime(entity);
      
      // Fetch updated records from remote
      const response = await axios.get(`${this.remoteApiUrl}/${entity}`, {
        headers: {
          'Authorization': `Bearer ${this.remoteApiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          updatedSince: lastSync
        }
      });

      const remoteRecords = response.data.records || [];
      console.log(`[DatabaseSyncService] Pulled ${remoteRecords.length} ${entity} from remote`);

      // Process each remote record
      for (const remoteRecord of remoteRecords) {
        const localRecord = this.getLocalRecord(entity, remoteRecord.id);

        if (!localRecord) {
          // New record - insert it
          this.insertLocalRecord(entity, remoteRecord);
          result.count++;
        } else {
          // Existing record - check for conflicts
          const hasConflict = this.hasConflict(localRecord, remoteRecord);

          if (hasConflict) {
            // Handle conflict based on resolution strategy
            if (conflictResolution === 'remote') {
              this.updateLocalRecord(entity, remoteRecord);
              result.count++;
            } else if (conflictResolution === 'local') {
              // Keep local version, skip remote
              continue;
            } else {
              // Manual resolution required
              this.recordConflict(entity, remoteRecord.id, localRecord, remoteRecord);
              result.conflicts.push({
                entity,
                id: remoteRecord.id,
                local: localRecord,
                remote: remoteRecord
              });
            }
          } else {
            // No conflict, safe to update
            this.updateLocalRecord(entity, remoteRecord);
            result.count++;
          }
        }

        // Update sync metadata
        this.updateSyncMetadata(entity, remoteRecord.id, remoteRecord.version || 1);
      }

    } catch (error) {
      console.error(`[DatabaseSyncService] Pull failed for ${entity}:`, error);
      throw error;
    }

    return result;
  }

  /**
   * Push local records to remote database
   */
  async pushToRemote(entity) {
    const result = { count: 0 };

    try {
      // Get local records that need to be synced
      const localRecords = this.getUnsyncedLocalRecords(entity);
      console.log(`[DatabaseSyncService] Pushing ${localRecords.length} ${entity} to remote`);

      for (const record of localRecords) {
        try {
          // Send record to remote API
          const response = await axios.post(`${this.remoteApiUrl}/${entity}`, record, {
            headers: {
              'Authorization': `Bearer ${this.remoteApiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.status === 200 || response.status === 201) {
            // Update sync metadata
            this.updateSyncMetadata(entity, record.id, response.data.version || 1);
            result.count++;
          }
        } catch (error) {
          console.error(`[DatabaseSyncService] Failed to push ${entity} ${record.id}:`, error);
        }
      }

    } catch (error) {
      console.error(`[DatabaseSyncService] Push failed for ${entity}:`, error);
      throw error;
    }

    return result;
  }

  /**
   * Get last sync time for an entity
   */
  getLastSyncTime(entity) {
    const row = this.db.prepare(`
      SELECT MAX(last_synced_at) as last_sync 
      FROM sync_metadata 
      WHERE entity_type = ?
    `).get(entity);

    return row?.last_sync || null;
  }

  /**
   * Get local record by ID
   */
  getLocalRecord(entity, id) {
    const row = this.db.prepare(`
      SELECT * FROM ${entity} WHERE id = ?
    `).get(id);

    return row || null;
  }

  /**
   * Get unsynced local records
   */
  getUnsyncedLocalRecords(entity) {
    const rows = this.db.prepare(`
      SELECT e.* 
      FROM ${entity} e
      LEFT JOIN sync_metadata sm ON sm.entity_type = ? AND sm.entity_id = e.id
      WHERE sm.sync_status IS NULL 
         OR sm.sync_status = 'pending'
         OR sm.local_version > sm.remote_version
    `).all(entity);

    return rows;
  }

  /**
   * Insert a new local record
   */
  insertLocalRecord(entity, record) {
    const columns = Object.keys(record).join(', ');
    const placeholders = Object.keys(record).map(() => '?').join(', ');
    const values = Object.values(record);

    const stmt = this.db.prepare(`
      INSERT INTO ${entity} (${columns}) 
      VALUES (${placeholders})
    `);

    stmt.run(...values);
  }

  /**
   * Update an existing local record
   */
  updateLocalRecord(entity, record) {
    const updates = Object.keys(record)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.keys(record)
      .filter(key => key !== 'id')
      .map(key => record[key]);
    
    values.push(record.id);

    const stmt = this.db.prepare(`
      UPDATE ${entity} 
      SET ${updates}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);

    stmt.run(...values);
  }

  /**
   * Check if there's a conflict between local and remote records
   */
  hasConflict(local, remote) {
    // Check if both records have been modified since last sync
    const metadata = this.db.prepare(`
      SELECT * FROM sync_metadata 
      WHERE entity_type = ? AND entity_id = ?
    `).get(local.entity_type || 'unknown', local.id);

    if (!metadata) return false;

    const localUpdatedAt = new Date(local.updated_at);
    const remoteUpdatedAt = new Date(remote.updated_at);
    const lastSyncedAt = new Date(metadata.last_synced_at);

    // Conflict if both were modified after last sync
    return localUpdatedAt > lastSyncedAt && remoteUpdatedAt > lastSyncedAt;
  }

  /**
   * Record a sync conflict
   */
  recordConflict(entity, id, localData, remoteData) {
    const stmt = this.db.prepare(`
      INSERT INTO sync_conflicts (entity_type, entity_id, local_data, remote_data, conflict_type)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      entity,
      id,
      JSON.stringify(localData),
      JSON.stringify(remoteData),
      'update_conflict'
    );
  }

  /**
   * Update sync metadata
   */
  updateSyncMetadata(entity, entityId, remoteVersion) {
    const stmt = this.db.prepare(`
      INSERT INTO sync_metadata (entity_type, entity_id, remote_version, last_synced_at, sync_status)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'synced')
      ON CONFLICT(entity_type, entity_id) DO UPDATE SET
        remote_version = excluded.remote_version,
        last_synced_at = excluded.last_synced_at,
        sync_status = 'synced',
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(entity, entityId, remoteVersion);
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts() {
    const rows = this.db.prepare(`
      SELECT * FROM sync_conflicts 
      WHERE resolved = 0 
      ORDER BY created_at DESC
    `).all();

    return rows.map(row => ({
      ...row,
      local_data: JSON.parse(row.local_data),
      remote_data: JSON.parse(row.remote_data)
    }));
  }

  /**
   * Resolve a conflict
   */
  resolveConflict(conflictId, resolution) {
    const conflict = this.db.prepare(`
      SELECT * FROM sync_conflicts WHERE id = ?
    `).get(conflictId);

    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    // Apply resolution
    if (resolution === 'local') {
      // Keep local version, do nothing
    } else if (resolution === 'remote') {
      // Update local with remote data
      const remoteData = JSON.parse(conflict.remote_data);
      this.updateLocalRecord(conflict.entity_type, remoteData);
    } else if (typeof resolution === 'object') {
      // Custom merged data
      this.updateLocalRecord(conflict.entity_type, resolution);
    }

    // Mark conflict as resolved
    this.db.prepare(`
      UPDATE sync_conflicts 
      SET resolved = 1, resolution = ?, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(typeof resolution === 'string' ? resolution : JSON.stringify(resolution), conflictId);

    return { success: true };
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export default DatabaseSyncService;
