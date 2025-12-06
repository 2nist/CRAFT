# Portable Build Instructions

## Build Completed Successfully ✓

Your portable .exe application has been built and is ready for deployment.

### Output Location
```
c:\Users\CraftAuto-Sales\cth\release\win-unpacked\
```

### Application Files
- **Executable**: `Craft Automation CPQ.exe` (169 MB)
- **All dependencies**: Included (DLLs, resources, data files)
- **Application data**: `resources/app/` (includes dist/, dist-electron/, src/data/)

### Deployment Instructions

#### Option 1: Direct Folder Distribution
1. Copy the entire `release/win-unpacked/` folder to your deployment location
2. Rename it to something user-friendly, e.g., `CraftAutomation`
3. Create a Windows shortcut to `Craft Automation CPQ.exe`
4. Distribute to end users

**Advantages**:
- No installation required
- Run directly from any location (USB, network share, etc.)
- Portable and self-contained
- All files included, no external dependencies

#### Option 2: Create a Zip Archive
```powershell
# PowerShell command to create a zip file
Compress-Archive -Path "release/win-unpacked" -DestinationPath "release/CraftAutomationCPQ.zip"
```

This creates a portable .zip file that can be distributed and extracted anywhere.

### System Requirements
- Windows 10 or later (64-bit)
- ~200 MB free disk space (for application files)
- Network access to SQL Server database (for database operations)

### Configuration
On first run, the application will:
1. Check for `.env` file with production settings
2. Create `runtime-config.json` with NAS path configuration
3. Initialize database connection to SQL Server

**Default Configuration**:
- NAS Path: `\\192.168.1.99\CraftAuto-Sales\CACPQDB`
- Database: SQL Server (mssql)

### Features Included
✓ Assembly I/O Builder (Layers icon)
✓ Product Template Manager
✓ Quote Configurator
✓ BOM Management
✓ Component Manager
✓ Sub-Assembly Manager
✓ Margin Calculator
✓ FLA Calculator
✓ Number Generator
✓ Settings Management
✓ Dashboard with Hub view

### Troubleshooting

**If the app won't start:**
1. Ensure all files are in `win-unpacked` directory (do not separate the .exe)
2. Check Windows Event Viewer for detailed error messages
3. Verify network access to SQL Server database
4. Ensure local user has write permissions to application directory

**Database Connection Issues:**
- Verify SQL Server is running and accessible
- Check NAS path configuration in `runtime-config.json`
- Ensure Windows credentials have database access

### Next Steps
1. Test the application on a development machine
2. Configure environment variables if needed (.env file)
3. Deploy to end-user machines
4. Configure NAS path and database connection for each location

---
**Build Date**: December 5, 2025
**Application**: Craft Automation CPQ
**Version**: 1.0.0
