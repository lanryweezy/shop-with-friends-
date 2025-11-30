import Redis from 'ioredis';
import { nanoid } from 'nanoid';

class SessionManager {
    constructor() {
        // Initialize storage with Redis and in-memory fallback
        this.useRedis = false;
        this.sessions = new Map(); // In-memory fallback
        this.participants = new Map(); // sessionId -> Set of userIds
        this.userNames = new Map(); // sessionId_userId -> userName

        // Try to connect to Redis
        try {
            this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
                retryStrategy: () => null, // Don't retry
                maxRetriesPerRequest: 1,
                lazyConnect: true
            });

            // Attempt connection
            this.redis.connect().then(() => {
                console.log('✅ Redis connected - using Redis for session storage');
                this.useRedis = true;
            }).catch(() => {
                console.log('⚠️  Redis unavailable - using in-memory storage (development mode)');
                this.useRedis = false;
            });

            this.redis.on('error', (err) => {
                // Silently fall back to in-memory
            });
        } catch (error) {
            console.log('⚠️  Redis not available - using in-memory storage');
        }

        // Session expiration time (30 minutes)
        this.SESSION_TTL = 30 * 60; // seconds
    }

    /**
     * Create a new shopping session
     */
    async createSession(hostUserId, metadata = {}) {
        const sessionId = `sess_${nanoid(10)}`;

        const session = {
            id: sessionId,
            host: hostUserId,
            participants: [hostUserId],
            metadata,
            createdAt: Date.now(),
            expiresAt: Date.now() + (this.SESSION_TTL * 1000)
        };

        if (this.useRedis) {
            // Store in Redis
            await this.redis.setex(
                `session:${sessionId}`,
                this.SESSION_TTL,
                JSON.stringify(session)
            );
            await this.redis.sadd(`session:${sessionId}:participants`, hostUserId);
        } else {
            // Store in memory
            this.sessions.set(sessionId, session);
            this.participants.set(sessionId, new Set([hostUserId]));
        }

        console.log(`📝 Session created: ${sessionId}`);
        return session;
    }

    /**
     * Get session by ID
     */
    async getSession(sessionId) {
        if (this.useRedis) {
            const sessionData = await this.redis.get(`session:${sessionId}`);
            return sessionData ? JSON.parse(sessionData) : null;
        } else {
            return this.sessions.get(sessionId) || null;
        }
    }

    /**
     * Add participant to session
     */
    async addParticipant(sessionId, userId, userName = null) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        session.participants.push(userId);

        if (this.useRedis) {
            await this.redis.setex(
                `session:${sessionId}`,
                this.SESSION_TTL,
                JSON.stringify(session)
            );
            await this.redis.sadd(`session:${sessionId}:participants`, userId);
            if (userName) {
                await this.redis.hset(`session:${sessionId}:users`, userId, userName);
            }
        } else {
            this.sessions.set(sessionId, session);
            if (!this.participants.has(sessionId)) {
                this.participants.set(sessionId, new Set());
            }
            this.participants.get(sessionId).add(userId);
            if (userName) {
                this.userNames.set(`${sessionId}_${userId}`, userName);
            }
        }

        console.log(`👤 User ${userId} joined session ${sessionId}`);
        return session;
    }

    /**
     * Remove participant from session
     */
    async removeParticipant(sessionId, userId) {
        const session = await this.getSession(sessionId);
        if (!session) return;

        session.participants = session.participants.filter(p => p !== userId);

        if (session.participants.length === 0) {
            await this.deleteSession(sessionId);
        } else {
            if (this.useRedis) {
                await this.redis.setex(
                    `session:${sessionId}`,
                    this.SESSION_TTL,
                    JSON.stringify(session)
                );
                await this.redis.srem(`session:${sessionId}:participants`, userId);
                await this.redis.hdel(`session:${sessionId}:users`, userId);
            } else {
                this.sessions.set(sessionId, session);
                this.participants.get(sessionId)?.delete(userId);
                this.userNames.delete(`${sessionId}_${userId}`);
            }
        }

        console.log(`👋 User ${userId} left session ${sessionId}`);
    }

    /**
     * Get all participants in a session
     */
    async getParticipants(sessionId) {
        if (this.useRedis) {
            const userIds = await this.redis.smembers(`session:${sessionId}:participants`);
            const userNames = await this.redis.hgetall(`session:${sessionId}:users`);
            return userIds.map(userId => ({
                userId,
                userName: userNames[userId] || 'Anonymous'
            }));
        } else {
            const userIds = Array.from(this.participants.get(sessionId) || []);
            return userIds.map(userId => ({
                userId,
                userName: this.userNames.get(`${sessionId}_${userId}`) || 'Anonymous'
            }));
        }
    }

    /**
     * Delete session
     */
    async deleteSession(sessionId) {
        if (this.useRedis) {
            await this.redis.del(`session:${sessionId}`);
            await this.redis.del(`session:${sessionId}:participants`);
            await this.redis.del(`session:${sessionId}:users`);
        } else {
            this.sessions.delete(sessionId);
            this.participants.delete(sessionId);
            // Clean up user names
            for (const key of this.userNames.keys()) {
                if (key.startsWith(`${sessionId}_`)) {
                    this.userNames.delete(key);
                }
            }
        }
        console.log(`🗑️  Session deleted: ${sessionId}`);
    }

    /**
     * Refresh session TTL (extend expiration)
     */
    async refreshSession(sessionId) {
        if (this.useRedis) {
            await this.redis.expire(`session:${sessionId}`, this.SESSION_TTL);
            await this.redis.expire(`session:${sessionId}:participants`, this.SESSION_TTL);
            await this.redis.expire(`session:${sessionId}:users`, this.SESSION_TTL);
        }
        // In-memory sessions don't auto-expire in this implementation
    }

    /**
     * Generate invite link for session
     */
    generateInviteLink(sessionId, baseUrl = process.env.APP_URL) {
        return `${baseUrl}/join/${sessionId}`;
    }

    /**
     * Close connection
     */
    async close() {
        if (this.useRedis) {
            await this.redis.quit();
        }
    }
}

export default SessionManager;
