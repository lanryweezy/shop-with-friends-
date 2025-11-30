/**
 * WebSocket Handler - Routes and processes WebSocket messages
 */

export class WebSocketHandler {
    constructor(sessionManager) {
        this.sessionManager = sessionManager;
        // Map of clientId -> WebSocket connection
        this.connections = new Map();
    }

    /**
     * Handle new WebSocket connection
     */
    async handleConnection(ws, clientId) {
        console.log(`🔌 Client connected: ${clientId}`);

        // Store connection
        this.connections.set(clientId, ws);

        // Send client ID to the client
        this.send(ws, {
            type: 'CLIENT_ID',
            payload: { clientId }
        });

        // Set up message handler
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);
                await this.handleMessage(ws, clientId, data);
            } catch (error) {
                console.error('Error handling message:', error);
                this.send(ws, {
                    type: 'ERROR',
                    payload: { message: error.message }
                });
            }
        });

        // Handle disconnection
        ws.on('close', () => {
            this.handleDisconnect(clientId);
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error(`WebSocket error for ${clientId}:`, error);
        });
    }

    /**
     * Route incoming messages
     */
    async handleMessage(ws, clientId, data) {
        const { type, payload } = data;

        switch (type) {
            case 'CREATE_SESSION':
                await this.handleCreateSession(ws, clientId, payload);
                break;

            case 'JOIN_SESSION':
                await this.handleJoinSession(ws, clientId, payload);
                break;

            case 'LEAVE_SESSION':
                await this.handleLeaveSession(ws, clientId, payload);
                break;

            case 'SYNC_EVENT':
                await this.handleSyncEvent(ws, clientId, payload);
                break;

            case 'WEBRTC_SIGNAL':
                await this.handleWebRTCSignal(ws, clientId, payload);
                break;

            case 'HEARTBEAT':
                this.handleHeartbeat(ws, clientId, payload);
                break;

            default:
                this.send(ws, {
                    type: 'ERROR',
                    payload: { message: `Unknown message type: ${type}` }
                });
        }
    }

    /**
     * Create new session
     */
    async handleCreateSession(ws, clientId, payload) {
        const { metadata } = payload || {};

        const session = await this.sessionManager.createSession(clientId, metadata);

        // Store session ID on WebSocket for easy access
        ws.sessionId = session.id;
        ws.userId = clientId;

        const inviteLink = this.sessionManager.generateInviteLink(session.id);

        this.send(ws, {
            type: 'SESSION_CREATED',
            payload: {
                sessionId: session.id,
                inviteLink,
                expiresAt: session.expiresAt
            }
        });
    }

    /**
     * Join existing session
     */
    async handleJoinSession(ws, clientId, payload) {
        const { sessionId, userName } = payload;

        try {
            const session = await this.sessionManager.addParticipant(
                sessionId,
                clientId,
                userName
            );

            // Store session info on WebSocket
            ws.sessionId = sessionId;
            ws.userId = clientId;

            // Notify existing participants
            await this.broadcastToSession(sessionId, {
                type: 'PARTICIPANT_JOINED',
                payload: {
                    userId: clientId,
                    userName: userName || 'Anonymous'
                }
            }, clientId);

            // Send success to joiner
            this.send(ws, {
                type: 'SESSION_JOINED',
                payload: {
                    sessionId,
                    participants: session.participants
                }
            });

            // Refresh session TTL
            await this.sessionManager.refreshSession(sessionId);

        } catch (error) {
            this.send(ws, {
                type: 'ERROR',
                payload: { message: error.message }
            });
        }
    }

    /**
     * Leave session
     */
    async handleLeaveSession(ws, clientId, payload) {
        const { sessionId } = payload;

        await this.sessionManager.removeParticipant(sessionId, clientId);

        // Notify remaining participants
        await this.broadcastToSession(sessionId, {
            type: 'PARTICIPANT_LEFT',
            payload: { userId: clientId }
        });

        this.send(ws, {
            type: 'SESSION_LEFT',
            payload: { sessionId }
        });

        // Clear session from WebSocket
        delete ws.sessionId;
        delete ws.userId;
    }

    /**
     * Handle sync events (navigation, cart updates, reactions, etc.)
     */
    async handleSyncEvent(ws, clientId, payload) {
        const { sessionId } = ws;

        if (!sessionId) {
            this.send(ws, {
                type: 'ERROR',
                payload: { message: 'Not in a session' }
            });
            return;
        }

        // Broadcast sync event to all participants except sender
        await this.broadcastToSession(sessionId, {
            type: 'SYNC_EVENT',
            payload: {
                ...payload,
                sourceId: clientId,
                timestamp: Date.now()
            }
        }, clientId);

        // Refresh session TTL on activity
        await this.sessionManager.refreshSession(sessionId);
    }

    /**
     * Handle WebRTC signaling (for voice/video)
     */
    async handleWebRTCSignal(ws, clientId, payload) {
        const { sessionId } = ws;
        const { targetId, signal } = payload;

        if (!sessionId) {
            this.send(ws, {
                type: 'ERROR',
                payload: { message: 'Not in a session' }
            });
            return;
        }

        // Find target client's WebSocket
        const targetWs = Array.from(this.connections.entries())
            .find(([id, connection]) =>
                id === targetId && connection.sessionId === sessionId
            )?.[1];

        if (targetWs && targetWs.readyState === 1) { // OPEN
            this.send(targetWs, {
                type: 'WEBRTC_SIGNAL',
                payload: {
                    sourceId: clientId,
                    signal
                }
            });
        }
    }

    /**
     * Handle heartbeat/ping
     */
    handleHeartbeat(ws, clientId, payload) {
        this.send(ws, {
            type: 'HEARTBEAT_ACK',
            payload: { timestamp: Date.now() }
        });

        // Refresh session if in one
        if (ws.sessionId) {
            this.sessionManager.refreshSession(ws.sessionId);
        }
    }

    /**
     * Handle client disconnect
     */
    async handleDisconnect(clientId) {
        console.log(`🔌 Client disconnected: ${clientId}`);

        const ws = this.connections.get(clientId);
        if (ws?.sessionId) {
            await this.sessionManager.removeParticipant(ws.sessionId, clientId);

            // Notify remaining participants
            await this.broadcastToSession(ws.sessionId, {
                type: 'PARTICIPANT_LEFT',
                payload: { userId: clientId }
            });
        }

        this.connections.delete(clientId);
    }

    /**
     * Broadcast message to all participants in a session (except sender)
     */
    async broadcastToSession(sessionId, message, excludeClientId = null) {
        const participants = await this.sessionManager.getParticipants(sessionId);

        for (const { userId } of participants) {
            if (userId === excludeClientId) continue;

            const ws = this.connections.get(userId);
            if (ws && ws.readyState === 1) { // OPEN
                this.send(ws, message);
            }
        }
    }

    /**
     * Send message to a specific WebSocket
     */
    send(ws, message) {
        if (ws.readyState === 1) { // OPEN
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Get connection stats
     */
    getStats() {
        return {
            totalConnections: this.connections.size,
            activeConnections: Array.from(this.connections.values())
                .filter(ws => ws.readyState === 1).length
        };
    }
}

export default WebSocketHandler;
