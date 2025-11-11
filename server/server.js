const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
require('./database');

// API Routes
app.use('/api/components', require('./routes/components'));
app.use('/api/sub-assemblies', require('./routes/sub_assemblies'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/quotes', require('./routes/quotes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

module.exports = app;