# SQL Database Sync Setup Guide

This guide explains how to configure two-way synchronization between Craft Tools Hub and your SQL Server database.

## Overview

The sync system allows you to:
- Push local changes to your SQL Server
- Pull remote changes from your SQL Server
- Detect and resolve conflicts automatically
- Work offline and sync when connected

## Prerequisites

- SQL Server database (2016 or later)
- Network access to SQL Server
- API endpoint for database access (see Server Setup below)

## Quick Setup

### 1. Set Up SQL Server API

The sync requires a REST API endpoint for your SQL Server. We provide a template API server.

**Option A: Use the included template**

```bash
cd server-setup
npm install
```

Edit `server-setup/.env`:
```env
DB_USER=your_sql_username
DB_PASSWORD=your_sql_password
DB_SERVER=192.168.1.50
DB_NAME=CraftAutomation
API_KEY=your-secret-key
PORT=3000
```

Start the API server:
```bash
node server.js
```

**Option B: Use your own API**

Your API must implement these endpoints:
- `GET /health` - Health check
- `GET /customers` - Get all customers
- `POST /customers` - Upsert customer
- `GET /quotes` - Get all quotes
- `POST /quotes` - Upsert quote
- `GET /orders` - Get all orders
- `POST /orders` - Upsert order

See [server-setup/server.js](../server-setup/server.js) for reference implementation.

### 2. Configure Craft Tools Hub

In the Craft Tools Hub application:

1. Open **Settings** → **Database Sync**
2. Enter your API URL: `http://your-server:3000` or `https://your-domain.com/api`
3. Enter your API key
4. Click **Test Connection**
5. If successful, click **Save Settings**

### 3. Configure Sync Options

**Sync Mode:**
- **Manual** - Sync only when you click the sync button
- **Auto-Sync** - Automatically sync every N minutes
- **On Launch** - Sync when application starts

**Sync Direction:**
- **Push** - Send local changes to server
- **Pull** - Get changes from server
- **Both** - Two-way synchronization (recommended)

**Conflict Resolution:**
- **Remote Wins** - Always use server version (safest for multi-user)
- **Local Wins** - Always use local version
- **Manual** - Ask user to choose (most control)

### 4. Initial Sync

1. Click **Sync All** to perform your first synchronization
2. This will align your local database with the SQL Server
3. Review any conflicts that arise
4. Confirm the sync completed successfully

## Database Schema Requirements

### SQL Server Tables

Your SQL Server needs these tables:

**customers**
```sql
CREATE TABLE customers (
    id NVARCHAR(64) PRIMARY KEY,
    name NVARCHAR(255),
    company NVARCHAR(255),
    email NVARCHAR(255),
    phone NVARCHAR(50),
    address NVARCHAR(500),
    city NVARCHAR(100),
    state NVARCHAR(50),
    zip NVARCHAR(20),
    country NVARCHAR(100),
    notes NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL
);
```

