/**
 * Create Missing Tables in SQL Server
 * Adds tables that weren't created during initial schema setup
 */

import sqlConnection from './src/database/sqlConnection.js';

async function createMissingTables() {
  console.log('🔧 Creating Missing SQL Server Tables\n');
  console.log('=' .repeat(60));

  try {
    await sqlConnection.connect();
    console.log('✅ Connected to SQL Server\n');

    // Components table
    console.log('📦 Creating components table...');
    try {
      await sqlConnection.execute(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'components')
        BEGIN
          CREATE TABLE dbo.components (
            sku VARCHAR(100) PRIMARY KEY,
            vendor VARCHAR(100),
            category VARCHAR(100),
            description VARCHAR(500),
            price DECIMAL(10, 2),
            lead_time INT,
            notes TEXT,
            created_at DATETIME DEFAULT GETDATE(),
            updated_at DATETIME DEFAULT GETDATE(),
            updated_by VARCHAR(100)
          );
          CREATE INDEX idx_components_category_sku ON dbo.components(category, sku);
          PRINT 'Components table created';
        END
        ELSE
          PRINT 'Components table already exists';
      `);
      console.log('✅ Components table ready');
    } catch (error) {
      console.log(`⚠️  Components: ${error.message}`);
    }

    // Sub-assemblies table
    console.log('📦 Creating sub_assemblies table...');
    try {
      await sqlConnection.execute(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'sub_assemblies')
        BEGIN
          CREATE TABLE dbo.sub_assemblies (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            components_json TEXT,
            labor_hours DECIMAL(10, 2),
            created_at DATETIME DEFAULT GETDATE(),
            updated_at DATETIME DEFAULT GETDATE(),
            updated_by VARCHAR(100)
          );
          PRINT 'Sub-assemblies table created';
        END
        ELSE
          PRINT 'Sub-assemblies table already exists';
      `);
      console.log('✅ Sub-assemblies table ready');
    } catch (error) {
      console.log(`⚠️  Sub-assemblies: ${error.message}`);
    }

    // Product templates table
    console.log('📦 Creating product_templates table...');
    try {
      await sqlConnection.execute(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'product_templates')
        BEGIN
          CREATE TABLE dbo.product_templates (
            product_code VARCHAR(50) PRIMARY KEY,
            product_name VARCHAR(255) NOT NULL,
            template_data TEXT,
            created_at DATETIME DEFAULT GETDATE(),
            updated_at DATETIME DEFAULT GETDATE(),
            updated_by VARCHAR(100)
          );
          PRINT 'Product templates table created';
        END
        ELSE
          PRINT 'Product templates table already exists';
      `);
      console.log('✅ Product templates table ready');
    } catch (error) {
      console.log(`⚠️  Product templates: ${error.message}`);
    }

    // Projects table
    console.log('📦 Creating projects table...');
    try {
      await sqlConnection.execute(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'projects')
        BEGIN
          CREATE TABLE dbo.projects (
            project_id VARCHAR(100) PRIMARY KEY,
            customer VARCHAR(50),
            project_name VARCHAR(255) NOT NULL,
            status VARCHAR(50),
            created_at DATETIME DEFAULT GETDATE(),
            updated_at DATETIME DEFAULT GETDATE(),
            updated_by VARCHAR(100)
          );
          CREATE INDEX idx_projects_customer_status ON dbo.projects(customer, status);
          PRINT 'Projects table created';
        END
        ELSE
          PRINT 'Projects table already exists';
      `);
      console.log('✅ Projects table ready');
    } catch (error) {
      console.log(`⚠️  Projects: ${error.message}`);
    }

    // Manual quotes table
    console.log('📦 Creating manual_quotes table...');
    try {
      await sqlConnection.execute(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'manual_quotes')
        BEGIN
          CREATE TABLE dbo.manual_quotes (
            id VARCHAR(100) PRIMARY KEY,
            customer VARCHAR(50),
            quote_data TEXT,
            created_at DATETIME DEFAULT GETDATE(),
            updated_at DATETIME DEFAULT GETDATE(),
            updated_by VARCHAR(100)
          );
          PRINT 'Manual quotes table created';
        END
        ELSE
          PRINT 'Manual quotes table already exists';
      `);
      console.log('✅ Manual quotes table ready');
    } catch (error) {
      console.log(`⚠️  Manual quotes: ${error.message}`);
    }

    // Generated numbers table
    console.log('📦 Creating generated_numbers table...');
    try {
      await sqlConnection.execute(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'generated_numbers')
        BEGIN
          CREATE TABLE dbo.generated_numbers (
            number_type VARCHAR(50) PRIMARY KEY,
            last_number INT DEFAULT 0,
            prefix VARCHAR(20),
            updated_at DATETIME DEFAULT GETDATE()
          );
          PRINT 'Generated numbers table created';
        END
        ELSE
          PRINT 'Generated numbers table already exists';
      `);
      console.log('✅ Generated numbers table ready');
    } catch (error) {
      console.log(`⚠️  Generated numbers: ${error.message}`);
    }

    // Sync log table
    console.log('📦 Creating sync_log table...');
    try {
      await sqlConnection.execute(`
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'sync_log')
        BEGIN
          CREATE TABLE dbo.sync_log (
            id INT IDENTITY(1,1) PRIMARY KEY,
            table_name VARCHAR(100),
            operation VARCHAR(20),
            record_id VARCHAR(100),
            user_name VARCHAR(100),
            timestamp DATETIME DEFAULT GETDATE(),
            details TEXT
          );
          CREATE INDEX idx_sync_log_operation_timestamp ON dbo.sync_log(operation, timestamp);
          PRINT 'Sync log table created';
        END
        ELSE
          PRINT 'Sync log table already exists';
      `);
      console.log('✅ Sync log table ready');
    } catch (error) {
      console.log(`⚠️  Sync log: ${error.message}`);
    }

    // Verify all tables
    console.log('\n📊 Verifying Database Schema...');
    const tablesQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      AND TABLE_SCHEMA = 'dbo'
      ORDER BY TABLE_NAME
    `;
    
    const tables = await sqlConnection.query(tablesQuery);
    console.log(`\n✅ Total tables in database: ${tables.length}`);
    tables.forEach(t => {
      console.log(`   - ${t.TABLE_NAME}`);
    });

    const expectedTables = [
      'customers', 'quotes', 'components', 'sub_assemblies',
      'product_templates', 'projects', 'manual_quotes',
      'generated_numbers', 'sync_log'
    ];

    const missingTables = expectedTables.filter(
      expected => !tables.find(t => t.TABLE_NAME === expected)
    );

    if (missingTables.length === 0) {
      console.log('\n🎉 All required tables are present!');
    } else {
      console.log(`\n⚠️  Missing tables: ${missingTables.join(', ')}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Database schema setup complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sqlConnection.disconnect();
    console.log('\n🔌 Disconnected from SQL Server\n');
  }
}

createMissingTables().catch(console.error);
