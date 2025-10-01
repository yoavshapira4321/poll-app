const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const pollRoutes = require('./routes/poll');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// Debug logging
console.log('🔧 Server starting on Vercel...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI length:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 'not set');
console.log('EMAIL_USER exists:', !!process.env.EMAIL_USER);

// Database connection with detailed error handling
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  console.log('🔗 Attempting MongoDB connection...');
  
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // 5 second timeout
  })
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:');
    console.error('   Error name:', error.name);
    console.error('   Error message:', error.message);
    if (error.code) console.error('   Error code:', error.code);
  });
} else {
  console.log('⚠️  MONGODB_URI not set - running without database');
}

// API Routes
app.use('/api/poll', pollRoutes);

// Health check endpoint with detailed database info
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  let dbStatusText = 'unknown';
  
  switch(dbStatus) {
    case 0: dbStatusText = 'disconnected'; break;
    case 1: dbStatusText = 'connected'; break;
    case 2: dbStatusText = 'connecting'; break;
    case 3: dbStatusText = 'disconnecting'; break;
  }
  
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatusText,
      configured: !!MONGODB_URI,
      readyState: dbStatus
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Serve client for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Export the app for Vercel
module.exports = app;