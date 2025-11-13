# Database Management Guide
## Craft Automation CPQ - Multi-User Sync System

## Table of Contents
1. [Database Architecture](#database-architecture)
2. [Daily Operations](#daily-operations)
3. [Backup Strategy](#backup-strategy)
4. [Maintenance Tasks](#maintenance-tasks)
5. [Monitoring & Health Checks](#monitoring--health-checks)
6. [Troubleshooting](#troubleshooting)
7. [Recovery Procedures](#recovery-procedures)
8. [Performance Optimization](#performance-optimization)

---

## Database Architecture

### Database Locations

#### Local Databases (Per User)
- **Path:** `%APPDATA%\craft-tools-hub\database\`
- **Files:**
  - `server.db` - Main application data (components, quotes, projects, customers)
  - `generated_numbers.db` - Quote and project numbering sequences
- **Purpose:** Fast local operations, offline work capability
- **Owner:** Individual user workstation

#### NAS Master Database (Shared)
- **Path:** `\\192.168.1.99\CraftAuto-Sales\CACPQDB\database\`
- **Files:**
  - `server.db` - Master copy of all application data
  - `generated_numbers.db` - Master numbering sequences
- **Purpose:** Source of truth, data sharing between users
- **Owner:** IT/Admin team

### Database Tables

**Main Tables:**
- `components` - Component price list and specifications
- `sub_assemblies` - Saved sub-assembly templates
- `quotes` - Project quotes and configurations
- `projects` - Project metadata
- `customers` - Customer database (OEMs and End Users)
- `manual_quotes` - Manually created quote entries
- `generated_numbers` - Auto-generated quote/project IDs
- `product_templates` - Product configuration templates

**Sync Metadata Columns (added to all synced tables):**
- `updated_at DATETIME` - Last modification timestamp
- `updated_by TEXT` - Username who made the change
- `synced_at DATETIME` - Last successful sync timestamp

**Sync Tracking Table:**
- `sync_log` - History of all sync operations

---

## Daily Operations

### Normal User Workflow

1. **App Startup**
   - Local database opens instantly
   - SyncManager connects to NAS master
   - Initial sync occurs (if scheduled or overdue)

2. **Working During the Day**
   - All operations use local database (instant)
   - Changes accumulate locally
   - Automatic sync every 2 hours (configurable)

3. **Manual Sync Triggers**
   - Click "Sync Now" before important edits
   - Before end of day
   - After making critical changes
   - Before generating reports

4. **App Shutdown**
   - Databases close gracefully
   - Final sync can be triggered manually

### Administrator Daily Checklist

- [ ] **Morning:** Verify NAS database accessible
- [ ] **Morning:** Check overnight sync logs for errors
- [ ] **Midday:** Monitor database file sizes (should grow steadily)
- [ ] **Evening:** Verify daily backup completed
- [ ] **Weekly:** Review sync conflict frequency

---

## Backup Strategy

### Automated Daily Backups

**NAS Master Database Backup (Critical)**

Create a scheduled task to run daily:

```powershell
# backup-nas-database.ps1
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$sourceDir = "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database"
$backupDir = "\\192.168.1.99\CraftAuto-Sales\CACPQDB\backups\daily"

# Create backup directory if it doesn't exist
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Backup databases
Copy-Item "$sourceDir\server.db" "$backupDir\server_$timestamp.db"
Copy-Item "$sourceDir\generated_numbers.db" "$backupDir\generated_numbers_$timestamp.db"

# Keep only last 30 days
Get-ChildItem $backupDir -Filter "*.db" | 
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | 
    Remove-Item -Force

Write-Host "✅ Backup completed: $timestamp"
```

**Schedule the backup:**
```powershell
# Run as Administrator
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File C:\Scripts\backup-nas-database.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "CACPQ_Daily_Backup" -Action $action -Trigger $trigger -Principal $principal
```

### Weekly Full Backups

**Copy to offsite/different storage:**

```powershell
# weekly-backup.ps1
$timestamp = Get-Date -Format "yyyy-MM-dd"
$sourceDir = "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database"
$weeklyBackupDir = "D:\Backups\CACPQ\weekly"  # Local server backup

New-Item -ItemType Directory -Path "$weeklyBackupDir\$timestamp" -Force | Out-Null
Copy-Item "$sourceDir\*.db" "$weeklyBackupDir\$timestamp\"

# Keep 12 weeks of backups
Get-ChildItem $weeklyBackupDir -Directory | 
    Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-84) } | 
    Remove-Item -Recurse -Force
```

**Schedule for Sundays at 1:00 AM**

### Monthly Archives

**For long-term retention:**

```powershell
# monthly-archive.ps1
$monthYear = Get-Date -Format "yyyy-MM"
$sourceDir = "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database"
$archiveDir = "\\192.168.1.99\CraftAuto-Sales\CACPQDB\archives"

# Compress and archive
$zipPath = "$archiveDir\CACPQ_$monthYear.zip"
Compress-Archive -Path "$sourceDir\*.db" -DestinationPath $zipPath

Write-Host "✅ Monthly archive created: $zipPath"
```

### Local Database Backups (Optional)

Users don't typically need to backup local DBs since NAS is the master, but for safety:

```powershell
# user-backup.ps1
$timestamp = Get-Date -Format "yyyy-MM-dd"
$sourceDir = "$env:APPDATA\craft-tools-hub\database"
$backupDir = "$env:USERPROFILE\Documents\CACPQ_Backups"

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item "$sourceDir\*.db" "$backupDir\backup_$timestamp\"
```

---

## Maintenance Tasks

### Weekly Maintenance

#### 1. Database Integrity Check

```powershell
# check-database-integrity.ps1
$nasDb = "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database\server.db"

# Using sqlite3 command-line tool
sqlite3 $nasDb "PRAGMA integrity_check;"
sqlite3 $nasDb "PRAGMA foreign_key_check;"

# Expected output: "ok"
```

#### 2. Vacuum Databases (Reclaim Space)

**Monthly task** - Do this during off-hours (requires exclusive lock):

```powershell
# vacuum-database.ps1
# ⚠️ IMPORTANT: All users must close the app before running this!

$nasDb = "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database\server.db"

Write-Host "Vacuuming server.db..."
sqlite3 $nasDb "VACUUM;"

Write-Host "Analyzing database..."
sqlite3 $nasDb "ANALYZE;"

Write-Host "✅ Database optimized"
```

**Schedule for first Sunday of month at 2:00 AM**

#### 3. Clean Sync Logs

Keep sync_log table manageable:

```sql
-- Delete sync logs older than 90 days
DELETE FROM sync_log 
WHERE timestamp < datetime('now', '-90 days');

-- Keep only last 10,000 entries if table is large
DELETE FROM sync_log 
WHERE id NOT IN (
    SELECT id FROM sync_log 
    ORDER BY timestamp DESC 
    LIMIT 10000
);
```

#### 4. Review Database Size

```powershell
# Monitor growth trends
Get-ChildItem "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database\*.db" | 
    Select-Object Name, @{Name="Size_MB";Expression={[math]::Round($_.Length/1MB,2)}}, LastWriteTime
```

**Expected growth:**
- Small team (5 users): ~50-100 MB per year
- If growing >500 MB/year: Investigate (possible data duplication issues)

---

## Monitoring & Health Checks

### Daily Health Check Script

```powershell
# daily-health-check.ps1
$nasDbPath = "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database"
$results = @()

# 1. Check NAS accessibility
try {
    Test-Path $nasDbPath | Out-Null
    $results += "✅ NAS accessible"
} catch {
    $results += "❌ NAS not accessible: $($_.Exception.Message)"
}

# 2. Check database files exist
$dbFiles = @("server.db", "generated_numbers.db")
foreach ($file in $dbFiles) {
    if (Test-Path "$nasDbPath\$file") {
        $size = (Get-Item "$nasDbPath\$file").Length / 1MB
        $results += "✅ $file exists ($([math]::Round($size,2)) MB)"
    } else {
        $results += "❌ $file missing!"
    }
}

# 3. Check recent backup
$backupDir = "\\192.168.1.99\CraftAuto-Sales\CACPQDB\backups\daily"
$recentBackup = Get-ChildItem $backupDir -Filter "server_*.db" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1

if ($recentBackup -and $recentBackup.LastWriteTime -gt (Get-Date).AddDays(-1)) {
    $results += "✅ Recent backup found: $($recentBackup.Name)"
} else {
    $results += "⚠️ No backup in last 24 hours!"
}

# 4. Check database integrity
try {
    $integrity = sqlite3 "$nasDbPath\server.db" "PRAGMA quick_check;"
    if ($integrity -eq "ok") {
        $results += "✅ Database integrity OK"
    } else {
        $results += "⚠️ Database integrity issue: $integrity"
    }
} catch {
    $results += "⚠️ Could not check integrity (DB may be in use)"
}

# Output results
$results | ForEach-Object { Write-Host $_ }

# Email results to admin (optional)
# Send-MailMessage -To "admin@company.com" -Subject "CACPQ DB Health Check" -Body ($results -join "`n")
```

### Key Metrics to Monitor

1. **Database File Size**
   - Track growth rate
   - Alert if sudden large increase (>50% in a day)

2. **Sync Frequency**
   - Check sync_log table
   - Alert if no syncs in 4+ hours during business hours

3. **Conflict Rate**
   - Query sync_log for conflicts
   - Alert if >5% of syncs have conflicts

4. **Failed Syncs**
   - Count error status in sync_log
   - Alert if >10% failure rate

5. **User Activity**
   - Check distinct updated_by values
   - Ensure all users are syncing

### Monitoring Queries

```sql
-- Sync activity last 24 hours
SELECT 
    datetime(timestamp) as sync_time,
    status,
    records_pulled,
    records_pushed,
    conflicts,
    duration_ms
FROM sync_log
WHERE timestamp > datetime('now', '-1 day')
ORDER BY timestamp DESC;

-- Conflict summary last 7 days
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as total_syncs,
    SUM(conflicts) as total_conflicts,
    ROUND(AVG(conflicts), 2) as avg_conflicts,
    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_syncs
FROM sync_log
WHERE timestamp > datetime('now', '-7 days')
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Most active users (last 30 days)
SELECT 
    updated_by,
    COUNT(DISTINCT DATE(updated_at)) as active_days,
    COUNT(*) as total_changes
FROM (
    SELECT updated_by, updated_at FROM components WHERE updated_at > datetime('now', '-30 days')
    UNION ALL
    SELECT updated_by, updated_at FROM quotes WHERE updated_at > datetime('now', '-30 days')
    UNION ALL
    SELECT updated_by, updated_at FROM projects WHERE updated_at > datetime('now', '-30 days')
)
GROUP BY updated_by
ORDER BY total_changes DESC;
```

---

## Troubleshooting

### Common Issues

#### Issue: "Database is locked"

**Symptoms:** Users can't save changes, error messages about database locks

**Causes:**
- Another process has exclusive lock on NAS database
- Crashed sync operation didn't release lock
- Network latency causing timeout

**Solutions:**

1. **Check for stuck processes:**
```powershell
# On the NAS server, check for locks
Get-SmbOpenFile -Path "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database\*" | 
    Select-Object ClientComputerName, ClientUserName, Path
```

2. **Kill stuck locks:**
```powershell
Get-SmbOpenFile -Path "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database\*" | Close-SmbOpenFile -Force
```

3. **If persistent, restart SMB service:**
```powershell
Restart-Service -Name LanmanServer -Force
```

4. **Verify WAL mode is disabled:**
```sql
-- WAL mode can cause network lock issues
PRAGMA journal_mode;
-- Should return: delete or persist, NOT wal
```

#### Issue: Sync fails repeatedly

**Symptoms:** Sync status shows errors, data not synchronizing

**Diagnosis:**

```powershell
# Check network path
Test-Path "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database"

# Check permissions
$acl = Get-Acl "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database"
$acl.Access | Format-Table IdentityReference, FileSystemRights, AccessControlType
```

**Solutions:**

1. **Fix permissions:** Ensure all users have Read/Write access
2. **Check disk space:** Ensure NAS has free space
3. **Review sync_log:** `SELECT * FROM sync_log WHERE status='error' ORDER BY timestamp DESC LIMIT 20;`
4. **Manual sync trigger:** Click "Sync Now" to see immediate error details

#### Issue: Data conflicts/overwrites

**Symptoms:** User's changes disappear after sync

**Diagnosis:**
```sql
-- Check conflict history
SELECT 
    datetime(timestamp) as when_synced,
    conflicts,
    records_pulled,
    records_pushed
FROM sync_log
WHERE conflicts > 0
ORDER BY timestamp DESC
LIMIT 50;
```

**Prevention:**
1. **Shorter sync intervals:** Reduce from 2 hours to 60 minutes
2. **User communication:** Coordinate who edits what
3. **Manual sync before edits:** Click "Sync Now" before editing shared records

**Resolution:**
- Last-write-wins is automatic
- Restore from backup if critical data lost
- Consider implementing conflict resolution UI (future enhancement)

#### Issue: Database corruption

**Symptoms:** Integrity check fails, app crashes, data missing

**Diagnosis:**
```powershell
sqlite3 "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database\server.db" "PRAGMA integrity_check;"
```

**Recovery:**
1. Stop all users from accessing app
2. Restore from most recent backup
3. Have users sync after restoration to pull fresh data
4. Investigate cause (disk failure, power loss, improper shutdown)

---

## Recovery Procedures

### Scenario 1: Restore NAS Master from Backup

**When:** NAS database corrupted, deleted, or bad data needs rollback

**Steps:**

1. **Stop all users:**
```
Send notification: "Database maintenance in progress. Please close CACPQ app."
```

2. **Backup current state (even if corrupted):**
```powershell
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
Copy-Item "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database\*.db" `
          "\\192.168.1.99\CraftAuto-Sales\CACPQDB\corrupted_$timestamp\"
```

3. **Restore from backup:**
```powershell
# List available backups
Get-ChildItem "\\192.168.1.99\CraftAuto-Sales\CACPQDB\backups\daily" -Filter "server_*.db" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 10 Name, LastWriteTime

# Choose backup (e.g., yesterday's)
$backupFile = "server_2025-11-12_020000.db"
Copy-Item "\\192.168.1.99\CraftAuto-Sales\CACPQDB\backups\daily\$backupFile" `
          "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database\server.db" -Force

# Restore generated_numbers.db too
$backupNumbersFile = "generated_numbers_2025-11-12_020000.db"
Copy-Item "\\192.168.1.99\CraftAuto-Sales\CACPQDB\backups\daily\$backupNumbersFile" `
          "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database\generated_numbers.db" -Force
```

4. **Verify integrity:**
```powershell
sqlite3 "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database\server.db" "PRAGMA integrity_check;"
```

5. **Notify users:**
```
"Database restored from [backup date]. Please sync when you open the app."
```

6. **Users restart app:**
- Local databases will pull fresh data from restored NAS master
- Any work done since backup time is lost (communicate this!)

### Scenario 2: User Lost Local Data

**When:** User's local database corrupted or accidentally deleted

**Steps:**

1. **User closes app**

2. **Delete corrupted local database:**
```powershell
Remove-Item "$env:APPDATA\craft-tools-hub\database\*" -Force
```

3. **User restarts app:**
- Fresh local database created
- Sync pulls all data from NAS master
- User is back in business

**Data Loss:** None (NAS master is source of truth)

### Scenario 3: Lost Recent Changes (Before Sync)

**When:** User made changes that weren't synced before local DB corruption

**Recovery:** 
- **Not possible** - data only exists locally until first sync
- **Prevention:** Educate users to click "Sync Now" after important changes

### Scenario 4: Need to Merge Offline Work

**When:** User worked offline for extended period, NAS has newer data

**Process:**
1. User comes online
2. Click "Sync Now"
3. Sync compares timestamps
4. Last-write-wins on per-record basis
5. User's newer changes preserved, older changes overwritten

**Risk:** Some offline changes may be lost if NAS data is newer

**Mitigation:** 
- Keep offline periods short
- Sync immediately when back online
- Review changes after sync

---

## Performance Optimization

### Database Optimization

#### Indexes

**Check existing indexes:**
```sql
SELECT name, sql FROM sqlite_master WHERE type = 'index';
```

**Recommended indexes for performance:**
```sql
-- Components table
CREATE INDEX IF NOT EXISTS idx_components_sku ON components(sku);
CREATE INDEX IF NOT EXISTS idx_components_category ON components(category);
CREATE INDEX IF NOT EXISTS idx_components_vendor ON components(vendor);
CREATE INDEX IF NOT EXISTS idx_components_updated_at ON components(updated_at);

-- Quotes table
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(createdAt);
CREATE INDEX IF NOT EXISTS idx_quotes_updated_at ON quotes(updated_at);

-- Projects table
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);

-- Customers table
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Sync log table
CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON sync_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status);
```

#### Query Optimization

**Slow query identification:**
```sql
EXPLAIN QUERY PLAN 
SELECT * FROM components WHERE category = 'Pumps' AND updated_at > datetime('now', '-7 days');
```

**Optimize with ANALYZE:**
```sql
ANALYZE;  -- Updates SQLite query planner statistics
```

### Network Optimization

#### Reduce Sync Frequency for Remote Users

For users on VPN or slow connections:
```javascript
// Adjust in app settings or via IPC
await window.electron.ipcRenderer.invoke('sync:setSchedule', 240) // 4 hours
```

#### Batch Operations

Instead of syncing after every change, batch:
```javascript
// Save multiple items, then sync once
await saveQuote(quote1)
await saveQuote(quote2)
await saveQuote(quote3)
await window.electron.ipcRenderer.invoke('sync:manual')
```

### Database Size Management

#### Archive Old Data

**Quarterly cleanup:**
```sql
-- Archive quotes older than 2 years
CREATE TABLE archived_quotes AS 
SELECT * FROM quotes WHERE createdAt < datetime('now', '-2 years');

DELETE FROM quotes WHERE createdAt < datetime('now', '-2 years');

VACUUM;  -- Reclaim space
```

**Export archived data:**
```powershell
sqlite3 "\\192.168.1.99\CraftAuto-Sales\CACPQDB\database\server.db" ".dump archived_quotes" > archived_quotes_2023.sql
```

#### Prune Sync Logs

**Keep last 90 days only:**
```sql
DELETE FROM sync_log WHERE timestamp < datetime('now', '-90 days');
VACUUM;
```

---

## Best Practices Summary

### For Administrators

1. ✅ **Daily backup** of NAS master database (automated)
2. ✅ **Weekly integrity checks** (PRAGMA integrity_check)
3. ✅ **Monthly VACUUM** (during off-hours)
4. ✅ **Quarterly archive** old data (2+ years)
5. ✅ **Monitor sync logs** for conflicts and errors
6. ✅ **Test restore process** quarterly
7. ✅ **Keep 30 days** of daily backups
8. ✅ **Keep 12 weeks** of weekly backups
9. ✅ **Document recovery procedures** and test them
10. ✅ **Track database growth** trends

### For Users

1. ✅ Click **"Sync Now"** before important edits
2. ✅ Click **"Sync Now"** after critical changes
3. ✅ **Communicate** with teammates about shared records
4. ✅ **Keep offline periods** short when possible
5. ✅ **Review sync status** occasionally
6. ✅ **Report persistent sync errors** immediately
7. ✅ Don't manually edit database files
8. ✅ Don't delete local database unless instructed
9. ✅ Trust the system - automatic sync works
10. ✅ When in doubt, click "Sync Now"

### For Developers

1. ✅ Always use `updated_at` timestamps
2. ✅ Always set `updated_by` to current user
3. ✅ Test sync behavior with multiple users
4. ✅ Handle sync conflicts gracefully
5. ✅ Log sync operations comprehensively
6. ✅ Provide clear error messages
7. ✅ Test offline/online transitions
8. ✅ Optimize database queries with indexes
9. ✅ Monitor sync performance metrics
10. ✅ Document schema changes

---

## Emergency Contacts

**Database Issues:**
- Primary Admin: [Name] - [Email] - [Phone]
- Secondary Admin: [Name] - [Email] - [Phone]

**Network/NAS Issues:**
- IT Support: [Email] - [Phone]

**Escalation:**
- Developer Team: [Email]

---

## Appendix: Useful Commands

### Database Information

```sql
-- Table sizes
SELECT 
    name,
    (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as record_count
FROM sqlite_master m
WHERE type='table'
ORDER BY name;

-- Database file info
PRAGMA page_count;
PRAGMA page_size;
-- Total size = page_count * page_size

-- Schema version
PRAGMA schema_version;
PRAGMA user_version;
```

### Sync Statistics

```sql
-- Total sync operations
SELECT COUNT(*) FROM sync_log;

-- Average sync duration
SELECT AVG(duration_ms) / 1000.0 as avg_seconds FROM sync_log;

-- Success rate
SELECT 
    ROUND(100.0 * SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate_pct
FROM sync_log;

-- Data transfer summary
SELECT 
    SUM(records_pulled) as total_pulled,
    SUM(records_pushed) as total_pushed,
    SUM(conflicts) as total_conflicts
FROM sync_log;
```

### Maintenance Commands

```sql
-- Full integrity check
PRAGMA integrity_check;

-- Quick check (faster)
PRAGMA quick_check;

-- Optimize database
VACUUM;
ANALYZE;

-- Rebuild indexes
REINDEX;
```

---

**Document Version:** 1.0  
**Last Updated:** November 13, 2025  
**Next Review:** February 2026
