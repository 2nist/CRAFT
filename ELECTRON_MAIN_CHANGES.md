/**
 * ELECTRON/MAIN.JS - SQL SERVER INTEGRATION STEPS
 * 
 * This file documents the exact changes needed to integrate SQL Server
 * Find the line numbers in your electron/main.js and apply these changes
 */

// ============================================================================
// CHANGE #1: Add import at the top of the file (around line 8-15)
// ============================================================================

// Add this import after the other imports:
// import { initializeSqlServer, shutdownSqlServer } from '../src/database/init-handler.js'

// Example placement (after SyncManager import, around line 18):
/*
import SyncManager from './sync-manager.js'
import { initializeSqlServer, shutdownSqlServer } from '../src/database/init-handler.js'  // ADD THIS LINE
*/

// ============================================================================
// CHANGE #2: Integrate SQL Server initialization in app.whenReady()
// ============================================================================

// Current code (line ~1770-1800):
/*
app.whenReady().then(async () => {
  // Show splash screen first
  createSplashWindow();
  
  await initDataStorage()
  await initPluginsDirectory()
  await initEmbeddedServer()
  await initializeGeneratedNumbersDatabase()
  await loadPlugins()
  await loadComponents()
  await loadSubAssemblies()
  
  // ... rest of initialization
*/

// UPDATED CODE:
/*
app.whenReady().then(async () => {
  // Show splash screen first
  createSplashWindow();
  
  // NEW: Initialize SQL Server BEFORE other operations
  const sqlStatus = await initializeSqlServer();
  if (sqlStatus.success) {
    console.log('📊 Using SQL Server as primary database');
  } else {
    console.warn('📁 SQL Server unavailable, using local storage fallback');
  }
  
  await initDataStorage()
  await initPluginsDirectory()
  await initEmbeddedServer()
  await initializeGeneratedNumbersDatabase()
  await loadPlugins()
  await loadComponents()
  await loadSubAssemblies()
  
  // ... rest of initialization
*/

// ============================================================================
// CHANGE #3: Add SQL Server test handler
// ============================================================================

// Add this handler near the end of your IPC handlers section (before createWindow call):
/*
ipcMain.handle('database:test-connection', async () => {
  try {
    const sqlConnection = (await import('../src/database/sqlConnection.js')).default;
    const isConnected = await sqlConnection.isConnected();
    const status = sqlConnection.getStatus();
    
    return {
      connected: isConnected,
      status: status,
      server: '192.168.1.150\\SQLEXPRESS',
      database: 'CraftCPQ',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});
*/

// ============================================================================
// CHANGE #4: Replace customers:get-all handler
// ============================================================================

// CURRENT CODE (around line 3967):
/*
ipcMain.handle('customers:get-all', () => { return MOCK_CUSTOMERS; });
*/

// UPDATED CODE:
/*
ipcMain.handle('customers:get-all', async () => {
  try {
    const sqlConnection = (await import('../src/database/sqlConnection.js')).default;
    
    // Try SQL Server first
    if (sqlConnection.isConnected()) {
      const query = 'SELECT id, name, code, isOEM FROM dbo.customers ORDER BY name';
      const customers = await sqlConnection.query(query);
      
      return customers.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        isOEM: c.isOEM
      }));
    }
  } catch (error) {
    console.warn('[IPC] SQL Server query failed, using mock data:', error.message);
  }
  
  // Fallback to mock data
  return MOCK_CUSTOMERS;
});
*/

// ============================================================================
// CHANGE #5: Replace customers:add handler
// ============================================================================

// CURRENT CODE (around line 3970):
/*
ipcMain.handle('customers:add', async (event, { name, isOEM }) => {
  try {
    // Load existing custom customers
    const settings = await readJSONFile('settings.json') || {}
    const customCustomerData = settings.customCustomers ? JSON.parse(settings.customCustomers) : {}
    const allCustomers = { ...DEFAULT_CUSTOMER_DATA, ...customCustomerData }
    
    // ... rest of handler
*/

