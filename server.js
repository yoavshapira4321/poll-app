const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Admin password from environment variables
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "survey2024";
const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key-here";

console.log('🔧 Server starting...');
console.log('📅 Version:', new Date().toISOString());

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public directory ONLY
app.use(express.static('public'));

// Log all requests for debugging
app.use((req, res, next) => {
  console.log('📍 Request:', req.method, req.path);
  next();
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: 'debug-1.0'
  });
});

// EXPLICIT ROUTES - No ambiguity

// Root route - ALWAYS serve main app
app.get('/', (req, res) => {
  console.log('🎯 ROOT ROUTE: Serving main app');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin route - ONLY when explicitly requested
app.get('/admin', (req, res) => {
  console.log('🎯 ADMIN ROUTE: Serving admin panel');
  res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});

// SPA fallback - ALL other routes go to main app
app.get('*', (req, res) => {
  console.log('🎯 FALLBACK ROUTE:', req.path, '- Serving main app');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Simple test - no database for now
app.get('/api/poll', async (req, res) => {
  try {
    const contentPath = path.join(__dirname, 'public', 'content.json');
    const contentData = await fs.readFile(contentPath, 'utf8');
    const content = JSON.parse(contentData);
    
    res.json({
      questions: content.questions || [],
      summary: {
        totalSubmissions: 0,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error loading questions:', error);
    res.status(500).json({ error: 'Failed to load questions' });
  }
});

// Admin login (simplified)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 Server running!');
  console.log('📊 Main App: http://localhost:' + PORT);
  console.log('🔧 Admin Panel: http://localhost:' + PORT + '/admin');
  console.log('🔍 Check Railway logs for request debugging\n');
});