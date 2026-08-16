/**
 * Stripe Integration Utilities
 * Handles Stripe Checkout and payment processing for Pro tier
 */

// Load Stripe.js
export const loadStripe = async () => {
  if (window.Stripe) {
    return window.Stripe;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => {
      resolve(window.Stripe);
    };
    script.onerror = () => {
      reject(new Error('Failed to load Stripe.js'));
    };
    document.head.appendChild(script);
  });
};

// Initialize Stripe with publishable key
export const initializeStripe = async (publishableKey) => {
  try {
    const Stripe = await loadStripe();
    return Stripe(publishableKey);
  } catch (error) {
    console.error('Stripe initialization error:', error);
    throw error;
  }
};

// Create checkout session (supports both single and multi-item checkout)
export const createCheckoutSession = async (items, siteId) => {
  try {
    // Use Stripe Connect endpoint for multi-item checkout
    const response = await fetch('/api/stripe/connect/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        siteId,
        items: items.map(item => ({
          id: item.id,
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          image: item.image
        })),
        captchaToken: '' // CAPTCHA handled server-side if needed
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const data = await response.json();
    
    // Return in format expected by redirectToCheckout
    if (data.url) {
      // Direct URL redirect (Stripe Connect)
      return { url: data.url };
    } else if (data.sessionId) {
      // Session ID for redirectToCheckout
      return { id: data.sessionId };
    } else {
      throw new Error('No checkout URL or session ID returned');
    }
  } catch (error) {
    console.error('Create checkout session error:', error);
    throw error;
  }
};

// Redirect to Stripe Checkout
export const redirectToCheckout = async (stripe, sessionId) => {
  try {
    const result = await stripe.redirectToCheckout({
      sessionId
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Redirect to checkout error:', error);
    throw error;
  }
};

// Complete checkout flow
export const processCheckout = async (stripe, items, siteId) => {
  try {
    // Create session
    const session = await createCheckoutSession(items, siteId);
    
    // If we have a direct URL (Stripe Connect), redirect directly
    if (session.url) {
      window.location.href = session.url;
      return;
    }
    
    // Otherwise use Stripe redirectToCheckout
    if (session.id && stripe) {
      await redirectToCheckout(stripe, session.id);
    } else {
      throw new Error('No checkout URL or session ID available');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
};

// Format amount for Stripe (cents)
export const formatAmountForStripe = (amount) => {
  return Math.round(amount * 100);
};

// Format amount for display
export const formatAmountForDisplay = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Validate Stripe publishable key
export const isValidStripeKey = (key) => {
  return key && (key.startsWith('pk_test_') || key.startsWith('pk_live_'));
};

// Get Stripe public key from site config
export const getStripeKey = (siteConfig) => {
  return siteConfig?.stripe?.publishableKey || null;
};

// Check if Stripe is configured
export const isStripeConfigured = (siteConfig) => {
  const key = getStripeKey(siteConfig);
  return isValidStripeKey(key);
};

