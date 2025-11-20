import React, { useState, useEffect } from 'react';
import axios from 'axios';
import crypto from '../../utils/crypto';
import { FiDownload, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const SharedFiles = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSharedFiles();
  }, []);

  const fetchSharedFiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/files/shared`);
      const normalized = (response.data.files || []).map((f) => ({
        ...f,
        id: f.id || f._id,
      }));
      setFiles(normalized);
    } catch (error) {
      console.error('Error fetching shared files:', error);
      setMessage({ type: 'error', text: 'Failed to load shared files' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file) => {
    setDownloading(file.id);
    try {
      const response = await axios.get(`${API_URL}/files/${file.id}`);
      const { encryptedData, encryptionKey, iv, filename, mimeType } = response.data;

      const currentUser = localStorage.getItem('currentUser');
      const privateKey = localStorage.getItem(`privateKey_${currentUser}`);
      if (!privateKey) {
        throw new Error('Private key not found');
      }

      const decryptedBuffer = await crypto.decryptFile(
        encryptedData,
        encryptionKey,
        iv,
        privateKey
      );

      const blob = new Blob([decryptedBuffer], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: 'success', text: 'File downloaded successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Download error:', error);
      setMessage({ type: 'error', text: 'Failed to download file' });
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-quantum-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Shared with Me</h2>

      {message.text && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {files.length === 0 ? (
        <div className="text-center py-12">
          <FiUser className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-500">No files shared with you yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {files.map((file) => (
            <div
              key={file.id || file._id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{file.originalName}</h3>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>Size: {formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>From: {file.owner?.username || 'Unknown'}</span>
                    <span>•</span>
                    <span>{format(new Date(file.uploadedAt), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(file)}
                  disabled={downloading === file.id}
                  className="ml-4 px-4 py-2 bg-quantum-600 text-white rounded-lg hover:bg-quantum-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <FiDownload className="h-5 w-5" />
                  <span>{downloading === file.id ? 'Downloading...' : 'Download'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedFiles;

