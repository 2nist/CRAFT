/**
 * DATABASE INTEGRATION GUIDE
 * 
 * This guide shows how to integrate SQL Server into electron/main.js
 * Step-by-step instructions to replace SQLite with SQL Server handlers
 */

// ============================================================================
// STEP 1: Add SQL Server initialization at the top of electron/main.js
// ============================================================================

// Add these imports after your existing requires:
const sqlConnection = require('../src/database/sqlConnection');
const { initializeDatabase } = require('../src/database/schema');

// ============================================================================
// STEP 2: Initialize database and connection on app startup
// ============================================================================

// Add this in the main ipcMain setup area (before createWindow or before BrowserWindow creation):

async function initializeSqlServer() {
  try {
    console.log('🔧 Initializing SQL Server connection...');
    
    // Connect to SQL Server
    await sqlConnection.connect();
    console.log('✅ Connected to SQL Server');
    
    // Initialize database schema (creates tables if they don't exist)
    await initializeDatabase();
    console.log('✅ Database schema initialized');
    
    return true;
  } catch (error) {
    console.error('❌ SQL Server initialization failed:', error);
    // You can choose to continue with local SQLite as fallback or exit
    // For now, we'll log the error and continue
    return false;
  }
}

// Call during app ready:
app.on('ready', async () => {
  // Initialize SQL Server BEFORE creating any windows
  const sqlReady = await initializeSqlServer();
  
  if (!sqlReady) {
    console.warn('⚠️  SQL Server not available. Running in offline mode.');
  }
  
  // Continue with normal window creation...
  createWindow();
});

// ============================================================================
// STEP 3: Replace existing IPC handlers with SQL Server versions
// ============================================================================

// OPTION A: Keep existing SQLite handlers and add SQL Server alongside
// This allows fallback if SQL Server is unavailable

// Example pattern:
ipcMain.handle('customers:get-all', async () => {
  try {
    // Try SQL Server first
    if (sqlConnection.isConnected()) {
      const query = 'SELECT * FROM dbo.customers ORDER BY name';
      return await sqlConnection.query(query);
    }
  } catch (error) {
    console.warn('SQL Server query failed, falling back to SQLite:', error.message);
  }
  
  // Fallback to SQLite (your existing handler)
  return db.prepare('SELECT * FROM customers').all();
});

// OPTION B: Complete migration to SQL Server only
// Recommended if you're fully transitioning away from SQLite

// Example structure for complete handlers:
const customersHandler = require('../src/database/handlers/customersHandler');
// This file contains all customers:* handlers implemented for SQL Server

// ============================================================================
// STEP 4: IPC Handlers to Update
// ============================================================================

// Priority 1 (Critical - Core data):
// - ipcMain.handle('customers:get-all', ...)
// - ipcMain.handle('customers:add', ...)
// - ipcMain.handle('customers:update', ...)
// - ipcMain.handle('customers:delete', ...)
// - ipcMain.handle('quotes:save-quote', ...)
// - ipcMain.handle('quotes:get-quote', ...)
// - ipcMain.handle('components:get-all', ...)

// Priority 2 (Important - Related data):
// - ipcMain.handle('sub-assemblies:get-all', ...)
// - ipcMain.handle('projects:get-all', ...)
// - ipcMain.handle('generated-numbers:get', ...)

// Priority 3 (Nice to have):
// - ipcMain.handle('sync:get-status', ...)
// - ipcMain.handle('sync:log-entry', ...)

// ============================================================================
// STEP 5: Update PRELOAD script if needed
// ============================================================================

// If you have preload.js that exposes IPC methods, verify it still works:
contextBridge.exposeInMainWorld('electronAPI', {
  // These should already be exposed if they were before
  getCustomers: () => ipcRenderer.invoke('customers:get-all'),
  addCustomer: (data) => ipcRenderer.invoke('customers:add', data),
  getQuote: (id) => ipcRenderer.invoke('quotes:get-quote', id),
  // ... etc
});

// ============================================================================
// STEP 6: Error Handling Pattern
// ============================================================================

// Use this pattern for all SQL Server handlers:
ipcMain.handle('your-handler-name', async (event, data) => {
  try {
    // Validate input
    if (!data) {
      throw new Error('Invalid input data');
    }

    // Check connection
    if (!sqlConnection.isConnected()) {
      throw new Error('Database connection not available');
    }

    // Execute query
    const result = await sqlConnection.query(/* query here */);

    // Return result
    return result;
  } catch (error) {
    console.error('[IPC] handler error:', error);
    
    // IMPORTANT: Return error to renderer in a way your code expects
    throw error; // or return { error: error.message }
  }
});

// ============================================================================
// STEP 7: Testing SQL Server Connection
// ============================================================================

// Add a test handler to verify everything works:
ipcMain.handle('database:test-connection', async () => {
  try {
    const isConnected = await sqlConnection.isConnected();
    const status = sqlConnection.getStatus();
    
    return {
      connected: isConnected,
      status: status,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
});

// From renderer (in React component):
// const dbStatus = await window.electronAPI.testConnection?.();
// console.log('Database status:', dbStatus);

// ============================================================================
// STEP 8: Graceful Shutdown
// ============================================================================

// Add this to your app shutdown handler:
app.on('before-quit', async () => {
  try {
    console.log('🛑 Shutting down SQL Server connection...');
    await sqlConnection.disconnect();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('Error closing connection:', error);
  }
});

// ============================================================================
// STEP 9: Network Troubleshooting
// ============================================================================

// If connection fails, check:
// 1. Network access: ping 192.168.1.150
// 2. SQL Server port: netstat -an | findstr 1433 (Windows)
// 3. Credentials: Verify user 'craft_cpq_app' exists and can login
// 4. Database: Verify 'CraftCPQ' database exists
// 5. Firewall: Ensure port 1433 is open between client and server

// Add this diagnostic handler:
ipcMain.handle('database:get-connection-info', async () => {
  const status = sqlConnection.getStatus();
  return {
    server: process.env.SQL_SERVER || '192.168.1.150\\SQLEXPRESS',
    database: process.env.SQL_DATABASE || 'CraftCPQ',
    pool: status.pool,
    lastError: status.lastError,
    timestamp: new Date().toISOString()
  };
});

// ============================================================================
// STEP 10: Summary of Changes
// ============================================================================

/*
Summary of required changes to electron/main.js:

1. ✅ Add imports for sqlConnection and initializeDatabase
2. ✅ Create initializeSqlServer() function
3. ✅ Call initializeSqlServer() in app.on('ready')
4. ✅ Update existing IPC handlers to use sqlConnection
5. ✅ Add error handling for connection failures
6. ✅ Test with database:test-connection handler
7. ✅ Add connection cleanup in app.on('before-quit')
8. ✅ Verify preload.js if it filters IPC calls
9. ✅ Update any hardcoded SQLite references
10. ✅ Test all data flows (customers, quotes, components, etc.)

Expected Benefits:
- Multi-user access via SQL Server (no file locking)
- Centralized data location (192.168.1.150)
- Better performance with connection pooling
- Built-in backup and recovery capabilities
- Sync log for audit trail

Timeline:
- Phase 1 (Today): Integrate connection and test
- Phase 2 (This week): Migrate all handlers
- Phase 3 (Next week): Test with real data
- Phase 4 (Production): Deploy to live environment
*/
