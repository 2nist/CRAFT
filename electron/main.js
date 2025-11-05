import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import fssync from 'fs'
import Ajv from 'ajv'
import Papa from 'papaparse'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Determine if running in development mode
const isDev = !app.isPackaged

let mainWindow
let dataPath
let pluginsPath
let loadedPlugins = []
let loadedComponents = []
let loadedAssemblies = []
let quoteSchema
let quoteValidate

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
  dataPath = path.join(app.getPath('userData'), 'data')
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

// Discover and load all plugins
async function loadPlugins() {
  try {
    const entries = await fs.readdir(pluginsPath, { withFileTypes: true })
    const pluginDirs = entries.filter(entry => entry.isDirectory())
    
    loadedPlugins = []
    
    for (const dir of pluginDirs) {
      try {
        const manifestPath = path.join(pluginsPath, dir.name, 'manifest.json')
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

// Load component catalog from bundled data
async function loadComponents() {
  try {
    // In development, use src/data; in production, use bundled resources
    let componentsPath
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      componentsPath = path.join(__dirname, '..', 'src', 'data', 'components', 'component_catalog.json')
    } else {
      componentsPath = path.join(process.resourcesPath, 'data', 'components', 'component_catalog.json')
    }
    
    const data = await fs.readFile(componentsPath, 'utf-8')
    loadedComponents = JSON.parse(data)
    console.log(`Loaded ${loadedComponents.length} components from catalog`)
    return loadedComponents
  } catch (err) {
    console.error('Error loading components:', err)
    return []
  }
}

// Load assemblies from bundled data
async function loadAssemblies() {
  try {
    let assembliesPath
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      assembliesPath = path.join(__dirname, '..', 'src', 'data', 'assemblies', 'assemblies.json')
    } else {
      assembliesPath = path.join(process.resourcesPath, 'data', 'assemblies', 'assemblies.json')
    }
    
    const data = await fs.readFile(assembliesPath, 'utf-8')
    loadedAssemblies = JSON.parse(data)
    console.log(`Loaded ${loadedAssemblies.length} assemblies from library`)
    return loadedAssemblies
  } catch (err) {
    console.error('Error loading assemblies:', err)
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

// CSV export helper
async function appendProjectToCSV(project) {
  const csvPath = path.join(dataPath, 'projects_log.csv')
  const headers = 'ID,Project Number,Quote Number,PO Number,Customer,Industry,Product,Control,Scope,Created At\n'
  
  // Check if file exists
  let fileExists = false
  try {
    await fs.access(csvPath)
    fileExists = true
  } catch {
    // File doesn't exist
  }
  
  // Write headers if file doesn't exist
  if (!fileExists) {
    await fs.writeFile(csvPath, headers, 'utf-8')
  }
  
  // Append project row
  const row = `${project.id},${project.projectNumber},${project.quoteNumber},${project.poNumber || ''},${project.customer},${project.industry},${project.product},${project.control},${project.scope},${project.createdAt}\n`
  await fs.appendFile(csvPath, row, 'utf-8')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Use CommonJS preload bundle
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://unpkg.com;",
    },
  })

  // In development, load from Vite dev server; in production, load from dist folder
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
  mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  await initDataStorage()
  await initPluginsDirectory()
  await loadPlugins()
  await loadComponents()
  await loadAssemblies()
  
  // Load quote schema
  let quoteSchemaPath
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    quoteSchemaPath = path.join(__dirname, '..', 'src', 'data', 'quotes', 'project_quote_schema.json')
  } else {
    quoteSchemaPath = path.join(process.resourcesPath, 'data', 'quotes', 'project_quote_schema.json')
  }
  const quoteSchemaData = await fs.readFile(quoteSchemaPath, 'utf-8')
  quoteSchema = JSON.parse(quoteSchemaData)
  const ajv = new Ajv()
  quoteValidate = ajv.compile(quoteSchema)
  
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
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
      const sku = row['Manufacturer PART NUMBER'];
      if (!sku) continue; // Skip empty rows

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

    // 4. Write the updated catalog back to disk
    await fs.writeFile(catalogPath, JSON.stringify(masterCatalog, null, 2));
    
    // 5. Reload components into memory
    loadedComponents = masterCatalog;

    return { success: true, updated: updatedCount, added: newCount };
  } catch (error) {
    console.error('Error in Smart Sync:', error);
    return { success: false, error: error.message };
  }
});

// Assembly IPC handlers

