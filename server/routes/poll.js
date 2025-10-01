const express = require('express');
const router = express.Router();
const PollResponse = require('../models/Poll');
const { sendPollNotification } = require('../utils/email');

// Submit poll response
router.post('/submit', async (req, res) => {
  try {
    const { question, selectedOption } = req.body;

    // Get voter info
    const voterIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Save to database
    const pollResponse = new PollResponse({
      question,
      selectedOption,
      voterInfo: {
        ip: voterIp,
        userAgent: userAgent
      }
    });

    await pollResponse.save();

    // Send email notification (don't await - handle separately)
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
      console.log('📧 Email failed but poll was saved to database');
    });

    res.status(200).json({
      success: true,
      message: 'Poll submitted successfully'
    });

  } catch (error) {
    console.error('Poll submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting poll'
    });
  }
});

// Get poll results (optional)
router.get('/results', async (req, res) => {
  try {
    const results = await PollResponse.aggregate([
      {
        $group: {
          _id: '$selectedOption',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching results' });
  }
});

module.exports = router;