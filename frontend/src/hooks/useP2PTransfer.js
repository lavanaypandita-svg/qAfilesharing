import { useState, useCallback, useEffect } from 'react';
import WebRTCManager from '../utils/webrtc';

const useP2PTransfer = () => {
  const [transferState, setTransferState] = useState({
    isTransferring: false,
    status: 'idle', // 'idle', 'connecting', 'transferring', 'completed', 'error'
    progress: 0,
    transferInfo: {
      fileName: '',
      fileSize: 0,
      bytesTransferred: 0,
      speed: 0,
      timeRemaining: 0,
      direction: null, // 'sending' or 'receiving'
      peerId: ''
    },
    incomingFiles: []
  });

  // Update transfer state
  const updateTransferState = useCallback((updates) => {
    setTransferState(prev => ({
      ...prev,
      ...updates,
      transferInfo: {
        ...prev.transferInfo,
        ...(updates.transferInfo || {})
      }
    }));
  }, []);

  // Initialize WebRTC manager
  useEffect(() => {
    // Set up event handlers
    WebRTCManager.onFileProgress = (data) => {
      updateTransferState({
        isTransferring: true,
        status: data.status,
        progress: data.progress,
        transferInfo: {
          fileName: data.fileName,
          fileSize: data.totalBytes,
          bytesTransferred: data.bytesTransferred,
          direction: data.status === 'sending' ? 'sending' : 'receiving',
          peerId: transferState.transferInfo.peerId
        }
      });
    };

    WebRTCManager.onIncomingFile = (fileInfo) => {
      updateTransferState(prev => ({
        ...prev,
        incomingFiles: [
          ...prev.incomingFiles,
          {
            ...fileInfo,
            id: Date.now(),
            status: 'pending',
            accept: async () => {
              updateTransferState(prev => ({
                ...prev,
                incomingFiles: prev.incomingFiles.map(f => 
                  f.id === fileInfo.id ? { ...f, status: 'accepting' } : f
                )
              }));
              
              await fileInfo.accept();
              
              updateTransferState(prev => ({
                ...prev,
                incomingFiles: prev.incomingFiles.filter(f => f.id !== fileInfo.id)
              }));
            },
            reject: () => {
              fileInfo.reject();
              updateTransferState(prev => ({
                ...prev,
                incomingFiles: prev.incomingFiles.filter(f => f.id !== fileInfo.id)
              }));
            }
          }
        ]
      }));
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
      
      updateTransferState({
        isTransferring: false,
        status: 'completed',
        progress: 100,
        transferInfo: {
          ...transferState.transferInfo,
          bytesTransferred: transferState.transferInfo.fileSize
        }
      });

      // Reset status after 3 seconds
      setTimeout(() => {
        updateTransferState({
          isTransferring: false,
          status: 'idle',
          progress: 0,
          transferInfo: {
            fileName: '',
            fileSize: 0,
            bytesTransferred: 0,
            speed: 0,
            timeRemaining: 0,
            direction: null,
            peerId: transferState.transferInfo.peerId
          }
        });
      }, 3000);
    };

    WebRTCManager.onConnectionStateChange = (state) => {
      console.log('WebRTC connection state:', state);
      if (state === 'disconnected' || state === 'failed') {
        updateTransferState({
          status: 'error',
          isTransferring: false
        });
      }
    };

    return () => {
      WebRTCManager.closeConnection();
    };
  }, [updateTransferState, transferState.transferInfo.peerId]);

  // Send file to peer
  const sendFile = useCallback(async (peerId, file) => {
    if (!peerId || !file) return;
    
    try {
      updateTransferState({
        isTransferring: true,
        status: 'connecting',
        progress: 0,
        transferInfo: {
          fileName: file.name,
          fileSize: file.size,
          bytesTransferred: 0,
          speed: 0,
          timeRemaining: 0,
          direction: 'sending',
          peerId
        }
      });
      
      await WebRTCManager.sendFile(peerId, file);
      
    } catch (error) {
      console.error('Error sending file:', error);
      updateTransferState({
        status: 'error',
        isTransferring: false
      });
      throw error;
    }
  }, [updateTransferState]);

  // Cancel current transfer
  const cancelTransfer = useCallback(() => {
    WebRTCManager.closeConnection();
    updateTransferState({
      isTransferring: false,
      status: 'idle',
      progress: 0,
      transferInfo: {
        fileName: '',
        fileSize: 0,
        bytesTransferred: 0,
        speed: 0,
        timeRemaining: 0,
        direction: null,
        peerId: transferState.transferInfo.peerId
      }
    });
  }, [updateTransferState, transferState.transferInfo.peerId]);

  // Update peer ID
  const setPeerId = useCallback((peerId) => {
    updateTransferState({
      transferInfo: {
        ...transferState.transferInfo,
        peerId
      }
    });
  }, [transferState.transferInfo, updateTransferState]);

  return {
    ...transferState,
    sendFile,
    cancelTransfer,
    setPeerId,
    peerId: transferState.transferInfo.peerId
  };
};

export default useP2PTransfer;
