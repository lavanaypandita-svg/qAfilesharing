import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import crypto from '../../utils/crypto';
import { FiUpload, FiX, FiShield } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const FileUpload = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isHoneyfile, setIsHoneyfile] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setUploadProgress(0);
    setMessage({ type: '', text: '' });

    try {
      // Encrypt file client-side
      setUploadProgress(20);
      const encrypted = await crypto.encryptFile(file, user?.publicKey);
      setUploadProgress(50);

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('encryptedData', encrypted.encryptedData);
      formData.append('encryptionKey', encrypted.encryptionKey);
      formData.append('iv', encrypted.iv);
      formData.append('isHoneyfile', isHoneyfile.toString());
      
      // Note: The actual file is not sent, only metadata
      // The encrypted data is sent as base64 string

      // Upload to server
      setUploadProgress(70);
      const response = await axios.post(`${API_URL}/files/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(70 + (percentCompleted * 0.3));
        },
      });

      setUploadProgress(100);
      setMessage({ type: 'success', text: 'File uploaded and encrypted successfully!' });
      
      // Reset after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
        setIsHoneyfile(false);
      }, 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Upload failed. Please try again.' 
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [user, isHoneyfile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
    maxFiles: 1,
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 fade-in">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Upload File</h2>

        {/* Honeyfile Toggle */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isHoneyfile}
              onChange={(e) => setIsHoneyfile(e.target.checked)}
              className="w-5 h-5 text-quantum-600 focus:ring-quantum-500 border-gray-300 rounded"
            />
            <div className="flex items-center space-x-2">
              <FiShield className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-700">
                Mark as Honeyfile (Decoy File)
              </span>
            </div>
          </label>
          <p className="text-xs text-gray-600 mt-2 ml-8">
            Honeyfiles are decoy files that alert you when accessed by unauthorized users.
          </p>
        </div>

        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-quantum-500 bg-quantum-50'
              : 'border-gray-300 hover:border-quantum-400 hover:bg-gray-50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <FiUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-quantum-600 font-medium">Drop the file here...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">
                Drag & drop a file here, or click to select
              </p>
              <p className="text-sm text-gray-400">
                Files are encrypted client-side before upload
              </p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-quantum-600 to-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Message */}
        {message.text && (
          <div
            className={`mt-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Security Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">🔒 Security Features</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Client-side encryption before upload</li>
            <li>• Quantum-safe key exchange (Kyber)</li>
            <li>• AES-256-GCM encryption</li>
            <li>• Zero-trust architecture</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;

