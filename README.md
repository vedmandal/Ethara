# 💬 Pulse Chat — Full-Stack Real-Time Messaging App

A production-ready WhatsApp-inspired messaging application built with React, Node.js, Socket.IO, and MongoDB.

---

## 📋 Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Quick Start](#quick-start)
5. [Environment Variables](#environment-variables)
6. [API Documentation](#api-documentation)
7. [Socket.IO Events](#socketio-events)
8. [Deployment Guide](#deployment-guide)
9. [Troubleshooting](#troubleshooting)

---

## ✨ Features

### Authentication
- Signup / Login with JWT sessions
- Email OTP verification (6-digit code, 10-min expiry)
- Forgot / Reset password via OTP
- Bcrypt password hashing (cost factor 12)
- Secure token storage, auto-logout on expiry

### Messaging
- One-to-one and group chats
- Real-time messaging via Socket.IO
- Message status: **Sent → Delivered → Seen** (double ticks)
- Typing indicators with debounce
- Online / offline presence + Last seen timestamp
- Pagination (load older messages on scroll)

### Media
- Send images, videos, audio, documents
- Local storage (default) or Cloudinary
- In-app image lightbox viewer
- Audio/voice message player with waveform
- Video player in-bubble

### Voice Messages
- Browser MediaRecorder API
- Record, preview, discard, send
- Playback with simulated waveform and timer

### Group Chats
- Create groups (min 2 participants)
- Add / remove members
- Admin roles (promote / demote)
- System messages (joined, left, added, removed)
- Group info panel

### Message Actions
- Reply to message (quoted preview)
- Edit text messages
- Delete for me / Delete for everyone
- Emoji reactions (6 quick emojis)
- Message search across chats

### UI/UX
- WhatsApp-inspired layout (sidebar + chat window + profile panel)
- **Dark mode** toggle (persisted to localStorage)
- Responsive design (mobile-friendly)
- Notification toast with sound on new messages
- Date dividers in message list
- Smooth animations throughout

### Video / Audio Calls (WebRTC)
- Peer-to-peer via WebRTC + Socket.IO signaling
- STUN servers (Google, no backend needed)
- Accept / Reject incoming calls
- Toggle mute and camera during call
- Call duration timer

### Security
- JWT authentication on all protected routes
- Rate limiting (100 req / 15 min globally, 10 on auth)
- Helmet.js security headers
- Input validation (express-validator)
- CORS configured for your frontend URL

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Context API |
| Real-time | Socket.IO (client + server) |
| Backend | Node.js 18+, Express 4 |
| Database | MongoDB 6+, Mongoose 8 |
| Auth | JWT, bcryptjs, OTP via Nodemailer |
| File Storage | Multer (local) / Cloudinary (optional) |
| Calls | WebRTC (RTCPeerConnection + Socket.IO signaling) |
| Styling | Pure CSS with CSS variables (no framework) |

---

## 📁 Project Structure

```
pulse-chat/
├── backend/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   └── cloudinary.js        # Multer + Cloudinary setup
│   ├── controllers/
│   │   ├── authController.js    # Register, login, OTP, reset
│   │   ├── chatController.js    # CRUD chats and groups
│   │   ├── messageController.js # Send, edit, delete, search
│   │   ├── uploadController.js  # File uploads
│   │   └── userController.js    # Profile, search, block
│   ├── middleware/
│   │   ├── auth.js              # JWT protect middleware
│   │   ├── errorHandler.js      # Global error handler
│   │   └── rateLimiter.js       # Express rate limit
│   ├── models/
│   │   ├── User.js              # User schema
│   │   ├── Chat.js              # Chat / Group schema
│   │   └── Message.js           # Message schema
│   ├── routes/
│   │   ├── auth.js
│   │   ├── chats.js
│   │   ├── groups.js
│   │   ├── messages.js
│   │   ├── uploads.js
│   │   └── users.js
│   ├── services/
│   │   ├── emailService.js      # Nodemailer OTP emails
│   │   └── socketService.js     # All Socket.IO event logic
│   ├── uploads/                 # Local file storage (gitignored)
│   ├── .env.sample
│   ├── package.json
│   └── server.js                # Entry point
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── components/
        │   ├── chat/
        │   │   ├── CallOverlay.jsx        # WebRTC call UI
        │   │   ├── ChatWindow.jsx         # Main chat view
        │   │   ├── MessageBubble.jsx      # Individual messages
        │   │   ├── MessageInput.jsx       # Input + voice + upload
        │   │   ├── ProfilePanel.jsx       # Contact/group info
        │   │   ├── ProfileSettingsModal.jsx
        │   │   └── Sidebar.jsx            # Chat list + search
        │   ├── group/
        │   │   └── NewGroupModal.jsx
        │   └── shared/
        │       ├── Avatar.jsx
        │       ├── Dropdown.jsx
        │       ├── IconBtn.jsx
        │       ├── LoadingScreen.jsx
        │       ├── Modal.jsx
        │       └── NotificationToast.jsx
        ├── context/
        │   ├── AuthContext.jsx    # Auth state + JWT
        │   ├── ChatContext.jsx    # Chats, messages, socket events
        │   └── ThemeContext.jsx   # Dark/light mode
        ├── hooks/
        │   ├── useTyping.js       # Typing emit with debounce
        │   ├── useVoiceRecorder.js # MediaRecorder for voice
        │   └── useWebRTC.js       # Peer connection + signaling
        ├── pages/
        │   ├── ChatPage.jsx
        │   ├── ForgotPasswordPage.jsx
        │   ├── LoginPage.jsx
        │   ├── OTPPage.jsx
        │   └── RegisterPage.jsx
        ├── services/
        │   ├── api.js             # Axios instance + all endpoints
        │   └── socket.js          # Socket.IO singleton
        ├── utils/
        │   └── helpers.js         # Dates, formatting, chat helpers
        ├── App.jsx
        ├── index.css              # Full design system
        └── index.js
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or higher — [nodejs.org](https://nodejs.org)
- **MongoDB** 6+ running locally, or a free [MongoDB Atlas](https://cloud.mongodb.com) cluster
- **Git**
- **npm** or **yarn**

---

### Step 1 — Clone / Copy the Project

```bash
# If using git
git clone https://github.com/yourname/pulse-chat.git
cd pulse-chat

# Or just navigate to where you placed the files
cd pulse-chat
```

---

### Step 2 — Set Up the Backend

```bash
cd backend

# Install dependencies
npm install

# Copy the sample env file
cp .env.sample .env
```

Now open `backend/.env` and fill in your values (see [Environment Variables](#environment-variables) section).

**Minimum required for local development:**

```env
MONGO_URI=mongodb://localhost:27017/pulsechat
JWT_SECRET=any_long_random_string_here
CLIENT_URL=http://localhost:3000
```

> **Note:** If you don't configure `EMAIL_*` variables, OTP codes will be printed directly to the terminal console in development mode — no email service needed to test locally.

Start the backend:

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

You should see:
```
🚀 Pulse Chat server running on port 5000
📡 Socket.IO ready
✅ MongoDB connected: localhost
```

---

### Step 3 — Set Up the Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Copy the sample env file
cp .env.sample .env
```

The default frontend `.env` already points to `localhost:5000`, so no changes needed for local development.

Start the frontend:

```bash
npm start
```

The app opens at **http://localhost:3000**.

---

### Step 4 — First Use

1. Go to `http://localhost:3000/register`
2. Fill in username, email, and password
3. Check the **backend terminal** for the OTP code (dev mode prints it there)
4. Enter the 6-digit OTP on the verification screen
5. You're in! Open a second browser (or incognito) to test messaging between two accounts

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | `development` or `production` |
| `MONGO_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Secret for signing JWTs (use a long random string) |
| `JWT_EXPIRES_IN` | No | Token lifetime (default: `7d`) |
| `CLIENT_URL` | **Yes** | Frontend URL for CORS (e.g. `http://localhost:3000`) |
| `EMAIL_HOST` | No | SMTP host (e.g. `smtp.gmail.com`) |
| `EMAIL_PORT` | No | SMTP port (e.g. `587`) |
| `EMAIL_USER` | No | SMTP username / email address |
| `EMAIL_PASS` | No | SMTP password (Gmail: use App Password) |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name (for cloud file storage) |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret |
| `MAX_FILE_SIZE` | No | Max upload size in bytes (default: 10485760 = 10MB) |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: 900000 = 15 min) |
| `RATE_LIMIT_MAX` | No | Max requests per window (default: 100) |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `REACT_APP_API_URL` | Backend API base URL (default: `http://localhost:5000/api`) |
| `REACT_APP_SOCKET_URL` | Backend socket URL (default: `http://localhost:5000`) |

---

### Gmail App Password Setup (for real OTP emails)

1. Enable 2-Factor Authentication on your Google account
2. Go to **Google Account → Security → App Passwords**
3. Create an App Password for "Mail"
4. Use that 16-character password as `EMAIL_PASS`

---

## 📖 API Documentation

**Base URL:** `http://localhost:5000/api`

All protected routes require the header:
```
Authorization: Bearer <your_jwt_token>
```

---

### 🔑 Auth Routes

#### `POST /auth/register`
Create a new account. Sends OTP to email.

**Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secret123",
  "displayName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful! Please verify your email.",
  "userId": "64abc123..."
}
```

---

#### `POST /auth/verify-otp`
Verify OTP and receive JWT token.

**Body:**
```json
{
  "userId": "64abc123...",
  "otp": "483920"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": { "_id": "...", "username": "john_doe", "email": "john@example.com", ... }
}
```

---

#### `POST /auth/resend-otp`
**Body:** `{ "userId": "64abc123..." }`

---

#### `POST /auth/login`
**Body:** `{ "email": "john@example.com", "password": "secret123" }`

**Response:** Same as verify-otp (token + user object)

---

#### `GET /auth/me` 🔒
Returns the current authenticated user.

---

#### `POST /auth/logout` 🔒
Marks user offline and clears socket ID.

---

#### `POST /auth/forgot-password`
**Body:** `{ "email": "john@example.com" }`

---

#### `POST /auth/reset-password`
**Body:** `{ "userId": "...", "otp": "123456", "newPassword": "newpass123" }`

---

### 👤 User Routes (all protected 🔒)

#### `GET /users/search?q=john`
Search users by username, display name, or email.

**Response:**
```json
{
  "success": true,
  "users": [
    { "_id": "...", "username": "john_doe", "displayName": "John Doe", "avatar": "", "isOnline": true, "about": "..." }
  ]
}
```

---

#### `GET /users/:userId`
Get a user's public profile.

---

#### `PATCH /users/profile` 🔒
Update your own profile.

**Body (all optional):**
```json
{
  "displayName": "John D.",
  "about": "Hello world",
  "avatar": "https://...",
  "phone": "+1 234 567 890"
}
```

---

#### `PATCH /users/change-password` 🔒
**Body:** `{ "currentPassword": "old", "newPassword": "new123" }`

---

#### `PATCH /users/block/:userId` 🔒
Toggle block/unblock a user.

---

### 💬 Chat Routes (all protected 🔒)

#### `POST /chats/access`
Access or create a 1-to-1 chat.

**Body:** `{ "userId": "64abc..." }`

---

#### `GET /chats`
Get all your chats, sorted by last message time.

**Response:**
```json
{
  "success": true,
  "chats": [
    {
      "_id": "...",
      "isGroup": false,
      "participants": [...],
      "lastMessage": { "content": "Hey!", "sender": {...}, ... },
      "updatedAt": "..."
    }
  ]
}
```

---

#### `GET /chats/:chatId`
Get single chat with full details.

---

#### `POST /chats/group`
Create a group chat.

**Body:**
```json
{
  "name": "Dev Team",
  "participants": ["userId1", "userId2", "userId3"],
  "description": "Our dev group"
}
```

---

#### `PATCH /chats/group/add`
Add member to group. (Admin only)

**Body:** `{ "chatId": "...", "userId": "..." }`

---

#### `PATCH /chats/group/remove`
Remove member from group. Admins can remove others; anyone can remove themselves (leave).

**Body:** `{ "chatId": "...", "userId": "..." }`

---

#### `PATCH /chats/group/admin`
Promote or demote a group admin. (Owner only)

**Body:** `{ "chatId": "...", "userId": "..." }`

---

#### `PATCH /chats/:chatId`
Update group name, description, or avatar. (Admin only)

**Body (all optional):** `{ "chatName": "...", "groupDescription": "...", "groupAvatar": "..." }`

---

#### `DELETE /chats/:chatId`
Delete a chat (group owner only for groups).

---

### ✉️ Message Routes (all protected 🔒)

#### `GET /messages/:chatId?page=1&limit=50`
Get paginated messages for a chat, newest first.

**Response:**
```json
{
  "success": true,
  "messages": [...],
  "pagination": { "page": 1, "limit": 50, "total": 142, "pages": 3 }
}
```

---

#### `POST /messages`
Send a message.

**Body:**
```json
{
  "chatId": "64abc...",
  "content": "Hello there!",
  "messageType": "text",
  "replyTo": "64msg...",
  "media": {
    "url": "https://...",
    "type": "image",
    "name": "photo.jpg",
    "size": 204800
  }
}
```

`messageType` options: `text | image | video | audio | voice | document`

---

#### `PATCH /messages/:messageId`
Edit a text message (sender only).

**Body:** `{ "content": "Updated text" }`

---

#### `DELETE /messages/:messageId`
Delete a message.

**Body:** `{ "deleteFor": "me" }` or `{ "deleteFor": "everyone" }`

---

#### `PATCH /messages/seen/:chatId`
Mark all messages in a chat as seen.

---

#### `GET /messages/search?q=hello&chatId=optional`
Search messages by content.

---

#### `PATCH /messages/:messageId/reaction`
Add or toggle an emoji reaction.

**Body:** `{ "emoji": "❤️" }` — send empty `""` to remove.

---

### 📤 Upload Routes (all protected 🔒)

#### `POST /uploads/file`
Upload a media file (multipart/form-data).

**Form field:** `file`

**Response:**
```json
{
  "success": true,
  "url": "http://localhost:5000/uploads/1234567890.jpg",
  "type": "image",
  "name": "photo.jpg",
  "size": 204800
}
```

---

#### `POST /uploads/avatar`
Upload a profile avatar.

**Form field:** `avatar`

**Response:** `{ "success": true, "url": "..." }`

---

## 📡 Socket.IO Events

### Client → Server (emit)

| Event | Payload | Description |
|---|---|---|
| `chat:join` | `chatId` | Join a chat room |
| `chat:leave` | `chatId` | Leave a chat room |
| `message:send` | `{ chatId, content, messageType, media?, replyTo? }` | Send message via socket |
| `typing:start` | `{ chatId }` | User started typing |
| `typing:stop` | `{ chatId }` | User stopped typing |
| `messages:read` | `{ chatId }` | Mark messages as read |
| `call:offer` | `{ chatId, offer, callType }` | Initiate a WebRTC call |
| `call:answer` | `{ chatId, answer }` | Accept a call |
| `call:ice-candidate` | `{ chatId, candidate }` | Exchange ICE candidates |
| `call:end` | `{ chatId }` | End call |
| `call:reject` | `{ chatId }` | Reject incoming call |

### Server → Client (listen)

| Event | Payload | Description |
|---|---|---|
| `message:new` | Full message object | New message in any joined chat |
| `message:edited` | Updated message object | A message was edited |
| `message:deleted` | `{ messageId, chatId, deleteFor }` | A message was deleted for everyone |
| `message:delivered` | `{ messageId, chatId }` | Message delivered to recipient |
| `message:reaction` | `{ messageId, reactions }` | Reaction added/removed |
| `messages:seen` | `{ chatId, seenBy }` | Messages read by a participant |
| `typing:start` | `{ chatId, userId, username }` | Someone started typing |
| `typing:stop` | `{ chatId, userId }` | Someone stopped typing |
| `user:online` | `{ userId, isOnline }` | User came online |
| `user:offline` | `{ userId, lastSeen }` | User went offline |
| `chat:updated` | `{ chatId, lastMessage }` | Chat updated (e.g. new message from other user's perspective) |
| `call:incoming` | `{ from, fromUser, offer, callType, chatId }` | Incoming call |
| `call:answered` | `{ from, answer }` | Call was answered |
| `call:ice-candidate` | `{ from, candidate }` | ICE candidate from peer |
| `call:ended` | `{ from }` | Call ended by peer |
| `call:rejected` | `{ from }` | Call rejected by peer |

### Socket Authentication
All socket connections must authenticate with a JWT token:

```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'your_jwt_token' }
});
```

---

## 🌐 Deployment Guide

### Option A — Render (Recommended, Free Tier Available)

#### Deploy Backend on Render

1. Push your code to a GitHub repository
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Root directory:** `backend`
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
5. Add Environment Variables (from your `.env`):
   - `NODE_ENV=production`
   - `MONGO_URI=<your Atlas URI>`
   - `JWT_SECRET=<strong secret>`
   - `CLIENT_URL=<your Vercel frontend URL>`
   - All email / Cloudinary variables
6. Click **Create Web Service**

#### Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Configure:
   - **Root directory:** `frontend`
   - **Framework Preset:** Create React App
4. Add Environment Variables:
   - `REACT_APP_API_URL=https://your-render-service.onrender.com/api`
   - `REACT_APP_SOCKET_URL=https://your-render-service.onrender.com`
