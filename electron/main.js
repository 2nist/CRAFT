import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import fs from 'fs/promises'
import fssync from 'fs'
import Ajv from 'ajv'
import Papa from 'papaparse'

// Server imports for embedded server
import express from 'express'
import cors from 'cors'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

// Note: Services are imported dynamically in IPC handlers to handle ES module resolution
// This avoids import errors in development mode when Electron may not resolve paths correctly

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize runtime configuration
let runtimeConfigLoaded = false;
let packagedRuntimeRoot = null;
let networkCredentials = null; // Store network credentials in memory

async function loadRuntimeConfig() {
  try {
    // Try to load runtime config from the packaged app directory
    const configPath = path.join(process.resourcesPath, 'runtime-config.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);
    console.log('Loaded runtime config:', config);
    return config.runtimeRoot || null;
  } catch (err) {
    console.log('No runtime config found or error loading:', err.message);
    return null;
  }
}

async function initializeRuntimeConfig() {
  if (!runtimeConfigLoaded) {
    packagedRuntimeRoot = await loadRuntimeConfig();
    runtimeConfigLoaded = true;
  }
  return packagedRuntimeRoot;
}

// Load network credentials from Windows Credential Manager
async function loadNetworkCredentials() {
  try {
    const { execSync } = await import('child_process');
    const output = execSync('cmdkey /list:target:"CraftAuto-Sales"', { encoding: 'utf8' });
    const lines = output.split('\n');
    const targetLine = lines.find(line => line.includes('Target: CraftAuto-Sales'));
    if (targetLine) {
      // Credentials exist, try to extract username
      const userMatch = output.match(/User: ([^\r\n]+)/);
      if (userMatch) {
        return { username: userMatch[1].trim() };
      }
    }
  } catch (err) {
    // Credentials don't exist or cmdkey failed
    console.log('No stored network credentials found');
  }
  return null;
}

// Save network credentials to Windows Credential Manager
async function saveNetworkCredentials(username, password) {
  try {
    const { execSync } = await import('child_process');
    // Delete existing credentials first
    try {
      execSync('cmdkey /delete:CraftAuto-Sales', { stdio: 'ignore' });
    } catch (e) {
      // Ignore if no existing credentials
    }
    // Add new credentials
    execSync(`cmdkey /add:CraftAuto-Sales /user:${username} /pass:${password}`);
    console.log('Network credentials saved to Windows Credential Manager');
    return true;
  } catch (err) {
    console.error('Failed to save network credentials:', err);
    return false;
  }
}

// Test network connection with credentials
async function testNetworkConnection(username, password) {
  try {
    const { execSync } = await import('child_process');
    // Temporarily map the drive to test credentials
    execSync(`net use Z: "\\\\192.168.1.99\\CraftAuto-Sales" /user:${username} /pass:${password} /persistent:no`, { timeout: 10000 });
    // If successful, unmap the test drive
    try {
      execSync('net use Z: /delete /y');
    } catch (e) {
      // Ignore unmap errors
    }
    return true;
  } catch (err) {
    console.error('Network connection test failed:', err.message);
    return false;
  }
}

// Prompt user for network credentials
async function promptForNetworkCredentials(mainWindow) {
  return new Promise((resolve) => {
    // Create a modal dialog for credential input
    const credentialDialog = new BrowserWindow({
      parent: mainWindow,
      modal: true,
      show: false,
      width: 400,
      height: 300,
      resizable: false,
      minimizable: false,
      maximizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: mainWindow.webContents.getURL().includes('http') ? null : path.join(__dirname, 'preload.cjs')
      }
    });

    // Create HTML for credential input
    const credentialHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background: #f5f5f5; }
          .container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h2 { margin-top: 0; color: #333; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; font-weight: 500; }
          input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
          .buttons { display: flex; gap: 10px; margin-top: 20px; }
          button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
          .btn-primary { background: #007bff; color: white; }
          .btn-secondary { background: #6c757d; color: white; }
          .error { color: #dc3545; font-size: 14px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Network Access Required</h2>
          <p>The application needs access to the network storage. Please enter your network credentials:</p>
          <div class="form-group">
            <label for="username">Username:</label>
            <input type="text" id="username" placeholder="domain\\username or username">
          </div>
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password">
          </div>
          <div id="error" class="error" style="display: none;"></div>
          <div class="buttons">
            <button id="cancel" class="btn-secondary">Use Local Storage</button>
            <button id="save" class="btn-primary">Connect</button>
          </div>
        </div>
        <script>
          // eslint-disable-next-line no-undef
          const { ipcRenderer } = require('electron');

          document.getElementById('save').addEventListener('click', async () => {
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            if (!username || !password) {
              document.getElementById('error').textContent = 'Please enter both username and password';
              document.getElementById('error').style.display = 'block';
              return;
            }

            document.getElementById('error').style.display = 'none';
            document.getElementById('save').disabled = true;
            document.getElementById('save').textContent = 'Testing...';

            try {
              const result = await ipcRenderer.invoke('network:test-credentials', { username, password });
              if (result.success) {
                ipcRenderer.send('credentials:save', { username, password });
                window.close();
              } else {
                document.getElementById('error').textContent = result.error || 'Connection failed. Please check your credentials.';
                document.getElementById('error').style.display = 'block';
                document.getElementById('save').disabled = false;
                document.getElementById('save').textContent = 'Connect';
              }
            } catch (error) {
              document.getElementById('error').textContent = 'Connection test failed: ' + error.message;
              document.getElementById('error').style.display = 'block';
              document.getElementById('save').disabled = false;
              document.getElementById('save').textContent = 'Connect';
            }
          });

          document.getElementById('cancel').addEventListener('click', () => {
            ipcRenderer.send('credentials:cancel');
            window.close();
          });

          // Load stored credentials if available
          ipcRenderer.invoke('network:get-stored-credentials').then(creds => {
            if (creds && creds.username) {
              document.getElementById('username').value = creds.username;
            }
          });
        </script>
      </body>
      </html>
    `;

    credentialDialog.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(credentialHTML));

    credentialDialog.once('ready-to-show', () => {
      credentialDialog.show();
    });

    // Handle credential save
    const saveHandler = (event, creds) => {
      networkCredentials = creds;
      resolve(creds);
    };

    // Handle cancel
    const cancelHandler = () => {
      resolve(null);
    };

    ipcMain.once('credentials:save', saveHandler);
    ipcMain.once('credentials:cancel', cancelHandler);

    credentialDialog.on('closed', () => {
      ipcMain.removeListener('credentials:save', saveHandler);
      ipcMain.removeListener('credentials:cancel', cancelHandler);
      resolve(null);
    });
  });
}

const ENV_RUNTIME_ROOT = [
  process.env.CTH_RUNTIME_ROOT,
  process.env.CRAFT_TOOLS_RUNTIME_ROOT,
  process.env.CRAFT_TOOLS_NAS_ROOT
].find(value => typeof value === 'string' && value.trim().length > 0)

const resolvedRuntimeRoot = ENV_RUNTIME_ROOT
  ? path.resolve(ENV_RUNTIME_ROOT.trim())
  : null

const defaultRuntimeRoot = path.resolve(app.getPath('userData'), 'data')

async function resolveRuntimePath(targetPath = '') {
  if (!targetPath) {
    // For root path, try network first, then fallback to local
    if (resolvedRuntimeRoot) {
      // In packaged apps, synchronous access checks may fail for network paths
      // even when the paths are accessible. Trust the environment variable.
      return resolvedRuntimeRoot;
    }

    // Check packaged config as fallback
    const configRoot = await initializeRuntimeConfig();
    if (configRoot) {
      return configRoot;
    }

    return defaultRuntimeRoot;
  }

  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }

  // For relative paths, try network first, then fallback to local
  let base = defaultRuntimeRoot; // Default to local

  if (resolvedRuntimeRoot) {
    // In packaged apps, synchronous access checks may fail for network paths
    // even when the paths are accessible. Trust the environment variable.
    base = resolvedRuntimeRoot;
  } else {
    // Check packaged config as fallback
    const configRoot = await initializeRuntimeConfig();
    if (configRoot) {
      base = configRoot;
    }
  }

  return path.resolve(base, targetPath);
}

// Enhanced runtime path resolution with credential prompting
async function resolveRuntimePathWithCredentials(targetPath = '', mainWindow = null) {
  if (!targetPath) {
    // For root path, try network first, then fallback to local
    if (resolvedRuntimeRoot) {
      // Test network access
      try {
        await fs.access(resolvedRuntimeRoot);
        return resolvedRuntimeRoot;
      } catch (err) {
        console.log('Network path not accessible:', err.message);
        // Try to load stored credentials and test connection
        if (!networkCredentials) {
          networkCredentials = await loadNetworkCredentials();
        }

        if (networkCredentials && mainWindow) {
          // Test if stored credentials work
          const testResult = await testNetworkConnection(networkCredentials.username, ''); // Password not stored in memory
          if (!testResult) {
            // Stored credentials don't work, prompt user
            const newCreds = await promptForNetworkCredentials(mainWindow);
            if (newCreds) {
              networkCredentials = newCreds;
              // Test the new credentials
              const newTestResult = await testNetworkConnection(newCreds.username, newCreds.password);
              if (newTestResult) {
                // Save credentials and try network again
                await saveNetworkCredentials(newCreds.username, newCreds.password);
                try {
                  await fs.access(resolvedRuntimeRoot);
                  return resolvedRuntimeRoot;
                } catch (e) {
                  console.log('Network still not accessible after credential update');
                }
              }
            }
          } else {
            // Stored credentials work
            try {
              await fs.access(resolvedRuntimeRoot);
              return resolvedRuntimeRoot;
            } catch (e) {
              console.log('Network not accessible despite valid credentials');
            }
          }
        }
        // Fall back to local
        return defaultRuntimeRoot;
      }
    }

    // Check packaged config as fallback
    const configRoot = await initializeRuntimeConfig();
    if (configRoot) {
      return configRoot;
    }

    return defaultRuntimeRoot;
  }

  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }

  // For relative paths, try network first, then fallback to local
  let base = defaultRuntimeRoot; // Default to local

  if (resolvedRuntimeRoot) {
    // Test network access for relative paths too
    try {
      await fs.access(resolvedRuntimeRoot);
      base = resolvedRuntimeRoot;
    } catch (err) {
      console.log('Network path not accessible for relative path:', err.message);
      // Try credential prompting here too if we have a main window
      if (mainWindow && !networkCredentials) {
        networkCredentials = await loadNetworkCredentials();
      }

      if (networkCredentials && mainWindow) {
        const testResult = await testNetworkConnection(networkCredentials.username, '');
        if (!testResult) {
          const newCreds = await promptForNetworkCredentials(mainWindow);
          if (newCreds) {
            networkCredentials = newCreds;
            const newTestResult = await testNetworkConnection(newCreds.username, newCreds.password);
            if (newTestResult) {
              await saveNetworkCredentials(newCreds.username, newCreds.password);
              try {
                await fs.access(resolvedRuntimeRoot);
                base = resolvedRuntimeRoot;
              } catch (e) {
                console.log('Network still not accessible after credential update');
              }
            }
          }
        } else {
          try {
            await fs.access(resolvedRuntimeRoot);
            base = resolvedRuntimeRoot;
          } catch (e) {
            console.log('Network not accessible despite valid credentials');
          }
        }
      }
    }
  } else {
    // Check packaged config as fallback
    const configRoot = await initializeRuntimeConfig();
    if (configRoot) {
      base = configRoot;
    }
  }

  return path.resolve(base, targetPath);
}

async function ensureDirectoryForFile(targetPath) {
  const directory = path.dirname(targetPath)
  await fs.mkdir(directory, { recursive: true })
}

async function getRuntimeStatus() {
  const runtimeRoot = await resolveRuntimePath()
  const usingOverride = Boolean(resolvedRuntimeRoot) || Boolean(await initializeRuntimeConfig())
  const status = {
    runtimeRoot,
    usingOverride,
    ok: true,
    message: usingOverride ? 'Runtime override active.' : 'Using local runtime.',
    buildInfo: null,
    buildInfoFileModified: null,
    buildInfoAgeMinutes: null
  }

  try {
    await fs.access(runtimeRoot)
  } catch (err) {
    status.ok = !usingOverride
    status.message = usingOverride
      ? 'Runtime override unavailable: ' + err.message
      : 'Local runtime unavailable: ' + err.message
    status.error = err.message
    return status
  }

  const buildInfoPath = path.join(runtimeRoot, 'build-info.json')

  try {
    const content = await fs.readFile(buildInfoPath, 'utf-8')
    const info = JSON.parse(content)
    status.buildInfo = info

    const stats = await fs.stat(buildInfoPath)
    status.buildInfoFileModified = stats.mtime.toISOString()

    if (info?.timestampUtc) {
      const parsed = Date.parse(info.timestampUtc)
      if (!Number.isNaN(parsed)) {
        status.buildInfoAgeMinutes = Math.round((Date.now() - parsed) / 60000)
      }
    }

    if (usingOverride) {
      const version = info?.version || 'unknown version'
      const timestamp = info?.timestampUtc || status.buildInfoFileModified
      status.message = 'NAS build ' + version + ' @ ' + timestamp
    } else {
      status.message = 'Using local runtime'
    }
  } catch (err) {
    if (usingOverride) {
      status.ok = false
      status.message = err.code === 'ENOENT'
        ? 'NAS build-info.json not found'
        : 'NAS runtime error: ' + err.message
      status.error = err.message
    } else {
      status.message = 'Using local runtime'
    }
  }

  return status
}

if (resolvedRuntimeRoot) {
  fs.mkdir(resolvedRuntimeRoot, { recursive: true })
    .then(() => {
      console.log('Craft Tools Hub runtime root override active:', resolvedRuntimeRoot)
    })
    .catch(err => {
      console.error('Failed to prepare runtime root override:', err)
    })
}

// Determine if running in development mode
const isDev = !app.isPackaged

let mainWindow
let splashWindow
let dataPath
let pluginsPath
let loadedPlugins = []
let loadedComponents = []
let loadedSubAssemblies = []
let cachedSubAssemblies = [] // Cache for all sub-assemblies
let quoteSchema
let quoteValidate

// Embedded server variables
let serverApp
let serverDb
let generatedNumbersDb
let serverPort = 3001
let serverInstance

// Default customer data (same as in App.jsx)
const DEFAULT_CUSTOMER_DATA = {
  "001": "Malt Handling",
  "002": "Blichmann Engineering",
  "003": "Still Dragon",
  "004": "Silverback Equipment",
  "005": "RMS Roller",
  "006": "ABM Equipment, Inc.",
  "007": "JP Craft Brewing Services",
  "008": "Rovisys",
  "009": "Laser Mechanisms, Inc",
  "010": "Crawford Brewing",
  "011": "Konig Brewing Solutions",
  "012": "Paul Mueller",
  "013": "Perceptive Controls",
  "014": "ABT",
  "015": "Minnetonka Brewing Company",
  "016": "Premier Stainless",
  "017": "Oronoko Iron Works",
  "100": "Walls Distilling",
  "101": "Onewell Brewing",
  "102": "Lotus Beverage Alliance",
  "103": "Jackie O's",
  "104": "Bridges End",
  "105": "Ada Valley Meats",
  "106": "White Labs",
  "107": "Mighty Squirrel Brewing",
  "108": "Knowlton House",
  "109": "Las Vegas Distillery",
  "110": "Blackshire Distillery",
  "111": "The Brewing Projekt",
  "112": "Old Route 69",
  "113": "Napali Brewery",
  "114": "Bolero Snort",
  "115": "Disco Witch Brewing",
  "116": "Bentonville Brewing Company",
  "117": "Edmonds Electric",
  "118": "Burning Barrel",
  "119": "SidMac Engineering & MFG Inc",
  "120": "Brother Justus",
  "121": "LogOff Brewing",
  "122": "Clag Brewing Co.",
  "123": "Pareidolia Brewing Company",
  "124": "Cave Hill Farms Brewery",
  "125": "Hound Song Brewing",
  "126": "Cowboy Craft",
  "127": "Bridge's End",
  "128": "Big Grove",
  "129": "Brown",
  "130": "Bridge's End Brewing",
  "131": "Acme Electric",
  "132": "Alewife Brewing",
  "133": "One Well Brewing",
  "134": "Mystique Barrel Brewing and Lager House",
  "135": "Fierce Whiskers",
  "136": "Ragged Branch",
  "137": "Oracle Brewing",
  "138": "Raffaldini Vineyards",
  "139": "Turks Head Brewing",
  "140": "Old Dominick",
  "141": "Russian River",
  "142": "Copper Mule",
  "143": "Black Band Distillery",
  "144": "Chilton Mill Brewing",
  "145": "Stubborn Brothers Brewing",
  "146": "3 Howls Distillery",
  "147": "Mystique Brewing",
  "148": "Las Vegas Distilling",
  "149": "Oasis Well Systems",
  "150": "Gnosis Brewing",
  "151": "Watermark Brewing Co",
  "152": "Grain Theory Brewery",
  "153": "Heron Bay Brewing",
  "154": "Zipline Brewing",
  "155": "Aurellias Brewing",
  "156": "Savage & Cooke Distillery",
  "157": "Aurora Brewing",
  "158": "Virginia Commonwealth",
  "159": "Territorial Brewing Co",
  "160": "More Brewing Company",
  "161": "Dead Low Brewing",
  "162": "Watauga Brewing",
  "163": "Turks Head",
  "164": "HiHo",
  "165": "Eagle Park Brewing",
  "166": "Zymos Brewing",
  "167": "Black Button Distilling",
  "168": "Journeyman Distillery",
  "169": "Lively Beerworks",
  "170": "Eastern Market Brewing",
  "171": "Corsair",
  "172": "Rushing Duck Brewing",
  "173": "Rushing Duck",
  "174": "Zipline",
  "175": "Talea Brewing",
  "176": "Belshire Brewery",
  "177": "Big Grove Cedar Rapids",
  "178": "Speckled Pig",
  "179": "Southern Hart Brewing",
  "180": "Mothfire Brewing",
  "181": "Sunroom Brewing",
  "182": "U.S. Engineering",
  "183": "Indian River",
  "184": "Towns End Brewing",
  "185": "Westbrook Brewing",
  "186": "Pareidolia Brewing",
  "187": "Black Circle Brewing",
  "188": "Big Creek Beverage",
  "189": "State Line Distillery",
  "190": "Good People Brewing",
  "191": "Breckenridge Distillery",
  "192": "Wiggly Bridge Distillery",
  "193": "Two Water Brewing",
  "194": "Engine 3 Brewing",
  "195": "CLC Provisions",
  "196": "Stillfire Brewing",
  "197": "Mellön Brasserie",
  "198": "Somerset Brewing",
  "199": "Magosh Brewing",
  "200": "Pareidolla Brewing Company",
  "201": "Big Grove Brewing",
  "202": "Sangfroid Distilling",
  "203": "Bevy Brewing",
  "204": "Imperial Yeast",
  "205": "Earl Giles",
  "206": "Speckled Pig Brewing",
  "207": "Foundation Mechanical",
  "208": "4 Hands Brewing",
  "209": "Marfa Spirit",
  "210": "Southern Illinois University",
  "211": "Crazy Uncle Mikes",
  "212": "Old Nation Brewing",
  "213": "Lanthier Winery",
  "214": "Barrett Beverage",
  "215": "Stadacone",
  "216": "Wiggly Bridge",
  "217": "Hampton Brewing Co",
  "218": "Grey Sail Brewing",
  "219": "Gambler's Bay",
  "220": "Grain Creations Brewing Company, LLC",
  "221": "Speckled Pig Brewing Co.",
  "222": "World's Most Famous Brewery",
  "223": "Manhattan Project",
  "224": "John Emerald Distilling Co",
  "225": "Alematic",
  "226": "Alter Brewing",
  "227": "Prairie Ales",
  "228": "Kevin Kowalski",
  "229": "Old Nation",
  "230": "Black Heron",
  "231": "Hershey Equipment",
  "232": "Brewery 1817",
  "233": "Mikerphone Brewing",
  "234": "Bragg Creek Distillers",
  "235": "Tusculum Brewing Company",
  "236": "Aurora",
  "237": "The Pass Beer Company",
  "238": "Schadegg Mechanical",
  "239": "Sumter Brewing",
  "240": "Shu Brewing",
  "241": "Cerveza Citos Brewery",
  "242": "Tin Mill Brewery",
  "243": "Eastern Market Brewing Co",
  "244": "B'Brew Systems & Solutions",
  "245": "The Lab",
  "246": "The Craft Consult",
  "247": "Process Equipment Sales",
  "248": "Green Door Distilling",
  "249": "CLAG Brewing Company",
  "250": "Balds Birds Brewing",
  "251": "Brewing Projekt",
  "252": "Bono Burns Dist.",
  "253": "Double Clutch Brewing",
  "254": "Formula Brewing",
  "255": "Quality Tank Solutions",
  "256": "Gusto brewing Company",
  "257": "Waypoint Processing",
  "258": "Alvarium Beer",
  "259": "Trillium Brewing",
  "260": "Foremost Properties LLC",
  "261": "Fromm Family",
  "262": "Fifty West",
  "263": "Arvon Brewing",
  "264": "Scofflaw Brewing",
  "265": "Bonesaw Brewing",
  "266": "KVCC",
};

// Initialize data storage
async function initDataStorage() {
  dataPath = path.join(defaultRuntimeRoot)
  try {
    await fs.mkdir(dataPath, { recursive: true })
    console.log('Data directory created:', dataPath)
  } catch (err) {
    console.error('Error creating data directory:', err)
  }
}

// Initialize plugins directory
async function initPluginsDirectory() {
  // Use workspace plugins folder in development, packaged location in production
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    pluginsPath = path.join(__dirname, '..', 'plugins')
  } else {
    pluginsPath = path.join(process.resourcesPath, 'plugins')
  }
  
  try {
    await fs.mkdir(pluginsPath, { recursive: true })
    console.log('Plugins directory:', pluginsPath)
  } catch (err) {
    console.error('Error creating plugins directory:', err)
  }
}

// Initialize database tables
async function initializeDatabaseTables(db) {
  try {
    console.log('Initializing database tables...')

    // Components table (already exists, but ensure it has all columns)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS components (
        sku TEXT PRIMARY KEY,
        description TEXT,
        category TEXT,
        vendor TEXT,
        price REAL,
        volt INTEGER,
        phase INTEGER,
        amps REAL,
        tags TEXT,
        manualLink TEXT,
        uom TEXT,
        vndrnum TEXT,
        notes TEXT,
        partAbbrev TEXT,
        lastPriceUpdate TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        customerCode TEXT PRIMARY KEY,
        customerName TEXT NOT NULL,
        isActive BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Sub-assemblies table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sub_assemblies (
        subAssemblyId TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        category TEXT,
        attributes TEXT, -- JSON string for complex attributes
        components TEXT, -- JSON string for component list
        estimatedLaborHours REAL,
        isBundled BOOLEAN DEFAULT 0,
        isUserCreated BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Quotes table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS quotes (
        quoteId TEXT PRIMARY KEY,
        projectName TEXT,
        customer TEXT,
        salesRep TEXT,
        status TEXT DEFAULT 'draft',
        projectCodes TEXT, -- JSON string for project codes
        controlPanelConfig TEXT, -- JSON string for panel config
        operationalItems TEXT, -- JSON string for operational items
        pricing TEXT, -- JSON string for pricing data
        bom TEXT, -- JSON string for BOM data
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Operational items table (for detailed BOM items)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS operational_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quoteId TEXT,
        sku TEXT,
        description TEXT,
        displayName TEXT,
        quantity REAL,
        unitPrice REAL,
        totalPrice REAL,
        vendor TEXT,
        vndrnum TEXT,
        category TEXT,
        sectionGroup TEXT,
        sourceAssembly TEXT,
        sourceRule TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (quoteId) REFERENCES quotes (quoteId) ON DELETE CASCADE
      )
    `)

    // Product templates table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS product_templates (
        productCode INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        templateData TEXT, -- JSON string for template structure
        isActive BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Projects table (for project tracking)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        projectNumber TEXT,
        quoteNumber TEXT,
        projectName TEXT,
        customer TEXT,
        industry TEXT,
        product TEXT,
        control TEXT,
        scope TEXT,
        poNumber TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Manual quotes table (for associating manual calculations with quote numbers)
    console.log('Creating manual_quotes table...')
    await db.exec(`
      CREATE TABLE IF NOT EXISTS manual_quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quoteNumber TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL, -- 'margin_calculation' or 'bom'
        data TEXT NOT NULL, -- JSON string for the calculation or BOM data
        projectName TEXT,
        customer TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('manual_quotes table created successfully')

    // Generated numbers table (for tracking quote and project number generation)

    console.log('Database tables initialized successfully')

    // Run data migration from JSON files to database
    await migrateExistingData(db)
  } catch (error) {
    console.error('Error initializing database tables:', error)
    throw error
  }
}

// Migrate existing JSON data to database tables
async function migrateExistingData(db) {
  try {
    console.log('Checking for existing data to migrate...')

    // Migrate customers from hardcoded data
    try {
      console.log('Migrating customers from hardcoded data...')

      for (const [customerCode, customerName] of Object.entries(DEFAULT_CUSTOMER_DATA)) {
        const existing = await db.get('SELECT customerCode FROM customers WHERE customerCode = ?', [customerCode])
        if (!existing) {
          await db.run(`
            INSERT INTO customers (
              customerCode, customerName, isActive, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?)
          `, [
            customerCode,
            customerName,
            1,
            new Date().toISOString(),
            new Date().toISOString()
          ])
        }
      }
      console.log('Customers migration completed')
    } catch (error) {
      console.log('Error migrating customers:', error.message)
    }

    // Migrate sub-assemblies
    try {
      const subAssembliesPath = path.join(dataPath, 'sub_assemblies.json')
      const subAssembliesData = await fs.readFile(subAssembliesPath, 'utf-8')
      const subAssemblies = JSON.parse(subAssembliesData)

      if (Array.isArray(subAssemblies) && subAssemblies.length > 0) {
        console.log(`Migrating ${subAssemblies.length} sub-assemblies to database...`)

        for (const sa of subAssemblies) {
          const existing = await db.get('SELECT subAssemblyId FROM sub_assemblies WHERE subAssemblyId = ?', [sa.subAssemblyId || sa.assemblyId])
          if (!existing) {
            await db.run(`
              INSERT INTO sub_assemblies (
                subAssemblyId, description, category, attributes, components,
                estimatedLaborHours, isBundled, isUserCreated, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              sa.subAssemblyId || sa.assemblyId,
              sa.description || '',
              sa.category || '',
              JSON.stringify(sa.attributes || {}),
              JSON.stringify(sa.components || []),
              sa.estimatedLaborHours || 0,
              sa.isBundled ? 1 : 0,
              sa.isUserCreated ? 1 : 0,
              new Date().toISOString(),
              new Date().toISOString()
            ])
          }
        }
        console.log('Sub-assemblies migration completed')
      }
    } catch (error) {
      console.log('No sub-assemblies to migrate or migration failed:', error.message)
    }

    // Migrate quotes
    try {
      const quotesDir = path.join(dataPath, 'quotes')
      const files = await fs.readdir(quotesDir)
      const jsonFiles = files.filter(f => f.endsWith('.json'))

      if (jsonFiles.length > 0) {
        console.log(`Migrating ${jsonFiles.length} quotes to database...`)

        for (const file of jsonFiles) {
          const filePath = path.join(quotesDir, file)
          const quoteData = await fs.readFile(filePath, 'utf-8')
          const quote = JSON.parse(quoteData)

          const existing = await db.get('SELECT quoteId FROM quotes WHERE quoteId = ?', [quote.quoteId])
          if (!existing) {
            await db.run(`
              INSERT INTO quotes (
                quoteId, projectName, customer, salesRep, status,
                projectCodes, controlPanelConfig, operationalItems,
                pricing, bom, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              quote.quoteId,
              quote.projectName || '',
              quote.customer || '',
              quote.salesRep || '',
              quote.status || 'draft',
              JSON.stringify(quote.projectCodes || {}),
              JSON.stringify(quote.controlPanelConfig || {}),
              JSON.stringify(quote.operationalItems || []),
              JSON.stringify(quote.pricing || {}),
              JSON.stringify(quote.bom || null),
              new Date().toISOString(),
              new Date().toISOString()
            ])

            // Migrate operational items if they exist
            if (Array.isArray(quote.operationalItems) && quote.operationalItems.length > 0) {
              for (const item of quote.operationalItems) {
                await db.run(`
                  INSERT INTO operational_items (
                    quoteId, sku, description, displayName, quantity, unitPrice, totalPrice,
                    vendor, vndrnum, category, sectionGroup, sourceAssembly, sourceRule, notes
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  quote.quoteId,
                  item.sku || '',
                  item.description || '',
                  item.displayName || '',
                  item.quantity || 0,
                  item.unitPrice || 0,
                  item.totalPrice || 0,
                  item.vendor || '',
                  item.vndrnum || '',
                  item.category || '',
                  item.sectionGroup || '',
                  item.sourceAssembly || '',
                  item.sourceRule || '',
                  item.notes || ''
                ])
              }
            }
          }
        }
        console.log('Quotes migration completed')
      }
    } catch (error) {
      console.log('No quotes to migrate or migration failed:', error.message)
    }

    // Migrate projects
    try {
      const projectsPath = path.join(dataPath, 'projects.json')
      const projectsData = await fs.readFile(projectsPath, 'utf-8')
      const projects = JSON.parse(projectsData)

      if (Array.isArray(projects) && projects.length > 0) {
        console.log(`Migrating ${projects.length} projects to database...`)

        for (const project of projects) {
          const existing = await db.get('SELECT id FROM projects WHERE id = ?', [project.id])
          if (!existing) {
            await db.run(`
              INSERT INTO projects (
                id, projectNumber, quoteNumber, projectName, customer,
                industry, product, control, scope, poNumber, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              project.id,
              project.projectNumber || '',
              project.quoteNumber || '',
              project.projectName || '',
              project.customer || '',
              project.industry || '',
              project.product || '',
              project.control || '',
              project.scope || '',
              project.poNumber || '',
              project.createdAt || new Date().toISOString(),
              new Date().toISOString()
            ])
          }
        }
        console.log('Projects migration completed')
      }
    } catch (error) {
      console.log('No projects to migrate or migration failed:', error.message)
    }

    // Migrate product templates
    try {
      const templatesDir = path.join(dataPath, 'product-templates')
      const files = await fs.readdir(templatesDir)
      const jsonFiles = files.filter(f => f.endsWith('.json'))

      if (jsonFiles.length > 0) {
        console.log(`Migrating ${jsonFiles.length} product templates to database...`)

        for (const file of jsonFiles) {
          const productCode = file.replace('.json', '')
          const filePath = path.join(templatesDir, file)
          const templateData = await fs.readFile(filePath, 'utf-8')
          const template = JSON.parse(templateData)

          const existing = await db.get('SELECT productCode FROM product_templates WHERE productCode = ?', [parseInt(productCode)])
          if (!existing) {
            await db.run(`
              INSERT INTO product_templates (
                productCode, name, description, templateData, isActive, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              parseInt(productCode),
              template.name || `Product ${productCode}`,
              template.description || '',
              JSON.stringify(template),
              1,
              new Date().toISOString(),
              new Date().toISOString()
            ])
          }
        }
        console.log('Product templates migration completed')
      }
    } catch (error) {
      console.log('No product templates to migrate or migration failed:', error.message)
    }

    console.log('Data migration completed successfully')
  } catch (error) {
    console.error('Error during data migration:', error)
  }
}

