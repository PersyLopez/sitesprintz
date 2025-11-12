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

// Create checkout session
export const createCheckoutSession = async (items, siteId) => {
  try {
    const response = await fetch('/api/checkout/create-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        items,
        siteId,
        successUrl: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/checkout/cancel`
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const session = await response.json();
    return session;
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
    
    // Redirect to Stripe
    await redirectToCheckout(stripe, session.id);
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

