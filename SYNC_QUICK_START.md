# Multi-User Sync - Quick Start Guide

## For End Users

### What's New?
The Craft Tools Hub now supports **multiple users working simultaneously** without conflicts! Your work is saved to your local computer and automatically synchronized with the team's master database on the network.

### How It Works (Simple Version)

1. **You work normally** - All your changes save instantly to your computer
2. **Automatic sync** - Every 2 hours, your changes sync with the team database
3. **You get updates** - You automatically receive changes made by other team members
4. **No waiting** - No more "database is locked" errors!

### First Time Setup

1. **Install the app** - Run the installer `.exe` file
2. **Configure network path** (if you use shared storage):
   - Open Settings
   - Set Runtime Root Path to your shared network folder (e.g., `Z:\CTH`)
3. **That's it!** - Sync happens automatically

### Sync Status Indicator

Look for the sync status in the app (usually top-right corner):

- 🟢 **Green checkmark** - Last sync successful
- 🔵 **Blue spinner** - Syncing now
- 🔴 **Red alert** - Sync error (still working, just not syncing)

### Manual Sync

**When to use:**
- Before starting important work
- After making critical changes
- When you want to see others' updates immediately

**How to use:**
1. Click the **"Sync Now"** button
2. Wait 2-5 seconds
3. Done! Your changes are shared and you have the latest updates

### Working Offline

**No problem!**
- Continue working as normal
- Your changes save to your computer
- When you reconnect to the network, click "Sync Now"
- Your offline changes will merge with the team's updates

### Tips for Best Results

✅ **DO:**
- Let automatic sync do its job (every 2 hours)
- Click "Sync Now" before editing important records
- Check sync status occasionally
- Save your work frequently (like always!)

❌ **DON'T:**
- Don't worry about database locks (they're gone!)
- Don't edit the same quote/project as a teammate at the same time
- Don't panic if you're offline (you can still work)

### Conflict Scenarios

**What if two people edit the same thing?**
- The **last person to sync wins**
- Example: You edit Quote #123 at 10:00 AM, sync at 10:30 AM
- Teammate edits Quote #123 at 10:15 AM, syncs at 10:45 AM
- Result: Your teammate's changes are kept (they synced last)

**How to avoid conflicts:**
- Communicate with teammates ("I'm working on Quote #123")
- Click "Sync Now" before editing shared data
- Click "Sync Now" after finishing edits

### Troubleshooting

#### Sync Status Shows Error
1. Check your network connection
2. Verify you can access the shared folder (e.g., `Z:\CTH`)
3. Click "Sync Now" to retry
4. If still failing, you can continue working offline

#### Changes Not Showing for Teammates
1. Click "Sync Now" on your computer (pushes your changes)
2. Have teammate click "Sync Now" (pulls your changes)
3. If problem persists, wait for automatic sync (max 2 hours)

#### "Last sync: Never"
- Normal for first install
- Click "Sync Now" to perform initial sync
- If you don't have network storage configured, this is expected

### FAQ

**Q: How often should I click "Sync Now"?**  
A: Only when you need immediate sync. Automatic sync (every 2 hours) is usually enough.

**Q: What if I forget to sync before leaving for the day?**  
A: No problem! Next time you open the app, automatic sync will run.

**Q: Can I change the sync schedule?**  
A: Yes, an admin can adjust it in the app settings.

**Q: What data gets synced?**  
A: Everything - quotes, projects, components, customers, sub-assemblies.

**Q: Is my data backed up?**  
A: Your local copy + network master = two copies. Admins should also backup the network master.

**Q: Can I work from home?**  
A: Yes, if you have VPN access to the network folder. Otherwise, work offline and sync when back in the office.

### Support

**Issues or questions?**
1. Check the sync status indicator
2. Try "Sync Now" to resolve issues
3. Contact your IT administrator
4. Check the full documentation: `MULTI_USER_SYNC.md`

---

## For Administrators

### Installation

1. **Build the installer:**
   ```powershell
   npm run build
   ```

2. **Distribute to users:**
   - Share the `.exe` file from `dist/`
   - Provide network path configuration

3. **Initial setup per user:**
   - Configure Runtime Root Path (e.g., `Z:\CTH`)
   - Verify sync status shows green checkmark

### Configuration

**Default Settings:**
- Sync interval: 120 minutes (2 hours)
- Conflict resolution: Last-write-wins
- Local database location: `%APPDATA%\craft-tools-hub\database\`
- Network database location: `[Runtime Root]\database\`

**Adjusting Sync Interval:**
```javascript
// In renderer process or via IPC
await window.electron.ipcRenderer.invoke('sync:setSchedule', 60) // 60 minutes
```

### Monitoring

**Check Sync Logs:**
- Each user's local database has a `sync_log` table
- Network master database also gets sync metadata

**Example Query:**
```sql
SELECT * FROM sync_log ORDER BY timestamp DESC LIMIT 20;
```

**Typical Log Entry:**
```
id: 1
timestamp: 2025-01-15 10:30:45
direction: bidirectional
status: success
records_pulled: 17
records_pushed: 5
conflicts: 0
duration_ms: 2340
```

### Backup Strategy

**Critical: Backup the NAS Master Database!**

1. **Daily backup:**
   ```powershell
   Copy-Item "Z:\CTH\database\server.db" "Z:\CTH\backups\server_$(Get-Date -Format 'yyyy-MM-dd').db"
   ```

2. **Weekly backup to off-site:**
   - Copy master database to separate storage
   - Keep at least 4 weeks of backups

3. **Restore from backup if needed:**
   - Stop all users' apps
   - Replace master database with backup
   - Restart apps
   - Users will sync with restored data

### Performance Tuning

**If sync is slow (>10 seconds):**
1. Check network speed to NAS
2. Reduce sync interval (less data per sync)
3. Consider network infrastructure upgrade

**If conflicts are frequent:**
1. Shorten sync interval (60-90 minutes)
2. Train users on conflict avoidance
3. Implement workflow (who edits what when)

### Troubleshooting

**User can't sync:**
1. Verify network path accessible
2. Check file permissions on NAS
3. Review user's sync log for errors
4. Test manual sync

**Conflicts causing data loss:**
1. Review sync logs to identify pattern
2. Educate users on last-write-wins behavior
3. Consider shorter sync intervals
4. Restore lost data from backup if critical

**Database corruption:**
1. Stop all users
2. Restore master from backup
3. Users delete local DB (will re-sync from master)
4. Restart apps

### Health Checks

**Daily:**
- [ ] Verify NAS is accessible
- [ ] Check master DB file size (should grow steadily)
- [ ] Review recent sync logs for errors

**Weekly:**
- [ ] Verify backups are running
- [ ] Test backup restoration
- [ ] Review sync performance metrics

**Monthly:**
- [ ] Analyze conflict frequency
- [ ] Optimize sync interval if needed
- [ ] Clean up old sync logs (keep last 1000)

### Advanced Configuration

**Custom sync tables:**
Edit `electron/sync-manager.js`:
```javascript
const tables = ['components', 'sub_assemblies', 'quotes', 'projects', 'customers', 'manual_quotes', 'your_new_table']
```

**Change conflict resolution:**
Currently: Last-write-wins (newest `updated_at` timestamp)
Future: Implement custom resolution logic in `SyncManager.sync()`

---

**Need Help?**
- User Guide: `MULTI_USER_SYNC.md`
- Implementation Details: `SYNC_IMPLEMENTATION_COMPLETE.md`
- Troubleshooting: Check sync logs and error messages
