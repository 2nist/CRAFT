# 🚀 Deployment & Update Guide

**Internal Distribution Strategy for Craft Tools Hub**

---

## 📦 Distribution Options

### Option 1: NAS-Based Installation (Recommended) 🎯

**Best for**: Small teams, easy updates, centralized control, automated deployment

#### Automated Setup with PowerShell Script

The repository includes `scripts/publish-to-nas.ps1` that automates the entire deployment:

```powershell
# Deploy to NAS (default: \\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime)
.\scripts\publish-to-nas.ps1

# Deploy specific version
.\scripts\publish-to-nas.ps1 -Version "v1.0.0"

# Skip build (use existing artifacts)
.\scripts\publish-to-nas.ps1 -SkipBuild

# Custom NAS path
.\scripts\publish-to-nas.ps1 -TargetPath "\\NAS\Apps\CraftToolsHub"
```

**What the script does:**
- ✅ Builds the app (`npm run build`)
- ✅ Creates versioned folder structure (`updates/v1.0rc/`)
- ✅ Maintains `latest` pointer for auto-updates
- ✅ Syncs all necessary files (dist, plugins, configs)
- ✅ Generates build metadata with Git info
- ✅ Creates workstation setup scripts
- ✅ Uses Robocopy for efficient mirroring

#### Folder Structure Created

```
\\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime\
├── updates/
│   ├── v1.0rc/              # Versioned deployment
│   │   ├── dist/           # Built frontend
│   │   ├── dist-electron/  # Electron main process
│   │   ├── electron/       # Electron source
│   │   ├── public/         # Static assets
│   │   ├── plugins/        # All plugin modules
│   │   ├── src/            # React source
│   │   ├── docs/           # Documentation
│   │   ├── OUTPUT/         # Logs folder
│   │   ├── package.json
│   │   ├── build-info.json # Version metadata
│   │   ├── run-app.bat     # Launch script
│   │   └── ... (all config files)
│   └── latest/             # Always points to newest
├── runtime.env.example      # Example env variable
├── Set-CTHRuntimeRoot.ps1   # Workstation setup (PowerShell)
└── Set-CTHRuntimeRoot.bat   # Workstation setup (Batch)
```

#### Permissions Setup

- **Everyone**: Read & Execute
- **IT/Admin**: Full Control
- **Developer**: Modify (for publish script)

#### User Installation

**First Time Setup**:

1. **Set Environment Variable** (choose one):
   ```powershell
   # PowerShell (User scope)
   \\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime\Set-CTHRuntimeRoot.ps1
   
   # PowerShell (Machine scope - requires admin)
   \\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime\Set-CTHRuntimeRoot.ps1 -Scope Machine
   
   # Batch (User scope)
   \\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime\Set-CTHRuntimeRoot.bat
   
   # Batch (Machine scope - requires admin)
   \\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime\Set-CTHRuntimeRoot.bat /machine
   ```

2. **Launch App**:
   ```
   \\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime\updates\latest\run-app.bat
   ```
   Or create desktop shortcut to this location.

3. **First Launch**:
   - Creates user data folder at `%APPDATA%\electron-vite-react-app`
   - Loads component database from NAS
   - Ready to use!

**Advantages**:
- ✅ Single source of truth
- ✅ Automated deployment script
- ✅ Version tracking with Git metadata
- ✅ Zero-downtime updates (latest folder)
- ✅ Easy rollback (previous versions preserved)
- ✅ No per-machine installation needed
- ✅ Network-accessible documentation
- ✅ Build metadata for troubleshooting

---

### Option 2: Portable App (No Installation)

**Best for**: Users without admin rights, quick deployment

#### Setup

1. **Build portable version**:
   ```bash
   npm run electron:build
   # Copy release/win-unpacked/ folder to NAS
   ```

2. **NAS folder**:
   ```
   \\NAS\Apps\CraftToolsHub-Portable\
   ├── Craft Tools Hub.exe
   ├── resources\
   ├── locales\
   └── README.txt
   ```

