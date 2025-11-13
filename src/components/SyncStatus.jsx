import React, { useState, useEffect } from 'react'
import { RefreshCw, Check, AlertCircle, Clock } from 'lucide-react'

/**
 * Sync Status Component
 * Displays database synchronization status and controls
 */
export default function SyncStatus() {
  const [syncStatus, setSyncStatus] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastError, setLastError] = useState(null)

  // Load sync status on mount and every 30 seconds
  useEffect(() => {
    loadSyncStatus()
    const interval = setInterval(loadSyncStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadSyncStatus = async () => {
    try {
      if (!window.electron?.ipcRenderer) {
        throw new Error('Electron IPC not available')
      }
      const status = await window.electron.ipcRenderer.invoke('sync:getStatus')
      console.log('Sync status loaded:', status)
      setSyncStatus(status)
      setLastError(null)
    } catch (error) {
      console.error('Failed to load sync status:', error)
      setLastError(error.message)
      // Set a minimal status to stop the loading spinner
      setSyncStatus({
        enabled: false,
        message: 'Sync manager not available: ' + error.message
      })
    }
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    setLastError(null)
    try {
      const result = await window.electron.ipcRenderer.invoke('sync:manual')
      console.log('Manual sync result:', result)
      await loadSyncStatus()
    } catch (error) {
      console.error('Manual sync failed:', error)
      setLastError(error.message)
    } finally {
      setIsSyncing(false)
    }
  }

  if (!syncStatus) {
    return (
      <div className="sync-status-loading">
        <Clock className="w-4 h-4 animate-spin" />
        <span className="text-xs text-gray-500">Loading sync status...</span>
      </div>
    )
  }

  if (!syncStatus.enabled) {
    return (
      <div className="sync-status-disabled">
        <AlertCircle className="w-4 h-4 text-yellow-500" />
        <span className="text-xs text-gray-500">Sync not available</span>
      </div>
    )
  }

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMinutes = Math.floor((now - date) / 60000)
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="sync-status-container">
      <div className="sync-status-info">
        {syncStatus.isSyncing || isSyncing ? (
          <>
            <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-xs text-blue-600">Syncing...</span>
          </>
        ) : lastError ? (
          <>
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-red-600">Sync error</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-600">
              Last sync: {formatLastSync(syncStatus.lastSyncTime)}
            </span>
          </>
        )}
      </div>

      <button
        onClick={handleManualSync}
        disabled={isSyncing || syncStatus.isSyncing}
        className="sync-button"
        title="Manually sync with NAS database"
      >
        <RefreshCw className={`w-3 h-3 ${isSyncing || syncStatus.isSyncing ? 'animate-spin' : ''}`} />
        Sync Now
      </button>

      {lastError && (
        <div className="sync-error-message">
          {lastError}
        </div>
      )}

      <style jsx>{`
        .sync-status-container {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .sync-status-loading,
        .sync-status-disabled,
        .sync-status-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sync-button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .sync-button:hover:not(:disabled) {
          background: #2563eb;
        }

        .sync-button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .sync-error-message {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          padding: 8px 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 4px;
          font-size: 12px;
          color: #991b1b;
          max-width: 300px;
          z-index: 1000;
        }
      `}</style>
    </div>
  )
}
