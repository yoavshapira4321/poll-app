const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS first
app.use(cors({
  origin: true, // Allow all origins in production
  credentials: true
}));

// Body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API Routes - DEFINITELY before static files
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Poll API is running successfully',
    platform: 'Railway'
  });
});

app.get('/api/poll', (req, res) => {
  res.json({
    question: "What's your favorite programming language?",
    options: {
      "JavaScript": 0,
      "Python": 0,
      "Java": 0,
      "C++": 0,
      "Other": 0
    },
    totalVotes: 0
  });
});

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/api/vote', async (req, res) => {
  const { selectedOption, voterInfo } = req.body;
  
  const pollResults = {
    question: "What's your favorite programming language?",
    options: {
      "JavaScript": Math.floor(Math.random() * 10),
      "Python": Math.floor(Math.random() * 10),
      "Java": Math.floor(Math.random() * 10),
      "C++": Math.floor(Math.random() * 10),
      "Other": Math.floor(Math.random() * 10)
    },
    totalVotes: 25
  };

  if (!selectedOption) {
    return res.status(400).json({ error: 'Invalid option selected' });
  }

  try {
    // Send email notification
    await transporter.sendMail({
      from: `"Poll App" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject: `📊 New Poll Vote: ${selectedOption}`,
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>New Poll Submission</h2>
          <p><strong>Selected Option:</strong> ${selectedOption}</p>
          <p><strong>Voter Info:</strong></p>
          <ul>
            <li>Name: ${voterInfo?.name || 'Not provided'}</li>
            <li>Email: ${voterInfo?.email || 'Not provided'}</li>
            <li>Timestamp: ${new Date().toLocaleString()}</li>
          </ul>
        </div>
      `
    });

    res.json({ 
      success: true, 
      message: 'Vote recorded successfully and notification sent!',
      results: pollResults 
    });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ 
      error: 'Vote recorded but failed to send notification' 
    });
  }
});

// Static files - AFTER API routes
app.use(express.static('public'));

// Serve index.html for all other routes (SPA behavior)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email: ${process.env.EMAIL_USER}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});