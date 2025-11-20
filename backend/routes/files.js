const express = require('express');
const multer = require('multer');
const File = require('../models/File');
const AuditLog = require('../models/AuditLog');
const auth = require('../middleware/auth');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { 
    fileSize: 100 * 1024 * 1024,
    fieldSize: 200 * 1024 * 1024,
    fields: 10
  }
});

// Upload file
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { encryptedData, encryptionKey, iv, isHoneyfile } = req.body;

    if (!iv || typeof iv !== 'string' || iv.length === 0) {
      return res.status(400).json({ message: 'IV is required' });
    }

    if (!encryptedData || !encryptionKey) {
      return res.status(400).json({ message: 'Encrypted data and key are required' });
    }

    let encryptedBuffer;
    try {
      encryptedBuffer = Buffer.from(encryptedData, 'base64');
    } catch (e) {
      return res.status(400).json({ message: 'Invalid encrypted data format' });
    }

    const file = new File({
      filename: req.file.originalname,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      encryptedData: encryptedBuffer,
      encryptionKey, // This is the encrypted AES key
      iv, // Store IV for decryption
      owner: req.user._id,
      isHoneyfile: isHoneyfile === 'true'
    });

    await file.save();

    // Audit log
    await AuditLog.create({
      user: req.user._id,
      action: 'UPLOAD',
      file: file._id,
      details: `Uploaded file: ${req.file.originalname}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: file._id,
        filename: file.filename,
        size: file.size,
        uploadedAt: file.uploadedAt
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's files
router.get('/my-files', auth, async (req, res) => {
  try {
    const files = await File.find({ owner: req.user._id })
      .select('filename originalName size uploadedAt isHoneyfile')
      .sort({ uploadedAt: -1 });

    res.json({
      files: files.map(f => ({
        id: f._id,
        filename: f.filename,
        originalName: f.originalName,
        size: f.size,
        uploadedAt: f.uploadedAt,
        isHoneyfile: f.isHoneyfile
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get shared files
router.get('/shared', auth, async (req, res) => {
  try {
    const files = await File.find({ 'sharedWith.user': req.user._id })
      .populate('owner', 'username')
      .select('filename originalName size uploadedAt owner')
      .sort({ uploadedAt: -1 });

    res.json({
      files: files.map(f => ({
        id: f._id,
        filename: f.filename,
        originalName: f.originalName,
        size: f.size,
        uploadedAt: f.uploadedAt,
        owner: f.owner
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Download file
router.get('/:fileId', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check access
    const isOwner = file.owner.toString() === req.user._id.toString();
    const isShared = file.sharedWith.some(
      share => share.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !isShared) {
      await AuditLog.create({
        user: req.user._id,
        action: 'ACCESS',
        file: file?._id,
        details: 'Unauthorized file access attempt',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if honeyfile
    if (file.isHoneyfile && !isOwner) {
      file.honeyfileTriggered = true;
      await file.save();

      await AuditLog.create({
        user: req.user._id,
        action: 'HONEYFILE_TRIGGERED',
        file: file._id,
        details: 'Honeyfile access detected',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }

    // Get encrypted key for this user and enforce share constraints
    let encryptedKey = file.encryptionKey;
    if (!isOwner) {
      const share = file.sharedWith.find(
        s => s.user.toString() === req.user._id.toString()
      );
      if (share) {
        // Check expiration
        if (share.expiresAt && new Date() > new Date(share.expiresAt)) {
          await AuditLog.create({
            user: req.user._id,
            action: 'ACCESS',
            file: file._id,
            details: 'Access denied: share expired',
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          });
          return res.status(403).json({ message: 'Share expired' });
        }
        encryptedKey = share.encryptedKey;
      }
    }

    // Audit log
    await AuditLog.create({
      user: req.user._id,
      action: 'DOWNLOAD',
      file: file._id,
      details: `Downloaded file: ${file.filename}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      encryptedData: file.encryptedData.toString('base64'),
      encryptionKey: encryptedKey,
      iv: file.iv,
      filename: file.originalName,
      mimeType: file.mimeType
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Share file
router.post('/:fileId/share', auth, async (req, res) => {
  try {
    const { userId, encryptedKey, permission, expiresAt } = req.body;
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can share files' });
    }

    // Check if already shared
    const alreadyShared = file.sharedWith.some(
      share => share.user.toString() === userId
    );

    if (!alreadyShared) {
      file.sharedWith.push({
        user: userId,
        encryptedKey,
        permission: permission === 'write' ? 'write' : 'read',
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });
      await file.save();
    }

    // Audit log
    await AuditLog.create({
      user: req.user._id,
      action: 'SHARE',
      file: file._id,
      details: `Shared file with user: ${userId}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ message: 'File shared successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Revoke share
router.delete('/:fileId/share/:userId', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only owner can revoke sharing' });
    }
    file.sharedWith = file.sharedWith.filter(s => s.user.toString() !== req.params.userId);
    await file.save();
    await AuditLog.create({
      user: req.user._id,
      action: 'SHARE',
      file: file._id,
      details: `Revoked share for user: ${req.params.userId}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    res.json({ message: 'Share revoked' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete file
router.delete('/:fileId', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      const share = file.sharedWith.find(s => s.user.toString() === req.user._id.toString());
      if (!share || share.permission !== 'write') {
        await AuditLog.create({
          user: req.user._id,
          action: 'ACCESS',
          file: file._id,
          details: 'Delete denied: insufficient permissions',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
        return res.status(403).json({ message: 'Only owner or write permission can delete' });
      }
    }

    await File.findByIdAndDelete(req.params.fileId);

    // Audit log
    await AuditLog.create({
      user: req.user._id,
      action: 'DELETE',
      file: file._id,
      details: `Deleted file: ${file.filename}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

