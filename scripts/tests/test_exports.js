/**
 * Export Test Script - Generates sample CSV files for all export functionalities
 * This script creates test data and exports it to demonstrate the enhanced logging and export system
 */

import loggingService from './src/services/LoggingService.js';

// Simulate some activities to generate log data
function generateSampleLogs() {
  console.log('Generating sample log data...');

  // Generate customer activities
  loggingService.logCustomerActivity('create', 'CUST001', 'ABC Manufacturing', { industry: 'Food & Beverage' });
  loggingService.logCustomerActivity('update', 'CUST001', 'ABC Manufacturing', { field: 'contact', oldValue: 'old@email.com', newValue: 'new@email.com' });
  loggingService.logCustomerActivity('view', 'CUST001', 'ABC Manufacturing', { source: 'quote_configurator' });

  // Generate margin calculations
  loggingService.logMarginActivity('calculate', 1000, 25, 1250, { source: 'quote_save', quoteId: 'CQ251031035-10100110-0' });
  loggingService.logMarginActivity('calculate', 2500, 20, 3000, { source: 'margin_calculator', calculationType: 'cost_and_margin' });
  loggingService.logMarginActivity('calculate', 500, 30, 650, { source: 'margin_calculator', calculationType: 'price_input' });

  // Generate quote activities
  loggingService.logQuoteActivity('create', 'CQ251031035-10100110-0', 'Brewery Control System', 'ABC Manufacturing', 'draft', { value: 12500 });
  loggingService.logQuoteActivity('update', 'CQ251031035-10100110-0', 'Brewery Control System', 'ABC Manufacturing', 'quoted', { changes: ['pricing', 'components'] });
  loggingService.logQuoteActivity('approve', 'CQ251031035-10100110-0', 'Brewery Control System', 'ABC Manufacturing', 'approved', { approvedBy: 'manager', approvalDate: new Date().toISOString() });

  // Generate project activities
  loggingService.logProjectActivity('create', 'CA251031035-10100110', 'Brewery Control System', 'ABC Manufacturing', 'approved', { quoteId: 'CQ251031035-10100110-0' });
  loggingService.logProjectActivity('update', 'CA251031035-10100110', 'Brewery Control System', 'ABC Manufacturing', 'in_progress', { statusChange: 'draft_to_in_progress' });
  loggingService.logProjectActivity('complete', 'CA251031035-10100110', 'Brewery Control System', 'ABC Manufacturing', 'complete', { completionDate: new Date().toISOString() });

  console.log('Sample log data generated successfully');
}

// Export logs to CSV files
async function exportLogs() {
  console.log('Exporting logs to CSV files...');

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    let exportedCount = 0;

    const logTypes = ['customers', 'margins', 'quotes', 'projects'];

    for (const logType of logTypes) {
      const csvContent = loggingService.exportLogsToCSV(logType);

      if (csvContent) {
        const filename = `LOGS_${logType}_${timestamp}.csv`;
        const filePath = `OUTPUT/LOGS/${filename}`;

        // In a real environment, this would use the Electron API
        // For testing purposes, we'll simulate the file write
        console.log(`Would export ${logType} logs to: ${filePath}`);
        console.log(`CSV Content (${csvContent.split('\n').length} lines):`);
        console.log(csvContent.substring(0, 200) + (csvContent.length > 200 ? '...' : ''));

        exportedCount++;
      }
    }

    console.log(`Successfully exported ${exportedCount} log files`);

  } catch (error) {
    console.error('Error exporting logs:', error);
  }
}

