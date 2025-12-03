import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import cors from 'cors';
import SessionManager from './sessionManager.js';
import WebSocketHandler from './websocketHandler.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Initialize managers
const sessionManager = new SessionManager();
const wsHandler = new WebSocketHandler(sessionManager);

// Middleware
app.use(express.json());

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://shop-with-friends.vercel.app',
    'https://shop-with-friends-git-main-lanryweezys-projects.vercel.app'
];
app.use(cors({
    origin: corsOrigins,
    credentials: true
}));

// ===== REST API ENDPOINTS =====

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    const stats = wsHandler.getStats();
    res.json({
        status: 'ok',
        ...stats,
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/sessions/create
 * Create a new shopping session
 * 
 * Body: {
 *   userId: string,
 *   userName?: string,
 *   metadata?: object
 * }
 */
app.post('/api/sessions/create', async (req, res) => {
    try {
        const { userId, userName, metadata } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const session = await sessionManager.createSession(userId, {
            ...metadata,
            hostName: userName
        });

        const inviteLink = sessionManager.generateInviteLink(session.id);

        res.json({
            sessionId: session.id,
            inviteLink,
            expiresAt: session.expiresAt
        });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

/**
 * GET /api/sessions/:sessionId
 * Get session details
 */
app.get('/api/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await sessionManager.getSession(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const participants = await sessionManager.getParticipants(sessionId);

        res.json({
            ...session,
            participants
        });
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ error: 'Failed to get session' });
    }
});

/**
 * GET /api/config/webrtc
 * Get WebRTC configuration (ICE servers)
 */
app.get('/api/config/webrtc', (req, res) => {
    const iceServers = [
        {
            urls: process.env.STUN_SERVER_URL || 'stun:stun.l.google.com:19302'
        }
    ];

    // Add TURN server if configured
    if (process.env.TURN_SERVER_URL) {
        iceServers.push({
            urls: process.env.TURN_SERVER_URL,
            username: process.env.TURN_USERNAME,
            credential: process.env.TURN_CREDENTIAL
        });
    }

    res.json({ iceServers });
});

/**
 * GET /join/:sessionId
 * Redirect to app with session ID
 * This is used for invite links
 */
app.get('/join/:sessionId', async (req, res) => {
    const { sessionId } = req.params;

    const session = await sessionManager.getSession(sessionId);
    if (!session) {
        return res.status(404).send('Session not found or expired');
    }

    // Redirect to app with session ID in query params
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    res.redirect(`${appUrl}?join=${sessionId}`);
});

// ===== WEBSOCKET HANDLING =====

wss.on('connection', (ws) => {
    const clientId = nanoid(16);
    wsHandler.handleConnection(ws, clientId);
});

// ===== SERVER STARTUP =====

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🛍️  Shop with Friends API Server                   ║
║                                                       ║
║   ✅ HTTP Server:       http://localhost:${PORT}       ║
║   ✅ WebSocket Server:  ws://localhost:${PORT}        ║
║   ✅ Redis:             ${process.env.REDIS_URL ? 'Connected' : 'Local'}                     ║
║   ✅ Environment:       ${process.env.NODE_ENV || 'development'}              ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server...');
    server.close(async () => {
        await sessionManager.close();
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('\nSIGINT received, closing server...');
    server.close(async () => {
        await sessionManager.close();
        process.exit(0);
    });
});

export default app;
