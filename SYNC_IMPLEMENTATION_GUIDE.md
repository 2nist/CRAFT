# API Data Sync Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing the two-way sync system between Craft Tools Hub and your external SQL database for customers, quotes, and order numbers.

## Architecture

```
Frontend (React) 
  ↓ 
SyncService.js (Orchestration)
  ↓
window.sync.* (Preload API)
  ↓
IPC Handlers (Main Process)
  ↓
DatabaseSyncService.js (Sync Logic)
  ↓
Local SQLite ↔ Remote SQL Database (via REST API)
```

## Installation Steps

### 1. Install Required Dependencies

Add these packages to your project:

```bash
npm install better-sqlite3 axios electron-store
```

### 2. Update package.json

Add these dependencies if not present:

```json
{
  "dependencies": {
    "better-sqlite3": "^9.2.2",
    "axios": "^1.6.5",
    "electron-store": "^8.1.0"
  }
}
```

### 3. File Structure

Create the following directory structure in your project:

```
src/
├── services/
│   ├── SyncService.js              (Frontend sync orchestration)
│   └── SearchService.js            (Existing - already present)
├── components/
│   ├── SyncStatusIndicator.jsx     (Status badge)
│   ├── SyncSettingsPanel.jsx       (Settings UI)
│   └── ConflictResolutionDialog.jsx (Conflict handling)
electron/
├── main.js                          (Existing - needs modifications)
├── preload.mjs                      (Existing - needs modifications)
├── DatabaseSyncService.js           (NEW - Database sync logic)
└── sync-ipc-handlers.js             (NEW - IPC handlers)
```

### 4. Update Electron Main Process (electron/main.js)

Add these imports at the top:

```javascript
import { initializeSyncService, registerSyncHandlers, cleanupSyncService } from './sync-ipc-handlers.js';
```

In your `app.whenReady()` callback, add:

```javascript
app.whenReady().then(() => {
  // ... your existing code ...
  
  // Initialize sync service with configuration
  initializeSyncService({
    remoteApiUrl: process.env.REMOTE_API_URL || 'https://your-api-server.com/api',
    remoteApiKey: process.env.REMOTE_API_KEY || 'your-api-key-here'
  });
  
  // Register sync IPC handlers
  registerSyncHandlers();
  
  createWindow();
});
```

Before app quit, add cleanup:

```javascript
app.on('before-quit', () => {
  cleanupSyncService();
});
```

### 5. Update Preload Script (electron/preload.mjs)

Add the sync API exposure to your existing `contextBridge.exposeInMainWorld`:

```javascript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('sync', {
  testConnection: () => ipcRenderer.invoke('sync:test-connection'),
  syncEntity: (options) => ipcRenderer.invoke('sync:sync-entity', options),
  getPendingConflicts: () => ipcRenderer.invoke('sync:get-pending-conflicts'),
  resolveConflict: (data) => ipcRenderer.invoke('sync:resolve-conflict', data),
  getSettings: () => ipcRenderer.invoke('sync:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('sync:save-settings', settings),
  getCustomers: () => ipcRenderer.invoke('sync:get-customers'),
  getQuotes: () => ipcRenderer.invoke('sync:get-quotes'),
  getOrders: () => ipcRenderer.invoke('sync:get-orders'),
  saveCustomer: (customer) => ipcRenderer.invoke('sync:save-customer', customer),
  saveQuote: (quote) => ipcRenderer.invoke('sync:save-quote', quote),
  saveOrder: (order) => ipcRenderer.invoke('sync:save-order', order)
});
```

### 6. Initialize SyncService in React App

In your main App.jsx or a context provider:

```javascript
import { syncService } from './services/SyncService';

function App() {
  useEffect(() => {
    // Initialize sync service on app start
    syncService.initialize().catch(error => {
      console.error('Failed to initialize sync service:', error);
    });

    // Cleanup on unmount
    return () => {
      syncService.destroy();
    };
  }, []);

  // ... rest of your app
}
```

### 7. Add UI Components

#### Add Sync Status to Dashboard/Layout:

```javascript
import { SyncStatusIndicator } from './components/SyncStatusIndicator';

function Dashboard() {
  return (
    <div>
      <header>
        {/* Your existing header content */}
        <SyncStatusIndicator />
      </header>
      {/* Rest of your dashboard */}
    </div>
  );
}
```

#### Add Settings Panel to Settings Page:

```javascript
import { SyncSettingsPanel } from './components/SyncSettingsPanel';

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <SyncSettingsPanel />
    </div>
  );
}
```

#### Add Conflict Resolution:

```javascript
import { ConflictResolutionDialog } from './components/ConflictResolutionDialog';
import { syncService } from './services/SyncService';

function SomeComponent() {
  const [showConflicts, setShowConflicts] = useState(false);
  
  useEffect(() => {
    // Show conflict dialog when conflicts are detected
    syncService.on('sync:complete', (result) => {
      if (result.conflicts && result.conflicts.length > 0) {
        setShowConflicts(true);
      }
    });
  }, []);

  return (
    <>
      {/* Your component content */}
      <ConflictResolutionDialog 
        isOpen={showConflicts}
        onClose={() => setShowConflicts(false)}
      />
    </>
  );
}
```

## Environment Configuration

### Option 1: Environment Variables

Create a `.env` file in your project root:

```env
REMOTE_API_URL=https://your-database-api.com/api
REMOTE_API_KEY=your-secret-api-key-here
```

### Option 2: Configuration File

Or create a `config.json` file:

