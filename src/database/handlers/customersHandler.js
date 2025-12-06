/**
 * SQL Server IPC Handlers for Customers
 * Replaces SQLite-based customer handlers
 */

import { ipcMain } from 'electron';
import sqlConnection from '../sqlConnection.js';

/**
 * Get all customers
 */
ipcMain.handle('customers:get-all', async () => {
  try {
    const query = 'SELECT id, name, code, isOEM, contact_email, contact_phone FROM dbo.customers ORDER BY name';
    const customers = await sqlConnection.query(query);
    
    return customers.map(c => ({
      id: c.id,
      name: c.name,
      code: c.code,
      isOEM: c.isOEM,
      email: c.contact_email,
      phone: c.contact_phone
    }));
  } catch (error) {
    console.error('[IPC] customers:get-all error:', error);
    return [];
  }
});

/**
 * Add a new customer
 */
ipcMain.handle('customers:add', async (event, data) => {
  try {
    const { name, isOEM = false } = data;
    
    if (!name || !name.trim()) {
      throw new Error('Customer name is required');
    }

    // Generate ID from name
    const customerId = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 50);

    const query = `
      INSERT INTO dbo.customers (id, name, isOEM, created_at, updated_at, updated_by)
      VALUES (@id, @name, @isOEM, GETDATE(), GETDATE(), @user)
    `;

    const params = {
      id: customerId,
      name: name.trim(),
      isOEM: isOEM ? 1 : 0,
      user: 'system'
    };

    await sqlConnection.execute(query, params);
    
    console.log('[SQL Server] Customer added:', customerId);
    
    return {
      id: customerId,
      name: name.trim(),
      isOEM: isOEM
    };
  } catch (error) {
    console.error('[IPC] customers:add error:', error);
    throw error;
  }
});

/**
 * Update customer
 */
ipcMain.handle('customers:update', async (event, data) => {
  try {
    const { id, name, isOEM, email, phone } = data;
    
    if (!id) {
      throw new Error('Customer ID is required');
    }

    const query = `
      UPDATE dbo.customers 
      SET name = @name, 
          isOEM = @isOEM,
          contact_email = @email,
          contact_phone = @phone,
          updated_at = GETDATE(),
          updated_by = @user
      WHERE id = @id
    `;

    const params = {
      id,
      name: name || '',
      isOEM: isOEM ? 1 : 0,
      email: email || null,
      phone: phone || null,
      user: 'system'
    };

    await sqlConnection.execute(query, params);
    
    console.log('[SQL Server] Customer updated:', id);
    
    return { success: true };
  } catch (error) {
    console.error('[IPC] customers:update error:', error);
    throw error;
  }
});

/**
 * Delete customer
 */
ipcMain.handle('customers:delete', async (event, customerId) => {
  try {
    if (!customerId) {
      throw new Error('Customer ID is required');
    }

    // Check if customer has associated quotes
    const checkQuery = 'SELECT COUNT(*) as count FROM dbo.quotes WHERE customer = @id';
    const result = await sqlConnection.query(checkQuery, { id: customerId });
    
    if (result[0].count > 0) {
      throw new Error('Cannot delete customer with associated quotes. Delete quotes first.');
    }

    const deleteQuery = 'DELETE FROM dbo.customers WHERE id = @id';
    await sqlConnection.execute(deleteQuery, { id: customerId });
    
    console.log('[SQL Server] Customer deleted:', customerId);
    
    return { success: true };
  } catch (error) {
    console.error('[IPC] customers:delete error:', error);
    throw error;
  }
});

/**
 * Get customer by ID
 */
ipcMain.handle('customers:get-by-id', async (event, customerId) => {
  try {
    const query = 'SELECT * FROM dbo.customers WHERE id = @id';
    const result = await sqlConnection.query(query, { id: customerId });
    
    if (!result || result.length === 0) {
      return null;
    }

    const c = result[0];
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      isOEM: c.isOEM,
      email: c.contact_email,
      phone: c.contact_phone,
      address: c.address
    };
  } catch (error) {
    console.error('[IPC] customers:get-by-id error:', error);
    return null;
  }
});

export function initializeCustomerHandlers() {
  console.log('[IPC] Customer handlers initialized (SQL Server)');
}