3. **Create desktop shortcut** pointing to:
   ```
   \\NAS\Apps\CraftToolsHub-Portable\Craft Tools Hub.exe
   ```

#### Usage

Users run directly from NAS - no installation needed!

**Advantages**:
- ✅ No admin rights required
- ✅ Runs from network
- ✅ Instant updates for everyone
- ✅ No per-machine installation

**Disadvantages**:
- ⚠️ Requires network connection
- ⚠️ Slightly slower startup
- ⚠️ Multiple users = multiple instances

---

### Option 3: Local Install with Update Checker

**Best for**: Professional deployment, automatic updates

#### Implementation

Add update checker to your app (I can help build this):

```javascript
// Check NAS for new version on startup
const currentVersion = "1.0.0";
const updateCheckUrl = "\\\\NAS\\Software\\CraftToolsHub\\version.json";

// version.json contains:
{
  "version": "1.1.0",
  "downloadUrl": "\\\\NAS\\Software\\CraftToolsHub\\Current\\Craft-Tools-Hub-Setup.exe",
  "changelog": "Added new features...",
  "required": false
}
```

**Flow**:
1. App checks NAS on startup
2. If newer version exists → Show notification
3. User clicks "Update" → Downloads from NAS
4. Runs installer automatically

---

## 🔄 Update Workflow

### For IT/Admin

#### When You Have a New Version:

1. **Pull Latest Code**:
   ```bash
   git pull origin quote_config
   ```

2. **Test Locally** (optional but recommended):
   ```bash
   npm run electron:dev
   # Verify features work as expected
   ```

3. **Deploy to NAS** (One Command!):
   ```powershell
   # Navigate to repository root
   cd C:\Users\CraftAuto-Sales\cth\craft_tools_hub
   
   # Deploy with version tag
   .\scripts\publish-to-nas.ps1 -Version "v1.1.0"
   
   # Or use default version (v1.0rc)
   .\scripts\publish-to-nas.ps1
   ```

   **What happens:**
   - ✅ Builds renderer and Electron (`npm run build`)
   - ✅ Creates `updates/v1.1.0/` with all files
   - ✅ Updates `latest/` folder automatically
   - ✅ Generates `build-info.json` with Git metadata
   - ✅ Creates workstation setup scripts
   - ✅ Previous versions preserved for rollback

4. **Verify Deployment**:
   ```powershell
   # Check build info
   Get-Content "\\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime\updates\latest\build-info.json"
   ```

5. **Notify Users**:
   - Email: "New version v1.1.0 available on NAS"
   - Users just need to restart the app
   - No reinstallation required!

### For Users

#### Updating to New Version:

**Option A - Clean Install**:
1. Uninstall old version (Settings → Apps)
2. Run installer from NAS
3. Settings/data preserved automatically

**Option B - In-Place Update** (if you build auto-updater):
1. Click "Update Available" notification
2. Click "Download & Install"
3. App restarts with new version

---

## 📋 Recommended Deployment Strategy

### Initial Rollout

**Week 1**: Pilot group (2-3 users)
```
1. Install from NAS
2. Gather feedback
3. Fix critical bugs
4. Update NAS version
```

**Week 2**: Full team deployment
```
1. Send email with instructions
2. Include link to USER_GUIDE.md on NAS
3. Schedule training/demo
4. IT available for support
```

### Ongoing Updates

**Monthly** or **as-needed**:
- Build new version
- Test with pilot user
- Deploy to NAS
- Send notification email

---

## 🛠️ Build Scripts for Deployment

### Create `deploy-to-nas.bat`