```json
{
  "sync": {
    "apiUrl": "https://your-database-api.com/api",
    "apiKey": "your-secret-api-key-here",
    "autoSyncEnabled": true,
    "syncIntervalMinutes": 30
  }
}
```

## Remote API Requirements

Your remote SQL database needs a REST API with the following endpoints:

### Required Endpoints:

1. **Health Check**
   ```
   GET /api/health
   Response: { "status": "ok", "message": "Connected successfully" }
   ```

2. **Get Customers**
   ```
   GET /api/customers?updatedSince=2024-01-01T00:00:00Z
   Response: { 
     "records": [
       { "id": "CUST-123", "name": "John Doe", "email": "john@example.com", ... }
     ]
   }
   ```

3. **Create/Update Customer**
   ```
   POST /api/customers
   Body: { "id": "CUST-123", "name": "John Doe", ... }
   Response: { "id": "CUST-123", "version": 2, "success": true }
   ```

4. **Get Quotes**
   ```
   GET /api/quotes?updatedSince=2024-01-01T00:00:00Z
   ```

5. **Create/Update Quote**
   ```
   POST /api/quotes
   ```

6. **Get Orders**
   ```
   GET /api/orders?updatedSince=2024-01-01T00:00:00Z
   ```

7. **Create/Update Order**
   ```
   POST /api/orders
   ```

### Authentication

All requests must include the API key in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

## Usage Examples

### Manual Sync (One-time)

```javascript
import { syncService } from './services/SyncService';

// Sync everything
const result = await syncService.syncAll({
  direction: 'both',
  conflictResolution: 'remote'
});

// Sync just customers
const result = await syncService.syncEntity('customers', {
  direction: 'push',
  conflictResolution: 'local'
});
```

### Automatic Sync (Scheduled)

```javascript
// Enable auto-sync every 30 minutes
syncService.startAutoSync();
syncService.setAutoSyncInterval(30);

// Disable auto-sync
syncService.stopAutoSync();
```

### Sync on App Launch

```javascript
useEffect(() => {
  syncService.initialize().then(() => {
    // Sync immediately on app launch
    syncService.syncAll({
      direction: 'both',
      conflictResolution: 'remote'
    });
  });
}, []);
```

### Listen to Sync Events

```javascript
syncService.on('sync:start', () => {
  console.log('Sync started');
});

syncService.on('sync:complete', (result) => {
  console.log('Sync completed:', result);
  if (result.conflicts.length > 0) {
    // Show conflict resolution UI
  }
});

syncService.on('sync:error', (error) => {
  console.error('Sync failed:', error);
});

syncService.on('connection:failed', (error) => {
  console.error('Connection lost:', error);
});
```

## Database Schema

The local SQLite database will have these tables:

### customers
- id (TEXT PRIMARY KEY)
- name, company, email, phone
- address, city, state, zip, country
- notes
- created_at, updated_at, deleted_at

### quotes
- id (TEXT PRIMARY KEY)
- quote_number (UNIQUE)
- customer_id (FOREIGN KEY)
- project_name, status
- total_amount, discount_percent, tax_percent
- notes, valid_until, created_by
- created_at, updated_at, deleted_at

### orders
- id (TEXT PRIMARY KEY)
- order_number (UNIQUE)
- quote_id, customer_id (FOREIGN KEYS)
- status, order_date, delivery_date
- total_amount, payment_status
- notes
- created_at, updated_at, deleted_at

### sync_metadata
- Tracks sync state for each record
- local_version, remote_version
- last_synced_at, sync_status

### sync_conflicts
- Records detected conflicts
- local_data, remote_data (JSON)
- conflict_type, resolved, resolution
- created_at, resolved_at

## Troubleshooting

### Connection Issues

1. Check that `REMOTE_API_URL` is correct
2. Verify API key is valid
3. Test connection using "Test Connection" button
4. Check network/firewall settings

### Sync Failures

1. Check console for error messages
2. Verify API endpoints are responding
3. Check database permissions
4. Review sync logs in settings panel

### Conflicts Not Resolving

1. Ensure conflict resolution strategy is set
2. Check that conflict IDs are valid
3. Verify database write permissions
4. Review conflict data in dialog

### Performance Issues

1. Reduce sync frequency (increase interval)
2. Sync entities individually instead of all at once
3. Check network bandwidth
4. Consider data pagination for large datasets

## Security Considerations

1. **Never commit API keys** to version control
2. Use environment variables for sensitive data
3. Implement **rate limiting** on remote API
4. Use **HTTPS** for all API communications
5. Validate all data before syncing
6. Implement **proper authentication** and authorization
7. Consider **encrypting** sensitive data in local database

## Testing

### Test Connection
```javascript
const result = await window.sync.testConnection();
console.log(result);
```

### Test Individual Entity Sync
```javascript
// Test customer sync
const result = await window.sync.syncEntity({
  entity: 'customers',
  direction: 'pull',
  conflictResolution: 'remote'
});
console.log(result);
```

### Create Test Data
```javascript
// Add test customer
await window.sync.saveCustomer({
  name: 'Test Customer',
  email: 'test@example.com',
  company: 'Test Company'
});

// Verify it appears in database
const customers = await window.sync.getCustomers();
console.log(customers);
```

## Next Steps

1. Set up your remote SQL database with REST API
2. Configure environment variables with API credentials
3. Test connection to remote database
4. Run initial sync to populate local database
5. Enable auto-sync for continuous synchronization
6. Monitor sync status and handle conflicts as they arise

## Support

For issues or questions:
- Check console logs for errors
- Review sync statistics in settings panel
- Test individual components separately
- Verify remote API is functioning correctly
