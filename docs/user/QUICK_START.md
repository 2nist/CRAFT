# Craft Tools Hub - Quick Start Guide

## For Testers/Coworkers

### Prerequisites
- Windows 10/11
- Network access to NAS (if using shared deployment)
- No additional software installation required

### Quick Start Options

#### Option 1: Run from NAS (Recommended for Teams)

**If your IT has deployed to NAS:**

1. **Set Environment Variable** (one-time setup):
   ```powershell
   # Run the setup script from NAS
   \\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime\Set-CTHRuntimeRoot.ps1
   ```

2. **Launch App**:
   ```
   \\192.168.1.99\CraftAuto-Sales\Temp_Craft_Tools_Runtime\updates\latest\run-app.bat
   ```
   Or create a desktop shortcut to this location.

**What happens on first launch:**
- ✅ Connects to shared SQLite database (1,335+ components)
- ✅ Loads component pricing and catalog data
- ✅ Creates local user data folder for your quotes/projects
- ✅ Ready to use with full component database

**Advantages:**
- ✅ No local installation needed
- ✅ Always get latest version automatically
- ✅ Shared component database (no sync issues)
- ✅ IT manages updates and database
- ✅ All users see same component prices

#### Option 2: Local Development/Testing

**For developers or standalone testing:**

**Option A: Double-click to run**
1. Double-click `run-app.bat`
2. The app will:
   - Install dependencies (first time only)
   - Start API server on port 3001
   - Start Electron app
   - Open automatically with DevTools

**Option B: Build and package**
1. Double-click `build-app.bat` to build the app
2. Run `npx electron-builder` to create the installer
3. Find the installer in the `release/` folder

### Key Features Available

#### 📊 Component Management
- **1,335+ Components** in shared database
- **Global Search** (Ctrl+K) - Find any component instantly
- **Category Filtering** - Browse by Pumps, Valves, Sensors, etc.
- **Price Updates** - Import latest pricing via CSV
- **Manual Links** - View component documentation

#### 💰 Quote Configuration
- **6-Step Wizard** - Complete quote setup
- **Product Templates** - Pre-configured brewery/distillery setups
- **BOM Generation** - Automatic operational items
- **Cost Calculation** - Materials, labor, margins
- **PDF/CSV Export** - Professional quote documents

#### 🛠️ Calculator Tools
- **FLA Calculator** - Full load amp calculations
- **Margin Calculator** - Profit margin analysis
- **Number Generators** - Quote and project numbering

### Troubleshooting

**"Cannot connect to database"**
- Check network connection to NAS
- Verify environment variable is set: `echo $env:CTH_RUNTIME_ROOT`
- Contact IT if NAS is unavailable

**"npm is not recognized"** (for local development)
- Node.js is not installed or not in your PATH
- Install from: https://nodejs.org/

**"Port 3001 already in use"**
- Another instance is running
- Close other Craft Tools Hub windows or restart computer

**"App doesn't show latest components"**
- The app uses shared database on NAS
- Contact IT to update component database
- Local user data remains in: `%APPDATA%\electron-vite-react-app\data`

### Data Files Location

**Shared Database (on NAS):**
- Components: `\\NAS\updates\latest\server\craft_tools.db`
- Pricelist: `\\NAS\updates\latest\public\COMPONENT PRICE LIST [MASTER].csv`

**User Data (local):**
- Quotes: `%APPDATA%\electron-vite-react-app\data\quotes\`
- Projects: `%APPDATA%\electron-vite-react-app\data\projects.json`
- Settings: `%APPDATA%\electron-vite-react-app\data\settings.json`
- Manual Links: `%APPDATA%\electron-vite-react-app\data\manual_index.json`

**Logs (local):**
- Quote Numbers: `%APPDATA%\electron-vite-react-app\data\OUTPUT\LOGS\QuoteNumbers.csv`
- Project Numbers: `%APPDATA%\electron-vite-react-app\data\OUTPUT\LOGS\ProjectNumbers.csv`
- Margin Calculations: `%APPDATA%\electron-vite-react-app\data\OUTPUT\LOGS\Margin.csv`

### Import/Export Capabilities

#### Component Data
- **Import**: CSV files with pricing updates
- **Export**: Component lists by category
- **Sync**: Smart merge with existing database

#### Quotes & Projects
- **Export**: Individual quotes to PDF/CSV
- **Import**: Quote templates and configurations
- **Backup**: Automatic snapshots on save

#### Reports & Logs
- **Number Logs**: All generated quote/project numbers
- **Margin Logs**: Cost calculation history
- **Activity Logs**: User actions and system events

### For Developers
See the main README.md for full development documentation.
