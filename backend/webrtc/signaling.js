const EventEmitter = require('events');
const debug = require('debug')('webrtc:signaling');

class WebRTCSignaling extends EventEmitter {
  constructor(io) {
    super();
    this.io = io;
    this.connections = new Map(); // userId -> socketId
    this.socketToUser = new Map(); // socketId -> userId
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      debug(`New connection: ${socket.id}`);

      // Handle user authentication
      socket.on('authenticate', ({ userId, token }, callback) => {
        try {
          // In a real app, verify the JWT token here
          // For now, we'll trust the client
          this.connections.set(userId, socket.id);
          this.socketToUser.set(socket.id, userId);
          debug(`User ${userId} connected with socket ${socket.id}`);
          callback({ status: 'authenticated' });
        } catch (error) {
          debug(`Authentication failed: ${error.message}`);
          callback({ status: 'error', message: 'Authentication failed' });
        }
      });

      // Handle offer from a peer
      socket.on('offer', ({ to, offer, fileMetadata }) => {
        const from = this.socketToUser.get(socket.id);
        const targetSocketId = this.connections.get(to);
        
        if (targetSocketId) {
          debug(`Forwarding offer from ${from} to ${to}`);
          this.io.to(targetSocketId).emit('offer', { from, offer, fileMetadata });
        } else {
          debug(`Target user ${to} not found`);
          socket.emit('error', { message: 'User not found or offline' });
        }
      });

      // Handle answer from a peer
      socket.on('answer', ({ to, answer }) => {
        const from = this.socketToUser.get(socket.id);
        const targetSocketId = this.connections.get(to);
        
        if (targetSocketId) {
          debug(`Forwarding answer from ${from} to ${to}`);
          this.io.to(targetSocketId).emit('answer', { from, answer });
        }
      });

      // Handle ICE candidates
      socket.on('ice-candidate', ({ to, candidate }) => {
        const from = this.socketToUser.get(socket.id);
        const targetSocketId = this.connections.get(to);
        
        if (targetSocketId) {
          this.io.to(targetSocketId).emit('ice-candidate', { from, candidate });
        }
      });

      // Handle connection cleanup
      socket.on('disconnect', () => {
        const userId = this.socketToUser.get(socket.id);
        if (userId) {
          this.connections.delete(userId);
          this.socketToUser.delete(socket.id);
          debug(`User ${userId} disconnected`);
        }
      });
    });
  }

  // Get all connected users (for debugging)
  getConnectedUsers() {
    return Array.from(this.connections.keys());
  }
}

module.exports = WebRTCSignaling;
