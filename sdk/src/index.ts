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
        // Pass API key to WebSocket client for session creation
        this.ws.apiKey = this.config.apiKey;
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

            // Check if we should auto-join from URL or restore session
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
    public async createSession(metadata?: any): Promise<any> {
        if (!this.isInitialized) {
            throw new Error('SDK not initialized. Call init() first.');
        }

        const session = await this.session.create(metadata);
        this.currentSessionId = session.sessionId;

        // Persist session
        if (this.currentSessionId) {
            localStorage.setItem('swf_session_id', this.currentSessionId);
        }

        if (this.config.onSessionCreated) {
            this.config.onSessionCreated(session);
        }

        return session;
    }

    /**
     * Join an existing session
     */
    public async joinSession(sessionId: string, userName?: string): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('SDK not initialized. Call init() first.');
        }

        const session = await this.session.join(sessionId, userName);
        this.currentSessionId = sessionId;

        // Persist session
        localStorage.setItem('swf_session_id', sessionId);
        if (userName) localStorage.setItem('swf_user_name', userName);

        // Connect to existing participants
        if (this.webrtc && (this.config.enableVoice || this.config.enableVideo)) {
            session.participants.forEach((p: any) => {
                if (p.userId !== this.clientId) {
                    this.webrtc?.connectToPeer(p.userId);
                }
            });
        }
    }

    /**
     * Leave current session
     */
    public async leaveSession(): Promise<void> {
        if (!this.currentSessionId) {
            console.warn('Not in a session');
            return;
        }

        try {
            await this.session.leave(this.currentSessionId);
        } catch (error) {
            console.error('Error leaving session:', error);
        } finally {
            this.currentSessionId = null;
            localStorage.removeItem('swf_session_id');
            localStorage.removeItem('swf_user_name');
            this.stopVoice();
            this.stopScreenShare();
            // Clear peer connections
            if (this.webrtc) {
                this.webrtc.stopCall();
            }
        }
    }

    /**
     * Start voice chat
     */
    public async startVoice(): Promise<MediaStream | void> {
        if (!this.webrtc) {
            this.webrtc = new WebRTCManager(this.ws, this.events, {
                enableAudio: true,
                enableVideo: this.config.enableVideo || false
            });
        }
        return this.webrtc.startCall();
    }

    /**
     * Stop voice chat
     */
    public stopVoice(): void {
        this.webrtc?.stopCall();
    }

    /**
     * Stop screen sharing
     */
    public stopScreenShare(): void {
        this.webrtc?.stopScreenShare();
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
     * Toggle mute
     */
    setMute(muted: boolean): void {
        this.webrtc?.toggleAudio(!muted);
    }

    /**
     * Toggle video
     */
    public async setVideo(enabled: boolean): Promise<void> {
        if (!this.webrtc) {
            this.webrtc = new WebRTCManager(this.ws, this.events, {
                enableAudio: this.config.enableVoice || true,
                enableVideo: true
            });
        }

        // If enabling video and we don't have a stream yet, start the call
        if (enabled && !this.webrtc.getAudioLevel('local')) {
             try {
                 await this.webrtc.startCall();
             } catch (e) {
                 console.error("Failed to start call for video", e);
             }
        }

        this.webrtc.toggleVideo(enabled);
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
     * Send a chat message
     */
    public sendChatMessage(message: string): void {
        if (!this.currentSessionId) {
            console.warn('Not in a session');
            return;
        }

        this.ws.send({
            type: 'SYNC_EVENT',
            payload: {
                eventType: 'CHAT_MESSAGE',
                message
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
     * Sync cursor position
     */
    syncCursor(x: number, y: number): void {
        if (!this.currentSessionId) return;

        this.ws.send({
            type: 'SYNC_EVENT',
            payload: {
                eventType: 'CURSOR_MOVE',
                x,
                y,
                pageX: window.scrollX,
                pageY: window.scrollY,
                width: window.innerWidth,
                height: window.innerHeight
            }
        });
    }

    /**
     * Request scroll sync
     */
    public syncScroll(scrollTop: number, scrollLeft: number = 0): void {
        if (!this.currentSessionId) return;

        this.ws.send({
            type: 'SYNC_EVENT',
            payload: {
                eventType: 'SCROLL_REQUEST',
                scrollTop,
                scrollLeft,
                docHeight: document.documentElement.scrollHeight,
                docWidth: document.documentElement.scrollWidth,
                viewHeight: window.innerHeight,
                viewWidth: window.innerWidth
            }
        });
    }

    /**
     * Event listener
     */
    public on(event: string, callback: Function): void {
        this.events.on(event, callback);
    }

    /**
     * Remove event listener
     */
    public off(event: string, callback: Function): void {
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
    public isInSession(): boolean {
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
            // Automatically connect to the new peer via WebRTC if enabled
            if (this.webrtc && (this.config.enableVoice || this.config.enableVideo)) {
                this.webrtc.connectToPeer(data.userId);
            }

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

            // Forward specific sync events for UIManager and other listeners
            if (data.eventType) {
                this.events.emit(`sync:${data.eventType.toLowerCase()}`, data);
            }
        });

        this.events.on('ws:error', (error: any) => {
            if (this.config.onError) {
                this.config.onError(error);
            }
        });

        // Forward WebRTC events
        const webrtcEvents = [
            'webrtc:localStream',
            'webrtc:remoteStream',
            'webrtc:callStarted',
            'webrtc:callEnded',
            'webrtc:peerConnected',
            'webrtc:peerDisconnected',
            'webrtc:stats',
            'webrtc:error',
            'webrtc:audioLevel',
            'webrtc:audioToggled',
            'webrtc:videoToggled'
        ];

        webrtcEvents.forEach(event => {
            this.events.on(event, (data: any) => {
                // Already emitted by WebRTCManager on the same emitter,
                // but if we ever use separate emitters we'd proxy here.
                // For now, UIManager already listens to this.sdk which uses this.events.
            });
        });
    }

    private checkAutoJoin(): void {
        // Check if there's a session ID in the URL
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('join');

        if (sessionId) {
            console.log('Found session ID in URL:', sessionId);
            if (this.ui) {
                this.ui.showJoinModal(sessionId);
            } else {
                this.joinSession(sessionId);
            }
            return;
        }

        // Check for persisted session
        const persistedSessionId = localStorage.getItem('swf_session_id');
        if (persistedSessionId) {
            console.log('Restoring persisted session:', persistedSessionId);
            const userName = localStorage.getItem('swf_user_name');
            this.joinSession(persistedSessionId, userName || undefined).catch(() => {
                localStorage.removeItem('swf_session_id');
            });
        }
    }
}

// Export for UMD/global usage
if (typeof window !== 'undefined') {
    (window as any).ShopWithFriends = ShopWithFriends;
}

export default ShopWithFriends;
