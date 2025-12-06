/**
 * SQL SERVER QUERY PATTERNS
 * 
 * Common T-SQL patterns for Craft CPQ application
 * Use these as templates for updating IPC handlers
 */

// ============================================================================
// CUSTOMERS TABLE - Pattern Examples
// ============================================================================

// Get all customers
const query1 = `
  SELECT id, name, code, isOEM, contact_email, contact_phone 
  FROM dbo.customers 
  ORDER BY name
`;

// Get customer by ID
const query2 = `
  SELECT * FROM dbo.customers WHERE id = @id
`;

// Add customer
const query3 = `
  INSERT INTO dbo.customers (id, name, code, isOEM, created_at, updated_at, updated_by)
  VALUES (@id, @name, @code, @isOEM, GETDATE(), GETDATE(), @user)
`;

// Update customer
const query4 = `
  UPDATE dbo.customers 
  SET name = @name, 
      code = @code,
      contact_email = @email,
      contact_phone = @phone,
      updated_at = GETDATE(),
      updated_by = @user
  WHERE id = @id
`;

// Delete customer (with validation)
const query5 = `
  IF NOT EXISTS (SELECT 1 FROM dbo.quotes WHERE customer = @id)
    DELETE FROM dbo.customers WHERE id = @id
  ELSE
    RAISERROR('Cannot delete customer with associated quotes', 16, 1)
`;

// ============================================================================
// QUOTES TABLE - Pattern Examples
// ============================================================================

// Get all quotes for a customer
const query6 = `
  SELECT quoteId, customer, customer_quote_number, status, created_at, updated_at
  FROM dbo.quotes 
  WHERE customer = @customerId
  ORDER BY created_at DESC
`;

// Get quote by ID
const query7 = `
  SELECT * FROM dbo.quotes WHERE quoteId = @quoteId
`;

// Add quote
const query8 = `
  INSERT INTO dbo.quotes (
    quoteId, customer, customer_quote_number, status, 
    product_configuration, bill_of_materials, operational_items,
    created_at, updated_at, updated_by
  )
  VALUES (
    @quoteId, @customer, @quoteNumber, @status,
    @config, @bom, @ops,
    GETDATE(), GETDATE(), @user
  )
`;

// Update quote
const query9 = `
  UPDATE dbo.quotes 
  SET status = @status,
      product_configuration = @config,
      bill_of_materials = @bom,
      operational_items = @ops,
      updated_at = GETDATE(),
      updated_by = @user
  WHERE quoteId = @quoteId
`;

// ============================================================================
// COMPONENTS TABLE - Pattern Examples
// ============================================================================

// Get all components
const query10 = `
  SELECT sku, description, category, vendor, unit_cost, unit_price
  FROM dbo.components
  ORDER BY category, sku
`;

// Search components by category
const query11 = `
  SELECT * FROM dbo.components
  WHERE category = @category
  ORDER BY sku
`;

// Search components by SKU
const query12 = `
  SELECT * FROM dbo.components
  WHERE sku LIKE '%' + @searchTerm + '%' OR description LIKE '%' + @searchTerm + '%'
  ORDER BY sku
`;

// Add component
const query13 = `
  INSERT INTO dbo.components (sku, description, category, vendor, unit_cost, unit_price)
  VALUES (@sku, @description, @category, @vendor, @cost, @price)
`;

// ============================================================================
// SUB-ASSEMBLIES TABLE - Pattern Examples
// ============================================================================

// Get all sub-assemblies
const query14 = `
  SELECT id, displayName, category, components_json
  FROM dbo.sub_assemblies
  ORDER BY category, displayName
`;

// Get sub-assembly by ID
const query15 = `
  SELECT * FROM dbo.sub_assemblies WHERE id = @id
`;

// Add sub-assembly
const query16 = `
  INSERT INTO dbo.sub_assemblies (id, displayName, category, components_json)
  VALUES (@id, @displayName, @category, @componentsJson)
`;

// ============================================================================
// PROJECTS TABLE - Pattern Examples
// ============================================================================

