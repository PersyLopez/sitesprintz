/**
 * Test Configuration - Single Source of Truth
 * 
 * Centralized configuration for E2E tests.
 * Eliminates magic values scattered across test files.
 */

/**
 * Base URLs for API and frontend
 */
export const URLS = {
  BASE: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  API: process.env.VITE_API_URL || 'http://localhost:3000'
};

/**
 * Timeout values (in milliseconds)
 */
export const TIMEOUTS = {
  /** Short timeout for quick operations (3s) */
  SHORT: 3000,
  /** Medium timeout for standard operations (5s) */
  MEDIUM: 5000,
  /** Long timeout for complex operations (10s) */
  LONG: 10000,
  /** Extended timeout for network-heavy operations (15s) */
  EXTENDED: 15000,
  /** API retry timeout (45s) */
  API_RETRY: 45000,
  /** Full test timeout (60s) */
  TEST: 60000
};

/**
 * Common selectors used across tests
 * Prefer data-testid where possible for stability
 */
export const SELECTORS = {
  // Auth selectors
  AUTH: {
    EMAIL_INPUT: '#email, input[name="email"], input[type="email"]',
    PASSWORD_INPUT: '#password, input[name="password"]',
    CONFIRM_PASSWORD: '#confirmPassword, input[name="confirmPassword"]',
    SUBMIT_BUTTON: 'button[type="submit"]',
    LOGIN_LINK: 'a[href="/login"], a[href="/login.html"]',
    REGISTER_LINK: 'a[href*="register"]'
  },

  // Dashboard selectors
  DASHBOARD: {
    WELCOME_MODAL: '.welcome-modal .btn-primary',
    CREATE_SITE_BUTTON: 'button:has-text("Create New Site"), a:has-text("Create New Site")',
    SITE_CARD: '.site-card, [data-site-id]'
  },

  // Template selectors
  TEMPLATE: {
    GRID: '.template-grid-container, .template-grid',
    CARD: '.template-card',
    SELECT_BUTTON: '.btn-select, button:has-text("Use Template")'
  },

  // Form selectors
  FORM: {
    ERROR_MESSAGE: '.form-error, .error-message, [role="alert"]',
    SUCCESS_MESSAGE: '.form-success, .success-message',
    LOADING_SPINNER: '.loading-spinner, .loading'
  },

  // Booking selectors
  BOOKING: {
    SERVICE_CARD: '[data-testid^="service-card-"]',
    TIME_SLOT: '[data-testid^="time-slot-"]',
    DATE_PICKER: '[data-testid="date-picker"]',
    NEXT_BUTTON: '[data-testid="next-button"]',
    BOOK_NOW: '[data-testid="book-now-button"]'
  },

  // Editor selectors
  EDITOR: {
    PANEL: '.editor-panel, .customize-panel',
    FORM: 'form#editorForm, .customize-layout form',
    BUSINESS_NAME: '#businessName',
    HERO_TITLE: '#heroTitle',
    HERO_SUBTITLE: '#heroSubtitle',
    PUBLISH_BUTTON: 'button[onclick="publishNow()"], button:has-text("🚀 Publish Site")'
  }
};

/**
 * API endpoint patterns
 */
export const API_PATTERNS = {
  CSRF: '/api/csrf-token',
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  RESET_PASSWORD: '/api/auth/reset-password',
  SITES: '/api/sites',
  DRAFTS: '/api/drafts',
  TEMPLATES: '/api/templates',
  BOOKING: '/api/booking'
};

/**
 * Test data patterns
 */
export const TEST_DATA = {
  /** Regex for confirmation codes */
  CONFIRMATION_CODE_PATTERN: /[A-Z0-9]{8}/,
  /** Regex for email validation */
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  /** Default party size for restaurant tests */
  DEFAULT_PARTY_SIZE: 4,
  /** Default service duration (minutes) */
  DEFAULT_SERVICE_DURATION: 30
};

export default {
  URLS,
  TIMEOUTS,
  SELECTORS,
  API_PATTERNS,
  TEST_DATA
};

