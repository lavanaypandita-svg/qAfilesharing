import React, { useState, useEffect } from 'react';
import axios from 'axios';
import crypto from '../../utils/crypto';
import { FiShare2, FiUser, FiSearch } from 'react-icons/fi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const FileShare = ({ fileId, onClose }) => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [permission, setPermission] = useState('read');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (searchTerm.length >= 2) {
      fetchUsers();
    } else {
      setUsers([]);
    }
  }, [searchTerm]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users/search`, {
        params: { q: searchTerm }
      });
      setUsers(response.data.users.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        publicKey: user.publicKey
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleShare = async () => {
    if (!selectedUser || !fileId) return;

    setSharing(true);
    try {
      // Get the file's encryption key
      const fileResponse = await axios.get(`${API_URL}/files/${fileId}`);
      const { encryptionKey } = fileResponse.data;

      // Get recipient's public key
      const recipientPublicKey = selectedUser.publicKey;

      // Re-encrypt the key with recipient's public key
      // In a real implementation, this would be done properly
      const encryptedKey = await encryptKeyForUser(encryptionKey, recipientPublicKey);

      // Share the file
      await axios.post(`${API_URL}/files/${fileId}/share`, {
        userId: selectedUser.id,
        encryptedKey: encryptedKey,
        permission,
        expiresAt: expiresAt || undefined
      });

      setMessage({ type: 'success', text: 'File shared successfully!' });
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Share error:', error);
      setMessage({ type: 'error', text: 'Failed to share file' });
    } finally {
      setSharing(false);
    }
  };

  const encryptKeyForUser = async (key, publicKey) => {
    try {
      // Decrypt the file's encryptionKey (currently encrypted for owner)
      const currentUser = localStorage.getItem('currentUser');
      const ownerPrivateKeyJwk = localStorage.getItem(`privateKey_${currentUser}`);
      if (!ownerPrivateKeyJwk) throw new Error('Private key not found');
      const privateKeyObj = await crypto.importPrivateKey(ownerPrivateKeyJwk);

      const encryptedKeyBuffer = crypto.base64ToArrayBuffer(key);
      const rawAesKeyBuffer = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKeyObj,
        encryptedKeyBuffer
      );

      // Re-encrypt raw AES key with recipient's public key
      const publicKeyObj = await crypto.importPublicKey(publicKey);
      const reEncrypted = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKeyObj,
        rawAesKeyBuffer
      );
      return crypto.arrayBufferToBase64(reEncrypted);
    } catch (error) {
      console.error('Encryption error:', error);
      throw error;
    }
  };

  // Users are already filtered by the API
  const filteredUsers = users;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">Share File</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {message.text && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Users
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by username or email..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quantum-500"
            />
          </div>
        </div>

        <div className="mb-6 max-h-64 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {searchTerm.length >= 2 ? 'No users found' : 'Enter at least 2 characters to search'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedUser?.id === user.id
                      ? 'border-quantum-500 bg-quantum-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-quantum-100 rounded-full flex items-center justify-center">
                      <FiUser className="h-5 w-5 text-quantum-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.username}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permission
            </label>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quantum-500"
            >
              <option value="read">Read</option>
              <option value="write">Write</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiration (optional)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quantum-500"
            />
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={!selectedUser || sharing}
            className="flex-1 px-4 py-2 bg-quantum-600 text-white rounded-lg hover:bg-quantum-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {sharing ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Sharing...</span>
              </>
            ) : (
              <>
                <FiShare2 className="h-5 w-5" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileShare;

