import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import Ajv from 'ajv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
    },
  })

  // Load from dist folder (built files)
  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
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

// Assembly IPC handlers

// Get all assemblies
ipcMain.handle('assemblies:getAll', async () => {
  return loadedAssemblies
})

// Search assemblies by filters
ipcMain.handle('assemblies:search', async (event, filters) => {
  let results = loadedAssemblies
  
  if (filters.category) {
    results = results.filter(a => a.category?.toLowerCase().includes(filters.category.toLowerCase()))
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
  return loadedAssemblies.find(a => a.assemblyId === assemblyId) || null
})

// Expand assembly with full component details and calculate total cost
ipcMain.handle('assemblies:expand', async (event, assemblyId) => {
  const assembly = loadedAssemblies.find(a => a.assemblyId === assemblyId)
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
  const categories = [...new Set(loadedAssemblies.map(a => a.category).filter(Boolean))]
  return categories.sort()
})

// Panel IPC handlers (stored in user data, not bundled)

// Load all panels for the current user
ipcMain.handle('panels:getAll', async () => {
  try {
    const panels = await readJSONFile('panels.json') || []
    return panels
  } catch (err) {
    console.error('Error loading panels:', err)
    return []
  }
})

// Save a panel
ipcMain.handle('panels:save', async (event, panel) => {
  try {
    let panels = await readJSONFile('panels.json') || []
    const existingIndex = panels.findIndex(p => p.panelId === panel.panelId)
    
    if (existingIndex >= 0) {
      panels[existingIndex] = panel
    } else {
      panels.push(panel)
    }
    
    await writeJSONFile('panels.json', panels)
    return { success: true }
  } catch (err) {
    console.error('Error saving panel:', err)
    throw err
  }
})

// Delete a panel
ipcMain.handle('panels:delete', async (event, panelId) => {
  try {
    let panels = await readJSONFile('panels.json') || []
    panels = panels.filter(p => p.panelId !== panelId)
    await writeJSONFile('panels.json', panels)
    return { success: true }
  } catch (err) {
    console.error('Error deleting panel:', err)
    throw err
  }
})

// Search panels by filters
ipcMain.handle('panels:search', async (event, filters) => {
  try {
    let panels = await readJSONFile('panels.json') || []
    
    if (filters.projectId) {
      panels = panels.filter(p => p.projectId === filters.projectId)
    }
    if (filters.panelId) {
      panels = panels.filter(p => p.panelId?.toLowerCase().includes(filters.panelId.toLowerCase()))
    }
    if (filters.description) {
      panels = panels.filter(p => p.description?.toLowerCase().includes(filters.description.toLowerCase()))
    }
    
    return panels
  } catch (err) {
    console.error('Error searching panels:', err)
    return []
  }
})

// Get panel by ID
ipcMain.handle('panels:getById', async (event, panelId) => {
  try {
    const panels = await readJSONFile('panels.json') || []
    return panels.find(p => p.panelId === panelId) || null
  } catch (err) {
    console.error('Error getting panel:', err)
    return null
  }
})

// Expand panel to full BOM (cascades through assemblies to components)
ipcMain.handle('panels:expand', async (event, panelId) => {
  try {
    const panels = await readJSONFile('panels.json') || []
    const panel = panels.find(p => p.panelId === panelId)
    if (!panel) return null
    
    const bomComponents = []
    let totalCost = 0
    let totalLaborHours = 0
    
    // Expand assemblies
    if (panel.assemblies) {
      for (const pa of panel.assemblies) {
        const assembly = loadedAssemblies.find(a => a.assemblyId === pa.assemblyId)
        if (!assembly) continue
        
        totalLaborHours += (assembly.estimatedLaborHours || 0) * pa.quantity
        
        if (assembly.components) {
          for (const ac of assembly.components) {
            const component = loadedComponents.find(c => c.sku === ac.sku)
            const qty = ac.quantity * pa.quantity
            const subtotal = component ? (component.price || 0) * qty : 0
            totalCost += subtotal
            
            bomComponents.push({
              sku: ac.sku,
              component: component || null,
              quantity: qty,
              subtotal,
              source: `Assembly: ${assembly.description}`,
              notes: ac.notes
            })
          }
        }
      }
    }
    
    // Add one-off components
    if (panel.oneOffComponents) {
      for (const oc of panel.oneOffComponents) {
        const component = loadedComponents.find(c => c.sku === oc.sku)
        const subtotal = component ? (component.price || 0) * oc.quantity : 0
        totalCost += subtotal
        
        bomComponents.push({
          sku: oc.sku,
          component: component || null,
          quantity: oc.quantity,
          subtotal,
          source: 'One-off',
          notes: oc.notes
        })
      }
    }
    
    return {
      ...panel,
      bom: bomComponents,
      totalCost,
      totalLaborHours
    }
  } catch (err) {
    console.error('Error expanding panel:', err)
    return null
  }
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
  return [
    { const: 100, description: "Brewery: Brewhouse" },
    { const: 101, description: "Brewery: 2 Vessel" },
    { const: 120, description: "Fermentation: Cellar" },
    { const: 130, description: "Grain: Grain Handling" },
    { const: 140, description: "Motor Control: Motor" },
    { const: 160, description: "Sanitary: CIP" },
    { const: 999, description: "General Product" }
  ];
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

// IPC handlers for communication with renderer process
ipcMain.handle('ping', () => {
  console.log('Received ping from renderer')
  return 'pong'
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.on('message-from-renderer', (event, message) => {
  console.log('Message from renderer:', message)
  event.reply('message-from-main', `Main process received: ${message}`)
})
