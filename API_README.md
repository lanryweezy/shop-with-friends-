# Shop with Friends API - Backend Server

Production-ready WebSocket server for real-time collaborative shopping sessions.

## 🚀 Features

- **Real-time WebSocket Communication** - Users can shop together in real-time
- **Session Management** - Create and join shopping sessions with unique IDs
- **Redis Backing** - Scalable session storage (with in-memory fallback)
- **WebRTC Signaling** - Ready for voice/video chat integration
- **REST API** - Easy session creation and management
- **TURN Server Config** - NAT traversal for WebRTC
- **Production Ready** - Configured for Render deployment

---

## 📦 Installation

```bash
npm install
```

## 🔧 Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings:

```env
PORT=3001
REDIS_URL=redis://localhost:6379  # Or your Redis Cloud URL
APP_URL=http://localhost:3000
TURN_SERVER_URL=turn:openrelay.metered.ca:80
TURN_USERNAME=openrelayproject
TURN_CREDENTIAL=openrelayproject
```

---

## 🏃‍♂️ Running Locally

### Start API Server Only

```bash
npm run dev:api
```

Server runs on `http://localhost:3001`

### Start Frontend + API Together

**Terminal 1** (API):
```bash
npm run dev:api
```

**Terminal 2** (Frontend):
```bash
npm run dev
```

---

## 📡 API Endpoints

### REST API

#### `POST /api/sessions/create`
Create a new shopping session

**Request:**
```json
{
  "userId": "user_123",
  "userName": "Tola",
  "metadata": {
    "storeDomain": "example.com"
  }
}
```

**Response:**
```json
{
  "sessionId": "sess_abc123xyz",
  "inviteLink": "http://localhost:3000/join/sess_abc123xyz",
  "expiresAt": 1701234567890
}
```

#### `GET /api/sessions/:sessionId`
Get session details and participants

**Response:**
```json
{
  " id": "sess_abc123xyz",
  "host": "user_123",
  "participants": [
    { "userId": "user_123", "userName": "Tola" },
    { "userId": "user_456", "userName": "Chidi" }
  ],
  "createdAt": 1701234567890,
  "expiresAt": 1701236367890
}
```

#### `GET /api/config/webrtc`
Get WebRTC ICE server configuration

**Response:**
```json
{
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    {
      "urls": "turn:openrelay.metered.ca:80",
      "username": "openrelayproject",
      "credential": "openrelayproject"
    }
  ]
}
```

#### `GET /join/:sessionId`
Invite link endpoint - redirects to app with session ID

#### `GET /health`
Health check

---

### WebSocket API

Connect to `ws://localhost:3001`

#### Client → Server Messages

**Create Session:**
```json
{
  "type": "CREATE_SESSION",
  "payload": {
    "metadata": { "storeName": "My Store" }
  }
}
```

**Join Session:**
```json
{
  "type": "JOIN_SESSION",
  "payload": {
    "sessionId": "sess_abc123xyz",
    "userName": "Chidi"
  }
}
```

**Sync Event (Navigation, Cart, Reaction, etc.):**
```json
{
  "type": "SYNC_EVENT",
  "payload": {
    "eventType": "NAVIGATE",
    "view": "DETAIL",
    "product": { "id": 1, "name": "Chair" }
  }
}
```

**WebRTC Signal:**
```json
{
  "type": "WEBRTC_SIGNAL",
  "payload": {
    "targetId": "user_456",
    "signal": { "type": "offer", "sdp": "..." }
  }
}
```

#### Server → Client Messages

**Session Created:**
```json
{
  "type": "SESSION_CREATED",
  "payload": {
    "sessionId": "sess_abc123xyz",
    "inviteLink": "...",
    "expiresAt": 1701236367890
  }
}
```

**Participant Joined:**
```json
{
  "type": "PARTICIPANT_JOINED",
  "payload": {
    "userId": "user_456",
    "userName": "Chidi"
  }
}
```

**Sync Event (from peer):**
```json
{
  "type": "SYNC_EVENT",
  "payload": {
    "eventType": "CART_UPDATE",
    "cart": [...],
    "sourceId": "user_456",
    "timestamp": 1701234567890
  }
}
```

---

## 🚢 Deployment

### Deploy to Render

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect your repository
4. Render will auto-detect `render.yaml`
5. Redis database will be created automatically
6. Set environment variables in Render dashboard:
   - `APP_URL` = your frontend URL (e.g., https://yourapp.vercel.app)
   - `CORS_ORIGINS` = comma-separated origins

Your WebSocket server will be live at `https://yourapp.onrender.com`

### Redis Setup (Production)

For production, use a managed Redis service:
- **Render Redis** (included in render.yaml)
- **Redis Cloud** (redis.com)
- **AWS ElastiCache**
- **Upstash Redis**

Update `REDIS_URL` environment variable with connection string.

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Client (Web)   │
└────────┬────────┘
         │ WebSocket
         ▼
┌───────────────────────────┐
│  Express + WebSocket      │
│  Server (server.js)       │
└───────┬───────────────────┘
        │
   ┌────┴────┐
   │         │
   ▼         ▼
┌────────┐ ┌──────────────┐
│ Redis  │ │  In-Memory   │
│ (Prod) │ │ (Dev Fallback)│
└────────┘ └──────────────┘
```

**Components:**
- `api/server.js` - Main Express + WebSocket server
- `api/sessionManager.js` - Session CRUD with Redis/in-memory
- `api/websocketHandler.js` - WebSocket message routing

---

## 🎯 Next Steps

- [ ] Build Client SDK (Phase 4)
- [ ] Complete WebRTC voice/video (Phase 3)
- [ ] Create Shopify/WooCommerce plugins (Phase 5)

---

## 📚 Documentation

See `/implementation_plan.md` for full architecture details.

---

## 🛠️ Tech Stack

- **Node.js** + **Express** - HTTP server
- **ws** - WebSocket library
- **Redis** (ioredis) - Session storage
- **nanoid** - Unique ID generation
- **Render** - Deployment platform

---

## 📝 License

MIT
