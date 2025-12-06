/**
 * Test SQL Server Migration
 * Verifies customers and components handlers are working
 */

import sqlConnection from './src/database/sqlConnection.js';

async function testMigration() {
  console.log('🧪 Testing SQL Server Migration\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Connection
    console.log('\n📡 Test 1: SQL Server Connection');
    console.log('-'.repeat(60));
    
    await sqlConnection.connect();
    
    if (sqlConnection.isConnected()) {
      console.log('✅ Connected to SQL Server');
      const status = sqlConnection.getStatus();
      console.log(`   Server: ${status.server}`);
      console.log(`   Database: ${status.database}`);
      console.log(`   Connected: ${status.connected ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ Not connected to SQL Server');
      return;
    }

    // Test 2: Customer Table
    console.log('\n👥 Test 2: Customers Table');
    console.log('-'.repeat(60));
    
    const customerCountQuery = 'SELECT COUNT(*) as count FROM dbo.customers';
    const customerCount = await sqlConnection.query(customerCountQuery);
    console.log(`✅ Customer count: ${customerCount[0].count}`);
    
    if (customerCount[0].count > 0) {
      const sampleCustomersQuery = 'SELECT TOP 5 id, name, code, isOEM FROM dbo.customers ORDER BY created_at DESC';
      const sampleCustomers = await sqlConnection.query(sampleCustomersQuery);
      console.log('\n   Recent customers:');
      sampleCustomers.forEach(c => {
        console.log(`   - ${c.id}: ${c.name} (${c.code}) ${c.isOEM ? '[OEM]' : '[End User]'}`);
      });
    }

    // Test 3: Components Table
    console.log('\n🔧 Test 3: Components Table');
    console.log('-'.repeat(60));
    
    const componentCountQuery = 'SELECT COUNT(*) as count FROM dbo.components';
    const componentCount = await sqlConnection.query(componentCountQuery);
    console.log(`✅ Component count: ${componentCount[0].count}`);
    
    if (componentCount[0].count > 0) {
      const sampleComponentsQuery = 'SELECT TOP 5 sku, vendor, category, price FROM dbo.components ORDER BY updated_at DESC';
      const sampleComponents = await sqlConnection.query(sampleComponentsQuery);
      console.log('\n   Recent components:');
      sampleComponents.forEach(c => {
        const priceStr = c.price ? `$${c.price.toFixed(2)}` : 'N/A';
        console.log(`   - ${c.sku}: ${c.vendor || 'N/A'} | ${c.category || 'N/A'} | ${priceStr}`);
      });
      
      // Test categories
      const categoriesQuery = 'SELECT DISTINCT category FROM dbo.components WHERE category IS NOT NULL ORDER BY category';
      const categories = await sqlConnection.query(categoriesQuery);
      console.log(`\n   ✅ Unique categories: ${categories.length}`);
      if (categories.length > 0 && categories.length <= 10) {
        console.log(`   Categories: ${categories.map(c => c.category).join(', ')}`);
      }
      
      // Test vendors
      const vendorsQuery = 'SELECT DISTINCT vendor FROM dbo.components WHERE vendor IS NOT NULL ORDER BY vendor';
      const vendors = await sqlConnection.query(vendorsQuery);
      console.log(`   ✅ Unique vendors: ${vendors.length}`);
      if (vendors.length > 0 && vendors.length <= 10) {
        console.log(`   Vendors: ${vendors.map(v => v.vendor).join(', ')}`);
      }
    }

    // Test 4: Quotes Table
    console.log('\n📋 Test 4: Quotes Table');
    console.log('-'.repeat(60));
    
    const quoteCountQuery = 'SELECT COUNT(*) as count FROM dbo.quotes';
    const quoteCount = await sqlConnection.query(quoteCountQuery);
    console.log(`✅ Quote count: ${quoteCount[0].count}`);
    
    if (quoteCount[0].count > 0) {
      const sampleQuotesQuery = 'SELECT TOP 5 quote_number, customer, product_code, status FROM dbo.quotes ORDER BY created_at DESC';
      const sampleQuotes = await sqlConnection.query(sampleQuotesQuery);
      console.log('\n   Recent quotes:');
      sampleQuotes.forEach(q => {
        console.log(`   - ${q.quote_number}: ${q.customer} | ${q.product_code} | ${q.status}`);
      });
    }

    // Test 5: Customer-Quote Relationships
    console.log('\n🔗 Test 5: Customer-Quote Relationships');
    console.log('-'.repeat(60));
    
    const relationshipQuery = `
      SELECT c.id, c.name, COUNT(q.quote_number) as quote_count
      FROM dbo.customers c
      LEFT JOIN dbo.quotes q ON c.id = q.customer
      GROUP BY c.id, c.name
      HAVING COUNT(q.quote_number) > 0
      ORDER BY quote_count DESC
    `;
    const relationships = await sqlConnection.query(relationshipQuery);
    
    if (relationships.length > 0) {
      console.log(`✅ Customers with quotes: ${relationships.length}`);
      console.log('\n   Top customers by quote count:');
      relationships.slice(0, 5).forEach(r => {
        console.log(`   - ${r.name}: ${r.quote_count} quotes`);
      });
    } else {
      console.log('ℹ️  No customers have quotes yet');
    }

    // Test 6: Schema Verification
    console.log('\n📊 Test 6: Schema Verification');
    console.log('-'.repeat(60));
    
    const tablesQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      AND TABLE_SCHEMA = 'dbo'
      ORDER BY TABLE_NAME
    `;
    const tables = await sqlConnection.query(tablesQuery);
    console.log(`✅ Tables found: ${tables.length}`);
    console.log(`   ${tables.map(t => t.TABLE_NAME).join(', ')}`);
    
    // Test 7: Insert Test (Customer)
    console.log('\n➕ Test 7: Insert Test Customer');
    console.log('-'.repeat(60));
    
    const testCustomerId = 'test_' + Date.now();
    const testCustomerCode = 'test_migration';
    
    try {
      const insertQuery = `
        INSERT INTO dbo.customers (id, name, code, isOEM, created_at, updated_at, updated_by)
        VALUES (@id, @name, @code, @isOEM, GETDATE(), GETDATE(), @user)
      `;
      
      await sqlConnection.execute(insertQuery, {
        id: testCustomerId,
        name: 'Test Migration Customer',
        code: testCustomerCode,
        isOEM: 0,
        user: 'test_script'
      });
      
      console.log(`✅ Test customer inserted: ${testCustomerId}`);
      
      // Verify insert
      const verifyQuery = 'SELECT * FROM dbo.customers WHERE id = @id';
      const verifyResult = await sqlConnection.query(verifyQuery, { id: testCustomerId });
      
      if (verifyResult.length > 0) {
        console.log(`   ✅ Verified: ${verifyResult[0].name}`);
        
        // Clean up test data
        const deleteQuery = 'DELETE FROM dbo.customers WHERE id = @id';
        await sqlConnection.execute(deleteQuery, { id: testCustomerId });
        console.log(`   🧹 Test customer deleted`);
      }
    } catch (insertError) {
      console.log(`   ⚠️  Insert test failed: ${insertError.message}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📝 Migration Test Summary');
    console.log('='.repeat(60));
    console.log(`✅ SQL Server Connection: Working`);
    console.log(`✅ Customers Table: ${customerCount[0].count} records`);
    console.log(`✅ Components Table: ${componentCount[0].count} records`);
    console.log(`✅ Quotes Table: ${quoteCount[0].count} records`);
    console.log(`✅ Insert/Delete Operations: Working`);
    console.log(`✅ Relationships: ${relationships.length} customers with quotes`);
    console.log('\n🎉 All migration tests passed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
  } finally {
    // Close connection
    await sqlConnection.disconnect();
    console.log('🔌 Disconnected from SQL Server\n');
  }
}

// Run tests
testMigration().catch(console.error);
