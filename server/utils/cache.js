/**
 * Simple In-Memory Cache with TTL
 * Used for subscription status caching
 */

export class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }
  
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if not found/expired
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    
    return this.cache.get(key);
  }
  
  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds
   */
  set(key, value, ttlSeconds) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    // Set value
    this.cache.set(key, value);
    
    // Set expiration timer
    const timer = setTimeout(() => {
      this.invalidate(key);
    }, ttlSeconds * 1000);
    
    this.timers.set(key, timer);
  }
  
  /**
   * Invalidate (delete) a cache entry
   * @param {string} key - Cache key
   */
  invalidate(key) {
    // Clear timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    
    // Remove from cache
    this.cache.delete(key);
  }
  
  /**
   * Clear all cache entries
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }
  
  /**
   * Get cache size
   * @returns {number} Number of cached entries
   */
  size() {
    return this.cache.size;
  }
}


