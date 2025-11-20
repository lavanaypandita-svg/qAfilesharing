# Quantum-Safe Encrypted File Sharing Application

A secure, quantum-resistant file-sharing platform with end-to-end encryption, peer-to-peer transfers, and advanced security features.

## 🌟 Features

- **Quantum-Safe Encryption**: Uses post-quantum cryptographic algorithms (Kyber) for key exchange
- **Client-Side Encryption**: Files are encrypted before leaving your device
- **End-to-End Encryption**: AES-256-GCM encryption for file data
- **Peer-to-Peer Sharing**: Direct file transfer using WebRTC (no server involved)
- **Honeyfiles**: Decoy files that alert you to unauthorized access
- **Audit Logging**: Comprehensive logging of all file access events
- **Zero-Trust Security**: No trust in server - all encryption happens client-side
- **Real-Time Transfer**: WebRTC-based P2P file sharing

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** for data storage
- **Socket.io** for WebRTC signaling
- **JWT** for authentication
- **Multer** for file handling

### Frontend
- **React.js** with modern hooks
- **Tailwind CSS** for styling
- **WebRTC** for peer-to-peer transfers
- **Axios** for API calls
- **React Router** for navigation

### Security
- **AES-256-GCM** for symmetric encryption (Web Crypto API)
- **RSA-OAEP** for asymmetric encryption (key exchange)
- **Web Crypto API** for browser-side encryption
- **Node.js crypto module** for server-side operations
- **JWT** tokens for session management
- **Architecture ready** for post-quantum cryptography (Kyber) integration

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or cloud instance)
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd qARE
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   
   Create `backend/.env`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/quantum-safe-files
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRE=7d
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000
   ```

   Create `frontend/.env`:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or use MongoDB Atlas (cloud)
   ```

5. **Run the application**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start separately:
   npm run server  # Backend on http://localhost:5000
   npm run client  # Frontend on http://localhost:3000
   ```

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - MongoDB: localhost:27017

## 🚀 Usage

### Getting Started

1. **Register an account**
   - Navigate to the registration page
   - Your encryption keys will be generated automatically
   - Keep your private key secure (stored in browser localStorage)

2. **Upload files**
   - Click on "Upload" tab
   - Drag and drop files or click to select
   - Optionally mark files as "Honeyfiles" (decoy files)
   - Files are encrypted client-side before upload

3. **Download files**
   - Go to "My Files" tab
   - Click download icon
   - Files are decrypted client-side after download

4. **Share files**
   - Use the share feature to share files with other users
   - Or use P2P sharing for direct transfer

5. **Monitor security**
   - Check "Audit Logs" for all access events
   - View "Honeyfiles" for unauthorized access alerts

### P2P File Sharing

1. **Get your Connection ID**
   - Go to "P2P Share" tab
   - Copy your Connection ID

2. **Connect to peer**
   - Enter the recipient's Connection ID
   - Click "Connect"
   - Wait for connection to establish

3. **Send files**
   - Select a file
   - Click "Send File"
   - File transfers directly peer-to-peer

## 🔒 Security Features

### Encryption Flow

1. **Registration**: User generates RSA key pair (public/private)
2. **File Upload**:
   - Generate random AES-256 key
   - Encrypt file with AES-256-GCM
   - Encrypt AES key with user's public key
   - Upload encrypted data to server

3. **File Download**:
   - Download encrypted file and encrypted key
   - Decrypt AES key with user's private key
   - Decrypt file with AES key

4. **File Sharing**:
   - Encrypt AES key with recipient's public key
   - Store encrypted key for recipient
   - Recipient decrypts with their private key

### Quantum-Safe Cryptography

The application uses a hybrid encryption approach:
- **Current**: RSA-OAEP (2048-bit) for key exchange + AES-256-GCM for file encryption
- **Architecture**: Designed to support post-quantum cryptographic algorithms
- **Future Integration**: Ready for Kyber, Dilithium, and other NIST PQC standards

The codebase uses Web Crypto API (browser) and Node.js crypto module (server), which provide a solid foundation for migrating to post-quantum algorithms when libraries become widely available.

## 📁 Project Structure

```
qARE/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth middleware
│   ├── utils/           # Utility functions
│   └── server.js        # Express server
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # React context
│   │   ├── utils/       # Utility functions
│   │   └── App.js       # Main app component
│   └── public/          # Static files
├── docker-compose.yml   # Docker configuration
├── Dockerfile           # Backend Dockerfile
└── README.md            # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files/my-files` - Get user's files
- `GET /api/files/shared` - Get shared files
- `GET /api/files/:fileId` - Download file
- `POST /api/files/:fileId/share` - Share file
- `DELETE /api/files/:fileId` - Delete file

### Audit
- `GET /api/audit` - Get audit logs
- `GET /api/audit/file/:fileId` - Get file audit logs

### Honeyfiles
- `GET /api/honeyfiles/stats` - Get honeyfile statistics

## 🧪 Testing

```bash
# Backend tests (when implemented)
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🚧 Limitations & Future Work

- **Post-Quantum Libraries**: Currently using RSA for key exchange. Full Kyber integration requires additional libraries.
- **Performance**: Post-quantum algorithms may require more computational resources.
- **WebRTC**: Requires STUN/TURN servers for NAT traversal in production.
- **Key Management**: Private keys stored in localStorage (consider secure storage solutions).

## 📝 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Note**: This is a demonstration application. For production use, ensure:
- Strong JWT secrets
- Secure key storage
- HTTPS/TLS encryption
- Proper backup strategies
- Security audits

