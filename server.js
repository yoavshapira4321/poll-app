const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Database file path
const DB_PATH = path.join(__dirname, 'poll-data.json');

// Complete questions organized by category
const QUESTIONS = [
  // Category A - Anxiety/Preoccupation
  {
    id: 1,
    text: "אני לעתים קרובות דואג שבן/בת הזוג שלי יפסיק/ה לאהוב אותי.",
    category: "A",
    type: "yesno"
  },
  {
    id: 2,
    text: "אני חושש/ת שברגע שמישהו/ה יכיר/ה את עצמי האמיתי/ת, הוא/היא לא יאהב/ה אותי.",
    category: "A",
    type: "yesno"
  },
  {
    id: 3,
    text: "כשבן/בת הזוג שלי רחוק/ה, אני חושש/ת שהוא/היא עלול/ה להתעניין במישהו/מישהו/ה אחר/ת.",
    category: "A",
    type: "yesno"
  },
  {
    id: 4,
    text: "כשאני מראה/ה לבן/בת הזוג שלי איך אני מרגיש/ה, אני חושש/ת שהוא/היא לא ירגיש/ה אותו דבר כלפיי.",
    category: "A",
    type: "yesno"
  },
  {
    id: 5,
    text: "אני חושב/ת הרבה על מערכות היחסים שלי.",
    category: "A",
    type: "yesno"
  },
  {
    id: 6,
    text: "אני נוטה/ה להיקשר/ת מהר מאוד לבן/בת זוג רומנטית.",
    category: "A",
    type: "yesno"
  },
  {
    id: 7,
    text: "לפעמים אני מרגיש/ה כועס/ת או מוטרד/ת על בן/בת הזוג שלי בלי לדעת למה.",
    category: "A",
    type: "yesno"
  },
  {
    id: 8,
    text: "אני מאוד רגיש/ה למצבי הרוח של בן/בת הזוג שלי.",
    category: "A",
    type: "yesno"
  },

  // Category B - Avoidance/Dismissiveness
  {
    id: 9,
    text: "אני מוצא/ת שקל לי להיות חיבה כלפי בן/בת הזוג שלי.",
    category: "B",
    type: "yesno"
  },
  {
    id: 10,
    text: "אני מוצא/ת שאני מתאושש/ת מהר אחרי פרידה. זה מוזר איך אני יכול/ה פשוט להוציא מישהו/מישהי מהראש שלי.",
    category: "B",
    type: "yesno"
  },
  {
    id: 11,
    text: "אני מרגיש/ה בנוח להיות תלוי/ה בבני זוג רומנטיים.",
    category: "B",
    type: "yesno" // Reverse scored
  },
  {
    id: 12,
    text: "העצמאות שלי חשובה לי יותר ממערכות היחסים שלי.",
    category: "B",
    type: "yesno"
  },
  {
    id: 13,
    text: "אני מעדיף/ה לא לשתף את בן/בת הזוג שלי ברגשות הפנימיים ביותר שלי.",
    category: "B",
    type: "yesno"
  },
  {
    id: 14,
    text: "אני מתקשה/ת להיות תלוי/ה בבני/בנות זוג רומנטיים.",
    category: "B",
    type: "yesno"
  },
  {
    id: 15,
    text: "יש לי מעט קושי לבטא את הצרכים והרצונות שלי לבן/בת הזוג שלי.",
    category: "B",
    type: "yesno"
  },
  {
    id: 16,
    text: "אני מעדיף/ה סקס מזדמן עם בני זוג לא מחויבים על פני סקס אינטימי עם אדם אחד.",
    category: "B",
    type: "yesno"
  },

  // Category C - Secure/Healthy
  {
    id: 17,
    text: "כשאני לא מעורב/ת במערכת יחסים, אני מרגיש/ה קצת חרד/ת ולא שלם/ת.",
    category: "C",
    type: "yesno" // Reverse scored
  },
  {
    id: 18,
    text: "אני מוצא/ת שקשה לי לתמוך רגשית בבן/בת הזוג שלי כשהוא/ה מרגיש/ה מדוכא/ת.",
    category: "C",
    type: "yesno" // Reverse scored
  },
  {
    id: 19,
    text: "אני בדרך כלל מרוצה/ת ממערכות היחסים הרומנטיות שלי.",
    category: "C",
    type: "yesno"
  },
  {
    id: 20,
    text: "אני לא מרגיש/ה צורך להתנהג בצורה יוצאת דופן במערכות היחסים הרומנטיות שלי.",
    category: "C",
    type: "yesno"
  },
  {
    id: 21,
    text: "אני מאמין/ה שרוב האנשים הם במהותם כנים ואמינים.",
    category: "C",
    type: "yesno"
  }
];

