/**
 * SyncService - Orchestrates data synchronization between local SQLite and remote SQL database
 * Handles customers, quotes, and order numbers with two-way sync
 */

import EventEmitter from 'events';

class SyncService extends EventEmitter {
  constructor() {
    super();
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncInterval = null;
    this.autoSyncEnabled = false;
    this.syncIntervalMinutes = 30; // Default: sync every 30 minutes
    
    // Sync statistics
    this.stats = {
      lastSync: null,
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflictsResolved: 0,
      recordsPushed: 0,
      recordsPulled: 0
    };

    // Connection status
    this.isConnected = false;
    this.connectionError = null;
  }

  /**
   * Initialize the sync service
   */
  async initialize() {
    console.log('[SyncService] Initializing...');
    
    // Load sync settings from storage
    await this.loadSettings();
    
    // Test connection to remote database
    await this.testConnection();
    
    // Start auto-sync if enabled
    if (this.autoSyncEnabled) {
      this.startAutoSync();
    }
    
    console.log('[SyncService] Initialized successfully');
  }

  /**
   * Load sync settings from local storage
   */
  async loadSettings() {
    try {
      const settings = await window.sync.getSettings();
      this.autoSyncEnabled = settings.autoSyncEnabled || false;
      this.syncIntervalMinutes = settings.syncIntervalMinutes || 30;
      this.lastSyncTime = settings.lastSyncTime || null;
      this.stats = settings.stats || this.stats;
    } catch (error) {
      console.error('[SyncService] Failed to load settings:', error);
    }
  }

  /**
   * Save sync settings to local storage
   */
  async saveSettings() {
    try {
      await window.sync.saveSettings({
        autoSyncEnabled: this.autoSyncEnabled,
        syncIntervalMinutes: this.syncIntervalMinutes,
        lastSyncTime: this.lastSyncTime,
        stats: this.stats
      });
    } catch (error) {
      console.error('[SyncService] Failed to save settings:', error);
    }
  }

