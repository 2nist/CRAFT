@echo off
REM Quick fix script for adding isOEM column to customers table
REM Run this on the SQL Server machine (Craft-QuickbooksPC)

echo.
echo === Fixing CraftCPQ Database Schema ===
echo.

REM Check if SQL Server is accessible
sqlcmd -S localhost\SQLEXPRESS -E -C -Q "SELECT @@VERSION" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to SQL Server
    echo Make sure SQL Server Express is running
    pause
    exit /b 1
)

echo Connected to SQL Server successfully
echo.

REM Add the isOEM column
echo Adding isOEM column to customers table...
sqlcmd -S localhost\SQLEXPRESS -E -C -Q "USE CraftCPQ; IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('customers') AND name = 'isOEM') BEGIN ALTER TABLE customers ADD isOEM BIT DEFAULT 0; PRINT 'Column added successfully'; END ELSE PRINT 'Column already exists'"

if %errorlevel% equ 0 (
    echo.
    echo ✓ Schema fix completed successfully!
    echo.
    echo Verifying column exists...
    sqlcmd -S localhost\SQLEXPRESS -E -C -Q "USE CraftCPQ; SELECT TOP 1 COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'isOEM'"
    echo.
    echo You can now retry adding the customer in the app.
) else (
    echo.
    echo ✗ Failed to add column
    echo Check the error message above
)

echo.
pause