// Questions that should be reverse scored (where "no" indicates the trait)
const REVERSE_SCORED_QUESTIONS = [11, 17, 18];

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

// Calculate category scores from responses with reverse scoring
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
        
        // Apply reverse scoring for specific questions
        let effectiveAnswer = answer.answer;
        if (REVERSE_SCORED_QUESTIONS.includes(answer.questionId)) {
          effectiveAnswer = answer.answer === 'yes' ? 'no' : 'yes';
        }
        
        if (effectiveAnswer === 'yes') {
          categoryScores[category].yes++;
        } else if (effectiveAnswer === 'no') {
          categoryScores[category].no++;
        }
      }
    });
  });

  return categoryScores;
}

// Calculate dominant category
function calculateDominantCategory(categoryScores, userAnswers) {
  const userScores = { A: 0, B: 0, C: 0 };
  
  userAnswers.forEach(answer => {
    let effectiveAnswer = answer.answer;
    
    // Apply reverse scoring for specific questions
    if (REVERSE_SCORED_QUESTIONS.includes(answer.questionId)) {
      effectiveAnswer = answer.answer === 'yes' ? 'no' : 'yes';
    }
    
    if (effectiveAnswer === 'yes') {
      userScores[answer.category]++;
    }
  });
  
  // Find dominant category
  const maxScore = Math.max(userScores.A, userScores.B, userScores.C);
  const dominantCategories = [];
  
  if (userScores.A === maxScore) dominantCategories.push('A');
  if (userScores.B === maxScore) dominantCategories.push('B');
  if (userScores.C === maxScore) dominantCategories.push('C');
  
  return {
    scores: userScores,
    dominant: dominantCategories,
    maxScore: maxScore
  };
}

// Get category descriptions
function getCategoryDescription(category) {
  const descriptions = {
    'A': 'סגנון התקשרות חרד: נטייה לדאגה יתרה במערכות יחסים, חשש מנטישה, וצורך בתשומת לב מתמדת.',
    'B': 'סגנון התקשרות נמנע: העדפה לעצמאות, קושי בהישענות רגשית, ונכונות נמוכה לחשיפה רגשית.',
    'C': 'סגנון התקשרות בטוח: נוחות בקרבה רגשית, יכולת לתת אמון, ואיזון בין עצמאות לקרבה.'
  };
  return descriptions[category] || 'לא זמין';
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
  
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'No answers provided' });
  }

  try {
    const pollData = await loadPollData();
    
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
    
    pollData.responses.push(newResponse);
    pollData.totalResponses = pollData.responses.length;
    pollData.categoryScores = calculateCategoryScores(pollData.responses);
    
    const saved = await savePollData(pollData);
    
    if (!saved) {
      throw new Error('Failed to save poll data');
    }

    // Calculate user's dominant category
    const userDominant = calculateDominantCategory(pollData.categoryScores, newResponse.answers);

    console.log(`📊 New response - Dominant: ${userDominant.dominant.join(', ')}`);
    console.log(`   Scores - A:${userDominant.scores.A} B:${userDominant.scores.B} C:${userDominant.scores.C}`);

    res.json({ 
      success: true, 
      message: 'Response recorded successfully!',
      results: {
        summary: {
          totalResponses: pollData.totalResponses,
          categoryScores: pollData.categoryScores,
          lastUpdated: pollData.lastUpdated
        },
        yourAnswers: newResponse.answers,
        dominantCategory: userDominant,
        categoryDescriptions: {
          'A': getCategoryDescription('A'),
          'B': getCategoryDescription('B'),
          'C': getCategoryDescription('C')
        }
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
  console.log('📊 Attachment Style Survey Initialized');
  console.log(`   Category A (Anxious): ${QUESTIONS.filter(q => q.category === 'A').length} questions`);
  console.log(`   Category B (Avoidant): ${QUESTIONS.filter(q => q.category === 'B').length} questions`);
  console.log(`   Category C (Secure): ${QUESTIONS.filter(q => q.category === 'C').length} questions`);
  console.log(`   Total questions: ${QUESTIONS.length}`);
  console.log(`   Total responses: ${initialData.totalResponses}`);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(console.error);