5. Click **Deploy**

---

### Option B — Railway (Simple Full-Stack)

1. Install Railway CLI: `npm i -g @railway/cli`
2. `railway login`
3. In `backend/`: `railway up`
4. Add environment variables in Railway dashboard
5. For frontend, use Vercel (same as above)

---

### Option C — VPS (DigitalOcean / AWS / Linode)

```bash
# On your server (Ubuntu 22.04)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Clone your repo
git clone https://github.com/yourname/pulse-chat.git
cd pulse-chat/backend
npm install
cp .env.sample .env
# Edit .env with production values
nano .env

# Start with PM2
pm2 start server.js --name pulse-chat-api
pm2 startup
pm2 save

# For frontend, build and serve
cd ../frontend
npm install
npm run build
# Serve with nginx or pm2-serve
```

**Nginx config example:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (static files)
    root /home/ubuntu/pulse-chat/frontend/build;
    index index.html;
    try_files $uri $uri/ /index.html;

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO proxy
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

---

### MongoDB Atlas Setup (Free Cloud Database)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free cluster (M0)
3. Click **Connect → Drivers**
4. Copy the connection string:
   ```
   mongodb+srv://username:password@cluster0.abc123.mongodb.net/pulsechat
   ```
5. Set this as `MONGO_URI` in your backend env

