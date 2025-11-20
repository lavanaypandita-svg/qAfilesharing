const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  encryptedData: {
    type: Buffer,
    required: true
  },
  encryptionKey: {
    type: String, // Encrypted with recipient's public key
    required: true
  },
  iv: {
    type: String, // Initialization vector for AES-GCM
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    encryptedKey: String, // Key encrypted with this user's public key
    permission: {
      type: String,
      enum: ['read', 'write'],
      default: 'read'
    },
    expiresAt: {
      type: Date
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isHoneyfile: {
    type: Boolean,
    default: false
  },
  honeyfileTriggered: {
    type: Boolean,
    default: false
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('File', fileSchema);

