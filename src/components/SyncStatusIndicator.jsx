/**
 * SyncStatusIndicator - Shows current sync status in the UI
 * Add this component to your dashboard or main layout
 */

import React, { useState, useEffect } from 'react';
import { syncService } from '../services/SyncService';
import { CloudUpload, CloudDownload, Cloud, AlertCircle, CheckCircle, Loader } from 'lucide-react';

export function SyncStatusIndicator() {
  const [status, setStatus] = useState(syncService.getStatus());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Update status when sync events occur
    const updateStatus = () => setStatus(syncService.getStatus());

    syncService.on('sync:start', updateStatus);
    syncService.on('sync:complete', updateStatus);
    syncService.on('sync:error', updateStatus);
    syncService.on('connection:established', updateStatus);
    syncService.on('connection:failed', updateStatus);
    syncService.on('autosync:started', updateStatus);
    syncService.on('autosync:stopped', updateStatus);

    return () => {
      syncService.removeAllListeners();
    };
  }, []);

  const getStatusIcon = () => {
    if (status.isSyncing) {
      return <Loader className="w-4 h-4 animate-spin text-blue-500" />;
    }
    if (!status.isConnected) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (status.lastSyncTime) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <Cloud className="w-4 h-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (status.isSyncing) {
      return 'Syncing...';
    }
    if (!status.isConnected) {
      return 'Disconnected';
    }
    if (status.lastSyncTime) {
      const lastSync = new Date(status.lastSyncTime);
      const now = new Date();
      const diffMinutes = Math.floor((now - lastSync) / 1000 / 60);
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes === 1) return '1 minute ago';
      if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    return 'Never synced';
  };

  const getStatusColor = () => {
    if (status.isSyncing) return 'bg-blue-100 border-blue-300';
    if (!status.isConnected) return 'bg-red-100 border-red-300';
    if (status.lastSyncTime) return 'bg-green-100 border-green-300';
    return 'bg-gray-100 border-gray-300';
  };

  return (
    <div className="relative">
      {/* Compact Status Badge */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full border
          ${getStatusColor()}
          hover:shadow-md transition-all duration-200
          text-xs font-medium
        `}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        {status.autoSyncEnabled && (
          <span className="text-xs text-gray-500">
            (Auto: {status.syncIntervalMinutes}m)
          </span>
        )}
      </button>

      {/* Expanded Status Panel */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <div className="space-y-3">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Connection</span>
              <div className="flex items-center gap-2">
                {status.isConnected ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">Connected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600">Disconnected</span>
                  </>
                )}
              </div>
            </div>

            {/* Auto-sync Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Auto-sync</span>
              <span className={`text-sm ${status.autoSyncEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {status.autoSyncEnabled ? `Every ${status.syncIntervalMinutes}m` : 'Disabled'}
              </span>
            </div>

            {/* Statistics */}
            <div className="border-t pt-3">
              <div className="text-xs font-medium text-gray-500 mb-2">Statistics</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Total syncs:</span>
                  <span className="ml-2 font-medium">{status.stats.totalSyncs}</span>
                </div>
                <div>
                  <span className="text-gray-500">Successful:</span>
                  <span className="ml-2 font-medium text-green-600">{status.stats.successfulSyncs}</span>
                </div>
                <div>
                  <span className="text-gray-500">Failed:</span>
                  <span className="ml-2 font-medium text-red-600">{status.stats.failedSyncs}</span>
                </div>
                <div>
                  <span className="text-gray-500">Conflicts:</span>
                  <span className="ml-2 font-medium text-yellow-600">{status.stats.conflictsResolved}</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <CloudUpload className="w-3 h-3 text-blue-500" />
                  <span className="text-gray-500">Pushed:</span>
                  <span className="font-medium">{status.stats.recordsPushed}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CloudDownload className="w-3 h-3 text-green-500" />
                  <span className="text-gray-500">Pulled:</span>
                  <span className="font-medium">{status.stats.recordsPulled}</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {status.connectionError && (
              <div className="border-t pt-3">
                <div className="text-xs font-medium text-red-500 mb-1">Error</div>
                <div className="text-xs text-gray-600 bg-red-50 p-2 rounded">
                  {status.connectionError}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SyncStatusIndicator;
