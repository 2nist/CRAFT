import React, { useState, useEffect } from 'react';
import loggingService from '../services/LoggingService';

/**
 * SettingsExporter - Component for exporting application settings to CSV files
 * Provides UI for exporting dashboard settings and configuration to CSV files in the OUTPUT/Settings directory
 */
const SettingsExporter = () => {
  const [settings, setSettings] = useState(null);
  const [exportStatus, setExportStatus] = useState('');
  const [selectedSettings, setSelectedSettings] = useState({
    dashboard: true,
    theme: true,
    export: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsData = await window.api?.getDashboardSettings?.() || {};
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading settings:', error);
      setExportStatus('Error loading settings. Please check the console for details.');
    }
  };

  const handleSettingToggle = (setting) => {
    setSelectedSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const exportSettingsToCSV = async () => {
    if (!settings) {
      throw new Error('No settings data available');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `Settings_Export_${timestamp}.csv`;
    const csvRows = [];

    // Header row
    csvRows.push('Section,Setting,Value,Description');

    // Dashboard layout settings
    if (selectedSettings.dashboard) {
      csvRows.push('Dashboard,showRecentQuotes,' + (settings.layout?.showRecentQuotes ?? true) + ',Show recent quotes section');
      csvRows.push('Dashboard,showDocumentHub,' + (settings.layout?.showDocumentHub ?? true) + ',Show document hub section');
      csvRows.push('Dashboard,showUsefulLinks,' + (settings.layout?.showUsefulLinks ?? true) + ',Show useful links section');
      csvRows.push('Dashboard,showWelcomeMessage,' + (settings.layout?.showWelcomeMessage ?? true) + ',Show welcome message');
      csvRows.push('Dashboard,columns,' + (settings.layout?.columns || '3') + ',Number of dashboard columns');
      csvRows.push('Dashboard,cardStyle,' + (settings.layout?.cardStyle || 'expanded') + ',Dashboard card style');
    }

    // Welcome message settings
    if (selectedSettings.dashboard) {
      csvRows.push('Welcome,enabled,' + (settings.welcomeMessage?.enabled ?? true) + ',Welcome message enabled');
      csvRows.push('Welcome,title,"' + (settings.welcomeMessage?.title || 'Welcome to Craft Tools Hub') + '",Welcome message title');
      csvRows.push('Welcome,subtitle,"' + (settings.welcomeMessage?.subtitle || 'Your central hub for quotes, projects, and automation tools') + '",Welcome message subtitle');
      csvRows.push('Welcome,showLogo,' + (settings.welcomeMessage?.showLogo ?? true) + ',Show logo in welcome message');
    }

    // Theme settings
    if (selectedSettings.theme) {
      csvRows.push('Theme,theme,' + (settings.theme || 'slate') + ',Selected theme');
      csvRows.push('Theme,accentColor,' + (settings.customization?.accentColor || 'blue') + ',Accent color');
      csvRows.push('Theme,borderRadius,' + (settings.customization?.borderRadius || 'lg') + ',Border radius');
      csvRows.push('Theme,fontFamily,' + (settings.customization?.fontFamily || 'default') + ',Font family');
    }

    // Export settings
    if (selectedSettings.export) {
      csvRows.push('Export,defaultPath,"' + (settings.export?.defaultPath || '') + '",Default export path');
      csvRows.push('Export,defaultFormat,' + (settings.export?.defaultFormat || 'CSV') + ',Default export format');
      csvRows.push('Export,includeTimestamp,' + (settings.export?.includeTimestamp ?? true) + ',Include timestamp in exports');
    }

    const csvContent = csvRows.join('\n');

    try {
      await window.app.writeFile(`OUTPUT/Settings/${filename}`, csvContent);

      // Log the export activity
      loggingService.logProjectActivity(
        'export',
        'settings_export',
        'Application Settings Export',
        'system',
        'exported',
        {
          filename,
          sections: Object.keys(selectedSettings).filter(key => selectedSettings[key])
        }
      );

      return { filename };
    } catch (error) {
      console.error('Error exporting settings to CSV:', error);
      throw error;
    }
  };

  const handleExportSettings = async () => {
    try {
      setExportStatus('Exporting settings...');

      const selectedKeys = Object.keys(selectedSettings).filter(key => selectedSettings[key]);

      if (selectedKeys.length === 0) {
        setExportStatus('Please select at least one settings category to export.');
        return;
      }

      const result = await exportSettingsToCSV();

      if (result) {
        setExportStatus(`Successfully exported settings to OUTPUT/Settings/${result.filename}`);
      } else {
        setExportStatus('No settings data found to export.');
      }

    } catch (error) {
      console.error('Error exporting settings:', error);
      setExportStatus('Error exporting settings. Please check the console for details.');
    }
  };

  const getSelectedCount = () => {
    return Object.values(selectedSettings).filter(Boolean).length;
  };

  const selectedCount = getSelectedCount();

  return (
    <div className="settings-exporter p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Application Settings Export</h2>
      <p className="text-gray-600 mb-6">
        Export application settings and configuration to CSV files.
        Files are saved in the OUTPUT/Settings directory.
      </p>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Select Settings Categories to Export</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              id="dashboard"
              checked={selectedSettings.dashboard}
              onChange={() => handleSettingToggle('dashboard')}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <label htmlFor="dashboard" className="text-sm font-medium text-gray-700 cursor-pointer">
                Dashboard Layout
              </label>
              <p className="text-xs text-gray-500 mt-1">Layout preferences and welcome message settings</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              id="theme"
              checked={selectedSettings.theme}
              onChange={() => handleSettingToggle('theme')}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <label htmlFor="theme" className="text-sm font-medium text-gray-700 cursor-pointer">
                Theme & Appearance
              </label>
              <p className="text-xs text-gray-500 mt-1">Theme, colors, and visual customization</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              id="export"
              checked={selectedSettings.export}
              onChange={() => handleSettingToggle('export')}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <label htmlFor="export" className="text-sm font-medium text-gray-700 cursor-pointer">
                Export Preferences
              </label>
              <p className="text-xs text-gray-500 mt-1">Default export settings and paths</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-4 mb-4">
        <button
          onClick={handleExportSettings}
          disabled={selectedCount === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export Selected Settings
        </button>
        <button
          onClick={loadSettings}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        >
          Refresh Settings
        </button>
      </div>

      {exportStatus && (
        <div className={`p-3 rounded-lg ${
          exportStatus.includes('Error') || exportStatus.includes('Please select')
            ? 'bg-red-100 text-red-700 border border-red-300'
            : exportStatus.includes('Successfully')
            ? 'bg-green-100 text-green-700 border border-green-300'
            : 'bg-blue-100 text-blue-700 border border-blue-300'
        }`}>
          {exportStatus}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Export Details</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Files are saved to: <code className="bg-gray-200 px-1 rounded">OUTPUT/Settings/</code></li>
          <li>• Filename format: <code className="bg-gray-200 px-1 rounded">Settings_Export_[timestamp].csv</code></li>
          <li>• CSV includes all selected settings categories with descriptions</li>
          <li>• Settings can be imported back to restore configuration</li>
        </ul>
      </div>

      {settings && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-700 mb-2">Current Settings Summary</h4>
          <div className="text-sm text-blue-600">
            <p>Theme: {settings.theme || 'Not set'}</p>
            <p>Accent Color: {settings.customization?.accentColor || 'Not set'}</p>
            <p>Dashboard Columns: {settings.layout?.columns || 'Not set'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsExporter;