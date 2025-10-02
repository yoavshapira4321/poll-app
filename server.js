const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS for production
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://*.railway.app'] 
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || 
      origin.endsWith('.railway.app') ||
      allowedOrigin === '*'
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Handle favicon request
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify email configuration on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error('Email transporter verification failed:', error);
  } else {
    console.log('✅ Email transporter is ready to send messages');
  }
});

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

// API Routes - these should come BEFORE static file serving
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

  // Prepare email content
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Poll Submission</h2>
      <p><strong>Selected Option:</strong> ${selectedOption}</p>
      <p><strong>Voter Info:</strong></p>
      <ul>
        <li>Name: ${voterInfo.name || 'Not provided'}</li>
        <li>Email: ${voterInfo.email || 'Not provided'}</li>
        <li>Timestamp: ${new Date().toLocaleString()}</li>
      </ul>
      <h3 style="color: #666;">Current Poll Results:</h3>
      <ul>
        ${Object.entries(pollResults.options).map(([option, votes]) => 
          `<li>${option}: ${votes} votes (${((votes / pollResults.totalVotes) * 100).toFixed(1)}%)</li>`
        ).join('')}
      </ul>
      <p><strong>Total Votes:</strong> ${pollResults.totalVotes}</p>
    </div>
  `;

  try {
    // Send email notification
    await transporter.sendMail({
      from: `"Poll App" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      subject: `📊 New Poll Vote: ${selectedOption}`,
      html: emailHtml
    });

    console.log(`✅ Vote recorded for: ${selectedOption}. Email sent successfully.`);
    
    res.json({ 
      success: true, 
      message: 'Vote recorded successfully and notification sent!',
      results: pollResults 
    });
  } catch (error) {
    console.error('❌ Email sending error:', error);
    res.status(500).json({ 
      error: 'Vote recorded but failed to send notification' 
    });
  }
});

// Health check endpoint (important for Railway)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Poll API is running successfully'
  });
});

// Serve static files (this should come after API routes)
app.use(express.static('public'));

// Root endpoint - serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all handler - serve index.html for any other route (for SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📧 Email notifications enabled for: ${process.env.EMAIL_TO}`);
  console.log(`🌐 Health check available at: /api/health`);
});