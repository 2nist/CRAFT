import React, { useState, useEffect } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, Loader } from 'lucide-react';

// Component Manager - Sync components from Smartsheet CSV
export default function ComponentManager({ context, onNavigate }) {
  const [components, setComponents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    setIsLoading(true);
    try {
      const data = await window.components.getAll();
      setComponents(data || []);
    } catch (err) {
      console.error('Failed to load components:', err);
      addLog(`Error loading components: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setSyncResult(null);
      setLogs([]);
      
      addLog("Opening file dialog...");

      // 1. Show "Open" dialog
      const result = await window.app.showOpenDialog({
        title: "Select Smartsheet CSV Export",
        buttonLabel: "Import",
        filters: [{ name: "CSV", extensions: ["csv"] }],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        addLog("User canceled dialog.", 'warning');
        setIsSyncing(false);
        return;
      }

      const filePath = result.filePaths[0];
      addLog(`Selected file: ${filePath}`);

      // 2. Read the file content
      addLog("Reading file...");
      const csvContent = await window.app.readFile(filePath);
      addLog(`File read successfully (${csvContent.length} bytes)`);

      // 3. Send content to backend for Smart Sync
      addLog("Starting smart sync... This may take a moment.");
      console.log('[ComponentManager] Calling syncFromCsv with', csvContent.length, 'bytes');
      const syncResult = await window.components.syncFromCsv(csvContent);
      console.log('[ComponentManager] syncResult:', syncResult);

      if (syncResult.success) {
        addLog(`✓ Sync Complete!`, 'success');
        addLog(`  → ${syncResult.updated} components updated`, 'success');
        addLog(`  → ${syncResult.added} new components added`, 'success');
        setSyncResult(syncResult);
        
        // Reload components to show updated data
        await loadComponents();
      } else {
        addLog(`✗ Sync Failed: ${syncResult.error}`, 'error');
        setSyncResult(syncResult);
      }

    } catch (error) {
      console.error(error);
      addLog(`✗ Error: ${error.message}`, 'error');
      setSyncResult({ success: false, error: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadTemplate = () => {
    addLog("Template download not yet implemented", 'warning');
    // TODO: Generate a CSV template with the expected column headers
  };

  // Export components to CSV with optional filtering
  const handleExportComponents = async (filterOptions = {}) => {
    if (!components || components.length === 0) {
      alert('No components to export.');
      return;
    }

    try {
      // Apply filters if provided
      let filteredComponents = [...components];

      if (filterOptions.category) {
        filteredComponents = filteredComponents.filter(c => c.category === filterOptions.category);
      }
      if (filterOptions.vendor) {
        filteredComponents = filteredComponents.filter(c => c.vendor === filterOptions.vendor);
      }
      if (filterOptions.hasPrice !== undefined) {
        filteredComponents = filteredComponents.filter(c => 
          filterOptions.hasPrice ? (c.price > 0) : (c.price === 0 || !c.price)
        );
      }
      if (filterOptions.hasEngineering !== undefined) {
        filteredComponents = filteredComponents.filter(c => {
          const hasEngineering = c.volt || c.phase || c.amps || (c.tags && c.tags.length > 0);
          return filterOptions.hasEngineering ? hasEngineering : !hasEngineering;
        });
      }

      // Create CSV
      const csvRows = [];
      csvRows.push('SKU,Description,Category,Vendor,VN#,Price,UOM,Notes,PartAbbrev,LastPriceUpdate,EngineeringData');

      filteredComponents.forEach(component => {
        const hasEngineering = component.volt || component.phase || component.amps || (component.tags && component.tags.length > 0);
        const engineeringData = hasEngineering ? 'Yes' : 'No';

        const row = [
          component.sku || '',
          component.description || '',
          component.category || '',
          component.vendor || '',
          component.vndrnum || '',
          component.price || '',
          component.uom || '',
          component.notes || '',
          component.partAbbrev || '',
          component.lastPriceUpdate || '',
          engineeringData
        ].map(field => `"${field}"`).join(',');

        csvRows.push(row);
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, '');
      const filterDesc = Object.keys(filterOptions).length > 0 ? '_filtered' : '';
      const filename = `ComponentCatalog${filterDesc}_${timestamp}.csv`;

      await window.app.writeFile(`OUTPUT/Catalog/${filename}`, csvRows.join('\n'));

      addLog(`Exported ${filteredComponents.length} components to OUTPUT/Catalog/${filename}`, 'success');
      alert(`Exported ${filteredComponents.length} components to OUTPUT/Catalog/${filename}`);
    } catch (error) {
      console.error('Failed to export components:', error);
      addLog(`Export failed: ${error.message}`, 'error');
      alert(`Failed to export components: ${error.message}`);
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'error': return <AlertCircle size={16} className="text-danger" />;
      case 'success': return <CheckCircle size={16} className="text-success" />;
      case 'warning': return <AlertCircle size={16} className="text-[#fb923c]" />;
      default: return <Loader size={16} className="text-info" />;
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">Component Manager</h1>
        
        {/* Action Buttons */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="btn ca-btn-primary flex items-center gap-2 px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? (
              <>
                <Loader size={18} className="animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Upload size={18} />
                Sync from CSV
              </>
            )}
          </button>
          <button 
            onClick={() => handleExportComponents()}
            className="btn ca-btn-success flex items-center gap-2 px-4 py-2 rounded-md"
          >
            <Download size={18} />
            Export All
          </button>
          <button 
            onClick={() => handleExportComponents({ hasPrice: true })}
            className="btn ca-btn-info flex items-center gap-2 px-4 py-2 rounded-md"
          >
            <Download size={18} />
            Export Priced
          </button>
          <button 
            onClick={() => handleExportComponents({ hasEngineering: true })}
            className="btn ca-btn-info flex items-center gap-2 px-4 py-2 rounded-md"
          >
            <Download size={18} />
            Export Engineering
          </button>
          <button 
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            <Download size={18} />
            Download Template
          </button>
        </div>

        {/* Sync Log Panel */}
        {logs.length > 0 && (
          <div className="mb-6 bg-card rounded-lg p-4 border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-3">Sync Log</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  {getLogIcon(log.type)}
                  <span className="text-slateish/60 font-mono">[{log.timestamp}]</span>
                  <span className={`flex-1 ${
                    log.type === 'error' ? 'text-destructive' :
                    log.type === 'success' ? 'text-success' :
                    log.type === 'warning' ? 'text-info' :
                    'text-muted-foreground'
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync Result Summary */}
        {syncResult && (
          <div className={`mb-6 p-4 rounded-lg border ${
            syncResult.success 
              ? 'bg-success/10 border-success/30' 
              : 'bg-danger/10 border-danger/30'
          }`}>
            <div className="flex items-center gap-2">
              {syncResult.success ? (
                <>
                  <CheckCircle className="text-success" size={24} />
                  <div>
                    <h3 className="font-semibold text-success">Sync Successful</h3>
                    <p className="text-sm text-success/80">
                      {syncResult.updated} updated, {syncResult.added} added
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="text-danger" size={24} />
                  <div>
                    <h3 className="font-semibold text-danger">Sync Failed</h3>
                    <p className="text-sm text-danger/80">{syncResult.error}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Components Table */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              Component Catalog ({components.length} items)
            </h2>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin text-primary" size={32} />
              <span className="ml-3 text-muted-foreground">Loading components...</span>
            </div>
          ) : components.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No components found</p>
              <p className="text-sm text-muted-foreground">Upload a CSV to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-muted-foreground font-semibold">SKU</th>
                    <th className="text-left p-3 text-muted-foreground font-semibold">Description</th>
                    <th className="text-left p-3 text-muted-foreground font-semibold">Category</th>
                    <th className="text-left p-3 text-muted-foreground font-semibold">Vendor</th>
                    <th className="text-right p-3 text-muted-foreground font-semibold">Price</th>
                    <th className="text-center p-3 text-muted-foreground font-semibold">Engineering</th>
                  </tr>
                </thead>
                <tbody>
                  {components.slice(0, 100).map((component, index) => {
                    const hasEngineeringData = component.volt || component.phase || component.amps || component.tags;
                    return (
                      <tr key={component.sku || index} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-foreground font-mono text-sm">{component.sku}</td>
                        <td className="p-3 text-foreground max-w-md truncate">{component.description}</td>
                        <td className="p-3 text-muted-foreground text-sm">{component.category}</td>
                        <td className="p-3 text-muted-foreground text-sm">{component.vendor}</td>
                        <td className="p-3 text-foreground text-right font-mono">
                          ${component.price?.toFixed(2) || '0.00'}
                        </td>
                        <td className="p-3 text-center">
                          {hasEngineeringData ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/30">
                              ✓ Custom
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {components.length > 100 && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Showing first 100 of {components.length} components
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="mt-6 bg-primary/10 border border-primary/30 rounded-lg p-4">
          <h3 className="font-semibold text-primary mb-2">Smart Sync Info</h3>
          <ul className="text-sm text-primary/80 space-y-1">
            <li>• <strong>Smartsheet Fields:</strong> price, description, category, vendor, uom, vndrnum, notes, partAbbrev, lastPriceUpdate</li>
            <li>• <strong>Protected Fields:</strong> volt, phase, amps, tags, manualLink (preserved during sync)</li>
            <li>• <strong>Merge Logic:</strong> Existing components are updated without losing engineering data</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