// Initialize generated numbers database tables
async function initializeGeneratedNumbersDatabase() {
  try {
    console.log('Initializing generated numbers database...')

    // Database path for generated numbers - use NAS if available, fallback to local
    const dbDir = await resolveRuntimePath('database')
    const dbPath = path.join(dbDir, 'generated_numbers.db')

    // Ensure database directory exists
    await fs.mkdir(dbDir, { recursive: true })

    generatedNumbersDb = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })
    console.log('Generated numbers database connected at:', dbPath)

    // Create generated numbers table
    await generatedNumbersDb.exec(`
      CREATE TABLE IF NOT EXISTS generated_numbers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, -- 'quote' or 'project'
        mainId TEXT NOT NULL,
        fullId TEXT NOT NULL,
        customerCode TEXT,
        customerName TEXT,
        industry TEXT,
        product TEXT,
        control TEXT,
        scope TEXT,
        poNumber TEXT,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log('Generated numbers database initialized successfully')
  } catch (error) {
    console.error('Error initializing generated numbers database:', error)
    // Don't throw error - allow app to continue without generated numbers database
  }
}

// Initialize embedded API server
async function initEmbeddedServer() {
  try {
    console.log('Starting embedded server initialization...')

    serverApp = express()
    serverApp.use(cors())
    serverApp.use(express.json())

    // Database path - try NAS first, fallback to local
    const dbDir = await resolveRuntimePath('database')
    const dbPath = path.join(dbDir, 'craft_tools.db')

    // Ensure database directory exists
    await fs.mkdir(dbDir, { recursive: true })

    serverDb = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })
    console.log('Embedded server connected to database at:', dbPath)
    console.log('Database location:', resolvedRuntimeRoot ? 'NAS/Shared' : 'Local')

    // Initialize database tables
    console.log('About to initialize database tables...')
    await initializeDatabaseTables(serverDb)
    console.log('Database tables initialization completed successfully')

    // API Routes
    serverApp.get('/api/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: serverDb ? 'connected' : 'disconnected'
      })
    })

    serverApp.get('/api/components', async (req, res) => {
      try {
        if (!serverDb) {
          return res.status(500).json({ error: 'Database not connected' })
        }
        const components = await serverDb.all('SELECT * FROM components LIMIT 100')
        res.json(components)
      } catch (error) {
        console.error('Error fetching components:', error)
        res.status(500).json({ error: 'Failed to fetch components' })
      }
    })

    serverApp.get('/api/components/count', async (req, res) => {
      try {
        if (!serverDb) {
          return res.status(500).json({ error: 'Database not connected' })
        }
        const result = await serverDb.get('SELECT COUNT(*) as count FROM components')
        res.json({ count: result.count })
      } catch (error) {
        console.error('Error getting component count:', error)
        res.status(500).json({ error: 'Failed to get component count' })
      }
    })

    // Start server
    serverInstance = serverApp.listen(serverPort, () => {
      console.log(`Embedded API server running on port ${serverPort}`)
    })

  } catch (error) {
    console.error('Failed to initialize embedded server:', error)
  }
}

// Discover and load all plugins
async function loadPlugins() {
  try {
    const entries = await fs.readdir(pluginsPath, { withFileTypes: true })
    const pluginDirs = entries.filter(entry => entry.isDirectory())
    
    loadedPlugins = []
    
    for (const dir of pluginDirs) {
      try {
        const manifestPath = path.join(pluginsPath, dir.name, 'manifest.json')
        // Skip directories that don't contain a manifest.json to avoid noisy ENOENT warnings
        try {
          await fs.access(manifestPath)
        } catch {
          console.log(`No manifest found for plugin directory: ${dir.name}, skipping.`)
          continue
        }

        const manifestData = await fs.readFile(manifestPath, 'utf-8')
        const manifest = JSON.parse(manifestData)
        
        // Validate required fields
        if (!manifest.id || !manifest.name || !manifest.entry) {
          console.warn(`Invalid manifest in plugin: ${dir.name}`)
          continue
        }
        
        loadedPlugins.push({
          ...manifest,
          path: path.join(pluginsPath, dir.name)
        })
        
        console.log(`Loaded plugin: ${manifest.name} (${manifest.id})`)
      } catch (err) {
        console.warn(`Failed to load plugin from ${dir.name}:`, err.message)
      }
    }
    
    return loadedPlugins
  } catch (err) {
    console.error('Error loading plugins:', err)
    return []
  }
}

function sanitizeComponentCatalog(list = []) {
  if (!Array.isArray(list)) {
    return []
  }

  let filteredOut = 0

  const sanitized = list.reduce((acc, component) => {
    if (!component || typeof component !== 'object') {
      filteredOut += 1
      return acc
    }

    const rawPrice = component.price
    const numericPrice = typeof rawPrice === 'string'
      ? Number(rawPrice.replace(/[$,]/g, ''))
      : Number(rawPrice)

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      filteredOut += 1
      return acc
    }

    acc.push({ ...component, price: numericPrice })
    return acc
  }, [])

  if (filteredOut > 0) {
    console.log(`Filtered ${filteredOut} components with no valid price`)
  }

  return sanitized
}

// Load component catalog from API server
async function loadComponents() {
  try {
    // Try to load from API server first
    try {
      console.log('Attempting to load components from API server...');
      const response = await fetch('http://localhost:3001/api/components');
      if (response.ok) {
        const components = await response.json();
        loadedComponents = sanitizeComponentCatalog(components);
        console.log(`Loaded ${loadedComponents.length} components from API server`);
        return loadedComponents;
      } else {
        console.log('API server responded with error:', response.status);
      }
    } catch (apiErr) {
      console.log('API server not available, falling back to local data:', apiErr.message);
    }

    // Fallback to synced data (user's uploaded CSV)
    const syncedPath = path.join(dataPath, 'components', 'component_catalog.json');

    try {
      const syncedData = await fs.readFile(syncedPath, 'utf-8');
      const parsed = JSON.parse(syncedData);
      loadedComponents = sanitizeComponentCatalog(parsed);
      console.log(`Loaded ${loadedComponents.length} components from synced catalog`);
      return loadedComponents;
    } catch (syncErr) {
      console.log('No synced catalog found, loading bundled catalog...');
    }

    // Final fallback to bundled data
    let componentsPath;
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      componentsPath = path.join(__dirname, '..', 'src', 'data', 'components', 'component_catalog.json');
    } else {
      componentsPath = path.join(process.resourcesPath, 'app.asar', 'src', 'data', 'components', 'component_catalog.json');
    }

    const data = await fs.readFile(componentsPath, 'utf-8');
    const parsed = JSON.parse(data);
    loadedComponents = sanitizeComponentCatalog(parsed);
    console.log(`Loaded ${loadedComponents.length} components from bundled catalog`);
    return loadedComponents;
  } catch (err) {
    console.error('Error loading components:', err);
    return [];
  }
}

// Load sub-assemblies from bundled data
async function loadSubAssemblies() {
  try {
    // Check if bundled sub-assemblies should be disabled for production
    const disableBundledSubAssemblies = process.env.DISABLE_BUNDLED_SUBASSEMBLIES === 'true' ||
                                       process.env.NODE_ENV === 'production' && !process.env.FORCE_LOAD_BUNDLED_SUBASSEMBLIES;

    if (disableBundledSubAssemblies) {
      console.log('Bundled sub-assemblies disabled for production environment');
      loadedSubAssemblies = [];
      return loadedSubAssemblies;
    }

    let subAssembliesPath
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      subAssembliesPath = path.join(__dirname, '..', 'src', 'data', 'sub-assemblies', 'sub_assemblies.json')
    } else {
      subAssembliesPath = path.join(process.resourcesPath, 'app.asar', 'src', 'data', 'sub-assemblies', 'sub_assemblies.json')
    }

    const data = await fs.readFile(subAssembliesPath, 'utf-8')
    loadedSubAssemblies = JSON.parse(data)
    console.log(`Loaded ${loadedSubAssemblies.length} sub-assemblies from library`)
    return loadedSubAssemblies
  } catch (err) {
    console.error('Error loading sub-assemblies:', err)
    return []
  }
}

// Helper functions for file-based storage
async function readJSONFile(filename) {
  try {
    const filePath = path.join(dataPath, filename)
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null // File doesn't exist
    }
    throw err
  }
}

async function writeJSONFile(filename, data) {
  const filePath = path.join(dataPath, filename)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function csvEscape(value) {
  if (value === undefined || value === null) {
    return ''
  }

  const stringValue = typeof value === 'string' ? value : String(value)
  if (stringValue.includes('"') || stringValue.includes(',') || /[\r\n]/.test(stringValue)) {
    // Use string replacement instead of regex to avoid parsing issues
    const escaped = stringValue.split('"').join('""')
    return `"${escaped}"`
  }

  return stringValue
}

// CSV export helper
async function appendProjectToCSV(project) {
  const csvPath = await resolveRuntimePath(path.join('OUTPUT', 'quote_project_log.csv'))
  const headers = 'ID,Project Number,Quote Number,Project Name,Customer,Industry,Product,Control,Scope,PO Number,Created At\n'

  await ensureDirectoryForFile(csvPath)

  let fileExists = false
  try {
    await fs.access(csvPath)
    fileExists = true
  } catch {
    // File doesn't exist
  }

  if (!fileExists) {
    await fs.writeFile(csvPath, headers, 'utf-8')
  }

  const rowValues = [
    project.id || '',
    project.projectNumber || '',
    project.quoteNumber || '',
    project.projectName || '',
    project.customer || '',
    project.industry || '',
    project.product || '',
    project.control || '',
    project.scope || '',
    project.poNumber || '',
    project.createdAt || new Date().toISOString()
  ]

  const row = `${rowValues.map(csvEscape).join(',')}\n`
  await fs.appendFile(csvPath, row, 'utf-8')
}

async function writeQuoteSnapshotCSV(quoteObject) {
  if (!quoteObject) {
    return
  }

  const rawIdentifier = (quoteObject.quoteId || quoteObject.id || 'quote').toString()
  const safeIdentifier = rawIdentifier.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'quote'
  const timestamp = new Date().toISOString()
  const safeTimestamp = timestamp.replace(/[:.]/g, '-').replace(/\s+/g, '_')

  const quotesDir = await resolveRuntimePath(path.join('OUTPUT', 'quotes'))
  const historyDir = await resolveRuntimePath(path.join('OUTPUT', 'quotes', 'history'))
  const currentPath = path.join(quotesDir, `${safeIdentifier}.csv`)
  const historicalPath = path.join(historyDir, `${safeIdentifier}_${safeTimestamp}.csv`)

  const summaryPairs = [
    ['Quote ID', quoteObject.quoteId || ''],
    ['Project Name', quoteObject.projectName || ''],
    ['Customer', quoteObject.customer || ''],
    ['Sales Rep', quoteObject.salesRep || ''],
    ['Status', quoteObject.status || ''],
    ['Industry Code', quoteObject.projectCodes?.industry || ''],
    ['Product Code', quoteObject.projectCodes?.product || ''],
    ['Control Code', quoteObject.projectCodes?.control || ''],
    ['Scope Code', quoteObject.projectCodes?.scope || ''],
    ['Material Cost', Number(quoteObject.pricing?.materialCost || 0).toFixed(2)],
    ['Labor Cost', Number(quoteObject.pricing?.laborCost || 0).toFixed(2)],
    ['Total COGS', Number(quoteObject.pricing?.totalCOGS || 0).toFixed(2)],
    ['Margin Percent', Number(quoteObject.pricing?.marginPercent || 0).toFixed(2)],
    ['Sell Price', Number(quoteObject.pricing?.finalPrice || 0).toFixed(2)],
    ['Operational Item Count', Array.isArray(quoteObject.operationalItems) ? quoteObject.operationalItems.length : 0],
    ['Last Updated', timestamp]
  ]

  const lines = ['Field,Value']
  summaryPairs.forEach(([key, value]) => {
    lines.push(`${csvEscape(key)},${csvEscape(value)}`)
  })

  const operationalItems = Array.isArray(quoteObject.operationalItems) ? quoteObject.operationalItems : []

  lines.push('')

  if (operationalItems.length > 0) {
    const itemHeader = [
      'SKU',
      'Description',
      'Display Name',
      'Quantity',
      'Unit Price',
      'Total Price',
      'Vendor',
      'VN#',
      'Category',
      'Section Group',
      'Source Assembly',
      'Source Rule',
      'Notes'
    ]

    lines.push(itemHeader.map(csvEscape).join(','))

    operationalItems.forEach(item => {
      const row = [
        item?.sku || '',
        item?.description || '',
        item?.displayName || '',
        item?.quantity ?? 0,
        typeof item?.unitPrice === 'number' ? item.unitPrice.toFixed(2) : item?.unitPrice || '',
        typeof item?.totalPrice === 'number' ? item.totalPrice.toFixed(2) : item?.totalPrice || '',
        item?.vendor || '',
        item?.vndrnum || '',
        item?.category || '',
        item?.sectionGroup || '',
        item?.sourceAssembly || '',
        item?.sourceRule || '',
        item?.notes || ''
      ]

      lines.push(row.map(csvEscape).join(','))
    })
  } else {
    lines.push(csvEscape('No operational items generated'))
  }

  const csvContent = lines.join('\n')

  await ensureDirectoryForFile(currentPath)
  await fs.writeFile(currentPath, csvContent, 'utf-8')

  await ensureDirectoryForFile(historicalPath)
  await fs.writeFile(historicalPath, csvContent, 'utf-8')
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Create a simple HTML splash screen
  const splashHTML = '<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:transparent;display:flex;align-items:center;justify-content:center;height:100vh}.splash{background:linear-gradient(135deg,#1e293b 0%,#334155 100%);border-radius:16px;padding:40px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}.logo{font-size:48px;font-weight:800;background:linear-gradient(135deg,#3b82f6 0%,#06b6d4 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:20px}.title{color:white;font-size:24px;font-weight:600;margin-bottom:30px}.loader{width:60px;height:60px;border:4px solid rgba(59,130,246,0.2);border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.status{color:#94a3b8;font-size:14px;margin-top:20px}</style></head><body><div class="splash"><div class="logo">⚙️</div><div class="title">Craft Automation CPQ (Configure, Price Quote)</div><div class="loader"></div><div class="status">Loading workspace...</div></div></body></html>';

  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(splashHTML));
}

function createWindow() {
  // Determine preload script path
  // In production, use built preload.cjs
  // In development, prefer built preload.cjs if it exists, otherwise use source preload.js
  let preloadPath
  if (app.isPackaged) {
    preloadPath = path.join(__dirname, 'preload.cjs')
  } else {
    // Check if built version exists (from dist-electron), otherwise use source
    const builtPreload = path.join(__dirname, '..', 'dist-electron', 'preload.cjs')
    const sourcePreload = path.join(__dirname, 'preload.js')
    
    try {
      // Try to use built version if it exists
      if (fssync.existsSync(builtPreload)) {
        preloadPath = builtPreload
      } else {
        preloadPath = sourcePreload
      }
    } catch {
      preloadPath = sourcePreload
    }
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until ready
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' http://localhost:3001 https://unpkg.com;",
    },
  })

  // In development, load from Vite dev server; in production, load from dist folder
  const distPath = path.join(__dirname, '../dist/index.html')
  if (isDev && !fssync.existsSync(distPath)) {
    mainWindow.loadURL('http://localhost:5174')
  } else {
    mainWindow.loadFile(distPath)
  }
  mainWindow.webContents.openDevTools()

  // Show main window and close splash when ready
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
    }, 1000); // Show for at least 1 second
  });

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Search Components...',
          accelerator: 'CmdOrCtrl+K',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('open-component-search');
            }
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  // Show splash screen first
  createSplashWindow();
  
  await initDataStorage()
  await initPluginsDirectory()
  await initEmbeddedServer()
  await initializeGeneratedNumbersDatabase()
  await loadPlugins()
  await loadComponents()
  await loadSubAssemblies()
  
  // Load quote schema
  let quoteSchemaPath
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    quoteSchemaPath = path.join(__dirname, '..', 'src', 'data', 'quotes', 'project_quote_schema.json')
  } else {
    quoteSchemaPath = path.join(process.resourcesPath, 'app.asar', 'src', 'data', 'quotes', 'project_quote_schema.json')
  }
  const quoteSchemaData = await fs.readFile(quoteSchemaPath, 'utf-8')
  quoteSchema = JSON.parse(quoteSchemaData)
  const ajv = new Ajv()
  quoteValidate = ajv.compile(quoteSchema)
  
  // Populate cached sub-assemblies after initial loads
  cachedSubAssemblies = await getAllSubAssemblies();
  console.log(`Cached ${cachedSubAssemblies.length} sub-assemblies.`);
  
  createMenu();
  createWindow()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})
  
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      // Close the embedded server and databases before quitting
      if (serverInstance) {
        serverInstance.close(async () => {
          console.log('Embedded server closed')
          if (serverDb) {
            await serverDb.close()
            console.log('Main database closed')
          }
          if (generatedNumbersDb) {
            await generatedNumbersDb.close()
            console.log('Generated numbers database closed')
          }
          app.quit()
        })
      } else {
        // Close databases even if no server
        if (serverDb) {
          serverDb.close().then(() => {
            console.log('Main database closed')
            if (generatedNumbersDb) {
              generatedNumbersDb.close().then(() => {
                console.log('Generated numbers database closed')
                app.quit()
              })
            } else {
              app.quit()
            }
          })
        } else if (generatedNumbersDb) {
          generatedNumbersDb.close().then(() => {
            console.log('Generated numbers database closed')
            app.quit()
          })
        } else {
          app.quit()
        }
      }
    }
  })
  
  // Database IPC handlers (using JSON file storage)
  
  // Plugin IPC handlers
  
  // Get list of all loaded plugins
  ipcMain.handle('plugins:getAll', async () => {
    return loadedPlugins.map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      icon: plugin.icon,
      author: plugin.author
    }))
  })
  
// Get HTML content for a specific plugin
ipcMain.handle('plugins:getHTML', async (event, pluginId) => {
  try {
    const plugin = loadedPlugins.find(p => p.id === pluginId)
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`)
    }
    
    const htmlPath = path.join(plugin.path, plugin.entry)
    const htmlContent = await fs.readFile(htmlPath, 'utf-8')
    return htmlContent
  } catch (err) {
    console.error(`Error loading plugin HTML for ${pluginId}:`, err)
    throw err
  }
})

