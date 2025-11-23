/**
 * SHOP WITH FRIENDS API CLIENT
 * ============================
 * 
 * This is the main API that e-commerce platforms can integrate to enable
 * social shopping experiences.
 * 
 * Usage:
 * 
 * import { ShopWithFriends } from './api-client';
 * 
 * // Initialize the client
 * const shopWithFriends = new ShopWithFriends({
 *   onSyncEvent: (event) => { ... },
 *   onSessionCreated: (sessionId) => { ... },
 *   onError: (error) => { ... }
 * });
 * 
 * // Create a new session
 * const sessionId = await shopWithFriends.createSession();
 * 
 * // Join an existing session
 * await shopWithFriends.joinSession('ABC123');
 * 
 * // Send sync events
/**
 * SHOP WITH FRIENDS API CLIENT
 * ============================
 * 
 * This is the main API that e-commerce platforms can integrate to enable
 * social shopping experiences.
 * 
 * Usage:
 * 
 * import { ShopWithFriends } from './api-client';
 * 
 * // Initialize the client
 * const shopWithFriends = new ShopWithFriends({
 *   onSyncEvent: (event) => { ... },
 *   onSessionCreated: (sessionId) => { ... },
 *   onError: (error) => { ... }
 * });
 * 
 * // Create a new session
 * const sessionId = await shopWithFriends.createSession();
 * 
 * // Join an existing session
 * await shopWithFriends.joinSession('ABC123');
 * 
 * // Send sync events
 * shopWithFriends.sendEvent({
 *   type: 'NAVIGATE',
 *   payload: { view: 'PRODUCT', product: { id: 'p1' } }
 * });
 */

import { realSyncEngine } from './services/realSyncService';
import { SyncEvent } from './types';

interface ShopWithFriendsOptions {
    onSyncEvent?: (event: SyncEvent) => void;
    onSessionCreated?: (sessionId: string) => void;
    onError?: (error: Error) => void;
}

export class ShopWithFriends {
    private options: ShopWithFriendsOptions;

    constructor(options: ShopWithFriendsOptions = {}) {
        this.options = options;

        // Subscribe to sync events
        realSyncEngine.subscribe((event) => {
            if (event.type === 'SESSION_CREATED') {
                this.options.onSessionCreated?.(event.payload.sessionId);
            } else {
                this.options.onSyncEvent?.(event);
            }
        });
    }

    /**
     * Create a new shopping session
     * 
     * @returns Promise that resolves with the session ID
     */
    async createSession(): Promise<string> {
        try {
            return await realSyncEngine.createSession();
        } catch (error) {
            this.options.onError?.(error as Error);
            throw error;
        }
    }

    /**
     * Join an existing shopping session
     * 
     * @param sessionId The ID of the session to join
     */
    async joinSession(sessionId: string): Promise<void> {
        try {
            await realSyncEngine.joinSession(sessionId);
        } catch (error) {
            this.options.onError?.(error as Error);
            throw error;
        }
    }

    /**
     * Send a synchronization event to other participants
     * 
     * @param event The event to send
     */
    sendEvent(event: Omit<SyncEvent, 'sourceId' | 'timestamp'>): void {
        realSyncEngine.send(event as SyncEvent);
    }

    /**
     * Get the current client ID
     */
    getClientId(): string | null {
        return realSyncEngine.getClientId();
    }

    /**
     * Get the current session ID
     */
    getSessionId(): string | null {
        return realSyncEngine.getSessionId();
    }

    /**
     * Check if connected to a session
     */
    isConnected(): boolean {
        return realSyncEngine.isConnected();
    }
}

// Default export for easy integration
export default ShopWithFriends;
