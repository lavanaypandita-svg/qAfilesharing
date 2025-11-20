import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import WebRTCManager from '../../utils/webrtc';
import { FiUpload, FiDownload, FiX, FiUser, FiSend } from 'react-icons/fi';

const P2PFileTransfer = ({ onClose }) => {
  const { socket, myId } = useSocket();
  const [peerId, setPeerId] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle', 'connecting', 'transferring', 'completed', 'error'
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState(null);
  const [transferInfo, setTransferInfo] = useState({
    fileName: '',
    fileSize: 0,
    bytesTransferred: 0,
    speed: 0,
    timeRemaining: 0
  });
  const [incomingFiles, setIncomingFiles] = useState([]);
  const fileInputRef = useRef(null);
  const lastUpdateTime = useRef(0);
  const lastBytesTransferred = useRef(0);

  // Initialize WebRTC manager
  useEffect(() => {
    if (!socket) return;

    // Initialize WebRTC manager with socket
    WebRTCManager.initialize(socket);

    // Set up event handlers
    WebRTCManager.onFileProgress = (data) => {
      const now = Date.now();
      const timeElapsed = (now - lastUpdateTime.current) / 1000; // in seconds
      
      if (timeElapsed > 0.5) { // Update speed every 500ms
        const bytesTransferred = data.bytesTransferred;
        const bytesDiff = bytesTransferred - lastBytesTransferred.current;
        const currentSpeed = bytesDiff / timeElapsed; // bytes per second
        
        const remainingBytes = data.totalBytes - bytesTransferred;
        const timeRemaining = currentSpeed > 0 ? remainingBytes / currentSpeed : 0;
        
        setTransferInfo(prev => ({
          ...prev,
          fileName: data.fileName,
          fileSize: data.totalBytes,
          bytesTransferred,
          speed: currentSpeed,
          timeRemaining
        }));
        
        lastUpdateTime.current = now;
        lastBytesTransferred.current = bytesTransferred;
      }
      
      setProgress(data.progress);
      setStatus(data.status === 'sending' ? 'sending' : 'receiving');
    };

    WebRTCManager.onIncomingFile = (fileInfo) => {
      setIncomingFiles(prev => [...prev, {
        ...fileInfo,
        id: Date.now(),
        status: 'pending',
        accept: async () => {
          setIncomingFiles(prev => 
            prev.map(f => f.id === fileInfo.id ? { ...f, status: 'accepting' } : f)
          );
          await fileInfo.accept();
          setIncomingFiles(prev => 
            prev.filter(f => f.id !== fileInfo.id)
          );
        },
        reject: () => {
          fileInfo.reject();
          setIncomingFiles(prev => 
            prev.filter(f => f.id !== fileInfo.id)
          );
        }
      }]);
    };

    WebRTCManager.onFileComplete = (fileData) => {
      // Create download link for the received file
      const url = URL.createObjectURL(fileData.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus('completed');
      setTimeout(() => setStatus('idle'), 3000);
    };

    WebRTCManager.onConnectionStateChange = (state) => {
      console.log('WebRTC connection state:', state);
      if (state === 'disconnected' || state === 'failed') {
        setStatus('error');
      }
    };

    return () => {
      WebRTCManager.closeConnection();
    };
  }, [socket]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setCurrentFile(file);
    setTransferInfo({
      fileName: file.name,
      fileSize: file.size,
      bytesTransferred: 0,
      speed: 0,
      timeRemaining: 0
    });
    
    // Reset progress tracking
    lastUpdateTime.current = Date.now();
    lastBytesTransferred.current = 0;
  };

  const sendFile = async () => {
    if (!peerId || !currentFile) return;
    
    try {
      setStatus('connecting');
      await WebRTCManager.sendFile(peerId, currentFile);
      setStatus('sending');
    } catch (error) {
      console.error('Error sending file:', error);
      setStatus('error');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">P2P File Transfer</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <FiX size={24} />
            </button>
          </div>
          
          {/* Connection Status */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center mb-2">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                status === 'idle' ? 'bg-gray-400' :
                status === 'connecting' ? 'bg-yellow-400' :
                status === 'sending' || status === 'receiving' ? 'bg-blue-500' :
                status === 'completed' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {status === 'idle' ? 'Ready to transfer' :
                 status === 'connecting' ? 'Connecting to peer...' :
                 status === 'sending' ? 'Sending file...' :
                 status === 'receiving' ? 'Receiving file...' :
                 status === 'completed' ? 'Transfer completed!' : 'Error occurred'}
              </span>
            </div>
            
            {status !== 'idle' && status !== 'error' && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
            
            {(status === 'sending' || status === 'receiving') && (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>{formatFileSize(transferInfo.bytesTransferred)} / {formatFileSize(transferInfo.fileSize)}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Speed: {formatFileSize(transferInfo.speed)}/s</span>
                  <span>Remaining: {formatTime(transferInfo.timeRemaining)}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Peer Connection */}
          <div className="mb-6">
            <label htmlFor="peerId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Connect to Peer
            </label>
            <div className="flex">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="peerId"
                  value={peerId}
                  onChange={(e) => setPeerId(e.target.value)}
                  placeholder="Enter peer ID"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={status !== 'idle'}
                />
              </div>
              <button
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={!peerId || status !== 'idle'}
              >
                Connect
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Your ID: <span className="font-mono text-blue-600 dark:text-blue-400">{myId}</span>
            </p>
          </div>
          
          {/* File Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select File to Send
            </label>
            <div className="flex">
              <div className="relative flex-grow">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={status !== 'idle'}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  disabled={status !== 'idle'}
                >
                  <FiUpload className="mr-2 h-4 w-4" />
                  {currentFile ? currentFile.name : 'Choose File'}
                </button>
              </div>
              <button
                onClick={sendFile}
                disabled={!currentFile || !peerId || status !== 'idle'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <FiSend className="mr-2 h-4 w-4" />
                Send
              </button>
            </div>
            {currentFile && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(currentFile.size)}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Incoming Files Modal */}
      {incomingFiles.length > 0 && (
        <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden z-50">
          <div className="p-4 bg-blue-600 text-white">
            <h3 className="font-medium">Incoming File Transfer</h3>
          </div>
          <div className="p-4">
            {incomingFiles.map((file) => (
              <div key={file.id} className="mb-4 last:mb-0">
                <div className="flex justify-between items-center mb-2">
                  <div className="truncate">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{file.fileName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.fileSize)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={file.reject}
                      className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      disabled={file.status === 'accepting'}
                    >
                      <FiX size={20} />
                    </button>
                    <button
                      onClick={file.accept}
                      className="p-1 text-green-500 hover:text-green-700 dark:hover:text-green-400"
                      disabled={file.status === 'accepting'}
                    >
                      <FiDownload size={20} />
                    </button>
                  </div>
                </div>
                {file.status === 'accepting' && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                    <div className="bg-blue-600 h-1.5 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default P2PFileTransfer;
