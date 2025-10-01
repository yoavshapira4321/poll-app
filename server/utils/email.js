const nodemailer = require('nodemailer');

const createTransporter = () => {
  console.log('🔧 Gmail Configuration Check:');
  console.log('   EMAIL_USER:', process.env.EMAIL_USER ? '✓ Set' : '✗ Missing');
  
  if (process.env.EMAIL_PASS) {
    console.log('   EMAIL_PASS: ✓ Set (length:', process.env.EMAIL_PASS.length + ')');
  } else {
    console.log('   EMAIL_PASS: ✗ Missing');
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials not configured in .env file');
  }

  console.log('   Attempting Gmail connection...');
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    debug: true, // This will show detailed connection logs
    logger: true
  });
};

const sendPollNotification = async (pollData) => {
  let transporter;
  
  try {
    transporter = createTransporter();
    
    console.log('📧 Attempting to send email via Gmail...');
    console.log('   From:', process.env.EMAIL_USER);
    console.log('   To: yoavshapira4321@gmail.com');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'yoavshapira4321@gmail.com',
      subject: 'New Poll Submission Received 🗳️',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
            📊 New Poll Response
          </h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0;">
            <p style="margin: 10px 0;"><strong>❓ Question:</strong> ${pollData.question}</p>
            <p style="margin: 10px 0;"><strong>✅ Selected Option:</strong> 
              <span style="color: #27ae60; font-weight: bold;">${pollData.selectedOption}</span>
            </p>
            <p style="margin: 10px 0;"><strong>🕐 Timestamp:</strong> ${new Date(pollData.timestamp).toLocaleString()}</p>
            <p style="margin: 10px 0;"><strong>🌐 Voter IP:</strong> ${pollData.voterInfo.ip}</p>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #e8f4fd; border-radius: 5px;">
            <p style="margin: 0; color: #2c3e50; font-size: 14px;">
              This email was sent automatically from your poll application.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ GMAIL SUCCESS! Email sent to your inbox!');
    console.log('   Message ID:', result.messageId);
    console.log('   Check yoavshapira4321@gmail.com for the email');
    
    return result;

  } catch (error) {
    console.error('❌ GMAIL AUTHENTICATION FAILED:');
    console.error('   Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n🔐 AUTHENTICATION TROUBLESHOOTING:');
      console.error('   1. Go to: https://myaccount.google.com/apppasswords');
      console.error('   2. Make sure 2FA is ENABLED (not just "Less secure app access")');
      console.error('   3. Generate a NEW App Password for "Mail"');
      console.error('   4. Use the EXACT Gmail address that created the app password');
      console.error('   5. Remove spaces from the 16-character app password');
      console.error('   6. Restart your server after updating .env');
    }
    
    // Still log the poll data
    console.log('📝 Poll submission recorded to database');
    
    throw error;
  }
};

module.exports = { sendPollNotification };