**quotes**
```sql
CREATE TABLE quotes (
    id NVARCHAR(64) PRIMARY KEY,
    quote_number NVARCHAR(100) UNIQUE,
    customer_id NVARCHAR(64),
    project_name NVARCHAR(255),
    status NVARCHAR(50),
    total_amount DECIMAL(18, 2),
    discount_percent DECIMAL(5, 2),
    tax_percent DECIMAL(5, 2),
    notes NVARCHAR(MAX),
    valid_until DATE,
    created_by NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

**orders**
```sql
CREATE TABLE orders (
    id NVARCHAR(64) PRIMARY KEY,
    order_number NVARCHAR(100) UNIQUE,
    quote_id NVARCHAR(64),
    customer_id NVARCHAR(64),
    status NVARCHAR(50),
    order_date DATE,
    delivery_date DATE,
    total_amount DECIMAL(18, 2),
    payment_status NVARCHAR(50),
    notes NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL,
    FOREIGN KEY (quote_id) REFERENCES quotes(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

## Sync Process

### How It Works

1. **Local Changes Tracked** - The app tracks which records have changed locally
2. **Remote Changes Detected** - Queries SQL Server for records updated since last sync
3. **Conflict Detection** - If both local and remote changed, a conflict is flagged
4. **Resolution** - Conflicts resolved based on your settings
5. **Update** - Changes applied to both local and remote databases
6. **Metadata Updated** - Sync timestamps updated for next sync

### Sync Metadata

The app maintains a `sync_metadata` table locally:
- Tracks last sync time per record
- Stores local and remote versions
- Records sync status (pending, synced, conflict)

### Conflict Resolution

When a conflict occurs:
- **Remote Wins**: Remote data overwrites local
- **Local Wins**: Local data overwrites remote
- **Manual**: UI shows both versions, user chooses

## Monitoring Sync

### Sync Status Indicator

The status indicator shows:
- 🟢 **Connected** - API is reachable
- 🟡 **Syncing** - Sync in progress
- 🔴 **Error** - Sync failed or disconnected
- ⚪ **Offline** - No sync configured

### Sync History

View sync history in **Settings** → **Database Sync** → **History**:
- Timestamp of each sync
- Number of records pushed/pulled
- Any errors or conflicts
- Resolution chosen for conflicts

### Logs

Detailed logs available at:
- Application: **Help** → **View Logs**
- Server API: Check console output or log file

## Troubleshooting

### Connection Failed

**Symptom**: Cannot connect to SQL Server API

**Solutions**:
- Verify API URL is correct
- Check API server is running: `curl http://your-server:3000/health`
- Verify firewall allows connection
- Check network connectivity
- Confirm API key is correct

### Sync Fails

**Symptom**: Sync starts but fails partway through

**Solutions**:
- Check SQL Server permissions
- Verify database schema matches requirements
- Review API server logs for errors
- Check for network interruptions
- Ensure database is not locked

### Conflicts Keep Appearing

**Symptom**: Same records conflict repeatedly

**Solutions**:
- Verify timestamps are syncing correctly
- Check if multiple users editing same records
- Consider using "Remote Wins" strategy for multi-user scenarios
- Ensure all users sync regularly

### Data Missing After Sync

**Symptom**: Records present locally but not appearing remotely (or vice versa)

**Solutions**:
- Check `deleted_at` field isn't accidentally set
- Verify foreign key relationships are valid
- Check API endpoints return all records
- Review sync direction setting
- Manually verify SQL Server has the data

## Security Considerations

### API Authentication

- Use strong API keys (minimum 32 characters)
- Rotate API keys regularly
- Use HTTPS for production deployments
- Never commit API keys to version control

### Database Security

- Use SQL Server authentication with strong passwords
- Restrict database user permissions (grant only SELECT, INSERT, UPDATE)
- Enable SQL Server encryption
- Use VPN for external connections

### Network Security

- Deploy API on internal network when possible
- Use firewall to restrict access to API
- Enable rate limiting on API endpoints
- Monitor for unusual sync patterns

## Performance Optimization

### Large Datasets

If syncing thousands of records:
- Enable "Sync only recent changes" (last 30/60/90 days)
- Sync specific entities individually
- Schedule syncs during off-hours
- Increase sync interval for auto-sync

### Slow Sync

If sync is taking too long:
- Check network bandwidth
- Review database indexes on `updated_at` columns
- Optimize API queries (use pagination)
- Consider caching on API server

## Advanced Configuration

### Custom Fields

To sync custom fields:
1. Add columns to SQL Server tables
2. Update API endpoints to include new fields
3. Fields will automatically sync

### Multiple Environments

To sync with multiple databases:
- Create separate API endpoints for each environment
- Switch API URL in settings when needed
- Use different API keys per environment

### Scheduled Sync

For automatic syncing outside the app:
- Use Windows Task Scheduler to launch app with sync parameter
- Configure app to sync on launch and exit
- Monitor sync logs for failures

## Support

For additional help:
- Review [SYNC_IMPLEMENTATION_GUIDE.md](../docs/database/SYNC_IMPLEMENTATION_GUIDE.md) for detailed technical information
- Check [MULTI_USER_SYNC.md](../docs/database/MULTI_USER_SYNC.md) for multi-user scenarios
- Open an issue on GitHub for bugs or feature requests

## Summary Checklist

- [ ] SQL Server database created with required tables
- [ ] API server deployed and running
- [ ] API URL and key configured in Craft Tools Hub
- [ ] Connection test successful
- [ ] Sync mode and direction configured
- [ ] Conflict resolution strategy chosen
- [ ] Initial sync completed successfully
- [ ] Regular sync schedule established
- [ ] Team members trained on sync workflow
- [ ] Monitoring and logging in place

---

**Need Help?** See the full documentation in [docs/database/](../docs/database/) or contact support.
