# Quick Start Checklist: API Data Sync Implementation

## Pre-Implementation Checklist

### ✅ 1. Database Setup
- [ ] SQL database server is accessible
- [ ] Tables exist for customers, quotes, orders
- [ ] Database credentials are available
- [ ] Firewall allows connections from app

### ✅ 2. API Server Setup
- [ ] REST API server is deployed
- [ ] API endpoints are accessible
- [ ] API key authentication is configured
- [ ] HTTPS is enabled (recommended)

### ✅ 3. Development Environment
- [ ] Node.js 18+ is installed
- [ ] Git repository is cloned
- [ ] npm dependencies are up to date
- [ ] Electron app runs successfully

## Implementation Steps (30-60 minutes)

### Step 1: Install Dependencies (5 min)
```bash
cd /path/to/CRAFT
npm install better-sqlite3 axios electron-store --save
```

- [ ] Dependencies installed successfully
- [ ] No installation errors

### Step 2: Copy Service Files (10 min)

Copy these files to your project:

**Backend Files (electron/)**
- [ ] `DatabaseSyncService.js` → `electron/DatabaseSyncService.js`
- [ ] `sync-ipc-handlers.js` → `electron/sync-ipc-handlers.js`
- [ ] `sync-preload-api.mjs` → Review and add to `electron/preload.mjs`

**Frontend Files (src/)**
- [ ] `SyncService.js` → `src/services/SyncService.js`
- [ ] `SyncStatusIndicator.jsx` → `src/components/SyncStatusIndicator.jsx`
- [ ] `SyncSettingsPanel.jsx` → `src/components/SyncSettingsPanel.jsx`
- [ ] `ConflictResolutionDialog.jsx` → `src/components/ConflictResolutionDialog.jsx`

### Step 3: Update Electron Main Process (10 min)

Edit `electron/main.js`:

1. Add imports at top:
```javascript
import { initializeSyncService, registerSyncHandlers, cleanupSyncService } from './sync-ipc-handlers.js';
```

2. In `app.whenReady()`:
```javascript
initializeSyncService({
  remoteApiUrl: process.env.REMOTE_API_URL || 'https://your-api.com/api',
  remoteApiKey: process.env.REMOTE_API_KEY || 'your-key'
});
registerSyncHandlers();
```

3. Before app quit:
```javascript
app.on('before-quit', () => {
  cleanupSyncService();
});
```

- [ ] Imports added
- [ ] Initialization code added
- [ ] Cleanup code added
- [ ] No syntax errors

### Step 4: Update Preload Script (5 min)

Edit `electron/preload.mjs`:

Add the sync API exposure (see `sync-preload-api.mjs` for full code)

- [ ] `window.sync` API exposed
- [ ] All methods included
- [ ] No syntax errors

### Step 5: Create Environment Config (5 min)

Create `.env` file in project root:
```env
REMOTE_API_URL=https://your-database-api.com/api
REMOTE_API_KEY=your-secret-api-key-here
```

Or create `config.json`:
```json
{
  "sync": {
    "apiUrl": "https://your-api.com/api",
    "apiKey": "your-key-here"
  }
}
```

- [ ] Configuration file created
- [ ] API URL is correct
- [ ] API key is valid
- [ ] File is added to `.gitignore`

### Step 6: Initialize in React App (10 min)

Edit your main `App.jsx`:

```javascript
import { syncService } from './services/SyncService';

function App() {
  useEffect(() => {
    syncService.initialize().catch(console.error);
    return () => syncService.destroy();
  }, []);
  
  // ... rest of your app
}
```

- [ ] Import added
- [ ] Initialization code added
- [ ] Cleanup added
- [ ] No errors on load

### Step 7: Add UI Components (10 min)

**Add Sync Status Badge:**
```javascript
import { SyncStatusIndicator } from './components/SyncStatusIndicator';

// In your header/navbar:
<SyncStatusIndicator />
```

**Add Settings Panel:**
```javascript
import { SyncSettingsPanel } from './components/SyncSettingsPanel';

// In settings page:
<SyncSettingsPanel />
```

- [ ] Status indicator added to UI
- [ ] Settings panel added
- [ ] Components render without errors

### Step 8: Build and Test (10 min)

```bash
npm run build
npm run electron:dev
```

