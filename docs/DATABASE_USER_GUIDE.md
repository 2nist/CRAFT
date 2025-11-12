# Database User Guide for Craft Tools Hub

## Overview

This guide provides an introduction to SQL databases, specifically SQLite, and how it applies to the Craft Tools Hub application. Since you're new to SQL databases, we'll start with the basics and build up to practical usage for your project.

## What is SQLite?

SQLite is a lightweight, file-based SQL database that doesn't require a separate server process. It's perfect for applications like Craft Tools Hub because:

- **No server setup required** - The database is just a file on your system
- **Zero configuration** - Works out of the box
- **Cross-platform** - Runs on Windows, Mac, and Linux
- **ACID compliant** - Ensures data integrity
- **Small footprint** - Only ~500KB in size

Your database file is located at: `server/craft_tools.db`

## Database Schema Overview

Your Craft Tools Hub database contains the following tables:

### Components Table
Stores all component information from your catalog.

**Key Fields:**
- `id` - Unique identifier
- `sku` - Stock Keeping Unit (primary identifier)
- `description` - Component description
- `price` - Component price
- `category` - Component category
- `vendor` - Manufacturer/supplier
- `uom` - Unit of Measure
- `vndrnum` - Vendor part number

### Projects Table
Stores project information.

**Key Fields:**
- `id` - Unique identifier
- `project_number` - Project number
- `customer` - Customer name
- `industry` - Industry code
- `created_at` - Creation timestamp

### Quotes Table
Stores quote configurations.

**Key Fields:**
- `id` - Unique identifier
- `quote_number` - Quote number
- `project_id` - Reference to project
- `customer` - Customer name
- `total_cost` - Total quote cost
- `created_at` - Creation timestamp

### Sub-Assemblies Table
Stores sub-assembly definitions.

**Key Fields:**
- `id` - Unique identifier
- `sub_assembly_id` - Sub-assembly identifier
- `description` - Sub-assembly description
- `category` - Sub-assembly category
- `components` - JSON array of component references

## Basic SQL Operations

### SELECT - Reading Data

To view all components:
```sql
SELECT * FROM components;
```

To find a specific component by SKU:
```sql
SELECT * FROM components WHERE sku = 'ABC123';
```

To get components in a specific category:
```sql
SELECT sku, description, price FROM components WHERE category = 'Valves';
```

### INSERT - Adding Data

To add a new component:
```sql
INSERT INTO components (sku, description, price, category, vendor)
VALUES ('NEW123', 'New Component Description', 99.99, 'Pumps', 'ABC Corp');
```

### UPDATE - Modifying Data

To update a component's price:
```sql
UPDATE components SET price = 109.99 WHERE sku = 'ABC123';
```

### DELETE - Removing Data

To remove a component:
```sql
DELETE FROM components WHERE sku = 'OLD123';
```

**⚠️ WARNING: DELETE operations are permanent. Always backup first!**

## Exploration Tools

### 1. DB Browser for SQLite (Recommended)

**Download:** https://sqlitebrowser.org/

**Features:**
- Graphical interface to view tables
- Execute SQL queries
- Import/export data
- View database structure

**How to use:**
1. Download and install DB Browser
2. Open your database file: `server/craft_tools.db`
3. Browse tables in the "Browse Data" tab
4. Execute queries in the "Execute SQL" tab

### 2. SQLite Command Line Tool

**Installation:** SQLite comes pre-installed on most systems, or download from https://www.sqlite.org/download.html

**Basic Commands:**
```bash
# Open your database
sqlite3 server/craft_tools.db

# Show all tables
.tables

# Show table structure
.schema components

# Execute a query
SELECT COUNT(*) FROM components;

# Exit
.quit
```

### 3. VS Code Extensions

**SQLite Extension:**
- Search for "SQLite" in VS Code extensions
- Open your `.db` file directly in VS Code
- View tables and execute queries

## Maintenance Procedures

### Regular Backups

**Why:** Protects against data loss from corruption, accidental deletion, or system failures.

**How to backup:**
1. Simply copy the `server/craft_tools.db` file to a safe location
2. Name it with timestamp: `craft_tools_backup_2025-11-11.db`
3. Store backups in a separate directory or external drive

**Automated backup script:**
```bash
# Create backup with timestamp
cp server/craft_tools.db "backups/craft_tools_$(date +%Y%m%d_%H%M%S).db"
```

### Database Optimization

**VACUUM Command:**
Reclaims unused space and optimizes performance.

```sql
VACUUM;
```

**When to run:** After deleting many records or when database file size seems large.

### Integrity Check

**Verify database health:**
```sql
PRAGMA integrity_check;
```

This command should return "ok" if the database is healthy.

### Database Size Management

**Check database size:**
```sql
SELECT page_count * page_size as size_bytes FROM pragma_page_count(), pragma_page_size();
```

**View table sizes:**
```sql
SELECT name, SUM(pgsize) as size_bytes
FROM dbstat
GROUP BY name
ORDER BY size_bytes DESC;
```

## Troubleshooting

### Common Issues

**1. Database Locked Error**
- **Cause:** Another process is using the database
- **Solution:** Close any open database tools, stop the API server

**2. Corrupted Database**
- **Cause:** System crash, power failure, or disk issues
- **Solution:** Restore from backup, then run `PRAGMA integrity_check;`

**3. Slow Queries**
- **Cause:** Large datasets or unoptimized queries
- **Solution:** Add indexes on frequently queried columns:
```sql
CREATE INDEX idx_components_sku ON components(sku);
CREATE INDEX idx_components_category ON components(category);
```

### Recovery Procedures

**If database becomes corrupted:**
1. Stop all applications using the database
2. Restore from the most recent backup
3. Run integrity check: `PRAGMA integrity_check;`
4. If corruption persists, contact support with error details

## Best Practices

### Data Management
- **Always backup before major changes**
- **Test queries on a copy first**
- **Use transactions for multiple operations:**
```sql
BEGIN TRANSACTION;
-- Your operations here
COMMIT;
```

### Performance
- **Create indexes on columns you search frequently**
- **Avoid SELECT * for large tables**
- **Use LIMIT for testing queries**

### Security
- **Keep database files in secure locations**
- **Don't share database files containing sensitive data**
- **Regularly update backup copies**

## Getting Help

### Resources
- **SQLite Documentation:** https://www.sqlite.org/docs.html
- **DB Browser Documentation:** https://github.com/sqlitebrowser/sqlitebrowser/wiki
- **SQL Tutorials:** https://sqlzoo.net/ or https://www.w3schools.com/sql/

### Support
If you encounter issues:
1. Check this guide first
2. Run `PRAGMA integrity_check;` on your database
3. Include error messages and steps to reproduce when asking for help

## Quick Reference

### Essential Commands
```sql
-- View all tables
.tables

-- View table structure
.schema table_name

-- Count records in table
SELECT COUNT(*) FROM table_name;

-- Backup database
VACUUM INTO 'backup.db';

-- Check database health
PRAGMA integrity_check;
```

### File Locations
- **Database:** `server/craft_tools.db`
- **Backups:** `backups/` directory (create if needed)
- **Logs:** Check `server/logs/` for API server logs

---

*This guide is specific to your Craft Tools Hub SQLite database. For general SQL learning, consider online tutorials or courses focused on relational databases.*