import ShopWithFriends from '../api-client';
import { SyncEvent } from '../types';

// Logger helper
const logArea = document.getElementById('logs')!;
function log(msg: string) {
    const div = document.createElement('div');
    div.textContent = `> ${msg}`;
    logArea.appendChild(div);
    logArea.scrollTop = logArea.scrollHeight;
}

// Initialize API Client
const swf = new ShopWithFriends({
    onSyncEvent: (event: SyncEvent) => {
        log(`RECEIVED EVENT: ${event.type}`);
        console.log('Event payload:', event.payload);

        if (event.type === 'REACTION') {
            alert(`Friend reacted: ${event.payload.reaction}`);
        }
    },
    onSessionCreated: (sessionId: string) => {
        log(`SESSION CREATED: ${sessionId}`);
        updateUI(sessionId);
    },
    onSessionJoined: (sessionId: string) => {
        log(`JOINED SESSION: ${sessionId}`);
        updateUI(sessionId);
        // Show join call button for the joiner
        document.getElementById('join-call')!.style.display = 'inline-block';
        document.getElementById('start-call')!.style.display = 'none';
    },
    onError: (err: any) => {
        log(`ERROR: ${err.message}`);
    },
    onStreamAdded: (stream: MediaStream) => {
        log('Stream added!');
        const remoteVideo = document.getElementById('remote-video') as HTMLVideoElement;
        remoteVideo.srcObject = stream;
    }
});

// UI Elements
const btn = document.getElementById('shop-with-friends')!;
const statusDiv = document.getElementById('swf-status')!;
const sessionIdSpan = document.getElementById('session-id')!;
const shareLinkA = document.getElementById('share-link') as HTMLAnchorElement;

// Handle "Shop with Friends" click
btn.addEventListener('click', async () => {
    try {
        log('Creating session...');
        await swf.createSession();
    } catch (e) {
        log(`Failed to create session: ${e}`);
    }
});

// Update UI when session is active
function updateUI(sessionId: string) {
    statusDiv.style.display = 'block';
    sessionIdSpan.textContent = sessionId;

    // Create a shareable link that points back to this page with the session ID
    const url = new URL(window.location.href);
    url.searchParams.set('session', sessionId);

    shareLinkA.href = url.toString();
    shareLinkA.textContent = url.toString();

    btn.textContent = 'Session Active';
    (btn as HTMLButtonElement).disabled = true;
}

// Check for session in URL (Simulating a friend joining)
const params = new URLSearchParams(window.location.search);
const existingSession = params.get('session');

if (existingSession) {
    log(`Found session in URL: ${existingSession}`);
    swf.joinSession(existingSession).catch(e => log(`Failed to join: ${e}`));
}

// Video Controls
document.getElementById('start-call')?.addEventListener('click', async () => {
    try {
        log('Starting call...');
        await swf.startCall();
        // Show local video
        const localVideo = document.getElementById('local-video') as HTMLVideoElement;
        // We need to access the local stream from the service, but for now let's just log
        log('Call started. Waiting for peer...');
    } catch (e) {
        log(`Error starting call: ${e}`);
    }
});

document.getElementById('join-call')?.addEventListener('click', async () => {
    try {
        log('Joining call...');
        await swf.joinCall();
    } catch (e) {
        log(`Error joining call: ${e}`);
    }
});

let audioEnabled = true;
document.getElementById('toggle-audio')?.addEventListener('click', () => {
    audioEnabled = !audioEnabled;
    swf.toggleAudio(audioEnabled);
    const btn = document.getElementById('toggle-audio')!;
    btn.textContent = audioEnabled ? '🎤 Mute' : '🎤 Unmute';
});

let videoEnabled = true;
document.getElementById('toggle-video')?.addEventListener('click', () => {
    videoEnabled = !videoEnabled;
    swf.toggleVideo(videoEnabled);
    const btn = document.getElementById('toggle-video')!;
    btn.textContent = videoEnabled ? '📷 Video Off' : '📷 Video On';
});
