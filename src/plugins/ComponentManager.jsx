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

  const getLogIcon = (type) => {
    switch (type) {
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      case 'success': return <CheckCircle size={16} className="text-green-500" />;
      case 'warning': return <AlertCircle size={16} className="text-yellow-500" />;
      default: return <Loader size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Component Manager</h1>
        
        {/* Action Buttons */}
        <div className="mb-6 flex gap-4">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            <Download size={18} />
            Download Template
          </button>
        </div>

        {/* Sync Log Panel */}
        {logs.length > 0 && (
          <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-3">Sync Log</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  {getLogIcon(log.type)}
                  <span className="text-gray-500 font-mono">[{log.timestamp}]</span>
                  <span className={`flex-1 ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    'text-gray-300'
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
              ? 'bg-green-900/20 border-green-700' 
              : 'bg-red-900/20 border-red-700'
          }`}>
            <div className="flex items-center gap-2">
              {syncResult.success ? (
                <>
                  <CheckCircle className="text-green-500" size={24} />
                  <div>
                    <h3 className="font-semibold text-green-400">Sync Successful</h3>
                    <p className="text-sm text-green-300">
                      {syncResult.updated} updated, {syncResult.added} added
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="text-red-500" size={24} />
                  <div>
                    <h3 className="font-semibold text-red-400">Sync Failed</h3>
                    <p className="text-sm text-red-300">{syncResult.error}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Components Table */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">
              Component Catalog ({components.length} items)
            </h2>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin text-blue-500" size={32} />
              <span className="ml-3 text-gray-400">Loading components...</span>
            </div>
          ) : components.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No components found</p>
              <p className="text-sm text-gray-500">Upload a CSV to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-3 text-gray-400 font-semibold">SKU</th>
                    <th className="text-left p-3 text-gray-400 font-semibold">Description</th>
                    <th className="text-left p-3 text-gray-400 font-semibold">Category</th>
                    <th className="text-left p-3 text-gray-400 font-semibold">Vendor</th>
                    <th className="text-right p-3 text-gray-400 font-semibold">Price</th>
                    <th className="text-center p-3 text-gray-400 font-semibold">Engineering</th>
                  </tr>
                </thead>
                <tbody>
                  {components.slice(0, 100).map((component, index) => {
                    const hasEngineeringData = component.volt || component.phase || component.amps || component.tags;
                    return (
                      <tr key={component.sku || index} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                        <td className="p-3 text-gray-300 font-mono text-sm">{component.sku}</td>
                        <td className="p-3 text-gray-300 max-w-md truncate">{component.description}</td>
                        <td className="p-3 text-gray-400 text-sm">{component.category}</td>
                        <td className="p-3 text-gray-400 text-sm">{component.vendor}</td>
                        <td className="p-3 text-gray-300 text-right font-mono">
                          ${component.price?.toFixed(2) || '0.00'}
                        </td>
                        <td className="p-3 text-center">
                          {hasEngineeringData ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-900/50 text-blue-300 border border-blue-700">
                              ✓ Custom
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {components.length > 100 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Showing first 100 of {components.length} components
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <h3 className="font-semibold text-blue-400 mb-2">Smart Sync Info</h3>
          <ul className="text-sm text-blue-300 space-y-1">
            <li>• <strong>Smartsheet Fields:</strong> price, description, category, vendor, uom, vndrnum, notes, partAbbrev, lastPriceUpdate</li>
            <li>• <strong>Protected Fields:</strong> volt, phase, amps, tags, manualLink (preserved during sync)</li>
            <li>• <strong>Merge Logic:</strong> Existing components are updated without losing engineering data</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
