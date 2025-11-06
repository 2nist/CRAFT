# 🛠️ Craft Tools Hub

**Professional Quote and Project Management System for Brewery & Distillery Automation**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-Latest-brightgreen.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)

---

## 📖 Overview

Craft Tools Hub is a comprehensive desktop application designed for managing quotes, BOMs, components, and projects in the brewery and distillery automation industry. Built with modern web technologies and packaged as a native desktop app.

### ✨ Key Features

- 📊 **Quote Configurator** - 6-step wizard for building detailed quotes
- 🏗️ **Product Template Manager** - 10 product categories with 36+ templates
- 🔍 **Global Component Search** - Instant search across 1000+ components (Ctrl+K)
- �� **BOM Management** - Manual builder and CSV import tools
- ⚡ **FLA Calculator** - Electrical load calculations with NEC references
- 💰 **Margin Calculator** - Instant profit margin and markup calculations
- 🎨 **Customizable Dashboard** - Personalized workflow and quick access
- 🔧 **Assembly Manager** - Organize components by assembly categories

---

## 🚀 Quick Start

### Installation

1. **Download the latest release**
   \\\ash
   # Clone the repository
   git clone https://github.com/2nist/craft_tools_hub.git
   cd craft_tools_hub
   \\\

2. **Install dependencies**
   \\\ash
   npm install
   \\\

3. **Run the application**
   \\\ash
   # Double-click run-app.bat
   # OR
   npm run electron:dev
   \\\

### Building for Production

\\\ash
# Build the Electron app
npm run build

# Package for Windows
npm run electron:build
\\\

Executable will be in \elease/\ folder.

---

## 📚 Documentation

- **[User Guide](USER_GUIDE.md)** - Comprehensive guide for all features
- **[Quick Start](QUICK_START.md)** - Get up and running quickly
- **[BOM Importer Guide](BOM_IMPORTER_GUIDE.md)** - Import BOMs from spreadsheets
- **[Global Search](GLOBAL_COMPONENT_SEARCH.md)** - Using the component search system

---

## 🏗️ Project Structure

\\\
Craft_Tools_Hub/
├── electron/              # Electron main process
│   ├── main.js           # Main process entry point
│   └── preload.mjs       # Preload scripts
├── src/
│   ├── components/       # React components
│   ├── context/          # React context providers
│   ├── data/            # Application data
│   │   ├── quotes/      # Quote storage
│   │   └── assemblies.json
│   ├── plugins/         # Plugin modules
│   │   ├── QuoteConfigurator.jsx
│   │   ├── ProductTemplateManager.jsx
│   │   ├── ComponentManager.jsx
│   │   └── ...
│   ├── services/        # Business logic
│   │   ├── SearchService.js
│   │   └── EventBus.js
│   └── App.jsx          # Root component
├── public/              # Static assets
│   └── COMPONENT PRICE LIST [MASTER].csv
├── ARCHIVE/             # Archived development files
├── build-app.bat        # Build script
├── run-app.bat          # Launch script
└── package.json
\\\

---

## 🎯 Product Categories

The system organizes products into 10 specialized categories:

| Category | Range | Icon | Products |
|----------|-------|------|----------|
| **Brewery** | 100-149 | 🍺 | Brewhouse, Brite Tanks, Unitanks |
| **Distillery** | 150-199 | 🍸 | Stills, Spirit Vessels, Columns |
| **Fermentation** | 200-249 | 🍷 | Fermenters, Glycol, Valves |
| **Grain** | 250-299 | 🌾 | Milling, Handling, Storage |
| **Motor Control** | 300-349 | ⚙️ | VFDs, Soft Starters, Motors |
| **Pneumatics** | 400-449 | 🎯 | Valves, Actuators, Regulators |
| **Sanitary** | 450-499 | 💧 | CIP, Pumps, Fittings |
| **Remote** | 500-549 | 📡 | HMI, SCADA, PLCs |
| **Heating** | 550-599 | 🔥 | Heat Exchangers, Boilers |
| **General** | 990-999 | 📦 | Miscellaneous |

---

## �� Technology Stack

### Frontend
- **React 18** - UI framework
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Backend
- **Electron** - Desktop app framework
- **Node.js** - Runtime
- **Vite** - Build tool & dev server

### Data Management
- **JSON** - Data storage
- **CSV** - Component database & exports
- **Local File System** - Quote persistence

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \Ctrl+K\ | Open Global Component Search |
| \Esc\ | Close modals/dialogs |
| \Tab\ | Navigate form fields |
| \Enter\ | Submit forms/search |

---

## 🎨 Customization

### Settings Location
User settings are stored in:
\\\
%APPDATA%\\electron-vite-react-app\\data\\
├── dashboard_settings.json
├── useful_links.json
└── doc_hub_items.json
\\\

### Customizable Elements
- Dashboard layout and widgets
- Useful links sidebar
- Document hub items
- Export preferences
- Display style (compact/expanded)

---

## �� Data Files

### Component Database
\\\
public/COMPONENT PRICE LIST [MASTER].csv
\\\
Contains 1000+ components with:
- SKU
- Description
- Category
- Manufacturer
- Price
- Quantity

### Quote Schema
\\\
src/data/quotes/project_quote_schema.json
\\\
Defines all 36 product templates across 10 categories.

---

## 🤝 Contributing

This is a private repository for Craft Automation. For internal contributions:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit for review

---

## 📝 Version History

### v1.0.0 - November 2025
- ✅ Enhanced Product Template Manager with categories
- ✅ Global Component Search (Ctrl+K)
- ✅ Custom category icons
- ✅ Settings persistence improvements
- ✅ Splash screen on startup
- ✅ Simplified settings interface
- ✅ Quote Configurator reset to clean state

---

## 🔒 License

Copyright © 2025 Craft Automation. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## 📞 Support

For questions or support:
- **Internal Wiki**: [Link to internal documentation]
- **Repository**: github.com/2nist/craft_tools_hub
- **Contact**: Craft Automation Sales Team

---

## 🙏 Acknowledgments

Built with ❤️ by the Craft Automation team for streamlining brewery and distillery automation projects.

**Tech Stack Credits**:
- Electron - Desktop app framework
- React - UI library
- Tailwind CSS - Styling
- Lucide - Icon library
- Vite - Build tooling

---

*Making brewery and distillery automation quotes easier, one click at a time.* 🍺⚙️
