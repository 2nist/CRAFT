# Multi-User Database Synchronization

## Overview

The Craft Tools Hub now supports **4-5 concurrent users** working simultaneously without database locking conflicts. This is achieved through a **local-first architecture** with **scheduled bi-directional synchronization** to a NAS master database.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User 1    │     │   User 2    │     │   User 3    │
│ (Local DB)  │     │ (Local DB)  │     │ (Local DB)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │    Scheduled      │    Scheduled      │    Scheduled
       │    Sync (2hrs)    │    Sync (2hrs)    │    Sync (2hrs)
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │  NAS Master DB │
                  │ (server.db)    │
                  └────────────────┘
```

## How It Works

### 1. Local Databases
- Each user has their own local SQLite database in `%APPDATA%\craft-tools-hub\database\`
- All operations (read/write) happen on the local database
- **Zero network latency** - instant response times
- **Offline capable** - users can work without NAS access

### 2. Scheduled Synchronization
- Automatic sync runs every **120 minutes** (2 hours) by default
- Bi-directional sync: pulls changes from NAS, pushes local changes to NAS
- Manual sync available via UI sync button
- Sync can be triggered programmatically via IPC

### 3. Conflict Resolution
- **Last-write-wins** strategy based on `updated_at` timestamps
- Tracks `updated_by` (username) for auditing
- Conflict count logged in sync history
- All tables include sync metadata columns:
  - `updated_at`: Timestamp of last modification
  - `updated_by`: Username who made the change
  - `synced_at`: Timestamp of last successful sync

### 4. Sync Process

**Pull Phase** (NAS → Local):
1. Query NAS for records modified since last sync
2. For each record, compare timestamps
3. If NAS record is newer, update local database
4. Track number of records pulled

**Push Phase** (Local → NAS):
1. Query local DB for records modified since last sync
2. For each record, compare with NAS version
3. If local record is newer, update NAS database
4. Track number of records pushed

**Logging**:
- All sync operations logged to `sync_log` table
- Tracks: timestamp, direction, status, records transferred, conflicts, duration

## Configuration

### Default Settings
```javascript
{
  syncIntervalMinutes: 120,  // Sync every 2 hours
  username: os.userInfo().username,
  localServerDb: '%APPDATA%/craft-tools-hub/database/server.db',
  nasServerDb: 'Z:/CTH/database/server.db'  // If NAS configured
}
```

### Customizing Sync Interval
```javascript
// Via IPC from renderer process
await window.electron.ipcRenderer.invoke('sync:setSchedule', 60) // 60 minutes
```

## API

### IPC Handlers

#### Get Sync Status
```javascript
const status = await window.electron.ipcRenderer.invoke('sync:getStatus')
// Returns:
{
  enabled: true,
  isSyncing: false,
  lastSyncTime: '2025-01-15T10:30:00.000Z',
  stats: {
    pulled: { quotes: 5, components: 12, ... },
    pushed: { quotes: 3, components: 0, ... },
    conflicts: 0
  },
  scheduledSync: true,
  intervalMinutes: 120,
  username: 'john.doe',
  nasDbPath: 'Z:/CTH/database/server.db'
}
```

#### Manual Sync
```javascript
const result = await window.electron.ipcRenderer.invoke('sync:manual')
// Returns:
{ 
  success: true, 
  message: 'Sync completed successfully',
  stats: { ... },
  duration: '2.34s'
}
```

#### Update Sync Schedule
```javascript
await window.electron.ipcRenderer.invoke('sync:setSchedule', 240) // 4 hours
```

#### Get Sync History
```javascript
const history = await window.electron.ipcRenderer.invoke('sync:getHistory')
// Returns array of sync log entries (last 50)
[
  {
    id: 1,
    timestamp: '2025-01-15T10:30:00.000Z',
    direction: 'bidirectional',
    status: 'success',
    records_pulled: 17,
    records_pushed: 5,
    conflicts: 0,
    duration_ms: 2340
  },
  ...
]
```

## UI Component

A `<SyncStatus />` component is available for displaying sync status:

```jsx
import SyncStatus from './components/SyncStatus'

