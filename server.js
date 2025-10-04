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

// Serve static files from public directory
app.use(express.static('public'));

// Serve admin files from admin directory
app.use('/admin', express.static('admin'));

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

app.get('/api/content', async (req, res) => {
    try {
        const contentPath = path.join(__dirname, 'runtime-data', 'content.json');
        const contentData = await fs.readFile(contentPath, 'utf8');
        const content = JSON.parse(contentData);
        res.json(content);
    } catch (error) {
        console.error('Error loading content:', error);
        res.status(500).json({ error: 'Failed to load content' });
    }
});

// Admin API routes
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

app.get('/api/admin/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.admin) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: 'Invalid token' });
    }
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

app.get('/api/admin/content', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.admin) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    
    const contentPath = path.join(__dirname, 'runtime-data', 'content.json');
    const contentData = await fs.readFile(contentPath, 'utf8');
    const content = JSON.parse(contentData);
    
    res.json(content);
  } catch (error) {
    console.error('Error loading content:', error);
    res.status(500).json({ error: 'Failed to load content' });
  }
});

app.post('/api/admin/save-content', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.admin) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    
    const contentPath = path.join(__dirname, 'runtime-data', 'content.json');
    await fs.writeFile(contentPath, JSON.stringify(req.body, null, 2));
    
    res.json({ success: true, message: 'Content saved successfully' });
  } catch (error) {
    console.error('Error saving content:', error);
    res.status(500).json({ error: 'Failed to save content' });
  }
});

// Poll data routes
app.get('/api/poll', async (req, res) => {
  try {
    const contentPath = path.join(__dirname, 'runtime-data', 'content.json');
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

app.post('/api/poll/submit', async (req, res) => {
  try {
    const { answers, userInfo } = req.body;
    
    // Read existing data
    const dataPath = path.join(__dirname, 'poll-data.json');
    let pollData = { submissions: [] };
    
    try {
      const existingData = await fs.readFile(dataPath, 'utf8');
      pollData = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist yet, start fresh
    }
    
    // Add new submission
    const submission = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      userInfo: userInfo || {},
      answers: answers || []
    };
    
    pollData.submissions.push(submission);
    
    // Save back to file
    await fs.writeFile(dataPath, JSON.stringify(pollData, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Answers submitted successfully',
      submissionId: submission.id
    });
    
  } catch (error) {
    console.error('Error submitting answers:', error);
    res.status(500).json({ error: 'Failed to submit answers' });
  }
});

app.get('/api/poll/results', async (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'poll-data.json');
    
    try {
      const pollData = await fs.readFile(dataPath, 'utf8');
      const data = JSON.parse(pollData);
      
      // Calculate summary statistics
      const summary = {
        totalSubmissions: data.submissions.length,
        lastUpdated: new Date().toISOString()
      };
      
      res.json({
        summary,
        submissions: data.submissions
      });
    } catch (error) {
      // File doesn't exist yet
      res.json({
        summary: {
          totalSubmissions: 0,
          lastUpdated: new Date().toISOString()
        },
        submissions: []
      });
    }
  } catch (error) {
    console.error('Error loading results:', error);
    res.status(500).json({ error: 'Failed to load results' });
  }
});

// ROUTES - Fixed routing logic

// Admin route - MUST come before the catch-all route
app.get('/admin', (req, res) => {
  console.log('🎯 ADMIN ROUTE: Serving admin panel');
  res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});

// Root route - serve main app
app.get('/', (req, res) => {
  console.log('🎯 ROOT ROUTE: Serving main app');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SPA fallback - ALL other routes go to main app
app.get('*', (req, res) => {
  console.log('🎯 FALLBACK ROUTE:', req.path, '- Serving main app');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 Server running!');
  console.log('📊 Main App: http://localhost:' + PORT);
  console.log('🔧 Admin Panel: http://localhost:' + PORT + '/admin');
  console.log('🔍 Check Railway logs for request debugging\n');
});