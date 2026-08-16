/**
 * Polling Service
 * Centralized polling manager to prevent duplicate requests and coordinate intervals
 */

class PollingService {
  constructor() {
    this.activePolls = new Map();
    this.requestCache = new Map();
    this.CACHE_TTL = 5000; // 5 seconds cache to prevent duplicate requests
  }

  /**
   * Register a polling request
   * @param {string} key - Unique key for this poll
   * @param {function} fetchFn - Function to fetch data
   * @param {number} interval - Polling interval
   */
  register(key, fetchFn, interval = 30000) {
    // Cancel existing poll if any
    this.unregister(key);

    const poll = {
      fetchFn,
      interval,
      timer: null,
      lastFetch: null
    };

    // Start polling
    const execute = async () => {
      const cacheKey = `${key}_${Date.now()}`;
      const now = Date.now();

      // Check cache
      if (this.requestCache.has(key)) {
        const cached = this.requestCache.get(key);
        if (now - cached.timestamp < this.CACHE_TTL) {
          return cached.data;
        }
      }

      try {
        const data = await fetchFn();
        this.requestCache.set(key, {
          data,
          timestamp: now
        });

        // Clean up old cache entries
        this.cleanupCache();

        poll.lastFetch = now;
        return data;
      } catch (error) {
        console.error(`Polling error for ${key}:`, error);
        throw error;
      }
    };

    // Initial fetch
    execute();

    // Set up interval
    poll.timer = setInterval(execute, interval);

    this.activePolls.set(key, poll);
  }

  /**
   * Unregister a polling request
   * @param {string} key - Unique key for this poll
   */
  unregister(key) {
    const poll = this.activePolls.get(key);
    if (poll && poll.timer) {
      clearInterval(poll.timer);
    }
    this.activePolls.delete(key);
    this.requestCache.delete(key);
  }

  /**
   * Get cached data for a key
   * @param {string} key - Unique key
   * @returns {any} Cached data or null
   */
  getCached(key) {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  /**
   * Clean up old cache entries
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, cached] of this.requestCache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL * 2) {
        this.requestCache.delete(key);
      }
    }
  }

  /**
   * Stop all polling
   */
  stopAll() {
    for (const key of this.activePolls.keys()) {
      this.unregister(key);
    }
  }
}

// Singleton instance
const pollingService = new PollingService();

export default pollingService;



