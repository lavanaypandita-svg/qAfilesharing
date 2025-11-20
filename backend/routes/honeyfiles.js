const express = require('express');
const File = require('../models/File');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');
const router = express.Router();

// Get honeyfile statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const totalHoneyfiles = await File.countDocuments({ 
      owner: req.user._id, 
      isHoneyfile: true 
    });
    
    const triggeredHoneyfiles = await File.countDocuments({ 
      owner: req.user._id, 
      isHoneyfile: true, 
      honeyfileTriggered: true 
    });

    const triggers = await AuditLog.find({
      action: 'HONEYFILE_TRIGGERED',
      file: { $in: await File.find({ owner: req.user._id, isHoneyfile: true }).distinct('_id') }
    })
    .populate('user', 'username email')
    .sort({ timestamp: -1 })
    .limit(50);

    res.json({
      totalHoneyfiles,
      triggeredHoneyfiles,
      triggers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

