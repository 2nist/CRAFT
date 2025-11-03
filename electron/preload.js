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
  syncFromCsv: (csvContent) => ipcRenderer.invoke('components:sync-from-csv', csvContent)
})

// Expose assemblies API
contextBridge.exposeInMainWorld('assemblies', {
  getAll: () => ipcRenderer.invoke('assemblies:getAll'),
  save: (assemblyObj) => ipcRenderer.invoke('assemblies:save', assemblyObj),
  delete: (assemblyId) => ipcRenderer.invoke('assemblies:delete', assemblyId),
  search: (filters) => ipcRenderer.invoke('assemblies:search', filters),
  getById: (assemblyId) => ipcRenderer.invoke('assemblies:getById', assemblyId),
  expand: (assemblyId) => ipcRenderer.invoke('assemblies:expand', assemblyId),
  getCategories: () => ipcRenderer.invoke('assemblies:getCategories'),
})

// Expose quotes API
contextBridge.exposeInMainWorld('quotes', {
  save: (quoteObj) => ipcRenderer.invoke('quote:save', quoteObj),
  getAll: () => ipcRenderer.invoke('quote:get-all'),
  getById: (id) => ipcRenderer.invoke('quote:get-by-id', id),
  delete: (id) => ipcRenderer.invoke('quote:delete', id),
})

// Expose schemas API
contextBridge.exposeInMainWorld('schemas', {
  getIndustry: () => ipcRenderer.invoke('schemas:get-industry'),
  getProduct: () => ipcRenderer.invoke('schemas:get-product'),
  getControl: () => ipcRenderer.invoke('schemas:get-control'),
  getScope: () => ipcRenderer.invoke('schemas:get-scope')
})

// Expose customers API
contextBridge.exposeInMainWorld('customers', {
  getAll: () => ipcRenderer.invoke('customers:get-all')
})

// Expose calculator API
contextBridge.exposeInMainWorld('calc', {
  getQuoteNumber: (data) => ipcRenderer.invoke('calc:get-quote-number', data)
})

// Expose product templates API
contextBridge.exposeInMainWorld('productTemplates', {
  get: (productCode) => ipcRenderer.invoke('product-templates:get', productCode),
  save: (template) => ipcRenderer.invoke('product-templates:save', template),
})

// Expose app API for file I/O
contextBridge.exposeInMainWorld('app', {
  showOpenDialog: (options) => ipcRenderer.invoke('app:show-open-dialog', options),
  readFile: (filePath) => ipcRenderer.invoke('app:read-file', filePath)
})

// Expose pipedrive API
contextBridge.exposeInMainWorld('pipedrive', {
  getDeals: () => ipcRenderer.invoke('pipedrive:get-deals')
})

// Expose shell API for opening external links
contextBridge.exposeInMainWorld('electron', {
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:open-external', url)
  },
  on: (event, callback) => {
    ipcRenderer.on(event, callback);
  }
})

// Expose dashboard API
contextBridge.exposeInMainWorld('api', {
  getRecentQuotes: () => ipcRenderer.invoke('api:get-recent-quotes'),
  getUsefulLinks: () => ipcRenderer.invoke('api:get-useful-links'),
  getDocHubItems: () => ipcRenderer.invoke('api:get-doc-hub-items'),
  getPluginRegistry: () => ipcRenderer.invoke('api:get-plugin-registry'),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url)
})
