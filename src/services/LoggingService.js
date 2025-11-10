/**
 * LoggingService - Enhanced logging for customer, margin, quotes, and projects activities
 * Provides structured logging with CSV export capabilities
 */

class LoggingService {
  constructor() {
    this.logs = {
      customers: [],
      margins: [],
      quotes: [],
      projects: []
    };
    this.maxLogEntries = 1000; // Limit log entries to prevent memory issues
  }

  /**
   * Log a customer-related activity
   * @param {string} action - The action performed (create, update, delete, view)
   * @param {string} customerId - Customer identifier
   * @param {string} customerName - Customer name
   * @param {Object} details - Additional details about the activity
   */
  logCustomerActivity(action, customerId, customerName, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      category: 'customer',
      action,
      customerId,
      customerName,
      details: JSON.stringify(details),
      user: 'system' // Could be enhanced to track actual users
    };

    this.logs.customers.push(logEntry);
    this._trimLogs('customers');
    console.log(`[Customer Log] ${action}: ${customerName} (${customerId})`);
  }

  /**
   * Log a margin calculation activity
   * @param {string} action - The action performed (calculate, update, view)
   * @param {number} cost - Base cost
   * @param {number} marginPercent - Margin percentage
   * @param {number} finalPrice - Final price after margin
   * @param {Object} details - Additional details about the calculation
   */
  logMarginActivity(action, cost, marginPercent, finalPrice, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      category: 'margin',
      action,
      cost: cost.toFixed(2),
      marginPercent: marginPercent.toFixed(2),
      finalPrice: finalPrice.toFixed(2),
      profit: (finalPrice - cost).toFixed(2),
      details: JSON.stringify(details),
      user: 'system'
    };

    this.logs.margins.push(logEntry);
    this._trimLogs('margins');
    console.log(`[Margin Log] ${action}: $${cost} @ ${marginPercent}% = $${finalPrice}`);
  }

  /**
   * Log a quote-related activity
   * @param {string} action - The action performed (create, update, approve, reject, view)
   * @param {string} quoteId - Quote identifier
   * @param {string} projectName - Project name
   * @param {string} customer - Customer name
   * @param {string} status - Quote status
   * @param {Object} details - Additional details about the activity
   */
  logQuoteActivity(action, quoteId, projectName, customer, status, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      category: 'quote',
      action,
      quoteId,
      projectName,
      customer,
      status,
      details: JSON.stringify(details),
      user: 'system'
    };

    this.logs.quotes.push(logEntry);
    this._trimLogs('quotes');
    console.log(`[Quote Log] ${action}: ${quoteId} - ${projectName} (${customer})`);
  }

  /**
   * Log a project-related activity
   * @param {string} action - The action performed (create, update, complete, archive, view)
   * @param {string} projectId - Project identifier
   * @param {string} projectName - Project name
   * @param {string} customer - Customer name
   * @param {string} status - Project status
   * @param {Object} details - Additional details about the activity
   */
  logProjectActivity(action, projectId, projectName, customer, status, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      category: 'project',
      action,
      projectId,
      projectName,
      customer,
      status,
      details: JSON.stringify(details),
      user: 'system'
    };

    this.logs.projects.push(logEntry);
    this._trimLogs('projects');
    console.log(`[Project Log] ${action}: ${projectId} - ${projectName} (${customer})`);
  }

  /**
   * Trim logs to prevent memory issues
   * @private
   * @param {string} category - Log category to trim
   */
  _trimLogs(category) {
    if (this.logs[category].length > this.maxLogEntries) {
      this.logs[category] = this.logs[category].slice(-this.maxLogEntries);
    }
  }

  /**
   * Get logs for a specific category
   * @param {string} category - Log category (customers, margins, quotes, projects)
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Log entries
   */
  getLogs(category, limit = null) {
    const categoryLogs = this.logs[category] || [];
    if (limit) {
      return categoryLogs.slice(-limit);
    }
    return categoryLogs;
  }

  /**
   * Get all logs
   * @returns {Object} All log categories
   */
  getAllLogs() {
    return this.logs;
  }

  /**
   * Clear logs for a specific category
   * @param {string} category - Log category to clear
   */
  clearLogs(category) {
    if (this.logs[category]) {
      this.logs[category] = [];
    }
  }

  /**
   * Export logs to CSV format
   * @param {string} category - Log category to export
   * @returns {string} CSV formatted log data
   */
  exportLogsToCSV(category) {
    const logs = this.getLogs(category);
    if (logs.length === 0) {
      return '';
    }

    // Get all unique keys from log entries
    const allKeys = new Set();
    logs.forEach(log => {
      Object.keys(log).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    let csv = headers.join(',') + '\n';

    logs.forEach(log => {
      const row = headers.map(header => {
        const value = log[header] || '';
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  /**
   * Export all logs to separate CSV files
   * @returns {Object} Object with category names as keys and CSV content as values
   */
  exportAllLogsToCSV() {
    const exports = {};
    Object.keys(this.logs).forEach(category => {
      const csv = this.exportLogsToCSV(category);
      if (csv) {
        exports[category] = csv;
      }
    });
    return exports;
  }
}

// Create singleton instance
const loggingService = new LoggingService();

export default loggingService;