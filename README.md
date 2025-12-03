# Craft Tools Hub - API Data Sync Feature

## Complete Implementation Package

This package contains everything you need to implement two-way synchronization between your Craft Tools Hub Electron app and your external SQL database for customers, quotes, and order numbers.

---

## 📦 Package Contents

### Backend Files (Electron Main Process)
1. **DatabaseSyncService.js** - Core sync logic that handles SQLite ↔ SQL database synchronization
2. **sync-ipc-handlers.js** - IPC handlers that connect renderer to main process
3. **sync-preload-api.mjs** - Preload API definitions to expose sync to frontend

### Frontend Files (React Components)
4. **SyncService.js** - Frontend service that orchestrates sync operations
5. **SyncStatusIndicator.jsx** - UI component showing real-time sync status
6. **SyncSettingsPanel.jsx** - Full settings UI for configuring sync
7. **ConflictResolutionDialog.jsx** - UI for resolving sync conflicts

### Server Template
8. **sample-api-server.js** - Complete Express.js REST API template for your SQL database

### Documentation
9. **SYNC_IMPLEMENTATION_GUIDE.md** - Comprehensive implementation guide
10. **QUICK_START_CHECKLIST.md** - Step-by-step checklist

---

## 🎯 What This System Does

### Core Features
✅ **Two-way sync** - Push local changes to server, pull remote changes to app
✅ **Multiple sync modes** - Manual, scheduled auto-sync, or on-demand
✅ **Three entity types** - Customers, Quotes, and Orders
✅ **Conflict detection** - Automatic detection when both local and remote change
✅ **Conflict resolution** - Visual UI to choose local, remote, or manual merge
✅ **Sync statistics** - Track successful syncs, failures, records transferred
✅ **Connection monitoring** - Real-time status of database connection
✅ **Offline-first** - Work offline, sync when connection available

### Sync Modes
1. **Manual Sync** - Click button to sync on demand
2. **Auto-Sync** - Automatic sync every N minutes (configurable)
3. **Launch Sync** - Sync immediately when app starts
4. **Entity-Specific** - Sync only customers, quotes, or orders individually

### Sync Directions
- **Push** - Local → Remote (send changes to server)
- **Pull** - Remote → Local (get changes from server)
- **Both** - Two-way synchronization (recommended)

### Conflict Resolution Strategies
- **Remote Wins** - Keep server version
- **Local Wins** - Keep app version
- **Manual** - Show UI dialog to let user decide

---

## 🚀 Quick Start (30-60 minutes)

### 1. Install Dependencies
```bash
npm install better-sqlite3 axios electron-store --save
```

### 2. Copy Files to Your Project

**Backend files → `electron/`**
- DatabaseSyncService.js
- sync-ipc-handlers.js

**Frontend files → `src/services/` and `src/components/`**
- SyncService.js → src/services/
- SyncStatusIndicator.jsx → src/components/
- SyncSettingsPanel.jsx → src/components/
- ConflictResolutionDialog.jsx → src/components/

### 3. Update electron/main.js

Add imports:
```javascript
import { initializeSyncService, registerSyncHandlers, cleanupSyncService } from './sync-ipc-handlers.js';
```

In app.whenReady():
```javascript
initializeSyncService({
  remoteApiUrl: process.env.REMOTE_API_URL || 'https://your-api.com/api',
  remoteApiKey: process.env.REMOTE_API_KEY || 'your-key'
});
registerSyncHandlers();
```

### 4. Update electron/preload.mjs

Add the sync API from `sync-preload-api.mjs` to your contextBridge.

### 5. Create Configuration

Create `.env` file:
```env
REMOTE_API_URL=https://your-database-api.com/api
REMOTE_API_KEY=your-secret-api-key
```

### 6. Initialize in React App

```javascript
import { syncService } from './services/SyncService';

function App() {
  useEffect(() => {
    syncService.initialize().catch(console.error);
    return () => syncService.destroy();
  }, []);
}
```

### 7. Add UI Components

```javascript
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import { SyncSettingsPanel } from './components/SyncSettingsPanel';

// Add to your dashboard/header:
<SyncStatusIndicator />

// Add to settings page:
<SyncSettingsPanel />
```

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────┐
│         Craft Tools Hub App             │
├─────────────────────────────────────────┤
│  React UI Components                    │
│  • SyncStatusIndicator                  │
│  • SyncSettingsPanel                    │
│  • ConflictResolutionDialog             │
├─────────────────────────────────────────┤
│  Frontend Service Layer                 │
│  • SyncService.js (orchestration)       │
├─────────────────────────────────────────┤
│  Electron IPC Bridge                    │
│  • window.sync.* (preload API)          │
│  • IPC Handlers (sync-ipc-handlers)     │
├─────────────────────────────────────────┤
│  Backend Service Layer                  │
│  • DatabaseSyncService.js               │
├─────────────────────────────────────────┤
│  Local SQLite Database                  │
│  • customers                            │
│  • quotes                               │
│  • orders                               │
│  • sync_metadata                        │
│  • sync_conflicts                       │
└─────────────────────────────────────────┘
                ↕ HTTPS/REST
┌─────────────────────────────────────────┐
│      Remote SQL Database API            │
│  • GET/POST /api/customers              │
│  • GET/POST /api/quotes                 │
│  • GET/POST /api/orders                 │
└─────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Local SQLite Tables

**customers**
- id, name, company, email, phone
- address, city, state, zip, country
- notes, created_at, updated_at, deleted_at

**quotes**
- id, quote_number, customer_id
- project_name, status, total_amount
- discount_percent, tax_percent
- notes, valid_until, created_by
- created_at, updated_at, deleted_at

**orders**
- id, order_number, quote_id, customer_id
- status, order_date, delivery_date
- total_amount, payment_status
- notes, created_at, updated_at, deleted_at

