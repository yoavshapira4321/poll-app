const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { connectToDatabase, getDatabase } = require('./database');

// Load environment variables
require('dotenv').config();

const pollRoutes = require('./routes/poll');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../client')));

// Database connection
let db;
connectToDatabase()
  .then(database => {
    db = database;
    console.log('✅ Database connection established');
  })
  .catch(error => {
    console.error('❌ Failed to connect to database:', error);
  });

// Routes
app.use('/api/poll', pollRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    let dbStatus = 'disconnected';
    
    if (db) {
      // Test the connection
      await db.admin().ping();
      dbStatus = 'connected';
    }

    res.json({
      status: 'OK',
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'OK',
      environment: process.env.NODE_ENV || 'development',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

module.exports = app;