// Get all assemblies (user data + bundled)
// Helper to get all assemblies (bundled + user)
async function getAllAssemblies() {
  try {
    // Try to load from assemblies subdirectory first (BOM import location)
    let userAssemblies = null;
    try {
      const assembliesPath = path.join(dataPath, 'assemblies', 'assemblies.json');
      const data = await fs.readFile(assembliesPath, 'utf-8');
      userAssemblies = JSON.parse(data);
    } catch (err) {
      // Fall back to root assemblies.json
      userAssemblies = await readJSONFile('assemblies.json');
    }
    
    userAssemblies = userAssemblies || [];
    
    // Merge with bundled assemblies (user assemblies take precedence)
    const allAssemblies = [...loadedAssemblies];
    
    // Add or update with user assemblies
    for (const userAssembly of userAssemblies) {
      const existingIndex = allAssemblies.findIndex(a => a.assemblyId === userAssembly.assemblyId);
      if (existingIndex >= 0) {
        allAssemblies[existingIndex] = userAssembly;
      } else {
        allAssemblies.push(userAssembly);
      }
    }
    
    return allAssemblies;
  } catch (err) {
    console.error('Error loading assemblies:', err);
    return loadedAssemblies;
  }
}

ipcMain.handle('assemblies:getAll', async () => {
  const assemblies = await getAllAssemblies();
  console.log(`Total assemblies available: ${assemblies.length}`);
  return assemblies;
})

// Save an assembly (validate against schema first)
ipcMain.handle('assemblies:save', async (event, assemblyToSave) => {
  try {
    // Load assembly schema
    let assemblySchemaPath
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      assemblySchemaPath = path.join(__dirname, '..', 'src', 'data', 'schemas', 'assembly_schema.json')
    } else {
      assemblySchemaPath = path.join(process.resourcesPath, 'data', 'schemas', 'assembly_schema.json')
    }
    
    const schemaData = await fs.readFile(assemblySchemaPath, 'utf-8')
    const assemblySchema = JSON.parse(schemaData)
    const ajv = new Ajv()
    const validate = ajv.compile(assemblySchema)
    
    // Validate the assembly
    const valid = validate(assemblyToSave)
    if (!valid) {
      return { success: false, errors: validate.errors }
    }
    
    // Load existing user assemblies
    let userAssemblies = await readJSONFile('assemblies.json') || []
    
    // Find and replace or add new
    const existingIndex = userAssemblies.findIndex(a => a.assemblyId === assemblyToSave.assemblyId)
    if (existingIndex >= 0) {
      userAssemblies[existingIndex] = assemblyToSave
    } else {
      userAssemblies.push(assemblyToSave)
    }
    
    // Save back to file
    await writeJSONFile('assemblies.json', userAssemblies)
    
    return { success: true, data: assemblyToSave }
  } catch (err) {
    console.error('Error saving assembly:', err)
    throw err
  }
})

// Delete an assembly
ipcMain.handle('assemblies:delete', async (event, assemblyId) => {
  try {
    let userAssemblies = await readJSONFile('assemblies.json') || []
    const initialLength = userAssemblies.length
    userAssemblies = userAssemblies.filter(a => a.assemblyId !== assemblyId)
    await writeJSONFile('assemblies.json', userAssemblies)
    return { success: true, changes: initialLength - userAssemblies.length }
  } catch (err) {
    console.error('Error deleting assembly:', err)
    throw err
  }
})

// Search assemblies by filters
ipcMain.handle('assemblies:search', async (event, filters) => {
  const allAssemblies = await getAllAssemblies();
  let results = allAssemblies;
  
  if (filters.category) {
    results = results.filter(a => a.category?.toLowerCase().includes(filters.category.toLowerCase()))
  }
  if (filters.type) {
    results = results.filter(a => a.attributes?.type?.toLowerCase().includes(filters.type.toLowerCase()))
  }
  if (filters.assemblyId) {
    results = results.filter(a => a.assemblyId?.toLowerCase().includes(filters.assemblyId.toLowerCase()))
  }
  if (filters.description) {
    results = results.filter(a => a.description?.toLowerCase().includes(filters.description.toLowerCase()))
  }
  
  return results
})

// Get assembly by ID
ipcMain.handle('assemblies:getById', async (event, assemblyId) => {
  const allAssemblies = await getAllAssemblies();
  return allAssemblies.find(a => a.assemblyId === assemblyId) || null
})

