require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const morgan = require('morgan');

const app = express();
app.use(express.json());
app.use(morgan('tiny'));

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER, // e.g., '192.168.1.50'
  database: process.env.DB_NAME, // 'CraftAutomation'
  options: {
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// Simple API key auth (optional)
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!process.env.API_KEY) return next();
  if (apiKey && apiKey === process.env.API_KEY) return next();
  return res.status(401).json({ error: 'Unauthorized' });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await sql.connect(config);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Customers
app.get('/customers', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query('SELECT * FROM dbo.customers');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/customers', async (req, res) => {
  const { id, name, email } = req.body;
  try {
    const pool = await sql.connect(config);
    const q = `MERGE dbo.customers AS target
              USING (SELECT @id AS id, @name AS name, @email AS email) AS src
              ON target.id = src.id
              WHEN MATCHED THEN UPDATE SET name = src.name, email = src.email
              WHEN NOT MATCHED THEN INSERT (id, name, email) VALUES (src.id, src.name, src.email);
             `;
    await pool.request()
      .input('id', sql.VarChar(64), id)
      .input('name', sql.NVarChar(255), name)
      .input('email', sql.NVarChar(255), email)
      .query(q);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Craft API listening on ${port}`));
