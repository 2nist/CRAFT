# Craft Tools Hub - CPQ (Configure, Price, Quote) System

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-28.x-47848F?logo=electron)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)

A comprehensive desktop application for managing quotes, configurations, and pricing for industrial automation projects. Built with Electron, React, and modern web technologies.

## 🚀 Features

### Quote Management
- **Project-Based Workflows** - Organize quotes by projects with full lifecycle management
- **Quote Configurator** - Interactive configuration tool for building complex quotes
- **BOM (Bill of Materials) Management** - Automatic BOM generation and management
- **Pricing Engine** - Dynamic pricing with margin calculations
- **Template System** - Reusable quote templates for common configurations

### Configuration Tools
- **Product Configurator** - Visual configuration tool for control panels and automation systems
- **Component Manager** - Manage assemblies, components, and their relationships
- **Assembly Builder** - Create and manage reusable assemblies
- **Custom Fields** - Flexible field system for industry-specific requirements

### Integration & Sync
- **SQL Database Sync** - Two-way synchronization with external SQL Server databases
- **Pipedrive Integration** - Connect with Pipedrive CRM for deal management
- **Offline-First** - Work offline with automatic sync when connected
- **Conflict Resolution** - Smart conflict detection and resolution UI

### Data Management
- **Customer Database** - Manage customer information and history
- **Project Tracking** - Track quotes through the entire sales cycle
- **Order Management** - Convert quotes to orders with full tracking
- **Number Generation Service** - Automatic unique ID generation for quotes and orders

### User Experience
- **Dark Theme** - Modern dark interface optimized for long work sessions
- **Responsive Design** - Adapts to different screen sizes
- **Plugin Architecture** - Extensible plugin system for custom features
- **Undo/Redo** - Full history tracking with undo/redo support

## 📋 Prerequisites

- **Node.js** 18.x or higher
- **Windows 10/11** (primary platform, Linux/Mac support via Electron)
- **SQL Server** (optional, for database sync features)
- **Git** for version control

## 🛠️ Installation

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/2nist/craft_tools_hub.git
cd craft_tools_hub
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

4. **Run the application**
```bash
npm run electron:dev
```

### Building for Production

```bash
# Build the application
npm run electron:build

# Create distributable package
npm run dist

# Create unpacked directory (for testing)
npm run dist:dir
```

## 📁 Project Structure

```
craft_tools_hub/
├── electron/              # Electron main process
│   ├── main.js           # Main process entry point
│   ├── preload.mjs       # Preload scripts for security
│   └── DatabaseSyncService.js  # SQL sync service
├── src/                  # React frontend source
│   ├── components/       # Reusable React components
│   ├── plugins/          # Feature plugins
│   ├── hooks/            # Custom React hooks
│   ├── services/         # Business logic services
│   └── data/             # Data schemas and templates
├── database/             # SQLite database files
├── server-setup/         # SQL Server API setup
├── scripts/              # Utility scripts
│   ├── build/           # Build automation scripts
│   ├── tests/           # Test files
│   └── migrations/      # Database migration scripts
├── docs/                 # Documentation
│   ├── setup/           # Setup guides
│   ├── deployment/      # Deployment guides
│   ├── database/        # Database documentation
│   └── development/     # Development guides
└── plugins/              # Plugin HTML files
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# SQL Database Configuration (optional)
REMOTE_API_URL=https://your-sql-api.com/api
REMOTE_API_KEY=your-secret-api-key

# Application Settings
NODE_ENV=development
```

### Database Setup

The application uses SQLite for local storage by default. For SQL Server synchronization:

1. See [Database Sync Setup Guide](docs/database/SYNC_QUICK_START.md)
2. Configure your SQL Server API endpoint
3. Set up sync schedules in the application settings

## 📚 Documentation

- **[Database Sync Guide](docs/database/SYNC_IMPLEMENTATION_GUIDE.md)** - Setup SQL synchronization
- **[Deployment Guide](docs/deployment/COWORKER_DEPLOYMENT_GUIDE.md)** - Deploy to production
- **[Development Guide](docs/development/IMPLEMENTATION_ROADMAP.md)** - Contribute to the project
- **[Theme System](docs/development/THEME_SYSTEM_GUIDE.md)** - Customize the UI theme
- **[Build Instructions](docs/development/BUILD_INSTRUCTIONS.md)** - Building the application

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🔌 Plugin System

Craft Tools Hub features an extensible plugin architecture. Built-in plugins include:

- **Hub Dashboard** - Central dashboard for quick access
- **Quote Configurator** - Main quote building interface
- **Project Manager** - Manage quotes and projects
- **Component Manager** - Assembly and component management
- **Number Service** - ID generation service

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- Follow ESLint configuration
- Write tests for new features
- Update documentation as needed
- Use meaningful commit messages

## 🏗️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Desktop**: Electron 28
- **State Management**: React Context + Hooks
- **Database**: SQLite (better-sqlite3), SQL Server (optional)
- **UI Components**: Radix UI, Lucide Icons
- **Testing**: Jest, React Testing Library
- **Build**: electron-builder

## 🐛 Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clean and rebuild
rm -rf node_modules dist dist-electron
npm install
npm run electron:build
```

**Database Issues**
```bash
# Check database health
node scripts/tests/check-db.js
```

**Sync Problems**
- Check network connectivity
- Verify API endpoint configuration
- Review sync settings in application

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License
Copyright (c) 2025 Craft Automation
```

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI powered by [React](https://react.dev/)
- Icons from [Lucide](https://lucide.dev/)
- Components from [Radix UI](https://www.radix-ui.com/)

## 📊 Project Status

**Current Version**: 1.0.0  
**Status**: Active Development  
**Last Updated**: December 2025

---

**Made with ❤️ by the Craft Automation team**
