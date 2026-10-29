/**
 * Redis Utility
 * 
 * Provides Redis client for caching and state management.
 * Falls back to in-memory store if Redis is not available.
 */

// In-memory fallback store
const memoryStore = new Map();

/**
 * Get Redis client (or memory fallback)
 * @returns {object} Redis-like client
 */
function getRedisClient() {
  // Try to use real Redis if available
  if (process.env.REDIS_URL) {
    try {
      const redis = require('redis');
      const client = redis.createClient({ url: process.env.REDIS_URL });
      return client;
    } catch (error) {
      console.warn('Redis not available, using in-memory store');
    }
  }

  // Fallback to in-memory store
  return {
    get: async (key) => {
      const item = memoryStore.get(key);
      if (!item) return null;
      
      // Check expiration
      if (item.expiresAt && Date.now() > item.expiresAt) {
        memoryStore.delete(key);
        return null;
      }
      
      return item.value;
    },
    
    setex: async (key, seconds, value) => {
      memoryStore.set(key, {
        value,
        expiresAt: Date.now() + (seconds * 1000)
      });
      return 'OK';
    },

    /**
     * Set only if missing. Returns 1 when this caller won, 0 when the key exists.
     * Used for payment fulfillment claims.
     */
    setnx: async (key, value) => {
      const existing = memoryStore.get(key);
      if (existing && (!existing.expiresAt || Date.now() <= existing.expiresAt)) {
        return 0;
      }
      memoryStore.set(key, { value, expiresAt: null });
      return 1;
    },

    expire: async (key, seconds) => {
      const existing = memoryStore.get(key);
      if (!existing) return 0;
      existing.expiresAt = Date.now() + (seconds * 1000);
      memoryStore.set(key, existing);
      return 1;
    },
    
    del: async (key) => {
      memoryStore.delete(key);
      return 1;
    },
    
    ttl: async (key) => {
      const item = memoryStore.get(key);
      if (!item || !item.expiresAt) return -1;
      const remaining = Math.floor((item.expiresAt - Date.now()) / 1000);
      return remaining > 0 ? remaining : -1;
    }
  };
}

// Singleton instance
let redisClientInstance = null;

export function getRedis() {
  if (!redisClientInstance) {
    redisClientInstance = getRedisClient();
  }
  return redisClientInstance;
}

export default getRedis();

