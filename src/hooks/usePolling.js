import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

/**
 * Custom hook for smart polling with visibility API and exponential backoff
 * 
 * @param {object} options - Polling options
 * @param {string} options.endpoint - API endpoint to poll
 * @param {number} options.interval - Polling interval in milliseconds (default: 30000)
 * @param {boolean} options.enabled - Whether polling is enabled (default: true)
 * @param {function} options.onUpdate - Callback when data changes
 * @param {string} options.compareKey - Key to detect changes (default: 'updatedAt')
 * @param {object} options.params - Query parameters for the request
 * @returns {object} { data, loading, error, lastUpdated, forceRefresh }
 */
export function usePolling({
  endpoint,
  interval = 30000,
  enabled = true,
  onUpdate,
  compareKey = 'updatedAt',
  params = {}
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const backoffDelayRef = useRef(interval);
  const lastDataRef = useRef(null);
  const isVisibleRef = useRef(!document.hidden);
  const abortControllerRef = useRef(null);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      
      // Resume polling when page becomes visible
      if (!document.hidden && enabled) {
        forceRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (enabled) {
        forceRefresh();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled]);

  // Fetch data function
  const fetchData = useCallback(async (isManualRefresh = false) => {
    // Don't poll if page is hidden (unless manual refresh)
    if (!isManualRefresh && !isVisibleRef.current) {
      return;
    }

    // Don't poll if offline
    if (!isOnline) {
      setError('You are currently offline');
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setError(null);
      if (isManualRefresh) {
        setLoading(true);
      }

      const response = await api.get(endpoint, {
        params,
        signal: abortControllerRef.current.signal
      });

      const newData = response.data || response;

      // Check if data has changed
      const hasChanged = !lastDataRef.current || 
        (compareKey && newData[compareKey] !== lastDataRef.current[compareKey]) ||
        (!compareKey && JSON.stringify(newData) !== JSON.stringify(lastDataRef.current));

      if (hasChanged) {
        setData(newData);
        setLastUpdated(new Date());
        lastDataRef.current = newData;

        // Call onUpdate callback if provided
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate(newData, lastDataRef.current);
        }

        // Reset backoff on successful update
        backoffDelayRef.current = interval;
      }

      setLoading(false);
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED' || err.originalError?.name === 'AbortError') {
        return;
      }

      setError(err.message || 'Failed to fetch data');
      setLoading(false);

      // Exponential backoff on error
      if (!isManualRefresh) {
        backoffDelayRef.current = Math.min(
          backoffDelayRef.current * 2,
          interval * 8 // Max 8x the normal interval
        );
      }
    }
  }, [endpoint, interval, onUpdate, compareKey, params, isOnline]);

  // Manual refresh function
  const forceRefresh = useCallback(() => {
    backoffDelayRef.current = interval; // Reset backoff
    fetchData(true);
  }, [fetchData, interval]);

  // Initial fetch
  useEffect(() => {
    if (enabled && endpoint) {
      fetchData(true);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, endpoint]); // Only run on mount or when endpoint changes

  // Set up polling interval
  useEffect(() => {
    if (!enabled || !endpoint) {
      return;
    }

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Use dynamic interval based on backoff
    const scheduleNextPoll = () => {
      timeoutRef.current = setTimeout(() => {
        if (enabled && isVisibleRef.current && isOnline) {
          fetchData(false);
        }
        scheduleNextPoll();
      }, backoffDelayRef.current);
    };

    scheduleNextPoll();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, endpoint, fetchData, isOnline]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    forceRefresh,
    isOnline
  };
}

export default usePolling;



