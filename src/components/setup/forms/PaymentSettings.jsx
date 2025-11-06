import React, { useState, useEffect } from 'react';
import { useSite } from '../../../hooks/useSite';
import { useAuth } from '../../../hooks/useAuth';
import './PaymentSettings.css';

function PaymentSettings() {
  const { siteData, updateNestedField } = useSite();
  const { user } = useAuth();
  const [stripeStatus, setStripeStatus] = useState('loading');
  const [stripeAccountId, setStripeAccountId] = useState(null);

  const payments = siteData.payments || {
    enabled: false,
    currency: 'USD',
    tax: 0,
    shipping: {
      enabled: false,
      flatRate: 0
    }
  };

  useEffect(() => {
    checkStripeConnection();
  }, []);

  const checkStripeConnection = async () => {
    try {
      const response = await fetch('/api/stripe/account', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStripeAccountId(data.accountId);
        setStripeStatus(data.accountId ? 'connected' : 'not_connected');
      } else {
        setStripeStatus('not_connected');
      }
    } catch (error) {
      console.error('Failed to check Stripe status:', error);
      setStripeStatus('error');
    }
  };

  const connectStripe = async () => {
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        alert('Failed to initiate Stripe connection');
      }
    } catch (error) {
      console.error('Stripe connect error:', error);
      alert('Failed to connect to Stripe');
    }
  };

  const updatePayments = (field, value) => {
    updateNestedField(`payments.${field}`, value);
  };

  return (
    <div className="payment-settings">
      <div className="editor-header">
        <div>
          <h3>💳 Payment Configuration</h3>
          <p className="editor-subtitle">Configure payment processing for your site</p>
        </div>
      </div>

      {/* Stripe Connection Status */}
      <div className="stripe-status-card">
        <div className="status-header">
          <div className="status-info">
            <h4>🔒 Stripe Account</h4>
            <p>Secure payment processing powered by Stripe</p>
          </div>
          <div className={`status-badge ${stripeStatus}`}>
            {stripeStatus === 'connected' && '✓ Connected'}
            {stripeStatus === 'not_connected' && '○ Not Connected'}
            {stripeStatus === 'loading' && '⟳ Loading...'}
            {stripeStatus === 'error' && '✗ Error'}
          </div>
        </div>

        {stripeStatus === 'not_connected' && (
          <div className="connect-prompt">
            <p>Connect your Stripe account to start accepting payments directly to your bank account.</p>
            <button onClick={connectStripe} className="btn btn-primary">
              Connect Stripe Account
            </button>
          </div>
        )}

        {stripeStatus === 'connected' && (
          <div className="connected-info">
            <p>✓ Your Stripe account is connected and ready to process payments</p>
            <small>Account ID: {stripeAccountId?.substring(0, 20)}...</small>
          </div>
        )}
      </div>

      {/* Payment Settings (only show if Stripe is connected) */}
      {stripeStatus === 'connected' && (
        <div className="payment-config">
          <div className="form-group">
            <label className="checkbox-label main-toggle">
              <input
                type="checkbox"
                checked={payments.enabled}
                onChange={(e) => updatePayments('enabled', e.target.checked)}
              />
              <span>Enable payments on your site</span>
            </label>
          </div>

          {payments.enabled && (
            <div className="payment-options">
              <div className="form-group">
                <label>Currency</label>
                <select
                  value={payments.currency}
                  onChange={(e) => updatePayments('currency', e.target.value)}
                  className="select-input"
                >
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="EUR">EUR - Euro (€)</option>
                  <option value="GBP">GBP - British Pound (£)</option>
                  <option value="CAD">CAD - Canadian Dollar (C$)</option>
                  <option value="AUD">AUD - Australian Dollar (A$)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Sales Tax (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={payments.tax}
                  onChange={(e) => updatePayments('tax', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <small className="form-help">
                  Sales tax percentage applied to all purchases (leave 0 for no tax)
                </small>
              </div>

              <div className="form-section">
                <h4>Shipping Options</h4>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={payments.shipping?.enabled}
                      onChange={(e) => updatePayments('shipping.enabled', e.target.checked)}
                    />
                    <span>Require shipping address</span>
                  </label>
                </div>

                {payments.shipping?.enabled && (
                  <div className="form-group">
                    <label>Flat Rate Shipping ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={payments.shipping.flatRate}
                      onChange={(e) => updatePayments('shipping.flatRate', parseFloat(e.target.value) || 0)}
                      placeholder="5.00"
                    />
                    <small className="form-help">
                      Flat shipping fee added to all orders
                    </small>
                  </div>
                )}
              </div>

              <div className="payment-preview">
                <h4>Sample Checkout Preview</h4>
                <div className="preview-box">
                  <div className="preview-line">
                    <span>Product</span>
                    <span>$29.99</span>
                  </div>
                  {payments.tax > 0 && (
                    <div className="preview-line muted">
                      <span>Tax ({payments.tax}%)</span>
                      <span>${(29.99 * payments.tax / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {payments.shipping?.enabled && payments.shipping.flatRate > 0 && (
                    <div className="preview-line muted">
                      <span>Shipping</span>
                      <span>${payments.shipping.flatRate.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="preview-line total">
                    <span><strong>Total</strong></span>
                    <span><strong>
                      ${(29.99 + 
                         (29.99 * payments.tax / 100) + 
                         (payments.shipping?.enabled ? payments.shipping.flatRate : 0)
                        ).toFixed(2)}
                    </strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="editor-tip">
        <span className="tip-icon">💡</span>
        <div>
          <strong>Important:</strong> Payments are processed securely through Stripe.
          We take a 10% platform fee on successful transactions. Funds are deposited
          directly to your connected Stripe account within 2-7 business days.
        </div>
      </div>
    </div>
  );
}

export default PaymentSettings;

