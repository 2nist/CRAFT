/**
 * Sync Preload API - Add these to your electron/preload.mjs file
 * This exposes sync functionality to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';

// Add this to your existing contextBridge.exposeInMainWorld call
// or create a new one specifically for sync operations
contextBridge.exposeInMainWorld('sync', {
  // Test connection to remote database
  testConnection: () => ipcRenderer.invoke('sync:test-connection'),

  // Sync a specific entity
  syncEntity: (options) => ipcRenderer.invoke('sync:sync-entity', options),

  // Get pending conflicts
  getPendingConflicts: () => ipcRenderer.invoke('sync:get-pending-conflicts'),

  // Resolve a conflict
  resolveConflict: (data) => ipcRenderer.invoke('sync:resolve-conflict', data),

  // Get sync settings
  getSettings: () => ipcRenderer.invoke('sync:get-settings'),

  // Save sync settings
  saveSettings: (settings) => ipcRenderer.invoke('sync:save-settings', settings),

  // Get customers
  getCustomers: () => ipcRenderer.invoke('sync:get-customers'),

  // Get quotes
  getQuotes: () => ipcRenderer.invoke('sync:get-quotes'),

  // Get orders
  getOrders: () => ipcRenderer.invoke('sync:get-orders'),

  // Save customer (add or update)
  saveCustomer: (customer) => ipcRenderer.invoke('sync:save-customer', customer),

  // Save quote (add or update)
  saveQuote: (quote) => ipcRenderer.invoke('sync:save-quote', quote),

  // Save order (add or update)
  saveOrder: (order) => ipcRenderer.invoke('sync:save-order', order)
});

/*
 * USAGE IN RENDERER PROCESS:
 * 
 * // Test connection
 * const result = await window.sync.testConnection();
 * 
 * // Sync customers
 * const syncResult = await window.sync.syncEntity({
 *   entity: 'customers',
 *   direction: 'both',
 *   conflictResolution: 'remote'
 * });
 * 
 * // Get all customers
 * const customers = await window.sync.getCustomers();
 * 
 * // Save a customer
 * const result = await window.sync.saveCustomer({
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * });
 */
