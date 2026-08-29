/**
 * Test Credentials - Single Source of Truth
 * 
 * All test user credentials in one place.
 * Passwords meet security requirements: 12+ chars, upper, lower, number, special.
 */

/**
 * Strong password that meets all validation requirements
 * - Minimum 12 characters
 * - Contains uppercase
 * - Contains lowercase  
 * - Contains number
 * - Contains special character
 */
export const STRONG_PASSWORD = 'SecurePass!2024';

/**
 * Test user credentials for different roles/plans
 */
export const TEST_USERS = {
  ADMIN: {
    email: 'admin@example.com',
    password: 'AdminPass!2024',
    role: 'admin',
    plan: 'pro'
  },
  PRO_USER: {
    email: 'test@example.com',
    password: 'SecurePass!2024',
    role: 'user',
    plan: 'pro'
  },
  FREE_USER: {
    email: 'free@example.com',
    password: 'FreePass!2024',
    role: 'user',
    plan: 'free'
  },
  GROWTH_USER: {
    email: 'growth@example.com',
    password: 'GrowthPass!2024',
    role: 'user',
    plan: 'growth'
  },
  STARTER_USER: {
    email: 'starter@example.com',
    password: 'StarterPass!2024',
    role: 'user',
    plan: 'starter'
  },
  GALLERY: {
    email: 'gallery@sitesprintz.com',
    password: 'GalleryDemo123!',
    role: 'user',
    plan: 'growth'
  },
  STAFF: {
    email: 'staff@example.com',
    password: 'StaffPass!2024',
    role: 'user',
    plan: 'starter'
  },
  STAFF_LIMITED: {
    email: 'staff-limited@example.com',
    password: 'StaffLimited!2024',
    role: 'user',
    plan: 'starter'
  }
};

/** Accounts agents and E2E must log in with. Do not register these through Turnstile. */
export const AGENT_TESTERS = Object.values(TEST_USERS);

/**
 * Generate a unique test email for registration tests
 * @returns {string} Unique email address
 */
export function generateTestEmail(prefix = 'test') {
  return `${prefix}${Date.now()}@example.com`;
}

/**
 * Get credentials for a specific user type
 * @param {'ADMIN' | 'PRO_USER' | 'FREE_USER' | 'GROWTH_USER' | 'STARTER_USER' | 'GALLERY' | 'STAFF' | 'STAFF_LIMITED'} userType 
 * @returns {object} User credentials
 */
export function getTestUser(userType) {
  const user = TEST_USERS[userType];
  if (!user) {
    throw new Error(`Unknown user type: ${userType}. Valid types: ${Object.keys(TEST_USERS).join(', ')}`);
  }
  return user;
}

export default {
  STRONG_PASSWORD,
  TEST_USERS,
  AGENT_TESTERS,
  generateTestEmail,
  getTestUser
};




