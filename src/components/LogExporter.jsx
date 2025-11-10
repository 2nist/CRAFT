import React, { useState } from 'react';
import loggingService from '../services/LoggingService';

/**
 * LogExporter - Component for exporting enhanced logs to CSV files
 * Provides UI for exporting customer, margin, quotes, and projects logs
 */
const LogExporter = () => {
  const [exportStatus, setExportStatus] = useState('');
  const [selectedCategories, setSelectedCategories] = useState({
    customers: true,
    margins: true,
    quotes: true,
    projects: true
  });

  const logCategories = [
    { key: 'customers', label: 'Customer Activities', description: 'Customer creation, updates, and interactions' },
    { key: 'margins', label: 'Margin Calculations', description: 'Margin calculations and pricing activities' },
    { key: 'quotes', label: 'Quote Activities', description: 'Quote creation, updates, approvals, and status changes' },
    { key: 'projects', label: 'Project Activities', description: 'Project creation, updates, completion, and archiving' }
  ];

  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleExportLogs = async () => {
    try {
      setExportStatus('Exporting logs...');

      const selectedKeys = Object.keys(selectedCategories).filter(key => selectedCategories[key]);

      if (selectedKeys.length === 0) {
        setExportStatus('Please select at least one log category to export.');
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      let exportedCount = 0;

      for (const category of selectedKeys) {
        const csvContent = loggingService.exportLogsToCSV(category);

        if (csvContent) {
          const filename = `LOGS_${category}_${timestamp}.csv`;
          const filePath = `OUTPUT/LOGS/${filename}`;

          // Write CSV file using Electron API
          await window.app.writeFile(filePath, csvContent);
          exportedCount++;
          console.log(`Exported ${category} logs to ${filePath}`);
        }
      }

      if (exportedCount > 0) {
        setExportStatus(`Successfully exported ${exportedCount} log file(s) to OUTPUT/LOGS/`);
      } else {
        setExportStatus('No log data found to export.');
      }

    } catch (error) {
      console.error('Error exporting logs:', error);
      setExportStatus('Error exporting logs. Please check the console for details.');
    }
  };

  const handleClearLogs = () => {
    const selectedKeys = Object.keys(selectedCategories).filter(key => selectedCategories[key]);

    selectedKeys.forEach(category => {
      loggingService.clearLogs(category);
    });

    setExportStatus(`Cleared logs for: ${selectedKeys.join(', ')}`);
  };

  const getLogCounts = () => {
    return {
      customers: loggingService.getLogs('customers').length,
      margins: loggingService.getLogs('margins').length,
      quotes: loggingService.getLogs('quotes').length,
      projects: loggingService.getLogs('projects').length
    };
  };

  const logCounts = getLogCounts();

  return (
    <div className="log-exporter p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Enhanced Logging Export</h2>
      <p className="text-gray-600 mb-6">
        Export activity logs for customers, margins, quotes, and projects to CSV files.
        Logs are stored in the OUTPUT/LOGS directory.
      </p>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">Select Log Categories to Export</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {logCategories.map(({ key, label, description }) => (
            <div key={key} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                id={key}
                checked={selectedCategories[key]}
                onChange={() => handleCategoryToggle(key)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <label htmlFor={key} className="text-sm font-medium text-gray-700 cursor-pointer">
                  {label}
                </label>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {logCounts[key]} entries
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex space-x-4 mb-4">
        <button
          onClick={handleExportLogs}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Export Selected Logs
        </button>
        <button
          onClick={handleClearLogs}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
        >
          Clear Selected Logs
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
          <li>• Files are saved to: <code className="bg-gray-200 px-1 rounded">OUTPUT/LOGS/</code></li>
          <li>• Filename format: <code className="bg-gray-200 px-1 rounded">LOGS_[category]_[timestamp].csv</code></li>
          <li>• CSV format includes all log fields with proper escaping</li>
          <li>• Maximum {loggingService.maxLogEntries} entries per category</li>
        </ul>
      </div>
    </div>
  );
};

export default LogExporter;