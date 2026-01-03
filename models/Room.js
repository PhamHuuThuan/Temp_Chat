const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  ownerToken: {
    type: String,
    required: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  autoDelete: {
    type: String,
    required: true,
    enum: ['1m', '30m', '1h', '24h'],
    default: '1h'
  },
  deviceToken: {
    type: String,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  users: [{
    type: String
  }],
  qrCode: {
    data: String,
    expiresAt: Date
  }
}, {
  timestamps: true
});

// Index for finding rooms by deviceToken
roomSchema.index({ deviceToken: 1, createdAt: -1 });

module.exports = mongoose.model('Room', roomSchema);

