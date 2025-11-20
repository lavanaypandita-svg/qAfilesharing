const crypto = require('crypto');
const forge = require('node-forge');

let liboqs;
let pqcEnabled = false;

// Try to load liboqs-node but don't fail if it's not available
try {
  liboqs = require('liboqs-node');
  pqcEnabled = true;
  console.log('Post-quantum cryptography (liboqs-node) is enabled');
} catch (err) {
  console.warn('Post-quantum cryptography (liboqs-node) is not available. Falling back to traditional cryptography.');
  console.warn('For full security, please install liboqs-node and its dependencies.');
}

// Generate key pair for Kyber (post-quantum) or RSA (traditional)
async function generateKeyPair() {
  if (pqcEnabled && liboqs) {
    const kemAlg = 'Kyber512';
    const kem = new liboqs.KeyEncapsulation(kemAlg);
    const publicKey = kem.generateKeyPair();
    const privateKey = kem.exportKey();
    
    return {
      publicKey: publicKey.toString('base64'),
      privateKey: privateKey.toString('base64'),
      keyId: crypto.randomBytes(16).toString('hex'),
      algorithm: 'kyber512'
    };
  } else {
    // Fallback to RSA if liboqs is not available
    return generateRSAKeyPair();
  }
}

// Generate shared secret using Kyber or fallback to RSA
async function generateSharedSecret(publicKey, privateKey, algorithm = 'rsa') {
  if (algorithm === 'kyber512' && pqcEnabled && liboqs) {
    try {
      const kemAlg = 'Kyber512';
      // Sender side: encapsulate
      const senderKem = new liboqs.KeyEncapsulation(kemAlg);
      const encapsulation = senderKem.encapsulate(Buffer.from(publicKey, 'base64'));
      
      // Receiver side: decapsulate
      const receiverKem = new liboqs.KeyEncapsulation(kemAlg, Buffer.from(privateKey, 'base64'));
      const sharedSecret = receiverKem.decapsulate(encapsulation.ciphertext);
      
      // Derive a secure key from the shared secret
      return crypto.createHash('sha256')
        .update(sharedSecret.toString('hex'))
        .digest('hex');
    } catch (error) {
      console.error('Error in Kyber key exchange, falling back to RSA:', error);
      // Fall through to RSA
    }
  }
  
  // Fallback to RSA key exchange
  try {
    const publicKeyObj = forge.pki.publicKeyFromPem(publicKey);
    const privateKeyObj = forge.pki.privateKeyFromPem(privateKey);
    
    // Generate a random secret
    const secret = crypto.randomBytes(32).toString('hex');
    
    // Encrypt with public key (simplified for this example)
    const encrypted = publicKeyObj.encrypt(secret, 'RSA-OAEP');
    
    // In a real implementation, you would send the encrypted data to the other party
    // and they would decrypt it with their private key
    
    // For this example, we'll just return the secret directly
    return crypto.createHash('sha256')
      .update(secret)
      .digest('hex');
  } catch (error) {
    console.error('Error in RSA key exchange:', error);
    throw new Error('Failed to establish shared secret');
  }
}

// AES-256-GCM encryption (symmetric)
function encryptAES(data, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

// AES-256-GCM decryption
function decryptAES(encryptedData, key, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'base64')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  
  let decrypted = decipher.update(Buffer.from(encryptedData, 'base64'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}

// Generate random key
function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Generate RSA key pair (for backward compatibility)
function generateRSAKeyPair() {
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
  return {
    publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
    privateKey: forge.pki.privateKeyToPem(keypair.privateKey)
  };
}

module.exports = {
  generateKeyPair,
  generateSharedSecret,
  encryptAES,
  decryptAES,
  generateKey,
  generateRSAKeyPair
};

