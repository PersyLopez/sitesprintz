/**
 * Helper functions for password reset E2E tests
 * Eliminates code duplication and improves maintainability
 */

import { TIMEOUTS, API_PATTERNS } from '../fixtures/test-config.js';

/**
 * Fill and submit forgot password form
 * @param {Page} page - Playwright page
 * @param {string} email - Email to request reset for
 * @throws {Error} If form elements are not found
 */
export async function fillForgotPasswordForm(page, email) {
  const emailInput = page.getByTestId('forgot-password-email');
  const submitBtn = page.getByTestId('forgot-password-submit');
  
  // Validate elements exist before interacting
  await emailInput.waitFor({ state: 'visible', timeout: TIMEOUTS.MEDIUM });
  
  await emailInput.fill(email);
  await submitBtn.click();
}

/**
 * Fill reset password form
 * @param {Page} page - Playwright page
 * @param {string} password - New password
 * @param {string} [confirmPassword] - Confirm password (defaults to password)
 * @throws {Error} If form elements are not found
 */
export async function fillResetPasswordForm(page, password, confirmPassword) {
  const newPasswordInput = page.getByTestId('reset-password-new');
  const confirmInput = page.getByTestId('reset-password-confirm');
  const submitBtn = page.getByTestId('reset-password-submit');
  
  // Validate elements exist
  await newPasswordInput.waitFor({ state: 'visible', timeout: TIMEOUTS.MEDIUM });
  
  await newPasswordInput.fill(password);
  await confirmInput.fill(confirmPassword || password);
  await submitBtn.click();
}

/**
 * Wait for success message on forgot password page
 * @param {Page} page - Playwright page
 * @throws {Error} If success message doesn't appear within timeout
 */
export async function waitForForgotPasswordSuccess(page) {
  await page.getByTestId('forgot-password-success').waitFor({ 
    state: 'visible',
    timeout: TIMEOUTS.MEDIUM 
  });
}

/**
 * Wait for error message (generic - works for both pages)
 * @param {Page} page - Playwright page
 * @param {RegExp} errorPattern - Pattern to match error message
 * @returns {Locator} The error message locator
 * @throws {Error} If error message doesn't appear within timeout
 */
export async function waitForPasswordResetError(page, errorPattern) {
  const errorMessage = page.getByText(errorPattern);
  await errorMessage.waitFor({ 
    state: 'visible',
    timeout: TIMEOUTS.MEDIUM 
  });
  return errorMessage;
}

/**
 * Request password reset via API with proper error handling
 * @param {APIRequestContext} request - Playwright request context
 * @param {string} email - Email to request reset for
 * @returns {Promise<APIResponse>} The API response
 * @throws {Error} If the request fails with detailed error context
 */
export async function requestPasswordReset(request, email) {
  try {
    // Strategy: Add a header to bypass CSRF for test requests in test env
    const response = await request.post(API_PATTERNS.FORGOT_PASSWORD, {
      data: { email },
      headers: {
        'X-Test-Bypass-CSRF': 'true'
      }
    });
    
    // Log non-success responses for debugging
    if (!response.ok()) {
      const errorBody = await response.text().catch(() => 'Could not read response body');
      console.log(`Password reset request failed for ${email}:`, response.status(), errorBody);
    }
    
    return response;
  } catch (error) {
    throw new Error(`Failed to request password reset for ${email}: ${error.message}`);
  }
}




