const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const dbPath = path.join(__dirname, 'poll.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    
    // Ensure poll options exist
    initializePollOptions();
  }
});

// Initialize poll options
function initializePollOptions() {
  const options = ['JavaScript', 'Python', 'Java', 'C++', 'Other'];
  
  options.forEach(option => {
    db.run(
      'INSERT OR IGNORE INTO poll_results (option_name, votes) VALUES (?, ?)',
      [option, 0],
      (err) => {
        if (err) {
          console.error('Error initializing option:', err);
        }
      }
    );
  });
}

// Middleware
app.use(cors({ origin: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Poll question (can be made configurable)
const POLL_QUESTION = "What's your favorite programming language?";

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'SQLite'
  });
});

app.get('/api/poll', (req, res) => {
  db.all('SELECT option_name, votes FROM poll_results ORDER BY option_name', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch poll results' });
    }

    // Calculate total votes
    const totalVotes = rows.reduce((sum, row) => sum + row.votes, 0);
    
    // Convert to the expected format
    const options = {};
    rows.forEach(row => {
      options[row.option_name] = row.votes;
    });

    res.json({
      question: POLL_QUESTION,
      options: options,
      totalVotes: totalVotes
    });
  });
});

app.post('/api/vote', async (req, res) => {
  const { selectedOption, voterInfo } = req.body;
  
  // Validate option
  const validOptions = ['JavaScript', 'Python', 'Java', 'C++', 'Other'];
  if (!selectedOption || !validOptions.includes(selectedOption)) {
    return res.status(400).json({ error: 'Invalid option selected' });
  }

  try {
    // Start a transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Update vote count
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE poll_results SET votes = votes + 1, updated_at = CURRENT_TIMESTAMP WHERE option_name = ?',
        [selectedOption],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    // Record individual vote (optional)
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO votes (option_name, voter_name, voter_email, ip_address) VALUES (?, ?, ?, ?)',
        [selectedOption, voterInfo?.name || null, voterInfo?.email || null, req.ip],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    // Commit transaction
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Get updated results
    db.all('SELECT option_name, votes FROM poll_results ORDER BY option_name', (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Vote recorded but failed to fetch updated results' });
      }

      const totalVotes = rows.reduce((sum, row) => sum + row.votes, 0);
      const options = {};
      rows.forEach(row => {
        options[row.option_name] = row.votes;
      });

      console.log(`📊 New vote for: ${selectedOption}`);
      console.log(`📈 Total votes: ${totalVotes}`);

      res.json({ 
        success: true, 
        message: 'Vote recorded successfully!',
        results: {
          question: POLL_QUESTION,
          options: options,
          totalVotes: totalVotes
        }
      });
    });

  } catch (error) {
    // Rollback on error
    db.run('ROLLBACK');
    console.error('Database transaction error:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// Additional API endpoints for statistics
app.get('/api/stats', (req, res) => {
  db.all(`
    SELECT 
      option_name,
      votes,
      (SELECT SUM(votes) FROM poll_results) as total_votes,
      ROUND((votes * 100.0 / (SELECT SUM(votes) FROM poll_results)), 1) as percentage
    FROM poll_results 
    ORDER BY votes DESC
  `, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch statistics' });
    }

    res.json({
      question: POLL_QUESTION,
      results: rows,
      timestamp: new Date().toISOString()
    });
  });
});

app.get('/api/recent-votes', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  db.all(`
    SELECT option_name, voter_name, created_at 
    FROM votes 
    ORDER BY created_at DESC 
    LIMIT ?
  `, [limit], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch recent votes' });
    }

    res.json({
      recentVotes: rows,
      total: rows.length
    });
  });
});

// Static files
app.use(express.static('public'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing database connection...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗃️ Database: SQLite (${dbPath})`);
});