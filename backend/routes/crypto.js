const express = require('express');
const router = express.Router();
const { 
  generateKyberKeyPair, 
  generateSharedSecret,
  encryptAES, 
  decryptAES 
} = require('../utils/crypto');

// Store temporary keys (in production, use a proper database)
const keyStore = new Map();

// Generate and return a new key pair
router.get('/keypair', async (req, res) => {
  try {
    const keyPair = await generateKyberKeyPair();
    const keyId = Date.now().toString();
    keyStore.set(keyId, {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      timestamp: Date.now()
    });
    
    // Clean up old keys (older than 5 minutes)
    const now = Date.now();
    keyStore.forEach((value, key) => {
      if (now - value.timestamp > 300000) { // 5 minutes
        keyStore.delete(key);
      }
    });
    
    res.json({ 
      keyId,
      publicKey: keyPair.publicKey 
    });
  } catch (error) {
    console.error('Error generating key pair:', error);
    res.status(500).json({ error: 'Failed to generate key pair' });
  }
});

// Encrypt a message using a shared secret
router.post('/encrypt', async (req, res) => {
  try {
    const { keyId, publicKey, message } = req.body;
    
    if (!keyId || !publicKey || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const keyData = keyStore.get(keyId);
    if (!keyData) {
      return res.status(404).json({ error: 'Key not found or expired' });
    }
    
    // Generate shared secret
    const sharedKey = await generateSharedSecret(publicKey, keyData.privateKey);
    
    // Encrypt the message
    const encrypted = encryptAES(message, sharedKey);
    
    res.json({
      encrypted: encrypted.encrypted,
      iv: encrypted.iv,
      authTag: encrypted.authTag
    });
  } catch (error) {
    console.error('Encryption error:', error);
    res.status(500).json({ error: 'Encryption failed' });
  }
});

// Decrypt a message using a shared secret
router.post('/decrypt', async (req, res) => {
  try {
    const { keyId, publicKey, encrypted, iv, authTag } = req.body;
    
    if (!keyId || !publicKey || !encrypted || !iv || !authTag) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const keyData = keyStore.get(keyId);
    if (!keyData) {
      return res.status(404).json({ error: 'Key not found or expired' });
    }
    
    // Generate shared secret (should match the one used for encryption)
    const sharedKey = await generateSharedSecret(publicKey, keyData.privateKey);
    
    // Decrypt the message
    const decrypted = decryptAES(encrypted, sharedKey, iv, authTag);
    
    res.json({ decrypted });
  } catch (error) {
    console.error('Decryption error:', error);
    res.status(500).json({ error: 'Decryption failed' });
  }
});

module.exports = router;