```batch
@echo off
echo ================================
echo  Deploying Craft Tools Hub
echo ================================
echo.

REM Set variables
set NAS_PATH=\\NAS\Software\CraftToolsHub
set VERSION=1.0.0

REM Build the app
echo [1/4] Building application...
call npm run electron:build
if errorlevel 1 goto :error

REM Archive current version
echo [2/4] Archiving current version...
xcopy "%NAS_PATH%\Current\*" "%NAS_PATH%\Versions\v%VERSION%\" /E /I /Y

REM Deploy new version
echo [3/4] Deploying to NAS...
copy /Y "release\Craft-Tools-Hub-Setup-%VERSION%.exe" "%NAS_PATH%\Current\Craft-Tools-Hub-Setup.exe"

REM Update documentation
echo [4/4] Updating documentation...
copy /Y "USER_GUIDE.md" "%NAS_PATH%\Documentation\"
copy /Y "QUICK_START.md" "%NAS_PATH%\Documentation\"
copy /Y "CHANGELOG.md" "%NAS_PATH%\Documentation\"

echo.
echo ================================
echo  Deployment Complete!
echo ================================
echo.
echo Users can now install from:
echo %NAS_PATH%\Current\
echo.
goto :end

:error
echo.
echo ERROR: Build failed!
echo.

:end
pause
```

### Create `CHANGELOG.md` template

```markdown
# Changelog

## [1.1.0] - 2025-11-15
### Added
- Global component search (Ctrl+K)
- Category icons in Product Template Manager

### Fixed
- Settings persistence issue
- Export path selection

### Changed
- Improved dashboard layout
- Updated component database

## [1.0.0] - 2025-11-06
### Initial Release
- Quote Configurator
- Product Template Manager
- Component Manager
- BOM Builder tools
- Calculator tools
```

---

## 📧 Communication Templates

### Initial Deployment Email

```
Subject: NEW TOOL: Craft Tools Hub - Quote Management System

Team,

We've developed a new tool to streamline our quote and BOM processes!

📍 INSTALLATION:
Navigate to: \\NAS\Software\CraftToolsHub\Current\
Run: Craft-Tools-Hub-Setup.exe
Follow the wizard (takes 2 minutes)

📚 DOCUMENTATION:
User Guide: \\NAS\Software\CraftToolsHub\Documentation\USER_GUIDE.md
Quick Start: \\NAS\Software\CraftToolsHub\Documentation\QUICK_START.md

🎓 TRAINING:
Live demo: [Date/Time]
Or: Watch recorded demo at [Link]

❓ QUESTIONS:
Contact IT or reply to this email

Key Features:
- Quote Configurator with 6-step wizard
- Global Component Search (Ctrl+K)
- BOM Builder & Importer
- FLA & Margin Calculators
- Customizable Dashboard

Let's make quoting easier!

[Your Name]
```

### Update Notification Email

```
Subject: UPDATE AVAILABLE: Craft Tools Hub v1.1.0

Team,

A new version of Craft Tools Hub is now available!

🆕 WHAT'S NEW:
- Global component search is now faster
- Added keyboard shortcuts
- Fixed settings save issue
- Updated component database

📍 HOW TO UPDATE:
1. Uninstall current version (optional but recommended)
2. Navigate to: \\NAS\Software\CraftToolsHub\Current\
3. Run: Craft-Tools-Hub-Setup.exe

📋 FULL CHANGELOG:
\\NAS\Software\CraftToolsHub\Documentation\CHANGELOG.md

Your settings and quotes will be preserved!

Questions? Let me know.

[Your Name]
```

---

## 🔒 User Data & Settings

### Data Storage Locations

**User Settings** (preserved across updates):
```
%APPDATA%\electron-vite-react-app\data\
├── dashboard_settings.json
├── useful_links.json
└── doc_hub_items.json
```

**Quotes** (preserved across updates):
```
Craft_Tools_Hub\src\data\quotes\
└── [quote files]
```

**Component Database** (global, can be on NAS):
```
Option 1: Local
Craft_Tools_Hub\public\COMPONENT PRICE LIST [MASTER].csv

Option 2: Network (shared database)
\\NAS\Data\CraftToolsHub\COMPONENT PRICE LIST [MASTER].csv
```

