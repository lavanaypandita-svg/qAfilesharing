class WebRTCManager {
  constructor() {
    this.peerConnection = null;
    this.dataChannel = null;
    this.socket = null;
    this.connectedPeers = new Set();
    this.fileChunks = new Map();
    this.currentFileTransfer = null;
    this.onFileProgress = null;
    this.onFileComplete = null;
    this.onIncomingFile = null;
    this.onConnectionStateChange = null;
  }

  // Initialize WebRTC manager with socket.io instance
  initialize(socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  // Setup socket.io event listeners
  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('offer', async ({ from, offer, fileMetadata }) => {
      console.log(`Received offer from ${from}`, fileMetadata);
      
      try {
        await this.createPeerConnection();
        
        // Store file metadata if present
        if (fileMetadata) {
          this.currentFileTransfer = {
            senderId: from,
            fileName: fileMetadata.name,
            fileSize: fileMetadata.size,
            receivedBytes: 0,
            chunks: [],
            metadata: fileMetadata
          };
          
          if (this.onIncomingFile) {
            this.onIncomingFile({
              from,
              fileName: fileMetadata.name,
              fileSize: fileMetadata.size,
              accept: async () => {
                await this.handleIncomingOffer(from, offer);
              },
              reject: () => {
                this.closeConnection();
              }
            });
            return;
          }
        }
        
        await this.handleIncomingOffer(from, offer);
      } catch (error) {
        console.error('Error handling offer:', error);
        this.closeConnection();
      }
    });

    this.socket.on('answer', async ({ from, answer }) => {
      if (!this.peerConnection) return;
      
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Error setting remote description:', error);
      }
    });

    this.socket.on('ice-candidate', ({ from, candidate }) => {
      if (this.peerConnection && candidate) {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(error => console.error('Error adding ICE candidate:', error));
      }
    });
  }

  // Create a new RTCPeerConnection
  async createPeerConnection() {
    this.closeConnection();

    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add TURN servers in production for better connectivity
      ]
    };

    this.peerConnection = new RTCPeerConnection(configuration);
    this.setupConnectionListeners();
  }

  // Setup WebRTC connection event listeners
  setupConnectionListeners() {
    if (!this.peerConnection) return;

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          to: this.currentFileTransfer?.senderId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state changed:', this.peerConnection.connectionState);
      
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }

      if (['disconnected', 'failed', 'closed'].includes(this.peerConnection.connectionState)) {
        this.cleanupFileTransfer();
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      console.log('Data channel received');
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
  }

  // Setup data channel for file transfer
  setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.binaryType = 'arraybuffer';

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
      if (this.currentFileTransfer && this.onFileProgress) {
        this.onFileProgress({
          fileName: this.currentFileTransfer.fileName,
          progress: 0,
          status: 'transferring'
        });
      }
    };

    this.dataChannel.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        // Handle metadata or control messages
        const message = JSON.parse(event.data);
        if (message.type === 'fileInfo') {
          this.handleFileInfo(message);
        } else if (message.type === 'transferComplete') {
          this.handleTransferComplete();
        }
      } else {
        // Handle binary data (file chunks)
        await this.handleFileChunk(event.data);
      }
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
      this.cleanupFileTransfer();
    };
  }

  // Handle incoming WebRTC offer
  async handleIncomingOffer(from, offer) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create and set local description
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      // Send answer back to the caller
      this.socket.emit('answer', {
        to: from,
        answer: this.peerConnection.localDescription
      });

      // Create data channel if we're the initiator
      if (!this.currentFileTransfer) {
        this.dataChannel = this.peerConnection.createDataChannel('fileTransfer');
        this.setupDataChannel();
      }
    } catch (error) {
      console.error('Error handling incoming offer:', error);
      this.closeConnection();
    }
  }

  // Initiate a file transfer to a peer
  async sendFile(toUserId, file) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    try {
      await this.createPeerConnection();
      
      // Store file info
      this.currentFileTransfer = {
        receiverId: toUserId,
        file: file,
        fileName: file.name,
        fileSize: file.size,
        sentBytes: 0,
        chunkSize: 16 * 1024, // 16KB chunks
        currentChunk: 0
      };

      // Create offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveFile: true
      });
      
      await this.peerConnection.setLocalDescription(offer);

      // Send offer to the other peer with file metadata
      this.socket.emit('offer', {
        to: toUserId,
        offer: this.peerConnection.localDescription,
        fileMetadata: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }
      });

      // Wait for the data channel to be ready
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000);

        const onDataChannelOpen = () => {
          clearTimeout(timeout);
          this.sendFileChunks()
            .then(resolve)
            .catch(reject);
        };

        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          onDataChannelOpen();
        } else {
          this.dataChannel.onopen = onDataChannelOpen;
        }
      });
    } catch (error) {
      console.error('Error sending file:', error);
      this.closeConnection();
      throw error;
    }
  }

  // Send file in chunks over the data channel
  async sendFileChunks() {
    if (!this.currentFileTransfer || !this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not ready');
    }

    const { file, chunkSize, currentChunk } = this.currentFileTransfer;
    const reader = new FileReader();
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    return new Promise((resolve, reject) => {
      const readNextChunk = (chunkIndex) => {
        if (chunkIndex >= totalChunks) {
          // All chunks sent
          this.dataChannel.send(JSON.stringify({ type: 'transferComplete' }));
          this.cleanupFileTransfer();
          resolve();
          return;
        }

        const start = chunkIndex * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const slice = file.slice(start, end);
        
        reader.onload = (e) => {
          try {
            this.dataChannel.send(e.target.result);
            this.currentFileTransfer.sentBytes += (end - start);
            
            if (this.onFileProgress) {
              const progress = (this.currentFileTransfer.sentBytes / file.size) * 100;
              this.onFileProgress({
                fileName: file.name,
                progress,
                status: 'sending',
                bytesTransferred: this.currentFileTransfer.sentBytes,
                totalBytes: file.size
              });
            }
            
            // Process next chunk
            readNextChunk(chunkIndex + 1);
          } catch (error) {
            reject(error);
          }
        };
        
        reader.onerror = (error) => {
          reject(error);
        };
        
        reader.readAsArrayBuffer(slice);
      };

      // Start reading chunks
      readNextChunk(currentChunk);
    });
  }

  // Handle incoming file info
  handleFileInfo(fileInfo) {
    if (!this.currentFileTransfer) {
      this.currentFileTransfer = {
        fileName: fileInfo.name,
        fileSize: fileInfo.size,
        receivedBytes: 0,
        chunks: [],
        metadata: fileInfo
      };
    }
  }

  // Handle incoming file chunk
  async handleFileChunk(chunk) {
    if (!this.currentFileTransfer) return;

    this.currentFileTransfer.receivedBytes += chunk.byteLength;
    this.currentFileTransfer.chunks.push(chunk);

    if (this.onFileProgress) {
      const progress = (this.currentFileTransfer.receivedBytes / this.currentFileTransfer.fileSize) * 100;
      this.onFileProgress({
        fileName: this.currentFileTransfer.fileName,
        progress,
        status: 'receiving',
        bytesTransferred: this.currentFileTransfer.receivedBytes,
        totalBytes: this.currentFileTransfer.fileSize
      });
    }
  }

  // Handle transfer completion
  handleTransferComplete() {
    if (!this.currentFileTransfer) return;

    // Combine all chunks into a single file
    const blob = new Blob(this.currentFileTransfer.chunks, {
      type: this.currentFileTransfer.metadata?.type || 'application/octet-stream'
    });

    if (this.onFileComplete) {
      this.onFileComplete({
        fileName: this.currentFileTransfer.fileName,
        fileSize: this.currentFileTransfer.fileSize,
        file: blob,
        metadata: this.currentFileTransfer.metadata
      });
    }

    this.cleanupFileTransfer();
  }

  // Clean up file transfer state
  cleanupFileTransfer() {
    if (this.currentFileTransfer) {
      this.currentFileTransfer = null;
    }
  }

  // Close the current connection
  closeConnection() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.cleanupFileTransfer();
  }
}

export default new WebRTCManager();