// UPDATED CODE:
/*
ipcMain.handle('customers:add', async (event, { name, isOEM }) => {
  try {
    const sqlConnection = (await import('../src/database/sqlConnection.js')).default;
    
    if (!name || !name.trim()) {
      throw new Error('Customer name is required');
    }

    // Try SQL Server first
    if (sqlConnection.isConnected()) {
      const customerId = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 50);

      const query = `
        INSERT INTO dbo.customers (id, name, isOEM, created_at, updated_at, updated_by)
        VALUES (@id, @name, @isOEM, GETDATE(), GETDATE(), @user)
      `;

      const params = {
        id: customerId,
        name: name.trim(),
        isOEM: isOEM ? 1 : 0,
        user: 'system'
      };

      await sqlConnection.execute(query, params);
      
      return {
        id: customerId,
        name: name.trim(),
        isOEM: isOEM
      };
    }
  } catch (error) {
    console.warn('[IPC] SQL Server insert failed, using local storage:', error.message);
  }

  // Fallback to existing local storage logic
  try {
    // Load existing custom customers
    const settings = await readJSONFile('settings.json') || {}
    const customCustomerData = settings.customCustomers ? JSON.parse(settings.customCustomers) : {}
    const allCustomers = { ...DEFAULT_CUSTOMER_DATA, ...customCustomerData }
    
    // ... rest of existing handler code
  } catch (err) {
    console.error('Error adding customer:', err)
    throw err
  }
});
*/

// ============================================================================
// CHANGE #6: Add app shutdown handler
// ============================================================================

// Add this handler at the end of main.js (after createWindow and menu setup):
/*
app.on('before-quit', async () => {
  console.log('🛑 Shutting down SQL Server connection...');
  await shutdownSqlServer();
  console.log('✅ Graceful shutdown complete');
});
*/

// ============================================================================
// CHANGE #7: Update customers:update handler (Line ~4050)
// ============================================================================

// Add SQL Server support similar to above handlers

// ============================================================================
// CHANGE #8: Update customers:delete handler (Line ~4028)
// ============================================================================

// Add SQL Server support similar to above handlers

// ============================================================================
// PRIORITY HANDLERS TO MIGRATE (In order)
// ============================================================================

/*
Priority 1 (CRITICAL):
1. customers:get-all (Line 3967)
2. customers:add (Line 3970)
3. customers:update (Line 4050)
4. customers:delete (Line 4028)

Priority 2 (IMPORTANT):
5. quotes:save-quote
6. quotes:get-quote
7. components:get-all
8. sub-assemblies:get-all

Priority 3 (OPTIONAL):
9. projects:*
10. sync:*
11. generated-numbers:*
*/

// ============================================================================
// TESTING STEPS
// ============================================================================

/*
1. Add the imports at the top
2. Add SQL Server initialization in app.whenReady()
3. Add database:test-connection handler
4. Start the app: npm run dev
5. Check console for "Connected to SQL Server" message
6. Open DevTools (F12) and run in console:
   - const status = await electronAPI.testConnection?.();
   - console.log(status);
7. Verify it shows { connected: true, status: {...} }
8. Then update one handler at a time and test each
9. Use app console to see if queries succeed or fail
*/

// ============================================================================
// FALLBACK PATTERN EXPLANATION
// ============================================================================

/*
Every handler should follow this pattern:

1. Try SQL Server first (if connected)
2. If SQL Server succeeds, return data
3. If SQL Server fails or throws, log warning
4. Fall back to existing local storage logic
5. This ensures backward compatibility while adding SQL Server support

This "try SQL, fallback to SQLite" approach means:
- No data loss during transition
- App works offline if SQL Server is unavailable
- Graceful degradation without errors
- Can test SQL Server separately without breaking existing functionality
*/

// ============================================================================
// EXPECTED BEHAVIOR AFTER MIGRATION
// ============================================================================

/*
Console output on app startup should show:
  
🔧 Initializing SQL Server connection...
✅ Connected to SQL Server (192.168.1.150\SQLEXPRESS)
✅ Database schema initialized (CraftCPQ)
📊 Using SQL Server as primary database
[IPC] Customer handlers initialized (SQL Server)
[IPC] Quote handlers initialized (SQL Server)
... etc

When accessing customers from UI:
- Query runs against SQL Server
- Data synced across all instances
- Changes visible to all connected users
*/
