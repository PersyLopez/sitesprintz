/**
 * Authentication Helper Functions for E2E Tests
 * Provides reusable authentication flows
 */

/**
 * Register a new user via UI
 * @param {import('@playwright/test').Page} page
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user info
 */
export async function registerUser(page, userData = {}) {
  const timestamp = Date.now();
  const user = {
    email: userData.email || `test${timestamp}@example.com`,
    password: userData.password || 'Test123!@#',
    name: userData.name || `Test User ${timestamp}`,
  };

  // Navigate to registration page
  await page.goto('/register');
  
  // Fill registration form
  await page.fill('input[name="email"], input[type="email"]', user.email);
  await page.fill('input[name="password"], input[type="password"]', user.password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  return user;
}

/**
 * Login an existing user via UI
 * @param {import('@playwright/test').Page} page
 * @param {Object} credentials - Login credentials
 * @returns {Promise<void>}
 */
export async function loginUser(page, credentials) {
  const { email, password } = credentials;

  // Navigate to login page
  await page.goto('/login');
  
  // Fill login form
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForURL(/dashboard/);
}

/**
 * Logout current user
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
export async function logoutUser(page) {
  // Click logout button (may be in dropdown or direct button)
  await page.click('[data-testid="logout"], button:has-text("Logout"), button:has-text("Log Out")');
  
  // Wait for redirect to home or login
  await page.waitForURL(/\/(login|)$/);
}

/**
 * Check if user is authenticated
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated(page) {
  // Check for presence of dashboard or user menu
  const dashboardLink = await page.locator('[href*="dashboard"]').count();
  const userMenu = await page.locator('[data-testid="user-menu"]').count();
  
  return dashboardLink > 0 || userMenu > 0;
}

/**
 * Register and login a new user (shortcut)
 * @param {import('@playwright/test').Page} page
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user info
 */
export async function registerAndLogin(page, userData = {}) {
  const user = await registerUser(page, userData);
  
  // Registration might auto-login, check first
  const authenticated = await isAuthenticated(page);
  
  if (!authenticated) {
    await loginUser(page, user);
  }
  
  return user;
}

/**
 * Get authentication token from storage/cookies
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string|null>}
 */
export async function getAuthToken(page) {
  // Try localStorage
  const localStorageToken = await page.evaluate(() => {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  });
  
  if (localStorageToken) {
    return localStorageToken;
  }
  
  // Try cookies
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(c => c.name === 'token' || c.name === 'authToken');
  
  return authCookie ? authCookie.value : null;
}

/**
 * Set authentication token directly (bypass UI login)
 * @param {import('@playwright/test').Page} page
 * @param {string} token
 * @returns {Promise<void>}
 */
export async function setAuthToken(page, token) {
  await page.evaluate((token) => {
    localStorage.setItem('token', token);
  }, token);
}

/**
 * Clear authentication (cookies and storage)
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
export async function clearAuth(page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  await page.context().clearCookies();
}

