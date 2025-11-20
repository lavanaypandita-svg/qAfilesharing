const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['LOGIN', 'LOGOUT', 'UPLOAD', 'DOWNLOAD', 'SHARE', 'DELETE', 'ACCESS', 'HONEYFILE_TRIGGERED']
  },
  file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  },
  details: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);

