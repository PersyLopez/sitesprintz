/**
 * Reliability Patterns for Payment Processing
 * 
 * Implements retry logic with exponential backoff and circuit breaker pattern
 * to handle transient failures and prevent cascading failures.
 */

const TRANSIENT_ERRORS = [
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ENOTFOUND',
  'rate_limit',
  '429',
  '503',
  '504',
  'SERVICE_UNAVAILABLE',
  'TIMEOUT'
];

/**
 * Check if error is transient (should retry)
 * @param {Error} error - Error to check
 * @returns {boolean} True if error is transient
 */
function isTransientError(error) {
  if (!error) return false;

  const errorMessage = error.message || '';
  const errorCode = error.code || '';

  return TRANSIENT_ERRORS.some(transient => 
    errorMessage.includes(transient) || 
    errorCode === transient ||
    String(errorCode) === transient
  );
}

/**
 * Retry operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in milliseconds (default: 100)
 * @returns {Promise<any>} Result of operation
 */
export async function withRetry(operation, options = {}) {
  const { maxRetries = 3, baseDelay = 100 } = options;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isTransient = isTransientError(error);
      const isLastAttempt = attempt === maxRetries - 1;
      
      // Don't retry if error is not transient or this is the last attempt
      if (!isTransient || isLastAttempt) {
        throw error;
      }
      
      // Exponential backoff: delay = baseDelay * 2^attempt
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Circuit Breaker Pattern
 * 
 * Prevents cascading failures by opening circuit after threshold failures.
 * States: CLOSED -> OPEN -> HALF_OPEN -> CLOSED
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 60 seconds
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.successCount = 0; // For half-open state
  }

  /**
   * Execute operation through circuit breaker
   * @param {Function} operation - Async function to execute
   * @returns {Promise<any>} Result of operation
   */
  async execute(operation) {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now >= this.nextAttemptTime) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      
      // Success - reset failure count
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure - increment failure count
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      // Success in half-open state - close circuit
      this.state = 'CLOSED';
      this.successCount = 0;
    }
  }

  /**
   * Handle failed operation
   */
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Failure in half-open state - reopen circuit
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.recoveryTimeout;
    } else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      // Threshold reached - open circuit
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.recoveryTimeout;
    }
  }

  /**
   * Get current circuit state
   * @returns {string} Current state
   */
  getState() {
    return this.state;
  }

  /**
   * Reset circuit breaker (for testing)
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.successCount = 0;
  }
}

export default {
  withRetry,
  CircuitBreaker
};


