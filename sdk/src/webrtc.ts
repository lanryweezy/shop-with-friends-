/**
 * WebRTC Manager
 * Handles voice/video chat connections
 */

import { WebSocketClient } from './websocket.js';
import { EventEmitter } from './events.js';

export interface WebRTCConfig {
    enableVideo?: boolean;
    enableAudio?: boolean;
    iceServers?: RTCIceServer[];
}

export class WebRTCManager {
    private ws: WebSocketClient;
    private events: EventEmitter;
    private config: WebRTCConfig;
    private localStream: MediaStream | null = null;
    private peers: Map<string, RTCPeerConnection> = new Map(); // targetId -> RTCPeerConnection
    private iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ];

    constructor(ws: WebSocketClient, events: EventEmitter, config?: WebRTCConfig) {
        this.ws = ws;
        this.events = events;
        this.config = {
            enableAudio: true,
            enableVideo: false,
            ...config
        };

        if (config?.iceServers) {
            this.iceServers = config.iceServers;
        }

        this.setupSignalHandler();
    }

    /**
     * Start voice/video chat
     */
    async startCall(): Promise<MediaStream> {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: this.config.enableAudio,
                video: this.config.enableVideo
            });

            this.events.emit('webrtc:localStream', this.localStream);
            return this.localStream;
        } catch (error) {
            console.error('Failed to get local media stream:', error);
            throw error;
        }
    }

    /**
     * Stop call
     */
    stopCall(): void {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        this.peers.forEach(peer => peer.close());
        this.peers.clear();
        this.events.emit('webrtc:callEnded');
    }

    /**
     * Connect to a specific peer
     */
    async connectToPeer(targetId: string): Promise<void> {
        if (this.peers.has(targetId)) return;

        const peer = this.createPeerConnection(targetId);
        this.peers.set(targetId, peer);

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peer.addTrack(track, this.localStream!);
            });
        }

        try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            this.sendSignal(targetId, { type: 'offer', sdp: offer });
        } catch (error) {
            console.error(`Error creating offer for ${targetId}:`, error);
        }
    }

    /**
     * Toggle audio mute
     */
    toggleAudio(enabled: boolean): void {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = enabled;
            });
        }
    }

    /**
     * Toggle video
     */
    toggleVideo(enabled: boolean): void {
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => {
                track.enabled = enabled;
            });
        }
    }

    // Private methods

    private createPeerConnection(targetId: string): RTCPeerConnection {
        const peer = new RTCPeerConnection({ iceServers: this.iceServers });

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal(targetId, { type: 'candidate', candidate: event.candidate });
            }
        };

        peer.ontrack = (event) => {
            this.events.emit('webrtc:remoteStream', {
                peerId: targetId,
                stream: event.streams[0]
            });
        };

        peer.onconnectionstatechange = () => {
            if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
                this.peers.delete(targetId);
                this.events.emit('webrtc:peerDisconnected', targetId);
            }
        };

        return peer;
    }

    private setupSignalHandler(): void {
        this.events.on('ws:webrtcSignal', async (data: any) => {
            const { sourceId, signal } = data;

            let peer = this.peers.get(sourceId);

            if (!peer) {
                // Incoming call from new peer
                peer = this.createPeerConnection(sourceId);
                this.peers.set(sourceId, peer);

                // Add local tracks if we're already in a call
                if (this.localStream) {
                    this.localStream.getTracks().forEach(track => {
                        peer!.addTrack(track, this.localStream!);
                    });
                }
            }

            try {
                if (signal.type === 'offer') {
                    await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    const answer = await peer.createAnswer();
                    await peer.setLocalDescription(answer);
                    this.sendSignal(sourceId, { type: 'answer', sdp: answer });
                } else if (signal.type === 'answer') {
                    await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                } else if (signal.type === 'candidate') {
                    await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }
            } catch (error) {
                console.error('Error handling WebRTC signal:', error);
            }
        });
    }

    private sendSignal(targetId: string, signal: any): void {
        this.ws.send({
            type: 'WEBRTC_SIGNAL',
            payload: {
                targetId,
                signal
            }
        });
    }
}
