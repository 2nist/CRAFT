# Beta Deployment Checklist

## 🚀 Pre-Deployment Steps

### 1. Build Preparation
- [ ] Run `npm run dist` to create installer
- [ ] Verify `release/Craft Automation CPQ Setup 1.0.0.exe` exists
- [ ] Check installer size is reasonable (~100-200MB)
- [ ] Test unpacked version in `release/win-unpacked/`

### 2. Icon Assets
⚠️ **IMPORTANT**: Replace placeholder icon before deployment
- [ ] Create 256x256 Craft Automation logo
- [ ] Convert to .ico format (include 16x16, 32x32, 48x48, 256x256)
- [ ] Replace `build/icon.ico` with actual branded icon
- [ ] Rebuild installer after icon replacement

### 3. Clean Machine Testing
- [ ] Install on Windows machine without Node.js/dev tools
- [ ] Verify app launches successfully
- [ ] Test all core features:
  - [ ] Quote Configurator
  - [ ] Product Template Manager
  - [ ] Global Component Search (Ctrl+K)
  - [ ] BOM Management
  - [ ] Margin Calculator
  - [ ] Number Generator
- [ ] Test theme switching (light/dark mode)
- [ ] Verify database initialization
- [ ] Test NAS connectivity (if applicable)

### 4. Performance Validation
- [ ] App starts within 5 seconds
- [ ] No console errors on startup
- [ ] UI is responsive
- [ ] Large datasets load smoothly
- [ ] No memory leaks during extended use

### 5. Documentation
- [ ] README.md is up to date
- [ ] User guides are accessible
- [ ] Known issues documented
- [ ] Support contact information provided

## 📦 Deployment Options

### Option A: NAS Deployment (Recommended for Teams)
```powershell
# Deploy to network share
.\scripts\publish-to-nas.ps1 -Version "v1.0-beta1"
```

**Verify:**
- [ ] Files copied to `\\92.168.1.99\\CraftAuto-Sales\\Temp_Craft_Tools_Runtime\\updates\v1.0-beta1\`
- [ ] `latest` symlink/folder updated
- [ ] `run-app.bat` launches successfully from NAS
- [ ] Multiple users can access simultaneously

### Option B: Direct Installation
```powershell
# Run the installer
.\release\Craft Automation CPQ Setup 1.0.0.exe
```

**Verify:**
- [ ] Installer completes without errors
- [ ] Desktop shortcut created
- [ ] Start Menu entry exists
- [ ] App appears in Add/Remove Programs
- [ ] Uninstaller works correctly

## 🧪 Beta Testing Guidelines

### Test Environment
- **OS**: Windows 10/11 (64-bit)
- **Permissions**: Standard user (not admin)
- **Network**: Connected to company network
- **Prerequisites**: None (standalone app)

### Test Scenarios

#### 1. New User Onboarding
- [ ] First launch experience is smooth
- [ ] Default settings are sensible
- [ ] Dashboard loads with sample data
- [ ] Tutorial/help is accessible

#### 2. Quote Creation Workflow
- [ ] Create new quote from scratch
- [ ] Select product template
- [ ] Configure assemblies
- [ ] Add I/O points
- [ ] Generate BOM
- [ ] Export quote

#### 3. Data Persistence
- [ ] Save quote successfully
- [ ] Load saved quote
- [ ] Data survives app restart
- [ ] No data corruption

#### 4. Multi-User Scenarios (NAS deployment)
- [ ] Two users open app simultaneously
- [ ] Number generation doesn't conflict
- [ ] Database locks handled properly
- [ ] Sync status displays correctly

#### 5. Edge Cases
- [ ] Handle missing network connection gracefully
- [ ] Recover from crashes
- [ ] Handle corrupted data files
- [ ] Validate user inputs

## 🐛 Known Issues

### Non-Blocking Issues
1. **Large bundle sizes**: HubDashboard.js is 560KB
   - Impact: Slightly slower initial load
   - Workaround: None needed
   - Fix planned: Code splitting in v1.1

2. **Build warnings**: Dynamic import warnings
   - Impact: None (warnings only)
   - Workaround: None needed
   - Fix planned: Vite config optimization

### Beta Limitations
- [ ] Document any feature limitations
- [ ] Note any incomplete features
- [ ] List any required manual setup steps

## 📞 Support Information

### For Beta Testers
- **Report Issues**: [Create GitHub issue or email]
- **Questions**: [Internal support channel]
- **Feedback**: [Feedback form or email]

### For IT/Admins
- **Deployment Help**: See `COWORKER_DEPLOYMENT_GUIDE.md`
- **NAS Setup**: See `docs/user/ADMIN_GUIDE_DEPLOYMENT.md`
- **Troubleshooting**: See `docs/manual/NAS_TROUBLESHOOTING.md`

## 🔄 Rollback Procedures

### If Issues Occur
1. **Uninstall**: Use Add/Remove Programs or run uninstaller
2. **Clean Data** (if needed): Delete `%APPDATA%\electron-vite-react-app\`
3. **Report Issues**: Document what went wrong
4. **Previous Version**: Available at `\\NAS\...\updates\[previous-version]\`

### Emergency Contacts
- **Primary**: [Name/Contact]
- **Secondary**: [Name/Contact]
- **IT Support**: [Contact]

## ✅ Final Verification

Before releasing to beta testers:
- [ ] All checklist items completed
- [ ] Installer tested on clean machine
- [ ] Known issues documented
- [ ] Support channels ready
- [ ] Rollback plan in place
- [ ] Beta testers briefed

## 📝 Post-Deployment

After beta release:
- [ ] Monitor for crash reports
- [ ] Track user feedback
- [ ] Document common issues
- [ ] Plan fixes for v1.1
- [ ] Schedule follow-up with testers

---

**Deployment Date**: _____________

**Deployed By**: _____________

**Beta Tester Count**: _____________

**Target End Date**: _____________