function App() {
  return (
    <div>
      <SyncStatus />
      {/* Your app content */}
    </div>
  )
}
```

Features:
- Real-time sync status indicator
- "Sync Now" manual trigger button
- Last sync time display
- Error notifications
- Auto-refresh every 30 seconds

## Database Tables Synced

The following tables are synchronized:
- `components` - Component price list
- `sub_assemblies` - Saved sub-assemblies
- `quotes` - Project quotes
- `projects` - Projects
- `customers` - Customer database
- `manual_quotes` - Manual quote entries
- `generated_numbers` - Quote/project numbering

## Best Practices

### For Users
1. **Work normally** - The app handles sync automatically
2. **Check sync status** - Glance at sync indicator before critical operations
3. **Manual sync before important work** - Click "Sync Now" before major edits
4. **Resolve conflicts promptly** - If notified of conflicts, review changes

### For Administrators
1. **Network reliability** - Ensure stable NAS connectivity
2. **Backup master DB** - Regular backups of `Z:/CTH/database/server.db`
3. **Monitor sync logs** - Check for persistent sync failures
4. **Adjust interval** - Tune sync frequency based on usage patterns

### Conflict Scenarios

**Example 1: Simultaneous Edits**
- User A edits Quote #123 at 10:00 AM
- User B edits Quote #123 at 10:15 AM
- User A syncs at 10:30 AM (pushes changes)
- User B syncs at 10:35 AM (B's changes win - newer timestamp)
- Result: User A's changes are overwritten

**Prevention**: Manual sync before editing shared records

**Example 2: Offline Work**
- User A works offline all day
- User B makes changes and syncs regularly
- User A comes online and syncs at 5:00 PM
- A's changes pushed (if newer) or overwritten (if older)
- Result: Depends on timestamps

## Troubleshooting

### Sync Not Working
1. Check NAS connectivity: Can you access `Z:/CTH/`?
2. Verify NAS path in Settings → Runtime Configuration
3. Check sync history for error messages
4. Restart app to reinitialize sync manager

### High Conflict Rate
- Users editing same records frequently
- Consider shorter sync intervals
- Communicate before editing shared data

### Sync Taking Too Long
- Large number of changes accumulated
- Network latency to NAS
- Check sync log `duration_ms` values
- Consider optimizing network or increasing interval

### Lost Changes
- Verify `updated_at` timestamps in database
- Check sync history for that time period
- Review conflict resolution logs
- Restore from NAS backup if necessary

## Technical Details

### Sync Manager Class
Located in `electron/sync-manager.js`

Key methods:
- `initialize()` - Sets up local DB and sync columns
- `sync()` - Performs bi-directional sync
- `pullFromMaster()` - Gets updates from NAS
- `pushToMaster()` - Sends local changes to NAS
- `startScheduledSync()` - Begins automatic syncing
- `stopScheduledSync()` - Halts automatic syncing
- `getStatus()` - Returns current sync state
- `getSyncHistory()` - Retrieves sync log entries

### Database Schema Changes
All synced tables now include:
```sql
ALTER TABLE [table_name] ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE [table_name] ADD COLUMN updated_by TEXT;
ALTER TABLE [table_name] ADD COLUMN synced_at DATETIME;
```

Sync log table:
```sql
CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  direction TEXT NOT NULL,
  status TEXT NOT NULL,
  records_pulled INTEGER DEFAULT 0,
  records_pushed INTEGER DEFAULT 0,
  conflicts INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER
)
```

## Performance Metrics

Expected performance for typical usage:

- **Sync frequency**: Every 2 hours
- **Sync duration**: 1-5 seconds (depending on changes)
- **Network impact**: Minimal (only deltas transferred)
- **Conflict rate**: <1% with 4-5 users
- **Concurrent users**: 4-5 (tested and recommended)

## Future Enhancements

Potential improvements:
- [ ] Real-time sync via WebSockets
- [ ] Selective sync (only certain tables)
- [ ] Merge conflict UI for manual resolution
- [ ] Sync progress notifications
- [ ] Bandwidth throttling
- [ ] Delta compression
- [ ] Multi-master replication
- [ ] Change feed/audit trail viewer

## Support

For issues or questions:
1. Check sync status and history
2. Review this documentation
3. Contact system administrator
4. Check application logs in `%APPDATA%\craft-tools-hub\logs\`
