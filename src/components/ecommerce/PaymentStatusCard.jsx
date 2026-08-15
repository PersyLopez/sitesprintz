import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { usePlan } from '../../hooks/usePlan';
import './PaymentStatusCard.css';

const STATUS = {
  LOADING: 'loading',
  NOT_STARTED: 'not_started',
  INCOMPLETE: 'incomplete',
  READY: 'ready',
  ERROR: 'error'
};

function PaymentStatusCard({ className = '', compact = false }) {
  const { features } = usePlan();
  const [stripeStatus, setStripeStatus] = useState(STATUS.LOADING);
  const [statusData, setStatusData] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      setStripeStatus(STATUS.LOADING);
      const data = await api.get('/api/connect/status');
      setStatusData(data);
      if (data.chargesEnabled && data.payoutsEnabled) {
        setStripeStatus(STATUS.READY);
      } else if (data.square?.connected || data.paypal?.connected) {
        setStripeStatus(STATUS.READY);
      } else if (data.accountId) {
        setStripeStatus(STATUS.INCOMPLETE);
      } else {
        setStripeStatus(STATUS.NOT_STARTED);
      }
    } catch (error) {
      setStripeStatus(STATUS.ERROR);
      setStatusData(null);
    }
  }, []);

  useEffect(() => {
    if (!features.payments) return;
    loadStatus();
  }, [features.payments, loadStatus]);

  if (!features.payments) {
    return (
      <div className={`payment-status-card payment-status-upgrade ${className}`} data-testid="payment-status-upgrade">
        <div className="payment-status-icon">🔒</div>
        <div className="payment-status-content">
          <h4>Payments are a Growth feature</h4>
          <p>Upgrade to Growth to accept online payments for your products.</p>
        </div>
      </div>
    );
  }

  const config = {
    [STATUS.READY]: {
      icon: '✅',
      title: 'Payments ready',
      message: 'Your payment account is connected for checkout on the sites where you enabled it.',
      badgeClass: 'ready'
    },
    [STATUS.INCOMPLETE]: {
      icon: '⚠️',
      title: 'Payments incomplete',
      message: 'Finish setup in Payment Settings so customers can check out.',
      badgeClass: 'incomplete'
    },
    [STATUS.NOT_STARTED]: {
      icon: '💳',
      title: 'Connect payments in Settings',
      message: 'Connect Stripe, Square, or PayPal per site in Payment Settings. You can reuse a setup on future sites.',
      badgeClass: 'not-started'
    },
    [STATUS.ERROR]: {
      icon: '❌',
      title: 'Payment status unavailable',
      message: 'We could not load your payment status. Please try again.',
      badgeClass: 'error'
    },
    [STATUS.LOADING]: {
      icon: '⏳',
      title: 'Checking payment status…',
      message: 'Please wait while we verify your payment connection.',
      badgeClass: 'loading'
    }
  }[stripeStatus] || {
    icon: '💳',
    title: 'Connect payments in Settings',
    message: 'Connect Stripe, Square, or PayPal per site in Payment Settings. You can reuse a setup on future sites.',
    badgeClass: 'not-started'
  };

  return (
    <div className={`payment-status-card ${config.badgeClass} ${compact ? 'compact' : ''} ${className}`} data-testid={`payment-status-${stripeStatus}`}>
      <div className="payment-status-main">
        <div className="payment-status-icon" aria-hidden="true">{config.icon}</div>
        <div className="payment-status-content">
          <div className="payment-status-header">
            <h4>{config.title}</h4>
            <span className={`payment-status-badge ${config.badgeClass}`}>
              {stripeStatus === STATUS.READY ? 'Connected' : stripeStatus === STATUS.INCOMPLETE ? 'Incomplete' : stripeStatus === STATUS.NOT_STARTED ? 'Not Started' : stripeStatus === STATUS.ERROR ? 'Error' : 'Loading'}
            </span>
          </div>
          <p>{config.message}</p>
          {statusData?.email && (
            <p className="payment-status-detail">Account: {statusData.email}</p>
          )}
        </div>
      </div>
      <div className="payment-status-actions">
        {stripeStatus === STATUS.ERROR ? (
          <button
            type="button"
            className={`btn btn-secondary ${compact ? 'btn-sm' : ''}`}
            onClick={loadStatus}
            data-testid="payment-status-action"
          >
            Retry
          </button>
        ) : stripeStatus !== STATUS.LOADING ? (
          <Link
            to="/settings/payments"
            className={`btn ${stripeStatus === STATUS.READY ? 'btn-secondary' : 'btn-primary'} ${compact ? 'btn-sm' : ''}`}
            data-testid="payment-status-action"
          >
            {stripeStatus === STATUS.READY ? 'Payment settings' : 'Open payment settings'}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default PaymentStatusCard;
