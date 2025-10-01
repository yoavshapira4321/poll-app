const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const pollRoutes = require('./routes/poll');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// Enhanced logging for production
console.log('🚀 Server starting in', process.env.NODE_ENV, 'mode');
console.log('📊 Environment check:');
console.log('   - MONGODB_URI:', process.env.MONGODB_URI ? '✓ Set' : '✗ Missing');
console.log('   - EMAIL_USER:', process.env.EMAIL_USER ? '✓ Set' : '✗ Missing');
console.log('   - NODE_ENV:', process.env.NODE_ENV);

// Database connection with production settings
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI && MONGODB_URI.includes('<db_password>')) {
  console.error('❌ CRITICAL: MONGODB_URI contains <db_password> placeholder!');
  console.error('   Please set the actual password in environment variables');
}

if (MONGODB_URI && !MONGODB_URI.includes('<db_password>')) {
  console.log('🔗 Attempting MongoDB connection...');
  
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // 10 second timeout
    socketTimeoutMS: 45000, // 45 seconds
  })
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:');
    console.error('   Error:', error.message);
    if (error.name === 'MongoServerSelectionError') {
      console.error('   This usually means:');
      console.error('   - Wrong password in connection string');
      console.error('   - Network access not allowed in MongoDB Atlas');
      console.error('   - Cluster is paused or not running');
    }
  });
} else {
  console.log('⚠️  MONGODB_URI not properly configured');
}

// API Routes
app.use('/api/poll', pollRoutes);

// Enhanced health check
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
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatusText,
      configured: !!(MONGODB_URI && !MONGODB_URI.includes('<db_password>')),
      readyState: dbStatus
    },
    services: {
      email: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      database: !!(MONGODB_URI && !MONGODB_URI.includes('<db_password>'))
    }
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Serve client for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Export the app for Vercel
module.exports = app;