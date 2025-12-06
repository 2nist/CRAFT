# Database Schema Migration Guide

## Quick Fix for Missing `isOEM` Column

Run this on **Craft-QuickbooksPC** (SQL Server):

```cmd
sqlcmd -S localhost\SQLEXPRESS -E -C -Q "USE CraftCPQ; ALTER TABLE customers ADD isOEM BIT DEFAULT 0"
```

## Complete Schema Fix

To fix all missing columns at once:

```cmd
cd C:\Users\CraftAuto-Sales\cth\database\migrations
sqlcmd -S localhost\SQLEXPRESS -E -C -i fix-customers-schema.sql
```

## What Gets Fixed

The script adds these columns if missing:

- `isOEM` (BIT) - OEM customer flag
- `company` (NVARCHAR(255)) - Company name
- `contact_name` (NVARCHAR(255)) - Primary contact
- `website` (NVARCHAR(500)) - Company website
- `tax_id` (NVARCHAR(50)) - Tax ID number
- `is_active` (BIT) - Active status flag

## Verify the Fix

After running the migration:

```cmd
sqlcmd -S localhost\SQLEXPRESS -E -C -Q "USE CraftCPQ; SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' ORDER BY ORDINAL_POSITION"
```

## Check Recent Customers

```cmd
sqlcmd -S localhost\SQLEXPRESS -E -C -Q "USE CraftCPQ; SELECT TOP 5 id, name, email, isOEM, created_at FROM customers ORDER BY created_at DESC"
```

## Troubleshooting

**Error: "Database 'CraftCPQ' does not exist"**
- Run the database initialization scripts first
- Check: `sqlcmd -S localhost\SQLEXPRESS -E -Q "SELECT name FROM sys.databases"`

**Error: "Invalid object name 'customers'"**
- The customers table doesn't exist yet
- Run the main schema creation script first

**Permission Denied**
- Make sure you're running as Administrator
- Or add `-U sa -P YourPassword` if using SQL authentication

## Network Installation Note

If running on a different machine:
```cmd
sqlcmd -S Craft-QuickbooksPC\SQLEXPRESS -E -C -i fix-customers-schema.sql
```

Replace `Craft-QuickbooksPC` with the actual SQL Server hostname.
