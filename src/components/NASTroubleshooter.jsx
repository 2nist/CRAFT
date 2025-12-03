import React, { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Wifi, WifiOff, Settings, Database, Shield, Network } from 'lucide-react'

/**
 * NAS Connectivity Troubleshooter Component
 * Provides comprehensive diagnostics and automated fixes for NAS connectivity issues
 */
export default function NASTroubleshooter() {
  const [diagnostics, setDiagnostics] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [lastRun, setLastRun] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Run diagnostics on mount
  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    setIsRunning(true)
    try {
      const result = await window.electron?.ipcRenderer?.invoke('nas:runTroubleshooter')
      setDiagnostics(result)
      setLastRun(new Date().toISOString())
    } catch (error) {
      console.error('Failed to run diagnostics:', error)
      setDiagnostics({ error: error.message })
    } finally {
      setIsRunning(false)
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-500" />
      case 'high': return <AlertTriangle className="w-5 h-5 text-orange-500" />
      case 'medium': return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'low': return <AlertTriangle className="w-5 h-5 text-blue-500" />
      default: return <CheckCircle className="w-5 h-5 text-green-500" />
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'border-red-200 bg-red-50'
      case 'high': return 'border-orange-200 bg-orange-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'low': return 'border-blue-200 bg-blue-50'
      default: return 'border-green-200 bg-green-50'
    }
  }

  const getIssueCount = (severity) => {
    if (!diagnostics?.issues) return 0
    return diagnostics.issues.filter(issue => issue.severity === severity).length
  }

  const renderOverview = () => {
    if (!diagnostics) return <div className="text-center py-8">Loading diagnostics...</div>

    const totalIssues = diagnostics.issues?.length || 0
    const criticalCount = getIssueCount('critical')
    const highCount = getIssueCount('high')

    return (
      <div className="space-y-6">
        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              {totalIssues === 0 ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              <div>
                <div className="font-semibold">Overall Status</div>
                <div className="text-sm text-gray-600">
                  {totalIssues === 0 ? 'Healthy' : `${totalIssues} issues found`}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <Network className="w-6 h-6 text-blue-500" />
              <div>
                <div className="font-semibold">Network</div>
                <div className="text-sm text-gray-600">
                  {diagnostics.tests?.find(t => t.label === 'Network Connectivity')?.status === 'pass'
                    ? 'Connected' : 'Issues detected'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <Database className="w-6 h-6 text-purple-500" />
              <div>
                <div className="font-semibold">Database</div>
                <div className="text-sm text-gray-600">
                  {diagnostics.tests?.find(t => t.label === 'Database Access')?.status === 'pass'
                    ? 'Accessible' : 'Issues detected'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-green-500" />
              <div>
                <div className="font-semibold">Permissions</div>
                <div className="text-sm text-gray-600">
                  {diagnostics.tests?.find(t => t.label === 'Permission Check')?.status === 'pass'
                    ? 'OK' : 'Issues detected'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Issues Summary */}
        {totalIssues > 0 && (
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-4">Issues Found</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {['critical', 'high', 'medium', 'low'].map(severity => {
                const count = getIssueCount(severity)
                if (count === 0) return null
                return (
                  <div key={severity} className={`p-3 rounded-lg border ${getSeverityColor(severity)}`}>
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(severity)}
                      <span className="font-medium capitalize">{severity}</span>
                    </div>
                    <div className="text-2xl font-bold mt-1">{count}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setActiveTab('network')}
              className="p-4 border rounded-lg hover:bg-gray-50 text-left"
            >
              <Network className="w-6 h-6 text-blue-500 mb-2" />
              <div className="font-medium">Network Diagnostics</div>
              <div className="text-sm text-gray-600">Test connectivity and ports</div>
            </button>

            <button
              onClick={() => setActiveTab('credentials')}
              className="p-4 border rounded-lg hover:bg-gray-50 text-left"
            >
              <Shield className="w-6 h-6 text-green-500 mb-2" />
              <div className="font-medium">Credential Manager</div>
              <div className="text-sm text-gray-600">Manage network credentials</div>
            </button>

            <button
              onClick={() => setActiveTab('permissions')}
              className="p-4 border rounded-lg hover:bg-gray-50 text-left"
            >
              <Settings className="w-6 h-6 text-purple-500 mb-2" />
              <div className="font-medium">Permission Fixer</div>
              <div className="text-sm text-gray-600">Resolve access issues</div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderIssues = () => {
    if (!diagnostics?.issues) return <div className="text-center py-8">No issues found</div>

    return (
      <div className="space-y-4">
        {diagnostics.issues.map((issue, index) => (
          <div key={index} className={`p-4 rounded-lg border ${getSeverityColor(issue.severity)}`}>
            <div className="flex items-start gap-3">
              {getSeverityIcon(issue.severity)}
              <div className="flex-1">
                <h4 className="font-medium">{issue.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                <div className="mt-3">
                  <div className="text-sm font-medium text-gray-700">Recommended Fix:</div>
                  <div className="text-sm text-gray-600 mt-1">{issue.fix}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderNetwork = () => {
    const networkTest = diagnostics?.tests?.find(t => t.label === 'Network Connectivity')
    if (!networkTest) return <div className="text-center py-8">Network test not available</div>

    const network = networkTest.result
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Network Connectivity Status</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Host Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Host:</span>
                  <span className="font-mono">{network.host || 'Not detected'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`font-medium ${network.pingable ? 'text-green-600' : 'text-red-600'}`}>
                    {network.pingable ? 'Reachable' : 'Unreachable'}
                  </span>
                </div>
                {network.latency && (
                  <div className="flex justify-between">
                    <span>Latency:</span>
                    <span>{network.latency}ms</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Port Status</h4>
              <div className="space-y-2">
                {Object.entries(network.ports || {}).map(([port, status]) => (
                  <div key={port} className="flex justify-between">
                    <span>Port {port}:</span>
                    <span className={`font-medium ${status === 'open' ? 'text-green-600' : 'text-red-600'}`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Network Troubleshooting</h3>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800">Quick Network Tests</h4>
              <div className="mt-2 space-y-2 text-sm text-blue-700">
                <div>• Run: <code className="bg-blue-100 px-1 rounded">ping {network.host}</code></div>
                <div>• Run: <code className="bg-blue-100 px-1 rounded">tracert {network.host}</code></div>
                <div>• Check firewall settings for ports 139, 445</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderCredentials = () => {
    const credTest = diagnostics?.tests?.find(t => t.label === 'Credential Validation')
    if (!credTest) return <div className="text-center py-8">Credential test not available</div>

    const creds = credTest.result
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Credential Status</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Stored Credentials</div>
                <div className="text-sm text-gray-600">Network credentials saved in Windows</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                creds.storedCredentials ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {creds.storedCredentials ? 'Found' : 'Missing'}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Active Connection</div>
                <div className="text-sm text-gray-600">Current network drive mapping</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                creds.activeConnections ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {creds.activeConnections ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Credential Management</h3>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800">Store Network Credentials</h4>
              <div className="mt-2 text-sm text-yellow-700">
                Run in Command Prompt as Administrator:
                <br />
                <code className="bg-yellow-100 px-2 py-1 rounded block mt-2">
                  cmdkey /add:{diagnostics?.tests?.find(t => t.label === 'Network Connectivity')?.result?.host} /user:DOMAIN\username /pass:password
                </code>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800">Map Network Drive</h4>
              <div className="mt-2 text-sm text-blue-700">
                Run in Command Prompt:
                <br />
                <code className="bg-blue-100 px-2 py-1 rounded block mt-2">
                  net use Z: \\{diagnostics?.tests?.find(t => t.label === 'Network Connectivity')?.result?.host}\CraftAuto-Sales /persistent:yes
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPermissions = () => {
    const permTest = diagnostics?.tests?.find(t => t.label === 'Permission Check')
    if (!permTest) return <div className="text-center py-8">Permission test not available</div>

    const perms = permTest.result
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Permission Status</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Read Access</div>
                <div className="text-sm text-gray-600">Can read files from NAS share</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                perms.readAccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {perms.readAccess ? 'Granted' : 'Denied'}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Write Access</div>
                <div className="text-sm text-gray-600">Can write files to NAS share</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                perms.writeAccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {perms.writeAccess ? 'Granted' : 'Denied'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Permission Troubleshooting</h3>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800">Access Denied Issues</h4>
              <div className="mt-2 space-y-2 text-sm text-red-700">
                <div>• Ensure user account has permissions on the NAS share</div>
                <div>• Check if the share allows both read and write access</div>
                <div>• Verify domain membership if using domain credentials</div>
                <div>• Try accessing the share directly in Windows Explorer</div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800">Test Commands</h4>
              <div className="mt-2 space-y-2 text-sm text-blue-700">
                <div>• Test read: <code className="bg-blue-100 px-1 rounded">dir \\server\share</code></div>
                <div>• Test write: Create a test file in the share</div>
                <div>• Check effective permissions on the share</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'issues', label: 'Issues', icon: AlertTriangle, count: diagnostics?.issues?.length },
    { id: 'network', label: 'Network', icon: Network },
    { id: 'credentials', label: 'Credentials', icon: Shield },
    { id: 'permissions', label: 'Permissions', icon: Database }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">NAS Connectivity Troubleshooter</h2>
          <p className="text-gray-600">Diagnose and fix NAS connectivity issues</p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="btn ca-btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running...' : 'Run Diagnostics'}
        </button>
      </div>

      {lastRun && (
        <div className="text-sm text-gray-500">
          Last run: {new Date(lastRun).toLocaleString()}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'issues' && renderIssues()}
        {activeTab === 'network' && renderNetwork()}
        {activeTab === 'credentials' && renderCredentials()}
        {activeTab === 'permissions' && renderPermissions()}
      </div>
    </div>
  )
}