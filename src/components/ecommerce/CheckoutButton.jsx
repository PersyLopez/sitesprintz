import React, { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import PayOnSiteCheckout from './PayOnSiteCheckout';
import './CheckoutButton.css';

function CheckoutButton({
  stripePublishableKey,
  siteId,
  buttonText = 'Proceed to Checkout',
  className = '',
  paymentsReady = false,
  payOnSite = false
}) {
  const { cartItems, getCartTotal } = useCart();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  if (!paymentsReady && !payOnSite) {
    return (
      <div className="checkout-button-container" data-testid="checkout-upgrade-container">
        <div className="checkout-upgrade-notice" data-testid="checkout-upgrade-notice">
          <p>Payments are not yet set up for this site</p>
          <p className="notice-subtext">The site owner needs to connect Stripe or enable pay on site.</p>
        </div>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
          })),
          successUrl: `${window.location.origin}/sites/${siteId}/?order=success`,
          cancelUrl: `${window.location.origin}/sites/${siteId}/?order=cancelled`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Checkout failed');
      }

      const { redirectUrl } = await response.json();
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err.message || 'Checkout failed. Please try again.');
      setProcessing(false);
    }
  };

  const total = getCartTotal();
  const isDisabled = processing || !paymentsReady || cartItems.length === 0;

  return (
    <div className="checkout-button-container" data-testid="checkout-button-container">
      {paymentsReady && (
        <button
          onClick={handleCheckout}
          disabled={isDisabled}
          className={`btn btn-primary btn-checkout ${className}`}
          data-testid="checkout-button"
        >
          {processing ? (
            <>
              <span className="checkout-spinner" data-testid="checkout-spinner"></span>
              Redirecting to payment processor...
            </>
          ) : (
            <>
              {buttonText} • ${total.toFixed(2)}
            </>
          )}
        </button>
      )}

      {payOnSite && (
        <PayOnSiteCheckout siteId={siteId} showAsAlternative={paymentsReady} />
      )}

      {error && (
        <div className="checkout-error" data-testid="checkout-error">
          {error}
        </div>
      )}
    </div>
  );
}

export default CheckoutButton;
