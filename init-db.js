const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'poll.db');

// Create and initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to SQLite database.');
});

// Create tables
db.serialize(() => {
  // Poll results table
  db.run(`CREATE TABLE IF NOT EXISTS poll_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    option_name TEXT NOT NULL,
    votes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Individual votes table (for tracking if needed)
  db.run(`CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    option_name TEXT NOT NULL,
    voter_name TEXT,
    voter_email TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Initialize poll options
  const options = ['JavaScript', 'Python', 'Java', 'C++', 'Other'];
  
  const stmt = db.prepare('INSERT OR IGNORE INTO poll_results (option_name, votes) VALUES (?, ?)');
  
  options.forEach(option => {
    stmt.run([option, 0], function(err) {
      if (err) {
        console.error('Error inserting option:', err);
      } else {
        console.log(`Initialized option: ${option}`);
      }
    });
  });
  
  stmt.finalize();

  // Verify initialization
  db.all('SELECT * FROM poll_results', (err, rows) => {
    if (err) {
      console.error('Error reading poll results:', err);
    } else {
      console.log('Poll options initialized:', rows);
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('Database initialization complete.');
  }
});