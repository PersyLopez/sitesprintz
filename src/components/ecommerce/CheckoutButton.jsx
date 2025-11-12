import React, { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { useStripe } from '../../hooks/useStripe';
import { processCheckout } from '../../utils/stripe';
import './CheckoutButton.css';

function CheckoutButton({ 
  stripePublishableKey, 
  siteId,
  buttonText = 'Proceed to Checkout',
  className = ''
}) {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { stripe, loading: stripeLoading, error: stripeError } = useStripe(stripePublishableKey);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleCheckout = async () => {
    if (!stripe) {
      setError('Stripe is not loaded. Please try again.');
      return;
    }

    if (cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      await processCheckout(stripe, cartItems, siteId);
      // Cart will be cleared on successful checkout
      // clearCart();
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Checkout failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const total = getCartTotal();
  const isDisabled = stripeLoading || processing || cartItems.length === 0 || !stripe || !!stripeError;

  return (
    <div className="checkout-button-container">
      <button
        onClick={handleCheckout}
        disabled={isDisabled}
        className={`btn btn-primary btn-checkout ${className}`}
      >
        {processing ? (
          <>
            <span className="checkout-spinner"></span>
            Processing...
          </>
        ) : stripeLoading ? (
          'Loading...'
        ) : (
          <>
            {buttonText} • ${total.toFixed(2)}
          </>
        )}
      </button>

      {error && (
        <div className="checkout-error">
          ⚠️ {error}
        </div>
      )}

      {stripeError && (
        <div className="checkout-error">
          ⚠️ Stripe Error: {stripeError}
        </div>
      )}

      {!stripePublishableKey && (
        <div className="checkout-warning">
          💡 Stripe is not configured. Please add your Stripe keys in settings.
        </div>
      )}
    </div>
  );
}

export default CheckoutButton;

