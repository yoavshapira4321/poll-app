const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose(); // ADD THIS LINE

const app = express();
const PORT = process.env.PORT || 3000;

// Admin password from environment variables
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "survey2024";
const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret-key-here";

// NEW: Initialize SQLite database
const initializeDatabase = async () => {
  const dbPath = path.join(__dirname, 'runtime-data', 'survey.db');
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
    } else {
      console.log('✅ Connected to SQLite database');
    }
  });

  // Create results table
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS survey_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE,
      scores TEXT NOT NULL,
      dominant_category TEXT NOT NULL,
      percentages TEXT NOT NULL,
      answers TEXT NOT NULL,
      submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      completion_time INTEGER
    )`);
  });

  return db;
};

// Initialize database
const db = initializeDatabase();

// NEW: Ensure runtime content exists on server start
const ensureRuntimeContent = async () => {
    const runtimePath = path.join(__dirname, 'public', 'content.json');
    const publicPath = path.join(__dirname, 'public', 'content.json');
    
    try {
        await fs.access(runtimePath);
        console.log('✅ Runtime content exists');
    } catch (error) {
        // Copy from public content to runtime data
        console.log('📝 Initializing runtime content from public template...');
        const publicData = await fs.readFile(publicPath, 'utf8');
        await fs.mkdir(path.dirname(runtimePath), { recursive: true });
        await fs.writeFile(runtimePath, publicData);
        console.log('✅ Runtime content created');
    }
};

// Call this when server starts
ensureRuntimeContent();

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

// Authentication middleware
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.admin) {
      next();
    } else {
      res.status(401).json({ success: false, error: 'Invalid token' });
    }
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: 'debug-1.0'
  });
});

// NEW: Survey Results Database Routes

// Save survey results to SQLite database
app.post('/api/save-results', express.json(), (req, res) => {
  const { 
    scores, 
    dominantCategory, 
    percentages, 
    answers, 
    sessionId,
    completionTime 
  } = req.body;

  const clientIp = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  
  // Generate session ID if not provided
  const finalSessionId = sessionId || 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const stmt = db.prepare(`
    INSERT INTO survey_results 
    (session_id, scores, dominant_category, percentages, answers, ip_address, user_agent, completion_time) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run([
    finalSessionId,
    JSON.stringify(scores),
    dominantCategory,
    JSON.stringify(percentages),
    JSON.stringify(answers),
    clientIp,
    userAgent,
    completionTime || null
  ], function(err) {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({ success: false, error: 'Database error: ' + err.message });
    } else {
      res.json({ 
        success: true, 
        id: this.lastID,
        sessionId: finalSessionId 
      });
    }
  });
  
  stmt.finalize();
});

// Get all survey results (protected)
app.get('/api/results', authenticateJWT, (req, res) => {
  const query = `
    SELECT * FROM survey_results 
    ORDER BY submission_date DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      // Parse JSON strings back to objects
      const results = rows.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        scores: JSON.parse(row.scores),
        dominantCategory: row.dominant_category,
        percentages: JSON.parse(row.percentages),
        answers: JSON.parse(row.answers),
        submissionDate: row.submission_date,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        completionTime: row.completion_time
      }));
      res.json(results);
    }
  });
});

// Get results statistics (protected)
app.get('/api/results/stats', authenticateJWT, (req, res) => {
  const queries = {
    totalSubmissions: `SELECT COUNT(*) as count FROM survey_results`,
    categoryDistribution: `SELECT dominant_category, COUNT(*) as count FROM survey_results GROUP BY dominant_category`,
    recentSubmissions: `SELECT COUNT(*) as count FROM survey_results WHERE submission_date > datetime('now', '-7 days')`,
    avgCompletionTime: `SELECT AVG(completion_time) as avg_time FROM survey_results WHERE completion_time IS NOT NULL`
  };

  db.serialize(() => {
    const stats = {};
    
    db.get(queries.totalSubmissions, (err, row) => {
      if (!err) stats.totalSubmissions = row.count;
    });
    
    db.all(queries.categoryDistribution, (err, rows) => {
      if (!err) stats.categoryDistribution = rows;
    });
    
    db.get(queries.recentSubmissions, (err, row) => {
      if (!err) stats.recentSubmissions = row.count;
    });
    
    db.get(queries.avgCompletionTime, (err, row) => {
      if (!err) stats.avgCompletionTime = row.avg_time ? Math.round(row.avg_time / 1000 / 60) : null;
      
      // Send response after all queries complete
      setTimeout(() => res.json(stats), 100);
    });
  });
});

// Export results as CSV (protected)
app.get('/api/results/csv', authenticateJWT, (req, res) => {
  const query = `
    SELECT 
      id,
      session_id,
      dominant_category,
      scores,
      percentages,
      submission_date,
      completion_time
    FROM survey_results 
    ORDER BY submission_date DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      const csv = convertToCSV(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=survey-results.csv');
      res.send(csv);
    }
  });
});

