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

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

// Enhanced debugging
console.log('=== VERCEL ENVIRONMENT DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('MONGODB_URI starts with:', process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 50) + '...' : 'none');
console.log('EMAIL_USER exists:', !!process.env.EMAIL_USER);
console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);

// Database connection with detailed error handling
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  // Check if password placeholder exists
  if (MONGODB_URI.includes('<db_password>')) {
    console.error('❌ MONGODB_URI contains <db_password> placeholder!');
    console.error('Please set the actual password in Vercel environment variables');
  } else {
    console.log('🔗 Attempting MongoDB connection with provided URI...');
    
    mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    })
    .then(() => {
      console.log('✅ SUCCESS: Connected to MongoDB');
    })
    .catch((error) => {
      console.error('❌ MongoDB connection FAILED:');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      if (error.name === 'MongoServerSelectionError') {
        console.error('Possible causes:');
        console.error('1. Wrong username/password in connection string');
        console.error('2. Network access not allowed in MongoDB Atlas');
        console.error('3. Cluster is paused or not running');
        console.error('4. Incorrect database name in connection string');
      }
    });

    // Monitor connection events
    mongoose.connection.on('connecting', () => {
      console.log('🔄 MongoDB connecting...');
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB disconnected');
    });
  }
} else {
  console.log('⚠️  MONGODB_URI environment variable is not set');
}

// API Routes
app.use('/api/poll', pollRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      configured: !!(MONGODB_URI && !MONGODB_URI.includes('<db_password>')),
      connected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState
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

module.exports = app;