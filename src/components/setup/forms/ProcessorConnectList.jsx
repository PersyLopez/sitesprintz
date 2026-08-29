import React, { useState } from 'react';
import { api } from '../../../services/api';

const PROCESSORS = [
  {
    id: 'stripe',
    name: 'Stripe',
    recommended: true,
    fee: 'Typical US online 2.9% + 30¢ (live rate in Stripe)',
    highlight: 'Cards on your site',
    description: 'Recommended for accepting cards on your site. Choose new or existing Stripe — identity checks happen on Stripe. Never paste API keys here.',
    connectTestId: 'stripe-connect-button',
    existingTestId: 'stripe-existing-oauth-button',
    defaultTestId: 'stripe-set-default-button',
    attachTestId: 'stripe-attach-button',
    heading: 'Stripe'
  },
  {
    id: 'square',
    name: 'Square',
    fee: 'Typical US Square API 2.9% + 30¢ (Square Online/invoices on Free is 3.3% + 30¢; live rate in Square)',
    highlight: 'In-person + online',
    description: 'Best if you already take cards in person or use Square hardware. Checkout needs an active Square location. Never paste Application secrets here.',
    connectTestId: 'square-connect-button',
    defaultTestId: 'square-set-default-button'
  },
  {
    id: 'paypal',
    name: 'PayPal',
    fee: 'Typical US PayPal Checkout 2.99% + 49¢ (live rate in PayPal)',
    highlight: 'PayPal checkout button',
    description: 'Adds a PayPal button at checkout for customers who prefer PayPal. Requires a PayPal Business account — personal wallets cannot run checkout.',
    connectTestId: 'paypal-connect-button',
    defaultTestId: 'paypal-set-default-button'
  }
];

function redirectUrl(data) {
  return data?.url || data?.authorizeUrl || data?.onboardingUrl;
}

function processorLabel(id) {
  if (id === 'square') return 'Square';
  if (id === 'paypal') return 'PayPal';
  return 'Stripe';
}

