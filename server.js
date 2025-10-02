const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Database file path
const DB_PATH = path.join(__dirname, 'poll-data.json');

// Default poll structure
const DEFAULT_POLL = {
  question: "What's your favorite programming language?",
  options: {
    "JavaScript": 0,
    "Python": 0,
    "Java": 0,
    "C++": 0,
    "Other": 0
  },
  totalVotes: 0,
  lastUpdated: new Date().toISOString()
};

// Initialize database file
async function initializeDatabase() {
  try {
    await fs.access(DB_PATH);
    console.log('📁 Database file exists');
  } catch (error) {
    console.log('📁 Creating new database file...');
    await savePollData(DEFAULT_POLL);
  }
}

// Load poll data
async function loadPollData() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading poll data:', error);
    return DEFAULT_POLL;
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

// Middleware
app.use(cors({ origin: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'JSON File'
  });
});

app.get('/api/poll', async (req, res) => {
  try {
    const pollData = await loadPollData();
    res.json(pollData);
  } catch (error) {
    console.error('Error fetching poll data:', error);
    res.status(500).json({ error: 'Failed to fetch poll results' });
  }
});

app.post('/api/vote', async (req, res) => {
  const { selectedOption, voterInfo } = req.body;
  
  // Validate option
  const validOptions = ['JavaScript', 'Python', 'Java', 'C++', 'Other'];
  if (!selectedOption || !validOptions.includes(selectedOption)) {
    return res.status(400).json({ error: 'Invalid option selected' });
  }

  try {
    // Load current data
    const pollData = await loadPollData();
    
    // Update vote count
    pollData.options[selectedOption]++;
    pollData.totalVotes++;
    
    // Save updated data
    const saved = await savePollData(pollData);
    
    if (!saved) {
      throw new Error('Failed to save poll data');
    }

    console.log(`📊 New vote for: ${selectedOption}`);
    console.log(`👤 Voter: ${voterInfo?.name || 'Anonymous'}`);
    console.log(`📈 Total votes: ${pollData.totalVotes}`);

    res.json({ 
      success: true, 
      message: 'Vote recorded successfully!',
      results: pollData
    });

  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Additional API endpoints for statistics
app.get('/api/stats', async (req, res) => {
  try {
    const pollData = await loadPollData();
    const results = Object.entries(pollData.options).map(([option, votes]) => ({
      option_name: option,
      votes: votes,
      total_votes: pollData.totalVotes,
      percentage: pollData.totalVotes > 0 ? 
        Number(((votes / pollData.totalVotes) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.votes - a.votes);

    res.json({
      question: pollData.question,
      results: results,
      timestamp: pollData.lastUpdated
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Reset poll endpoint (optional - for testing)
app.post('/api/reset', async (req, res) => {
  try {
    await savePollData(DEFAULT_POLL);
    res.json({ 
      success: true, 
      message: 'Poll reset successfully',
      results: DEFAULT_POLL
    });
  } catch (error) {
    console.error('Error resetting poll:', error);
    res.status(500).json({ error: 'Failed to reset poll' });
  }
});

// Static files
app.use(express.static('public'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize and start server
async function startServer() {
  await initializeDatabase();
  
  const initialData = await loadPollData();
  console.log('📊 Initial poll data loaded:');
  console.log(`   Question: ${initialData.question}`);
  console.log(`   Total Votes: ${initialData.totalVotes}`);
  console.log(`   Last Updated: ${initialData.lastUpdated}`);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗃️ Database: JSON File (${DB_PATH})`);
  });
}

startServer().catch(console.error);