// Load all projects
ipcMain.handle('db:loadProjects', async () => {
  try {
    const projects = await readJSONFile('projects.json')
    return projects || []
  } catch (err) {
    console.error('Error loading projects:', err)
    return []
  }
})

// Save a new project
ipcMain.handle('db:saveProject', async (event, project) => {
  try {
    let projects = await readJSONFile('projects.json') || []
    projects.push(project)
    // Sort by createdAt desc
    projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    await writeJSONFile('projects.json', projects)
    // Also log to CSV
    await appendProjectToCSV(project)
    return { success: true }
  } catch (err) {
    console.error('Error saving project:', err)
    throw err
  }
})

// Delete a project
ipcMain.handle('db:deleteProject', async (event, projectId) => {
  try {
    let projects = await readJSONFile('projects.json') || []
    const initialLength = projects.length
    projects = projects.filter(p => p.id !== projectId)
    await writeJSONFile('projects.json', projects)
    return { success: true, changes: initialLength - projects.length }
  } catch (err) {
    console.error('Error deleting project:', err)
    throw err
  }
})

// Clear all projects
ipcMain.handle('db:clearProjects', async () => {
  try {
    await writeJSONFile('projects.json', [])
    return { success: true }
  } catch (err) {
    console.error('Error clearing projects:', err)
    throw err
  }
})

// Load a setting (like custom schema)
ipcMain.handle('db:loadSetting', async (event, key) => {
  try {
    const settings = await readJSONFile('settings.json') || {}
    return settings[key] || null
  } catch (err) {
    console.error('Error loading setting:', err)
    return null
  }
})

// Save a setting
ipcMain.handle('db:saveSetting', async (event, key, value) => {
  try {
    let settings = await readJSONFile('settings.json') || {}
    settings[key] = value
    await writeJSONFile('settings.json', settings)
    return { success: true }
  } catch (err) {
    console.error('Error saving setting:', err)
    throw err
  }
})

// Delete a setting
ipcMain.handle('db:deleteSetting', async (event, key) => {
  try {
    let settings = await readJSONFile('settings.json') || {}
    delete settings[key]
    await writeJSONFile('settings.json', settings)
    return { success: true }
  } catch (err) {
    console.error('Error deleting setting:', err)
    throw err
  }
})

// Component Catalog IPC handlers

// Get all components
ipcMain.handle('components:getAll', async () => {
  return loadedComponents
})

// Open global component search modal
ipcMain.on('components:openGlobalSearch', () => {
  if (mainWindow) {
    mainWindow.webContents.send('open-component-search');
  }
})

// Search components by filters
ipcMain.handle('components:search', async (event, filters) => {
  let results = loadedComponents
  
  if (filters.category) {
    results = results.filter(c => c.category?.toLowerCase().includes(filters.category.toLowerCase()))
  }
  if (filters.sku) {
    results = results.filter(c => c.sku?.toLowerCase().includes(filters.sku.toLowerCase()))
  }
  if (filters.vendor) {
    results = results.filter(c => c.vendor?.toLowerCase().includes(filters.vendor.toLowerCase()))
  }
  if (filters.description) {
    results = results.filter(c => c.description?.toLowerCase().includes(filters.description.toLowerCase()))
  }
  if (filters.maxPrice) {
    results = results.filter(c => c.price <= filters.maxPrice)
  }
  
  return results
})

// Get component by SKU
ipcMain.handle('components:getBySku', async (event, sku) => {
  return loadedComponents.find(c => c.sku === sku) || null
})

// Get unique categories
ipcMain.handle('components:getCategories', async () => {
  const categories = [...new Set(loadedComponents.map(c => c.category).filter(Boolean))]
  return categories.sort()
})

// Get unique vendors
ipcMain.handle('components:getVendors', async () => {
  const vendors = [...new Set(loadedComponents.map(c => c.vendor).filter(Boolean))]
  return vendors.sort()
})

// Sync components from CSV
ipcMain.handle('components:sync-from-csv', async (event, csvContent) => {
  try {
    // Import PapaParse dynamically
    const Papa = (await import('papaparse')).default;
    
    // Ensure components directory exists
    const componentsDir = path.join(dataPath, 'components');
    console.log('Creating directory:', componentsDir);
    await fs.mkdir(componentsDir, { recursive: true });
    
    // Path to our master file
    const catalogPath = path.join(componentsDir, 'component_catalog.json');
    console.log('Catalog path:', catalogPath);

    // 1. Read the existing master catalog
    let masterCatalog = [];
    try {
      console.log('Attempting to read existing catalog...');
      const masterFileContent = await fs.readFile(catalogPath, 'utf-8');
      masterCatalog = JSON.parse(masterFileContent);
      console.log('Loaded', masterCatalog.length, 'existing components');
    } catch (e) {
      console.log("No existing catalog found, will create a new one.", e.code);
    }

    // Create a Map for fast lookups
    const masterCatalogMap = new Map(masterCatalog.map(item => [item.sku, item]));

    // 2. Parse the uploaded CSV
    const parsed = Papa.parse(csvContent, { header: true });

    let updatedCount = 0;
    let newCount = 0;

    // 3. Loop through CSV and perform the "Smart Merge"
    for (const row of parsed.data) {
      // Try multiple possible SKU columns
      let sku = row['Manufacturer PART NUMBER'] || 
                row['SKU'] || 
                row['PART NUMBER'] || 
                row['Part Number'] ||
                row['Vendor Part Code'];
      
      // Trim whitespace from SKU
      sku = sku?.trim();
      
      if (!sku) {
        console.log('Skipping row with no SKU:', row);
        continue; // Skip empty rows
      }

      // Clean the price
      const price = parseFloat(row['COST']?.replace(/[$,]/g, '')) || 0;

      const existingItem = masterCatalogMap.get(sku);

      if (existingItem) {
        // ----- IT EXISTS: MERGE UPDATE -----
        // Only update the Smartsheet-owned fields
        existingItem.price = price;
        existingItem.description = row['PART DESCRIPTION & DETAILS'] || existingItem.description;
        existingItem.category = row['SUB CATEGORY'] || existingItem.category;
        existingItem.vendor = row['VENDORCODE'] || existingItem.vendor;
        existingItem.uom = row['Unit/Qty'] || existingItem.uom;
        existingItem.vndrnum = row['Vendor Part Code'] || existingItem.vndrnum;
        existingItem.notes = row['Notes'] || existingItem.notes;
        existingItem.partAbbrev = row['PART ABBREV.'] || existingItem.partAbbrev;
        existingItem.lastPriceUpdate = row['LAST PRICE UPDATE'] || existingItem.lastPriceUpdate;
        // We intentionally do NOT touch volt, phase, amps, tags, manualLink
        updatedCount++;
      } else {
        // ----- IT'S NEW: ADD -----
        const newItem = {
          sku: sku,
          price: price,
          description: row['PART DESCRIPTION & DETAILS'] || '',
          category: row['SUB CATEGORY'] || '',
          vendor: row['VENDORCODE'] || '',
          uom: row['Unit/Qty'] || '',
          vndrnum: row['Vendor Part Code'] || '',
          notes: row['Notes'] || '',
          partAbbrev: row['PART ABBREV.'] || '',
          lastPriceUpdate: row['LAST PRICE UPDATE'] || '',
          // Set engineering fields to null (can be filled in later)
          volt: null,
          phase: null,
          amps: null,
          tags: null,
          manualLink: null
        };
        masterCatalog.push(newItem);
        masterCatalogMap.set(sku, newItem);
        newCount++;
      }
    }

    const sanitizedCatalog = sanitizeComponentCatalog(masterCatalog)
    const removedCount = masterCatalog.length - sanitizedCatalog.length

    // 4. Write the updated catalog back to disk
    await fs.writeFile(catalogPath, JSON.stringify(sanitizedCatalog, null, 2));
    
    // 5. Reload components into memory
    loadedComponents = sanitizedCatalog;

    if (removedCount > 0) {
      console.log(`Excluded ${removedCount} catalog entries with missing pricing during sync`)
    }

    return { success: true, updated: updatedCount, added: newCount };
  } catch (error) {
    console.error('Error in Smart Sync:', error);
    return { success: false, error: error.message };
  }
});

// Database-based IPC handlers for new tables

// Sub-assemblies database handlers
ipcMain.handle('db:sub-assemblies:getAll', async () => {
  try {
    if (!serverDb) {
      return await getAllSubAssemblies(); // Fallback to JSON
    }
    const subAssemblies = await serverDb.all('SELECT * FROM sub_assemblies ORDER BY updated_at DESC');
    return subAssemblies.map(sa => ({
      ...sa,
      attributes: sa.attributes ? JSON.parse(sa.attributes) : {},
      components: sa.components ? JSON.parse(sa.components) : []
    }));
  } catch (error) {
    console.error('Error fetching sub-assemblies from database:', error);
    return await getAllSubAssemblies(); // Fallback to JSON
  }
});