---

## 🔧 Troubleshooting

### "Cannot connect to MongoDB"
- Make sure MongoDB is running: `sudo systemctl start mongod`
- Check the `MONGO_URI` in your `.env`
- For Atlas: make sure your IP is whitelisted in Network Access

### "Socket.IO not connecting"
- Confirm `REACT_APP_SOCKET_URL` points to the backend
- Check `CLIENT_URL` in backend `.env` matches your frontend URL exactly (no trailing slash)
- CORS errors? Make sure both URLs are correct

### "OTP not arriving"
- In development: check the backend terminal — OTP is printed there
- In production: verify `EMAIL_USER` and `EMAIL_PASS` (use Gmail App Password, not your regular password)
- Check spam folder

### "File upload not working"
- Make sure the `uploads/` directory exists: `mkdir -p backend/uploads`
- For Cloudinary: verify all three credentials are set
- Check file size limit (`MAX_FILE_SIZE` in `.env`)

### "Voice recording not working"
- Must be on HTTPS in production (browsers block microphone on HTTP)
- User must grant microphone permission
- Supported in Chrome, Firefox, Safari 14.1+

### "Video calls not connecting"
- WebRTC requires HTTPS in production
- The STUN servers (Google) handle NAT traversal for most connections
- For enterprise firewalls you may need a TURN server ([coturn](https://github.com/coturn/coturn))

### Port conflicts
```bash
# Find what's using port 5000
lsof -i :5000
kill -9 <PID>
```

---

## 🔒 Security Notes

- Change `JWT_SECRET` to a long random string in production (32+ characters)
- Never commit `.env` to git — it's already in `.gitignore`
- Use HTTPS in production for WebRTC and secure cookies
- Consider adding refresh tokens for long-lived sessions
- Rate limits are conservative by default — adjust for your traffic

---

## 📦 Adding Real Push Notifications (Optional)

To add browser push notifications:

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Add to backend `.env`
3. Install: `npm install web-push`
4. Register service worker in frontend
5. Subscribe users and store in `User.fcmToken`

---

## 📝 License

MIT — free to use, modify, and deploy.

---

Built with ❤️ using React, Node.js, Socket.IO and MongoDB.
