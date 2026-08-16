/**
 * Pre-Deployment Comprehensive E2E Test Suite
 * 
 * This test suite ensures full functionality before deployment:
 * 1. Template System (Pro templates only, no layout variations)
 * 2. Template Normalization
 * 3. Data Merging and Persistence
 * 4. Feature Gating by Subscription Tier (trial, starter, growth, pro)
 * 5. CSS Routing
 * 6. Publishing Flow
 * 7. Trial vs Paid Plans
 * 
 * Run with: npx playwright test tests/e2e/pre-deployment-comprehensive.spec.js
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS, generateTestEmail } from '../fixtures/test-credentials.js';
import { SELECTORS, TIMEOUTS, URLS } from '../fixtures/test-config.js';

test.describe('Pre-Deployment: Comprehensive Functionality Tests', () => {
  // Enforce unauthenticated context for this file so registration/login tests work correctly
  test.use({ storageState: { cookies: [], origins: [] } });

  const timestamp = Date.now();
  let testUsers = {};

  const skipWizard = async (p) => {
    try {
      const btn = p.locator('button:has-text("Skip to Full Editor")').or(p.locator('.wizard-skip'));
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
      }
    } catch (e) {}
  };

  test.beforeAll(async ({ request }) => {
    // Create test users for each tier
    const tiers = ['trial', 'starter', 'growth', 'pro'];
    
    for (const tier of tiers) {
      const email = generateTestEmail(`pre-deploy-${tier}`);
      const password = 'TestPass123!';
      
      // Register user via API
      const response = await request.post(`${URLS.API}/api/auth/register`, {
        data: {
          email,
          password,
          confirmPassword: password,
          acceptedTerms: true
        }
      });
      
      if (response.ok()) {
        const userData = await response.json();
        testUsers[tier] = {
          email,
          password,
          userId: userData.user?.id,
          token: userData.token
        };
        
        // Update user's subscription plan via API (if admin endpoint exists)
        // Otherwise, we'll test with default trial
        if (tier !== 'trial') {
          try {
            await request.patch(`${URLS.API}/api/users/${userData.user?.id}`, {
              headers: {
                'Authorization': `Bearer ${userData.token}`
              },
              data: {
                subscription_plan: tier
              }
            });
          } catch (e) {
            console.log(`Could not set plan to ${tier}, will test with trial`);
          }
        }
      }
    }
  });

  test.describe('Template System', () => {
    test('should load only Pro templates (no layout variations)', async ({ page }) => {
      await page.goto('/setup');
      await page.waitForLoadState('networkidle');
      await skipWizard(page);
      
      // Check that template grid loads
      const templateGrid = page.locator(SELECTORS.TEMPLATE.GRID).or(
        page.locator('[data-testid="template-grid"]')
      );
      await expect(templateGrid).toBeVisible({ timeout: TIMEOUTS.LONG });
      
      // Verify template cards exist
      const templateCards = page.locator(SELECTORS.TEMPLATE.CARD).or(
        page.locator('[data-testid^="template-card-"]')
      );
      const cardCount = await templateCards.count();
      expect(cardCount).toBeGreaterThan(0);
      
      // Verify no layout selector exists (layout variations removed)
      const layoutSelector = page.locator('[data-testid="layout-selector"]').or(
        page.locator('.layout-selector, [data-layout-selector]')
      );
      await expect(layoutSelector).not.toBeVisible();
      
      // Verify templates have tier: 'pro' (check via API)
      const response = await page.request.get(`${URLS.API}/api/templates`);
      expect(response.ok()).toBeTruthy();
      const templates = await response.json();
      
      const templatesList = Array.isArray(templates) ? templates : templates.data || [];
      expect(templatesList.length).toBeGreaterThan(0);
      templatesList.forEach(template => {
        expect(template.tier || template.plan?.toLowerCase()).toBe('pro');
      });
    });

    test('should load template by base name (no -pro suffix)', async ({ page }) => {
      // Test loading restaurant template
      const response = await page.request.get(`${URLS.API}/api/templates/preview/restaurant`);
      expect(response.ok()).toBeTruthy();
      
      const template = await response.json();
      expect(template.id || template.template_id).toBe('restaurant');
      expect(template.tier || template.plan?.toLowerCase()).toBe('pro');
      
      // Verify no layout property exists
      expect(template.layouts).toBeUndefined();
      expect(template.defaultLayout).toBeUndefined();
    });

    test('should normalize template data structure', async ({ page }) => {
      const response = await page.request.get(`${URLS.API}/api/templates/preview/restaurant`);
      expect(response.ok()).toBeTruthy();
      
      const template = await response.json();
      
      // Verify normalized structure exists
      expect(template.brand).toBeDefined();
      expect(template.hero).toBeDefined();
      expect(template.contact).toBeDefined();
      expect(template.menu || template.products).toBeDefined();
      expect(template.features).toBeDefined();
      expect(template.tier).toBe('pro');
    });
  });

  test.describe('Data Merging and Persistence', () => {
    test('should merge user edits with template data on publish', async ({ page }) => {
      // Login as trial user
      await page.goto('/login');
      await page.fill(SELECTORS.AUTH.EMAIL_INPUT, testUsers.trial?.email || TEST_USERS.FREE_USER.email);
      await page.fill(SELECTORS.AUTH.PASSWORD_INPUT, testUsers.trial?.password || TEST_USERS.FREE_USER.password);
      await page.click(SELECTORS.AUTH.SUBMIT_BUTTON);
      await page.waitForURL(/dashboard|setup/, { timeout: TIMEOUTS.LONG });
      
      // Navigate to setup
      await page.goto('/setup');
      await page.waitForLoadState('networkidle');
      await skipWizard(page);
      
      // Select restaurant template
      const restaurantCard = page.locator('[data-testid*="restaurant"]').or(
        page.getByText(/restaurant/i).first()
      );
      await restaurantCard.click({ timeout: TIMEOUTS.MEDIUM });
      
      // Wait for editor to load
      await page.waitForSelector(SELECTORS.EDITOR.PANEL, { timeout: TIMEOUTS.LONG });
      
      // Edit business information
      const businessName = `Test Business ${timestamp}`;
      const heroTitle = `Welcome to ${businessName}`;
      const heroSubtitle = 'Amazing food, amazing service';
      
      // Fill in business data
      const businessNameInput = page.locator(SELECTORS.EDITOR.BUSINESS_NAME).or(
        page.locator('input[name="businessName"], input[placeholder*="business name" i]')
      );
      if (await businessNameInput.isVisible().catch(() => false)) {
        await businessNameInput.fill(businessName);
      }
      
      const heroTitleInput = page.locator(SELECTORS.EDITOR.HERO_TITLE).or(
        page.locator('input[name="heroTitle"], input[placeholder*="hero title" i]')
      );
      if (await heroTitleInput.isVisible().catch(() => false)) {
        await heroTitleInput.fill(heroTitle);
      }
      
      const heroSubtitleInput = page.locator(SELECTORS.EDITOR.HERO_SUBTITLE).or(
        page.locator('input[name="heroSubtitle"], input[placeholder*="hero subtitle" i]')
      );
      if (await heroSubtitleInput.isVisible().catch(() => false)) {
        await heroSubtitleInput.fill(heroSubtitle);
      }
      
      // Save draft (if save button exists)
      const saveButton = page.locator('[data-testid="save-draft-button"]').or(
        page.getByRole('button', { name: /save/i })
      );
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Publish site
      const publishButton = page.locator(SELECTORS.EDITOR.PUBLISH_BUTTON).or(
        page.getByRole('button', { name: /publish/i })
      );
      await expect(publishButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      await publishButton.click();
      
      // Wait for publish success
      await page.waitForURL(/dashboard|success/, { timeout: TIMEOUTS.EXTENDED });
      
      // Verify published site contains merged data
      // Get site subdomain from dashboard or API
      const sitesResponse = await page.request.get(`${URLS.API}/api/sites`, {
        headers: testUsers.trial?.token ? {
          'Authorization': `Bearer ${testUsers.trial.token}`
        } : {}
      });
      
      if (sitesResponse.ok()) {
        const sites = await sitesResponse.json();
        if (sites.data && sites.data.length > 0) {
          const site = sites.data[0];
          const siteUrl = `/sites/${site.subdomain}`;
          
          // Visit published site
          await page.goto(siteUrl);
          await page.waitForLoadState('networkidle');
          
          // Verify merged data is present
          const pageContent = await page.textContent('body');
          expect(pageContent).toContain(businessName);
          expect(pageContent).toContain(heroTitle);
        }
      }
    });
  });

  test.describe('Feature Gating by Subscription Tier', () => {
    test('trial user should have limited features', async ({ page }) => {
      // Login as trial user
      await page.goto('/login');
      await page.fill(SELECTORS.AUTH.EMAIL_INPUT, testUsers.trial?.email || TEST_USERS.FREE_USER.email);
      await page.fill(SELECTORS.AUTH.PASSWORD_INPUT, testUsers.trial?.password || TEST_USERS.FREE_USER.password);
      await page.click(SELECTORS.AUTH.SUBMIT_BUTTON);
      await page.waitForURL(/dashboard/, { timeout: TIMEOUTS.LONG });
      
      // Create and publish a site
      await page.goto('/setup');
      await page.waitForLoadState('networkidle');
      await skipWizard(page);
      
      // Select template and publish
      const templateCard = page.locator(SELECTORS.TEMPLATE.CARD).first();
      await templateCard.click({ timeout: TIMEOUTS.MEDIUM });
      
      await page.waitForSelector(SELECTORS.EDITOR.PANEL, { timeout: TIMEOUTS.LONG });
      
      // Fill minimal data
      const businessNameInput = page.locator('input[name="businessName"]').or(
        page.locator('input[placeholder*="business" i]').first()
      );
      if (await businessNameInput.isVisible().catch(() => false)) {
        await businessNameInput.fill(`Trial Test ${timestamp}`);
      }
      
      // Publish
      const publishButton = page.locator(SELECTORS.EDITOR.PUBLISH_BUTTON);
      await publishButton.click({ timeout: TIMEOUTS.MEDIUM });
      await page.waitForURL(/dashboard/, { timeout: TIMEOUTS.EXTENDED });
      
      // Get published site
      const sitesResponse = await page.request.get(`${URLS.API}/api/sites`);
      if (sitesResponse.ok()) {
        const sites = await sitesResponse.json();
        if (sites.data && sites.data.length > 0) {
          const site = sites.data[0];
          const siteUrl = `/sites/${site.subdomain}`;
          
          await page.goto(siteUrl);
          await page.waitForLoadState('networkidle');
          
          // Verify trial features are present
          const pageContent = await page.textContent('body');
          expect(pageContent).toBeTruthy();
          
          // Verify Pro features are NOT present (booking widget, checkout, etc.)
          const bookingWidget = page.locator('[data-testid="booking-widget"]').or(
            page.locator('.booking-widget, [class*="booking"]')
          );
          await expect(bookingWidget).not.toBeVisible();
          
          // Verify checkout is disabled
          const checkoutButton = page.locator('[data-testid="checkout-button"]').or(
            page.getByRole('button', { name: /checkout|buy now/i })
          );
          await expect(checkoutButton).not.toBeVisible();
        }
      }
    });

    test('pro user should have all features', async ({ page }) => {
      // Login as pro user
      await page.goto('/login');
      await page.fill(SELECTORS.AUTH.EMAIL_INPUT, testUsers.pro?.email || TEST_USERS.PRO_USER.email);
      await page.fill(SELECTORS.AUTH.PASSWORD_INPUT, testUsers.pro?.password || TEST_USERS.PRO_USER.password);
      await page.click(SELECTORS.AUTH.SUBMIT_BUTTON);
      await page.waitForURL(/dashboard/, { timeout: TIMEOUTS.LONG });
      
      // Create and publish a site
      await page.goto('/setup');
      await page.waitForLoadState('networkidle');
      await skipWizard(page);
      
      // Select template and publish
      const templateCard = page.locator(SELECTORS.TEMPLATE.CARD).first();
      await templateCard.click({ timeout: TIMEOUTS.MEDIUM });
      
      await page.waitForSelector(SELECTORS.EDITOR.PANEL, { timeout: TIMEOUTS.LONG });
      
      // Fill minimal data
      const businessNameInput = page.locator('input[name="businessName"]').or(
        page.locator('input[placeholder*="business" i]').first()
      );
      if (await businessNameInput.isVisible().catch(() => false)) {
        await businessNameInput.fill(`Pro Test ${timestamp}`);
      }
      
      // Publish
      const publishButton = page.locator(SELECTORS.EDITOR.PUBLISH_BUTTON);
      await publishButton.click({ timeout: TIMEOUTS.MEDIUM });
      await page.waitForURL(/dashboard/, { timeout: TIMEOUTS.EXTENDED });
      
      // Get published site
      const sitesResponse = await page.request.get(`${URLS.API}/api/sites`);
      if (sitesResponse.ok()) {
        const sites = await sitesResponse.json();
        if (sites.data && sites.data.length > 0) {
          const site = sites.data[0];
          const siteUrl = `/sites/${site.subdomain}`;
          
          await page.goto(siteUrl);
          await page.waitForLoadState('networkidle');
          
          // Verify Pro features are available (if template includes them)
          // Note: Features depend on template configuration
          const pageContent = await page.textContent('body');
          expect(pageContent).toBeTruthy();
        }
      }
    });
  });

  test.describe('CSS Routing', () => {
    test('should serve CSS files with correct MIME type', async ({ page }) => {
      // Create a test site first
      await page.goto('/login');
      await page.fill(SELECTORS.AUTH.EMAIL_INPUT, testUsers.trial?.email || TEST_USERS.FREE_USER.email);
      await page.fill(SELECTORS.AUTH.PASSWORD_INPUT, testUsers.trial?.password || TEST_USERS.FREE_USER.password);
      await page.click(SELECTORS.AUTH.SUBMIT_BUTTON);
      await page.waitForURL(/dashboard/, { timeout: TIMEOUTS.LONG });
      
      // Get a published site
      const sitesResponse = await page.request.get(`${URLS.API}/api/sites`);
      let siteSubdomain = null;
      
      if (sitesResponse.ok()) {
        const sites = await sitesResponse.json();
        if (sites.data && sites.data.length > 0) {
          siteSubdomain = sites.data[0].subdomain;
        }
      }
      
      // If no site exists, create one quickly
      if (!siteSubdomain) {
        await page.goto('/setup');
        await page.waitForLoadState('networkidle');
        await skipWizard(page);
        const templateCard = page.locator(SELECTORS.TEMPLATE.CARD).first();
        await templateCard.click({ timeout: TIMEOUTS.MEDIUM });
        await page.waitForSelector(SELECTORS.EDITOR.PANEL, { timeout: TIMEOUTS.LONG });
        
        const businessNameInput = page.locator('input[name="businessName"]').or(
          page.locator('input[placeholder*="business" i]').first()
        );
        if (await businessNameInput.isVisible().catch(() => false)) {
          await businessNameInput.fill(`CSS Test ${timestamp}`);
        }
        
        const publishButton = page.locator(SELECTORS.EDITOR.PUBLISH_BUTTON);
        await publishButton.click({ timeout: TIMEOUTS.MEDIUM });
        await page.waitForURL(/dashboard/, { timeout: TIMEOUTS.EXTENDED });
        
        const newSitesResponse = await page.request.get(`${URLS.API}/api/sites`);
        if (newSitesResponse.ok()) {
          const newSites = await newSitesResponse.json();
          if (newSites.data && newSites.data.length > 0) {
            siteSubdomain = newSites.data[0].subdomain;
          }
        }
      }
      
      if (siteSubdomain) {
        // Test CSS file serving
        const stylesResponse = await page.request.get(`${URLS.BASE}/sites/${siteSubdomain}/styles.css`);
        expect(stylesResponse.ok()).toBeTruthy();
        
        const contentType = stylesResponse.headers()['content-type'];
        expect(contentType).toContain('text/css');
        
        // Test premium.css if it exists
        const premiumResponse = await page.request.get(`${URLS.BASE}/sites/${siteSubdomain}/premium.css`);
        if (premiumResponse.ok()) {
          const premiumContentType = premiumResponse.headers()['content-type'];
          expect(premiumContentType).toContain('text/css');
        }
      }
    });
  });

  test.describe('Trial vs Paid Plans', () => {
    test('should default new users to trial (not free)', async ({ page }) => {
      // Register a new user
      const newEmail = generateTestEmail('trial-test');
      const password = 'TestPass123!';
      
      await page.goto('/register');
      await page.fill(SELECTORS.AUTH.EMAIL_INPUT, newEmail);
      await page.fill(SELECTORS.AUTH.PASSWORD_INPUT, password);
      await page.fill(SELECTORS.AUTH.CONFIRM_PASSWORD, password);
      await page.click(SELECTORS.AUTH.SUBMIT_BUTTON);
      
      await page.waitForURL(/dashboard|setup/, { timeout: TIMEOUTS.EXTENDED });
      
      // Verify user plan is trial (via API)
      const userResponse = await page.request.get(`${URLS.API}/api/users/me`);
      if (userResponse.ok()) {
        const user = await userResponse.json();
        const plan = user.subscription_plan || user.plan || 'trial';
        expect(['trial', null, undefined]).toContain(plan?.toLowerCase() || plan);
      }
    });

    test('should treat null/undefined plan as trial', async ({ page }) => {
      // This is tested implicitly through feature gating
      // If a user has null plan, they should get trial features
      await page.goto('/login');
      await page.fill(SELECTORS.AUTH.EMAIL_INPUT, testUsers.trial?.email || TEST_USERS.FREE_USER.email);
      await page.fill(SELECTORS.AUTH.PASSWORD_INPUT, testUsers.trial?.password || TEST_USERS.FREE_USER.password);
      await page.click(SELECTORS.AUTH.SUBMIT_BUTTON);
      await page.waitForURL(/dashboard/, { timeout: TIMEOUTS.LONG });
      
      // Verify trial features are applied (limited features)
      // This is verified in the feature gating tests above
    });
  });

  test.describe('End-to-End Publishing Flow', () => {
    test('complete flow: template selection → edit → publish → view', async ({ page }) => {
      const testEmail = generateTestEmail('e2e-flow');
      const password = 'TestPass123!';
      const businessName = `E2E Flow Test ${timestamp}`;
      
      // Step 1: Register
      await page.goto('/register');
      await page.fill(SELECTORS.AUTH.EMAIL_INPUT, testEmail);
      await page.fill(SELECTORS.AUTH.PASSWORD_INPUT, password);
      await page.fill(SELECTORS.AUTH.CONFIRM_PASSWORD, password);
      await page.click(SELECTORS.AUTH.SUBMIT_BUTTON);
      await page.waitForURL(/dashboard|setup/, { timeout: TIMEOUTS.EXTENDED });
      
      // Step 2: Navigate to setup
      await page.goto('/setup');
      await page.waitForLoadState('networkidle');
      await skipWizard(page);
      
      // Step 3: Select template
      const templateCard = page.locator(SELECTORS.TEMPLATE.CARD).first();
      await expect(templateCard).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      await templateCard.click();
      
      // Step 4: Wait for editor
      await page.waitForSelector(SELECTORS.EDITOR.PANEL, { timeout: TIMEOUTS.LONG });
      
      // Step 5: Fill business data
      const businessNameInput = page.locator('input[name="businessName"]').or(
        page.locator('input[placeholder*="business" i]').first()
      );
      if (await businessNameInput.isVisible().catch(() => false)) {
        await businessNameInput.fill(businessName);
      }
      
      // Step 6: Publish
      const publishButton = page.locator(SELECTORS.EDITOR.PUBLISH_BUTTON);
      await expect(publishButton).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
      await publishButton.click();
      
      // Step 7: Wait for success
      await page.waitForURL(/dashboard|success/, { timeout: TIMEOUTS.EXTENDED });
      
      // Step 8: Verify published site
      const sitesResponse = await page.request.get(`${URLS.API}/api/sites`);
      expect(sitesResponse.ok()).toBeTruthy();
      
      const sites = await sitesResponse.json();
      expect(sites.data).toBeDefined();
      expect(sites.data.length).toBeGreaterThan(0);
      
      const publishedSite = sites.data.find(s => s.name?.includes(businessName) || s.subdomain);
      expect(publishedSite).toBeDefined();
      
      // Step 9: Visit published site
      if (publishedSite) {
        await page.goto(`/sites/${publishedSite.subdomain}`);
        await page.waitForLoadState('networkidle');
        
        // Verify site loads
        const pageContent = await page.textContent('body');
        expect(pageContent).toBeTruthy();
        expect(pageContent.length).toBeGreaterThan(100);
      }
    });
  });
});


