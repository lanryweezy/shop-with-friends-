import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// In-memory storage for sessions (in production, use Redis or database)
const sessions = new Map();

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('New client connected');

    // Generate a unique client ID
    const clientId = uuidv4();

    // Send client ID to the newly connected client
    ws.send(JSON.stringify({
        type: 'CLIENT_ID',
        payload: { clientId }
    }));

    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'CREATE_SESSION':
                    handleCreateSession(ws, clientId, data);
                    break;

                case 'JOIN_SESSION':
                    handleJoinSession(ws, clientId, data);
                    break;

                case 'SYNC_EVENT':
                    handleSyncEvent(ws, clientId, data);
                    break;

                case 'SIGNAL':
                    handleSignal(ws, clientId, data);
                    break;

                default:
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        payload: { message: 'Unknown message type' }
                    }));
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Invalid message format' }
            }));
        }
    });

    // Handle client disconnect
    ws.on('close', () => {
        handleClientDisconnect(clientId);
    });
});

// Handle session creation
function handleCreateSession(ws, clientId, data) {
    const sessionId = uuidv4().substring(0, 5).toUpperCase(); // Short session ID like "5g7X9"

    // Create new session
    const session = {
        id: sessionId,
        host: clientId,
        participants: new Map([[clientId, ws]]),
        createdAt: Date.now()
    };

    sessions.set(sessionId, session);

    // Store session info on the WebSocket for easy access
    ws.sessionId = sessionId;
    ws.clientId = clientId;

    // Send session info back to creator
    ws.send(JSON.stringify({
        type: 'SESSION_CREATED',
        payload: {
            sessionId,
            joinLink: `/join/${sessionId}`
        }
    }));

    console.log(`Session ${sessionId} created by ${clientId}`);
}

// Handle joining a session
function handleJoinSession(ws, clientId, data) {
    const { sessionId } = data.payload;

    const session = sessions.get(sessionId);
    if (!session) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            payload: { message: 'Session not found' }
        }));
        return;
    }

    // Add participant to session
    session.participants.set(clientId, ws);

    // Store session info on the WebSocket
    ws.sessionId = sessionId;
    ws.clientId = clientId;

    // Notify all participants about the new user
    const joinEvent = {
        type: 'JOINED',
        payload: {},
        sourceId: clientId,
        timestamp: Date.now()
    };

    broadcastToSession(sessionId, joinEvent, clientId);

    // Send success message to joiner
    ws.send(JSON.stringify({
        type: 'SESSION_JOINED',
        payload: { sessionId }
    }));

    console.log(`Client ${clientId} joined session ${sessionId}`);
}

// Handle sync events
function handleSyncEvent(ws, clientId, data) {
    const { sessionId } = ws;

    if (!sessionId) {
        ws.send(JSON.stringify({
            type: 'ERROR',
            payload: { message: 'Not in a session' }
        }));
        return;
    }

    // Add source ID and timestamp to the event
    const event = {
        ...data.payload,
        sourceId: clientId,
        timestamp: Date.now()
    };

    // Broadcast to all other participants in the session
    broadcastToSession(sessionId, event, clientId);
}

// Handle WebRTC signaling
function handleSignal(ws, clientId, data) {
    const { sessionId } = ws;
    if (!sessionId) return;

    const payload = data.payload;
    const targetId = payload.targetId;

    // Add sourceId so the receiver knows who sent it
    const signalMessage = {
        type: 'SIGNAL',
        payload: {
            ...payload,
            sourceId: clientId
        }
    };

    if (targetId) {
        // Direct message to specific client
        const session = sessions.get(sessionId);
        if (session) {
            const targetWs = session.participants.get(targetId);
            if (targetWs && targetWs.readyState === targetWs.OPEN) {
                targetWs.send(JSON.stringify(signalMessage));
            }
        }
    } else {
        // Broadcast to all (except sender)
        broadcastToSession(sessionId, signalMessage, clientId);
    }
}

// Broadcast message to all participants in a session except sender
function broadcastToSession(sessionId, message, senderId) {
    const session = sessions.get(sessionId);
    if (!session) return;

    const messageString = JSON.stringify(message);

    for (const [clientId, ws] of session.participants) {
        if (clientId !== senderId && ws.readyState === ws.OPEN) {
            try {
                ws.send(messageString);
            } catch (error) {
                console.error(`Error sending message to ${clientId}:`, error);
            }
        }
    }
}

// Handle client disconnect
function handleClientDisconnect(clientId) {
    console.log(`Client ${clientId} disconnected`);

    // Find sessions where this client is a participant
    for (const [sessionId, session] of sessions) {
        if (session.participants.has(clientId)) {
            // Remove client from session
            session.participants.delete(clientId);

            // If session is now empty, clean it up
            if (session.participants.size === 0) {
                sessions.delete(sessionId);
                console.log(`Session ${sessionId} deleted (no participants)`);
            } else {
                // Notify remaining participants that someone left
                const leaveEvent = {
                    type: 'USER_LEFT',
                    payload: { userId: clientId },
                    sourceId: 'system',
                    timestamp: Date.now()
                };

                broadcastToSession(sessionId, leaveEvent);
            }
            break;
        }
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', sessions: sessions.size });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Shop with Friends API server running on port ${PORT}`);
});