**sync_metadata**
- Tracks sync state per record
- local_version, remote_version
- last_synced_at, sync_status

**sync_conflicts**
- Records detected conflicts
- local_data, remote_data (JSON)
- resolved, resolution

---

## 🔧 Configuration Options

### Environment Variables
```env
REMOTE_API_URL=https://your-api.com/api
REMOTE_API_KEY=your-secret-key
```

### Auto-Sync Settings
- Interval: 5 minutes to 24 hours
- Default: 30 minutes
- Configurable in UI

### Conflict Resolution
- Remote (server wins) - Default
- Local (app wins)
- Manual (user decides)

---

## 🎛️ API Requirements

Your SQL database needs a REST API with these endpoints:

### Health Check
```
GET /api/health
→ { "status": "ok", "message": "Connected" }
```

### Get Records (with optional filter)
```
GET /api/customers?updatedSince=2024-01-01T00:00:00Z
GET /api/quotes?updatedSince=2024-01-01T00:00:00Z
GET /api/orders?updatedSince=2024-01-01T00:00:00Z
```

### Create/Update Records
```
POST /api/customers
POST /api/quotes
POST /api/orders
```

### Authentication
```
Authorization: Bearer YOUR_API_KEY
```

**See `sample-api-server.js` for a complete implementation example!**

---

## 📈 Usage Examples

### Manual Sync
```javascript
// Sync everything
await syncService.syncAll({ 
  direction: 'both',
  conflictResolution: 'remote' 
});

// Sync just customers
await syncService.syncEntity('customers', {
  direction: 'push'
});
```

### Auto-Sync
```javascript
// Enable with 30-minute interval
syncService.startAutoSync();
syncService.setAutoSyncInterval(30);

// Disable
syncService.stopAutoSync();
```

### Listen to Events
```javascript
syncService.on('sync:complete', (result) => {
  console.log('Sync finished:', result);
});

syncService.on('sync:error', (error) => {
  console.error('Sync failed:', error);
});
```

---

## ✅ Testing Checklist

- [ ] Install dependencies successfully
- [ ] Copy all files to correct locations
- [ ] Update main.js and preload.mjs
- [ ] Create .env configuration
- [ ] Build app without errors
- [ ] Test connection to remote database
- [ ] Run manual sync successfully
- [ ] Verify data appears in local database
- [ ] Test auto-sync functionality
- [ ] Create and resolve a conflict
- [ ] Production deployment ready

---

## 🐛 Troubleshooting

### Connection Failed
1. Check REMOTE_API_URL is correct
2. Verify API server is running
3. Test API endpoint in browser/Postman
4. Check firewall settings

### Sync Failed
1. Check API key is valid
2. Verify database permissions
3. Review console error messages
4. Test endpoints independently

### Module Not Found
1. Run `npm install` again
2. Check file paths match imports
3. Rebuild with `npm run build`

---

## 📚 Documentation Files

1. **QUICK_START_CHECKLIST.md** - Step-by-step implementation guide
2. **SYNC_IMPLEMENTATION_GUIDE.md** - Comprehensive technical documentation
3. **sample-api-server.js** - Complete API server template

---

## 🔒 Security Best Practices

✅ Never commit API keys to version control
✅ Use environment variables for credentials
✅ Enable HTTPS for API communications
✅ Implement rate limiting on API
✅ Validate all data before syncing
✅ Use proper authentication/authorization
✅ Consider encrypting sensitive local data

---

## 📊 What Gets Synced

### Customers
- Contact information
- Company details
- Address information
- Notes and metadata

### Quotes
- Quote numbers (unique identifiers)
- Customer associations
- Project details
- Pricing information
- Status and validity dates

### Orders
- Order numbers (unique identifiers)
- Quote and customer links
- Order and delivery dates
- Payment information
- Status tracking

---

## 🎯 Success Criteria

Your implementation is complete when:

✅ App connects to remote database
✅ Manual sync works (push & pull)
✅ Auto-sync runs on schedule
✅ Conflicts are detected
✅ Conflict resolution UI works
✅ Sync status visible in UI
✅ Error handling functional
✅ Data integrity maintained
✅ Production ready

---

## ⏱️ Time Estimate

- **Basic Implementation**: 30-60 minutes
- **Testing & Debugging**: 30-60 minutes  
- **Production Deployment**: 1-2 hours
- **Total**: 2-4 hours

---

## 🆘 Support

If you encounter issues:
1. Check QUICK_START_CHECKLIST.md
2. Review SYNC_IMPLEMENTATION_GUIDE.md
3. Check console logs for errors
4. Verify all dependencies installed
5. Test API endpoints independently
6. Check database permissions

---

## 📝 File Descriptions

| File | Purpose | Location |
|------|---------|----------|
| DatabaseSyncService.js | Core sync logic | electron/ |
| sync-ipc-handlers.js | IPC communication | electron/ |
| sync-preload-api.mjs | Renderer API | electron/ |
| SyncService.js | Frontend orchestration | src/services/ |
| SyncStatusIndicator.jsx | Status badge UI | src/components/ |
| SyncSettingsPanel.jsx | Settings interface | src/components/ |
| ConflictResolutionDialog.jsx | Conflict UI | src/components/ |
| sample-api-server.js | API template | (reference) |

---

## 🚀 Next Steps

1. **Read** QUICK_START_CHECKLIST.md
2. **Copy** files to your project
3. **Configure** environment variables
4. **Test** connection to remote database
5. **Deploy** to production

---

## 📄 License

This sync implementation is part of Craft Tools Hub.
Copyright © 2025 Craft Automation. All rights reserved.

---

**Ready to get started? Open QUICK_START_CHECKLIST.md!**
