import React, { useEffect, useState } from 'react'

export default function RuntimeStatus() {
  const [status, setStatus] = useState(null)
  const [diagnostics, setDiagnostics] = useState(null)
  const [loading, setLoading] = useState(false)

  async function fetchStatus() {
    try {
      setLoading(true)
      if (window.runtime && typeof window.runtime.getStatus === 'function') {
        const s = await window.runtime.getStatus()
        setStatus(s)
      } else if (window.electron && window.electron.ipcRenderer) {
        const s = await window.electron.ipcRenderer.invoke('runtime:get-status')
        setStatus(s)
      }
    } catch (err) {
      setStatus({ ok: false, error: String(err.message || err) })
    } finally {
      setLoading(false)
    }
  }

  async function runDiagnostics() {
    try {
      setDiagnostics(null)
      setLoading(true)
      const res = await (window.electron && window.electron.ipcRenderer
        ? window.electron.ipcRenderer.invoke('runtime:run-diagnostics', { skipWrite: true })
        : window.electronAPI?.ping?.())
      setDiagnostics(res)
    } catch (err) {
      setDiagnostics({ ok: false, error: String(err.message || err) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="ca-tab-panel">
      <h3 className="ca-stat-title">Runtime / NAS Status</h3>
      {loading && <div>Loading…</div>}
      {!loading && status && (
        <div className="mt-2">
          <div><strong>Root:</strong> {status.runtimeRoot}</div>
          <div><strong>Message:</strong> {status.message}</div>
          {status.error && <div className="text-danger">Error: {status.error}</div>}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button className="btn ca-btn" onClick={fetchStatus}>Refresh</button>
        <button className="btn ca-btn-outline" onClick={runDiagnostics}>Run NAS Diagnostics</button>
      </div>

      {diagnostics && (
        <pre className="mt-3 text-xs bg-white p-2 rounded-sm2 overflow-auto" style={{ maxHeight: 300 }}>
          {typeof diagnostics === 'string' ? diagnostics : JSON.stringify(diagnostics, null, 2)}
        </pre>
      )}
    </div>
  )
}
