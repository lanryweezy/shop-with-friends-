
import { Product, Order, UserProfile } from '../types';

/**
 * MOCK BACKEND & DATABASE SERVICE
 * ===============================
 * 
 * Since we cannot spin up a real Node.js/Postgres instance in this browser-only preview,
 * this service simulates:
 * 1. Network Latency (using setTimeout)
 * 2. Data Persistence (using localStorage)
 * 3. Business Logic (Order calculation, ID generation)
 * 
 * In a production app, these methods would be `fetch('/api/orders')` calls.
 */

const DB_KEY = 'shopwithfriends_db_v1';

const DEFAULT_USER: UserProfile = {
  id: 'u1',
  name: 'Demo User',
  email: 'user@shopwithfriends.io',
  orders: []
};

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class MockDatabase {
  private user: UserProfile;

  constructor() {
    // Load from "Disk" (localStorage)
    const saved = localStorage.getItem(DB_KEY);
    if (saved) {
      this.user = JSON.parse(saved);
    } else {
      this.user = DEFAULT_USER;
    }
  }

  private save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.user));
  }

  /**
   * Simulate GET /api/user/orders
   */
  async getOrders(): Promise<Order[]> {
    await delay(800); // Simulate network latency
    return [...this.user.orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Simulate POST /api/checkout
   */
  async createOrder(cartItems: Product[]): Promise<Order> {
    await delay(1500); // Simulate processing payment

    const total = cartItems.reduce((sum, item) => sum + item.price, 0);
    
    const newOrder: Order = {
      id: `ord_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      items: cartItems,
      total,
      date: new Date().toISOString(),
      status: 'processing'
    };

    this.user.orders.push(newOrder);
    this.save();

    return newOrder;
  }

  /**
   * Simulate POST /api/auth/login
   */
  async getUser(): Promise<UserProfile> {
    await delay(500);
    return this.user;
  }
}

export const api = new MockDatabase();