/**
 * WebSocket Client
 * Manages WebSocket connection with auto-reconnect
 */

import { EventEmitter } from './events.js';

export class WebSocketClient {
    private url: string;
    private ws: WebSocket | null = null;
    private events: EventEmitter;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private isConnecting = false;
    private clientIdPromise: Promise<string> | null = null;
    private clientIdResolve: ((id: string) => void) | null = null;

    constructor(url: string, events: EventEmitter) {
        this.url = url;
        this.events = events;
    }

    /**
     * Connect to WebSocket server
     */
    async connect(): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('Already connected');
            return;
        }

        if (this.isConnecting) {
            console.log('Connection already in progress');
            return;
        }

        this.isConnecting = true;

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);

                this.ws.onopen = () => {
                    console.log('✅ Connected to Shop with Friends server');
                    this.reconnectAttempts = 0;
                    this.isConnecting = false;
                    this.events.emit('ws:connected');
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.events.emit('ws:error', error);
                    this.isConnecting = false;
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('Disconnected from server');
                    this.events.emit('ws:disconnected');
                    this.isConnecting = false;
                    this.attemptReconnect();
                };
            } catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });
    }

    /**
     * Wait for CLIENT_ID message from server
     */
    waitForClientId(): Promise<string> {
        if (!this.clientIdPromise) {
            this.clientIdPromise = new Promise((resolve) => {
                this.clientIdResolve = resolve;
            });
        }
        return this.clientIdPromise;
    }

    /**
     * Send message to server
     */
    send(message: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not connected. Message not sent:', message);
            return;
        }

        this.ws.send(JSON.stringify(message));
    }

    /**
     * Disconnect from server
     */
    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    // Private methods

    private handleMessage(data: string): void {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'CLIENT_ID':
                    if (this.clientIdResolve) {
                        this.clientIdResolve(message.payload.clientId);
                    }
                    break;

                case 'SESSION_CREATED':
                    this.events.emit('ws:sessionCreated', message.payload);
                    break;

                case 'SESSION_JOINED':
                    this.events.emit('ws:sessionJoined', message.payload);
                    break;

                case 'SESSION_LEFT':
                    this.events.emit('ws:sessionLeft', message.payload);
                    break;

                case 'PARTICIPANT_JOINED':
                    this.events.emit('ws:participantJoined', message.payload);
                    break;

                case 'PARTICIPANT_LEFT':
                    this.events.emit('ws:participantLeft', message.payload);
                    break;

                case 'SYNC_EVENT':
                    this.events.emit('ws:syncEvent', message.payload);
                    // Also emit specific sync event types
                    if (message.payload.eventType) {
                        this.events.emit(`sync:${message.payload.eventType.toLowerCase()}`, message.payload);
                    }
                    break;

                case 'WEBRTC_SIGNAL':
                    this.events.emit('ws:webrtcSignal', message.payload);
                    break;

                case 'ERROR':
                    console.error('Server error:', message.payload.message);
                    this.events.emit('ws:error', new Error(message.payload.message));
                    break;

                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Failed to parse message:', error);
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.events.emit('ws:reconnectFailed');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            console.log('Attempting to reconnect...');
            this.connect().catch((error) => {
                console.error('Reconnection failed:', error);
            });
        }, delay);
    }
}
