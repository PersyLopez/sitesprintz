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
  }
};

/**
 * Generate a unique test email for registration tests
 * @returns {string} Unique email address
 */
export function generateTestEmail(prefix = 'test') {
  return `${prefix}${Date.now()}@example.com`;
}

/**
 * Get credentials for a specific user type
 * @param {'ADMIN' | 'PRO_USER' | 'FREE_USER' | 'GROWTH_USER'} userType 
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
  generateTestEmail,
  getTestUser
};