- [ ] App builds successfully
- [ ] App launches without errors
- [ ] Console shows no critical errors

## Testing Checklist

### Connection Test
- [ ] Open app
- [ ] Navigate to Sync Settings
- [ ] Click "Test Connection"
- [ ] ✅ Connection successful OR ❌ See error message

### Manual Sync Test
- [ ] Select "All" entities
- [ ] Select "Pull only" direction
- [ ] Click "Sync Now"
- [ ] ✅ Sync completes OR ❌ See error

### Data Verification
- [ ] Open app database (using SQLite viewer)
- [ ] Check that customers table exists
- [ ] Check that quotes table exists
- [ ] Check that orders table exists
- [ ] Verify data was pulled from remote

### Auto-Sync Test
- [ ] Enable auto-sync in settings
- [ ] Set interval to 5 minutes (for testing)
- [ ] Wait 5 minutes
- [ ] ✅ Auto-sync triggers OR ❌ Check console

### Conflict Test
- [ ] Modify a record in app
- [ ] Modify same record in remote database
- [ ] Run sync
- [ ] ✅ Conflict dialog appears OR ❌ No conflict detected

## Production Deployment

### Security
- [ ] API key stored securely (env variable)
- [ ] HTTPS enabled for API
- [ ] API rate limiting configured
- [ ] Database credentials not in code

### Performance
- [ ] Auto-sync interval set appropriately (30+ min recommended)
- [ ] Tested with production data volumes
- [ ] Network timeout settings configured
- [ ] Error handling tested

### Monitoring
- [ ] Sync logs reviewed
- [ ] Error tracking configured
- [ ] Success/failure metrics tracked
- [ ] User notifications for sync failures

## Troubleshooting Common Issues

### "Connection failed"
- ✅ Check REMOTE_API_URL is correct
- ✅ Verify API server is running
- ✅ Check network/firewall settings
- ✅ Test API endpoint in browser

### "Sync failed: unauthorized"
- ✅ Verify API key is correct
- ✅ Check Authorization header format
- ✅ Confirm API key is valid on server

### "Database error"
- ✅ Check SQLite database file permissions
- ✅ Verify database path is writable
- ✅ Check disk space available
- ✅ Review console for SQL errors

### "Module not found"
- ✅ Run `npm install` again
- ✅ Check that all files are copied correctly
- ✅ Verify import paths match file structure
- ✅ Rebuild with `npm run build`

## Success Criteria

Your sync implementation is complete when:

- [x] App connects to remote database successfully
- [x] Manual sync pulls and pushes data
- [x] Auto-sync runs on schedule
- [x] Conflicts are detected and resolvable
- [x] Sync status visible in UI
- [x] Error handling works correctly
- [x] Data integrity maintained
- [x] Production ready and secure

## Next Steps After Implementation

1. **Monitor First Week**
   - Check sync logs daily
   - Watch for errors or conflicts
   - Adjust sync interval if needed
   - Gather user feedback

2. **Optimize**
   - Fine-tune conflict resolution strategy
   - Adjust auto-sync frequency
   - Add custom sync rules if needed
   - Implement data validation

3. **Scale**
   - Add more entities if needed
   - Implement pagination for large datasets
   - Add background sync notifications
   - Create sync reports/analytics

## Support Resources

- Implementation Guide: `SYNC_IMPLEMENTATION_GUIDE.md`
- Sample API Server: `sample-api-server.js`
- Source Files: All provided `.js` and `.jsx` files
- Console Logs: Check browser DevTools and Electron logs

## Time Estimate

- **Basic Implementation**: 30-60 minutes
- **Testing & Debugging**: 30-60 minutes
- **Production Deployment**: 1-2 hours
- **Total**: 2-4 hours for complete implementation

---

## Quick Reference: Key Commands

```bash
# Install dependencies
npm install better-sqlite3 axios electron-store

# Build app
npm run build

# Run development
npm run electron:dev

# Build production
npm run dist

# Test connection (in app console)
await window.sync.testConnection()

# Manual sync (in app console)
await syncService.syncAll()
```

## Need Help?

If you encounter issues:
1. Check console logs for errors
2. Review implementation guide
3. Verify all checklist items are complete
4. Test API endpoints independently
5. Check database permissions
