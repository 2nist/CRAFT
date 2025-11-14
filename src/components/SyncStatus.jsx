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
      <div className="flex items-center gap-1.5 px-2 py-1 bg-eggshell rounded-xs2 border border-tea">
        <Clock className="w-3.5 h-3.5 animate-spin text-slateish" />
        <span className="text-xs2 text-slateish">Loading...</span>
      </div>
    )
  }

  if (!syncStatus.enabled) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-eggshell rounded-xs2 border border-tea">
        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs2 text-slateish">Sync unavailable</span>
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
    <div className="relative flex items-center gap-2 px-2 py-1 bg-eggshell rounded-xs2 border border-tea">
      <div className="flex items-center gap-1.5">
        {syncStatus.isSyncing || isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />
            <span className="text-xs2 font-medium text-accent">Syncing...</span>
          </>
        ) : lastError ? (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-danger" />
            <span className="text-xs2 font-medium text-danger">Error</span>
          </>
        ) : (
          <>
            <Check className="w-3.5 h-3.5 text-success" />
            <span className="text-xs2 text-slateish">
              {formatLastSync(syncStatus.lastSyncTime)}
            </span>
          </>
        )}
      </div>

      <button
        onClick={handleManualSync}
        disabled={isSyncing || syncStatus.isSyncing}
        className="btn ca-btn-primary flex items-center gap-1 text-xs2 px-1.5 py-0.5"
        title="Manually sync with NAS database"
      >
        <RefreshCw className={`w-3 h-3 ${isSyncing || syncStatus.isSyncing ? 'animate-spin' : ''}`} />
        <span>Sync</span>
      </button>

      {lastError && (
        <div className="absolute top-full right-0 mt-1 px-2 py-1.5 bg-white border border-danger rounded-xs2 shadow-panel text-xs2 text-danger max-w-xs z-50">
          {lastError}
        </div>
      )}
    </div>
  )
}
