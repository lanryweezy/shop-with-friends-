/**
 * Shop with Friends SDK
 * Main entry point for the client SDK
 */

import { WebSocketClient } from './websocket.js';
import { SessionManager } from './session.js';
import { EventEmitter } from './events.js';
import { UIManager } from './ui/manager.js';
import { WebRTCManager } from './webrtc.js';

export interface ShopWithFriendsConfig {
    apiKey: string;
    apiUrl?: string;

    // UI Options
    showInviteButton?: boolean;
    showParticipants?: boolean;
    showNotifications?: boolean;

    // WebRTC Options
    enableVoice?: boolean;
    enableVideo?: boolean;

    // Customization
    theme?: 'dark' | 'light';
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

    // Product context (optional, can be set later)
    productId?: string;
    productName?: string;
    productUrl?: string;

    // Callbacks
    onSessionCreated?: (session: any) => void;
    onParticipantJoined?: (user: any) => void;
    onParticipantLeft?: (user: any) => void;
    onSync?: (event: any) => void;
    onError?: (error: Error) => void;
}

export class ShopWithFriends {
    private config: ShopWithFriendsConfig;
    private ws: WebSocketClient;
    private session: SessionManager;
    private events: EventEmitter;
    private ui: UIManager | null = null;
    private webrtc: WebRTCManager | null = null;

    private clientId: string | null = null;
    private currentSessionId: string | null = null;
    private isInitialized: boolean = false;

    constructor(config: ShopWithFriendsConfig) {
        if (!config.apiKey) {
            throw new Error('API key is required');
        }

        this.config = {
            apiUrl: config.apiUrl || 'ws://localhost:3001',
            showInviteButton: config.showInviteButton !== false,
            showParticipants: config.showParticipants !== false,
            showNotifications: config.showNotifications !== false,
            theme: config.theme || 'dark',
            position: config.position || 'bottom-right',
            ...config
        };

        this.events = new EventEmitter();
        this.ws = new WebSocketClient(this.config.apiUrl!, this.events);
        this.session = new SessionManager(this.ws, this.events);

        // Initialize WebRTC if enabled
        if (this.config.enableVoice || this.config.enableVideo) {
            this.webrtc = new WebRTCManager(this.ws, this.events, {
                enableAudio: this.config.enableVoice !== false,
                enableVideo: this.config.enableVideo || false
            });
        }

        // Initialize UI if enabled
        if (this.config.showInviteButton || this.config.showParticipants) {
            this.ui = new UIManager(this, this.config);
        }

        this.setupEventHandlers();
    }

    /**
     * Initialize the SDK
     */
    async init(): Promise<void> {
        if (this.isInitialized) {
            console.warn('Shop with Friends SDK already initialized');
            return;
        }

        try {
            await this.ws.connect();

            // Wait for client ID from server
            this.clientId = await this.ws.waitForClientId();

            this.isInitialized = true;
            console.log('✅ Shop with Friends SDK initialized');

            // Check if we should auto-join from URL
            this.checkAutoJoin();

            // Render UI if enabled
            if (this.ui) {
                this.ui.render();
            }
        } catch (error) {
            console.error('Failed to initialize Shop with Friends SDK:', error);
            if (this.config.onError) {
                this.config.onError(error as Error);
            }
            throw error;
        }
    }

    /**
     * Create a new shopping session
     */
    async createSession(metadata?: any): Promise<any> {
        if (!this.isInitialized) {
            throw new Error('SDK not initialized. Call init() first.');
        }

        const session = await this.session.create(metadata);
        this.currentSessionId = session.sessionId;

        if (this.config.onSessionCreated) {
            this.config.onSessionCreated(session);
        }

        return session;
    }

