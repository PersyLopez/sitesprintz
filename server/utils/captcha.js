/**
 * CAPTCHA Verification Utility
 * 
 * Verifies Cloudflare Turnstile CAPTCHA tokens
 * 
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

/**
 * Verify Cloudflare Turnstile CAPTCHA token
 * 
 * @param {string} token - The CAPTCHA token from the frontend
 * @param {string} ip - The user's IP address (optional, for additional security)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function verifyTurnstile(token, ip = null) {
  // If CAPTCHA is not configured, skip verification (for development)
  // If CAPTCHA is not configured, or running tests, skip verification
  if (!process.env.TURNSTILE_SECRET_KEY || process.env.NODE_ENV === 'test') {
    console.warn('⚠️  TURNSTILE_SECRET_KEY not set - CAPTCHA verification skipped');
    return { success: true, skipped: true };
  }

  if (!token) {
    return { success: false, error: 'CAPTCHA token is required' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', process.env.TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    if (ip) {
      formData.append('remoteip', ip);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();

    if (data.success) {
      return { success: true };
    } else {
      const errors = data['error-codes'] || ['Unknown error'];
      console.error('Turnstile verification failed:', errors);
      return {
        success: false,
        error: 'CAPTCHA verification failed',
        errorCodes: errors
      };
    }
  } catch (error) {
    console.error('Error verifying Turnstile CAPTCHA:', error);
    return {
      success: false,
      error: 'Failed to verify CAPTCHA. Please try again.'
    };
  }
}