// Expand assembly with full component details and calculate total cost
ipcMain.handle('assemblies:expand', async (event, assemblyId) => {
  const allAssemblies = await getAllAssemblies();
  const assembly = allAssemblies.find(a => a.assemblyId === assemblyId)
  if (!assembly) return null
  
  const expandedComponents = assembly.components.map(ac => {
    const component = loadedComponents.find(c => c.sku === ac.sku)
    return {
      ...ac,
      component: component || null,
      subtotal: component ? (component.price || 0) * ac.quantity : 0
    }
  })
  
  const totalCost = expandedComponents.reduce((sum, ec) => sum + ec.subtotal, 0)
  
  return {
    ...assembly,
    components: expandedComponents,
    totalCost,
    totalLaborCost: assembly.estimatedLaborHours || 0
  }
})

// Get unique assembly categories
ipcMain.handle('assemblies:getCategories', async () => {
  const allAssemblies = await getAllAssemblies();
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
  const filePath = path.join(quotesDir, `${quoteObject.quoteId}.json`)
  await fs.writeFile(filePath, JSON.stringify(quoteObject, null, 2), 'utf-8')
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

// Schemas IPC handlers

ipcMain.handle('schemas:getIndustry', async () => {
  return [
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
});

ipcMain.handle('schemas:getProduct', async () => {
  try {
    let masterListPath;
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      masterListPath = path.join(__dirname, '..', 'src', 'data', 'schemas', 'product_master_list.json');
    } else {
      masterListPath = path.join(process.resourcesPath, 'data', 'schemas', 'product_master_list.json');
    }
    
    const data = await fs.readFile(masterListPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading product master list:', err);
    // Fallback to default list
    return [
      { code: "100", name: "Brewery: Brewhouse" },
      { code: "101", name: "Brewery: 2 Vessel" },
      { code: "120", name: "Fermentation: Cellar" },
      { code: "130", name: "Grain: Grain Handling" },
      { code: "140", name: "Motor Control: Motor" },
      { code: "160", name: "Sanitary: CIP" },
      { code: "999", name: "General Product" }
    ];
  }
});

ipcMain.handle('schemas:getControl', async () => {
  return [
    { const: 1, description: "Automated" },
    { const: 2, description: "Manual" },
    { const: 3, description: "Termination" },
    { const: 9, description: "None" }
  ];
});

ipcMain.handle('schemas:getScope', async () => {
  return [
    { const: 10, description: "Production: New Build" },
    { const: 11, description: "Production: Modification" },
    { const: 20, description: "Field: Commissioning" },
    { const: 40, description: "Engineering: Engineering (Hard)" },
    { const: 50, description: "Admin: Warranty" },
    { const: 99, description: "General Scope" }
  ];
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
    let masterListPath;
    if (app.isPackaged) {
      masterListPath = path.join(process.resourcesPath, 'data', 'schemas', 'product_master_list.json');
    } else {
      masterListPath = path.join(__dirname, '..', 'src', 'data', 'schemas', 'product_master_list.json');
    }
    const content = await fs.readFile(masterListPath, 'utf-8');
    const data = JSON.parse(content);
    
    // Transform from {code, name, description} to {const, description} format
    return data.map(item => ({
      const: parseInt(item.code),
      description: `${item.name} (${item.code})`
    }));
  } catch (err) {
    console.error('Error reading product_master_list.json:', err);
    return MOCK_PRODUCT_SCHEMA; // Fallback to mock data
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

// Product Templates IPC handlers

// Get product template by product code
ipcMain.handle('product-templates:get', async (event, productCode) => {
  try {
    // Try source directory first (for built-in templates)
    let filePath;
    if (app.isPackaged) {
      filePath = path.join(process.resourcesPath, 'data', 'product-templates', `${productCode}.json`);
    } else {
      filePath = path.join(__dirname, '..', 'src', 'data', 'product-templates', `${productCode}.json`);
    }
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (sourceErr) {
      // If not in source, try user data directory (for custom templates)
      if (sourceErr.code === 'ENOENT') {
        const userFilePath = path.join(dataPath, 'product-templates', `${productCode}.json`);
        const data = await fs.readFile(userFilePath, 'utf-8');
        return JSON.parse(data);
      }
      throw sourceErr;
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null; // Template doesn't exist
    }
    console.error('Error loading product template:', err);
    throw err;
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
      templateSchemaPath = path.join(process.resourcesPath, 'data', 'schemas', 'product_template_schema.json')
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
      bomSchemaPath = path.join(process.resourcesPath, 'data', 'schemas', 'manual_bom_schema.json')
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

ipcMain.handle('boms:expand-bom', async (event, { assemblies, components }) => {
  try {
    let totalCost = 0
    
    // Expand assemblies
    for (const item of assemblies) {
      const assemblyId = item.assemblyId
      const quantity = item.quantity
      
      // Use the existing assemblies:expand logic
      const expansion = await expandAssembly(assemblyId)
      if (expansion && expansion.componentCost !== undefined) {
        totalCost += expansion.componentCost * quantity
      }
    }
    
    // Expand components
    for (const item of components) {
      const sku = item.sku
      const quantity = item.quantity
      
      // Get component price
      const component = await getComponentBySku(sku)
      if (component && component.price !== undefined) {
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
  return fs.readFile(filePath, 'utf-8')
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

ipcMain.handle('api:get-useful-links', async () => {
  try {
    const linksPath = isDev 
      ? path.join(__dirname, '..', 'src', 'data', 'useful_links.json')
      : path.join(process.resourcesPath, 'app.asar', 'dist', 'useful_links.json');
    const data = await fs.readFile(linksPath, 'utf-8');
    const links = JSON.parse(data);
    return links || [];
  } catch (err) {
    console.error('Error loading useful links:', err);
    return [];
  }
});

ipcMain.handle('api:get-doc-hub-items', async () => {
  try {
    const docsPath = isDev 
      ? path.join(__dirname, '..', 'src', 'data', 'doc_hub_items.json')
      : path.join(process.resourcesPath, 'app.asar', 'dist', 'doc_hub_items.json');
    const data = await fs.readFile(docsPath, 'utf-8');
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
      layout: { showRecentQuotes: true, showDocumentHub: true, showUsefulLinks: true, showWelcomeMessage: true },
      welcomeMessage: { enabled: true, title: 'Welcome to Craft Tools Hub', subtitle: 'Your central hub for quotes, projects, and automation tools', showLogo: true },
      customization: { accentColor: 'blue', borderRadius: 'lg', fontFamily: 'default' }
    };
  }
});

ipcMain.handle('api:save-dashboard-settings', async (event, settings) => {
  try {
    const settingsPath = path.join(dataPath, 'dashboard_settings.json');
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (err) {
    console.error('Error saving dashboard settings:', err);
    throw err;
  }
});

ipcMain.handle('api:save-useful-links', async (event, links) => {
  try {
    const linksPath = path.join(dataPath, 'useful_links.json');
    await fs.writeFile(linksPath, JSON.stringify(links, null, 2));
    return { success: true };
  } catch (err) {
    console.error('Error saving useful links:', err);
    throw err;
  }
});

ipcMain.handle('api:save-doc-hub-items', async (event, docs) => {
  try {
    const docsPath = path.join(dataPath, 'doc_hub_items.json');
    await fs.writeFile(docsPath, JSON.stringify(docs, null, 2));
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
  const { shell } = require('electron');
  shell.openExternal(url);
  return { success: true };
});

// Helper function to log number generation to CSV
async function logNumberGeneration(type, numberData) {
  try {
    const outputDir = path.join(app.getPath('userData'), 'OUTPUT');
    const csvPath = path.join(outputDir, 'number_log.csv');
    
    // Ensure OUTPUT directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create CSV header if file doesn't exist
    let fileExists = false;
    try {
      await fs.access(csvPath);
      fileExists = true;
    } catch (error) {
      // File doesn't exist, will create with header
    }
    
    const timestamp = new Date().toISOString();
    const row = `"${timestamp}","${type}","${numberData.mainId}","${numberData.fullId}","${numberData.customerCode}","${numberData.customerName || ''}"`;
    
    if (!fileExists) {
      const header = '"Timestamp","Type","Main ID","Full ID","Customer Code","Customer Name"';
      await fs.writeFile(csvPath, header + '\n' + row + '\n', 'utf8');
    } else {
      await fs.appendFile(csvPath, row + '\n', 'utf8');
    }
  } catch (error) {
    console.error('Error logging number generation:', error);
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
  
  // Log to CSV
  const customerName = DEFAULT_CUSTOMER_DATA[cust] || '';
  await logNumberGeneration('Quote', { mainId, fullId, customerCode: cust, customerName });
  
  return { mainId, fullId };
});

ipcMain.handle('calc:get-project-number', async (event, data) => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const cust = data.customerCode ? data.customerCode.toString().padStart(3, '0') : "000";
  const po = data.poNumber || "0000"; // 4-digit PO number
  
  const mainId = `CA${yy}${po}${cust}`;
  const fullId = `${mainId}-${data.industry || 'XX'}${data.product || 'XXX'}${data.control || 'X'}${data.scope || 'XX'}`;
  
  // Log to CSV
  const customerName = DEFAULT_CUSTOMER_DATA[cust] || '';
  await logNumberGeneration('Project', { mainId, fullId, customerCode: cust, customerName });
  
  return { mainId, fullId };
});

// BOM Importer IPC handlers

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
    // 1. Slice CSV content to start from header row
    const lines = csvContent.split('\n');
    const csvFromHeader = lines.slice(headerRowIndex).join('\n');
    
    // Parse the CSV starting from header
    const parsed = Papa.parse(csvFromHeader, { header: true, skipEmptyLines: true });
    
    // 2. Determine paths
    const assembliesPath = path.join(dataPath, 'assemblies', 'assemblies.json');
    const masterListPath = path.join(dataPath, 'schemas', 'product_master_list.json');
    const templatesPath = path.join(dataPath, 'product-templates');
    
    // Ensure directories exist
    await fs.mkdir(path.join(dataPath, 'assemblies'), { recursive: true });
    await fs.mkdir(path.join(dataPath, 'schemas'), { recursive: true });
    await fs.mkdir(templatesPath, { recursive: true });
    
    // 3. Load data files
    let assemblies = [];
    try {
      const assembliesData = fssync.readFileSync(assembliesPath, 'utf-8');
      assemblies = JSON.parse(assembliesData);
    } catch (err) {
      console.log('Creating new assemblies.json');
      assemblies = [];
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
    
    // 4. Create lookup maps
    const assemblyLookup = new Map(assemblies.map(a => [a.description, a]));
    
    // Track stats
    const initialAssemblyCount = assemblies.length;
    const updatedProducts = new Set();
    
    // 5. Process each row
    for (const row of parsed.data) {
      const assemblyName = row[columnMap.assemblyName];
      const sku = row[columnMap.sku];
      const quantity = parseInt(row[columnMap.quantity]) || 1;
      const productName = row[columnMap.productName];
      
      // Skip if missing required fields
      if (!assemblyName || !sku) continue;
      
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
      
      // 7. Find or create assembly
      let assembly = assemblyLookup.get(assemblyName);
      
      if (!assembly) {
        // Create new assembly
        assembly = {
          assemblyId: `ASM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          description: assemblyName,
          category: row[columnMap.category] || 'Uncategorized',
          attributes: {},
          components: []
        };
        assemblies.push(assembly);
        assemblyLookup.set(assemblyName, assembly);
      }
      
      // 8. Update assembly attributes (merge with existing)
      Object.assign(assembly.attributes, attributes);
      
      // 9. Add component to assembly (check for duplicates)
      const existingComponent = assembly.components.find(c => c.sku === sku);
      if (!existingComponent) {
        assembly.components.push({
          sku,
          quantity,
          notes: row[columnMap.notes] || ''
        });
      }
      
      // 10. Update product template
      if (!templates[productCode]) {
        // Create new product template
        templates[productCode] = {
          productCode,
          productName: masterList.find(p => p.code === productCode)?.name || productName,
          assemblies: {
            required: [],
            optional: []
          }
        };
      }
      
      // Add assembly to product template's optional list
      if (!templates[productCode].assemblies.optional.includes(assembly.assemblyId)) {
        templates[productCode].assemblies.optional.push(assembly.assemblyId);
      }
      
      updatedProducts.add(productCode);
    }
    
    // 11. Write all updated data back to files
    await fs.writeFile(assembliesPath, JSON.stringify(assemblies, null, 2));
    await fs.writeFile(masterListPath, JSON.stringify(masterList, null, 2));
    
    // Write updated product templates
    for (const [code, template] of Object.entries(templates)) {
      const templatePath = path.join(templatesPath, `${code}.json`);
      await fs.writeFile(templatePath, JSON.stringify(template, null, 2));
    }
    
    return {
      success: true,
      assembliesCreated: assemblies.length - initialAssemblyCount,
      productsUpdated: updatedProducts.size
    };
    
  } catch (err) {
    console.error('Error processing BOM import:', err);
    return { success: false, error: err.message };
  }
});

