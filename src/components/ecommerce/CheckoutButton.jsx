import React, { useState } from 'react';
import { useCart } from '../../hooks/useCart';
import { useLocale } from '../../i18n/LocaleContext.jsx';
import { tLive } from '../../i18n/liveChrome/index.js';
import { api } from '../../services/api';
import PayOnSiteCheckout from './PayOnSiteCheckout';
import './CheckoutButton.css';

function CheckoutButton({
  stripePublishableKey,
  siteId,
  buttonText,
  className = '',
  paymentsReady = false,
  payOnSite = false,
  onConfirmed
}) {
  const { locale } = useLocale();
  const t = (key, vars) => tLive(locale, key, vars);
  const checkoutLabel = buttonText || t('proceedToCheckout');
  const { cartItems, getCartTotal } = useCart();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  if (!paymentsReady && !payOnSite) {
    return (
      <div className="checkout-button-container" data-testid="checkout-upgrade-container">
        <div className="checkout-upgrade-notice" data-testid="checkout-upgrade-notice">
          <p>{t('checkoutNotConnected')}</p>
          <p className="notice-subtext">{t('checkoutNotConnectedSub')}</p>
        </div>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      setError(t('checkoutEmpty'));
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const pagePath = window.location.pathname || '/';
      const data = await api.post('/api/payments/checkout/create-session', {
        siteId,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          description: item.description,
          options: item.options
        })),
        successUrl: `${window.location.origin}${pagePath}?order=success`,
        cancelUrl: `${window.location.origin}${pagePath}?order=cancelled`
      });

      const redirectUrl = data.redirectUrl || data.url;
      if (!redirectUrl) {
        throw new Error('Checkout session did not return a redirect URL');
      }
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err.message || t('checkoutFailed'));
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
              {t('checkoutRedirecting')}
            </>
          ) : (
            <>
              {checkoutLabel} • ${total.toFixed(2)}
            </>
          )}
        </button>
      )}

      {payOnSite && (
        <PayOnSiteCheckout siteId={siteId} showAsAlternative={paymentsReady} onConfirmed={onConfirmed} />
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
