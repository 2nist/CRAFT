# 🚀 Next Steps: Deploy Craft Tools Hub to Coworkers' Desktops

This guide provides step-by-step instructions for deploying Craft Tools Hub to your coworkers' desktops with full access to import/export functionality, component pricelist reading, and quoting capabilities.

---

## 📋 Prerequisites

### System Requirements
- **Windows 10/11** (64-bit)
- **Network access** to NAS share (`\\NAS\updates\latest\`)
- **Read/write permissions** to shared database
- **PowerShell execution** enabled (for setup script)

### Access Requirements
- **NAS Share Access**: `\\NAS\updates\latest\`
- **Database Permissions**: Read/write to `craft_tools.db`
- **Export Permissions**: Write access to chosen export locations

---

## 📦 Deployment Package Contents

The deployment package includes:
```
\\NAS\updates\latest\
├── run-app.bat              # Main launcher
├── Set-CTHRuntimeRoot.ps1   # Setup script
├── server\                  # API server files
│   ├── server.js           # Express API server
│   └── craft_tools.db      # SQLite database (1,335+ components)
├── dist-electron\          # Electron app files
│   ├── main.cjs
│   ├── preload.cjs
│   └── hub.html
└── public\                 # Static assets
    ├── COMPONENT PRICE LIST [MASTER].csv
    └── plugin_registry.json
```

---

## 🛠️ Step-by-Step Deployment

### Step 1: Verify NAS Access

**For Each Coworker:**

1. **Test Network Connection**:
   ```powershell
   # Open PowerShell and run:
   Test-Path "\\NAS\updates\latest"
   ```
   Should return: `True`

2. **Check Database Access**:
   ```powershell
   # Verify database file exists:
   Test-Path "\\NAS\updates\latest\server\craft_tools.db"
   ```
   Should return: `True`

3. **Test Write Permissions**:
   ```powershell
   # Try to create a test file:
   New-Item "\\NAS\updates\latest\test_write.txt" -ItemType File
   Remove-Item "\\NAS\updates\latest\test_write.txt"
   ```
   Should complete without errors.

### Step 2: Run Setup Script

**For Each Coworker:**

1. **Open PowerShell as Administrator**
2. **Navigate to deployment folder**:
   ```powershell
   cd "\\NAS\updates\latest"
   ```
3. **Execute setup script**:
   ```powershell
   .\Set-CTHRuntimeRoot.ps1
   ```

4. **Verify environment variable**:
   ```powershell
   echo $env:CTH_RUNTIME_ROOT
   ```
   Should show: `\\NAS\updates\latest`

### Step 3: Launch Application

**For Each Coworker:**

1. **Double-click** `run-app.bat`
2. **Wait for splash screen** (animated spinner)
3. **Verify connection** - App should show:
   - Dashboard loads successfully
   - Component count shows 1,335+
   - No connection errors

### Step 4: Test Core Functionality

**Verify Import/Export Capabilities:**

#### Component Database Access
1. Open **Component Manager**
2. Verify **1,335+ components** are visible
3. Test **Global Search** (Ctrl+K)
4. Search for a known component (e.g., "relay")
5. Verify component details load correctly

#### Import Functionality
1. Go to **Component Manager** → **Import**
2. Use template: `BOM_IMPORT_TEMPLATE.csv`
3. Test import with sample data
4. Verify components appear in database

#### Export Functionality
1. Go to **Component Manager** → **Export**
2. Export component list to CSV
3. Verify file creates successfully
4. Open exported file in Excel

#### Quote Creation
1. Open **Quote Configurator**
2. Complete **6-step wizard**:
   - Step 1: Enter quote information
   - Step 2: Select product template
   - Step 3: Add components (use Ctrl+K search)
   - Step 4: Set pricing
   - Step 5: Terms & conditions
   - Step 6: Export to PDF/CSV

---

## 🔧 Configuration for Teams

### Shared Export Location

**Set up team export folder:**
1. Create shared network folder: `\\NAS\exports\`
2. Set permissions: Read/write for all team members
3. In app **Settings** → **Export**:
   - Set **Default Export Location** to `\\NAS\exports\`
   - Enable **Include Timestamps**

### Component Price List Access

**Verify master price list:**
- Location: `\\NAS\updates\latest\public\COMPONENT PRICE LIST [MASTER].csv`
- Should be **read-only** for users
- **IT/Admin only** should update this file
- Users access via **Component Manager**

### Database Backup Strategy

**Automated backups:**
- Database location: `\\NAS\updates\latest\server\craft_tools.db`
- **Daily backups** recommended
- **Before major updates** - full backup required
- Use NAS backup system or PowerShell script

---

## 👥 User Training Checklist

### Essential Skills

**For Each New User:**

- [ ] Launch app via `run-app.bat`
- [ ] Navigate Dashboard
- [ ] Use Global Search (Ctrl+K)
- [ ] Create basic quote
- [ ] Import component data
- [ ] Export quote/BOM
- [ ] Access component manuals
- [ ] Customize settings

### Advanced Features

**Optional Training:**

- [ ] Product Template Manager
- [ ] BOM Assembly Builder
- [ ] Margin Calculator
- [ ] FLA Calculator
- [ ] Number Generator
- [ ] Project Manager

---

## 🔍 Troubleshooting Deployment Issues

### Common Problems & Solutions

#### "Cannot connect to database"
```
Error: Failed to connect to SQLite database
```
**Solutions:**
1. Verify NAS access: `Test-Path "\\NAS\updates\latest"`
2. Check environment variable: `echo $env:CTH_RUNTIME_ROOT`
3. Restart PowerShell and re-run setup script
4. Contact IT if NAS is down

#### "Permission denied" on export
```
Error: Access denied when writing file
```
**Solutions:**
1. Check export folder permissions
2. Set export location to user Documents folder temporarily
3. Contact IT for network share permissions

#### "Components not loading"
```
Error: No components found in database
```
**Solutions:**
1. Verify database file exists: `\\NAS\updates\latest\server\craft_tools.db`
2. Check database size (> 10MB indicates data present)
3. Restart application
4. Contact IT if database is corrupted

#### "Setup script fails"
```
Error: Execution Policy prevents running script
```
**Solutions:**
1. Run PowerShell as Administrator
2. Execute: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Re-run setup script
4. Or run: `powershell -ExecutionPolicy Bypass -File .\Set-CTHRuntimeRoot.ps1`

---

## 📊 Monitoring & Maintenance

### Daily Checks

**IT/Admin Tasks:**
- [ ] Verify NAS share is accessible
- [ ] Check database file size hasn't changed unexpectedly
- [ ] Monitor export folder for new files
- [ ] Review error logs if reported

### Weekly Maintenance

**IT/Admin Tasks:**
- [ ] Backup database file
- [ ] Check for Windows updates on user machines
- [ ] Verify network connectivity
- [ ] Update component prices if needed

### Monthly Reviews

**IT/Admin Tasks:**
- [ ] Review user feedback
- [ ] Check export folder size
- [ ] Verify all users can access latest version
- [ ] Plan component database updates

---

## 📞 Support & Escalation

### User Support Levels

**Level 1 - Self-Service:**
- Check this guide
- Review `USER_GUIDE.md`
- Test basic functionality

**Level 2 - Team Lead:**
- Verify setup script ran correctly
- Check environment variables
- Test network access

**Level 3 - IT Support:**
- Database connectivity issues
- Permission problems
- Network configuration
- Software updates

### Contact Information

**For Technical Issues:**
- IT Support: [IT Email/Phone]
- Database Issues: [DB Admin Contact]
- Network Access: [Network Admin]

**Escalation Path:**
1. Try troubleshooting steps in this guide
2. Contact team lead
3. Escalate to IT if unresolved within 1 hour

---

## ✅ Success Criteria

### Deployment Complete When:

- [ ] All team members can launch app successfully
- [ ] Component database shows 1,335+ items
- [ ] Global search (Ctrl+K) works across all components
- [ ] Users can create and export quotes
- [ ] Import functionality works with CSV files
- [ ] No connection errors in application
- [ ] Settings save correctly
- [ ] Export operations complete successfully

### User Adoption Metrics:

- [ ] 100% of users can access component database
- [ ] 100% of users can perform basic quoting
- [ ] 80% of users regularly use global search
- [ ] 50% of users customize their dashboard

---

## 🔄 Update Process

### Minor Updates (Bug fixes)
1. Deploy new files to `\\NAS\updates\latest\`
2. Users restart app to get updates
3. No additional setup required

### Major Updates (New features)
1. Backup current database
2. Deploy new version to test folder first
3. Test with select users
4. Update all users when stable
5. Update documentation

### Database Updates
1. Export current data as backup
2. Apply schema changes if needed
3. Import updated component data
4. Test with all users
5. Roll back if issues found

---

## 📈 Scaling Considerations

### Adding New Users
- No additional software installation required
- Just run setup script and verify access
- Training: 30 minutes per user

### Performance Monitoring
- Monitor database response times
- Check export folder growth
- Review user adoption metrics
- Plan for database size increases

### Future Enhancements
- Consider user-specific settings in database
- Implement audit logging for changes
- Add automated backup scripts
- Create user analytics dashboard

---

## 📚 Additional Resources

### Documentation
- `USER_GUIDE.md` - Complete user manual
- `DEPLOYMENT_GUIDE.md` - Technical deployment details
- `QUICK_START.md` - Basic setup instructions
- `TROUBLESHOOTING.md` - Common issues and fixes

### Templates
- `BOM_IMPORT_TEMPLATE.csv` - For component imports
- `COMPONENT PRICE LIST [MASTER].csv` - Master price list

### Scripts
- `Set-CTHRuntimeRoot.ps1` - User setup script
- `publish-to-nas.ps1` - Deployment automation

---

**Deployment Checklist Complete** ✅

*This guide ensures your team has full access to Craft Tools Hub's powerful quoting, import/export, and component management capabilities.*

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Target Users**: Craft Automation Sales Team  
**Database**: SQLite with 1,335+ shared components