// Helper function for CSV conversion
function convertToCSV(results) {
  if (results.length === 0) return 'No data available';
  
  const headers = [
    'ID', 'Session ID', 'Dominant Category', 
    'Anxious Score', 'Secure Score', 'Avoidant Score',
    'Anxious %', 'Secure %', 'Avoidant %',
    'Submission Date', 'Completion Time (minutes)'
  ];
  
  const csvRows = [headers.join(',')];
  
  for (const row of results) {
    const scores = JSON.parse(row.scores);
    const percentages = JSON.parse(row.percentages);
    
    const values = [
      row.id,
      `"${row.session_id}"`,
      row.dominant_category,
      scores.A || 0,
      scores.B || 0,
      scores.C || 0,
      percentages.A || 0,
      percentages.B || 0,
      percentages.C || 0,
      `"${row.submission_date}"`,
      row.completion_time ? Math.round(row.completion_time / 1000 / 60) : 'N/A'
    ];
    
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// Delete a specific result (protected)
app.delete('/api/results/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM survey_results WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.json({ 
        success: true, 
        message: `Deleted ${this.changes} record(s)` 
      });
    }
  });
});

// NEW: Results Dashboard Route
app.get('/admin/results-dashboard', authenticateJWT, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Survey Results Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
            .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
            .stat-number { font-size: 2em; font-weight: bold; color: #4CAF50; }
            table { border-collapse: collapse; width: 100%; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
            .actions { margin: 20px 0; }
            .btn { background: #4CAF50; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
            .btn:hover { background: #45a049; }
            .chart-container { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📊 Survey Results Dashboard</h1>
            
            <div class="actions">
                <button class="btn" onclick="refreshStats()">Refresh Stats</button>
                <a href="/api/results/csv" class="btn">Download CSV</a>
                <button class="btn" onclick="loadResults()">Load All Results</button>
            </div>
            
            <div id="stats" class="stats-grid">
                <!-- Stats will be loaded here -->
            </div>
            
            <div class="chart-container">
                <h3>Category Distribution</h3>
                <div id="chart"></div>
            </div>
            
            <h3>All Submissions</h3>
            <div id="results"></div>
        </div>
        
        <script>
            async function refreshStats() {
                const response = await fetch('/api/results/stats');
                const stats = await response.json();
                
                document.getElementById('stats').innerHTML = \`
                    <div class="stat-card">
                        <div class="stat-number">\${stats.totalSubmissions || 0}</div>
                        <div>Total Submissions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${stats.recentSubmissions || 0}</div>
                        <div>Last 7 Days</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">\${stats.avgCompletionTime || 'N/A'}</div>
                        <div>Avg Minutes</div>
                    </div>
                \`;
                
                if (stats.categoryDistribution) {
                    updateChart(stats.categoryDistribution);
                }
            }
            
            function updateChart(distribution) {
                const chart = document.getElementById('chart');
                chart.innerHTML = distribution.map(item => \`
                    <div style="margin: 10px 0;">
                        <strong>\${item.dominant_category}:</strong> \${item.count} submissions
                        <div style="background: #e0e0e0; height: 20px; border-radius: 10px;">
                            <div style="background: #4CAF50; height: 100%; width: \${(item.count / distribution.reduce((sum, d) => sum + d.count, 0)) * 100}%; border-radius: 10px;"></div>
                        </div>
                    </div>
                \`).join('');
            }
            
            async function loadResults() {
                const response = await fetch('/api/results');
                const data = await response.json();
                
                const table = document.createElement('table');
                const header = \`
                    <tr>
                        <th>ID</th>
                        <th>Session ID</th>
                        <th>Dominant</th>
                        <th>Scores (A/B/C)</th>
                        <th>Percentages (A/B/C)</th>
                        <th>Submission Date</th>
                        <th>Completion Time</th>
                        <th>Actions</th>
                    </tr>
                \`;
                
                const rows = data.map(r => \`
                    <tr>
                        <td>\${r.id}</td>
                        <td title="\${r.sessionId}">\${r.sessionId.substring(0, 10)}...</td>
                        <td><strong>\${r.dominantCategory}</strong></td>
                        <td>\${r.scores.A || 0}/\${r.scores.B || 0}/\${r.scores.C || 0}</td>
                        <td>\${Math.round(r.percentages.A || 0)}%/\${Math.round(r.percentages.B || 0)}%/\${Math.round(r.percentages.C || 0)}%</td>
                        <td>\${new Date(r.submissionDate).toLocaleString()}</td>
                        <td>\${r.completionTime ? Math.round(r.completionTime / 1000 / 60) + ' min' : 'N/A'}</td>
                        <td>
                            <button onclick="deleteResult(\${r.id})">Delete</button>
                        </td>
                    </tr>
                \`).join('');
                
                table.innerHTML = header + rows;
                document.getElementById('results').innerHTML = '';
                document.getElementById('results').appendChild(table);
            }
            
            async function deleteResult(id) {
                if (confirm('Are you sure you want to delete this result?')) {
                    const response = await fetch(\`/api/results/\${id}\`, { method: 'DELETE' });
                    const result = await response.json();
                    
                    if (result.success) {
                        alert('Result deleted successfully');
                        loadResults();
                        refreshStats();
                    } else {
                        alert('Error deleting result: ' + result.error);
                    }
                }
            }
            
            // Load initial data
            refreshStats();
            loadResults();
        </script>
    </body>
    </html>
  `);
});

// KEEP ALL YOUR EXISTING ROUTES BELOW - THEY REMAIN UNCHANGED

// Frontend content API (serves from public)
app.get('/api/content', async (req, res) => {
    try {
        const contentPath = path.join(__dirname, 'public', 'content.json');
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

// Admin get content (from public)
app.get('/api/admin/content', authenticateJWT, async (req, res) => {
  try {
    const contentPath = path.join(__dirname, 'public', 'content.json');
    const contentData = await fs.readFile(contentPath, 'utf8');
    const content = JSON.parse(contentData);
    
    res.json(content);
  } catch (error) {
    console.error('Error loading content:', error);
    res.status(500).json({ error: 'Failed to load content' });
  }
});

// Admin save content (to public)
app.post('/api/admin/save-content', authenticateJWT, async (req, res) => {
  try {
    const contentPath = path.join(__dirname, 'public', 'content.json');
    await fs.writeFile(contentPath, JSON.stringify(req.body, null, 2));
    
    res.json({ success: true, message: 'Content saved successfully' });
  } catch (error) {
    console.error('Error saving content:', error);
    res.status(500).json({ error: 'Failed to save content' });
  }
});

// KEEP YOUR EXISTING POLL DATA ROUTES (optional - you can phase these out)
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
  console.log('📈 Results Dashboard: http://localhost:' + PORT + '/admin/results-dashboard');
  console.log('🔍 Check Railway logs for request debugging\n');
});