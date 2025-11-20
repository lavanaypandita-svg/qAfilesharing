import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { FiShare2, FiCopy, FiCheck } from 'react-icons/fi';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const WebRTCShare = () => {
  const { socket, myId } = useSocket();
  const [peerConnection, setPeerConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [remoteId, setRemoteId] = useState('');
  const [fileToSend, setFileToSend] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);
  const dataChannelRef = useRef(null);
  const receiveBufferRef = useRef([]);
  const receiveMetaRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    setConnectionStatus(socket.connected ? 'connected' : 'disconnected');
    const onConnect = () => setConnectionStatus('connected');
    const onDisconnect = () => setConnectionStatus('disconnected');
    const onOffer = async (data) => { await handleOffer(data.offer, data.sender); };
    const onAnswer = async (data) => { await handleAnswer(data.answer, data.sender); };
    const onIce = async (data) => { await handleIceCandidate(data.candidate, data.sender); };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIce);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIce);
    };
  }, [socket]);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          target: remoteId,
        });
      }
    };

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      dataChannelRef.current = channel;

      channel.onopen = () => {
        setConnectionStatus('ready');
      };

      channel.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'file-meta') {
          receiveMetaRef.current = { name: msg.name, size: msg.size, mimeType: msg.mimeType };
          receiveBufferRef.current = [];
        } else if (msg.type === 'file-chunk') {
          receiveBufferRef.current.push(msg.data);
        } else if (msg.type === 'file-complete') {
          const binary = atob(receiveBufferRef.current.join(''));
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: receiveMetaRef.current.mimeType });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = receiveMetaRef.current.name;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          receiveBufferRef.current = [];
          receiveMetaRef.current = null;
        }
      };

      channel.onclose = () => {
        setConnectionStatus('connected');
      };
      channel.onerror = () => {
        setConnectionStatus('connected');
      };
    };

    setPeerConnection(pc);
    return pc;
  };

  const handleOffer = async (offer, sender) => {
    const pc = createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (socket) {
      socket.emit('answer', {
        answer: answer,
        target: sender,
      });
    }
  };

  const handleAnswer = async (answer, sender) => {
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleIceCandidate = async (candidate, sender) => {
    if (peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const initiateConnection = async () => {
    if (!remoteId || !socket) return;

    const pc = createPeerConnection();
    const dataChannel = pc.createDataChannel('fileTransfer');
    dataChannelRef.current = dataChannel;

    dataChannel.onopen = () => {
      setConnectionStatus('ready');
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('offer', {
      offer: offer,
      target: remoteId,
    });
  };

  const sendFile = () => {
    if (!fileToSend || !dataChannelRef.current || connectionStatus !== 'ready') {
      alert('Please select a file and establish connection first');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result;
      const bytes = new Uint8Array(arrayBuffer);
      const CHUNK_SIZE = 64 * 1024; // 64KB

      // Send metadata
      dataChannelRef.current.send(
        JSON.stringify({
          type: 'file-meta',
          name: fileToSend.name,
          size: fileToSend.size,
          mimeType: fileToSend.type,
        })
      );

      // Chunked send with backpressure
      let offset = 0;
      const sendChunk = () => {
        if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') return;
        while (offset < bytes.length) {
          const end = Math.min(offset + CHUNK_SIZE, bytes.length);
          const chunk = bytes.subarray(offset, end);
          const base64Chunk = btoa(String.fromCharCode.apply(null, chunk));
          dataChannelRef.current.send(
            JSON.stringify({ type: 'file-chunk', data: base64Chunk })
          );

          offset = end;
          if (dataChannelRef.current.bufferedAmount > 1 * 1024 * 1024) {
            // Apply backpressure: wait for bufferedAmount to drain
            dataChannelRef.current.onbufferedamountlow = () => {
              dataChannelRef.current.onbufferedamountlow = null;
              sendChunk();
            };
            dataChannelRef.current.bufferedAmountLowThreshold = 256 * 1024;
            return;
          }
        }
        // Complete
        dataChannelRef.current.send(JSON.stringify({ type: 'file-complete' }));
        alert('File sent successfully!');
        setFileToSend(null);
      };

      sendChunk();
    };
    reader.readAsArrayBuffer(fileToSend);
  };


  const copyMyId = () => {
    navigator.clipboard.writeText(myId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Peer-to-Peer File Sharing</h2>

      <div className="space-y-6">
        {/* My ID */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-blue-900 mb-2">
            Your Connection ID
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={myId}
              readOnly
              className="flex-1 px-4 py-2 bg-white border border-blue-300 rounded-lg text-sm"
            />
            <button
              onClick={copyMyId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              {copied ? <FiCheck className="h-5 w-5" /> : <FiCopy className="h-5 w-5" />}
            </button>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            Share this ID with the person you want to send files to
          </p>
        </div>

        {/* Remote ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Remote Connection ID
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={remoteId}
              onChange={(e) => setRemoteId(e.target.value)}
              placeholder="Enter remote ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-quantum-500"
            />
            <button
              onClick={initiateConnection}
              disabled={!remoteId || connectionStatus === 'ready'}
              className="px-6 py-2 bg-quantum-600 text-white rounded-lg hover:bg-quantum-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              connectionStatus === 'ready'
                ? 'bg-green-500'
                : connectionStatus === 'connected'
                ? 'bg-yellow-500'
                : 'bg-gray-400'
            }`}
          ></div>
          <span className="text-sm text-gray-600">
            Status: {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </span>
        </div>

        {/* File Selection */}
        {connectionStatus === 'ready' && (
          <div className="border-t pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File to Send
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setFileToSend(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-quantum-50 file:text-quantum-700 hover:file:bg-quantum-100"
            />
            {fileToSend && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-600">{fileToSend.name}</span>
                <button
                  onClick={sendFile}
                  className="px-6 py-2 bg-gradient-to-r from-quantum-600 to-primary-600 text-white rounded-lg hover:from-quantum-700 hover:to-primary-700 flex items-center space-x-2"
                >
                  <FiShare2 className="h-5 w-5" />
                  <span>Send File</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">How P2P Sharing Works</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Share your Connection ID with the recipient</li>
            <li>• Enter their Connection ID and click Connect</li>
            <li>• Once connected, select and send files directly</li>
            <li>• Files are transferred peer-to-peer (no server involved)</li>
            <li>• Uses WebRTC for secure, real-time transfer</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WebRTCShare;

