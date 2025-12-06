@echo off
REM Complete schema migration script
REM Adds all missing columns to customers table

echo.
echo === CraftCPQ Database Schema Migration ===
echo.

REM Check if SQL Server is accessible
sqlcmd -S localhost\SQLEXPRESS -E -C -Q "SELECT @@VERSION" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to SQL Server
    echo.
    echo Troubleshooting:
    echo 1. Make sure SQL Server Express is running
    echo 2. Check Windows Services for "SQL Server (SQLEXPRESS)"
    echo 3. Try running as Administrator
    pause
    exit /b 1
)

echo ✓ Connected to SQL Server
echo.

REM Run the migration script
echo Running schema migration...
echo.
sqlcmd -S localhost\SQLEXPRESS -E -C -i "%~dp0fix-customers-schema.sql"

if %errorlevel% equ 0 (
    echo.
    echo ================================================
    echo ✓ Schema migration completed successfully!
    echo ================================================
    echo.
    echo Next steps:
    echo 1. Restart the Craft Automation CPQ app
    echo 2. Try adding a customer again
    echo 3. The "Invalid column name 'isOEM'" error should be gone
    echo.
) else (
    echo.
    echo ================================================
    echo ✗ Migration failed
    echo ================================================
    echo Check the error messages above for details
    echo.
)

pause
