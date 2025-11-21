
import { SyncEvent } from '../types';

/**
 * THE SOCIAL SPINE ARCHITECTURE
 * ==============================
 * 
 * This service implements the "Nervous System" of the Shop with Friends protocol.
 * It abstracts away the complexity of real-time communication, allowing
 * the UI components to simply "emit" reflexes and "subscribe" to impulses.
 * 
 * CORE CONCEPTS:
 * 
 * 1. THE BRAINSTEM (Session Node)
 *    - In a real deployment, this is a Node.js/WebSocket server.
 *    - It manages ephemeral session IDs (e.g., "5g7X9").
 *    - It relays messages between clients (A <-> Server <-> B).
 * 
 * 2. THE NERVOUS SYSTEM (The Wire)
 *    - Uses WebSockets/WebRTC for low-latency communication (< 100ms).
 *    - Handles "Digital Reflexes" (scroll, click, navigate) via efficient binary or JSON payloads.
 *    - Handles "Human Pulse" (voice, video) via WebRTC streams.
 * 
 * 3. THE FACE (The Parasite)
 *    - The UI layer (CoShopWidget) that floats above the host e-commerce platform.
 *    - It is designed to be "drop-in" compatible with any React/HTML site.
 * 
 * DEMO IMPLEMENTATION DETAILS:
 * 
 * Since this is a client-side demo running in a single browser tab, we cannot use
 * a real WebSocket server. Instead, we use the browser's `BroadcastChannel` API.
 * 
 * `BroadcastChannel` allows different browsing contexts (windows, tabs, iframes)
 * on the same origin to communicate. This perfectly simulates a WebSocket connection
 * for our "Split Brain" demo where User A and User B live in the same DOM.
 */

const CHANNEL_NAME = 'shop_with_friends_sync';

class SyncEngine {
  private listeners: ((event: SyncEvent) => void)[] = [];
  private channel: BroadcastChannel;

  constructor() {
    // Initialize the simulated network channel
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    
    // Listen for incoming signals from the "other device"
    this.channel.onmessage = (ev) => {
      const data = ev.data as SyncEvent;
      this.notify(data);
    };
  }

  /**
   * Transmit a reflex signal to the other organ (peer).
   * 
   * @param event The SyncEvent to broadcast.
   */
  public send(event: SyncEvent) {
    // In production: socket.emit('sync_event', { sessionId, ...event });
    this.channel.postMessage(event);
    
    // CRITICAL FOR DEMO: BroadcastChannel does not fire events on the sender.
    // Since our demo runs both "devices" in the same window using the same
    // engine instance, we must manually notify local listeners so they hear each other.
    // In a real app, you wouldn't typically listen to your own emitted events this way.
    this.notify(event);
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
      this.listeners = this.listeners.filter(l => l !== callback);
    };
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
}

// Export a singleton instance to ensure all components share the same channel connection.
export const syncEngine = new SyncEngine();