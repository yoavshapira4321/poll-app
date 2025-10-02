const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Store poll results
let pollResults = {
  question: "What's your favorite programming language?",
  options: {
    "JavaScript": 0,
    "Python": 0,
    "Java": 0,
    "C++": 0,
    "Other": 0
  },
  totalVotes: 0
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/poll', (req, res) => {
  res.json(pollResults);
});

app.post('/api/vote', async (req, res) => {
  const { selectedOption, voterInfo } = req.body;
  
  if (!selectedOption || !pollResults.options.hasOwnProperty(selectedOption)) {
    return res.status(400).json({ error: 'Invalid option selected' });
  }

  // Update poll results
  pollResults.options[selectedOption]++;
  pollResults.totalVotes++;

  console.log(`📊 New vote received: ${selectedOption}`);
  console.log(`👤 Voter: ${voterInfo?.name || 'Anonymous'}`);

  res.json({ 
    success: true, 
    message: 'Vote recorded successfully!',
    results: pollResults 
  });
});

// Static files
app.use(express.static('public'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});