ipcMain.handle('db:sub-assemblies:save', async (event, subAssembly) => {
  try {
    if (!serverDb) {
      return await ipcMain.handle('sub-assemblies:save', event, subAssembly); // Fallback to JSON
    }

    const now = new Date().toISOString();
    const data = {
      subAssemblyId: subAssembly.subAssemblyId || subAssembly.assemblyId,
      description: subAssembly.description,
      category: subAssembly.category,
      attributes: JSON.stringify(subAssembly.attributes || {}),
      components: JSON.stringify(subAssembly.components || []),
      estimatedLaborHours: subAssembly.estimatedLaborHours || 0,
      isBundled: subAssembly.isBundled ? 1 : 0,
      isUserCreated: subAssembly.isUserCreated ? 1 : 0,
      updated_at: now
    };

    // Check if sub-assembly exists
    const existing = await serverDb.get('SELECT subAssemblyId FROM sub_assemblies WHERE subAssemblyId = ?', [data.subAssemblyId]);

    if (existing) {
      // Update
      await serverDb.run(`
        UPDATE sub_assemblies SET
          description = ?, category = ?, attributes = ?, components = ?,
          estimatedLaborHours = ?, isBundled = ?, isUserCreated = ?, updated_at = ?
        WHERE subAssemblyId = ?
      `, [
        data.description, data.category, data.attributes, data.components,
        data.estimatedLaborHours, data.isBundled, data.isUserCreated, data.updated_at,
        data.subAssemblyId
      ]);
    } else {
      // Insert
      data.created_at = now;
      await serverDb.run(`
        INSERT INTO sub_assemblies (
          subAssemblyId, description, category, attributes, components,
          estimatedLaborHours, isBundled, isUserCreated, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.subAssemblyId, data.description, data.category, data.attributes, data.components,
        data.estimatedLaborHours, data.isBundled, data.isUserCreated, data.created_at, data.updated_at
      ]);
    }

    return { success: true, data: subAssembly };
  } catch (error) {
    console.error('Error saving sub-assembly to database:', error);
    return await ipcMain.handle('sub-assemblies:save', event, subAssembly); // Fallback to JSON
  }
});

ipcMain.handle('db:sub-assemblies:getById', async (event, subAssemblyId) => {
  try {
    if (!serverDb) {
      return await ipcMain.handle('sub-assemblies:getById', event, subAssemblyId); // Fallback to JSON
    }

    const row = await serverDb.get('SELECT * FROM sub_assemblies WHERE subAssemblyId = ?', [subAssemblyId]);
    if (!row) return null;

    return {
      ...row,
      attributes: row.attributes ? JSON.parse(row.attributes) : {},
      components: row.components ? JSON.parse(row.components) : []
    };
  } catch (error) {
    console.error('Error fetching sub-assembly from database:', error);
    return await ipcMain.handle('sub-assemblies:getById', event, subAssemblyId); // Fallback to JSON
  }
});

// Quotes database handlers
ipcMain.handle('db:quotes:getAll', async () => {
  try {
    if (!serverDb) {
      return await ipcMain.handle('quote:get-all'); // Fallback to JSON
    }
    const quotes = await serverDb.all('SELECT * FROM quotes ORDER BY updated_at DESC');
    return quotes.map(q => ({
      ...q,
      projectCodes: q.projectCodes ? JSON.parse(q.projectCodes) : {},
      controlPanelConfig: q.controlPanelConfig ? JSON.parse(q.controlPanelConfig) : {},
      operationalItems: q.operationalItems ? JSON.parse(q.operationalItems) : [],
      pricing: q.pricing ? JSON.parse(q.pricing) : {},
      bom: q.bom ? JSON.parse(q.bom) : null
    }));
  } catch (error) {
    console.error('Error fetching quotes from database:', error);
    return await ipcMain.handle('quote:get-all'); // Fallback to JSON
  }
});

ipcMain.handle('db:quotes:save', async (event, quote) => {
  try {
    if (!serverDb) {
      return await ipcMain.handle('quote:save', event, quote); // Fallback to JSON
    }

    const now = new Date().toISOString();
    const data = {
      quoteId: quote.quoteId,
      projectName: quote.projectName || '',
      customer: quote.customer || '',
      salesRep: quote.salesRep || '',
      status: quote.status || 'draft',
      projectCodes: JSON.stringify(quote.projectCodes || {}),
      controlPanelConfig: JSON.stringify(quote.controlPanelConfig || {}),
      operationalItems: JSON.stringify(quote.operationalItems || []),
      pricing: JSON.stringify(quote.pricing || {}),
      bom: JSON.stringify(quote.bom || null),
      updated_at: now
    };

    // Check if quote exists
    const existing = await serverDb.get('SELECT quoteId FROM quotes WHERE quoteId = ?', [data.quoteId]);

    if (existing) {
      // Update
      await serverDb.run(`
        UPDATE quotes SET
          projectName = ?, customer = ?, salesRep = ?, status = ?,
          projectCodes = ?, controlPanelConfig = ?, operationalItems = ?,
          pricing = ?, bom = ?, updated_at = ?
        WHERE quoteId = ?
      `, [
        data.projectName, data.customer, data.salesRep, data.status,
        data.projectCodes, data.controlPanelConfig, data.operationalItems,
        data.pricing, data.bom, data.updated_at, data.quoteId
      ]);
    } else {
      // Insert
      data.created_at = now;
      await serverDb.run(`
        INSERT INTO quotes (
          quoteId, projectName, customer, salesRep, status,
          projectCodes, controlPanelConfig, operationalItems,
          pricing, bom, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.quoteId, data.projectName, data.customer, data.salesRep, data.status,
        data.projectCodes, data.controlPanelConfig, data.operationalItems,
        data.pricing, data.bom, data.created_at, data.updated_at
      ]);
    }

    return { success: true, data: quote };
  } catch (error) {
    console.error('Error saving quote to database:', error);
    return await ipcMain.handle('quote:save', event, quote); // Fallback to JSON
  }
});

ipcMain.handle('db:quotes:getById', async (event, quoteId) => {
  try {
    if (!serverDb) {
      return await ipcMain.handle('quote:get-by-id', event, quoteId); // Fallback to JSON
    }

    const row = await serverDb.get('SELECT * FROM quotes WHERE quoteId = ?', [quoteId]);
    if (!row) return null;

    return {
      ...row,
      projectCodes: row.projectCodes ? JSON.parse(row.projectCodes) : {},
      controlPanelConfig: row.controlPanelConfig ? JSON.parse(row.controlPanelConfig) : {},
      operationalItems: row.operationalItems ? JSON.parse(row.operationalItems) : [],
      pricing: row.pricing ? JSON.parse(row.pricing) : {},
      bom: row.bom ? JSON.parse(row.bom) : null
    };
  } catch (error) {
    console.error('Error fetching quote from database:', error);
    return await ipcMain.handle('quote:get-by-id', event, quoteId); // Fallback to JSON
  }
});

// Operational items database handlers
ipcMain.handle('db:operational-items:getByQuoteId', async (event, quoteId) => {
  try {
    if (!serverDb) {
      // For JSON fallback, we'd need to get from quotes
      const quote = await ipcMain.handle('quote:get-by-id', event, quoteId);
      return quote ? quote.operationalItems || [] : [];
    }

    const items = await serverDb.all('SELECT * FROM operational_items WHERE quoteId = ? ORDER BY id', [quoteId]);
    return items;
  } catch (error) {
    console.error('Error fetching operational items from database:', error);
    // Fallback to JSON
    const quote = await ipcMain.handle('quote:get-by-id', event, quoteId);
    return quote ? quote.operationalItems || [] : [];
  }
});

ipcMain.handle('db:operational-items:saveBulk', async (event, quoteId, items) => {
  try {
    if (!serverDb) {
      // For JSON fallback, we'd need to update the quote
      const quote = await ipcMain.handle('quote:get-by-id', event, quoteId);
      if (quote) {
        quote.operationalItems = items;
        return await ipcMain.handle('quote:save', event, quote);
      }
      return { success: false, error: 'Quote not found' };
    }

    // First delete existing items for this quote
    await serverDb.run('DELETE FROM operational_items WHERE quoteId = ?', [quoteId]);

    // Insert new items
    for (const item of items) {
      await serverDb.run(`
        INSERT INTO operational_items (
          quoteId, sku, description, displayName, quantity, unitPrice, totalPrice,
          vendor, vndrnum, category, sectionGroup, sourceAssembly, sourceRule, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        quoteId, item.sku || '', item.description || '', item.displayName || '',
        item.quantity || 0, item.unitPrice || 0, item.totalPrice || 0,
        item.vendor || '', item.vndrnum || '', item.category || '',
        item.sectionGroup || '', item.sourceAssembly || '', item.sourceRule || '', item.notes || ''
      ]);
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving operational items to database:', error);
    // Fallback to JSON
    const quote = await ipcMain.handle('quote:get-by-id', event, quoteId);
    if (quote) {
      quote.operationalItems = items;
      return await ipcMain.handle('quote:save', event, quote);
    }
    return { success: false, error: error.message };
  }
});

// Product templates database handlers
ipcMain.handle('db:product-templates:getAll', async () => {
  try {
    if (!serverDb) {
      // For JSON fallback, we'd need to scan the product-templates directory
      return [];
    }
    const templates = await serverDb.all('SELECT * FROM product_templates WHERE isActive = 1 ORDER BY productCode');
    return templates.map(t => ({
      ...t,
      templateData: t.templateData ? JSON.parse(t.templateData) : {}
    }));
  } catch (error) {
    console.error('Error fetching product templates from database:', error);
    return [];
  }
});

ipcMain.handle('db:product-templates:getByCode', async (event, productCode) => {
  try {
    if (!serverDb) {
      return await ipcMain.handle('product-templates:get', event, productCode); // Fallback to JSON
    }

    const row = await serverDb.get('SELECT * FROM product_templates WHERE productCode = ? AND isActive = 1', [productCode]);
    if (!row) return null;

    return {
      ...row,
      templateData: row.templateData ? JSON.parse(row.templateData) : {}
    };
  } catch (error) {
    console.error('Error fetching product template from database:', error);
    return await ipcMain.handle('product-templates:get', event, productCode); // Fallback to JSON
  }
});

ipcMain.handle('db:product-templates:save', async (event, template) => {
  try {
    if (!serverDb) {
      return await ipcMain.handle('product-templates:save', event, template); // Fallback to JSON
    }

    const now = new Date().toISOString();
    const data = {
      productCode: template.productCode,
      name: template.name,
      description: template.description || '',
      templateData: JSON.stringify(template.templateData || {}),
      isActive: template.isActive !== false ? 1 : 0,
      updated_at: now
    };

    // Check if template exists
    const existing = await serverDb.get('SELECT productCode FROM product_templates WHERE productCode = ?', [data.productCode]);

    if (existing) {
      // Update
      await serverDb.run(`
        UPDATE product_templates SET
          name = ?, description = ?, templateData = ?, isActive = ?, updated_at = ?
        WHERE productCode = ?
      `, [
        data.name, data.description, data.templateData, data.isActive, data.updated_at, data.productCode
      ]);
    } else {
      // Insert
      data.created_at = now;
      await serverDb.run(`
        INSERT INTO product_templates (
          productCode, name, description, templateData, isActive, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        data.productCode, data.name, data.description, data.templateData,
        data.isActive, data.created_at, data.updated_at
      ]);
    }

    return { success: true, data: template };
  } catch (error) {
    console.error('Error saving product template to database:', error);
    return await ipcMain.handle('product-templates:save', event, template); // Fallback to JSON
  }
});

// Projects database handlers
ipcMain.handle('db:projects:getAll', async () => {
  try {
    if (!serverDb) {
      return await ipcMain.handle('db:loadProjects'); // Fallback to JSON
    }
    const projects = await serverDb.all('SELECT * FROM projects ORDER BY created_at DESC');
    return projects;
  } catch (error) {
    console.error('Error fetching projects from database:', error);
    return await ipcMain.handle('db:loadProjects'); // Fallback to JSON
  }
});

