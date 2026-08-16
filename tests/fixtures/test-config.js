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
    CREATE_SITE_BUTTON: '[data-testid="create-site-button"], [data-testid="create-first-site-button"]',
    SITE_CARD: '[data-testid="site-card"]',
    EDIT_BUTTON: '[data-testid="edit-site-button"]',
    DELETE_BUTTON: '[data-testid="delete-site-button"]',
    VIEW_BUTTON: '[data-testid="view-site-button"]'
  },

  // Template selectors (setup page uses TemplateGrid with data-template attributes)
  TEMPLATE: {
    GRID: '[data-testid="template-grid"], .template-grid-container, .templates-panel',
    CARD: '[data-testid="template-card"], [data-template], .template-card',
    SELECT_BUTTON: 'button:has-text("Use Template"), button:has-text("Select"), [data-testid="select-template-button"]'
  },

  // Form selectors
  FORM: {
    ERROR_MESSAGE: '[data-testid="publish-error-message"], .form-error, .error-message, [role="alert"]',
    SUCCESS_MESSAGE: '[data-testid="success-heading"], .form-success, .success-message',
    LOADING_SPINNER: '.loading-spinner, .loading'
  },

  // Booking selectors
  BOOKING: {
    SERVICE_CARD: '[data-testid^="service-card-"]',
    TIME_SLOT: '[data-testid^="time-slot-"]',
    DATE_PICKER: '[data-testid="date-picker"]',
    NEXT_BUTTON: '[data-testid="next-button"]',
    BOOK_NOW: '[data-testid="book-now-button"]',
    // Business mode selectors
    STAFF_SELECTION_STEP: '[data-testid="staff-selection-step"]',
    NO_PREFERENCE_OPTION: '[data-testid="no-preference-option"]',
    STAFF_CARD: '.staff-card',
    STAFF_CARD_SELECTED: '.staff-card.selected',
    STAFF_GRID: '.staff-grid',
    STAFF_DIVIDER: '.staff-divider'
  },

  // Business Mode Configuration selectors
  BUSINESS_MODE: {
    CONFIG: '[data-testid="business-mode-config"]',
    MODE_CARD_SOLO: '[data-testid="mode-card-solo"]',
    MODE_CARD_TEAM: '[data-testid="mode-card-team"]',
    MODE_CARD_HYBRID: '[data-testid="mode-card-hybrid"]',
    STAFF_SELECTION_TOGGLE: '[data-testid="staff-selection-toggle"]',
    NO_PREFERENCE_TOGGLE: '[data-testid="no-preference-toggle"]',
    NO_PREFERENCE_TEXT_INPUT: '[data-testid="no-preference-text-input"]',
    MIGRATE_BUTTON: '[data-testid="migrate-button"]',
    CONFIG_ERROR: '[data-testid="config-error"]',
    CONFIG_SUCCESS: '[data-testid="config-success"]',
    MODE_SUGGESTION: '[data-testid="mode-suggestion"]'
  },

  // Editor selectors
  EDITOR: {
    PANEL: '[data-testid="customize-panel"]',
    FORM: 'form#editorForm, .customize-layout form',
    BUSINESS_NAME: '[data-testid="business-name-input"]',
    HERO_TITLE: '[data-testid="hero-title-input"]',
    HERO_SUBTITLE: '[data-testid="hero-subtitle-input"]',
    PUBLISH_BUTTON: '[data-testid="publish-site-button"]'
  },

  // Header/Navigation selectors
  HEADER: {
    LOGO: '[data-testid="header-logo"]',
    DESKTOP_NAV: '[data-testid="desktop-nav"]',
    MOBILE_NAV: '[data-testid="mobile-nav"]',
    MOBILE_TOGGLE: '[data-testid="mobile-menu-toggle"]',
    NAV_DASHBOARD: '[data-testid="nav-dashboard"]',
    NAV_CREATE_SITE: '[data-testid="nav-create-site"]',
    NAV_LOGIN: '[data-testid="nav-login"]',
    NAV_LOGOUT: '[data-testid="nav-logout-button"]',
    NAV_GET_STARTED: '[data-testid="nav-get-started"]',
    USER_NAME: '[data-testid="user-name"]'
  },

  // Product modal selectors
  PRODUCT: {
    MODAL_OVERLAY: '[data-testid="product-modal-overlay"]',
    MODAL_CONTENT: '[data-testid="product-modal-content"]',
    CLOSE_BUTTON: '[data-testid="close-modal-btn"]',
    NAME_INPUT: '[data-testid="product-name-input"]',
    DESCRIPTION_INPUT: '[data-testid="product-description-input"]',
    PRICE_INPUT: '[data-testid="product-price-input"]',
    CATEGORY_INPUT: '[data-testid="product-category-input"]',
    IMAGE_INPUT: '[data-testid="product-image-input"]',
    AVAILABLE_CHECKBOX: '[data-testid="product-available-checkbox"]',
    CANCEL_BUTTON: '[data-testid="cancel-product-btn"]',
    SAVE_BUTTON: '[data-testid="save-product-btn"]'
  },

  // Shopping cart selectors
  CART: {
    TOGGLE_BUTTON: '[data-testid="cart-toggle-button"]',
    ITEM_COUNT: '[data-testid="cart-item-count"]',
    SIDEBAR: '[data-testid="cart-sidebar"]',
    OVERLAY: '[data-testid="cart-overlay"]',
    PANEL: '[data-testid="cart-panel"]',
    CLOSE_BUTTON: '[data-testid="cart-close-button"]',
    ITEMS_CONTAINER: '[data-testid="cart-items-container"]',
    EMPTY_STATE: '[data-testid="cart-empty-state"]',
    ITEM: '[data-testid="cart-item"]',
    ITEM_NAME: '[data-testid="cart-item-name"]',
    ITEM_PRICE: '[data-testid="cart-item-price"]',
    ITEM_QUANTITY: '[data-testid="cart-item-quantity"]',
    ITEM_INCREASE: '[data-testid="cart-item-increase-qty"]',
    ITEM_DECREASE: '[data-testid="cart-item-decrease-qty"]',
    ITEM_REMOVE: '[data-testid="cart-item-remove"]',
    CLEAR_BUTTON: '[data-testid="clear-cart-button"]',
    FOOTER: '[data-testid="cart-footer"]',
    TOTAL: '[data-testid="cart-total"]',
    TOTAL_AMOUNT: '[data-testid="cart-total-amount"]',
    CONTINUE_SHOPPING: '[data-testid="continue-shopping-button"]'
  },

  // Checkout selectors
  CHECKOUT: {
    BUTTON: '[data-testid="checkout-button"]',
    CONTAINER: '[data-testid="checkout-button-container"]',
    SPINNER: '[data-testid="checkout-spinner"]',
    ERROR: '[data-testid="checkout-error"]',
    STRIPE_ERROR: '[data-testid="checkout-stripe-error"]',
    STRIPE_WARNING: '[data-testid="checkout-stripe-warning"]',
    UPGRADE_NOTICE: '[data-testid="checkout-upgrade-notice"]',
    UPGRADE_LINK: '[data-testid="upgrade-to-pro-link"]'
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


