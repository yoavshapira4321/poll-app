const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Database file path
const DB_PATH = path.join(__dirname, 'poll-data.json');

// Questions organized by category
const QUESTIONS = [
  {
    id: 1,
    text: "אני לעתים קרובות דואג שבן/בת הזוג שלי יפסיק/ה לאהוב אותי.",
    category: "A",
    type: "yesno"
  },
  {
    id: 2,
    text: "אני מוצא/ת שקל לי להיות חיבה כלפי בן/בת הזוג שלי.",
    category: "B", 
    type: "yesno"
  },
  {
    id: 3,
    text: "אני חושש/ת שברגע שמישהו/ה יכיר/ה את עצמי האמיתי/ת, הוא/היא לא יאהב/ה אותי.",
    category: "C",
    type: "yesno"
  }
];

// Default poll structure
const DEFAULT_POLL = {
  questions: QUESTIONS,
  responses: [],
  categoryScores: {
    "A": { yes: 0, no: 0, total: 0 },
    "B": { yes: 0, no: 0, total: 0 },
    "C": { yes: 0, no: 0, total: 0 }
  },
  totalResponses: 0,
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

// Calculate category scores from responses
function calculateCategoryScores(responses) {
  const categoryScores = {
    "A": { yes: 0, no: 0, total: 0 },
    "B": { yes: 0, no: 0, total: 0 },
    "C": { yes: 0, no: 0, total: 0 }
  };

  responses.forEach(response => {
    response.answers.forEach(answer => {
      const category = answer.category;
      if (categoryScores[category]) {
        categoryScores[category].total++;
        if (answer.answer === 'yes') {
          categoryScores[category].yes++;
        } else if (answer.answer === 'no') {
          categoryScores[category].no++;
        }
      }
    });
  });

  return categoryScores;
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
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get poll questions and current results
app.get('/api/poll', async (req, res) => {
  try {
    const pollData = await loadPollData();
    
    // Return questions and summary statistics
    const response = {
      questions: pollData.questions,
      summary: {
        totalResponses: pollData.totalResponses,
        categoryScores: pollData.categoryScores,
        lastUpdated: pollData.lastUpdated
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching poll data:', error);
    res.status(500).json({ error: 'Failed to fetch poll data' });
  }
});

// Submit poll responses
app.post('/api/vote', async (req, res) => {
  const { answers, userInfo } = req.body;
  
  // Validate answers
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'No answers provided' });
  }

  try {
    // Load current data
    const pollData = await loadPollData();
    
    // Create new response
    const newResponse = {
      id: pollData.responses.length + 1,
      timestamp: new Date().toISOString(),
      userInfo: userInfo || {},
      answers: answers.map(answer => ({
        questionId: answer.questionId,
        questionText: answer.questionText,
        category: answer.category,
        answer: answer.answer
      }))
    };
    
    // Add response
    pollData.responses.push(newResponse);
    pollData.totalResponses = pollData.responses.length;
    
    // Recalculate category scores
    pollData.categoryScores = calculateCategoryScores(pollData.responses);
    
    // Save updated data
    const saved = await savePollData(pollData);
    
    if (!saved) {
      throw new Error('Failed to save poll data');
    }

    console.log(`📊 New response received:`);
    console.log(`   Total responses: ${pollData.totalResponses}`);
    console.log(`   Category A - Yes: ${pollData.categoryScores.A.yes}, No: ${pollData.categoryScores.A.no}`);
    console.log(`   Category B - Yes: ${pollData.categoryScores.B.yes}, No: ${pollData.categoryScores.B.no}`);
    console.log(`   Category C - Yes: ${pollData.categoryScores.C.yes}, No: ${pollData.categoryScores.C.no}`);

    res.json({ 
      success: true, 
      message: 'Response recorded successfully!',
      results: {
        summary: {
          totalResponses: pollData.totalResponses,
          categoryScores: pollData.categoryScores,
          lastUpdated: pollData.lastUpdated
        },
        yourAnswers: newResponse.answers
      }
    });

  } catch (error) {
    console.error('Error recording response:', error);
    res.status(500).json({ error: 'Failed to record response' });
  }
});

// Get detailed statistics
app.get('/api/stats', async (req, res) => {
  try {
    const pollData = await loadPollData();
    
    // Calculate question-level statistics
    const questionStats = pollData.questions.map(question => {
      const questionResponses = pollData.responses.flatMap(response => 
        response.answers.filter(a => a.questionId === question.id)
      );
      
      const yesCount = questionResponses.filter(a => a.answer === 'yes').length;
      const noCount = questionResponses.filter(a => a.answer === 'no').length;
      const total = questionResponses.length;
      
      return {
        ...question,
        stats: {
          yes: yesCount,
          no: noCount,
          total: total,
          yesPercentage: total > 0 ? Number(((yesCount / total) * 100).toFixed(1)) : 0,
          noPercentage: total > 0 ? Number(((noCount / total) * 100).toFixed(1)) : 0
        }
      };
    });

    res.json({
      questions: questionStats,
      categoryScores: pollData.categoryScores,
      totalResponses: pollData.totalResponses,
      lastUpdated: pollData.lastUpdated
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Reset poll endpoint
app.post('/api/reset', async (req, res) => {
  try {
    await savePollData(DEFAULT_POLL);
    res.json({ 
      success: true, 
      message: 'Poll reset successfully'
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
  console.log('📊 Poll initialized with questions:');
  QUESTIONS.forEach(q => {
    console.log(`   [${q.category}] ${q.text}`);
  });
  console.log(`   Total responses: ${initialData.totalResponses}`);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(console.error);