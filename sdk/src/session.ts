/**
 * Session Manager
 * Handles session creation, joining, and leaving
 */

import { WebSocketClient } from './websocket.js';
import { EventEmitter } from './events.js';

export class SessionManager {
    private ws: WebSocketClient;
    private events: EventEmitter;

    constructor(ws: WebSocketClient, events: EventEmitter) {
        this.ws = ws;
        this.events = events;
    }

    /**
     * Create a new session
     */
    async create(metadata?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            // Listen for session created event
            const timeout = setTimeout(() => {
                reject(new Error('Session creation timeout'));
            }, 10000);

            this.events.once('ws:sessionCreated', (data: any) => {
                clearTimeout(timeout);
                resolve(data);
            });

            this.events.once('ws:error', (error: any) => {
                clearTimeout(timeout);
                reject(error);
            });

            // Send create session message
            this.ws.send({
                type: 'CREATE_SESSION',
                payload: { metadata }
            });
        });
    }

    /**
     * Join an existing session
     */
    async join(sessionId: string, userName?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Session join timeout'));
            }, 10000);

            this.events.once('ws:sessionJoined', (data: any) => {
                clearTimeout(timeout);
                resolve(data);
            });

            this.events.once('ws:error', (error: any) => {
                clearTimeout(timeout);
                reject(error);
            });

            this.ws.send({
                type: 'JOIN_SESSION',
                payload: {
                    sessionId,
                    userName: userName || 'Anonymous'
                }
            });
        });
    }

    /**
     * Leave a session
     */
    async leave(sessionId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                resolve(); // Resolve anyway after timeout
            }, 5000);

            this.events.once('ws:sessionLeft', () => {
                clearTimeout(timeout);
                resolve();
            });

            this.ws.send({
                type: 'LEAVE_SESSION',
                payload: { sessionId }
            });
        });
    }
}
