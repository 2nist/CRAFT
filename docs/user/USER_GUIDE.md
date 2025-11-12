# 🛠️ Craft Tools Hub - User Guide

Welcome to Craft Tools Hub! This guide will help you navigate and use all the powerful tools available in the application.

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Plugin Tools](#plugin-tools)
4. [Component Management](#component-management)
5. [Import/Export Features](#importexport-features)
6. [Settings & Customization](#settings--customization)
7. [Tips & Shortcuts](#tips--shortcuts)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Getting Started

### Launching the App

**For Teams (NAS Deployment):**
1. Run the setup script: `\\NAS\updates\latest\Set-CTHRuntimeRoot.ps1`
2. Launch: `\\NAS\updates\latest\run-app.bat`
3. App connects to shared SQLite database with 1,335+ components

**For Individual Use:**
1. Double-click `run-app.bat` to start the application
2. Wait for the **splash screen** (with animated spinner)
3. The app will open to the **Dashboard** automatically

### First Time Setup

1. Navigate to **Settings** (⚙️ icon in sidebar)
2. Configure your preferences:
   - **Display**: Choose Compact or Expanded card layout
   - **Export**: Set default export location and format
   - **Links**: Add frequently used websites
   - **Documents**: Add important document links

---

## 🏠 Dashboard Overview

The Dashboard is your home base with quick access to everything you need.

### Dashboard Sections

#### 📊 Recent Quotes
- View your 5 most recent quotes
- Click any quote to open it
- Shows: Project name, Quote ID, and Customer

#### 📁 Document Hub
- Quick access to important documents
- Default documents:
  - Marketing Brochure
  - Standard SOP
  - UL508A Guide
- Click any document icon to open (opens in browser/PDF viewer)

#### 🔗 Useful Links
- Quick access to websites you use frequently
- Customize in Settings → Links tab
- Opens links in your default browser

### Welcome Message
- Displays your custom welcome message
- Shows Craft Automation logo
- Can be customized or hidden in Settings → Layout

---

## 🔧 Plugin Tools

Access any plugin tool from the **left sidebar** or **top tabs**.

### 1️⃣ Quote Configurator

**Purpose**: Build custom quotes for brewery and distillery projects

**How to Use**:
1. Click **Quote Configurator** in sidebar
2. Fill out the **6-step wizard**:
   - **Step 1**: Quote Information (ID, customer, dates)
   - **Step 2**: Product Selection (choose from template)
   - **Step 3**: Component Configuration (add line items)
   - **Step 4**: Pricing & Costs (materials, labor, shipping)
   - **Step 5**: Terms & Conditions (payment, delivery)
   - **Step 6**: Review & Export (preview and save)

**Tips**:
- Use **Product Template Manager** to create templates first
- Search for components using **Ctrl+K** global search
- Save quotes at any step
- Export to PDF or CSV when complete

---

### 2️⃣ Product Template Manager

**Purpose**: Manage product templates organized by category

**Product Categories** (with custom icons):
- 🍺 **Brewery** (100-149): Brewhouse, Brite Tanks, Unitanks
- 🍸 **Distillery** (150-199): Pot Stills, Column Stills, Spirit Vessels
- 🍷 **Fermentation** (200-249): Fermenters, Glycol Systems, Valves
- 🌾 **Grain** (250-299): Grain Handling, Milling, Storage
- ⚙️ **Motor Control** (300-349): Drives, Soft Starters, Motors
- 🎯 **Pneumatics** (400-449): Valves, Actuators, Regulators
- 💧 **Sanitary** (450-499): CIP Systems, Pumps, Fittings
- 📡 **Remote** (500-549): HMI, SCADA, PLCs
- 🔥 **Heating** (550-599): Heat Exchangers, Boilers
- 📦 **General** (990-999): Misc Components

**How to Use**:
1. Click **Product Template Manager**
2. **Category View**: See all 10 categories with:
   - Number of products in category
   - Available product numbers
   - Configuration progress bar
3. Click a **category** to view products
4. Select **available number** from dropdown
5. Click **Create**, **Edit**, or **View** any product

**Product Number Ranges**:
- Each category has a dedicated range (shown above)
- Available numbers show in green dropdown
- Unavailable/used numbers are hidden

---

### 3️⃣ Component Manager

**Purpose**: Manage the master component database

**Features**:
- **View all components**: Browse 1,335+ components from shared database
- **Add new components**: Create custom component entries
- **Edit existing**: Update prices, descriptions, specs
- **Delete components**: Remove obsolete items
- **Import/Export**: Bulk operations via CSV

**Component Fields**:
- SKU (unique identifier)
- Description
- Category
- Manufacturer/Vendor
- Price
- Quantity
- Part Abbreviation

**Quick Actions**:
- Use **Ctrl+K** to search components globally
- Export filtered lists to CSV
- Import from Excel/CSV templates

---

## 📊 Component Management

### Shared Database System

**How it works:**
- **Shared SQLite Database**: All users access the same component database
- **1,335+ Components**: Pre-loaded with brewery/distillery components
- **Automatic Updates**: IT manages database updates via NAS
- **No Sync Issues**: Everyone sees the same prices and components

### Component Search & Discovery

**Global Search (Ctrl+K)** - Most powerful feature:
1. Press **Ctrl+K** anywhere in the app
2. Search across all 1,335+ components instantly
3. Search by SKU, description, category, or manufacturer
4. View component details and specifications
5. Access manufacturer manuals automatically
6. Add components to quotes with one click

### Manual System

**Smart Manual Lookup:**
- Click "View Manual" on any component
- System automatically finds manufacturer documentation
- Supported: Allen Bradley, Siemens, Schneider, ABB, Endress+Hauser, Festo
- Manuals cached for instant access on repeat visits
- Self-building library - grows as you use it

### Import/Export Operations

**Component Updates:**
- **CSV Import**: Update pricing and add new components
- **Smart Merge**: Updates existing components without overwriting custom fields
- **Bulk Operations**: Handle thousands of components efficiently

---

## 📥📤 Import/Export Features

### Component Data
- **Import**: CSV files for price updates and new components
- **Export**: Component lists filtered by category/vendor
- **Sync**: Automatic synchronization across team

### Quote Management
- **Export**: Individual quotes to PDF or CSV
- **Import**: Quote templates and configurations
- **Backup**: Automatic snapshots with timestamps

### BOM Operations
- **Import**: CSV files with assembly mappings
- **Export**: Organized BOMs with categories
- **Templates**: Pre-formatted import templates available

### Reporting & Logs
- **Number Logs**: All generated quote/project numbers
- **Margin Logs**: Cost calculation history
- **Activity Logs**: User actions and system events

---

## ⚙️ Settings & Customization

Access Settings via the **⚙️ icon** in the left sidebar.

### Layout Settings

**Welcome Message**:
- Show/hide welcome message
- Show/hide Craft logo
- Custom title text
- Custom subtitle text

**Dashboard Widgets**:
- ✓ Show Recent Quotes
- ✓ Show Document Hub
- ✓ Show Useful Links

**Card Display**:
- **Compact**: Smaller cards, more on screen
- **Expanded**: Larger cards, easier to read

### Export Settings

**Default Export Location**:
- Click **Browse** to select folder
- All exports go here by default
- Can override per export

**Default Export Format**:
- CSV (Excel compatible)
- Excel (.xlsx)
- PDF (formatted quote)

**Timestamp Options**:
- ✓ Include timestamp in filename
- Format: `BOM_2025-11-06T14-30-00.csv`

### Useful Links

**Add Custom Links**:
1. Click **+ Add Link**
2. Enter **Title** (e.g., "Google Drive")
3. Enter **URL** (e.g., https://drive.google.com)
4. Select **Icon** (from Lucide icons)
5. Click **Save**

**Default Links**:
- Component Database
- External Link Reference
- Hard Drive Backup
- Database Docs

### Document Hub

**Add Documents**:
1. Click **+ Add Document**
2. Enter **Title** (e.g., "Safety Manual")
3. Enter **Path** (file path or URL)
4. Select **Icon**
5. Click **Save**

**Supported Types**:
- PDF files
- Word documents
- Web links
- Network drives

---

## ⌨️ Tips & Shortcuts

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open Global Component Search |
| `Esc` | Close modals/search |
| `Tab` | Navigate between fields |
| `Enter` | Submit search/forms |

### Global Component Search (Ctrl+K)

**Most Powerful Feature!**
1. Press **Ctrl+K** anywhere in the app
2. Type to search across **all 1,335+ components**
3. Search by:
   - SKU
   - Description
   - Category
   - Manufacturer
   - Part Abbreviation
4. Click result to **view component details**
5. Click **Use Component** to auto-fill into active form
6. Click **View Manual** to access component documentation

**Search Tips**:
- Search is **case-insensitive**
- Partial matches work (type "relay" finds "Safety Relay")
- Results update **as you type**
- Shows **100 most relevant** results
- **Drag and resize** the search window
- Press **ESC** to close search

**Component Details Dialog**:
- View full component specifications
- **Copy Data**: Copy component info to clipboard
- **View Manual**: Smart manual lookup (see below)
- **Use Component**: Insert into active quote/form

**Smart Manual System** 🎯:
1. Click **View Manual** on any component
2. System checks if manual is already cached
3. If cached: Opens manual instantly
4. If not cached:
   - Automatically searches manufacturer website
   - Opens browser with search results
   - Prompts you to confirm if correct manual
   - Click **Save Reference** to cache for next time
5. Next time: Opens directly (zero wait!)

**Supported Manufacturers**:
- Allen Bradley / Rockwell Automation
- Siemens
- Schneider Electric
- ABB
- Endress+Hauser
- Festo
- Others (via Google search)

---

## 🔍 Troubleshooting

### Common Issues

#### "Cannot connect to database"
- **Solution**: Check network connection to NAS
- Verify environment variable: `echo $env:CTH_RUNTIME_ROOT`
- Contact IT if NAS is unavailable

#### "Component not found"
- **Solution**: Use Ctrl+K to search global database
- Check spelling and SKU format
- Component might be in different category

#### "Settings not saving"
- **Solution**: Settings save automatically
- Check: `%APPDATA%\electron-vite-react-app\data\`
- If missing, app will recreate defaults

#### "Export failed"
- **Solution**: Check export folder exists
- Verify write permissions
- Close any open Excel/PDF files with same name

#### "App doesn't show latest components"
- **Solution**: Components are in shared database on NAS
- Contact IT to update component database
- Restart app to refresh connection

### Data Locations

**Shared Database (NAS)**:
```
\\NAS\updates\latest\server\craft_tools.db
└── 1,335+ components, prices, specifications
```

**User Data (Local)**:
```
%APPDATA%\electron-vite-react-app\data\
├── quotes\           # Your saved quotes
├── settings.json     # Your preferences
├── manual_index.json # Cached manual links
└── OUTPUT\LOGS\      # Your activity logs
```

**Export Location**:
- Configurable in Settings
- Default: Your Documents folder
- Can be set to network share

### Getting Help

1. Check this guide first
2. See `QUICK_START.md` for setup instructions
3. See `DATABASE_USER_GUIDE.md` for database questions
4. Check specific guides:
   - `BOM_IMPORTER_GUIDE.md`
   - `GLOBAL_COMPONENT_SEARCH.md`

---

## 📚 Additional Resources

### Quick Start Guides
- **Setup**: `QUICK_START.md`
- **Database**: `DATABASE_USER_GUIDE.md`
- **BOM Import**: `BOM_IMPORTER_GUIDE.md`
- **Deployment**: `DEPLOYMENT_GUIDE.md`

### Templates
- **BOM Import**: `BOM_IMPORT_TEMPLATE.csv`
- **Component Database**: `COMPONENT PRICE LIST [MASTER].csv`

### Development
- **Build App**: `build-app.bat`
- **Run Dev**: `npm run electron:dev`
- **API Server**: `server/server.js` (port 3001)

---

## 🎯 Best Practices

### Workflow Recommendations

1. **Start with Product Templates**
   - Define all products in Product Template Manager
   - Organize by category
   - Complete configurations before quoting

2. **Use Global Search**
   - Press Ctrl+K frequently
   - Faster than manual entry
   - Reduces errors

3. **Save Often**
   - Quotes auto-save on step changes
   - Manual save recommended for large changes
   - Export backups regularly

4. **Organize Components**
   - Use consistent SKU formats
   - Complete all fields (category, manufacturer)
   - Keep descriptions clear and searchable

5. **Customize Your Dashboard**
   - Add your most-used links
   - Hide widgets you don't need
   - Choose display style that fits your workflow

---

## 🔄 Updates & Maintenance

### Component Database Updates

**For IT/Admin:**
1. Update CSV file with new pricing/components
2. Run database migration script
3. Deploy updated database to NAS
4. Users get updates automatically

**For Users:**
- Database updates happen automatically via NAS
- No action required on your part
- Restart app if you don't see changes immediately

### Backing Up Your Work

**Recommended backup locations**:
- Quotes: `%APPDATA%\electron-vite-react-app\data\quotes\`
- Settings: `%APPDATA%\electron-vite-react-app\data\settings.json`
- Exports: Your chosen export folder

**Backup Frequency**:
- Daily: Export important quotes
- Weekly: Check your quotes folder
- Monthly: Backup settings if heavily customized

---

## 💡 Pro Tips

1. **Dual Monitors**: Open search (Ctrl+K) on second screen while working
2. **Templates**: Create product templates for repeat customers
3. **Categories**: Use assembly categories to organize complex BOMs
4. **Export Settings**: Set default location to shared network drive
5. **Custom Links**: Add customer portals and supplier sites
6. **Search**: Type part of description, don't need exact match
7. **Keyboard**: Use Tab to navigate forms quickly
8. **Database**: All components are shared - no need to maintain separate lists

---

## 📞 Support

For technical issues or questions:
- Check troubleshooting section above
- Review relevant documentation files
- Check GitHub repository: `github.com/2nist/craft_tools_hub`
- Contact IT for database or deployment issues

---

**Version**: 1.0.0  
**Last Updated**: November 2025  
**Database**: SQLite with 1,335+ components  
**Built for**: Craft Automation Sales Team

---

*Happy Quoting! 🍺⚙️*
- 🌾 **Grain** (250-299): Grain Handling, Milling, Storage
- ⚙️ **Motor Control** (300-349): Drives, Soft Starters, Motors
- 🎯 **Pneumatics** (400-449): Valves, Actuators, Regulators
- 💧 **Sanitary** (450-499): CIP Systems, Pumps, Fittings
- 📡 **Remote** (500-549): HMI, SCADA, PLCs
- 🔥 **Heating** (550-599): Heat Exchangers, Boilers
- 📦 **General** (990-999): Misc Components

**How to Use**:
1. Click **Product Template Manager**
2. **Category View**: See all 10 categories with:
   - Number of products in category
   - Available product numbers
   - Configuration progress bar
3. Click a **category** to view products
4. Select **available number** from dropdown
5. Click **Create**, **Edit**, or **View** any product

**Product Number Ranges**:
- Each category has a dedicated range (shown above)
- Available numbers show in green dropdown
- Unavailable/used numbers are hidden

---

### 3️⃣ Component Manager

**Purpose**: Manage the master component database

**Features**:
- **View all components**: Browse 1000+ components
- **Add new components**: Create custom component entries
- **Edit existing**: Update prices, descriptions, specs
- **Delete components**: Remove obsolete items
- **Import/Export**: Bulk operations via CSV

**Component Fields**:
- SKU (unique identifier)
- Description
- Category
- Manufacturer/Vendor
- Price
- Quantity
- Part Abbreviation

**Quick Actions**:
- Use **Ctrl+K** to search components globally
- Export filtered lists to CSV
- Import from Excel/CSV templates

---

### 4️⃣ Manual BOM Builder

**Purpose**: Create Bills of Materials (BOMs) manually

**How to Use**:
1. Click **Manual BOM Builder**
2. Enter **BOM Name** and **Description**
3. **Add Line Items**:
   - Use Component Search (Ctrl+K)
   - Or enter manually (SKU, Description, Qty, Price)
4. Configure **Assembly Categories**:
   - Assign components to assembly groups
   - Set category abbreviations
5. **Calculate Totals** automatically
6. **Export** to CSV with timestamp

**Assembly Categories**:
- Brewhouse (BH)
- Cellar (CL)
- Packaging (PK)
- Utilities (UT)
- Controls (CT)
- CIP (CP)
- Custom categories supported

---

### 5️⃣ BOM Panel Builder

**Purpose**: Import and organize BOMs from spreadsheets

**How to Use**:
1. Prepare CSV file using template
2. Click **BOM Panel Builder**
3. **Import CSV**: Select your file
4. **Review** imported data
5. **Map** assembly categories
6. **Assign** panel numbers
7. **Export** organized BOM

**Template Fields**:
- Item #
- Description
- Manufacturer
- Part Number
- Quantity
- Unit Price
- Assembly Category

**Download Template**: Use `BOM_IMPORT_TEMPLATE.csv` in project root

---

### 6️⃣ Assembly Manager

**Purpose**: Manage assembly definitions and categories

**Features**:
- Create assembly groups
- Assign components to assemblies
- Set assembly abbreviations (2-3 letters)
- Track assembly costs
- Generate assembly-specific BOMs

**Common Assemblies**:
- BH: Brewhouse
- CL: Cellar/Fermentation
- PK: Packaging Line
- UT: Utilities (glycol, air, water)
- CT: Controls/Automation
- CP: CIP System

---

### 7️⃣ Project Manager

**Purpose**: Track multiple projects and their quotes

**Features**:
- View all active projects
- Link quotes to projects
- Track project status
- Manage customer information
- Timeline view
- Budget tracking

**Project Lifecycle**:
1. **New**: Just created
2. **Quoting**: Building quote
3. **Submitted**: Quote sent to customer
4. **Won**: Customer accepted
5. **In Progress**: Build phase
6. **Completed**: Delivered

---

### 8️⃣ FLA Calculator

**Purpose**: Calculate Full Load Amperage for electrical systems

**How to Use**:
1. Select **Voltage** (120V, 208V, 240V, 480V, 600V)
2. Select **Phase** (Single or Three Phase)
3. Enter **Horsepower** or **kW**
4. Calculator shows:
   - FLA (Full Load Amps)
   - Recommended wire size
   - Recommended breaker size
   - Conduit size

**Common Motor Sizes**:
- 0.5 HP to 500 HP
- NEC Table 430.250 reference
- Includes safety factors

---

### 9️⃣ Margin Calculator

**Purpose**: Calculate profit margins and pricing

**How to Use**:
1. Enter **Cost** (your total cost)
2. Enter **Sell Price** (what you'll charge)
3. Calculator shows:
   - Gross Margin ($)
   - Margin %
   - Markup %
4. Or enter desired **Margin %** to calculate sell price

**Formulas**:
- Margin % = (Sell - Cost) / Sell × 100
- Markup % = (Sell - Cost) / Cost × 100

---

### 🔟 Number Generator

**Purpose**: Generate unique quote/project numbers

**Features**:
- Auto-increment numbering
- Custom prefixes (CRAFT-, Q-, etc.)
- Year-based formatting (2025-001)
- Format templates
- Check for duplicates

**Common Formats**:
- `CRAFT-2025-001`
- `Q-20251106-001`
- `PRJ-12345`

---

## ⚙️ Settings & Customization

Access Settings via the **⚙️ icon** in the left sidebar.

### Layout Settings

**Welcome Message**:
- Show/hide welcome message
- Show/hide Craft logo
- Custom title text
- Custom subtitle text

**Dashboard Widgets**:
- ✓ Show Recent Quotes
- ✓ Show Document Hub
- ✓ Show Useful Links

**Card Display**:
- **Compact**: Smaller cards, more on screen
- **Expanded**: Larger cards, easier to read

### Export Settings

**Default Export Location**:
- Click **Browse** to select folder
- All exports go here by default
- Can override per export

**Default Export Format**:
- CSV (Excel compatible)
- Excel (.xlsx)
- PDF (formatted quote)

**Timestamp Options**:
- ✓ Include timestamp in filename
- Format: `BOM_2025-11-06T14-30-00.csv`

### Useful Links

**Add Custom Links**:
1. Click **+ Add Link**
2. Enter **Title** (e.g., "Google Drive")
3. Enter **URL** (e.g., https://drive.google.com)
4. Select **Icon** (from Lucide icons)
5. Click **Save**

**Default Links**:
- Component Database
- External Link Reference
- Hard Drive Backup
- Database Docs

### Document Hub

**Add Documents**:
1. Click **+ Add Document**
2. Enter **Title** (e.g., "Safety Manual")
3. Enter **Path** (file path or URL)
4. Select **Icon**
5. Click **Save**

**Supported Types**:
- PDF files
- Word documents
- Web links
- Network drives

---

## ⌨️ Tips & Shortcuts

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open Global Component Search |
| `Esc` | Close modals/search |
| `Tab` | Navigate between fields |
| `Enter` | Submit search/forms |

### Global Component Search (Ctrl+K)

**Most Powerful Feature!**
1. Press **Ctrl+K** anywhere in the app
2. Type to search across **all components**
3. Search by:
   - SKU
   - Description
   - Category
   - Manufacturer
   - Part Abbreviation
4. Click result to **view component details**
5. Click **Use Component** to auto-fill into active form
6. Click **View Manual** to access component documentation

**Search Tips**:
- Search is **case-insensitive**
- Partial matches work (type "relay" finds "Safety Relay")
- Results update **as you type**
- Shows **100 most relevant** results
- **Drag and resize** the search window
- Press **ESC** to close search

**Component Details Dialog**:
- View full component specifications
- **Copy Data**: Copy component info to clipboard
- **View Manual**: Smart manual lookup (see below)
- **Use Component**: Insert into active form

**Smart Manual System** 🎯:
1. Click **View Manual** on any component
2. System checks if manual is already cached
3. If cached: Opens manual instantly
4. If not cached:
   - Automatically searches manufacturer website
   - Opens browser with search results
   - Prompts you to confirm if correct manual
   - Click **Save Reference** to cache for next time
5. Next time: Opens directly (zero wait!)

**Supported Manufacturers**:
- Allen Bradley / Rockwell Automation
- Siemens
- Schneider Electric
- ABB
- Endress+Hauser
- Festo
- Others (via Google search)

**Manual Benefits**:
- ✅ No upfront manual collection needed
- ✅ Builds library organically as you use it
- ✅ Self-correcting (you validate each manual)
- ✅ Works immediately with smart search
- ✅ Future: Will download and store PDFs locally

For detailed manual system documentation, see `MANUAL_SYSTEM.md`.

### Quick Navigation

**Sidebar**:
- Click any plugin icon to switch
- Current plugin highlighted in blue
- Tooltips show plugin names

**Top Tabs**:
- Recently opened plugins appear as tabs
- Click ✕ to close tab
- Click tab name to switch

---

## 🔍 Troubleshooting

### Common Issues

#### "Component not found"
- **Solution**: Use Ctrl+K to search global database
- Check spelling and SKU format
- Component might be in different category

#### "Settings not saving"
- **Solution**: Settings save automatically
- Check: `%APPDATA%\electron-vite-react-app\data\`
- If missing, app will recreate defaults

#### "Export failed"
- **Solution**: Check export folder exists
- Verify write permissions
- Close any open Excel/PDF files with same name

#### "Splash screen stuck"
- **Solution**: Wait 10 seconds
- If persists, restart app
- Check electron process in Task Manager

### Data Locations

**User Settings**:
```
%APPDATA%\electron-vite-react-app\data\
├── dashboard_settings.json
├── useful_links.json
└── doc_hub_items.json
```

**Project Data**:
```
Craft_Tools_Hub\src\data\
├── quotes\
├── assemblies.json
├── manual_boms.json
└── project_quote_schema.json
```

**Component Database**:
```
Craft_Tools_Hub\public\
└── COMPONENT PRICE LIST [MASTER].csv
```

### Getting Help

1. Check this guide first
2. See `README.md` for technical details
3. See `QUICK_START.md` for setup instructions
4. Check specific guides:
   - `BOM_IMPORTER_GUIDE.md`
   - `GLOBAL_COMPONENT_SEARCH.md`

---

## 📚 Additional Resources

### Quick Start Guides
- **BOM Import**: See `BOM_IMPORTER_QUICK_START.md`
- **Component Search**: See `GLOBAL_COMPONENT_SEARCH.md`
- **Assembly Mapping**: See `BOM_ASSEMBLY_CATEGORY_MAPPING.md`

### Templates
- **BOM Import**: `BOM_IMPORT_TEMPLATE.csv`
- **Component Database**: `COMPONENT PRICE LIST [MASTER].csv`

### Development
- **Build App**: `build-app.bat`
- **Run Dev**: `npm run electron:dev`
- **Build Electron**: `npm run build`

---

## 🎯 Best Practices

### Workflow Recommendations

1. **Start with Product Templates**
   - Define all products in Product Template Manager
   - Organize by category
   - Complete configurations before quoting

2. **Use Global Search**
   - Press Ctrl+K frequently
   - Faster than manual entry
   - Reduces errors

3. **Save Often**
   - Quotes auto-save on step changes
   - Manual save recommended for large changes
   - Export backups regularly

4. **Organize Components**
   - Use consistent SKU formats
   - Complete all fields (category, manufacturer)
   - Keep descriptions clear and searchable

5. **Customize Your Dashboard**
   - Add your most-used links
   - Hide widgets you don't need
   - Choose display style that fits your workflow

---

## 🔄 Updates & Maintenance

### Updating Component Database

1. Open component CSV in Excel
2. Make changes (add, edit, delete)
3. Save as CSV (UTF-8)
4. Replace file in `public/` folder
5. Restart app to reload

### Backing Up Data

**Recommended backup locations**:
- Settings: `%APPDATA%\electron-vite-react-app\data\`
- Quotes: `Craft_Tools_Hub\src\data\quotes\`
- Components: `Craft_Tools_Hub\public\`
- Exports: Your chosen export folder

**Backup Frequency**:
- Daily: Export folder
- Weekly: User settings
- Monthly: Full app data folder

---

## 💡 Pro Tips

1. **Dual Monitors**: Open search (Ctrl+K) on second screen while working
2. **Templates**: Create product templates for repeat customers
3. **Categories**: Use assembly categories to organize complex BOMs
4. **Export Settings**: Set default location to shared network drive
5. **Custom Links**: Add customer portals and supplier sites
6. **Search**: Type part of description, don't need exact match
7. **Keyboard**: Use Tab to navigate forms quickly
8. **Preview**: Always review quotes in Step 6 before exporting

---

## 📞 Support

For technical issues or questions:
- Check troubleshooting section above
- Review relevant documentation files
- Check GitHub repository: `github.com/2nist/craft_tools_hub`

---

**Version**: 1.0  
**Last Updated**: November 2025  
**Built for**: Craft Automation Sales Team

---

*Happy Quoting! 🍺⚙️*
