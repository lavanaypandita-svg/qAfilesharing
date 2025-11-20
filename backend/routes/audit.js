const express = require('express');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');
const router = express.Router();

// Get audit logs for current user
router.get('/', auth, async (req, res) => {
  try {
    const logs = await AuditLog.find({ user: req.user._id })
      .populate('file', 'filename originalName')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({ logs });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get audit logs for a specific file
router.get('/file/:fileId', auth, async (req, res) => {
  try {
    const logs = await AuditLog.find({ file: req.params.fileId })
      .populate('user', 'username email')
      .sort({ timestamp: -1 });

    res.json({ logs });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