// Get all projects
const query17 = `
  SELECT projectId, customer, project_name, status, created_at, updated_at
  FROM dbo.projects
  ORDER BY created_at DESC
`;

// Get projects for customer
const query18 = `
  SELECT * FROM dbo.projects 
  WHERE customer = @customerId
  ORDER BY created_at DESC
`;

// Add project
const query19 = `
  INSERT INTO dbo.projects (projectId, customer, project_name, status, quotes_json)
  VALUES (@projectId, @customer, @projectName, @status, @quotesJson)
`;

// ============================================================================
// GENERATED NUMBERS TABLE - Pattern Examples
// ============================================================================

// Get next quote number
const query20 = `
  UPDATE dbo.generated_numbers
  SET lastNumber = lastNumber + 1
  WHERE type = 'quote'
`;

// Get current number
const query21 = `
  SELECT lastNumber FROM dbo.generated_numbers WHERE type = @type
`;

// ============================================================================
// SYNC_LOG TABLE - Pattern Examples
// ============================================================================

// Log operation
const query22 = `
  INSERT INTO dbo.sync_log (operation, table_name, record_id, user_name, status, details)
  VALUES (@operation, @table, @recordId, @user, @status, @details)
`;

// Get sync history
const query23 = `
  SELECT * FROM dbo.sync_log
  WHERE table_name = @tableName
  ORDER BY timestamp DESC
`;

// ============================================================================
// JSON FIELD OPERATIONS - Pattern Examples
// ============================================================================

// Extract JSON field (for queries)
const query24 = `
  SELECT 
    quoteId,
    JSON_VALUE(product_configuration, '$.productCode') AS productCode,
    JSON_VALUE(product_configuration, '$.totalPrice') AS totalPrice
  FROM dbo.quotes
  WHERE customer = @customerId
`;

// Search within JSON array
const query25 = `
  SELECT * FROM dbo.quotes
  WHERE JSON_CONTAINS(bill_of_materials, JSON_OBJECT('sku', @sku)) = 1
`;

// Update JSON field
const query26 = `
  UPDATE dbo.quotes
  SET product_configuration = JSON_MODIFY(product_configuration, '$.totalPrice', @newPrice)
  WHERE quoteId = @quoteId
`;

// ============================================================================
// ADVANCED - Transactions & Error Handling
// ============================================================================

// Transaction pattern (for multi-table updates)
const query27 = `
  BEGIN TRANSACTION
    BEGIN TRY
      INSERT INTO dbo.quotes (...) VALUES (...)
      INSERT INTO dbo.sync_log (...) VALUES (...)
      COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
      ROLLBACK TRANSACTION
      RAISERROR('Transaction failed', 16, 1)
    END CATCH
`;

// ============================================================================
// PERFORMANCE - Common Indexes
// ============================================================================

// These indexes are already created in schema.js
const indexes = `
  CREATE INDEX idx_customers_name ON dbo.customers(name)
  CREATE INDEX idx_quotes_customer_status ON dbo.quotes(customer, status)
  CREATE INDEX idx_components_category_sku ON dbo.components(category, sku)
  CREATE INDEX idx_projects_customer_status ON dbo.projects(customer, status)
  CREATE INDEX idx_sync_log_operation_timestamp ON dbo.sync_log(operation, timestamp)
`;

// ============================================================================
// USAGE EXAMPLES IN IPC HANDLERS
// ============================================================================

// Example 1: Simple GET handler
/*
ipcMain.handle('components:get-all', async () => {
  try {
    const sqlConnection = (await import('../src/database/sqlConnection.js')).default;
    
    if (sqlConnection.isConnected()) {
      const query = `
        SELECT sku, description, category, vendor, unit_cost, unit_price
        FROM dbo.components
        ORDER BY category, sku
      `;
      return await sqlConnection.query(query);
    }
  } catch (error) {
    console.warn('SQL Server failed:', error.message);
  }
  
  // Fallback
  return loadComponentsFromJSON();
});
*/

