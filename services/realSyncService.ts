import { SyncEvent } from '../types';

/**
 * REAL-TIME SYNC ENGINE
 * =====================
 * 
 * This service implements the client-side connection to the Shop with Friends API.
 * It replaces the BroadcastChannel-based demo implementation with real WebSocket connections.
 */

class RealSyncEngine {
    private listeners: ((event: SyncEvent) => void)[] = [];
    private socket: WebSocket | null = null;
    private clientId: string | null = null;
    private sessionId: string | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;

    constructor() {
        // Auto-connect on instantiation if needed, or wait for explicit connect
        // For now, we'll connect immediately to be ready
        this.connect();
    }

    private connect() {
        // In production, this should be configurable via environment variables
        // Using localhost:3001 as default for the local server we just created
        const wsUrl = 'ws://localhost:3001';

        try {
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('Connected to Shop with Friends API');
                this.reconnectAttempts = 0;
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.socket.onclose = () => {
                console.log('Disconnected from Shop with Friends API');
                this.handleDisconnect();
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.handleDisconnect();
        }
    }

    private handleMessage(data: any) {
        switch (data.type) {
            case 'CLIENT_ID':
                this.clientId = data.payload.clientId;
                break;

            case 'SESSION_CREATED':
                this.sessionId = data.payload.sessionId;
                // Notify listeners that session was created
                this.notify({
                    type: 'SESSION_CREATED',
                    payload: data.payload,
                    sourceId: 'system',
                    timestamp: Date.now()
                } as any);
                break;

            case 'SESSION_JOINED':
                this.sessionId = data.payload.sessionId;
                break;

            default:
                // This is a sync event from another user
                if (data.type && data.sourceId !== this.clientId) {
                    this.notify(data);
                }
        }
    }

    private handleDisconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            // Exponential backoff
            const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
            setTimeout(() => this.connect(), delay);
        } else {
            console.error('Max reconnect attempts reached. Please refresh the page.');
        }
    }

    /**
     * Create a new shopping session
     */
    public async createSession(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                // If not connected, try to connect first (or reject)
                // For now, reject to keep it simple
                reject(new Error('Not connected to server'));
                return;
            }

            const createMessage = {
                type: 'CREATE_SESSION',
                payload: {}
            };

            this.socket.send(JSON.stringify(createMessage));

            // Wait for session creation response
            const handler = (event: SyncEvent) => {
                // @ts-ignore - SESSION_CREATED is a system event
                if (event.type === 'SESSION_CREATED') {
                    this.unsubscribe(handler);
                    // @ts-ignore
                    resolve(event.payload.sessionId);
                }
            };

            this.subscribe(handler);
        });
    }

    /**
     * Join an existing shopping session
     */
    public async joinSession(sessionId: string): Promise<void> {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            throw new Error('Not connected to server');
        }

        const joinMessage = {
            type: 'JOIN_SESSION',
            payload: { sessionId }
        };

        this.socket.send(JSON.stringify(joinMessage));
    }

    /**
     * Transmit a reflex signal to the other organ (peer).
     * 
     * @param event The SyncEvent to broadcast.
     */
    public send(event: SyncEvent) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('Not connected to server, message not sent');
            return;
        }

        const syncMessage = {
            type: 'SYNC_EVENT',
            payload: event
        };

        this.socket.send(JSON.stringify(syncMessage));
    }

    /**
     * Connect the nervous system.
     * Registers a callback to be fired whenever a sync pulse is received.
     * 
     * @param callback Function to handle incoming events from peers
     * @returns Unsubscribe function to clean up listeners
     */
    public subscribe(callback: (event: SyncEvent) => void) {
        this.listeners.push(callback);
        return () => {
            this.unsubscribe(callback);
        };
    }

    private unsubscribe(callback: (event: SyncEvent) => void) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    /**
     * Internal distribution of events to all registered listeners.
     * Wraps callbacks in try-catch to ensure one failure doesn't break the loop
     * for other components.
     */
    private notify(event: SyncEvent) {
        this.listeners.forEach(l => {
            try {
                l(event);
            } catch (e) {
                console.error("Sync listener error:", e);
            }
        });
    }

    /**
     * Get the current client ID
     */
    public getClientId(): string | null {
        return this.clientId;
    }

    /**
     * Get the current session ID
     */
    public getSessionId(): string | null {
        return this.sessionId;
    }

    /**
     * Check if connected to a session
     */
    public isConnected(): boolean {
        return !!this.sessionId;
    }
}

// Export a singleton instance to ensure all components share the same connection.
export const realSyncEngine = new RealSyncEngine();
