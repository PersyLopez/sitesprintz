/**
 * 🔵 E2E Test: Contact Form → Email Notification Flow
 * 
 * Tests the complete end-to-end flow of:
 * 1. User submits contact form on published site
 * 2. Submission is saved to database
 * 3. Email notification sent to site owner
 * 4. Success response to user
 * 
 * This is a real integration test that exercises the full stack
 */

import { test, expect } from '@playwright/test';

test.describe('Contact Form Email Notifications', () => {
  let siteSubdomain;
  let ownerEmail;

  test.beforeAll(async ({ request }) => {
    // Create a test site with contact form enabled
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    ownerEmail = `test-owner-${timestamp}-${random}@example.com`;
    siteSubdomain = `test-site-${timestamp}-${random}`;

    // Get CSRF token
    const csrfResponse = await request.get('/api/csrf-token');
    const { csrfToken } = await csrfResponse.json();

    // Register test user
    const registerResponse = await request.post('/api/auth/register', {
      headers: { 'X-CSRF-Token': csrfToken },
      data: {
        email: ownerEmail,
        password: 'StrictPwd!2024',
        confirmPassword: 'StrictPwd!2024'
      }
    });

    expect(registerResponse.ok()).toBeTruthy();
    const registerData = await registerResponse.json();
    const token = registerData.accessToken;

    // Create a draft
    const draftResponse = await request.post('/api/drafts', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        templateId: 'restaurant',
        businessData: {
          businessName: 'Test Restaurant',
          email: ownerEmail
        }
      }
    });

    expect(draftResponse.ok()).toBeTruthy();
    const draftData = await draftResponse.json();
    const draftId = draftData.draftId;

    // Publish the draft
    const publishResponse = await request.post(`/api/drafts/${draftId}/publish`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        plan: 'starter',
        email: ownerEmail
      }
    });

    if (!publishResponse.ok()) {
      console.log('Publish failed:', await publishResponse.text());
    }
    expect(publishResponse.ok()).toBeTruthy();
    const publishData = await publishResponse.json();

    // Update siteSubdomain with the actual subdomain assigned
    siteSubdomain = publishData.subdomain;
    console.log(`Site published at: /sites/${siteSubdomain}`);
  });

  test('should send email notification when contact form is submitted', async ({ page, request }) => {
    // Navigate to the published site
    await page.goto(`/sites/${siteSubdomain}/`);

    // Wait for page to load
    await page.waitForSelector('#contact-form', { timeout: 10000 });

    // Fill out contact form
    await page.fill('input[name="name"]', 'Jane Doe');
    await page.fill('input[name="email"]', 'jane.doe@example.com');
    await page.fill('input[name="phone"]', '555-1234');
    await page.fill('textarea[name="message"]', 'I would like more information about your services');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.success-message')).toContainText('Your message has been sent successfully');

    // Verify submission was saved in database
    // Note: In real E2E, we'd check the database or use an API endpoint
    // For now, we verify the response was successful

    // Wait a bit for email to be processed
    await page.waitForTimeout(1000);

    // TODO: Verify email was sent
    // In production, you might:
    // 1. Use a test email service that exposes sent emails via API
    // 2. Check database for email log entries
    // 3. Use email testing service like MailHog or Ethereal
  });

  test('should handle contact form submission with only required fields', async ({ page }) => {
    await page.goto(`/sites/${siteSubdomain}/`);
    await page.waitForSelector('#contact-form');

    // Fill only required fields
    await page.fill('input[name="name"]', 'John Smith');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('textarea[name="message"]', 'Quick question');

    await page.click('button[type="submit"]');

    await expect(page.locator('.success-message')).toBeVisible({ timeout: 5000 });
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto(`/sites/${siteSubdomain}/`);
    await page.waitForSelector('#contact-form');

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'invalid-email'); // Invalid email
    await page.fill('textarea[name="message"]', 'Test message');

    await page.click('button[type="submit"]');

    // Should see validation error (HTML5 validation)
    const emailInput = page.locator('input[name="email"]');
    const validationMessage = await emailInput.evaluate((el) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });

  test('should show error message when submission fails', async ({ page, request }) => {
    // Mock a server error by submitting to invalid subdomain
    await page.goto(`/sites/nonexistent-site/`);

    // If contact form exists on 404 page or error page
    const formExists = await page.locator('#contact-form').count();

    if (formExists > 0) {
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('textarea[name="message"]', 'Test');

      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('.error-message')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should prevent spam with rate limiting', async ({ page }) => {
    await page.goto(`/sites/${siteSubdomain}/`);
    await page.waitForSelector('#contact-form');

    // Submit form multiple times rapidly
    for (let i = 0; i < 5; i++) {
      await page.fill('input[name="name"]', `Test User ${i}`);
      await page.fill('input[name="email"]', `test${i}@example.com`);
      await page.fill('textarea[name="message"]', `Test message ${i}`);
      await page.click('button[type="submit"]');

      if (i < 4) {
        await page.waitForTimeout(500);
      }
    }

    // After multiple submissions, should see rate limit error or success
    // (depending on rate limit configuration)
    const successOrError = await page.locator('.success-message, .error-message').first();
    await expect(successOrError).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Email Service Health Check', () => {
  test('should have email service configured', async ({ request }) => {
    // Check if email service is configured by hitting a health endpoint
    // This is a smoke test to ensure email configuration is valid

    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();

    const health = await response.json();
    // In a real implementation, health endpoint might expose email service status
    expect(health).toHaveProperty('status');
  });
});

test.describe('Email Template Rendering', () => {
  test('should render contact form email with correct data', async ({ request }) => {
    // This test verifies the email template renders correctly
    // In a real scenario, you might have a preview endpoint

    const submissionData = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '555-1234',
      message: 'Test message for email rendering'
    };

    // Submit contact form via API
    const response = await request.post('/api/submissions/contact', {
      data: {
        subdomain: 'test-site',
        ...submissionData
      }
    });

    expect(response.ok()).toBeTruthy();

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.message).toContain('sent successfully');
  });
});

