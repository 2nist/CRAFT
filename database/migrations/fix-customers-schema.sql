-- Fix missing columns in customers table for CraftCPQ database
-- Run this on the SQL Server: sqlcmd -S localhost\SQLEXPRESS -E -C -i fix-customers-schema.sql

USE CraftCPQ;
GO

PRINT 'Checking customers table for missing columns...';
PRINT '';

-- Add isOEM column (required for OEM customer tracking)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('customers') AND name = 'isOEM')
BEGIN
    ALTER TABLE customers ADD isOEM BIT DEFAULT 0;
    PRINT '✓ Added: isOEM (BIT, default 0)';
END
ELSE
BEGIN
    PRINT '  isOEM already exists';
END

-- Add company column (company name)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('customers') AND name = 'company')
BEGIN
    ALTER TABLE customers ADD company NVARCHAR(255);
    PRINT '✓ Added: company (NVARCHAR(255))';
END
ELSE
BEGIN
    PRINT '  company already exists';
END

-- Add contact_name column (primary contact person)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('customers') AND name = 'contact_name')
BEGIN
    ALTER TABLE customers ADD contact_name NVARCHAR(255);
    PRINT '✓ Added: contact_name (NVARCHAR(255))';
END
ELSE
BEGIN
    PRINT '  contact_name already exists';
END

-- Add website column (company website)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('customers') AND name = 'website')
BEGIN
    ALTER TABLE customers ADD website NVARCHAR(500);
    PRINT '✓ Added: website (NVARCHAR(500))';
END
ELSE
BEGIN
    PRINT '  website already exists';
END

-- Add tax_id column (tax identification number)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('customers') AND name = 'tax_id')
BEGIN
    ALTER TABLE customers ADD tax_id NVARCHAR(50);
    PRINT '✓ Added: tax_id (NVARCHAR(50))';
END
ELSE
BEGIN
    PRINT '  tax_id already exists';
END

-- Add is_active column (active status)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('customers') AND name = 'is_active')
BEGIN
    ALTER TABLE customers ADD is_active BIT DEFAULT 1;
    PRINT '✓ Added: is_active (BIT, default 1)';
END
ELSE
BEGIN
    PRINT '  is_active already exists';
END

PRINT '';
PRINT 'Schema update complete!';
PRINT '';

-- Show current schema
PRINT 'Current customers table columns:';
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'customers' 
ORDER BY ORDINAL_POSITION;

-- Show recent customers
PRINT '';
PRINT 'Most recent customers (last 5):';
SELECT TOP 5 
    id, 
    name, 
    email, 
    isOEM,
    is_active,
    created_at 
FROM customers 
ORDER BY created_at DESC;

GO