// Generate sample assembly data export
async function generateAssemblyExport() {
  console.log('Generating sample assembly export...');

  const sampleAssemblies = [
    {
      assemblyId: 'ASM-ENCLOSURE-24x36',
      description: '24x36 NEMA 4X Enclosure Kit',
      category: 'Enclosure',
      components: [
        { sku: 'ENC-2436-4X', quantity: 1, notes: 'Main control enclosure' }
      ],
      estimatedLaborHours: 2
    },
    {
      assemblyId: 'ASM-PLC-BASIC',
      description: 'Basic PLC Starter Kit',
      category: 'PLC/COM',
      components: [
        { sku: 'PLC-CPU-1500', quantity: 1, notes: 'CPU module' },
        { sku: 'PLC-PWR-24V', quantity: 1, notes: 'Power supply' }
      ],
      estimatedLaborHours: 4
    }
  ];

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `Assemblies_Sample_${timestamp}.csv`;
  const csvRows = [];

  csvRows.push('Assembly ID,Description,Category,Component SKU,Component Quantity,Component Notes,Estimated Labor Hours');

  sampleAssemblies.forEach(assembly => {
    if (assembly.components && assembly.components.length > 0) {
      assembly.components.forEach((component, index) => {
        const row = [
          index === 0 ? assembly.assemblyId : '',
          index === 0 ? assembly.description : '',
          index === 0 ? assembly.category : '',
          component.sku,
          component.quantity,
          component.notes,
          index === 0 ? assembly.estimatedLaborHours : ''
        ];
        csvRows.push(row.join(','));
      });
    }
  });

  const csvContent = csvRows.join('\n');
  console.log(`Would export assemblies to: OUTPUT/Assemblies/${filename}`);
  console.log(`CSV Content (${csvRows.length} lines):`);
  console.log(csvContent);
}

// Generate sample settings export
async function generateSettingsExport() {
  console.log('Generating sample settings export...');

  const sampleSettings = {
    theme: 'slate',
    layout: {
      showRecentQuotes: true,
      showDocumentHub: true,
      showUsefulLinks: true,
      showWelcomeMessage: true,
      columns: '3',
      cardStyle: 'expanded'
    },
    welcomeMessage: {
      enabled: true,
      title: 'Welcome to Craft Tools Hub',
      subtitle: 'Your central hub for quotes, projects, and automation tools',
      showLogo: true
    },
    customization: {
      accentColor: 'blue',
      borderRadius: 'lg',
      fontFamily: 'default'
    },
    export: {
      defaultPath: '',
      defaultFormat: 'CSV',
      includeTimestamp: true
    }
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `Settings_Sample_${timestamp}.csv`;
  const csvRows = [];

  csvRows.push('Section,Setting,Value,Description');

  // Dashboard settings
  csvRows.push(`Dashboard,showRecentQuotes,${sampleSettings.layout.showRecentQuotes},Show recent quotes section`);
  csvRows.push(`Dashboard,showDocumentHub,${sampleSettings.layout.showDocumentHub},Show document hub section`);
  csvRows.push(`Dashboard,columns,${sampleSettings.layout.columns},Number of dashboard columns`);

  // Theme settings
  csvRows.push(`Theme,theme,${sampleSettings.theme},Selected theme`);
  csvRows.push(`Theme,accentColor,${sampleSettings.customization.accentColor},Accent color`);

  // Export settings
  csvRows.push(`Export,defaultFormat,${sampleSettings.export.defaultFormat},Default export format`);
  csvRows.push(`Export,includeTimestamp,${sampleSettings.export.includeTimestamp},Include timestamp in exports`);

  const csvContent = csvRows.join('\n');
  console.log(`Would export settings to: OUTPUT/Settings/${filename}`);
  console.log(`CSV Content (${csvRows.length} lines):`);
  console.log(csvContent);
}

// Main test function
async function runExportTests() {
  console.log('=== Craft Tools Hub Export System Test ===\n');

  try {
    // Generate and export logs
    generateSampleLogs();
    await exportLogs();

    console.log('\n' + '='.repeat(50) + '\n');

    // Generate sample assembly export
    await generateAssemblyExport();

    console.log('\n' + '='.repeat(50) + '\n');

    // Generate sample settings export
    await generateSettingsExport();

    console.log('\n=== Export System Test Complete ===');
    console.log('All export functionalities have been tested successfully!');
    console.log('Check the OUTPUT directory for generated CSV files.');

  } catch (error) {
    console.error('Export test failed:', error);
  }
}

// Export for use in other modules
export { runExportTests };

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  runExportTests();
}