import React from 'react';
import './StripeConnectSection.css';

function StripeConnectSection({ connected, onConnect }) {
  const handleConnect = () => {
    // Redirect to Stripe OAuth
    window.location.href = '/api/stripe/connect';
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Stripe? You will no longer be able to accept payments.')) {
      return;
    }

    try {
      const response = await fetch('/api/stripe/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        onConnect();
        alert('Stripe disconnected successfully');
      }
    } catch (error) {
      alert('Failed to disconnect Stripe');
    }
  };

  return (
    <div className="stripe-connect-section">
      <div className="connect-card">
        <div className="connect-header">
          <div className="connect-info">
            <h3>💳 Payment Processing</h3>
            <p>
              {connected
                ? 'Your Stripe account is connected and ready to accept payments'
                : 'Connect your Stripe account to accept payments from customers'}
            </p>
          </div>
          <div className={`connect-badge ${connected ? 'connected' : 'not-connected'}`}>
            {connected ? '✓ Connected' : 'Not Connected'}
          </div>
        </div>

        <div className="connect-actions">
          {connected ? (
            <button onClick={handleDisconnect} className="btn btn-secondary">
              Disconnect Stripe
            </button>
          ) : (
            <button onClick={handleConnect} className="btn btn-primary">
              Connect with Stripe
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default StripeConnectSection;

