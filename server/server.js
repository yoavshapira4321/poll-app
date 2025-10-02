const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { connectToDatabase, getDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../client')));

// Database connection
let dbConnection;

// Initialize database connection
connectToDatabase()
  .then(db => {
    dbConnection = db;
    console.log('✅ Database ready');
  })
  .catch(error => {
    console.error('❌ Database initialization failed:', error.message);
  });

// Import routes
const pollRoutes = require('./routes/poll');
app.use('/api/poll', pollRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    let dbStatus = 'disconnected';
    
    if (dbConnection) {
      try {
        await dbConnection.admin().ping();
        dbStatus = 'connected';
      } catch (error) {
        dbStatus = 'error: ' + error.message;
      }
    }

    res.json({
      status: 'OK',
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Export for Vercel
module.exports = app;