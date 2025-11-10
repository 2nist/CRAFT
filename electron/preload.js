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

// Expose sub-assemblies API
contextBridge.exposeInMainWorld('subAssemblies', {
  getAll: () => ipcRenderer.invoke('sub-assemblies:getAll'),
  save: (subAssemblyObj) => ipcRenderer.invoke('sub-assemblies:save', subAssemblyObj),
  delete: (subAssemblyId) => ipcRenderer.invoke('sub-assemblies:delete', subAssemblyId),
  search: (filters) => ipcRenderer.invoke('sub-assemblies:search', filters),
  searchMany: (filtersArray) => ipcRenderer.invoke('sub-assemblies:searchMany', filtersArray),
  getById: (subAssemblyId) => ipcRenderer.invoke('sub-assemblies:getById', subAssemblyId),
  expand: (subAssemblyId) => ipcRenderer.invoke('sub-assemblies:expand', subAssemblyId),
  getCategories: () => ipcRenderer.invoke('sub-assemblies:getCategories'),
})

// Expose quotes API
contextBridge.exposeInMainWorld('quotes', {
  save: (quoteObj) => ipcRenderer.invoke('quote:save', quoteObj),
  getAll: () => ipcRenderer.invoke('quote:get-all'),
  getById: (id) => ipcRenderer.invoke('quote:get-by-id', id),
  delete: (id) => ipcRenderer.invoke('quote:delete', id),
  evaluateSubAssemblyRules: (quoteObj) => ipcRenderer.invoke('quotes:evaluate-subassembly-rules', quoteObj),
  generateOperationalItems: (quoteObj) => ipcRenderer.invoke('quotes:generate-oi', quoteObj),
  validate: (quoteObj) => ipcRenderer.invoke('quotes:validate', quoteObj)
})

// Expose schemas API
contextBridge.exposeInMainWorld('schemas', {
  getIndustry: () => ipcRenderer.invoke('schemas:get-industry'),
  getProduct: () => ipcRenderer.invoke('schemas:get-product'),
  getControl: () => ipcRenderer.invoke('schemas:get-control'),
  getScope: () => ipcRenderer.invoke('schemas:get-scope'),
  getPanelOptions: () => ipcRenderer.invoke('schemas:get-panel-options'),
  getDefaultIoFields: () => ipcRenderer.invoke('schemas:get-default-io-fields')
})

// Expose customers API
contextBridge.exposeInMainWorld('customers', {
  getAll: () => ipcRenderer.invoke('customers:get-all'),
  add: (data) => ipcRenderer.invoke('customers:add', data),
  update: (data) => ipcRenderer.invoke('customers:update', data),
  delete: (customerId) => ipcRenderer.invoke('customers:delete', customerId)
})

// Expose calculator API
contextBridge.exposeInMainWorld('calc', {
  getQuoteNumber: (data) => ipcRenderer.invoke('calc:get-quote-number', data),
  getProjectNumber: (data) => ipcRenderer.invoke('calc:get-project-number', data)
})

// Expose product templates API
contextBridge.exposeInMainWorld('productTemplates', {
  get: (productCode) => ipcRenderer.invoke('product-templates:get', productCode),
  save: (template) => ipcRenderer.invoke('product-templates:save', template),
})

// Expose manual BOMs API
contextBridge.exposeInMainWorld('boms', {
  getAll: () => ipcRenderer.invoke('boms:get-all'),
  getById: (bomId) => ipcRenderer.invoke('boms:get-by-id', bomId),
  save: (bomObj) => ipcRenderer.invoke('boms:save', bomObj),
  expand: (bomData) => ipcRenderer.invoke('boms:expand-bom', bomData)
})

// Expose app API for file I/O
contextBridge.exposeInMainWorld('app', {
  showOpenDialog: (options) => ipcRenderer.invoke('app:show-open-dialog', options),
  readFile: (filePath) => ipcRenderer.invoke('app:read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('app:write-file', filePath, content),
  logMarginCalculation: (data) => ipcRenderer.invoke('app:log-margin-calculation', data)
})

// Expose runtime status API
contextBridge.exposeInMainWorld('runtime', {
  getStatus: () => ipcRenderer.invoke('runtime:get-status')
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
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  getDashboardSettings: () => ipcRenderer.invoke('api:get-dashboard-settings'),
  saveDashboardSettings: (settings) => ipcRenderer.invoke('api:save-dashboard-settings', settings),
  saveUsefulLinks: (links) => ipcRenderer.invoke('api:save-useful-links', links),
  saveDocHubItems: (docs) => ipcRenderer.invoke('api:save-doc-hub-items', docs),
  // Global Component Search
  onOpenComponentSearch: (callback) => {
    ipcRenderer.on('open-component-search', () => callback());
  },
  removeOpenComponentSearchListener: () => {
    ipcRenderer.removeAllListeners('open-component-search');
  }
})

// Expose BOM Importer API
contextBridge.exposeInMainWorld('bomImporter', {
  getCsvHeaders: (csvContent) => ipcRenderer.invoke('bom-importer:get-csv-headers', csvContent),
  processImport: (data) => ipcRenderer.invoke('bom-importer:process-import', data)
})

// Expose Manual Management API
contextBridge.exposeInMainWorld('manuals', {
  checkLocal: (component) => ipcRenderer.invoke('manuals:check-local', component),
  openLocal: (filePath) => ipcRenderer.invoke('manuals:open-local', filePath),
  smartSearch: (component) => ipcRenderer.invoke('manuals:smart-search', component),
  saveReference: (data) => ipcRenderer.invoke('manuals:save-reference', data),
  getIndex: () => ipcRenderer.invoke('manuals:get-index')
})
