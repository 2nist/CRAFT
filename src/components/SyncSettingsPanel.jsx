/**
 * SyncSettingsPanel - Manage sync configuration
 * Add this to your settings or dashboard
 */

import React, { useState, useEffect } from 'react';
import { syncService } from '../services/SyncService';
import { 
  RefreshCw, 
  Settings, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Download,
  Upload,
  ArrowRightLeft
} from 'lucide-react';

export function SyncSettingsPanel() {
  const [status, setStatus] = useState(syncService.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(30);
  const [selectedEntity, setSelectedEntity] = useState('all');
  const [syncDirection, setSyncDirection] = useState('both');
  const [conflictResolution, setConflictResolution] = useState('remote');

  useEffect(() => {
    const updateStatus = () => {
      const newStatus = syncService.getStatus();
      setStatus(newStatus);
      setAutoSyncEnabled(newStatus.autoSyncEnabled);
      setSyncInterval(newStatus.syncIntervalMinutes);
    };

    syncService.on('sync:start', updateStatus);
    syncService.on('sync:complete', (result) => {
      updateStatus();
      setSyncResult(result);
      setIsSyncing(false);
    });
    syncService.on('sync:error', updateStatus);
    syncService.on('autosync:started', updateStatus);
    syncService.on('autosync:stopped', updateStatus);

    return () => {
      syncService.removeAllListeners();
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      let result;
      if (selectedEntity === 'all') {
        result = await syncService.syncAll({
          direction: syncDirection,
          conflictResolution
        });
      } else {
        result = await syncService.syncEntity(selectedEntity, {
          direction: syncDirection,
          conflictResolution
        });
      }
      setSyncResult(result);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncResult({
        success: false,
        error: error.message
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    const result = await syncService.testConnection();
    alert(result.success ? 'Connection successful!' : `Connection failed: ${result.error}`);
  };

  const handleToggleAutoSync = () => {
    if (autoSyncEnabled) {
      syncService.stopAutoSync();
    } else {
      syncService.startAutoSync();
    }
    setAutoSyncEnabled(!autoSyncEnabled);
  };

  const handleSyncIntervalChange = (e) => {
    const minutes = parseInt(e.target.value, 10);
    setSyncInterval(minutes);
    syncService.setAutoSyncInterval(minutes);
  };

  const getSyncDirectionIcon = () => {
    if (syncDirection === 'push') return <Upload className="w-4 h-4" />;
    if (syncDirection === 'pull') return <Download className="w-4 h-4" />;
    return <ArrowRightLeft className="w-4 h-4" />;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-gray-600" />
          <h2 className="text-xl font-semibold">Sync Settings</h2>
        </div>

        {/* Connection Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Database Connection</span>
            {status.isConnected ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">Disconnected</span>
              </div>
            )}
          </div>
          {status.connectionError && (
            <p className="text-sm text-red-600 mb-2">{status.connectionError}</p>
          )}
          <button
            onClick={handleTestConnection}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Test Connection
          </button>
        </div>

        {/* Manual Sync Section */}
        <div className="mb-6">
          <h3 className="font-medium mb-4">Manual Sync</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Entity Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What to sync
              </label>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All (Customers, Quotes, Orders)</option>
                <option value="customers">Customers only</option>
                <option value="quotes">Quotes only</option>
                <option value="orders">Orders only</option>
              </select>
            </div>

            {/* Direction Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Direction
              </label>
              <select
                value={syncDirection}
                onChange={(e) => setSyncDirection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="both">Two-way (Push & Pull)</option>
                <option value="push">Push only (Local → Remote)</option>
                <option value="pull">Pull only (Remote → Local)</option>
              </select>
            </div>

            {/* Conflict Resolution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conflict handling
              </label>
              <select
                value={conflictResolution}
                onChange={(e) => setConflictResolution(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="remote">Keep remote (server wins)</option>
                <option value="local">Keep local (app wins)</option>
                <option value="manual">Manual resolution</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing || !status.isConnected}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium
              ${isSyncing || !status.isConnected
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
              transition-colors
            `}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                {getSyncDirectionIcon()}
                <span>Sync Now</span>
              </>
            )}
          </button>

          {/* Sync Result */}
          {syncResult && (
            <div className={`
              mt-4 p-4 rounded-lg
              ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
            `}>
              <div className="flex items-start gap-2">
                {syncResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {syncResult.success ? 'Sync completed successfully' : 'Sync failed'}
                  </p>
                  {syncResult.success && (
                    <div className="mt-2 text-sm text-gray-700 space-y-1">
                      {syncResult.customers && (
                        <div>Customers: ↑{syncResult.customers.pushed} ↓{syncResult.customers.pulled}</div>
                      )}
                      {syncResult.quotes && (
                        <div>Quotes: ↑{syncResult.quotes.pushed} ↓{syncResult.quotes.pulled}</div>
                      )}
                      {syncResult.orders && (
                        <div>Orders: ↑{syncResult.orders.pushed} ↓{syncResult.orders.pulled}</div>
                      )}
                      {syncResult.conflicts && syncResult.conflicts.length > 0 && (
                        <div className="flex items-center gap-1 text-yellow-700">
                          <AlertTriangle className="w-4 h-4" />
                          <span>{syncResult.conflicts.length} conflict(s) detected</span>
                        </div>
                      )}
                    </div>
                  )}
                  {!syncResult.success && syncResult.error && (
                    <p className="mt-2 text-sm text-red-700">{syncResult.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Auto-sync Section */}
        <div className="border-t pt-6">
          <h3 className="font-medium mb-4">Automatic Sync</h3>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium">Enable auto-sync</p>
              <p className="text-sm text-gray-600">
                Automatically sync data at regular intervals
              </p>
            </div>
            <button
              onClick={handleToggleAutoSync}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full
                transition-colors duration-200 ease-in-out
                ${autoSyncEnabled ? 'bg-blue-600' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white
                  transition-transform duration-200 ease-in-out
                  ${autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {autoSyncEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline w-4 h-4 mr-1" />
                Sync interval (minutes)
              </label>
              <input
                type="number"
                min="5"
                max="1440"
                step="5"
                value={syncInterval}
                onChange={handleSyncIntervalChange}
                className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-2 text-sm text-gray-600">
                Next sync in ~{syncInterval} minutes
              </p>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="border-t pt-6">
          <h3 className="font-medium mb-4">Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{status.stats.totalSyncs}</div>
              <div className="text-sm text-gray-600">Total Syncs</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{status.stats.successfulSyncs}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{status.stats.failedSyncs}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{status.stats.conflictsResolved}</div>
              <div className="text-sm text-gray-600">Conflicts</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SyncSettingsPanel;
