/**
 * SQL Server Connection Manager
 * Handles connection pooling and query execution
 */

import sql from 'mssql';
import { sqlConfig } from './config.js';

class SqlServerConnection {
  constructor() {
    this.pool = null;
    this.connected = false;
  }

  /**
   * Initialize connection pool
   */
  async connect() {
    try {
      if (this.connected && this.pool) {
        console.log('[SQL Server] Using existing connection pool');
        return this.pool;
      }

      console.log('[SQL Server] Connecting to', sqlConfig.server, 'database:', sqlConfig.database);
      
      this.pool = new sql.ConnectionPool(sqlConfig);
      
      this.pool.on('error', err => {
        console.error('[SQL Server Pool Error]', err);
        this.connected = false;
      });

      await this.pool.connect();
      this.connected = true;
      console.log('[SQL Server] Connected successfully');
      return this.pool;
    } catch (error) {
      console.error('[SQL Server] Connection failed:', error.message);
      this.connected = false;
      throw error;
    }
  }

  /**
   * Close connection pool
   */
  async disconnect() {
    try {
      if (this.pool) {
        await this.pool.close();
        this.connected = false;
        console.log('[SQL Server] Disconnected');
      }
    } catch (error) {
      console.error('[SQL Server] Disconnect error:', error.message);
    }
  }

  /**
   * Execute a query and return results
   */
  async query(sqlQuery, params = {}) {
    try {
      const pool = await this.connect();
      const request = pool.request();

      // Add parameters
      Object.keys(params).forEach(key => {
        request.input(key, params[key]);
      });

      const result = await request.query(sqlQuery);
      return result.recordset;
    } catch (error) {
      console.error('[SQL Server] Query error:', error.message);
      throw error;
    }
  }

  /**
   * Execute a query that modifies data
   */
  async execute(sqlQuery, params = {}) {
    try {
      const pool = await this.connect();
      const request = pool.request();

      // Add parameters
      Object.keys(params).forEach(key => {
        request.input(key, params[key]);
      });

      const result = await request.query(sqlQuery);
      return result;
    } catch (error) {
      console.error('[SQL Server] Execute error:', error.message);
      throw error;
    }
  }

  /**
   * Execute a stored procedure
   */
  async executeStoredProcedure(procedureName, params = {}) {
    try {
      const pool = await this.connect();
      const request = pool.request();

      // Add parameters
      Object.keys(params).forEach(key => {
        request.input(key, params[key]);
      });

      const result = await request.execute(procedureName);
      return result.recordset;
    } catch (error) {
      console.error('[SQL Server] Stored procedure error:', error.message);
      throw error;
    }
  }

  /**
   * Check connection status
   */
  async isConnected() {
    try {
      const result = await this.query('SELECT 1 as connected');
      return result && result.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get connection status info
   */
  getStatus() {
    return {
      connected: this.connected,
      server: sqlConfig.server,
      database: sqlConfig.database
    };
  }
}

// Export singleton instance
const sqlConnectionInstance = new SqlServerConnection();
export default sqlConnectionInstance;