### Shared Component Database Setup

To have **everyone use the same component database**:

1. **Place CSV on NAS**:
   ```
   \\NAS\Data\CraftToolsHub\COMPONENT PRICE LIST [MASTER].csv
   ```

2. **Modify app to load from NAS** (I can help with this):
   ```javascript
   const componentDbPath = "\\\\NAS\\Data\\CraftToolsHub\\COMPONENT PRICE LIST [MASTER].csv";
   ```

3. **Benefits**:
   - Single source of truth
   - Update once, affects everyone
   - No per-user database syncing

---

## 🧪 Testing Checklist Before Deployment

### Pre-Deployment Tests

- [ ] Build installer successfully
- [ ] Install on clean test machine
- [ ] Verify all plugins load
- [ ] Test component search
- [ ] Create sample quote
- [ ] Export quote to CSV/PDF
- [ ] Check settings persist after restart
- [ ] Uninstall cleanly
- [ ] Reinstall (verify settings preserved)

### Network Tests

- [ ] Installer works from NAS
- [ ] Portable version runs from NAS
- [ ] Documentation accessible on NAS
- [ ] Shared component database loads
- [ ] Multiple users can access simultaneously

---

## 🎯 Recommended Setup for Your Team

Based on typical internal deployment:

### **Phase 1: Initial Setup** (Day 1)

1. **Create NAS structure**:
   ```
   \\NAS\Software\CraftToolsHub\
   ├── Current\
   │   └── Craft-Tools-Hub-Setup.exe
   ├── Documentation\
   │   ├── USER_GUIDE.md
   │   └── QUICK_START.md
   └── SharedData\
       └── COMPONENT PRICE LIST [MASTER].csv
   ```

2. **Test with one user**

### **Phase 2: Pilot** (Week 1)

1. Deploy to 2-3 power users
2. Gather feedback
3. Fix issues
4. Update NAS version

### **Phase 3: Rollout** (Week 2)

1. Email entire team
2. Schedule demo/training
3. Provide support

### **Phase 4: Maintenance** (Ongoing)

1. Monthly updates via NAS
2. Email notifications
3. Maintain changelog

---

## 💡 Pro Tips

### For Smooth Deployment:

1. **Version Everything**
   - Keep old versions in `Versions/` folder
   - Always update CHANGELOG.md
   - Use semantic versioning (1.0.0, 1.1.0, 2.0.0)

2. **Communication is Key**
   - Announce updates in advance
   - Explain what changed and why
   - Provide migration path if needed

3. **Make Updates Easy**
   - Keep installer in same NAS location
   - Preserve user data automatically
   - Test update process yourself first

4. **Gather Feedback**
   - Create feedback channel (email, Teams, etc.)
   - Track feature requests
   - Address bugs quickly

5. **Document Everything**
   - Keep USER_GUIDE.md updated
   - Maintain CHANGELOG.md
   - Create FAQ from common questions

---

## 🚨 Troubleshooting Deployment

### "Can't access NAS"
- Check network connection
- Verify NAS path is correct
- Check user permissions

### "Installation failed"
- Run as administrator
- Check antivirus isn't blocking
- Verify disk space available

### "App won't start after update"
- Uninstall completely
- Delete %APPDATA%\electron-vite-react-app
- Reinstall fresh

### "Lost my settings"
- Settings stored in %APPDATA%
- Should survive updates
- Backup before major updates

---

## 📞 Support Strategy

### Create Support Structure:

1. **Tier 1**: USER_GUIDE.md (self-service)
2. **Tier 2**: Email to IT/you
3. **Tier 3**: Developer (you) for bugs

### Track Issues:
- Create Excel sheet or use GitHub Issues
- Log: Date, User, Issue, Resolution
- Build FAQ from common issues

---

**Need help setting any of this up? I can modify the app to support auto-updates, shared databases, or any other deployment feature you need!** 🚀
