/**
 * WebRTC Manager - Enhanced Version
 * Handles voice/video chat connections with advanced features
 */

import { WebSocketClient } from './websocket.js';
import { EventEmitter } from './events.js';

export interface WebRTCConfig {
    enableVideo?: boolean;
    enableAudio?: boolean;
    enableScreenShare?: boolean;
    iceServers?: RTCIceServer[];
    audioConstraints?: MediaTrackConstraints;
    videoConstraints?: MediaTrackConstraints;
}

export interface ConnectionStats {
    peerId: string;
    bytesReceived: number;
    bytesSent: number;
    packetsLost: number;
    jitter: number;
    roundTripTime: number;
    connectionState: RTCPeerConnectionState;
}

export interface AudioLevel {
    peerId: string;
    level: number; // 0-100
}

export class WebRTCManager {
    private ws: WebSocketClient;
    private events: EventEmitter;
    private config: WebRTCConfig;
    private localStream: MediaStream | null = null;
    private screenStream: MediaStream | null = null;
    private peers: Map<string, RTCPeerConnection> = new Map();
    private audioContexts: Map<string, AudioContext> = new Map();
    private audioAnalyzers: Map<string, AnalyserNode> = new Map();
    private statsIntervals: Map<string, number> = new Map();

    private iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ];

    private defaultAudioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
    };

    private defaultVideoConstraints: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
    };

    constructor(ws: WebSocketClient, events: EventEmitter, config?: WebRTCConfig) {
        this.ws = ws;
        this.events = events;
        this.config = {
            enableAudio: true,
            enableVideo: false,
            enableScreenShare: false,
            audioConstraints: this.defaultAudioConstraints,
            videoConstraints: this.defaultVideoConstraints,
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
            const constraints: MediaStreamConstraints = {
                audio: this.config.enableAudio ? this.config.audioConstraints : false,
                video: this.config.enableVideo ? this.config.videoConstraints : false
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

            // Setup audio level monitoring for local stream
            if (this.config.enableAudio) {
                this.setupAudioLevelMonitoring('local', this.localStream);
            }

            this.events.emit('webrtc:localStream', this.localStream);
            this.events.emit('webrtc:callStarted', { stream: this.localStream });

            return this.localStream;
        } catch (error) {
            console.error('Failed to get local media stream:', error);
            this.events.emit('webrtc:error', {
                type: 'media_access_denied',
                error
            });
            throw error;
        }
    }

    /**
     * Start screen sharing
     */
    async startScreenShare(): Promise<MediaStream> {
        if (!this.config.enableScreenShare) {
            throw new Error('Screen sharing not enabled in config');
        }

        try {
            // @ts-ignore - getDisplayMedia is not in all TypeScript definitions
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: false
            } as any);

            // Replace video track in all peer connections
            const videoTrack = this.screenStream.getVideoTracks()[0];
            this.peers.forEach((peer, peerId) => {
                const sender = peer.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });

            // Listen for screen share stop
            videoTrack.onended = () => {
                this.stopScreenShare();
            };

            this.events.emit('webrtc:screenShareStarted', this.screenStream);
            return this.screenStream;
        } catch (error) {
            console.error('Failed to start screen sharing:', error);
            this.events.emit('webrtc:error', {
                type: 'screen_share_failed',
                error
            });
            throw error;
        }
    }

    /**
     * Stop screen sharing
     */
    stopScreenShare(): void {
        if (!this.screenStream) return;

        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;

        // Restore camera video if it was enabled
        if (this.localStream && this.config.enableVideo) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            this.peers.forEach((peer) => {
                const sender = peer.getSenders().find(s => s.track?.kind === 'video');
                if (sender && videoTrack) {
                    sender.replaceTrack(videoTrack);
                }
            });
        }

        this.events.emit('webrtc:screenShareStopped');
    }

    /**
     * Stop call
     */
    stopCall(): void {
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Stop screen share
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }

        // Close all peer connections
        this.peers.forEach((peer, peerId) => {
            this.closePeerConnection(peerId);
        });
        this.peers.clear();

        // Clean up audio contexts
        this.audioContexts.forEach(ctx => ctx.close());
        this.audioContexts.clear();
        this.audioAnalyzers.clear();

        this.events.emit('webrtc:callEnded');
    }

    /**
     * Connect to a specific peer
     */
    async connectToPeer(targetId: string): Promise<void> {
        if (this.peers.has(targetId)) {
            console.log(`Already connected to peer ${targetId}`);
            return;
        }

        const peer = this.createPeerConnection(targetId);
        this.peers.set(targetId, peer);

        // Add local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peer.addTrack(track, this.localStream!);
            });
        }

        try {
            const offer = await peer.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: this.config.enableVideo || false
            });

            await peer.setLocalDescription(offer);
            this.sendSignal(targetId, { type: 'offer', sdp: offer });

            // Start monitoring connection stats
            this.startStatsMonitoring(targetId, peer);
        } catch (error) {
            console.error(`Error creating offer for ${targetId}:`, error);
            this.events.emit('webrtc:error', {
                type: 'connection_failed',
                peerId: targetId,
                error
            });
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
            this.events.emit('webrtc:audioToggled', { enabled });
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
            this.events.emit('webrtc:videoToggled', { enabled });
        }
    }

    /**
     * Get connection stats for a peer
     */
    async getConnectionStats(peerId: string): Promise<ConnectionStats | null> {
        const peer = this.peers.get(peerId);
        if (!peer) return null;

        try {
            const stats = await peer.getStats();
            let bytesReceived = 0;
            let bytesSent = 0;
            let packetsLost = 0;
            let jitter = 0;
            let roundTripTime = 0;

            stats.forEach((report: any) => {
                if (report.type === 'inbound-rtp') {
                    bytesReceived += report.bytesReceived || 0;
                    packetsLost += report.packetsLost || 0;
                    jitter = report.jitter || 0;
                } else if (report.type === 'outbound-rtp') {
                    bytesSent += report.bytesSent || 0;
                } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    roundTripTime = report.currentRoundTripTime || 0;
                }
            });

            return {
                peerId,
                bytesReceived,
                bytesSent,
                packetsLost,
                jitter,
                roundTripTime,
                connectionState: peer.connectionState
            };
        } catch (error) {
            console.error(`Error getting stats for ${peerId}:`, error);
            return null;
        }
    }

    /**
     * Get audio level for a peer (0-100)
     */
    getAudioLevel(peerId: string): number {
        const analyzer = this.audioAnalyzers.get(peerId);
        if (!analyzer) return 0;

        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        return Math.min(100, Math.round((average / 255) * 100));
    }

    /**
     * Disconnect from a specific peer
     */
    disconnectPeer(peerId: string): void {
        this.closePeerConnection(peerId);
        this.peers.delete(peerId);
    }

    // Private methods

    private createPeerConnection(targetId: string): RTCPeerConnection {
        const peer = new RTCPeerConnection({
            iceServers: this.iceServers,
            iceCandidatePoolSize: 10
        });

        peer.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal(targetId, {
                    type: 'candidate',
                    candidate: event.candidate
                });
            }
        };

        peer.ontrack = (event) => {
            const stream = event.streams[0];

            // Setup audio level monitoring for remote stream
            if (event.track.kind === 'audio') {
                this.setupAudioLevelMonitoring(targetId, stream);
            }

            this.events.emit('webrtc:remoteStream', {
                peerId: targetId,
                stream,
                track: event.track
            });
        };

        peer.onconnectionstatechange = () => {
            console.log(`Peer ${targetId} connection state:`, peer.connectionState);

            this.events.emit('webrtc:connectionStateChange', {
                peerId: targetId,
                state: peer.connectionState
            });

            if (peer.connectionState === 'connected') {
                this.events.emit('webrtc:peerConnected', targetId);
            } else if (peer.connectionState === 'disconnected' || peer.connectionState === 'failed') {
                this.handlePeerDisconnection(targetId, peer);
            } else if (peer.connectionState === 'closed') {
                this.closePeerConnection(targetId);
            }
        };

        peer.oniceconnectionstatechange = () => {
            console.log(`Peer ${targetId} ICE state:`, peer.iceConnectionState);

            if (peer.iceConnectionState === 'failed') {
                // Attempt ICE restart
                this.restartIce(targetId, peer);
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

                // Start monitoring
                this.startStatsMonitoring(sourceId, peer);
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
                this.events.emit('webrtc:error', {
                    type: 'signaling_error',
                    peerId: sourceId,
                    error
                });
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

    private setupAudioLevelMonitoring(peerId: string, stream: MediaStream): void {
        try {
            const audioContext = new AudioContext();
            const analyzer = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);

            analyzer.fftSize = 256;
            source.connect(analyzer);

            this.audioContexts.set(peerId, audioContext);
            this.audioAnalyzers.set(peerId, analyzer);

            // Emit audio levels periodically
            const interval = setInterval(() => {
                const level = this.getAudioLevel(peerId);
                this.events.emit('webrtc:audioLevel', { peerId, level });
            }, 100);

            // Store interval for cleanup
            this.statsIntervals.set(`audio-${peerId}`, interval as any);
        } catch (error) {
            console.error(`Failed to setup audio monitoring for ${peerId}:`, error);
        }
    }

    private startStatsMonitoring(peerId: string, peer: RTCPeerConnection): void {
        const interval = setInterval(async () => {
            const stats = await this.getConnectionStats(peerId);
            if (stats) {
                this.events.emit('webrtc:stats', stats);

                // Emit warnings for poor connection
                if (stats.packetsLost > 100) {
                    this.events.emit('webrtc:poorConnection', {
                        peerId,
                        reason: 'high_packet_loss',
                        packetsLost: stats.packetsLost
                    });
                }
                if (stats.roundTripTime > 0.3) {
                    this.events.emit('webrtc:poorConnection', {
                        peerId,
                        reason: 'high_latency',
                        rtt: stats.roundTripTime
                    });
                }
            }
        }, 2000);

        this.statsIntervals.set(`stats-${peerId}`, interval as any);
    }

    private async restartIce(peerId: string, peer: RTCPeerConnection): Promise<void> {
        console.log(`Attempting ICE restart for peer ${peerId}`);

        try {
            const offer = await peer.createOffer({ iceRestart: true });
            await peer.setLocalDescription(offer);
            this.sendSignal(peerId, { type: 'offer', sdp: offer });

            this.events.emit('webrtc:iceRestart', { peerId });
        } catch (error) {
            console.error(`ICE restart failed for ${peerId}:`, error);
        }
    }

    private handlePeerDisconnection(peerId: string, peer: RTCPeerConnection): void {
        console.log(`Peer ${peerId} disconnected`);

        // Attempt reconnection after a delay
        setTimeout(() => {
            if (peer.connectionState === 'disconnected') {
                console.log(`Attempting to reconnect to ${peerId}`);
                this.restartIce(peerId, peer);
            }
        }, 3000);

        this.events.emit('webrtc:peerDisconnected', peerId);
    }

    private closePeerConnection(peerId: string): void {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.close();
        }

        // Clean up audio context
        const audioContext = this.audioContexts.get(peerId);
        if (audioContext) {
            audioContext.close();
            this.audioContexts.delete(peerId);
        }

        this.audioAnalyzers.delete(peerId);

        // Clear intervals
        const statsInterval = this.statsIntervals.get(`stats-${peerId}`);
        if (statsInterval) {
            clearInterval(statsInterval);
            this.statsIntervals.delete(`stats-${peerId}`);
        }

        const audioInterval = this.statsIntervals.get(`audio-${peerId}`);
        if (audioInterval) {
            clearInterval(audioInterval);
            this.statsIntervals.delete(`audio-${peerId}`);
        }
    }
}