// Example 2: Handler with parameters
/*
ipcMain.handle('quotes:get-quote', async (event, quoteId) => {
  try {
    const sqlConnection = (await import('../src/database/sqlConnection.js')).default;
    
    if (!quoteId) throw new Error('Quote ID required');
    
    if (sqlConnection.isConnected()) {
      const query = 'SELECT * FROM dbo.quotes WHERE quoteId = @quoteId';
      const result = await sqlConnection.query(query, { quoteId });
      return result[0] || null;
    }
  } catch (error) {
    console.warn('SQL Server failed:', error.message);
  }
  
  // Fallback
  return loadQuoteFromJSON(quoteId);
});
*/

// Example 3: Handler with INSERT
/*
ipcMain.handle('quotes:save-quote', async (event, quote) => {
  try {
    const sqlConnection = (await import('../src/database/sqlConnection.js')).default;
    
    if (!quote || !quote.quoteId) throw new Error('Invalid quote');
    
    if (sqlConnection.isConnected()) {
      const query = `
        INSERT INTO dbo.quotes (
          quoteId, customer, customer_quote_number, status, 
          product_configuration, bill_of_materials, operational_items,
          created_at, updated_at, updated_by
        )
        VALUES (
          @quoteId, @customer, @quoteNumber, @status,
          @config, @bom, @ops,
          GETDATE(), GETDATE(), @user
        )
      `;
      
      const params = {
        quoteId: quote.quoteId,
        customer: quote.customer,
        quoteNumber: quote.quoteNumber,
        status: quote.status || 'draft',
        config: JSON.stringify(quote.productConfiguration),
        bom: JSON.stringify(quote.billOfMaterials),
        ops: JSON.stringify(quote.operationalItems),
        user: 'system'
      };
      
      await sqlConnection.execute(query, params);
      
      // Log operation
      await sqlConnection.execute(
        'INSERT INTO dbo.sync_log (operation, table_name, record_id, user_name, status) VALUES (@op, @tbl, @id, @user, @stat)',
        {
          op: 'INSERT',
          tbl: 'quotes',
          id: quote.quoteId,
          user: 'system',
          stat: 'success'
        }
      );
      
      return { success: true };
    }
  } catch (error) {
    console.warn('SQL Server failed:', error.message);
  }
  
  // Fallback
  return saveQuoteToJSON(quote);
});
*/

// ============================================================================
// DEBUGGING - Common Queries for Troubleshooting
// ============================================================================

// Check if table exists
const debugQuery1 = `
  SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
  WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'customers'
`;

// Count records in each table
const debugQuery2 = `
  SELECT 
    'customers' AS [Table], COUNT(*) AS [Count] FROM dbo.customers UNION ALL
    SELECT 'quotes', COUNT(*) FROM dbo.quotes UNION ALL
    SELECT 'components', COUNT(*) FROM dbo.components UNION ALL
    SELECT 'sub_assemblies', COUNT(*) FROM dbo.sub_assemblies UNION ALL
    SELECT 'projects', COUNT(*) FROM dbo.projects
`;

// Find slow queries (check updated_at timestamps)
const debugQuery3 = `
  SELECT TOP 10 * FROM dbo.quotes 
  WHERE updated_at > DATEADD(HOUR, -1, GETDATE())
  ORDER BY updated_at DESC
`;

// Check sync log for errors
const debugQuery4 = `
  SELECT * FROM dbo.sync_log 
  WHERE status != 'success'
  ORDER BY timestamp DESC
`;

// ============================================================================
// EXPORT FOR USE IN HANDLERS
// ============================================================================

module.exports = {
  // Customers
  queries: {
    customers: {
      getAll: query1,
      getById: query2,
      add: query3,
      update: query4,
      delete: query5
    },
    quotes: {
      getAllForCustomer: query6,
      getById: query7,
      add: query8,
      update: query9
    },
    components: {
      getAll: query10,
      getByCategory: query11,
      search: query12,
      add: query13
    }
  }
};
