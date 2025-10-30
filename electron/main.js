import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow
let dataPath
let pluginsPath
let loadedPlugins = []
let loadedComponents = []
let loadedAssemblies = []

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

  // In development, load from vite dev server
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

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
