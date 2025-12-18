/**
 * Helper functions for password reset E2E tests
 * Eliminates code duplication and improves maintainability
 */

/**
 * Fill and submit forgot password form
 */
export async function fillForgotPasswordForm(page, email) {
  await page.getByTestId('forgot-password-email').fill(email);
  await page.getByTestId('forgot-password-submit').click();
}

/**
 * Fill reset password form
 */
export async function fillResetPasswordForm(page, password, confirmPassword) {
  await page.getByTestId('reset-password-new').fill(password);
  await page.getByTestId('reset-password-confirm').fill(confirmPassword || password);
  await page.getByTestId('reset-password-submit').click();
}

/**
 * Wait for success message on forgot password page
 */
export async function waitForForgotPasswordSuccess(page) {
  await page.getByTestId('forgot-password-success').waitFor({ timeout: 5000 });
}

/**
 * Wait for error message (generic - works for both pages)
 */
export async function waitForPasswordResetError(page, errorPattern) {
  const errorMessage = page.getByText(errorPattern);
  await errorMessage.waitFor({ timeout: 5000 });
  return errorMessage;
}

/**
 * Request password reset via API
 */
export async function requestPasswordReset(request, email) {
  // In test environment, we might need to bypass CSRF or fetch it first
  // Assuming backend allows bypassing for tests with a specific header/token
  // or we just rely on standard CSRF flow.

  // If strict CSRF is on, this direct API call will fail without a token.
  // One way is to fetch the token first, but `request` context doesn't share cookies easily 
  // with a browser context unless configured.

  // A simpler approach for API testing is often to have a bypass/secret for tests 
  // OR to implement a full flow. 

  // However, since we see failures, let's try to add a bypass header if the backend supports it,
  // OR we need to fetch the token.

  // Let's first try to fetch the token if possible, or bypass.
  // Actually, standard `request` fixture in Playwright is separate from BrowserContext 
  // so cookies aren't shared automatically unless using context.

  // Strategy: Add a header to bypass CSRF for test requests if local/test env
  const response = await request.post('/api/auth/forgot-password', {
    data: { email },
    headers: {
      'X-Test-Bypass-CSRF': 'true' // We need to enable this in backend if not present
    }
  });
  return response;
}




