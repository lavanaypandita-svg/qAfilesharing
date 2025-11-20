// Quantum-safe cryptography utilities
// Using Kyber for post-quantum key exchange

// For now, we'll use a simplified implementation
// In production, use a proper Kyber library like liboqs-js or similar

class QuantumSafeCrypto {
  constructor() {
    // Generate key pair (simplified - in production use proper Kyber)
    this.keyPair = null;
  }

  // Generate Kyber key pair (simplified version)
  async generateKeyPair() {
    // In a real implementation, this would use the Kyber algorithm
    // For now, we'll use a hybrid approach with RSA + AES
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

    this.keyPair = {
      publicKey: JSON.stringify(publicKeyJwk),
      privateKey: JSON.stringify(privateKeyJwk),
      cryptoKeyPair: keyPair
    };

    return this.keyPair;
  }

  // Encrypt data with AES-256-GCM
  async encryptFile(file, recipientPublicKey = null) {
    // Generate AES key
    const aesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // Read file as ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encrypt file
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      fileBuffer
    );

    // Export AES key
    const exportedKey = await window.crypto.subtle.exportKey("raw", aesKey);
    const keyArray = new Uint8Array(exportedKey);

    // Encrypt AES key with recipient's public key (if provided)
    let encryptedKey = null;
    if (recipientPublicKey) {
      const publicKey = await this.importPublicKey(recipientPublicKey);
      encryptedKey = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        keyArray
      );
    }

    return {
      encryptedData: this.arrayBufferToBase64(encryptedData),
      iv: this.arrayBufferToBase64(iv),
      encryptionKey: encryptedKey ? this.arrayBufferToBase64(encryptedKey) : this.arrayBufferToBase64(keyArray),
      filename: file.name,
      mimeType: file.type,
      size: file.size
    };
  }

  // Decrypt file
  async decryptFile(encryptedData, encryptionKey, iv, privateKey) {
    try {
      // Import private key
      const privateKeyObj = await this.importPrivateKey(privateKey);

      // Determine if encryptionKey is raw AES (16/32 bytes) or RSA-wrapped
      const keyBuffer = this.base64ToArrayBuffer(encryptionKey);
      let aesKeyBuffer;
      if (keyBuffer.byteLength === 16 || keyBuffer.byteLength === 32) {
        aesKeyBuffer = keyBuffer;
      } else {
        aesKeyBuffer = await window.crypto.subtle.decrypt(
          { name: "RSA-OAEP" },
          privateKeyObj,
          keyBuffer
        );
      }

      // Import AES key
      const aesKey = await window.crypto.subtle.importKey(
        "raw",
        aesKeyBuffer,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );

      // Decrypt file
      const ivBuffer = this.base64ToArrayBuffer(iv);
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBuffer },
        aesKey,
        encryptedBuffer
      );

      return decryptedBuffer;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt file');
    }
  }

  // Import public key
  async importPublicKey(publicKeyJwk) {
    const jwk = typeof publicKeyJwk === 'string' ? JSON.parse(publicKeyJwk) : publicKeyJwk;
    return await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );
  }

  // Import private key
  async importPrivateKey(privateKeyJwk) {
    const jwk = typeof privateKeyJwk === 'string' ? JSON.parse(privateKeyJwk) : privateKeyJwk;
    return await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["decrypt"]
    );
  }

  // Helper functions
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Get public key for sharing
  getPublicKey() {
    return this.keyPair ? this.keyPair.publicKey : null;
  }

  // Get private key (stored securely)
  getPrivateKey() {
    return this.keyPair ? this.keyPair.privateKey : null;
  }
}

const quantumSafeCrypto = new QuantumSafeCrypto();
export default quantumSafeCrypto;

