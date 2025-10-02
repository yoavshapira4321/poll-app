const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { sendPollNotification } = require('../utils/email');

// Submit poll response
router.post('/submit', async (req, res) => {
  try {
    const { question, selectedOption } = req.body;

    // Get voter info
    const voterIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    console.log('📝 New poll submission:', { selectedOption, voterIp });

    // Save to database
    const db = getDatabase();
    const pollResponse = {
      question,
      selectedOption,
      voterInfo: {
        ip: voterIp,
        userAgent: userAgent
      },
      timestamp: new Date()
    };

    const result = await db.collection('pollresponses').insertOne(pollResponse);
    console.log('✅ Poll saved to database with ID:', result.insertedId);

    // Send email notification
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      sendPollNotification({
        question,
        selectedOption,
        voterInfo: {
          ip: voterIp,
          userAgent: userAgent
        },
        timestamp: new Date()
      }).then(() => {
        console.log('✅ Email sent successfully');
      }).catch(emailError => {
        console.log('📧 Email failed:', emailError.message);
      });
    } else {
      console.log('⚠️ Email credentials not configured');
    }

    res.status(200).json({
      success: true,
      message: 'Poll submitted successfully',
      responseId: result.insertedId
    });

  } catch (error) {
    console.error('❌ Poll submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting poll',
      error: error.message
    });
  }
});

// Get poll results
router.get('/results', async (req, res) => {
  try {
    const db = getDatabase();
    
    const results = await db.collection('pollresponses').aggregate([
      {
        $group: {
          _id: '$selectedOption',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    res.json({ success: true, results });
  } catch (error) {
    console.error('❌ Results fetch error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching results',
      error: error.message
    });
  }
});

module.exports = router;