/**
 * Sync IPC Handlers - Connect renderer process to DatabaseSyncService
 * Add these handlers to your electron/main.js file
 */

import { ipcMain } from 'electron';
import DatabaseSyncService from './DatabaseSyncService.js';
import Store from 'electron-store';

// Initialize services
const dbSync = new DatabaseSyncService();
const store = new Store();

/**
 * Initialize database sync service
 */
export function initializeSyncService(config = {}) {
  try {
    dbSync.initialize(config);
    console.log('[Sync IPC] DatabaseSyncService initialized');
  } catch (error) {
    console.error('[Sync IPC] Failed to initialize DatabaseSyncService:', error);
  }
}

/**
 * Register all sync-related IPC handlers
 */
export function registerSyncHandlers() {
  
  // Test connection to remote database
  ipcMain.handle('sync:test-connection', async () => {
    try {
      return await dbSync.testConnection();
    } catch (error) {
      console.error('[Sync IPC] Connection test failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Sync a specific entity
  ipcMain.handle('sync:sync-entity', async (event, options) => {
    try {
      return await dbSync.syncEntity(options);
    } catch (error) {
      console.error('[Sync IPC] Entity sync failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Get pending conflicts
  ipcMain.handle('sync:get-pending-conflicts', async () => {
    try {
      return await dbSync.getPendingConflicts();
    } catch (error) {
      console.error('[Sync IPC] Failed to get conflicts:', error);
      return [];
    }
  });

  // Resolve a conflict
  ipcMain.handle('sync:resolve-conflict', async (event, { conflictId, resolution }) => {
    try {
      return await dbSync.resolveConflict(conflictId, resolution);
    } catch (error) {
      console.error('[Sync IPC] Failed to resolve conflict:', error);
      return { success: false, error: error.message };
    }
  });

  // Get sync settings
  ipcMain.handle('sync:get-settings', async () => {
    try {
      return store.get('sync-settings', {
        autoSyncEnabled: false,
        syncIntervalMinutes: 30,
        lastSyncTime: null,
        stats: {
          lastSync: null,
          totalSyncs: 0,
          successfulSyncs: 0,
          failedSyncs: 0,
          conflictsResolved: 0,
          recordsPushed: 0,
          recordsPulled: 0
        }
      });
    } catch (error) {
      console.error('[Sync IPC] Failed to get settings:', error);
      return null;
    }
  });

  // Save sync settings
  ipcMain.handle('sync:save-settings', async (event, settings) => {
    try {
      store.set('sync-settings', settings);
      return { success: true };
    } catch (error) {
      console.error('[Sync IPC] Failed to save settings:', error);
      return { success: false, error: error.message };
    }
  });

  // Get customers
  ipcMain.handle('sync:get-customers', async () => {
    try {
      const customers = dbSync.db.prepare('SELECT * FROM customers WHERE deleted_at IS NULL').all();
      return customers;
    } catch (error) {
      console.error('[Sync IPC] Failed to get customers:', error);
      return [];
    }
  });

  // Get quotes
  ipcMain.handle('sync:get-quotes', async () => {
    try {
      const quotes = dbSync.db.prepare('SELECT * FROM quotes WHERE deleted_at IS NULL').all();
      return quotes;
    } catch (error) {
      console.error('[Sync IPC] Failed to get quotes:', error);
      return [];
    }
  });

  // Get orders
  ipcMain.handle('sync:get-orders', async () => {
    try {
      const orders = dbSync.db.prepare('SELECT * FROM orders WHERE deleted_at IS NULL').all();
      return orders;
    } catch (error) {
      console.error('[Sync IPC] Failed to get orders:', error);
      return [];
    }
  });

  // Add/Update customer
  ipcMain.handle('sync:save-customer', async (event, customer) => {
    try {
      if (customer.id) {
        // Update existing customer
        dbSync.updateLocalRecord('customers', customer);
      } else {
        // Insert new customer with generated ID
        customer.id = `CUST-${Date.now()}`;
        dbSync.insertLocalRecord('customers', customer);
      }
      return { success: true, id: customer.id };
    } catch (error) {
      console.error('[Sync IPC] Failed to save customer:', error);
      return { success: false, error: error.message };
    }
  });

  // Add/Update quote
  ipcMain.handle('sync:save-quote', async (event, quote) => {
    try {
      if (quote.id) {
        // Update existing quote
        dbSync.updateLocalRecord('quotes', quote);
      } else {
        // Insert new quote with generated ID
        quote.id = `QUOTE-${Date.now()}`;
        if (!quote.quote_number) {
          quote.quote_number = `Q-${Date.now()}`;
        }
        dbSync.insertLocalRecord('quotes', quote);
      }
      return { success: true, id: quote.id };
    } catch (error) {
      console.error('[Sync IPC] Failed to save quote:', error);
      return { success: false, error: error.message };
    }
  });

  // Add/Update order
  ipcMain.handle('sync:save-order', async (event, order) => {
    try {
      if (order.id) {
        // Update existing order
        dbSync.updateLocalRecord('orders', order);
      } else {
        // Insert new order with generated ID
        order.id = `ORDER-${Date.now()}`;
        if (!order.order_number) {
          order.order_number = `O-${Date.now()}`;
        }
        dbSync.insertLocalRecord('orders', order);
      }
      return { success: true, id: order.id };
    } catch (error) {
      console.error('[Sync IPC] Failed to save order:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[Sync IPC] All handlers registered');
}

/**
 * Clean up on app quit
 */
export function cleanupSyncService() {
  dbSync.close();
}
