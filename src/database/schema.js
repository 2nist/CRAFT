/**
 * SQL Server Database Schema Initialization
 * Creates all required tables for Craft CPQ
 */

import sqlConnection from './sqlConnection.js';

const SCHEMA_CREATION_SCRIPT = `
-- Drop existing tables (for fresh setup)
IF OBJECT_ID('dbo.sync_log', 'U') IS NOT NULL DROP TABLE dbo.sync_log;
IF OBJECT_ID('dbo.manual_quotes', 'U') IS NOT NULL DROP TABLE dbo.manual_quotes;
IF OBJECT_ID('dbo.generated_numbers', 'U') IS NOT NULL DROP TABLE dbo.generated_numbers;
IF OBJECT_ID('dbo.quotes', 'U') IS NOT NULL DROP TABLE dbo.quotes;
IF OBJECT_ID('dbo.product_templates', 'U') IS NOT NULL DROP TABLE dbo.product_templates;
IF OBJECT_ID('dbo.sub_assemblies', 'U') IS NOT NULL DROP TABLE dbo.sub_assemblies;
IF OBJECT_ID('dbo.components', 'U') IS NOT NULL DROP TABLE dbo.components;
IF OBJECT_ID('dbo.projects', 'U') IS NOT NULL DROP TABLE dbo.projects;
IF OBJECT_ID('dbo.customers', 'U') IS NOT NULL DROP TABLE dbo.customers;

-- Create Customers table
CREATE TABLE dbo.customers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(10),
  isOEM BIT DEFAULT 0,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  address TEXT,
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  updated_by VARCHAR(100),
  synced_at DATETIME
);

-- Create Components table
CREATE TABLE dbo.components (
  id VARCHAR(100) PRIMARY KEY,
  description VARCHAR(500),
  category VARCHAR(100),
  vendor VARCHAR(100),
  cost DECIMAL(10, 2),
  price DECIMAL(10, 2),
  stockLevel INT DEFAULT 0,
  sku VARCHAR(100),
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  updated_by VARCHAR(100),
  synced_at DATETIME
);

-- Create Sub Assemblies table
CREATE TABLE dbo.sub_assemblies (
  assemblyId VARCHAR(100) PRIMARY KEY,
  displayName VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  components_json NVARCHAR(MAX),  -- JSON array of component IDs
  subAssemblies_json NVARCHAR(MAX),  -- JSON nested structure
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  updated_by VARCHAR(100),
  synced_at DATETIME
);

-- Create Product Templates table
CREATE TABLE dbo.product_templates (
  code VARCHAR(50) PRIMARY KEY,
  displayName VARCHAR(255) NOT NULL,
  description TEXT,
  assemblies_json NVARCHAR(MAX),  -- JSON array of assembly definitions
  default_values_json NVARCHAR(MAX),
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  updated_by VARCHAR(100),
  synced_at DATETIME
);

-- Create Quotes table
CREATE TABLE dbo.quotes (
  quoteId VARCHAR(100) PRIMARY KEY,
  customer VARCHAR(50) NOT NULL,
  projectName VARCHAR(255),
  salesRep VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Draft',
  project_codes_json NVARCHAR(MAX),  -- {industry, product, control, scope}
  control_panel_config_json NVARCHAR(MAX),  -- {voltage, phase, enclosure, etc}
  product_configuration_json NVARCHAR(MAX),  -- Complex assembly config
  bom_json NVARCHAR(MAX),  -- Bill of materials
  operational_items_json NVARCHAR(MAX),
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  updated_by VARCHAR(100),
  synced_at DATETIME,
  FOREIGN KEY (customer) REFERENCES dbo.customers(id)
);

-- Create Manual Quotes table
CREATE TABLE dbo.manual_quotes (
  quoteNumber VARCHAR(50) PRIMARY KEY,
  quote_data_json NVARCHAR(MAX) NOT NULL,
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  updated_by VARCHAR(100),
  synced_at DATETIME
);

-- Create Generated Numbers table (for quote/project ID generation)
CREATE TABLE dbo.generated_numbers (
  id INT PRIMARY KEY IDENTITY(1,1),
  type VARCHAR(50) NOT NULL,  -- 'quote' or 'project'
  lastNumber INT DEFAULT 0,
  prefix VARCHAR(10),
  pattern VARCHAR(100),  -- e.g., 'Q-{YYYY}-{SEQ}'
  updated_at DATETIME DEFAULT GETDATE(),
  UNIQUE(type)
);

-- Create Projects table
CREATE TABLE dbo.projects (
  projectId VARCHAR(100) PRIMARY KEY,
  projectName VARCHAR(255) NOT NULL,
  customer VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'Active',
  description TEXT,
  quotes_json NVARCHAR(MAX),  -- Array of associated quote IDs
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  updated_by VARCHAR(100),
  synced_at DATETIME,
  FOREIGN KEY (customer) REFERENCES dbo.customers(id)
);

-- Create Sync Log table (audit trail)
CREATE TABLE dbo.sync_log (
  id INT PRIMARY KEY IDENTITY(1,1),
  operation VARCHAR(50),  -- 'PULL', 'PUSH', 'CONFLICT_RESOLVED'
  table_name VARCHAR(100),
  record_id VARCHAR(100),
  details NVARCHAR(MAX),
  user_name VARCHAR(100),
  synced_at DATETIME DEFAULT GETDATE(),
  status VARCHAR(50)  -- 'SUCCESS', 'FAILED', 'WARNING'
);

-- Create indexes for performance
CREATE INDEX idx_quotes_customer ON dbo.quotes(customer);
CREATE INDEX idx_quotes_status ON dbo.quotes(status);
CREATE INDEX idx_quotes_updated_at ON dbo.quotes(updated_at);
CREATE INDEX idx_projects_customer ON dbo.projects(customer);
CREATE INDEX idx_components_category ON dbo.components(category);
CREATE INDEX idx_sub_assemblies_category ON dbo.sub_assemblies(category);
CREATE INDEX idx_sync_log_synced_at ON dbo.sync_log(synced_at);

-- Insert initial generated number sequences
INSERT INTO dbo.generated_numbers (type, lastNumber, prefix, pattern) 
VALUES ('quote', 1000, 'Q', 'Q-{YYYY}-{SEQ}');

INSERT INTO dbo.generated_numbers (type, lastNumber, prefix, pattern) 
VALUES ('project', 1000, 'P', 'P-{YYYY}-{SEQ}');

PRINT 'Database schema created successfully!';
`;

async function initializeDatabase() {
  try {
    console.log('[Database] Initializing schema...');
    
    const pool = await sqlConnection.connect();
    const request = pool.request();
    
    await request.batch(SCHEMA_CREATION_SCRIPT);
    
    console.log('[Database] Schema initialization complete');
    return { success: true, message: 'Schema created successfully' };
  } catch (error) {
    console.error('[Database] Schema initialization failed:', error.message);
    return { success: false, error: error.message };
  }
}

export { initializeDatabase, SCHEMA_CREATION_SCRIPT };