    /**
     * Join an existing session
     */
    async joinSession(sessionId: string, userName?: string): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('SDK not initialized. Call init() first.');
        }

        await this.session.join(sessionId, userName);
        this.currentSessionId = sessionId;
    }

    /**
     * Leave current session
     */
    async leaveSession(): Promise<void> {
        if (!this.currentSessionId) {
            console.warn('Not in a session');
            return;
        }

        await this.session.leave(this.currentSessionId);
        this.currentSessionId = null;
    }

    /**
     * Start voice chat
     */
    async startVoice(): Promise<MediaStream | void> {
        if (!this.webrtc) {
            console.warn('WebRTC not enabled in config');
            return;
        }
        return this.webrtc.startCall();
    }

    /**
     * Stop voice chat
     */
    stopVoice(): void {
        this.webrtc?.stopCall();
    }

    /**
     * Start screen sharing
     */
    async startScreenShare(): Promise<MediaStream | void> {
        if (!this.webrtc) {
            console.warn('WebRTC not enabled in config');
            return;
        }
        return this.webrtc.startScreenShare();
    }

    /**
     * Stop screen sharing
     */
    stopScreenShare(): void {
        this.webrtc?.stopScreenShare();
    }

    /**
     * Toggle mute
     */
    setMute(muted: boolean): void {
        this.webrtc?.toggleAudio(!muted);
    }

    /**
     * Toggle video
     */
    setVideo(enabled: boolean): void {
        this.webrtc?.toggleVideo(enabled);
    }

    /**
     * Get audio level for a peer (0-100)
     */
    getAudioLevel(peerId: string): number {
        return this.webrtc?.getAudioLevel(peerId) || 0;
    }

    /**
     * Get connection stats for a peer
     */
    async getConnectionStats(peerId: string): Promise<any> {
        if (!this.webrtc) return null;
        return this.webrtc.getConnectionStats(peerId);
    }

    /**
     * Sync navigation to all participants
     */
    syncNavigation(data: {
        url?: string;
        productId?: string;
        productName?: string;
        view?: string;
        product?: any;
    }): void {
        if (!this.currentSessionId) {
            console.warn('Not in a session. Call createSession() or joinSession() first.');
            return;
        }

        this.ws.send({
            type: 'SYNC_EVENT',
            payload: {
                eventType: 'NAVIGATE',
                ...data,
                url: data.url || window.location.href
            }
        });
    }

    /**
     * Sync cart to all participants
     */
    syncCart(cart: any[]): void {
        if (!this.currentSessionId) {
            console.warn('Not in a session');
            return;
        }

        this.ws.send({
            type: 'SYNC_EVENT',
            payload: {
                eventType: 'CART_UPDATE',
                cart
            }
        });
    }

    /**
     * Send a reaction
     */
    sendReaction(reaction: string): void {
        if (!this.currentSessionId) {
            console.warn('Not in a session');
            return;
        }

        this.ws.send({
            type: 'SYNC_EVENT',
            payload: {
                eventType: 'REACTION',
                reaction
            }
        });
    }

    /**
     * Request scroll sync
     */
    syncScroll(scrollTop: number): void {
        if (!this.currentSessionId) return;

        this.ws.send({
            type: 'SYNC_EVENT',
            payload: {
                eventType: 'SCROLL_REQUEST',
                scrollTop
            }
        });
    }

    /**
     * Event listener
     */
    on(event: string, callback: Function): void {
        this.events.on(event, callback);
    }

    /**
     * Remove event listener
     */
    off(event: string, callback: Function): void {
        this.events.off(event, callback);
    }

    /**
     * Get current session ID
     */
    getSessionId(): string | null {
        return this.currentSessionId;
    }

    /**
     * Get client ID
     */
    getClientId(): string | null {
        return this.clientId;
    }

    /**
     * Check if in a session
     */
    isInSession(): boolean {
        return this.currentSessionId !== null;
    }

    /**
     * Destroy SDK instance
     */
    destroy(): void {
        if (this.ui) {
            this.ui.destroy();
        }
        this.ws.disconnect();
        this.events.removeAllListeners();
        this.isInitialized = false;
    }

    // Private methods

    private setupEventHandlers(): void {
        // Forward WebSocket events to SDK events
        this.events.on('ws:participantJoined', (data: any) => {
            if (this.config.onParticipantJoined) {
                this.config.onParticipantJoined(data);
            }
        });

        this.events.on('ws:participantLeft', (data: any) => {
            if (this.config.onParticipantLeft) {
                this.config.onParticipantLeft(data);
            }
        });

        this.events.on('ws:syncEvent', (data: any) => {
            if (this.config.onSync) {
                this.config.onSync(data);
            }
        });

        this.events.on('ws:error', (error: any) => {
            if (this.config.onError) {
                this.config.onError(error);
            }
        });
    }

    private checkAutoJoin(): void {
        // Check if there's a session ID in the URL
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('join');

        if (sessionId) {
            console.log('Auto-joining session from URL:', sessionId);
            this.joinSession(sessionId);
        }
    }
}

// Export for UMD/global usage
if (typeof window !== 'undefined') {
    (window as any).ShopWithFriends = ShopWithFriends;
}

export default ShopWithFriends;
