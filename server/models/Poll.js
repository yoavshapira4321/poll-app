const mongoose = require('mongoose');

const pollResponseSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  selectedOption: {
    type: String,
    required: true
  },
  voterInfo: {
    ip: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }
});

module.exports = mongoose.model('PollResponse', pollResponseSchema);