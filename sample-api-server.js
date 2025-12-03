/**
 * Sample REST API Server for Remote SQL Database Sync
 * This is a template - adapt it to your actual database setup
 * 
 * Stack: Express.js + SQL Server / MySQL / PostgreSQL
 */

import express from 'express';
import cors from 'cors';
import sql from 'mssql'; // or 'mysql2' or 'pg' depending on your database

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || 'your_db_user',
  password: process.env.DB_PASSWORD || 'your_db_password',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'craft_automation',
  options: {
    encrypt: true, // For Azure SQL
    trustServerCertificate: true // For local dev
  }
};

// API Key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const validApiKey = process.env.API_KEY || 'your-secret-api-key';
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const apiKey = authHeader.substring(7);
  
  if (apiKey !== validApiKey) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  
  next();
};

// Apply authentication to all /api routes
app.use('/api', authenticateApiKey);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const pool = await sql.connect(dbConfig);
    await pool.request().query('SELECT 1');
    
    res.json({ 
      status: 'ok', 
      message: 'Connected successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message 
    });
  }
});

// ============================================================================
// CUSTOMERS
// ============================================================================

// Get customers (with optional updatedSince filter)
app.get('/api/customers', async (req, res) => {
  try {
    const { updatedSince } = req.query;
    const pool = await sql.connect(dbConfig);
    
    let query = `
      SELECT 
        id, name, company, email, phone,
        address, city, state, zip, country,
        notes, created_at, updated_at, deleted_at
      FROM customers
      WHERE deleted_at IS NULL
    `;
    
    if (updatedSince) {
      query += ` AND updated_at > @updatedSince`;
    }
    
    query += ` ORDER BY updated_at DESC`;
    
    const request = pool.request();
    if (updatedSince) {
      request.input('updatedSince', sql.DateTime, new Date(updatedSince));
    }
    
    const result = await request.query(query);
    
    res.json({
      records: result.recordset,
      count: result.recordset.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update customer
app.post('/api/customers', async (req, res) => {
  try {
    const customer = req.body;
    const pool = await sql.connect(dbConfig);
    
    // Check if customer exists
    const checkResult = await pool.request()
      .input('id', sql.NVarChar, customer.id)
      .query('SELECT id FROM customers WHERE id = @id');
    
    const exists = checkResult.recordset.length > 0;
    
    if (exists) {
      // Update existing customer
      await pool.request()
        .input('id', sql.NVarChar, customer.id)
        .input('name', sql.NVarChar, customer.name)
        .input('company', sql.NVarChar, customer.company || null)
        .input('email', sql.NVarChar, customer.email || null)
        .input('phone', sql.NVarChar, customer.phone || null)
        .input('address', sql.NVarChar, customer.address || null)
        .input('city', sql.NVarChar, customer.city || null)
        .input('state', sql.NVarChar, customer.state || null)
        .input('zip', sql.NVarChar, customer.zip || null)
        .input('country', sql.NVarChar, customer.country || 'USA')
        .input('notes', sql.NVarChar, customer.notes || null)
        .query(`
          UPDATE customers SET
            name = @name,
            company = @company,
            email = @email,
            phone = @phone,
            address = @address,
            city = @city,
            state = @state,
            zip = @zip,
            country = @country,
            notes = @notes,
            updated_at = GETDATE()
          WHERE id = @id
        `);
    } else {
      // Insert new customer
      await pool.request()
        .input('id', sql.NVarChar, customer.id)
        .input('name', sql.NVarChar, customer.name)
        .input('company', sql.NVarChar, customer.company || null)
        .input('email', sql.NVarChar, customer.email || null)
        .input('phone', sql.NVarChar, customer.phone || null)
        .input('address', sql.NVarChar, customer.address || null)
        .input('city', sql.NVarChar, customer.city || null)
        .input('state', sql.NVarChar, customer.state || null)
        .input('zip', sql.NVarChar, customer.zip || null)
        .input('country', sql.NVarChar, customer.country || 'USA')
        .input('notes', sql.NVarChar, customer.notes || null)
        .query(`
          INSERT INTO customers (
            id, name, company, email, phone,
            address, city, state, zip, country,
            notes, created_at, updated_at
          ) VALUES (
            @id, @name, @company, @email, @phone,
            @address, @city, @state, @zip, @country,
            @notes, GETDATE(), GETDATE()
          )
        `);
    }
    
    res.json({
      success: true,
      id: customer.id,
      version: exists ? 2 : 1,
      action: exists ? 'updated' : 'created'
    });
  } catch (error) {
    console.error('Error saving customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// QUOTES
// ============================================================================

// Get quotes
app.get('/api/quotes', async (req, res) => {
  try {
    const { updatedSince } = req.query;
    const pool = await sql.connect(dbConfig);
    
    let query = `
      SELECT 
        id, quote_number, customer_id, project_name, status,
        total_amount, discount_percent, tax_percent,
        notes, valid_until, created_by,
        created_at, updated_at, deleted_at
      FROM quotes
      WHERE deleted_at IS NULL
    `;
    
    if (updatedSince) {
      query += ` AND updated_at > @updatedSince`;
    }
    
    query += ` ORDER BY updated_at DESC`;
    
    const request = pool.request();
    if (updatedSince) {
      request.input('updatedSince', sql.DateTime, new Date(updatedSince));
    }
    
    const result = await request.query(query);
    
    res.json({
      records: result.recordset,
      count: result.recordset.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update quote
app.post('/api/quotes', async (req, res) => {
  try {
    const quote = req.body;
    const pool = await sql.connect(dbConfig);
    
    const checkResult = await pool.request()
      .input('id', sql.NVarChar, quote.id)
      .query('SELECT id FROM quotes WHERE id = @id');
    
    const exists = checkResult.recordset.length > 0;
    
    if (exists) {
      // Update existing quote
      await pool.request()
        .input('id', sql.NVarChar, quote.id)
        .input('quote_number', sql.NVarChar, quote.quote_number)
        .input('customer_id', sql.NVarChar, quote.customer_id || null)
        .input('project_name', sql.NVarChar, quote.project_name || null)
        .input('status', sql.NVarChar, quote.status || 'draft')
        .input('total_amount', sql.Decimal(18, 2), quote.total_amount || 0)
        .input('discount_percent', sql.Decimal(5, 2), quote.discount_percent || 0)
        .input('tax_percent', sql.Decimal(5, 2), quote.tax_percent || 0)
        .input('notes', sql.NVarChar, quote.notes || null)
        .input('valid_until', sql.DateTime, quote.valid_until ? new Date(quote.valid_until) : null)
        .input('created_by', sql.NVarChar, quote.created_by || null)
        .query(`
          UPDATE quotes SET
            quote_number = @quote_number,
            customer_id = @customer_id,
            project_name = @project_name,
            status = @status,
            total_amount = @total_amount,
            discount_percent = @discount_percent,
            tax_percent = @tax_percent,
            notes = @notes,
            valid_until = @valid_until,
            created_by = @created_by,
            updated_at = GETDATE()
          WHERE id = @id
        `);
    } else {
      // Insert new quote
      await pool.request()
        .input('id', sql.NVarChar, quote.id)
        .input('quote_number', sql.NVarChar, quote.quote_number)
        .input('customer_id', sql.NVarChar, quote.customer_id || null)
        .input('project_name', sql.NVarChar, quote.project_name || null)
        .input('status', sql.NVarChar, quote.status || 'draft')
        .input('total_amount', sql.Decimal(18, 2), quote.total_amount || 0)
        .input('discount_percent', sql.Decimal(5, 2), quote.discount_percent || 0)
        .input('tax_percent', sql.Decimal(5, 2), quote.tax_percent || 0)
        .input('notes', sql.NVarChar, quote.notes || null)
        .input('valid_until', sql.DateTime, quote.valid_until ? new Date(quote.valid_until) : null)
        .input('created_by', sql.NVarChar, quote.created_by || null)
        .query(`
          INSERT INTO quotes (
            id, quote_number, customer_id, project_name, status,
            total_amount, discount_percent, tax_percent,
            notes, valid_until, created_by,
            created_at, updated_at
          ) VALUES (
            @id, @quote_number, @customer_id, @project_name, @status,
            @total_amount, @discount_percent, @tax_percent,
            @notes, @valid_until, @created_by,
            GETDATE(), GETDATE()
          )
        `);
    }
    
    res.json({
      success: true,
      id: quote.id,
      version: exists ? 2 : 1,
      action: exists ? 'updated' : 'created'
    });
  } catch (error) {
    console.error('Error saving quote:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ORDERS
// ============================================================================

// Get orders
app.get('/api/orders', async (req, res) => {
  try {
    const { updatedSince } = req.query;
    const pool = await sql.connect(dbConfig);
    
    let query = `
      SELECT 
        id, order_number, quote_id, customer_id, status,
        order_date, delivery_date, total_amount, payment_status,
        notes, created_at, updated_at, deleted_at
      FROM orders
      WHERE deleted_at IS NULL
    `;
    
    if (updatedSince) {
      query += ` AND updated_at > @updatedSince`;
    }
    
    query += ` ORDER BY updated_at DESC`;
    
    const request = pool.request();
    if (updatedSince) {
      request.input('updatedSince', sql.DateTime, new Date(updatedSince));
    }
    
    const result = await request.query(query);
    
    res.json({
      records: result.recordset,
      count: result.recordset.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update order
app.post('/api/orders', async (req, res) => {
  try {
    const order = req.body;
    const pool = await sql.connect(dbConfig);
    
    const checkResult = await pool.request()
      .input('id', sql.NVarChar, order.id)
      .query('SELECT id FROM orders WHERE id = @id');
    
    const exists = checkResult.recordset.length > 0;
    
    if (exists) {
      // Update existing order
      await pool.request()
        .input('id', sql.NVarChar, order.id)
        .input('order_number', sql.NVarChar, order.order_number)
        .input('quote_id', sql.NVarChar, order.quote_id || null)
        .input('customer_id', sql.NVarChar, order.customer_id || null)
        .input('status', sql.NVarChar, order.status || 'pending')
        .input('order_date', sql.DateTime, order.order_date ? new Date(order.order_date) : null)
        .input('delivery_date', sql.DateTime, order.delivery_date ? new Date(order.delivery_date) : null)
        .input('total_amount', sql.Decimal(18, 2), order.total_amount || 0)
        .input('payment_status', sql.NVarChar, order.payment_status || 'unpaid')
        .input('notes', sql.NVarChar, order.notes || null)
        .query(`
          UPDATE orders SET
            order_number = @order_number,
            quote_id = @quote_id,
            customer_id = @customer_id,
            status = @status,
            order_date = @order_date,
            delivery_date = @delivery_date,
            total_amount = @total_amount,
            payment_status = @payment_status,
            notes = @notes,
            updated_at = GETDATE()
          WHERE id = @id
        `);
    } else {
      // Insert new order
      await pool.request()
        .input('id', sql.NVarChar, order.id)
        .input('order_number', sql.NVarChar, order.order_number)
        .input('quote_id', sql.NVarChar, order.quote_id || null)
        .input('customer_id', sql.NVarChar, order.customer_id || null)
        .input('status', sql.NVarChar, order.status || 'pending')
        .input('order_date', sql.DateTime, order.order_date ? new Date(order.order_date) : null)
        .input('delivery_date', sql.DateTime, order.delivery_date ? new Date(order.delivery_date) : null)
        .input('total_amount', sql.Decimal(18, 2), order.total_amount || 0)
        .input('payment_status', sql.NVarChar, order.payment_status || 'unpaid')
        .input('notes', sql.NVarChar, order.notes || null)
        .query(`
          INSERT INTO orders (
            id, order_number, quote_id, customer_id, status,
            order_date, delivery_date, total_amount, payment_status,
            notes, created_at, updated_at
          ) VALUES (
            @id, @order_number, @quote_id, @customer_id, @status,
            @order_date, @delivery_date, @total_amount, @payment_status,
            @notes, GETDATE(), GETDATE()
          )
        `);
    }
    
    res.json({
      success: true,
      id: order.id,
      version: exists ? 2 : 1,
      action: exists ? 'updated' : 'created'
    });
  } catch (error) {
    console.error('Error saving order:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
