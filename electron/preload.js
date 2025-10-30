import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Invoke methods (request-response pattern)
  ping: () => ipcRenderer.invoke('ping'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Send/receive methods (one-way and event-based communication)
  sendMessage: (message) => ipcRenderer.send('message-from-renderer', message),
  onMessageFromMain: (callback) => {
    ipcRenderer.on('message-from-main', (event, message) => callback(message))
  },
  
  // Remove listeners to prevent memory leaks
  removeMessageListener: () => {
    ipcRenderer.removeAllListeners('message-from-main')
  },
})

// Expose database API
contextBridge.exposeInMainWorld('db', {
  // Projects
  loadProjects: () => ipcRenderer.invoke('db:loadProjects'),
  saveProject: (project) => ipcRenderer.invoke('db:saveProject', project),
  deleteProject: (projectId) => ipcRenderer.invoke('db:deleteProject', projectId),
  clearProjects: () => ipcRenderer.invoke('db:clearProjects'),
  
  // Settings (for schema, etc.)
  loadSetting: (key) => ipcRenderer.invoke('db:loadSetting', key),
  saveSetting: (key, value) => ipcRenderer.invoke('db:saveSetting', key, value),
  deleteSetting: (key) => ipcRenderer.invoke('db:deleteSetting', key),
})

// Expose plugins API
contextBridge.exposeInMainWorld('plugins', {
  getAll: () => ipcRenderer.invoke('plugins:getAll'),
  getHTML: (pluginId) => ipcRenderer.invoke('plugins:getHTML', pluginId),
})

// Expose components API
contextBridge.exposeInMainWorld('components', {
  getAll: () => ipcRenderer.invoke('components:getAll'),
  search: (filters) => ipcRenderer.invoke('components:search', filters),
  getBySku: (sku) => ipcRenderer.invoke('components:getBySku', sku),
  getCategories: () => ipcRenderer.invoke('components:getCategories'),
  getVendors: () => ipcRenderer.invoke('components:getVendors'),
})

// Expose assemblies API
contextBridge.exposeInMainWorld('assemblies', {
  getAll: () => ipcRenderer.invoke('assemblies:getAll'),
  search: (filters) => ipcRenderer.invoke('assemblies:search', filters),
  getById: (assemblyId) => ipcRenderer.invoke('assemblies:getById', assemblyId),
  expand: (assemblyId) => ipcRenderer.invoke('assemblies:expand', assemblyId),
  getCategories: () => ipcRenderer.invoke('assemblies:getCategories'),
})

// Expose panels API
contextBridge.exposeInMainWorld('panels', {
  getAll: () => ipcRenderer.invoke('panels:getAll'),
  save: (panel) => ipcRenderer.invoke('panels:save', panel),
  delete: (panelId) => ipcRenderer.invoke('panels:delete', panelId),
  search: (filters) => ipcRenderer.invoke('panels:search', filters),
  getById: (panelId) => ipcRenderer.invoke('panels:getById', panelId),
  expand: (panelId) => ipcRenderer.invoke('panels:expand', panelId),
})

// Expose Node.js process information
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
})
