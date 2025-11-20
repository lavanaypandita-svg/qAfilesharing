import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const SocketContext = createContext(null);

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
};

export const SocketProvider = ({ children }) => {
  const [myId, setMyId] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    if (socketRef.current) return;
    const token = localStorage.getItem('token');
    const s = io(SOCKET_URL, { auth: { token } });
    socketRef.current = s;
    s.on('connect', () => {
      setMyId(s.id);
    });
  }, []);

  const value = { socket: socketRef.current, myId };
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};