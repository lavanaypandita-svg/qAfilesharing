# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- MongoDB running (local or cloud)
- npm or yarn

## Installation Steps

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Set Up Environment Variables

**Backend** (`backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/quantum-safe-files
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

**Frontend** (`frontend/.env`):
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 3. Start MongoDB

**Local MongoDB:**
```bash
mongod
```

**Or use MongoDB Atlas (Cloud):**
- Create account at https://www.mongodb.com/cloud/atlas
- Get connection string
- Update `MONGODB_URI` in `backend/.env`

### 4. Run the Application

**Option 1: Run both together (recommended)**
```bash
# From root directory
npm run dev
```

**Option 2: Run separately**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api

## First Time Setup

1. **Register an Account**
   - Go to http://localhost:3000
   - Click "Register here"
   - Fill in username, email, and password
   - Your encryption keys will be generated automatically

2. **Upload a File**
   - Click "Upload" tab
   - Drag and drop a file or click to select
   - Optionally mark as "Honeyfile"
   - File is encrypted before upload

3. **Download a File**
   - Go to "My Files" tab
   - Click download icon
   - File is decrypted after download

## Docker Quick Start

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check `MONGODB_URI` in `backend/.env`
- For local MongoDB: `mongodb://localhost:27017/quantum-safe-files`

### Port Already in Use
- Change `PORT` in `backend/.env`
- Update `REACT_APP_API_URL` in `frontend/.env` accordingly

### CORS Errors
- Ensure `CLIENT_URL` in backend matches frontend URL
- Check that both servers are running

### Encryption Errors
- Clear browser localStorage and re-register
- Ensure JavaScript crypto APIs are available (HTTPS in production)

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the API endpoints
- Customize security settings
- Deploy to production (see README for production considerations)

