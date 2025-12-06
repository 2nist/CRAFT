/**
 * SQL Server Initialization Handler
 * 
 * This module exports a function to initialize SQL Server connection
 * Call this during app.whenReady() before creating windows
 */

import sqlConnection from './sqlConnection.js';
import { initializeDatabase } from './schema.js';

export async function initializeSqlServer() {
  try {

    console.log('🔧 Initializing SQL Server connection...');

    // Connect to SQL Server
    await sqlConnection.connect();
    console.log('✅ Connected to SQL Server (192.168.1.150\\SQLEXPRESS)');

    // Initialize database schema
    await initializeDatabase();
    console.log('✅ Database schema initialized (CraftCPQ)');

    return {
      success: true,
      message: 'SQL Server initialized successfully'
    };
  } catch (error) {
    console.error('❌ SQL Server initialization failed:', error.message);
    console.warn('⚠️  Application will continue with local storage fallback');
    return {
      success: false,
      error: error.message
    };
  }
}

export async function shutdownSqlServer() {
  try {
    if (sqlConnection.isConnected()) {
      await sqlConnection.disconnect();
      console.log('✅ SQL Server connection closed gracefully');
    }
  } catch (error) {
    console.error('⚠️  Error closing SQL Server connection:', error.message);
  }
}
