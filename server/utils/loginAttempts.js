/**
 * Login Attempts Tracking System
 * 
 * Implements brute-force protection by tracking failed login attempts
 * and temporarily locking accounts after too many failures.
 * 
 * Features:
 * - Track failed login attempts by email + IP combination
 * - Auto-lock accounts after 5 failed attempts
 * - 15-minute lockout period
 * - Case-insensitive email handling
 * - Separate tracking per IP address
 * - Admin functions to view/unlock accounts
 * 
 * Implementation: In-memory Map (use Redis in production for multi-server)
 * 
 * Created as part of P0-2: TDD Implementation (GREEN phase)
 */

// Configuration
const CONFIG = {
  maxAttempts: 5,
  lockDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
  lockDurationMinutes: 15,
  attemptWindow: 60 * 60 * 1000, // 60 minutes in milliseconds  
  attemptWindowMinutes: 60
};

// In-memory storage: Map<string, AttemptData>
// Key format: "email:ip" (email lowercased)
// AttemptData: { count, firstAttempt, lastAttempt, lockedUntil }
const attempts = new Map();

/**
 * Generate storage key from email and IP
 * Email is normalized to lowercase for case-insensitive matching
 */
function getKey(email, ip) {
  return `${email.toLowerCase()}:${ip}`;
}

/**
 * Track a failed login attempt
 * 
 * @param {string} email - User email (case-insensitive)
 * @param {string} ip - IP address
 * @returns {Object} - { count, firstAttempt, lastAttempt, lockedUntil }
 */
export function trackFailedLogin(email, ip) {
  const key = getKey(email, ip);
  const now = Date.now();
  
  let data = attempts.get(key);
  
  if (!data) {
    // First failed attempt
    data = {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
      lockedUntil: null
    };
  } else {
    // Increment count
    data.count++;
    data.lastAttempt = now;
    
    // Lock account if reached max attempts
    if (data.count >= CONFIG.maxAttempts) {
      data.lockedUntil = now + CONFIG.lockDuration;
    }
  }
  
  attempts.set(key, data);
  return data;
}

/**
 * Check if an account is currently locked
 * 
 * @param {string} email - User email
 * @param {string} ip - IP address
 * @returns {boolean|Object} - false if not locked, or object with lock details
 */
export function isAccountLocked(email, ip) {
  const key = getKey(email, ip);
  const data = attempts.get(key);
  
  if (!data || !data.lockedUntil) {
    return false;
  }
  
  const now = Date.now();
  
  // Check if lock has expired
  if (now >= data.lockedUntil) {
    // Lock expired, clear the data
    attempts.delete(key);
    return false;
  }
  
  // Account is locked
  const remainingTime = data.lockedUntil - now;
  const remainingMinutes = Math.ceil(remainingTime / (60 * 1000));
  
  return {
    locked: true,
    remainingTime,
    remainingMinutes,
    attempts: data.count
  };
}

/**
 * Clear failed login attempts for an email/IP combination
 * Called on successful login to reset the counter
 * 
 * @param {string} email - User email
 * @param {string} ip - IP address
 */
export function clearFailedAttempts(email, ip) {
  const key = getKey(email, ip);
  attempts.delete(key);
}

/**
 * Clear all failed login attempts (for testing or admin purposes)
 */
export function clearAllAttempts() {
  attempts.clear();
}

/**
 * Get the count of failed attempts for an email/IP combination
 * 
 * @param {string} email - User email
 * @param {string} ip - IP address
 * @returns {number} - Number of failed attempts
 */
export function getAttemptCount(email, ip) {
  const key = getKey(email, ip);
  const data = attempts.get(key);
  return data ? data.count : 0;
}

/**
 * Get remaining attempts before account lockout
 * 
 * @param {string} email - User email
 * @param {string} ip - IP address
 * @returns {number} - Remaining attempts (0 if locked)
 */
export function getRemainingAttempts(email, ip) {
  const count = getAttemptCount(email, ip);
  const remaining = CONFIG.maxAttempts - count;
  return Math.max(0, remaining);
}

/**
 * Get list of all currently locked accounts
 * Useful for admin dashboards
 * 
 * @returns {Array} - Array of locked account objects
 */
export function getLockedAccounts() {
  const now = Date.now();
  const locked = [];
  
  for (const [key, data] of attempts.entries()) {
    if (data.lockedUntil && data.lockedUntil > now) {
      const [email, ip] = key.split(':');
      const remainingTime = data.lockedUntil - now;
      const remainingMinutes = Math.ceil(remainingTime / (60 * 1000));
      
      locked.push({
        email,
        ip,
        attempts: data.count,
        lockedUntil: data.lockedUntil,
        remainingMinutes
      });
    }
  }
  
  return locked;
}

/**
 * Manually unlock an account
 * Admin function to override automatic locks
 * 
 * @param {string} email - User email
 * @param {string} ip - (Optional) Specific IP to unlock, or all IPs if omitted
 */
export function unlockAccount(email, ip = null) {
  if (ip) {
    // Unlock specific email/IP combination
    clearFailedAttempts(email, ip);
  } else {
    // Unlock all IPs for this email
    const emailLower = email.toLowerCase();
    const keysToDelete = [];
    
    for (const key of attempts.keys()) {
      if (key.startsWith(emailLower + ':')) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => attempts.delete(key));
  }
}

/**
 * Get current configuration
 * 
 * @returns {Object} - Configuration object
 */
export function getConfig() {
  return { ...CONFIG };
}