  /**
   * Test connection to remote database
   */
  async testConnection() {
    try {
      console.log('[SyncService] Testing connection to remote database...');
      const result = await window.sync.testConnection();
      this.isConnected = result.success;
      this.connectionError = result.error || null;
      
      if (this.isConnected) {
        console.log('[SyncService] Connection successful');
        this.emit('connection:established');
      } else {
        console.error('[SyncService] Connection failed:', this.connectionError);
        this.emit('connection:failed', this.connectionError);
      }
      
      return result;
    } catch (error) {
      console.error('[SyncService] Connection test error:', error);
      this.isConnected = false;
      this.connectionError = error.message;
      this.emit('connection:failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform full synchronization (customers, quotes, orders)
   * @param {Object} options - Sync options
   * @returns {Object} Sync result
   */
  async syncAll(options = {}) {
    if (this.isSyncing) {
      console.warn('[SyncService] Sync already in progress');
      return { success: false, error: 'Sync already in progress' };
    }

    this.isSyncing = true;
    this.emit('sync:start');

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      customers: null,
      quotes: null,
      orders: null,
      conflicts: [],
      errors: []
    };

    try {
      console.log('[SyncService] Starting full sync...');

      // Check connection first
      if (!this.isConnected) {
        await this.testConnection();
        if (!this.isConnected) {
          throw new Error('Not connected to remote database');
        }
      }

      // Sync customers
      console.log('[SyncService] Syncing customers...');
      result.customers = await this.syncCustomers(options);
      this.emit('sync:progress', { entity: 'customers', result: result.customers });

      // Sync quotes
      console.log('[SyncService] Syncing quotes...');
      result.quotes = await this.syncQuotes(options);
      this.emit('sync:progress', { entity: 'quotes', result: result.quotes });

      // Sync orders
      console.log('[SyncService] Syncing orders...');
      result.orders = await this.syncOrders(options);
      this.emit('sync:progress', { entity: 'orders', result: result.orders });

      // Collect conflicts
      result.conflicts = [
        ...(result.customers.conflicts || []),
        ...(result.quotes.conflicts || []),
        ...(result.orders.conflicts || [])
      ];

      // Update statistics
      this.updateStats(result);
      
      // Update last sync time
      this.lastSyncTime = new Date().toISOString();
      await this.saveSettings();

      console.log('[SyncService] Sync completed successfully');
      this.emit('sync:complete', result);

    } catch (error) {
      console.error('[SyncService] Sync failed:', error);
      result.success = false;
      result.errors.push(error.message);
      
      this.stats.failedSyncs++;
      await this.saveSettings();
      
      this.emit('sync:error', error);
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Sync customers between local and remote database
   */
  async syncCustomers(options = {}) {
    try {
      const result = await window.sync.syncEntity({
        entity: 'customers',
        direction: options.direction || 'both', // 'push', 'pull', or 'both'
        conflictResolution: options.conflictResolution || 'remote' // 'local', 'remote', or 'manual'
      });
      
      return result;
    } catch (error) {
      console.error('[SyncService] Customer sync failed:', error);
      return { success: false, error: error.message, conflicts: [] };
    }
  }

  /**
   * Sync quotes between local and remote database
   */
  async syncQuotes(options = {}) {
    try {
      const result = await window.sync.syncEntity({
        entity: 'quotes',
        direction: options.direction || 'both',
        conflictResolution: options.conflictResolution || 'remote'
      });
      
      return result;
    } catch (error) {
      console.error('[SyncService] Quote sync failed:', error);
      return { success: false, error: error.message, conflicts: [] };
    }
  }

  /**
   * Sync orders between local and remote database
   */
  async syncOrders(options = {}) {
    try {
      const result = await window.sync.syncEntity({
        entity: 'orders',
        direction: options.direction || 'both',
        conflictResolution: options.conflictResolution || 'remote'
      });
      
      return result;
    } catch (error) {
      console.error('[SyncService] Order sync failed:', error);
      return { success: false, error: error.message, conflicts: [] };
    }
  }

  /**
   * Sync a specific entity immediately
   */
  async syncEntity(entityType, options = {}) {
    const syncMethods = {
      customers: this.syncCustomers.bind(this),
      quotes: this.syncQuotes.bind(this),
      orders: this.syncOrders.bind(this)
    };

    const syncMethod = syncMethods[entityType];
    if (!syncMethod) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }

    return await syncMethod(options);
  }

  /**
   * Resolve a conflict manually
   */
  async resolveConflict(conflictId, resolution) {
    try {
      const result = await window.sync.resolveConflict({
        conflictId,
        resolution // 'local', 'remote', or custom merged data
      });
      
      if (result.success) {
        this.stats.conflictsResolved++;
        await this.saveSettings();
        this.emit('conflict:resolved', { conflictId, resolution });
      }
      
      return result;
    } catch (error) {
      console.error('[SyncService] Failed to resolve conflict:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending conflicts
   */
  async getPendingConflicts() {
    try {
      return await window.sync.getPendingConflicts();
    } catch (error) {
      console.error('[SyncService] Failed to get pending conflicts:', error);
      return [];
    }
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync() {
    if (this.syncInterval) {
      this.stopAutoSync();
    }

    this.autoSyncEnabled = true;
    const intervalMs = this.syncIntervalMinutes * 60 * 1000;
    
    console.log(`[SyncService] Starting auto-sync (every ${this.syncIntervalMinutes} minutes)`);
    
    this.syncInterval = setInterval(() => {
      console.log('[SyncService] Auto-sync triggered');
      this.syncAll().catch(error => {
        console.error('[SyncService] Auto-sync failed:', error);
      });
    }, intervalMs);

    this.saveSettings();
    this.emit('autosync:started');
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.autoSyncEnabled = false;
      console.log('[SyncService] Auto-sync stopped');
      this.saveSettings();
      this.emit('autosync:stopped');
    }
  }

  /**
   * Set auto-sync interval
   */
  setAutoSyncInterval(minutes) {
    this.syncIntervalMinutes = minutes;
    
    // Restart auto-sync with new interval if it's currently running
    if (this.autoSyncEnabled) {
      this.startAutoSync();
    }
    
    this.saveSettings();
  }

  /**
   * Update sync statistics
   */
  updateStats(result) {
    this.stats.totalSyncs++;
    this.stats.lastSync = result.timestamp;
    
    if (result.success) {
      this.stats.successfulSyncs++;
    } else {
      this.stats.failedSyncs++;
    }

    // Update record counts
    if (result.customers) {
      this.stats.recordsPushed += result.customers.pushed || 0;
      this.stats.recordsPulled += result.customers.pulled || 0;
    }
    if (result.quotes) {
      this.stats.recordsPushed += result.quotes.pushed || 0;
      this.stats.recordsPulled += result.quotes.pulled || 0;
    }
    if (result.orders) {
      this.stats.recordsPushed += result.orders.pushed || 0;
      this.stats.recordsPulled += result.orders.pulled || 0;
    }

    this.stats.conflictsResolved += result.conflicts.filter(c => c.resolved).length;
  }

  /**
   * Get current sync status
   */
  getStatus() {
    return {
      isSyncing: this.isSyncing,
      isConnected: this.isConnected,
      autoSyncEnabled: this.autoSyncEnabled,
      syncIntervalMinutes: this.syncIntervalMinutes,
      lastSyncTime: this.lastSyncTime,
      connectionError: this.connectionError,
      stats: this.stats
    };
  }

  /**
   * Reset statistics
   */
  async resetStats() {
    this.stats = {
      lastSync: null,
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflictsResolved: 0,
      recordsPushed: 0,
      recordsPulled: 0
    };
    await this.saveSettings();
    this.emit('stats:reset');
  }

  /**
   * Clean up on shutdown
   */
  destroy() {
    this.stopAutoSync();
    this.removeAllListeners();
  }
}

// Export singleton instance
export const syncService = new SyncService();

export default syncService;