ipcMain.handle('db:projects:save', async (event, project) => {
  try {
    if (!serverDb) {
      return await ipcMain.handle('db:saveProject', event, project); // Fallback to JSON
    }

    const now = new Date().toISOString();
    const data = {
      id: project.id,
      projectNumber: project.projectNumber || '',
      quoteNumber: project.quoteNumber || '',
      projectName: project.projectName || '',
      customer: project.customer || '',
      industry: project.industry || '',
      product: project.product || '',
      control: project.control || '',
      scope: project.scope || '',
      poNumber: project.poNumber || '',
      updated_at: now
    };

    // Check if project exists
    const existing = await serverDb.get('SELECT id FROM projects WHERE id = ?', [data.id]);

    if (existing) {
      // Update
      await serverDb.run(`
        UPDATE projects SET
          projectNumber = ?, quoteNumber = ?, projectName = ?, customer = ?,
          industry = ?, product = ?, control = ?, scope = ?, poNumber = ?, updated_at = ?
        WHERE id = ?
      `, [
        data.projectNumber, data.quoteNumber, data.projectName, data.customer,
        data.industry, data.product, data.control, data.scope, data.poNumber, data.updated_at, data.id
      ]);
    } else {
      // Insert
      data.created_at = now;
      await serverDb.run(`
        INSERT INTO projects (
          id, projectNumber, quoteNumber, projectName, customer,
          industry, product, control, scope, poNumber, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.id, data.projectNumber, data.quoteNumber, data.projectName, data.customer,
        data.industry, data.product, data.control, data.scope, data.poNumber, data.created_at, data.updated_at
      ]);
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving project to database:', error);
    return await ipcMain.handle('db:saveProject', event, project); // Fallback to JSON
  }
});

// Customers IPC handlers

ipcMain.handle('db:customers:getAll', async () => {
  try {
    if (!serverDb) {
      // Fallback to JSON-based customers
      const customCustomers = await readJSONFile('settings.json') || {}
      const customCustomerData = customCustomers.customCustomers ? JSON.parse(customCustomers.customCustomers) : {}
      
      // Merge with default customers
      const allCustomers = { ...DEFAULT_CUSTOMER_DATA, ...customCustomerData }
      
      // Convert to array format expected by plugins
      return Object.entries(allCustomers).map(([id, name]) => ({
        id: id,
        name: name
      }))
    }

    const customers = await serverDb.all('SELECT * FROM customers ORDER BY customerCode');
    return customers.map(customer => ({
      id: customer.customerCode,
      name: customer.customerName,
      isActive: customer.isActive
    }));
  } catch (error) {
    console.error('Error getting customers from database:', error);
    // Fallback to JSON-based customers
    const customCustomers = await readJSONFile('settings.json') || {}
    const customCustomerData = customCustomers.customCustomers ? JSON.parse(customCustomers.customCustomers) : {}
    
    // Merge with default customers
    const allCustomers = { ...DEFAULT_CUSTOMER_DATA, ...customCustomerData }
    
    // Convert to array format expected by plugins
    return Object.entries(allCustomers).map(([id, name]) => ({
      id: id,
      name: name
    }))
  }
});

ipcMain.handle('db:customers:getByCode', async (event, customerCode) => {
  try {
    if (!serverDb) {
      // Fallback to JSON-based customers
      const customCustomers = await readJSONFile('settings.json') || {}
      const customCustomerData = customCustomers.customCustomers ? JSON.parse(customCustomers.customCustomers) : {}
      
      // Merge with default customers
      const allCustomers = { ...DEFAULT_CUSTOMER_DATA, ...customCustomerData }
      
      const customerName = allCustomers[customerCode];
      return customerName ? { id: customerCode, name: customerName } : null;
    }

    const customer = await serverDb.get('SELECT * FROM customers WHERE customerCode = ? AND isActive = 1', [customerCode]);
    return customer ? {
      id: customer.customerCode,
      name: customer.customerName,
      isActive: customer.isActive
    } : null;
  } catch (error) {
    console.error('Error getting customer by code from database:', error);
    // Fallback to JSON-based customers
    const customCustomers = await readJSONFile('settings.json') || {}
    const customCustomerData = customCustomers.customCustomers ? JSON.parse(customCustomers.customCustomers) : {}
    
    // Merge with default customers
    const allCustomers = { ...DEFAULT_CUSTOMER_DATA, ...customCustomerData }
    
    const customerName = allCustomers[customerCode];
    return customerName ? { id: customerCode, name: customerName } : null;
  }
});

ipcMain.handle('db:customers:save', async (event, customer) => {
  try {
    if (!serverDb) {
      return await ipcMain.handle('customers:add', event, { name: customer.name, isOEM: customer.isOEM }); // Fallback to JSON
    }

    const now = new Date().toISOString();
    const data = {
      customerCode: customer.id,
      customerName: customer.name,
      isActive: customer.isActive !== false, // Default to true
      updated_at: now
    };

    // Check if customer exists
    const existing = await serverDb.get('SELECT customerCode FROM customers WHERE customerCode = ?', [data.customerCode]);

    if (existing) {
      // Update
      await serverDb.run(`
        UPDATE customers SET
          customerName = ?, isActive = ?, updated_at = ?
        WHERE customerCode = ?
      `, [
        data.customerName, data.isActive, data.updated_at, data.customerCode
      ]);
    } else {
      // Insert
      data.created_at = now;
      await serverDb.run(`
        INSERT INTO customers (
          customerCode, customerName, isActive, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        data.customerCode, data.customerName, data.isActive, data.created_at, data.updated_at
      ]);
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving customer to database:', error);
    return await ipcMain.handle('customers:add', event, { name: customer.name, isOEM: customer.isOEM }); // Fallback to JSON
  }
});

// Generated numbers database handlers (separate database)
ipcMain.handle('db:generated-numbers-separate:getAll', async () => {
  try {
    if (!generatedNumbersDb) {
      return []; // No database, return empty
    }
    const numbers = await generatedNumbersDb.all('SELECT * FROM generated_numbers ORDER BY generated_at DESC');
    return numbers;
  } catch (error) {
    console.error('Error fetching generated numbers from separate database:', error);
    return [];
  }
});

ipcMain.handle('db:generated-numbers-separate:getByType', async (event, type) => {
  try {
    if (!generatedNumbersDb) {
      return []; // No database, return empty
    }
    const numbers = await generatedNumbersDb.all('SELECT * FROM generated_numbers WHERE type = ? ORDER BY generated_at DESC', [type]);
    return numbers;
  } catch (error) {
    console.error('Error fetching generated numbers by type from separate database:', error);
    return [];
  }
});

// Manual quotes database handlers
ipcMain.handle('db:manual-quotes:getAll', async () => {
  try {
    if (!serverDb) {
      return []; // No database, return empty
    }
    const quotes = await serverDb.all('SELECT * FROM manual_quotes ORDER BY created_at DESC');
    return quotes.map(q => ({
      ...q,
      data: q.data ? JSON.parse(q.data) : {}
    }));
  } catch (error) {
    console.error('Error fetching manual quotes from database:', error);
    return [];
  }
});

ipcMain.handle('db:manual-quotes:getByQuoteNumber', async (event, quoteNumber) => {
  try {
    if (!serverDb) {
      return null; // No database, return null
    }
    const quote = await serverDb.get('SELECT * FROM manual_quotes WHERE quoteNumber = ?', [quoteNumber]);
    if (!quote) return null;

    return {
      ...quote,
      data: quote.data ? JSON.parse(quote.data) : {}
    };
  } catch (error) {
    console.error('Error fetching manual quote by number from database:', error);
    return null;
  }
});

ipcMain.handle('db:manual-quotes:save', async (event, manualQuote) => {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not connected' };
    }

    const now = new Date().toISOString();
    const data = {
      quoteNumber: manualQuote.quoteNumber,
      type: manualQuote.type,
      data: JSON.stringify(manualQuote.data || {}),
      projectName: manualQuote.projectName || null,
      customer: manualQuote.customer || null,
      updated_at: now
    };

    // Check if manual quote exists
    const existing = await serverDb.get('SELECT quoteNumber FROM manual_quotes WHERE quoteNumber = ?', [data.quoteNumber]);

    if (existing) {
      // Update
      await serverDb.run(`
        UPDATE manual_quotes SET
          type = ?, data = ?, projectName = ?, customer = ?, updated_at = ?
        WHERE quoteNumber = ?
      `, [
        data.type, data.data, data.projectName, data.customer, data.updated_at, data.quoteNumber
      ]);
    } else {
      // Insert
      data.created_at = now;
      await serverDb.run(`
        INSERT INTO manual_quotes (
          quoteNumber, type, data, projectName, customer, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        data.quoteNumber, data.type, data.data, data.projectName, data.customer, data.created_at, data.updated_at
      ]);
    }

    return { success: true, data: manualQuote };
  } catch (error) {
    console.error('Error saving manual quote to database:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:manual-quotes:delete', async (event, quoteNumber) => {
  try {
    if (!serverDb) {
      return { success: false, error: 'Database not connected' };
    }

    await serverDb.run('DELETE FROM manual_quotes WHERE quoteNumber = ?', [quoteNumber]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting manual quote from database:', error);
    return { success: false, error: error.message };
  }
});

// Sub-Assembly IPC handlers

// Get all sub-assemblies (user data + bundled)
// Helper to get all sub-assemblies (bundled + user)
async function getAllSubAssemblies() {
  try {
    // Load from root sub_assemblies.json (where save writes to)
    let userSubAssemblies = await readJSONFile('sub_assemblies.json') || [];
    const subAssembliesPath = path.join(dataPath, 'sub_assemblies.json');
    console.log(`Loaded ${userSubAssemblies.length} user sub-assemblies from: ${subAssembliesPath}`);
    
    // Start with bundled sub-assemblies and mark them as bundled
    const allSubAssemblies = loadedSubAssemblies.map(assembly => ({
      ...assembly,
      isBundled: true,
      isUserCreated: false
    }));
    
    // Add or update with user sub-assemblies (mark them as user-created)
    // Support both assemblyId (legacy) and subAssemblyId (new) for matching
    for (const userSubAssembly of userSubAssemblies) {
      const userAssemblyId = userSubAssembly.subAssemblyId || userSubAssembly.assemblyId;
      const existingIndex = allSubAssemblies.findIndex(a => {
        const existingId = a.subAssemblyId || a.assemblyId;
        return existingId === userAssemblyId;
      });
      if (existingIndex >= 0) {
        // User sub-assembly overrides bundled one
        allSubAssemblies[existingIndex] = {
          ...userSubAssembly,
          isBundled: false,
          isUserCreated: true
        };
      } else {
        // New user sub-assembly
        allSubAssemblies.push({
          ...userSubAssembly,
          isBundled: false,
          isUserCreated: true
        });
      }
    }
    
    console.log(`Total sub-assemblies after merge: ${allSubAssemblies.length} (${loadedSubAssemblies.length} bundled + ${userSubAssemblies.length} user)`);
    return allSubAssemblies;
  } catch (err) {
    console.error('Error loading sub-assemblies:', err);
    return loadedSubAssemblies.map(assembly => ({
      ...assembly,
      isBundled: true,
      isUserCreated: false
    }));
  }
}

async function expandSubAssemblyById(subAssemblyId) {
  if (!subAssemblyId) {
    return null;
  }

  const allAssemblies = await getAllSubAssemblies();
  const subAssembly = allAssemblies.find(a => (a.subAssemblyId || a.assemblyId) === subAssemblyId);
  if (!subAssembly) {
    return null;
  }

  const expandedComponents = Array.isArray(subAssembly.components)
    ? subAssembly.components.map(componentEntry => {
        const quantity = Number(componentEntry.quantity) || 0;
        const trimmedSku = componentEntry.sku?.trim();
        const component = trimmedSku ? loadedComponents.find(c => c.sku === trimmedSku) : null;

        return {
          ...componentEntry,
          sku: trimmedSku,
          quantity,
          component: component || null,
          subtotal: component ? (component.price || 0) * quantity : 0,
        };
      })
    : [];

  const totalCost = expandedComponents.reduce((sum, entry) => sum + (Number(entry.subtotal) || 0), 0);

  return {
    ...subAssembly,
    components: expandedComponents,
    totalCost,
    totalLaborCost: subAssembly.estimatedLaborHours || 0,
  };
}

ipcMain.handle('sub-assemblies:getAll', async () => {
  // Return cached assemblies for performance, or rebuild if cache is empty
  if (cachedSubAssemblies.length === 0) {
    cachedSubAssemblies = await getAllSubAssemblies();
  }
  console.log(`Returning ${cachedSubAssemblies.length} cached sub-assemblies`);
  return cachedSubAssemblies;
})

// Save a sub-assembly (validate against schema first)
ipcMain.handle('sub-assemblies:save', async (event, subAssemblyToSave) => {
  try {
    // Load sub-assembly schema
    let subAssemblySchemaPath
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      subAssemblySchemaPath = path.join(__dirname, '..', 'src', 'data', 'schemas', 'sub_assembly_schema.json')
    } else {
      subAssemblySchemaPath = path.join(process.resourcesPath, 'app.asar', 'src', 'data', 'schemas', 'sub_assembly_schema.json')
    }
    
    const schemaData = await fs.readFile(subAssemblySchemaPath, 'utf-8')
    const subAssemblySchema = JSON.parse(schemaData)
    const ajv = new Ajv()
    const validate = ajv.compile(subAssemblySchema)
    
    // Validate the sub-assembly
    // Support both assemblyId (legacy) and subAssemblyId (new) for backward compatibility
    const subAssemblyData = {
      ...subAssemblyToSave,
      subAssemblyId: subAssemblyToSave.subAssemblyId || subAssemblyToSave.assemblyId
    }
    const valid = validate(subAssemblyData)
    if (!valid) {
      return { success: false, errors: validate.errors }
    }
    
    // Load existing user sub-assemblies
    let userSubAssemblies = await readJSONFile('sub_assemblies.json') || []
    
    // Find and replace or add new
    // Support both assemblyId and subAssemblyId for lookup
    const targetId = subAssemblyData.subAssemblyId || subAssemblyData.assemblyId
    const existingIndex = userSubAssemblies.findIndex(a => 
      (a.subAssemblyId || a.assemblyId) === targetId
    )
    if (existingIndex >= 0) {
      userSubAssemblies[existingIndex] = subAssemblyData
    } else {
      userSubAssemblies.push(subAssemblyData)
    }
    
    // Save back to file
    const savePath = path.join(dataPath, 'sub_assemblies.json')
    await writeJSONFile('sub_assemblies.json', userSubAssemblies)
    console.log(`✓ Sub-Assembly saved to: ${savePath}`)
    console.log(`  - Sub-Assembly ID: ${targetId}`)
    console.log(`  - Description: ${subAssemblyData.description}`)
    console.log(`  - Category: ${subAssemblyData.category}`)
    console.log(`  - Total sub-assemblies in file: ${userSubAssemblies.length}`)
    
    // Refresh the cache
    cachedSubAssemblies = await getAllSubAssemblies()
    console.log(`✓ Cache refreshed with ${cachedSubAssemblies.length} sub-assemblies`)
    
    return { success: true, data: subAssemblyData }
  } catch (err) {
    console.error('Error saving sub-assembly:', err)
    throw err
  }
})

// Delete a sub-assembly
ipcMain.handle('sub-assemblies:delete', async (event, subAssemblyId) => {
  try {
    let userSubAssemblies = await readJSONFile('sub_assemblies.json') || []
    const initialLength = userSubAssemblies.length

    // Check if this sub-assembly exists in user data (only user-created sub-assemblies can be deleted)
    const userSubAssembly = userSubAssemblies.find(a =>
      (a.subAssemblyId || a.assemblyId) === subAssemblyId
    )

    if (!userSubAssembly) {
      // This is a bundled sub-assembly that cannot be deleted
      return { success: false, error: 'Cannot delete bundled sub-assembly. Only user-created sub-assemblies can be deleted.' }
    }

    // Support both assemblyId and subAssemblyId for deletion
    userSubAssemblies = userSubAssemblies.filter(a =>
      (a.subAssemblyId || a.assemblyId) !== subAssemblyId
    )
    await writeJSONFile('sub_assemblies.json', userSubAssemblies)

    // Clear the cache to force a fresh load
    cachedSubAssemblies = []
    console.log(`Sub-Assembly deleted and cache cleared: ${subAssemblyId}`)

    return { success: true, changes: initialLength - userSubAssemblies.length }
  } catch (err) {
    console.error('Error deleting sub-assembly:', err)
    throw err
  }
})// Search sub-assemblies by filters
ipcMain.handle('sub-assemblies:search', async (event, filters) => {
  let results = cachedSubAssemblies;

  if (filters.category) {
    results = results.filter(a => a.category?.toLowerCase().includes(filters.category.toLowerCase()))
  }
  if (filters.type) {
    results = results.filter(a => a.attributes?.type?.toLowerCase().includes(filters.type.toLowerCase()))
  }
  // Support both assemblyId and subAssemblyId for search
  if (filters.assemblyId || filters.subAssemblyId) {
    const searchId = (filters.subAssemblyId || filters.assemblyId).toLowerCase()
    results = results.filter(a => {
      const id = (a.subAssemblyId || a.assemblyId)?.toLowerCase()
      return id?.includes(searchId)
    })
  }
  if (filters.description) {
    results = results.filter(a => a.description?.toLowerCase().includes(filters.description.toLowerCase()))
  }

  return results
})
ipcMain.handle('sub-assemblies:searchMany', async (event, filtersArray) => {
  const matchingSubAssemblyIds = new Set();

  for (const filters of filtersArray) {
    let results = cachedSubAssemblies;

    if (filters.category) {
      results = results.filter(a => a.category?.toLowerCase().includes(filters.category.toLowerCase()))
    }
    if (filters.type) {
      results = results.filter(a => a.attributes?.type?.toLowerCase().includes(filters.type.toLowerCase()))
    }
    // Support both assemblyId and subAssemblyId for search
    if (filters.assemblyId || filters.subAssemblyId) {
      const searchId = (filters.subAssemblyId || filters.assemblyId).toLowerCase()
      results = results.filter(a => {
        const id = (a.subAssemblyId || a.assemblyId)?.toLowerCase()
        return id?.includes(searchId)
      })
    }
    if (filters.description) {
      results = results.filter(a => a.description?.toLowerCase().includes(filters.description.toLowerCase()))
    }

    results.forEach(asm => {
      const id = asm.subAssemblyId || asm.assemblyId
      if (id) matchingSubAssemblyIds.add(id)
    })
  }

  return Array.from(matchingSubAssemblyIds);
});

// Get sub-assembly by ID
ipcMain.handle('sub-assemblies:getById', async (event, subAssemblyId) => {
  const allAssemblies = await getAllSubAssemblies();
  // Support both assemblyId and subAssemblyId for lookup
  return allAssemblies.find(a => (a.subAssemblyId || a.assemblyId) === subAssemblyId) || null
})

// Expand sub-assembly with full component details and calculate total cost
ipcMain.handle('sub-assemblies:expand', async (event, subAssemblyId) => {
  return await expandSubAssemblyById(subAssemblyId);
})

// Get unique sub-assembly categories
ipcMain.handle('sub-assemblies:getCategories', async () => {
  const allAssemblies = await getAllSubAssemblies();
  const categories = [...new Set(allAssemblies.map(a => a.category).filter(Boolean))]
  return categories.sort()
})

// Quote IPC handlers

// Save a quote
ipcMain.handle('quote:save', async (event, quoteObject) => {
  const valid = quoteValidate(quoteObject)
  if (!valid) {
    return { success: false, errors: quoteValidate.errors }
  }
  const quotesDir = path.join(dataPath, 'quotes')
  await fs.mkdir(quotesDir, { recursive: true })
  const quoteIdentifier = (quoteObject.quoteId || quoteObject.id || `quote-${Date.now()}`).toString().trim() || `quote-${Date.now()}`
  const safeQuoteIdentifier = quoteIdentifier.replace(/[\\/:*?"<>|]/g, '_')
  const filePath = path.join(quotesDir, `${safeQuoteIdentifier}.json`)
  await fs.writeFile(filePath, JSON.stringify(quoteObject, null, 2), 'utf-8')

  try {
    await writeQuoteSnapshotCSV(quoteObject)
  } catch (err) {
    console.error('Failed to write quote snapshot CSV:', err)
  }

  return { success: true, path: filePath }
})

// Get all quotes
ipcMain.handle('quote:get-all', async () => {
  const quotesDir = path.join(dataPath, 'quotes')
  try {
    const files = await fs.readdir(quotesDir)
    const jsonFiles = files.filter(f => f.endsWith('.json'))
    const quotes = []
    for (const file of jsonFiles) {
      const filePath = path.join(quotesDir, file)
      const data = await fs.readFile(filePath, 'utf-8')
      quotes.push(JSON.parse(data))
    }
    return quotes
  } catch (err) {
    if (err.code === 'ENOENT') return []
    throw err
  }
})

// Get quote by ID
ipcMain.handle('quote:get-by-id', async (event, quoteId) => {
  const quotesDir = path.join(dataPath, 'quotes')
  const filePath = path.join(quotesDir, `${quoteId}.json`)
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    if (err.code === 'ENOENT') return null
    throw err
  }
})

// Delete a quote
ipcMain.handle('quote:delete', async (event, quoteId) => {
  const quotesDir = path.join(dataPath, 'quotes')
  const filePath = path.join(quotesDir, `${quoteId}.json`)
  try {
    await fs.unlink(filePath)
    return { success: true }
  } catch (err) {
    if (err.code === 'ENOENT') return { success: false, error: 'Quote not found' }
    throw err
  }
})

// Evaluate sub-assembly rules from template and quote configuration
ipcMain.handle('quotes:evaluate-subassembly-rules', async (event, quoteObject) => {
  try {
    // Dynamically import service to handle ES module resolution
    let servicePath
    if (app.isPackaged) {
      servicePath = path.join(process.resourcesPath, 'src', 'services', 'SubAssemblyRuleEngine.js')
    } else {
      servicePath = path.join(__dirname, '..', 'src', 'services', 'SubAssemblyRuleEngine.js')
    }
    
    // Verify file exists
    try {
      await fs.access(servicePath)
    } catch {
      throw new Error(`Service file not found: ${servicePath}`)
    }
    
    const serviceURL = pathToFileURL(servicePath).href
    const { default: SubAssemblyRuleEngine } = await import(serviceURL)
    
    // Load template if product code is available
    let template = null
    if (quoteObject?.projectCodes?.product) {
      try {
        const userTemplatePath = path.join(dataPath, 'product-templates', `${quoteObject.projectCodes.product}.json`)
        let templatePath = ''
        
        try {
          await fs.access(userTemplatePath)
          templatePath = userTemplatePath
        } catch {
          const srcDir = app.isPackaged
            ? path.join(process.resourcesPath, 'src')
            : path.join(__dirname, '..', 'src')
          const bundledTemplatePath = path.join(srcDir, 'data', 'product-templates', `${quoteObject.projectCodes.product}.json`)
          
          try {
            await fs.access(bundledTemplatePath)
            templatePath = bundledTemplatePath
          } catch {
            // Template not found, continue without it
          }
        }
        
        if (templatePath) {
          const data = await fs.readFile(templatePath, 'utf-8')
          template = JSON.parse(data)
          
          // Apply template migration to ensure v2.0 structure
          let migrationServicePath
          if (app.isPackaged) {
            migrationServicePath = path.join(process.resourcesPath, 'src', 'services', 'TemplateMigrationService.js')
          } else {
            migrationServicePath = path.join(__dirname, '..', 'src', 'services', 'TemplateMigrationService.js')
          }
          
          try {
            const migrationURL = pathToFileURL(migrationServicePath).href
            const { migrateTemplate } = await import(migrationURL)
            template = migrateTemplate(template)
          } catch (migrationError) {
            console.warn('Error migrating template for rule evaluation:', migrationError)
          }
        }
      } catch (err) {
        console.warn('Error loading template for rule evaluation:', err)
      }
    }

    // Evaluate sub-assembly rules
    const result = SubAssemblyRuleEngine.evaluateSubAssemblyRules(template, quoteObject)

    return {
      success: true,
      requiredSubAssemblies: result.requiredSubAssemblies || [],
      recommendedSubAssemblies: result.recommendedSubAssemblies || []
    }
  } catch (error) {
    console.error('Error evaluating sub-assembly rules:', error)
    return {
      success: false,
      error: error.message,
      requiredSubAssemblies: [],
      recommendedSubAssemblies: []
    }
  }
})

// Generate operational items from quote configuration
ipcMain.handle('quotes:generate-oi', async (event, quoteObject) => {
  try {
    // Dynamically import service to handle ES module resolution
    // Use pathToFileURL for proper file:// URL conversion
    let servicePath
    if (app.isPackaged) {
      // In production, use resources path
      servicePath = path.join(process.resourcesPath, 'src', 'services', 'BOMGenerationService.js')
    } else {
      // In development, use relative path from electron/ directory
      servicePath = path.join(__dirname, '..', 'src', 'services', 'BOMGenerationService.js')
    }
    
    // Verify file exists
    try {
      await fs.access(servicePath)
    } catch {
      throw new Error(`Service file not found: ${servicePath}`)
    }
    
    const serviceURL = pathToFileURL(servicePath).href
    const { default: BOMGenerationService } = await import(serviceURL)
    
    // Load all necessary data
    const allAssemblies = await getAllSubAssemblies()
    const allComponents = loadedComponents
    
    // Load template if product code is available
    let template = null
    if (quoteObject?.projectCodes?.product) {
      try {
        // Use the same template loading logic as product-templates:get handler
        // This ensures template migration is applied
        const userTemplatePath = path.join(dataPath, 'product-templates', `${quoteObject.projectCodes.product}.json`)
        let templatePath = ''
        
        try {
          await fs.access(userTemplatePath)
          templatePath = userTemplatePath
        } catch {
          // Fall back to bundled templates
          const srcDir = app.isPackaged
            ? path.join(process.resourcesPath, 'src')
            : path.join(__dirname, '..', 'src')
          const bundledTemplatePath = path.join(srcDir, 'data', 'product-templates', `${quoteObject.projectCodes.product}.json`)
          
          try {
            await fs.access(bundledTemplatePath)
            templatePath = bundledTemplatePath
          } catch {
            // Template not found, continue without it
          }
        }
        
        if (templatePath) {
          const data = await fs.readFile(templatePath, 'utf-8')
          template = JSON.parse(data)
          
          // Apply template migration to ensure v2.0 structure
          let migrationServicePath
          if (app.isPackaged) {
            migrationServicePath = path.join(process.resourcesPath, 'src', 'services', 'TemplateMigrationService.js')
          } else {
            migrationServicePath = path.join(__dirname, '..', 'src', 'services', 'TemplateMigrationService.js')
          }
          
          try {
            const migrationURL = pathToFileURL(migrationServicePath).href
            const { migrateTemplate } = await import(migrationURL)
            template = migrateTemplate(template)
          } catch (migrationError) {
            console.warn('Error migrating template for OI generation:', migrationError)
            // Continue with unmigrated template (may cause issues, but better than crashing)
          }
        }
      } catch (err) {
        console.warn('Error loading template for OI generation:', err)
      }
    }

    // Generate operational items
    const operationalItems = BOMGenerationService.generateOperationalItems(
      quoteObject,
      allAssemblies,
      allComponents,
      template
    )

    return {
      success: true,
      operationalItems
    }
  } catch (error) {
    console.error('Error generating operational items:', error)
    return {
      success: false,
      error: error.message,
      operationalItems: []
    }
  }
})

// Validate quote configuration
ipcMain.handle('quotes:validate', async (event, quoteObject) => {
  try {
    // Dynamically import service to handle ES module resolution
    // Use pathToFileURL for proper file:// URL conversion
    let servicePath
    if (app.isPackaged) {
      servicePath = path.join(process.resourcesPath, 'src', 'services', 'ValidationService.js')
    } else {
      servicePath = path.join(__dirname, '..', 'src', 'services', 'ValidationService.js')
    }
    
    // Verify file exists
    try {
      await fs.access(servicePath)
    } catch {
      throw new Error(`Service file not found: ${servicePath}`)
    }
    
    const serviceURL = pathToFileURL(servicePath).href
    const { default: ValidationService } = await import(serviceURL)
    
    // Load all necessary data
    const allAssemblies = await getAllSubAssemblies()
    const allComponents = loadedComponents
    
    // Load template if product code is available
    let template = null
    if (quoteObject?.projectCodes?.product) {
      try {
        const userFilePath = path.join(dataPath, 'product-templates', `${quoteObject.projectCodes.product}.json`)
        try {
          const data = await fs.readFile(userFilePath, 'utf-8')
          template = JSON.parse(data)
        } catch {
          // Try source directory
          let filePath
          if (app.isPackaged) {
            filePath = path.join(process.resourcesPath, 'data', 'product-templates', `${quoteObject.projectCodes.product}.json`)
          } else {
            filePath = path.join(__dirname, '..', 'src', 'data', 'product-templates', `${quoteObject.projectCodes.product}.json`)
          }
          try {
            const data = await fs.readFile(filePath, 'utf-8')
            template = JSON.parse(data)
          } catch {
            // Template not found
          }
        }
      } catch (err) {
        console.warn('Error loading template for validation:', err)
      }
    }

    // Validate quote configuration
    const validationErrors = ValidationService.validateQuoteConfiguration(
      quoteObject,
      template,
      allAssemblies,
      allComponents
    )

    return {
      success: true,
      validationErrors
    }
  } catch (error) {
    console.error('Error validating quote:', error)
    return {
      success: false,
      error: error.message,
      validationErrors: []
    }
  }
})


// Schemas IPC handlers

ipcMain.handle('schemas:getIndustry', async () => {
  try {
    let schemaPath;
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      schemaPath = path.join(__dirname, '..', 'src', 'data', 'quotes', 'project_quote_schema.json');
    } else {
      schemaPath = path.join(process.resourcesPath, 'app.asar', 'src', 'data', 'quotes', 'project_quote_schema.json');
    }
    
    const data = await fs.readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(data);
    
    // Extract industry codes from the schema
    const industryCodes = schema.properties?.projectCodes?.properties?.industry?.oneOf || [];
    
    return industryCodes.map(item => ({
      const: item.const,
      description: item.description
    }));
  } catch (err) {
    console.error('Error loading industry schema:', err);
    return [
      { const: 10, description: "Chemical & Pharmaceutical Industries" },
      { const: 20, description: "Food & Beverage Industries" },
      { const: 30, description: "Utilities & Infrastructure" },
      { const: 40, description: "Manufacturing Industries" },
      { const: 99, description: "Other (Not Categorized)" }
    ];
  }
});

ipcMain.handle('schemas:getProduct', async () => {
  try {
    let schemaPath;
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      schemaPath = path.join(__dirname, '..', 'src', 'data', 'quotes', 'project_quote_schema.json');
    } else {
      schemaPath = path.join(process.resourcesPath, 'app.asar', 'src', 'data', 'quotes', 'project_quote_schema.json');
    }
    
    console.log('Loading product schema from:', schemaPath);
    const data = await fs.readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(data);
    
    // Extract product codes from the schema
    const productCodes = schema.properties?.projectCodes?.properties?.product?.oneOf || [];
    
    console.log('Loaded product codes:', productCodes.length, 'products');
    console.log('First 3 products:', productCodes.slice(0, 3));
    
    // Convert to expected format: { const: number, description: string }
    return productCodes.map(item => ({
      const: item.const,
      description: item.description
    }));
  } catch (err) {
    console.error('Error loading product schema:', err);
    // Fallback to minimal list
    return [
      { const: 100, description: "Field Instrument - General" },
      { const: 200, description: "Control Valve - General" },
      { const: 300, description: "Analyzer - General" },
      { const: 400, description: "Panel/Enclosure - General" }
    ];
  }
});

ipcMain.handle('schemas:getControl', async () => {
  try {
    let schemaPath;
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      schemaPath = path.join(__dirname, '..', 'src', 'data', 'quotes', 'project_quote_schema.json');
    } else {
      schemaPath = path.join(process.resourcesPath, 'app.asar', 'src', 'data', 'quotes', 'project_quote_schema.json');
    }
    
    const data = await fs.readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(data);
    
    // Extract control codes from the schema
    const controlCodes = schema.properties?.projectCodes?.properties?.control?.oneOf || [];
    
    return controlCodes.map(item => ({
      const: item.const,
      description: item.description
    }));
  } catch (err) {
    console.error('Error loading control schema:', err);
    return [
      { const: 1, description: "Pneumatic Control" },
      { const: 2, description: "Electronic Control" },
      { const: 3, description: "Digital Control" },
      { const: 4, description: "Hybrid Control" }
    ];
  }
});

ipcMain.handle('schemas:getScope', async () => {
  try {
    let schemaPath;
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      schemaPath = path.join(__dirname, '..', 'src', 'data', 'quotes', 'project_quote_schema.json');
    } else {
      schemaPath = path.join(process.resourcesPath, 'app.asar', 'src', 'data', 'quotes', 'project_quote_schema.json');
    }
    
    const data = await fs.readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(data);
    
    // Extract scope codes from the schema
    const scopeCodes = schema.properties?.projectCodes?.properties?.scope?.oneOf || [];
    
    return scopeCodes.map(item => ({
      const: item.const,
      description: item.description
    }));
  } catch (err) {
    console.error('Error loading scope schema:', err);
    return [
      { const: 10, description: "Design Only" },
      { const: 20, description: "Supply Only" },
      { const: 30, description: "Install Only" },
      { const: 70, description: "Design, Supply & Install" },
      { const: 90, description: "Service & Maintenance" },
      { const: 99, description: "Other (Custom Scope)" }
    ];
  }
});

// New schemas handlers with hyphenated names
const MOCK_INDUSTRY_SCHEMA = [
  { const: 10, description: "Alcohol: Brewing" },
  { const: 11, description: "Alcohol: Distillation" },
  { const: 12, description: "Alcohol: Fermentation" },
  { const: 20, description: "Food: Food&Bev" },
  { const: 30, description: "Water: Water Treatment" },
  { const: 31, description: "Water: Waste Water" },
  { const: 40, description: "Manufacturing: Material Handling" },
  { const: 41, description: "Manufacturing: Packaging" },
  { const: 50, description: "Bio/Chem: Pharma" },
  { const: 99, description: "General Industry" }
];

const MOCK_PRODUCT_SCHEMA = [
  { const: 100, description: "Brewery: Brewhouse" },
  { const: 101, description: "Brewery: 2 Vessel" },
  { const: 120, description: "Fermentation: Cellar" },
  { const: 130, description: "Grain: Grain Handling" },
  { const: 140, description: "Motor Control: Motor" },
  { const: 160, description: "Sanitary: CIP" },
  { const: 999, description: "General Product" }
];

const MOCK_CONTROL_SCHEMA = [
  { const: 1, description: "Automated" },
  { const: 2, description: "Manual" },
  { const: 3, description: "Termination" },
  { const: 9, description: "None" }
];

const MOCK_SCOPE_SCHEMA = [
  { const: 10, description: "Production: New Build" },
  { const: 11, description: "Production: Modification" },
  { const: 20, description: "Field: Commissioning" },
  { const: 40, description: "Engineering: Engineering (Hard)" },
  { const: 50, description: "Admin: Warranty" },
  { const: 99, description: "General Scope" }
];

ipcMain.handle('schemas:get-industry', () => { return MOCK_INDUSTRY_SCHEMA; });
ipcMain.handle('schemas:get-product', async () => {
  try {
    let schemaPath;
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      schemaPath = path.join(__dirname, '..', 'src', 'data', 'quotes', 'project_quote_schema.json');
    } else {
      schemaPath = path.join(process.resourcesPath, 'app.asar', 'src', 'data', 'quotes', 'project_quote_schema.json');
    }
    
    const data = await fs.readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(data);
    
    // Extract product codes from the schema
    const productCodes = schema.properties?.projectCodes?.properties?.product?.oneOf || [];
    
    // Convert to expected format: { const: number, description: string }
    return productCodes.map(item => ({
      const: item.const,
      description: item.description
    }));
  } catch (err) {
    console.error('Error reading product schema:', err);
    return MOCK_PRODUCT_SCHEMA; // Fallback to mock data
  }
});

// Add product handler with hyphenated name
ipcMain.handle('schemas:add-product', async (event, productData) => {
  try {
    let schemaPath;
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      schemaPath = path.join(__dirname, '..', 'src', 'data', 'quotes', 'project_quote_schema.json');
    } else {
      schemaPath = path.join(process.resourcesPath, 'app.asar', 'src', 'data', 'quotes', 'project_quote_schema.json');
    }
    
    // Read current schema
    const data = await fs.readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(data);
    
    // Get current product list
    const productCodes = schema.properties?.projectCodes?.properties?.product?.oneOf || [];
    
    // Check if product already exists
    if (productCodes.find(p => p.const === productData.const)) {
      return { success: false, error: 'Product code already exists' };
    }
    
    // Add new product
    productCodes.push({
      const: productData.const,
      description: productData.description
    });
    
    // Sort by const value
    productCodes.sort((a, b) => a.const - b.const);
    
    // Update schema
    schema.properties.projectCodes.properties.product.oneOf = productCodes;
    
    // Write back to file
    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2), 'utf-8');
    
    console.log(`[Schema] Added new product: ${productData.const} - ${productData.description}`);
    
    return { success: true };
  } catch (err) {
    console.error('Error adding product to schema:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('schemas:get-control', () => { return MOCK_CONTROL_SCHEMA; });
ipcMain.handle('schemas:get-scope', () => { return MOCK_SCOPE_SCHEMA; });

// Panel Config Options IPC handler
ipcMain.handle('schemas:get-panel-options', async () => {
  try {
    let panelOptionsPath;
    if (app.isPackaged) {
      panelOptionsPath = path.join(process.resourcesPath, 'data', 'schemas', 'panel_config_options.json');
    } else {
      panelOptionsPath = path.join(__dirname, '..', 'src', 'data', 'schemas', 'panel_config_options.json');
    }
    const data = await fs.readFile(panelOptionsPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading panel config options:', err);
    // Return empty structure if file not found
    return {
      voltage: [],
      phase: [],
      enclosureType: [],
      enclosureRating: [],
      hmiSize: [],
      plcPlatform: []
    };
  }
});

// Default IO Fields IPC handler
ipcMain.handle('schemas:get-default-io-fields', async () => {
  try {
    let defaultFieldsPath;
    if (app.isPackaged) {
      defaultFieldsPath = path.join(process.resourcesPath, 'data', 'schemas', 'default_io_fields.json');
    } else {
      defaultFieldsPath = path.join(__dirname, '..', 'src', 'data', 'schemas', 'default_io_fields.json');
    }
    const data = await fs.readFile(defaultFieldsPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading default IO fields:', err);
    // Return empty structure if file not found
    return {
      digitalIn: [],
      analogIn: [],
      digitalOut: [],
      analogOut: []
    };
  }
});

// Customers IPC handlers

ipcMain.handle('customers:getAll', async () => {
  try {
    // Load custom customers from database
    const customCustomers = await readJSONFile('settings.json') || {}
    const customCustomerData = customCustomers.customCustomers ? JSON.parse(customCustomers.customCustomers) : {}
    
    // Merge with default customers
    const allCustomers = { ...DEFAULT_CUSTOMER_DATA, ...customCustomerData }
    
    // Convert to array format expected by plugins
    return Object.entries(allCustomers).map(([id, name]) => ({
      id: id,
      name: name
    }))
  } catch (err) {
    console.error('Error loading customers:', err)
    // Fallback to defaults
    return Object.entries(DEFAULT_CUSTOMER_DATA).map(([id, name]) => ({
      id: id,
      name: name
    }))
  }
});

// New customers handler with hyphenated name
const MOCK_CUSTOMERS = Object.entries(DEFAULT_CUSTOMER_DATA).map(([id, name]) => ({
  id: id,
  name: name
}));

ipcMain.handle('customers:get-all', () => { return MOCK_CUSTOMERS; });

// Add customer
ipcMain.handle('customers:add', async (event, { name, isOEM }) => {
  try {
    // Load existing custom customers
    const settings = await readJSONFile('settings.json') || {}
    const customCustomerData = settings.customCustomers ? JSON.parse(settings.customCustomers) : {}
    const allCustomers = { ...DEFAULT_CUSTOMER_DATA, ...customCustomerData }
    
    // Determine the next available number
    const existingIds = Object.keys(allCustomers).map(id => parseInt(id))
    const rangeStart = isOEM ? 0 : 100
    const rangeEnd = isOEM ? 99 : 999
    
    let nextId = rangeStart
    for (let i = rangeStart; i <= rangeEnd; i++) {
      if (!existingIds.includes(i)) {
        nextId = i
        break
      }
    }
    
    // Validate we found an available ID
    if (nextId > rangeEnd) {
      throw new Error(`No available ${isOEM ? 'OEM' : 'End User'} customer numbers`)
    }
    
    const customerId = String(nextId).padStart(3, '0')
    
    // Add to custom customers
    customCustomerData[customerId] = name
    settings.customCustomers = JSON.stringify(customCustomerData)
    
    // Save to settings.json
    await writeJSONFile('settings.json', settings)
    
    // Log customer creation using LoggingService
    // Import LoggingService dynamically to avoid circular dependencies
    let loggingService;
    try {
      const loggingServicePath = path.join(__dirname, '..', 'src', 'services', 'LoggingService.js');
      const loggingServiceURL = pathToFileURL(loggingServicePath).href;
      const { default: LoggingService } = await import(loggingServiceURL);
      loggingService = LoggingService;
      loggingService.logCustomerActivity('create', customerId, name, {
        type: isOEM ? 'OEM' : 'End User',
        source: 'settings_ui'
      });
    } catch (logError) {
      console.error('Error logging customer creation:', logError);
    }
    
    return { id: customerId, name, isOEM }
  } catch (err) {
    console.error('Error adding customer:', err)
    throw err
  }
});

// Delete customer
ipcMain.handle('customers:delete', async (event, customerId) => {
  try {
    const settings = await readJSONFile('settings.json') || {}
    const customCustomerData = settings.customCustomers ? JSON.parse(settings.customCustomers) : {}
    
    // Only allow deletion of custom customers (not defaults)
    if (!customCustomerData[customerId]) {
      throw new Error('Cannot delete default customer')
    }
    
    delete customCustomerData[customerId]
    settings.customCustomers = JSON.stringify(customCustomerData)
    
    await writeJSONFile('settings.json', settings)
    return { success: true }
  } catch (err) {
    console.error('Error deleting customer:', err)
    throw err
  }
});

// Update customer
ipcMain.handle('customers:update', async (event, { id, name }) => {
  try {
    const settings = await readJSONFile('settings.json') || {}
    const customCustomerData = settings.customCustomers ? JSON.parse(settings.customCustomers) : {}
    
    // Only allow updating custom customers
    if (!customCustomerData[id]) {
      throw new Error('Cannot update default customer')
    }
    
    customCustomerData[id] = name
    settings.customCustomers = JSON.stringify(customCustomerData)
    
    await writeJSONFile('settings.json', settings)
    return { id, name }
  } catch (err) {
    console.error('Error updating customer:', err)
    throw err
  }
});

// Product Templates IPC handlers

// Get product template by product code
ipcMain.handle('product-templates:get', async (event, productCode) => {
  if (!productCode) {
    return null;
  }

  let templatePath = '';
  let template = null;

  try {
    // 1. Check user's custom templates directory first
    const userTemplatePath = path.join(dataPath, 'product-templates', `${productCode}.json`);
    try {
      await fs.access(userTemplatePath);
      templatePath = userTemplatePath;
    } catch (err) {
      // 2. If not found, fall back to bundled templates
      const srcDir = app.isPackaged
        ? path.join(process.resourcesPath, 'src') // Packaged
        : path.join(__dirname, '..', 'src');     // Development
        
      const bundledTemplatePath = path.join(srcDir, 'data', 'product-templates', `${productCode}.json`);
      
      try {
        await fs.access(bundledTemplatePath);
        templatePath = bundledTemplatePath;
      } catch (err2) {
        console.warn(`No template file found for product code: ${productCode}`);
        return null;
      }
    }

    // Read the template file
    const data = await fs.readFile(templatePath, 'utf8');
    if (data) {
      template = JSON.parse(data);

      // --- [NEW] V2.0 MIGRATION LOGIC ---
      if (template) {
        // Define path to the migration service
        let migrationServicePath;
        if (app.isPackaged) {
          migrationServicePath = path.join(process.resourcesPath, 'src', 'services', 'TemplateMigrationService.js');
        } else {
          migrationServicePath = path.join(__dirname, '..', 'src', 'services', 'TemplateMigrationService.js');
        }

        // Convert path to file URL for ES module import
        const serviceURL = pathToFileURL(migrationServicePath).href;
        
        try {
          // Import
          const { migrateTemplate } = await import(serviceURL);
          
          // Auto-migrate the template to the v2.0 structure in memory
          const migratedTemplate = migrateTemplate(template);
          
          // Return the migrated, v2.0 compatible template to the UI
          return migratedTemplate;
        } catch (importError) {
          console.error('Error importing TemplateMigrationService:', importError);
          // If migration fails, return original template (better than crashing)
          return template;
        }
      }
      // --- END OF MIGRATION LOGIC ---
    }
    
    // Fallback (should not be reached if migration is successful)
    return template;
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null; // Template doesn't exist
    }
    console.error(`Error loading product template ${productCode}:`, error);
    return null;
  }
})

// Save product template
ipcMain.handle('product-templates:save', async (event, templateObject) => {
  try {
    // Load product template schema
    let templateSchemaPath
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      templateSchemaPath = path.join(__dirname, '..', 'src', 'data', 'schemas', 'product_template_schema.json')
    } else {
      templateSchemaPath = path.join(process.resourcesPath, 'app.asar', 'src', 'data', 'schemas', 'product_template_schema.json')
    }
    
    const schemaData = await fs.readFile(templateSchemaPath, 'utf-8')
    const templateSchema = JSON.parse(schemaData)
    const ajv = new Ajv()
    const validate = ajv.compile(templateSchema)
    
    // Validate the template
    const valid = validate(templateObject)
    if (!valid) {
      return { success: false, errors: validate.errors }
    }
    
    // Ensure the product-templates directory exists
    const templatesDir = path.join(dataPath, 'product-templates')
    await fs.mkdir(templatesDir, { recursive: true })
    
    const filePath = path.join(templatesDir, `${templateObject.productCode}.json`)
    await fs.writeFile(filePath, JSON.stringify(templateObject, null, 2), 'utf-8')
    return { success: true, path: filePath }
  } catch (err) {
    console.error('Error saving product template:', err)
    throw err
  }
})

// ===========================
// Manual BOM IPC Handlers
// ===========================

ipcMain.handle('boms:get-all', async () => {
  try {
    const bomsPath = path.join(dataPath, 'manual_boms.json')
    
    // Check if file exists
    try {
      await fs.access(bomsPath)
    } catch {
      // File doesn't exist, return empty array
      return []
    }
    
    const data = await fs.readFile(bomsPath, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    console.error('Error reading manual BOMs:', err)
    throw err
  }
})

ipcMain.handle('boms:get-by-id', async (event, bomId) => {
  try {
    const bomsPath = path.join(dataPath, 'manual_boms.json')
    
    try {
      await fs.access(bomsPath)
    } catch {
      return null
    }
    
    const data = await fs.readFile(bomsPath, 'utf-8')
    const boms = JSON.parse(data)
    return boms.find(b => b.bomId === bomId) || null
  } catch (err) {
    console.error('Error getting BOM by ID:', err)
    throw err
  }
})

ipcMain.handle('boms:save', async (event, bomToSave) => {
  try {
    // Load manual BOM schema
    let bomSchemaPath
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      bomSchemaPath = path.join(__dirname, '..', 'src', 'data', 'schemas', 'manual_bom_schema.json')
    } else {
      bomSchemaPath = path.join(process.resourcesPath, 'app.asar', 'src', 'data', 'schemas', 'manual_bom_schema.json')
    }
    
    const schemaData = await fs.readFile(bomSchemaPath, 'utf-8')
    const bomSchema = JSON.parse(schemaData)
    const ajv = new Ajv()
    const validate = ajv.compile(bomSchema)
    
    // Validate the BOM
    const valid = validate(bomToSave)
    if (!valid) {
      throw new Error(`Validation failed: ${JSON.stringify(validate.errors)}`)
    }
    
    const bomsPath = path.join(dataPath, 'manual_boms.json')
    
    // Read existing BOMs
    let boms = []
    try {
      await fs.access(bomsPath)
      const data = await fs.readFile(bomsPath, 'utf-8')
      boms = JSON.parse(data)
    } catch {
      // File doesn't exist, start with empty array
      boms = []
    }
    
    // Always add as new entry (versioning)
    boms.push(bomToSave)
    
    // Write back to file
    await fs.writeFile(bomsPath, JSON.stringify(boms, null, 2), 'utf-8')
    
    return { success: true, bom: bomToSave }
  } catch (err) {
    console.error('Error saving BOM:', err)
    throw err
  }
})

ipcMain.handle('boms:expand-bom', async (event, payload = {}) => {
  try {
    const subAssemblyItems = Array.isArray(payload?.subAssemblies) && payload.subAssemblies.length > 0
      ? payload.subAssemblies
      : Array.isArray(payload?.assemblies)
        ? payload.assemblies
        : [];
    const componentItems = Array.isArray(payload?.components) ? payload.components : [];
    let totalCost = 0
    
    // Expand sub-assemblies
    for (const item of subAssemblyItems) {
      const subAssemblyId = item?.subAssemblyId || item?.assemblyId
      const quantity = Number(item?.quantity) || 0

      if (!subAssemblyId || quantity <= 0) {
        continue
      }

      const expansion = await expandSubAssemblyById(subAssemblyId)
      if (expansion && typeof expansion.totalCost === 'number') {
        totalCost += expansion.totalCost * quantity
      }
    }
    
    // Expand components
    for (const item of componentItems) {
      const sku = item?.sku?.trim()
      const quantity = Number(item?.quantity) || 0

      if (!sku || quantity <= 0) {
        continue
      }

      const component = loadedComponents.find(c => c.sku === sku)
      if (component && typeof component.price === 'number') {
        totalCost += component.price * quantity
      }
    }
    
    return { success: true, totalMaterialCost: totalCost }
  } catch (err) {
    console.error('Error expanding BOM:', err)
    throw err
  }
})

// File I/O IPC handlers

// Show open dialog
ipcMain.handle('app:show-open-dialog', async (event, options) => {
  return dialog.showOpenDialog(options)
})

// Read file
ipcMain.handle('app:read-file', async (event, filePath) => {
  const fullPath = await resolveRuntimePathWithCredentials(filePath, mainWindow)

  if (resolvedRuntimeRoot) {
    console.log(`[app:read-file] overridden root => ${fullPath}`)
  }

  return fs.readFile(fullPath, 'utf-8')
})

// Write file
ipcMain.handle('app:write-file', async (event, filePath, content) => {
  const fullPath = await resolveRuntimePathWithCredentials(filePath, mainWindow)
  await ensureDirectoryForFile(fullPath)

  if (resolvedRuntimeRoot) {
    console.log(`[app:write-file] overridden root => ${fullPath}`)
  }

  return fs.writeFile(fullPath, content, 'utf-8')
})

ipcMain.handle('app:log-margin-calculation', async (event, marginData) => {
  await logMarginCalculation(marginData)
})

ipcMain.handle('runtime:get-status', async () => {
  try {
    return await getRuntimeStatus()
  } catch (err) {
    console.error('Failed to resolve runtime status:', err)
    return {
      runtimeRoot: await resolveRuntimePath(),
      usingOverride: Boolean(resolvedRuntimeRoot),
      ok: false,
      message: `Failed to resolve runtime status: ${err.message}`,
      error: err.message
    }
  }
})

// Pipedrive IPC handlers

// TODO: Implement real Pipedrive API call using axios. Requires API key and base URL.
ipcMain.handle('pipedrive:get-deals', async () => {
  // Mock data for now - same as in the HTML file
  const MOCK_PIPEDRIVE_DEALS = [
    { id: 1001, title: "ABC Brewing - New Brewhouse", org_name: "ABC Brewing", owner_name: "Sales Rep 1", stage: "Lead", value: 50000, add_time: "2025-10-20T10:00:00Z" },
    { id: 1002, title: "XYZ Distilling - Cellar Expansion", org_name: "XYZ Distilling", owner_name: "Sales Rep 2", stage: "Contact Made", value: 25000, add_time: "2025-10-18T14:30:00Z" },
    { id: 1003, title: "FoodBev Co - CIP Skid", org_name: "FoodBev Co", owner_name: "Sales Rep 1", stage: "Proposal Sent", value: 15000, add_time: "2025-10-15T09:15:00Z" },
  ];
  
  return MOCK_PIPEDRIVE_DEALS;
});

// Dashboard API handlers

ipcMain.handle('api:get-recent-quotes', async () => {
  try {
    const quotes = await readJSONFile('projects.json') || [];
    // Sort by createdAt desc and take first 5
    return quotes
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(q => ({
        quoteId: q.quoteNumber,
        projectName: q.projectNumber,
        customer: q.customer,
        status: 'Draft', // TODO: Add status to project schema
        lastModified: q.createdAt
      }));
  } catch (err) {
    console.error('Error loading recent quotes:', err);
    return [];
  }
});

ipcMain.handle('api:get-plugin-registry', async () => {
  try {
    // Read from src/data directory, not user data directory
    const registryPath = isDev 
      ? path.join(__dirname, '..', 'src', 'data', 'plugin_registry.json')
      : path.join(process.resourcesPath, 'app.asar', 'dist', 'plugin_registry.json');
    console.log('isDev:', isDev);
    console.log('Reading plugin registry from:', registryPath);
    const data = await fs.readFile(registryPath, 'utf-8');
    const registry = JSON.parse(data);
    console.log('Loaded plugin registry:', registry.length, 'plugins');
    return registry || [];
  } catch (err) {
    console.error('Error loading plugin registry:', err);
    return [];
  }
});

ipcMain.handle('api:get-toolbox-manifest', async () => {
  try {
    // Read toolbox manifest from public/toolbox directory
    const manifestPath = isDev 
      ? path.join(__dirname, '..', 'public', 'toolbox', 'manifest.json')
      : path.join(process.resourcesPath, 'app.asar', 'dist', 'toolbox', 'manifest.json');
    console.log('Reading toolbox manifest from:', manifestPath);
    const data = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(data);
    console.log('Loaded toolbox manifest:', manifest.length, 'tools');
    return manifest || [];
  } catch (err) {
    console.error('Error loading toolbox manifest:', err);
    return [];
  }
});

ipcMain.handle('api:get-tool-file-url', async (event, relativePath) => {
  try {
    // Convert relative paths like /toolbox/file.html to file:// URLs
    if (relativePath.startsWith('/toolbox/')) {
      const fileName = relativePath.replace('/toolbox/', '');
      const filePath = isDev 
        ? path.join(__dirname, '..', 'public', 'toolbox', fileName)
        : path.join(process.resourcesPath, 'app.asar', 'dist', 'toolbox', fileName);
      
      // Check if file exists
      await fs.access(filePath);
      
      // Return file:// URL
      return 'file://' + filePath;
    }
    return relativePath;
  } catch (err) {
    console.error('Error getting tool file URL:', err);
    return relativePath;
  }
});

ipcMain.handle('api:get-logo-url', async () => {
  const filePath = isDev 
    ? path.join(__dirname, '..', 'public', 'Craft_Logo.png')
    : path.join(process.resourcesPath, 'app.asar', 'dist', 'Craft_Logo.png');
  try {
    await fs.access(filePath);
    return 'file://' + filePath;
  } catch (err) {
    console.error('Error getting logo URL:', err);
    return '/Craft_Logo.png'; // fallback
  }
});

ipcMain.handle('api:get-useful-links', async () => {
  try {
    const userLinksPath = path.join(dataPath, 'useful_links.json');
    const defaultPath = isDev 
      ? path.join(__dirname, '..', 'src', 'data', 'useful_links.json')
      : path.join(process.resourcesPath, 'app.asar', 'dist', 'useful_links.json');
    
    let data;
    try {
      // Try to read from user data first
      data = await fs.readFile(userLinksPath, 'utf-8');
      console.log('Loaded useful links from user data');
    } catch {
      // Fallback to defaults if user file doesn't exist
      data = await fs.readFile(defaultPath, 'utf-8');
      console.log('Loaded useful links from defaults');
    }
    const links = JSON.parse(data);
    return links || [];
  } catch (err) {
    console.error('Error loading useful links:', err);
    return [];
  }
});

ipcMain.handle('api:get-doc-hub-items', async () => {
  try {
    const userDocsPath = path.join(dataPath, 'doc_hub_items.json');
    const defaultPath = isDev 
      ? path.join(__dirname, '..', 'src', 'data', 'doc_hub_items.json')
      : path.join(process.resourcesPath, 'app.asar', 'dist', 'doc_hub_items.json');
    
    let data;
    try {
      // Try to read from user data first
      data = await fs.readFile(userDocsPath, 'utf-8');
      console.log('Loaded doc hub items from user data');
    } catch {
      // Fallback to defaults if user file doesn't exist
      data = await fs.readFile(defaultPath, 'utf-8');
      console.log('Loaded doc hub items from defaults');
    }
    const docs = JSON.parse(data);
    return docs || [];
  } catch (err) {
    console.error('Error loading doc hub items:', err);
    return [];
  }
});

// Dashboard Settings IPC handlers
ipcMain.handle('api:get-dashboard-settings', async () => {
  try {
    const settingsPath = path.join(dataPath, 'dashboard_settings.json');
    const defaultPath = isDev 
      ? path.join(__dirname, '..', 'src', 'data', 'dashboard_settings.json')
      : path.join(process.resourcesPath, 'app.asar', 'dist', 'dashboard_settings.json');
    
    let data;
    try {
      data = await fs.readFile(settingsPath, 'utf-8');
    } catch {
      // Use default if user settings don't exist
      data = await fs.readFile(defaultPath, 'utf-8');
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading dashboard settings:', err);
    return {
      theme: 'slate',
      layout: { 
        showRecentQuotes: true, 
        showDocumentHub: true, 
        showUsefulLinks: true, 
        showWelcomeMessage: true,
        cardStyle: 'expanded'
      },
      welcomeMessage: { enabled: true, title: 'Welcome to Craft Tools Hub', subtitle: 'Your central hub for quotes, projects, and automation tools', showLogo: true },
      customization: { accentColor: 'blue', borderRadius: 'lg', fontFamily: 'default' },
      export: {
        defaultPath: '',
        defaultFormat: 'CSV',
        includeTimestamp: true
      }
    };
  }
});

ipcMain.handle('api:save-dashboard-settings', async (event, settings) => {
  try {
    if (!dataPath) {
      throw new Error('Data path not initialized');
    }
    // Ensure data directory exists
    await fs.mkdir(dataPath, { recursive: true });
    const settingsPath = path.join(dataPath, 'dashboard_settings.json');
    console.log('Saving dashboard settings to:', settingsPath);
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    console.log('Dashboard settings saved successfully');
    return { success: true };
  } catch (err) {
    console.error('Error saving dashboard settings:', err);
    throw err;
  }
});

ipcMain.handle('api:save-useful-links', async (event, links) => {
  try {
    if (!dataPath) {
      throw new Error('Data path not initialized');
    }
    // Ensure data directory exists
    await fs.mkdir(dataPath, { recursive: true });
    const linksPath = path.join(dataPath, 'useful_links.json');
    console.log('Saving useful links to:', linksPath);
    await fs.writeFile(linksPath, JSON.stringify(links, null, 2));
    console.log('Useful links saved successfully');
    return { success: true };
  } catch (err) {
    console.error('Error saving useful links:', err);
    throw err;
  }
});

ipcMain.handle('api:save-doc-hub-items', async (event, docs) => {
  try {
    if (!dataPath) {
      throw new Error('Data path not initialized');
    }
    // Ensure data directory exists
    await fs.mkdir(dataPath, { recursive: true });
    const docsPath = path.join(dataPath, 'doc_hub_items.json');
    console.log('Saving doc hub items to:', docsPath);
    await fs.writeFile(docsPath, JSON.stringify(docs, null, 2));
    console.log('Doc hub items saved successfully');
    return { success: true };
  } catch (err) {
    console.error('Error saving doc hub items:', err);
    throw err;
  }
});

ipcMain.handle('api:load-plugin', async (event, pluginId, context) => {
  return ipcMain.handle('app:load-plugin', event, pluginId, context);
});

// Shell API handlers

ipcMain.handle('shell:open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Error opening external URL:', error);
    return { success: false, error: error.message };
  }
});

// Manual Management System
const MANUALS_DIR = path.join(app.getPath('userData'), 'ComponentManuals');
const MANUALS_INDEX = path.join(app.getPath('userData'), 'data', 'manual_index.json');

function resolveManualKey(source = {}) {
  return source.sku || source.vndrnum || source.id || null;
}

// Ensure manuals directory exists
async function ensureManualsDir() {
  try {
    await fs.mkdir(MANUALS_DIR, { recursive: true });
    await fs.mkdir(path.dirname(MANUALS_INDEX), { recursive: true });
  } catch (error) {
    console.error('Error creating manuals directory:', error);
  }
}

// Load manual index
async function loadManualIndex() {
  try {
    const data = await fs.readFile(MANUALS_INDEX, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {}; // Return empty index if file doesn't exist
  }
}

// Save manual index
async function saveManualIndex(index) {
  await ensureManualsDir();
  await fs.writeFile(MANUALS_INDEX, JSON.stringify(index, null, 2), 'utf8');
}

// Generate smart search URLs for manufacturers
function generateSearchUrls(component) {
  const { sku, manufacturer, vndrnum } = component;
  const partNumber = vndrnum || sku || '';
  const man = (manufacturer || '').toLowerCase();
  
  // Manufacturer-specific search URLs
  const manufacturerUrls = {
    'allen bradley': 'https://literature.rockwellautomation.com/idc/groups/literature/documents/um/' + partNumber + '/en-us.pdf',
    'rockwell': 'https://literature.rockwellautomation.com/idc/groups/literature/documents/um/' + partNumber + '/en-us.pdf',
    'siemens': 'https://support.industry.siemens.com/cs/ww/en/ps/' + partNumber + '/man',
    'schneider': 'https://www.se.com/ww/en/search.html?q=' + encodeURIComponent(partNumber) + '+manual',
    'abb': 'https://search.abb.com/library/Download.aspx?DocumentID=' + partNumber,
    'endress+hauser': 'https://portal.endress.com/wa001/dla/5000000/' + partNumber + '.pdf',
    'endress hauser': 'https://portal.endress.com/wa001/dla/5000000/' + partNumber + '.pdf',
    'festo': 'https://www.festo.com/cat/' + partNumber,
  };
  
  // Check if we have a specific manufacturer URL
  for (const [key, url] of Object.entries(manufacturerUrls)) {
    if (man.includes(key)) {
      return url;
    }
  }
  
  // Fallback to Google search with specific terms
  const numberHint = partNumber || sku || '';
  const searchTerm = encodeURIComponent((manufacturer || '') + ' ' + numberHint + ' manual pdf'.trim());
  return 'https://www.google.com/search?q=' + searchTerm;
}

// Manual System IPC Handlers

ipcMain.handle('manuals:check-local', async (event, component) => {
  try {
    await ensureManualsDir();
    const index = await loadManualIndex();
    
    const key = resolveManualKey(component);
    if (!key) {
      return { found: false };
    }
    const entry = index[key];
    if (entry) {
      if (entry.localPath) {
        // Check if file actually exists
        try {
          await fs.access(entry.localPath);
          return { found: true, path: entry.localPath, type: 'local' };
        } catch {
          // File was deleted, remove the stale path reference
          delete entry.localPath;
          await saveManualIndex(index);
        }
      }

      if (entry.manualUrl) {
        return { found: true, url: entry.manualUrl, type: 'reference' };
      }
    }
    
    return { found: false };
  } catch (error) {
    console.error('Error checking local manual:', error);
    return { found: false };
  }
});

ipcMain.handle('manuals:open-local', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    console.error('Error opening manual:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('manuals:smart-search', async (event, component) => {
  try {
    const url = generateSearchUrls(component);
    return { url };
  } catch (error) {
    console.error('Error generating search URL:', error);
    return { url: null };
  }
});

ipcMain.handle('manuals:save-reference', async (event, data) => {
  try {
    await ensureManualsDir();
    const index = await loadManualIndex();
    
    const key = resolveManualKey(data);
    if (!key) {
      throw new Error('Unable to resolve manual key (missing SKU/VNDRNUM/ID)');
    }
    index[key] = {
      manufacturer: data.manufacturer,
      manualUrl: data.manualUrl,
      savedDate: data.savedDate,
      sku: data.sku || null,
      vndrnum: data.vndrnum || null,
      // Future: could store actual PDF path here when we implement download
      localPath: null
    };
    
    await saveManualIndex(index);
    return { success: true };
  } catch (error) {
    console.error('Error saving manual reference:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('manuals:get-index', async () => {
  try {
    return await loadManualIndex();
  } catch (error) {
    console.error('Error loading manual index:', error);
    return {};
  }
});

// Helper function to log number generation to CSV
async function logNumberGeneration(type, numberData) {
  try {
    const logsDir = await resolveRuntimePathWithCredentials('OUTPUT/LOGS', mainWindow);
    const csvPath = path.join(logsDir, `${type}Numbers.csv`);

    // Ensure LOGS directory exists
    await ensureDirectoryForFile(csvPath);

    // Create CSV header if file doesn't exist
    let fileExists = false;
    try {
      await fs.access(csvPath);
      fileExists = true;
    } catch (error) {
      // File doesn't exist, will create with header
    }

    const timestamp = new Date().toISOString();
    const row = `"${timestamp}","${numberData.mainId}","${numberData.fullId}","${numberData.customerCode}","${numberData.customerName || ''}","${numberData.industry || ''}","${numberData.product || ''}","${numberData.control || ''}","${numberData.scope || ''}","${numberData.poNumber || ''}"`;

    if (!fileExists) {
      const header = '"Timestamp","Main ID","Full ID","Customer Code","Customer Name","Industry","Product","Control","Scope","PO Number"';
      await fs.writeFile(csvPath, header + '\n' + row + '\n', 'utf8');
      console.log(`[${type} Number Log] Created new log file: ${csvPath}`);
    } else {
      await fs.appendFile(csvPath, row + '\n', 'utf8');
    }
    
    console.log(`[${type} Number Log] Generated: ${numberData.fullId} for customer ${numberData.customerName} (${numberData.customerCode})`);
  } catch (error) {
    console.error('Error logging number generation:', error);
  }
}

// Helper function to log margin calculations
async function logMarginCalculation(marginData) {
  try {
    const logsDir = await resolveRuntimePathWithCredentials('OUTPUT/LOGS', mainWindow);
    const csvPath = path.join(logsDir, 'Margin.csv');

    // Ensure LOGS directory exists
    await ensureDirectoryForFile(csvPath);

    // Create CSV header if file doesn't exist
    let fileExists = false;
    try {
      await fs.access(csvPath);
      fileExists = true;
    } catch (error) {
      // File doesn't exist, will create with header
    }

    const timestamp = new Date().toISOString();
    const row = `"${timestamp}","${marginData.quoteId || ''}","${marginData.materialCost || 0}","${marginData.laborCost || 0}","${marginData.totalCOGS || 0}","${marginData.marginPercent || 0}","${marginData.finalPrice || 0}","${marginData.user || ''}"`;

    if (!fileExists) {
      const header = '"Timestamp","Quote ID","Material Cost","Labor Cost","Total COGS","Margin %","Final Price","User"';
      await fs.writeFile(csvPath, header + '\n' + row + '\n', 'utf8');
    } else {
      await fs.appendFile(csvPath, row + '\n', 'utf8');
    }
  } catch (error) {
    console.error('Error logging margin calculation:', error);
  }
}

// Quote Number Generator IPC handler
ipcMain.handle('calc:get-quote-number', async (event, data) => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const cust = data.customerCode ? data.customerCode.toString().padStart(3, '0') : "000";
  const seq = "00"; // Sequence number, hardcoded for now
  
  const mainId = `CA${yy}${mm}${dd}${cust}`;
  const fullId = `${mainId}-${data.industry || 'XX'}${data.product || 'XXX'}${data.control || 'X'}${data.scope || 'XX'}-${seq}`;
  
  // Get customer name from DEFAULT_CUSTOMER_DATA or custom customers
  let customerName = DEFAULT_CUSTOMER_DATA[cust] || '';
  if (!customerName) {
    try {
      const customersPath = path.join(dataPath, 'customers', 'customers.json');
      const customersData = await fs.readFile(customersPath, 'utf-8');
      const customCustomers = JSON.parse(customersData);
      const customer = customCustomers.find(c => c.id === cust);
      customerName = customer ? customer.name : 'Unknown';
    } catch (error) {
      customerName = 'Unknown';
    }
  }
  
  // Log to CSV with full details
  await logNumberGeneration('Quote', { 
    mainId, 
    fullId, 
    customerCode: cust, 
    customerName,
    industry: data.industry,
    product: data.product,
    control: data.control,
    scope: data.scope
  });

  // Store in main database
  try {
    if (serverDb) {
      await serverDb.run(`
        INSERT INTO generated_numbers (
          type, mainId, fullId, customerCode, customerName,
          industry, product, control, scope, generated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'quote', mainId, fullId, cust, customerName,
        data.industry || null, data.product || null, data.control || null, data.scope || null,
        new Date().toISOString()
      ]);
    }
  } catch (error) {
    console.error('Error storing quote number in main database:', error);
  }

  // Store in generated numbers database
  try {
    if (generatedNumbersDb) {
      await generatedNumbersDb.run(`
        INSERT INTO generated_numbers (
          type, mainId, fullId, customerCode, customerName,
          industry, product, control, scope, generated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'quote', mainId, fullId, cust, customerName,
        data.industry || null, data.product || null, data.control || null, data.scope || null,
        new Date().toISOString()
      ]);
    }
  } catch (error) {
    console.error('Error storing quote number in generated numbers database:', error);
  }

  return { mainId, fullId, customerName };
});

ipcMain.handle('calc:get-project-number', async (event, data) => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const cust = data.customerCode ? data.customerCode.toString().padStart(3, '0') : "000";
  const po = data.poNumber || "0000"; // 4-digit PO number
  
  const mainId = `CA${yy}${po}${cust}`;
  const fullId = `${mainId}-${data.industry || 'XX'}${data.product || 'XXX'}${data.control || 'X'}${data.scope || 'XX'}`;
  
  // Get customer name from DEFAULT_CUSTOMER_DATA or custom customers
  let customerName = DEFAULT_CUSTOMER_DATA[cust] || '';
  if (!customerName) {
    try {
      const customersPath = path.join(dataPath, 'customers', 'customers.json');
      const customersData = await fs.readFile(customersPath, 'utf-8');
      const customCustomers = JSON.parse(customersData);
      const customer = customCustomers.find(c => c.id === cust);
      customerName = customer ? customer.name : 'Unknown';
    } catch (error) {
      customerName = 'Unknown';
    }
  }
  
  // Log to CSV with full details
  await logNumberGeneration('Project', { 
    mainId, 
    fullId, 
    customerCode: cust, 
    customerName,
    industry: data.industry,
    product: data.product,
    control: data.control,
    scope: data.scope,
    poNumber: po
  });

  // Store in main database
  try {
    if (serverDb) {
      await serverDb.run(`
        INSERT INTO generated_numbers (
          type, mainId, fullId, customerCode, customerName,
          industry, product, control, scope, poNumber, generated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'project', mainId, fullId, cust, customerName,
        data.industry || null, data.product || null, data.control || null, data.scope || null,
        po, new Date().toISOString()
      ]);
    }
  } catch (error) {
    console.error('Error storing project number in main database:', error);
  }

  // Store in generated numbers database
  try {
    if (generatedNumbersDb) {
      await generatedNumbersDb.run(`
        INSERT INTO generated_numbers (
          type, mainId, fullId, customerCode, customerName,
          industry, product, control, scope, poNumber, generated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'project', mainId, fullId, cust, customerName,
        data.industry || null, data.product || null, data.control || null, data.scope || null,
        po, new Date().toISOString()
      ]);
    }
  } catch (error) {
    console.error('Error storing project number in generated numbers database:', error);
  }

  return { mainId, fullId };
});

// Network credential IPC handlers
ipcMain.handle('network:test-credentials', async (event, { username, password }) => {
  try {
    const success = await testNetworkConnection(username, password);
    return { success, error: success ? null : 'Invalid credentials or network unreachable' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('network:get-stored-credentials', async () => {
  return await loadNetworkCredentials();
});

ipcMain.handle('network:save-credentials', async (event, { username, password }) => {
  const success = await saveNetworkCredentials(username, password);
  if (success) {
    networkCredentials = { username };
  }
  return { success };
});

ipcMain.handle('network:clear-credentials', async () => {
  try {
    const { execSync } = await import('child_process');
    execSync('cmdkey /delete:CraftAuto-Sales', { stdio: 'ignore' });
    networkCredentials = null;
    return { success: true };
  } catch (err) {
    console.error('Failed to clear network credentials:', err);
    return { success: false, error: err.message };
  }
});

// Enhanced runtime status with credential prompting
ipcMain.handle('runtime:get-status-enhanced', async () => {
  try {
    const runtimeRoot = await resolveRuntimePathWithCredentials('', mainWindow);
    const usingOverride = Boolean(resolvedRuntimeRoot) || Boolean(await initializeRuntimeConfig());
    const status = {
      runtimeRoot,
      usingOverride,
      ok: true,
      message: usingOverride ? 'Runtime override active.' : 'Using local runtime.',
      buildInfo: null,
      buildInfoFileModified: null,
      buildInfoAgeMinutes: null
    };

    try {
      await fs.access(runtimeRoot);
    } catch (err) {
      status.ok = !usingOverride;
      status.message = usingOverride
        ? 'Runtime override unavailable: ' + err.message
        : 'Local runtime unavailable: ' + err.message;
      status.error = err.message;
      return status;
    }

    const buildInfoPath = path.join(runtimeRoot, 'build-info.json');

    try {
      const content = await fs.readFile(buildInfoPath, 'utf-8');
      const info = JSON.parse(content);
      status.buildInfo = info;

      const stats = await fs.stat(buildInfoPath);
      status.buildInfoFileModified = stats.mtime.toISOString();

      if (info?.timestampUtc) {
        const parsed = Date.parse(info.timestampUtc);
        if (!Number.isNaN(parsed)) {
          status.buildInfoAgeMinutes = Math.round((Date.now() - parsed) / 60000);
        }
      }

      if (usingOverride) {
        const version = info?.version || 'unknown version';
        const timestamp = info?.timestampUtc || status.buildInfoFileModified;
        status.message = 'NAS build ' + version + ' @ ' + timestamp;
      } else {
        status.message = 'Using local runtime';
      }
    } catch (err) {
      if (usingOverride) {
        status.ok = false;
        status.message = err.code === 'ENOENT'
          ? 'NAS build-info.json not found'
          : 'NAS runtime error: ' + err.message;
        status.error = err.message;
      } else {
        status.message = 'Using local runtime';
      }
    }

    return status;
  } catch (err) {
    console.error('Failed to resolve runtime status:', err);
    return {
      runtimeRoot: await resolveRuntimePath(),
      usingOverride: Boolean(resolvedRuntimeRoot),
      ok: false,
      message: `Failed to resolve runtime status: ${err.message}`,
      error: err.message
    };
  }
});

// Logical Assemblies IPC handlers

// Get all logical assemblies
ipcMain.handle('assemblies:getAll', async () => {
  try {
    const assembliesPath = path.join(dataPath, 'assemblies', 'assemblies.json');
    
    // Check if file exists
    try {
      await fs.access(assembliesPath);
    } catch {
      // File doesn't exist, return empty array
      return [];
    }
    
    const data = await fs.readFile(assembliesPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading logical assemblies:', err);
    return [];
  }
});

// Save a logical assembly
ipcMain.handle('assemblies:save', async (event, assemblyToSave) => {
  try {
    // Load assembly schema for validation
    let assemblySchemaPath;
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      assemblySchemaPath = path.join(__dirname, '..', 'src', 'data', 'schemas', 'assembly_schema.json');
    } else {
      assemblySchemaPath = path.join(process.resourcesPath, 'app.asar', 'src', 'data', 'schemas', 'assembly_schema.json');
    }
    
    const schemaData = await fs.readFile(assemblySchemaPath, 'utf-8');
    const assemblySchema = JSON.parse(schemaData);
    const ajv = new Ajv();
    const validate = ajv.compile(assemblySchema);
    
    // Validate the assembly
    const valid = validate(assemblyToSave);
    if (!valid) {
      return { success: false, errors: validate.errors };
    }
    
    // Ensure assemblies directory exists
    const assembliesDir = path.join(dataPath, 'assemblies');
    await fs.mkdir(assembliesDir, { recursive: true });
    
    const assembliesPath = path.join(assembliesDir, 'assemblies.json');
    
    // Read existing assemblies
    let assemblies = [];
    try {
      await fs.access(assembliesPath);
      const data = await fs.readFile(assembliesPath, 'utf-8');
      assemblies = JSON.parse(data);
    } catch {
      // File doesn't exist, start with empty array
      assemblies = [];
    }
    
    // Find and replace or add new
    const existingIndex = assemblies.findIndex(a => a.assemblyId === assemblyToSave.assemblyId);
    if (existingIndex >= 0) {
      assemblies[existingIndex] = assemblyToSave;
    } else {
      assemblies.push(assemblyToSave);
    }
    
    // Save back to file
    await fs.writeFile(assembliesPath, JSON.stringify(assemblies, null, 2), 'utf-8');
    console.log(`✓ Logical assembly saved to: ${assembliesPath}`);
    console.log(`  - Assembly ID: ${assemblyToSave.assemblyId}`);
    console.log(`  - Display Name: ${assemblyToSave.displayName}`);
    console.log(`  - Total assemblies in file: ${assemblies.length}`);
    
    return { success: true, data: assemblyToSave };
  } catch (err) {
    console.error('Error saving logical assembly:', err);
    throw err;
  }
});

// Get logical assembly by ID
ipcMain.handle('assemblies:getById', async (event, assemblyId) => {
  try {
    const assembliesPath = path.join(dataPath, 'assemblies', 'assemblies.json');
    
    try {
      await fs.access(assembliesPath);
    } catch {
      return null;
    }
    
    const data = await fs.readFile(assembliesPath, 'utf-8');
    const assemblies = JSON.parse(data);
    return assemblies.find(a => a.assemblyId === assemblyId) || null;
  } catch (err) {
    console.error('Error getting logical assembly by ID:', err);
    throw err;
  }
});

// Delete a logical assembly
ipcMain.handle('assemblies:delete', async (event, assemblyId) => {
  try {
    const assembliesPath = path.join(dataPath, 'assemblies', 'assemblies.json');
    
    let assemblies = [];
    try {
      await fs.access(assembliesPath);
      const data = await fs.readFile(assembliesPath, 'utf-8');
      assemblies = JSON.parse(data);
    } catch {
      return { success: false, error: 'Assemblies file not found' };
    }
    
    const initialLength = assemblies.length;
    assemblies = assemblies.filter(a => a.assemblyId !== assemblyId);
    
    await fs.writeFile(assembliesPath, JSON.stringify(assemblies, null, 2), 'utf-8');
    
    return { success: true, changes: initialLength - assemblies.length };
  } catch (err) {
    console.error('Error deleting logical assembly:', err);
    throw err;
  }
});

// Search logical assemblies by filters
ipcMain.handle('assemblies:search', async (event, filters) => {
  try {
    const assemblies = await ipcMain.handle('assemblies:getAll');
    
    let results = assemblies;
    
    if (filters.category) {
      results = results.filter(a => a.category?.toLowerCase().includes(filters.category.toLowerCase()));
    }
    if (filters.assemblyId) {
      results = results.filter(a => a.assemblyId?.toLowerCase().includes(filters.assemblyId.toLowerCase()));
    }
    if (filters.displayName) {
      results = results.filter(a => a.displayName?.toLowerCase().includes(filters.displayName.toLowerCase()));
    }
    if (filters.description) {
      results = results.filter(a => a.description?.toLowerCase().includes(filters.description.toLowerCase()));
    }
    if (filters.tags && Array.isArray(filters.tags)) {
      results = results.filter(a => {
        if (!a.tags || !Array.isArray(a.tags)) return false;
        return filters.tags.some(tag => a.tags.some(assemblyTag => 
          assemblyTag.toLowerCase().includes(tag.toLowerCase())
        ));
      });
    }
    
    return results;
  } catch (err) {
    console.error('Error searching logical assemblies:', err);
    return [];
  }
});

// Get unique categories from logical assemblies
ipcMain.handle('assemblies:getCategories', async () => {
  try {
    const assemblies = await ipcMain.handle('assemblies:getAll');
    const categories = [...new Set(assemblies.map(a => a.category).filter(Boolean))];
    return categories.sort();
  } catch (err) {
    console.error('Error getting assembly categories:', err);
    return [];
  }
});

// Smart CSV header detection - finds the header row automatically
ipcMain.handle('bom-importer:get-csv-headers', async (event, csvContent) => {
  try {
    // Parse first 20 rows to find the header
    const parsed = Papa.parse(csvContent, { preview: 20, header: false });
    
    // Helper function to normalize header names for comparison
    const normalizeHeader = (str) => {
      return str.toLowerCase().replace(/[^a-z0-9]/g, '');
    };
    
    // Find the first row that looks like our header
    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const normalizedRow = row.map(h => normalizeHeader(h));
      
      // Check if this row contains the required header fields (case-insensitive, no spaces)
      const hasProductName = normalizedRow.some(h => h === 'productname');
      const hasAssemblyName = normalizedRow.some(h => h === 'assemblyname');
      const hasSku = normalizedRow.some(h => h === 'sku' || h === 'componentsku');
      const hasQuantity = normalizedRow.some(h => h === 'quantity' || h === 'qty');
      
      if (hasProductName && hasAssemblyName && hasSku && hasQuantity) {
        return { headers: row, headerRowIndex: i };
      }
    }
    
    // If not found, return empty
    return { headers: [], headerRowIndex: 0 };
  } catch (err) {
    console.error('Error parsing CSV headers:', err);
    throw err;
  }
});

// Process full BOM import with attributes support
ipcMain.handle('bom-importer:process-import', async (event, { csvContent, headerRowIndex, columnMap, productCodeMap }) => {
  try {
    console.log('=== BOM Import Process Started ===');
    console.log('Column Map:', columnMap);
    console.log('Product Code Map:', productCodeMap);
    
    // 1. Slice CSV content to start from header row
    const lines = csvContent.split('\n');
    const csvFromHeader = lines.slice(headerRowIndex).join('\n');
    
    // Parse the CSV starting from header
    const parsed = Papa.parse(csvFromHeader, { header: true, skipEmptyLines: true });
    console.log(`Parsed ${parsed.data.length} rows from CSV`);
    
    // 2. Determine paths - sub_assemblies.json is in root dataPath
    const subAssembliesPath = path.join(dataPath, 'sub_assemblies.json');
    const masterListPath = path.join(dataPath, 'schemas', 'product_master_list.json');
    const templatesPath = await resolveRuntimePathWithCredentials('product-templates', mainWindow);
    
    // Ensure directories exist
    await fs.mkdir(path.join(dataPath, 'schemas'), { recursive: true });
    await fs.mkdir(templatesPath, { recursive: true });
    
    // 3. Load data files
    let subAssemblies = [];
    try {
      const assembliesData = fssync.readFileSync(subAssembliesPath, 'utf-8');
      subAssemblies = JSON.parse(assembliesData);
    } catch (err) {
      console.log('Creating new sub_assemblies.json');
      subAssemblies = [];
    }
    
    let masterList = [];
    try {
      const masterData = fssync.readFileSync(masterListPath, 'utf-8');
      masterList = JSON.parse(masterData);
    } catch (err) {
      console.log('Creating new product_master_list.json');
      masterList = [];
    }
    
    // Load product templates
    const templates = {};
    try {
      const templateFiles = await fs.readdir(templatesPath);
      for (const file of templateFiles) {
        if (file.endsWith('.json')) {
          const templateData = fssync.readFileSync(path.join(templatesPath, file), 'utf-8');
          const template = JSON.parse(templateData);
          templates[template.productCode] = template;
        }
      }
    } catch (err) {
      console.log('No existing templates');
    }
    
    // 4. Create lookup maps - track assemblies by a unique key combining product and assembly name
    const subAssemblyLookup = new Map();
    
    // Track stats
    const initialSubAssemblyCount = subAssemblies.length;
    const updatedProducts = new Set();
    
    // 5. Process each row
    for (const row of parsed.data) {
      const assemblyName = row[columnMap.assemblyName];
      const sku = row[columnMap.sku];
      const quantity = parseInt(row[columnMap.quantity]) || 1;
      const productName = row[columnMap.productName];
      
      // Skip if missing required fields
      if (!assemblyName || !sku) {
        console.log('Skipping row - missing required fields:', { assemblyName, sku });
        continue;
      }
      
      console.log(`Processing: Product="${productName}", Sub-Assembly="${assemblyName}", SKU="${sku}"`);
      
      // Build attributes object from optional columns
      const attributes = {};
      if (columnMap.voltage && row[columnMap.voltage]) attributes.voltage = row[columnMap.voltage];
      if (columnMap.amps && row[columnMap.amps]) attributes.amps = row[columnMap.amps];
      if (columnMap.protection && row[columnMap.protection]) attributes.protection = row[columnMap.protection];
      if (columnMap.type && row[columnMap.type]) attributes.type = row[columnMap.type];
      
      // 6. Handle product mapping (create new products if needed)
      let productCode;
      const mapping = productCodeMap[productName];
      
      if (typeof mapping === 'object') {
        // Create new product
        productCode = mapping.newCode;
        if (!masterList.find(p => p.code === productCode)) {
          masterList.push({
            code: mapping.newCode,
            name: mapping.newName,
            description: `Imported from BOM: ${mapping.newName}`
          });
        }
      } else {
        productCode = mapping;
      }
      
      // 7. Find or create assembly - use product+assembly name as unique key
      const subAssemblyKey = `${productName}::${assemblyName}`;
      let subAssembly = subAssemblyLookup.get(subAssemblyKey);
      
      if (!subAssembly) {
        // Create new assembly with random ID
        const randomId = Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
        
        // Use assemblyDescription if provided, otherwise use assemblyName
        const assemblyDesc = (columnMap.assemblyDescription && row[columnMap.assemblyDescription]) 
          ? row[columnMap.assemblyDescription] 
          : assemblyName;
        
        subAssembly = {
          subAssemblyId: `SA-${randomId}`,
          assemblyId: `SA-${randomId}`,
          description: assemblyDesc,
          category: row[columnMap.category] || 'Uncategorized',
          attributes: {},
          components: []
        };
        subAssemblies.push(subAssembly);
        subAssemblyLookup.set(subAssemblyKey, subAssembly);
      }
      
      // 8. Update assembly attributes (merge with existing)
      Object.assign(subAssembly.attributes, attributes);
      
      // 9. Add component to assembly (check for duplicates)
      const existingComponent = subAssembly.components.find(c => c.sku === sku);
      if (!existingComponent) {
        subAssembly.components.push({
          sku,
          quantity,
          notes: row[columnMap.notes] || ''
        });
      }
      
      // 10. Update product template
      if (!templates[productCode]) {
        // Create new product template placeholder (legacy structure - will be migrated)
        templates[productCode] = {
          productCode,
          productName: masterList.find(p => p.code === productCode)?.name || productName,
          assemblies: {
            required: [],
            optional: []
          }
        };
      }
      
      // Add sub-assembly to product template's optional list (legacy structure)
      if (!templates[productCode].assemblies.optional.includes(subAssembly.subAssemblyId)) {
        templates[productCode].assemblies.optional.push(subAssembly.subAssemblyId);
      }
      
      updatedProducts.add(productCode);
    }
    
    // 11. Write all updated data back to files
    console.log(`Writing ${subAssemblies.length} sub-assemblies to file: ${subAssembliesPath}`);
    await fs.writeFile(subAssembliesPath, JSON.stringify(subAssemblies, null, 2));
    console.log(`Successfully wrote sub-assemblies to: ${subAssembliesPath}`);
    console.log(`Writing ${masterList.length} products to master list...`);
    await fs.writeFile(masterListPath, JSON.stringify(masterList, null, 2));
    
    // Write updated product templates
    for (const [code, template] of Object.entries(templates)) {
      const templatePath = path.join(templatesPath, `${code}.json`);
      console.log(`Writing template for product ${code}...`);
      await fs.writeFile(templatePath, JSON.stringify(template, null, 2));
    }
    
    const result = {
      success: true,
      subAssembliesCreated: subAssemblies.length - initialSubAssemblyCount,
      productsUpdated: updatedProducts.size
    };
    console.log('=== BOM Import Complete ===', result);
    
    // Invalidate the sub-assembly cache so Sub-Assembly Manager sees the new data
    cachedSubAssemblies = await getAllSubAssemblies();
    console.log(`Cache refreshed with ${cachedSubAssemblies.length} sub-assemblies`);
    
    return result;
    
  } catch (err) {
    console.error('Error processing BOM import:', err);
    return { success: false, error: err.message };
  }
});

