
/**
 * Represents a product in the store.
 * In a real application, this would likely come from a CMS or e-commerce backend (Shopify, WooCommerce).
 * 
 * @property id - Unique identifier for the product
 * @property name - Display name
 * @property price - Cost in minor units or raw number
 * @property currency - Currency symbol (e.g. ₦, $)
 * @property image - URL to product image
 * @property category - Product taxonomy category
 * @property description - Long form text description
 */
export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  category: string;
  description: string;
}

/**
 * The atomic unit of synchronization.
 * These events are transmitted over the "nervous system" (WebSocket/BroadcastChannel)
 * to keep all peers in the session aligned.
 * 
 * Protocol:
 * - NAVIGATE: Peer changed the route or selected a product.
 * - REACTION: Peer triggered an emotive reaction (heart, fire, etc).
 * - SCROLL_REQUEST: Peer wants to sync scroll position (throttled).
 * - JOINED: Peer successfully connected to the session (Handshake).
 * - CART_UPDATE: Peer added or removed an item from the shared cart.
 */
export interface SyncEvent {
  /** The type of action performed by the user */
  type: 'NAVIGATE' | 'REACTION' | 'SCROLL_REQUEST' | 'JOINED' | 'CART_UPDATE' | 'SESSION_CREATED' | 'SESSION_JOINED' | 'CLIENT_ID' | 'SIGNAL';
  /** The data associated with the action (e.g., product ID, scroll position) */
  payload: any;
  /** The ID of the user who initiated the action */
  sourceId: string;
  /** Timestamp for conflict resolution and ordering */
  timestamp: number;
}

/**
 * Supported reaction types for the floating emotive layer.
 * These map to specific emojis in the UI.
 */
export type ReactionType = 'heart' | 'laugh' | 'fire' | 'shock' | 'cash' | 'trash';

/**
 * Represents a user in the active session.
 * Used for avatar display and presence indication.
 */
export interface UserSession {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

/**
 * The current navigational state of the view.
 * LIST: The main grid of products.
 * PRODUCT: The detailed view of a specific product.
 */
export enum ViewState {
  LIST = 'LIST',
  PRODUCT = 'PRODUCT',
}

/**
 * Represents a completed order in the database.
 */
export interface Order {
  id: string;
  items: Product[];
  total: number;
  date: string;
  status: 'processing' | 'shipped' | 'delivered';
}

/**
 * Mock user profile data.
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  orders: Order[];
}

/**
 * WebRTC Signaling payload
 */
export interface SignalPayload {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  targetId?: string;
  sourceId?: string;
}
