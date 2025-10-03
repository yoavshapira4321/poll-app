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

// Database file path
const DB_PATH = path.join(__dirname, 'poll-data.json');

// Load content from content.json for questions
let QUESTIONS = [];

// Initialize database file
async function initializeDatabase() {
  try {
    // Load questions from content.json
    try {
      const contentData = await fs.readFile(path.join(__dirname, 'public', 'content.json'), 'utf8');
      const content = JSON.parse(contentData);
      QUESTIONS = content.questions || [];
      console.log('✅ Loaded questions from content.json');
    } catch (error) {
      console.log('❌ Could not load content.json, using empty questions array');
      QUESTIONS = [];
    }

    // Initialize or load poll database
    try {
      await fs.access(DB_PATH);
      const existingData = await loadPollData();
      console.log('📁 Existing database loaded');
      console.log(`   Total submissions: ${existingData.responses.length}`);
    } catch (error) {
      console.log('📁 Creating new database file...');
      const initialData = {
        questions: QUESTIONS,
        responses: [],
        totalSubmissions: 0,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      await savePollData(initialData);
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Load poll data
async function loadPollData() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading poll data:', error);
    return { responses: [], totalSubmissions: 0 };
  }
}

// Save poll data
async function savePollData(pollData) {
  try {
    pollData.lastUpdated = new Date().toISOString();
    await fs.writeFile(DB_PATH, JSON.stringify(pollData, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving poll data:', error);
    return false;
  }
}

// Middleware to verify admin authentication
function verifyAdmin(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from public directory ONLY
app.use(express.static('public'));

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get poll questions
app.get('/api/poll', async (req, res) => {
  try {
    const pollData = await loadPollData();
    
    res.json({
      questions: QUESTIONS,
      summary: {
        totalSubmissions: pollData.responses.length,
        lastUpdated: pollData.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error fetching poll data:', error);
    res.status(500).json({ error: 'Failed to fetch poll data' });
  }
});

// Submit poll response
app.post('/api/vote', async (req, res) => {
  const { answers, userInfo } = req.body;
  
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'No answers provided' });
  }

  try {
    const pollData = await loadPollData();
    
    // Create new response
    const newResponse = {
      id: pollData.responses.length + 1,
      timestamp: new Date().toISOString(),
      userInfo: {
        name: userInfo?.name || 'Anonymous',
        email: userInfo?.email || '',
        submittedAt: new Date().toISOString()
      },
      answers: answers
    };
    
    // Add to database
    pollData.responses.push(newResponse);
    pollData.totalSubmissions = pollData.responses.length;
    
    // Save to database
    const saved = await savePollData(pollData);
    
    if (!saved) {
      throw new Error('Failed to save poll data');
    }

    // Calculate results for this user
    const userScores = { A: 0, B: 0, C: 0 };
    answers.forEach(answer => {
      if (answer.answer === 'yes') {
        userScores[answer.category]++;
      }
    });

    const maxScore = Math.max(userScores.A, userScores.B, userScores.C);
    const dominantCategories = [];
    if (userScores.A === maxScore) dominantCategories.push('A');
    if (userScores.B === maxScore) dominantCategories.push('B');
    if (userScores.C === maxScore) dominantCategories.push('C');

    console.log(`📊 New submission #${newResponse.id}`);
    console.log(`   User: ${newResponse.userInfo.name}`);

    res.json({ 
      success: true, 
      message: 'Response recorded successfully!',
      submissionId: newResponse.id,
      results: {
        summary: {
          totalSubmissions: pollData.responses.length,
          yourSubmission: `#${newResponse.id}`,
          lastUpdated: pollData.lastUpdated
        },
        yourAnswers: answers,
        dominantCategory: {
          dominant: dominantCategories,
          scores: userScores
        }
      }
    });

  } catch (error) {
    console.error('Error recording response:', error);
    res.status(500).json({ error: 'Failed to record response' });
  }
});

// ADMIN ROUTES

// Admin login route
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }
    
    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign(
            { admin: true, timestamp: Date.now() },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ 
            success: true, 
            token,
            message: 'Login successful' 
        });
    } else {
        res.status(401).json({ 
            success: false, 
            error: 'Invalid password' 
        });
    }
});

// Verify token route
app.get('/api/admin/verify', verifyAdmin, (req, res) => {
    res.json({ success: true, message: 'Token is valid' });
});

// Get content for admin (protected)
app.get('/api/admin/content', verifyAdmin, async (req, res) => {
    try {
        const contentPath = path.join(__dirname, 'public', 'content.json');
        const data = await fs.readFile(contentPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error loading content:', error);
        res.status(500).json({ error: 'Failed to load content' });
    }
});

// Save content (protected)
app.post('/api/admin/save-content', verifyAdmin, async (req, res) => {
    try {
        const newContent = req.body;
        
        // Validate the content structure
        if (!newContent.ui || !newContent.questions) {
            return res.status(400).json({ error: 'Invalid content structure' });
        }

        // Save to content.json
        const contentPath = path.join(__dirname, 'public', 'content.json');
        await fs.writeFile(contentPath, JSON.stringify(newContent, null, 2));
        
        // Update the in-memory questions
        QUESTIONS = newContent.questions || [];
        
        console.log('📝 Content updated via admin interface');
        res.json({ success: true, message: 'Content saved successfully' });
        
    } catch (error) {
        console.error('Error saving content:', error);
        res.status(500).json({ error: 'Failed to save content' });
    }
});

// Serve admin page - ONLY for /admin route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});

// SPA fallback - Serve main app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize and start server
async function startServer() {
  await initializeDatabase();
  
  const pollData = await loadPollData();
  console.log('\n📊 Attachment Style Survey Server Started');
  console.log(`   Total Questions: ${QUESTIONS.length}`);
  console.log(`   Total Submissions: ${pollData.responses.length}`);
  console.log(`   Admin password set: ${ADMIN_PASSWORD ? 'Yes' : 'No'}`);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Main App: http://localhost:${PORT}`);
    console.log(`🔧 Admin Panel: http://localhost:${PORT}/admin`);
  });
}

startServer().catch(console.error);