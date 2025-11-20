import React, { useState, useEffect } from 'react';
import axios from 'axios';
import crypto from '../../utils/crypto';
import { FiDownload, FiTrash2, FiShare2, FiShield, FiFile } from 'react-icons/fi';
import { format } from 'date-fns';
import FileShare from './FileShare';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const FileList = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [sharingFile, setSharingFile] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API_URL}/files/my-files`);
      const normalized = (response.data.files || []).map((f) => ({
        ...f,
        id: f.id || f._id,
      }));
      setFiles(normalized);
    } catch (error) {
      console.error('Error fetching files:', error);
      setMessage({ type: 'error', text: 'Failed to load files' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file) => {
    setDownloading(file.id);
    try {
      const response = await axios.get(`${API_URL}/files/${file.id}`);
      const { encryptedData, encryptionKey, iv, filename, mimeType } = response.data;

      // Get private key from localStorage
      const currentUser = localStorage.getItem('currentUser');
      const privateKey = localStorage.getItem(`privateKey_${currentUser}`);
      if (!privateKey) {
        throw new Error('Private key not found');
      }

      // Decrypt file
      const decryptedBuffer = await crypto.decryptFile(
        encryptedData,
        encryptionKey,
        iv,
        privateKey
      );

      // Create blob and download
      const blob = new Blob([decryptedBuffer], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: 'success', text: 'File downloaded and decrypted successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Download error:', error);
      setMessage({ type: 'error', text: 'Failed to download file' });
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await axios.delete(`${API_URL}/files/${fileId}`);
      setFiles(files.filter(f => f.id !== fileId));
      setMessage({ type: 'success', text: 'File deleted successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Delete error:', error);
      setMessage({ type: 'error', text: 'Failed to delete file' });
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">My Files</h2>

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
          <FiFile className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-500">No files uploaded yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file) => (
                <tr key={file.id || file._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiFile className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {file.originalName}
                        </div>
                        {file.isHoneyfile && (
                          <div className="flex items-center text-xs text-yellow-600 mt-1">
                            <FiShield className="h-4 w-4 mr-1" />
                            Honeyfile
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(file.uploadedAt), 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleDownload(file)}
                        disabled={downloading === file.id}
                        className="text-quantum-600 hover:text-quantum-700 disabled:opacity-50"
                        title="Download"
                      >
                        <FiDownload className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setSharingFile(file.id)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Share"
                      >
                        <FiShare2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sharingFile && (
        <FileShare
          fileId={sharingFile}
          onClose={() => {
            setSharingFile(null);
            fetchFiles();
          }}
        />
      )}
    </div>
  );
};

export default FileList;

