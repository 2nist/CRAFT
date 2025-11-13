# SQLite3 NAS Database & NSIS Installer Fix

## 🔍 Issues Fixed

### 1. **SQLite3 Native Module Not Loading in Packaged App**
**Problem**: The `sqlite3` package contains native compiled binaries (`.node` files) that must be unpacked from ASAR archives in Electron.

**Solution**: 
- Added `asarUnpack` configuration to `package.json` to exclude `sqlite3` from ASAR packaging
- Modified database path resolution to handle ASAR unpacked paths
- Enabled proper native module rebuilding during packaging

### 2. **NSIS Installer Not Creating Proper Package**
**Problem**: The `npmRebuild` was set to `false`, preventing native modules from being rebuilt for the target platform.

**Solution**:
- Changed `npmRebuild: true` in `package.json` build config
- Added `buildDependenciesFromSource: true` to ensure clean builds
- Added NSIS target alongside directory target for complete installer creation

### 3. **Database Connection Failures on NAS Paths**
**Problem**: Network database paths were failing due to:
- Synchronous access checks failing on network paths
- Missing error handling for ASAR-packed environments
- Insufficient logging to diagnose issues
- SQLite database locking conflicts with multiple concurrent users

**Solution**:
- Enhanced error logging with detailed error codes and messages
- Added ASAR path detection and replacement logic
- Improved fallback handling when databases fail to initialize
- **Implemented Local DB + NAS Master Sync Architecture**:
  - Each user works with local SQLite database (no locking conflicts)
  - Master database on NAS serves as source of truth
  - Scheduled bi-directional sync (2-4 times daily)
  - Supports 4-5 concurrent users with offline capability

## 📝 Changes Made

### `package.json`
```json
{
  "build": {
    "files": [
      "dist/**/*",
      "dist-electron/**/*",
      "src/data/**/*",
      "!node_modules/sqlite3/build-tmp-napi-*/**/*"
    ],
    "asarUnpack": [
      "node_modules/sqlite3/**/*"
    ],
    "win": {
      "target": [
        { "target": "nsis", "arch": ["x64"] },
        { "target": "dir", "arch": ["x64"] }
      ]
    },
    "npmRebuild": true,
    "buildDependenciesFromSource": true,
    "nodeGypRebuild": false
  }
}
```

### `electron/main.js`
**Database Path Resolution**:
```javascript
// For ASAR-packed applications, sqlite3 binaries must be unpacked
const actualDbPath = app.isPackaged && dbPath.includes('app.asar')
  ? dbPath.replace('app.asar', 'app.asar.unpacked')
  : dbPath
```

**Enhanced Error Logging**:
```javascript
catch (error) {
  console.error('❌ Error initializing database:', error)
  console.error('   Error code:', error.code)
  console.error('   Error message:', error.message)
  if (error.stack) console.error('   Stack:', error.stack)
  generatedNumbersDb = null
}
```

## 🚀 Building the Application

### Clean Build Process
```powershell
# Clean previous builds
Remove-Item -Path "release" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "dist-electron" -Recurse -Force -ErrorAction SilentlyContinue

# Install dependencies (rebuilds native modules)
npm install

# Build the application
npm run build

# Create NSIS installer
npx electron-builder --win --publish=never
```

### Verify SQLite3 Unpacking
After building, verify that `sqlite3` is unpacked:
```
release/win-unpacked/resources/app.asar.unpacked/node_modules/sqlite3/
```

## 🧪 Testing

### Local Database Test
1. Run the packaged app from `release/win-unpacked/`
2. Check console logs for:
   - ✅ "Generated numbers database connected successfully"
   - ✅ "Embedded server connected to database successfully"
3. Verify database files created in `%APPDATA%\electron-vite-react-app\data\database\`

### NAS Database Test
1. Set environment variable:
   ```powershell
   $env:CTH_RUNTIME_ROOT = "\\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime\updates\latest"
   ```
2. Run the app
3. Check logs for "Database location type: NAS/Shared"
4. If credentials are required, the app will prompt automatically
5. Verify databases are created on the NAS at:
   ```
   \\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime\updates\latest\database\
   ```

### NSIS Installer Test
1. Find installer in `release/` directory
2. Run the installer
3. Install to a test directory
4. Launch the installed application
5. Verify databases initialize correctly

## 🔧 Troubleshooting

### "Cannot find module 'sqlite3'"
**Cause**: sqlite3 not unpacked from ASAR
**Fix**: Verify `asarUnpack` is in package.json and rebuild

### "Database is locked" on NAS
**Cause**: Multiple users accessing same database file
**Fix**: Consider using server mode or per-user database files

### "Access denied" on NAS path
**Cause**: Network credentials not saved
**Fix**: App will prompt for credentials on first run

### Build fails with "node-gyp rebuild failed"
**Cause**: Missing build tools
**Fix**: Install windows-build-tools:
```powershell
npm install --global windows-build-tools
```

## 📊 Database Locations

### Development Mode
- **Local**: `%APPDATA%\electron-vite-react-app\data\database\`
- **NAS**: Uses `CTH_RUNTIME_ROOT` environment variable

### Production Mode
- **Local**: `%APPDATA%\Craft Automation CPQ\data\database\`
- **NAS**: Configured via `runtime-config.json` in app directory

## ✅ Verification Checklist

- [x] `package.json` has `asarUnpack` for sqlite3
- [x] `npmRebuild` set to `true`
- [x] Database path handling includes ASAR unpacking
- [x] Enhanced error logging in place
- [x] NSIS target added to build config
- [x] Both databases (craft_tools.db and generated_numbers.db) handled
- [x] Graceful fallback when NAS is unavailable
- [x] Credential prompting for NAS access

## 🎯 Expected Behavior

1. **First Run (No NAS)**: Creates local databases in AppData
2. **First Run (With NAS env var)**: Attempts NAS, prompts for credentials if needed, falls back to local if fails
3. **Subsequent Runs**: Uses stored credentials for NAS access
4. **NSIS Install**: Properly packages sqlite3 binaries and creates working installer
5. **Database Errors**: App continues to function, logs detailed error information

## 📚 Additional Resources

- [Electron ASAR Documentation](https://www.electronjs.org/docs/latest/tutorial/asar-archives)
- [electron-builder Native Modules](https://www.electron.build/configuration/configuration#Configuration-native)
- [sqlite3 Package Issues](https://github.com/TryGhost/node-sqlite3/issues)
