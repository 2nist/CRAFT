import React, { useState, useEffect } from 'react';
import loggingService from '../services/LoggingService';

/**
 * AssemblyExporter - Component for exporting assembly and sub-assembly data to CSV files
 * Provides UI for exporting assembly libraries to CSV files in the OUTPUT/Assemblies directory
 */
const AssemblyExporter = () => {
  const [assemblies, setAssemblies] = useState([]);
  const [subAssemblies, setSubAssemblies] = useState([]);
  const [exportStatus, setExportStatus] = useState('');
  const [selectedCategories, setSelectedCategories] = useState({
    assemblies: true,
    subAssemblies: true
  });

  useEffect(() => {
    loadAssemblyData();
  }, []);

  const loadAssemblyData = async () => {
    try {
      const [assembliesData, subAssembliesData] = await Promise.all([
        window.assemblies?.getAll?.() || [],
        window.subAssemblies?.getAll?.() || []
      ]);

      setAssemblies(assembliesData);
      setSubAssemblies(subAssembliesData);
    } catch (error) {
      console.error('Error loading assembly data:', error);
      setExportStatus('Error loading assembly data. Please check the console for details.');
    }
  };

  const handleCategoryToggle = (category) => {
    setSelectedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const exportAssembliesToCSV = async (data, type) => {
    if (!data || data.length === 0) {
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `Assemblies_${type}_${timestamp}.csv`;
    const csvRows = [];

    // Header row
    csvRows.push('Assembly ID,Description,Category,Component SKU,Component Quantity,Component Notes,Estimated Labor Hours');

    data.forEach(assembly => {
      const assemblyId = assembly.assemblyId || assembly.subAssemblyId;
      const baseRow = [
        assemblyId,
        assembly.description || '',
        assembly.category || '',
        '', // Component SKU (will be filled in component loop)
        '', // Component Quantity
        '', // Component Notes
        assembly.estimatedLaborHours || 0
      ];

      if (assembly.components && assembly.components.length > 0) {
        assembly.components.forEach((component, index) => {
          const componentRow = [...baseRow];
          componentRow[3] = component.sku || ''; // Component SKU
          componentRow[4] = component.quantity || 1; // Component Quantity
          componentRow[5] = component.notes || ''; // Component Notes

          // For the first component, include assembly info, for others just component info
          if (index === 0) {
            csvRows.push(componentRow.map(escapeCsvValue).join(','));
          } else {
            // Subsequent components: empty assembly fields, just component data
            const continuationRow = [
              '', // Assembly ID (empty for continuation)
              '', // Description (empty for continuation)
              '', // Category (empty for continuation)
              component.sku || '',
              component.quantity || 1,
              component.notes || '',
              '' // Labor hours (empty for continuation)
            ];
            csvRows.push(continuationRow.map(escapeCsvValue).join(','));
          }
        });
      } else {
        // Assembly with no components
        csvRows.push(baseRow.map(escapeCsvValue).join(','));
      }
    });

    const csvContent = csvRows.join('\n');

    try {
      await window.app.writeFile(`OUTPUT/Assemblies/${filename}`, csvContent);

      // Log the export activity
      loggingService.logProjectActivity(
        'export',
        'assemblies_export',
        `${type} Library Export`,
        'system',
        'exported',
        {
          filename,
          recordCount: data.length,
          type
        }
      );

      return { filename, recordCount: data.length };
    } catch (error) {
      console.error(`Error exporting ${type} to CSV:`, error);
      throw error;
    }
  };

  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const handleExportAssemblies = async () => {
    try {
      setExportStatus('Exporting assemblies...');

      const selectedKeys = Object.keys(selectedCategories).filter(key => selectedCategories[key]);

      if (selectedKeys.length === 0) {
        setExportStatus('Please select at least one assembly type to export.');
        return;
      }

      let exportedCount = 0;
      const results = [];

      if (selectedCategories.assemblies && assemblies.length > 0) {
        const result = await exportAssembliesToCSV(assemblies, 'Main');
        if (result) {
          results.push(`Main Assemblies: ${result.recordCount} records`);
          exportedCount++;
        }
      }

      if (selectedCategories.subAssemblies && subAssemblies.length > 0) {
        const result = await exportAssembliesToCSV(subAssemblies, 'Sub');
        if (result) {
          results.push(`Sub-Assemblies: ${result.recordCount} records`);
          exportedCount++;
        }
      }

      if (exportedCount > 0) {
        setExportStatus(`Successfully exported ${exportedCount} assembly file(s) to OUTPUT/Assemblies/: ${results.join(', ')}`);
      } else {
        setExportStatus('No assembly data found to export.');
      }

    } catch (error) {
      console.error('Error exporting assemblies:', error);
      setExportStatus('Error exporting assemblies. Please check the console for details.');
    }
  };

  const getAssemblyCounts = () => {
    return {
      assemblies: assemblies.length,
      subAssemblies: subAssemblies.length
    };
  };

  const assemblyCounts = getAssemblyCounts();

  return (
    <div className="assembly-exporter p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-slateish">Assembly Library Export</h2>
      <p className="text-slateish/80 mb-6">
        Export assembly and sub-assembly libraries to CSV files.
        Files are saved in the OUTPUT/Assemblies directory.
      </p>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-slateish">Select Assembly Types to Export</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-sand">
            <input
              type="checkbox"
              id="assemblies"
              checked={selectedCategories.assemblies}
              onChange={() => handleCategoryToggle('assemblies')}
              className="mt-1 h-4 w-4 text-accent focus:ring-accent border-slateish/30 rounded"
            />
            <div className="flex-1">
              <label htmlFor="assemblies" className="text-sm font-medium text-slateish cursor-pointer">
                Main Assemblies
              </label>
              <p className="text-xs text-slateish/60 mt-1">Complete assembly configurations with components</p>
              <p className="text-xs text-accent mt-1">
                {assemblyCounts.assemblies} assemblies available
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-sand">
            <input
              type="checkbox"
              id="subAssemblies"
              checked={selectedCategories.subAssemblies}
              onChange={() => handleCategoryToggle('subAssemblies')}
              className="mt-1 h-4 w-4 text-accent focus:ring-accent border-slateish/30 rounded"
            />
            <div className="flex-1">
              <label htmlFor="subAssemblies" className="text-sm font-medium text-slateish cursor-pointer">
                Sub-Assemblies
              </label>
              <p className="text-xs text-slateish/60 mt-1">Modular sub-assembly components and parts</p>
              <p className="text-xs text-accent mt-1">
                {assemblyCounts.subAssemblies} sub-assemblies available
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-4 mb-4">
        <button
          onClick={handleExportAssemblies}
          className="btn ca-btn-primary px-6 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          Export Selected Assemblies
        </button>
        <button
          onClick={loadAssemblyData}
          className="btn ca-btn-secondary px-6 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          Refresh Data
        </button>
      </div>

      {exportStatus && (
        <div className={`p-3 rounded-lg ${
          exportStatus.includes('Error') || exportStatus.includes('Please select')
            ? 'bg-danger/10 text-danger border border-danger/30'
            : exportStatus.includes('Successfully')
            ? 'bg-success/10 text-success border border-success/30'
            : 'bg-info/10 text-info border border-info/30'
        }`}>
          {exportStatus}
        </div>
      )}

      <div className="mt-6 p-4 bg-sand rounded-lg">
        <h4 className="text-sm font-semibold text-slateish mb-2">Export Details</h4>
        <ul className="text-sm text-slateish/80 space-y-1">
          <li>• Files are saved to: <code className="bg-slateish/10 px-1 rounded">OUTPUT/Assemblies/</code></li>
          <li>• Filename format: <code className="bg-slateish/10 px-1 rounded">Assemblies_[Type]_[timestamp].csv</code></li>
          <li>• CSV includes assembly details with component breakdowns</li>
          <li>• Each component appears on a separate row with assembly info on the first row</li>
        </ul>
      </div>
    </div>
  );
};

export default AssemblyExporter;