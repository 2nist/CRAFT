# SQL Server Integration - Quick Reference

## 🎯 Current Status
- ✅ SQL Server connection infrastructure created
- ✅ Database schema (9 tables) designed and ready
- ✅ Example customer handlers implemented
- 🔄 Integration with electron/main.js pending
- 🔄 All IPC handlers to be migrated

## 📂 Key Files

| File | Purpose | Status |
|------|---------|--------|
| `src/database/config.js` | Connection config | ✅ Ready |
| `src/database/sqlConnection.js` | Connection manager | ✅ Ready |
| `src/database/schema.js` | Schema + initialization | ✅ Ready |
| `src/database/init-handler.js` | Startup initialization | ✅ Ready |
| `electron/main.js` | Needs 5 changes | 🔄 Pending |

## 🚀 Quick Start (3 Steps)

### 1. Verify Connection (2 min)
```bash
# Check SQL Server is running
ping 192.168.1.150
```

### 2. Update electron/main.js (10 min)
```javascript
// Add import at top (line 18)
import { initializeSqlServer, shutdownSqlServer } from '../src/database/init-handler.js'

// In app.whenReady() add (line 1770)
const sqlStatus = await initializeSqlServer();

// At end of file, add
app.on('before-quit', async () => {
  await shutdownSqlServer();
});
```

### 3. Start App (2 min)
```bash
npm run dev
# Check console for "✅ Connected to SQL Server" message
```

## 🔧 SQL Server Details

| Item | Value |
|------|-------|
| **Server** | 192.168.1.150\SQLEXPRESS |
| **Database** | CraftCPQ |
| **User** | craft_cpq_app |
| **Port** | 1433 |
| **Connection Pool** | Max 10 connections |
| **Encryption** | Enabled |

## 📊 Database Tables (9)

```
customers           ← Customer records
components          ← Parts inventory
sub_assemblies      ← Assembly templates
product_templates   ← Product configs
quotes              ← Quote records (MAIN)
manual_quotes       ← One-off quotes
projects            ← Project tracking
generated_numbers   ← ID sequences
sync_log            ← Audit trail
```

## 🔄 Handler Migration Pattern

Every IPC handler follows this pattern:

```javascript
ipcMain.handle('customers:get-all', async () => {
  try {
    const sqlConnection = (await import('../src/database/sqlConnection.js')).default;
    
    // Try SQL Server first
    if (sqlConnection.isConnected()) {
      const query = 'SELECT * FROM dbo.customers ORDER BY name';
      return await sqlConnection.query(query);
    }
  } catch (error) {
    console.warn('SQL Server failed, using fallback:', error.message);
  }
  
  // Fallback to existing logic (backward compatible)
  return MOCK_CUSTOMERS;
});
```

## 📋 Handler Migration Checklist

**Priority 1 - Customers** (Start here)
- [ ] `customers:get-all` (line 3967)
- [ ] `customers:add` (line 3970)
- [ ] `customers:update` (line 4050)
- [ ] `customers:delete` (line 4028)

**Priority 2 - Quotes** (Most complex)
- [ ] `quotes:save-quote`
- [ ] `quotes:get-quote`
- [ ] `quotes:get-all`

**Priority 3 - Other**
- [ ] `components:get-all`
- [ ] `sub-assemblies:get-all`
- [ ] `projects:get-all`

## 🧪 Testing Commands

```javascript
// In DevTools console, test connection:
const status = await window.electronAPI?.testConnection?.();
console.log(status);

// Expected output:
// { connected: true, status: {...}, server: "192.168.1.150\SQLEXPRESS", database: "CraftCPQ" }
```

## ⚡ Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Connection refused | SQL Server not running | Check SQL Server Configuration Manager |
| Login failed | Invalid credentials | Verify user in SQL Server |
| Database not found | CraftCPQ doesn't exist | Create DB manually or run init |
| Timeout | Slow network | Increase timeout in sqlConnection.js |
| Port blocked | Firewall rule | Add exception for port 1433 in Windows Firewall |

## 📈 Performance Targets

- Get all customers: < 100ms
- Add customer: < 200ms
- Get quote: < 500ms (with JSON fields)
- Sync 100 records: < 5 seconds
- Connection pool utilization: < 80%

## 🔐 Production Checklist

Before deploying to production:
- [ ] Move credentials to environment variables
- [ ] Set up SQL Server backup schedule
- [ ] Configure read replicas for reporting
- [ ] Set up monitoring/alerting
- [ ] Test failover procedure
- [ ] Document connection pool settings
- [ ] Create runbook for common issues

## 📚 Documentation

- **DATABASE_INTEGRATION_GUIDE.md** - Comprehensive guide
- **ELECTRON_MAIN_CHANGES.md** - Specific line-by-line changes
- **SQL_SERVER_SETUP_COMPLETE.md** - Full setup documentation
- **DATABASE_MANAGEMENT_GUIDE.md** - Existing guide (may need update)

## 🎓 Learning Resources

SQL Server + Electron patterns:
- Connection pooling: mssql package docs
- Query parameters: OWASP SQL Injection Prevention
- IPC handlers: Electron security best practices
- JSON fields: SQL Server JSON documentation

## 📞 Support Checklist

If integration fails:
1. [ ] Check console output for exact error message
2. [ ] Verify SQL Server is running (ping 192.168.1.150)
3. [ ] Test connection with SQL Server Management Studio
4. [ ] Check Windows Firewall port 1433 is open
5. [ ] Verify user craft_cpq_app exists and permissions
6. [ ] Check database CraftCPQ exists
7. [ ] Review electron/main.js changes are correct
8. [ ] Check import path to init-handler.js is correct

## 🎯 Next Immediate Action

1. Open electron/main.js in editor
2. Add the 3 import/initialization lines (see "Quick Start")
3. Save and run `npm run dev`
4. Look for "Connected to SQL Server" in console
5. If successful, proceed to Step 2: Migrate first handler

---

**Last Updated**: 2024
**Infrastructure Status**: ✅ Complete
**Integration Status**: 🔄 Awaiting electron/main.js changes
**Overall Progress**: ~30% Complete (infrastructure), ~0% (integration)