function ProcessorConnectList({
  siteId,
  status,
  isGrowth,
  isProcessing,
  setIsProcessing,
  onStatusChange,
  applyTo = 'site'
}) {
  const [actionError, setActionError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const startStripeNew = async () => {
    if (!isGrowth || isProcessing) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      const data = await api.post('/api/connect/onboard', {
        ...(siteId ? { siteId } : {}),
        applyTo
      });
      const url = redirectUrl(data);
      if (!url) throw new Error('Stripe did not return a connect URL');
      window.location.href = url;
    } catch (error) {
      setActionError(error.message || 'Could not start Stripe connection');
      setIsProcessing(false);
    }
  };

  const startStripeContinue = async () => {
    if (!isGrowth || isProcessing) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      const data = await api.post('/api/connect/refresh');
      const url = redirectUrl(data);
      if (!url) throw new Error('Stripe did not return a connect URL');
      window.location.href = url;
    } catch (error) {
      setActionError(error.message || 'Could not continue Stripe setup');
      setIsProcessing(false);
    }
  };

  const startConnect = async (processorId) => {
    if (!isGrowth || isProcessing) return;
    setActionError(null);
    setIsProcessing(true);

    try {
      const data = await api.get(`/api/connect/${processorId}`, {
        params: {
          ...(siteId ? { siteId } : {}),
          applyTo
        }
      });
      const url = redirectUrl(data);
      if (!url) throw new Error(`${processorId} did not return a connect URL`);
      window.location.href = url;
    } catch (error) {
      setActionError(error.message || `Could not start ${processorId} connection`);
      setIsProcessing(false);
    }
  };

  const startStripeExistingOAuth = async () => {
    if (!isGrowth || isProcessing) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      const data = await api.get('/api/connect/stripe/oauth', {
        params: {
          ...(siteId ? { siteId } : {}),
          applyTo
        }
      });
      const url = redirectUrl(data);
      if (!url) throw new Error('Stripe did not return a connect URL');
      window.location.href = url;
    } catch (error) {
      setActionError(error.message || 'Could not start Stripe connection');
      setIsProcessing(false);
    }
  };

  const attachStripe = async () => {
    if (!siteId || isProcessing) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      await api.post('/api/connect/attach', { processor: 'stripe', siteId, applyTo });
      setActionMessage('Stripe is now used on this site');
      await onStatusChange?.();
    } catch (error) {
      setActionError(error.message || 'Could not use Stripe on this site');
    } finally {
      setIsProcessing(false);
    }
  };

  const setDefault = async (processorId) => {
    if (isProcessing) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      await api.put('/api/connect/default', {
        provider: processorId,
        applyTo,
        ...(siteId ? { siteId } : {})
      });
      setActionMessage(`${processorLabel(processorId)} set as default`);
      await onStatusChange?.();
    } catch (error) {
      setActionError(error.message || 'Could not update default processor');
    } finally {
      setIsProcessing(false);
    }
  };

  const disconnect = async (processorId) => {
    if (isProcessing) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      if (processorId === 'stripe') {
        await api.post('/api/connect/disconnect', { siteId, applyTo });
      } else {
        await api.post(`/api/connect/disconnect/${processorId}`, { siteId, applyTo });
      }
      await onStatusChange?.();
    } catch (error) {
      setActionError(error.message || `Could not disconnect ${processorId}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const isConnected = (id) => {
    if (id === 'stripe') {
      const ready = Boolean(status?.chargesEnabled && status?.payoutsEnabled);
      if (!ready) return false;
      return status?.stripe?.connected === true || status?.stripe?.connected !== false;
    }
    return status?.[id]?.connected === true;
  };

  const canAttachStripe = Boolean(
    status?.stripe?.accountAvailable && !status?.stripe?.connected && (status?.chargesEnabled && status?.payoutsEnabled)
  );

  const isIncomplete = (id) => {
    if (id !== 'stripe') return false;
    return Boolean(status?.accountId) && !(status?.chargesEnabled && status?.payoutsEnabled);
  };

  const isDefault = (id) => {
    if (status?.defaultProcessor) return status.defaultProcessor === id;
    return false;
  };

  const available = status?.available || {};
  const stripeConfigured = available.stripe === true;
  const stripeTestMode = stripeConfigured && status?.stripe?.testMode === true;

  return (
    <div className="processor-connect-list">
      <div className="processor-trust-banner" data-testid="processor-trust-banner">
        <strong>Payments are set per site.</strong>
        {' '}Stripe, Square, and PayPal handle identity checks and payouts on their sites.
        SiteSprintz never sees card numbers, bank details, or KYC documents — never paste API keys or secrets here.
      </div>

      {stripeTestMode && (
        <div className="processor-test-banner" data-testid="stripe-test-banner">
          Stripe is running in test mode. Use{' '}
          <a
            href="https://docs.stripe.com/testing#cards"
            target="_blank"
            rel="noreferrer"
          >
            Stripe test cards
          </a>{' '}
          for checkout; no real money moves.
        </div>
      )}

      {available.stripe === false && isGrowth && (
        <div className="processor-test-banner processor-test-disabled" data-testid="stripe-not-configured-banner">
          Stripe is not available on this platform yet. Contact SiteSprintz support. Never paste API keys into this page.
        </div>
      )}

      {actionError && (
        <p className="processor-action-error" data-testid="processor-connect-error">{actionError}</p>
      )}
      {actionMessage && (
        <p className="processor-action-success" data-testid="processor-connect-success">{actionMessage}</p>
      )}

      <div className="processor-grid">
        {PROCESSORS.map((processor) => {
          const connected = isConnected(processor.id);
          const incomplete = isIncomplete(processor.id);
          const enabled = available[processor.id] !== false;
          const defaultProcessor = isDefault(processor.id);

          return (
            <article
              key={processor.id}
              className={`processor-card ${connected ? 'connected' : ''} ${defaultProcessor ? 'is-default' : ''}`}
              data-testid={`processor-${processor.id}`}
              data-default={defaultProcessor ? 'true' : 'false'}
            >
              <div className="processor-card-header">
                <div className="processor-card-title">
                  <h4>{processor.heading || processor.name}</h4>
                  {processor.recommended && !connected && !incomplete && (
                    <span className="processor-recommended-pill" data-testid="processor-recommended-pill">
                      Recommended
                    </span>
                  )}
                </div>
                <span
                  className={`status-badge ${connected ? 'ready' : incomplete ? 'incomplete' : 'not_started'}`}
                  data-testid="connection-status"
                >
                  {connected ? 'Connected' : incomplete ? 'Incomplete' : 'Not connected'}
                </span>
              </div>

              <p className="processor-description">{processor.description}</p>
              <p className="processor-fee">
                {processor.fee}
                {processor.highlight ? ` · ${processor.highlight}` : ''}
              </p>
              {status?.visitorCheckout?.[processor.id] === false && (
                <p className="processor-unavailable" data-testid={`${processor.id}-visitor-checkout-pending`}>
                  You can connect {processor.name} now. Customers still pay with Stripe (or at the salon) until this checkout is enabled.
                </p>
              )}

              {processor.id === 'stripe' && connected && status?.email && (
                <p className="processor-account" data-testid="stripe-account-email">{status.email}</p>
              )}
              {processor.id === 'stripe' && connected && (
                <a
                  className="processor-dashboard-link"
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noreferrer"
                  data-testid="stripe-dashboard-link"
                >
                  Open Stripe Dashboard
                </a>
              )}

              <div className="processor-card-actions">
                {!isGrowth && (
                  <p className="processor-upgrade">Upgrade to Growth to connect {processor.name}.</p>
                )}

                {isGrowth && !enabled && (
                  <p className="processor-unavailable">{processor.name} is not enabled on this platform yet.</p>
                )}

                {isGrowth && enabled && processor.id === 'stripe' && canAttachStripe && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    data-testid={processor.attachTestId}
                    onClick={attachStripe}
                    disabled={isProcessing || !siteId}
                  >
                    {isProcessing ? 'Saving…' : 'Use Stripe on this site'}
                  </button>
                )}

                {isGrowth && enabled && processor.id === 'stripe' && !connected && !incomplete && !canAttachStripe && (
                  <div className="processor-choice-pair" data-testid="stripe-connect-choice">
                    <p className="processor-choice-label">How do you want to connect Stripe?</p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      data-testid={processor.connectTestId}
                      onClick={startStripeNew}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Opening…' : "I'm new to Stripe"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      data-testid={processor.existingTestId}
                      onClick={startStripeExistingOAuth}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Opening…' : 'I already have Stripe'}
                    </button>
                  </div>
                )}

                {isGrowth && enabled && processor.id !== 'stripe' && !connected && !incomplete && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    data-testid={processor.connectTestId}
                    onClick={() => startConnect(processor.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Opening…' : `Connect ${processor.name}`}
                  </button>
                )}

                {isGrowth && enabled && processor.id === 'stripe' && incomplete && (
                  <button
                    type="button"
                    className="btn btn-warning"
                    data-testid={processor.connectTestId}
                    onClick={startStripeContinue}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Opening…' : 'Continue Setup'}
                  </button>
                )}

                {isGrowth && connected && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    data-testid={processor.defaultTestId}
                    onClick={() => setDefault(processor.id)}
                    disabled={isProcessing || defaultProcessor}
                  >
                    {defaultProcessor ? 'Default for this site' : 'Use on this site'}
                  </button>
                )}

                {isGrowth && connected && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    data-testid={`${processor.id}-disconnect-button`}
                    onClick={() => disconnect(processor.id)}
                    disabled={isProcessing}
                  >
                    Remove from this site
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default ProcessorConnectList;
