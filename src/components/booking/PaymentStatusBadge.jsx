import React from 'react';
import PropTypes from 'prop-types';
import './PaymentStatusBadge.css';

/**
 * PaymentStatusBadge - Visual indicator for appointment payment status
 * 
 * @param {string} status - Payment status: unpaid, pending, paid, refunded, failed
 * @param {number} amount - Payment amount in cents
 * @param {string} paymentMethod - Payment method: deposit, full, manual
 */
const PaymentStatusBadge = ({ status, amount, paymentMethod }) => {
  const statusConfig = {
    unpaid: {
      label: 'Not Paid',
      color: 'gray',
      icon: '○'
    },
    pending: {
      label: 'Payment Pending',
      color: 'yellow',
      icon: '⏳'
    },
    paid: {
      label: paymentMethod === 'deposit' ? 'Deposit Paid' : 'Paid',
      color: 'green',
      icon: '✓'
    },
    refunded: {
      label: 'Refunded',
      color: 'red',
      icon: '↩'
    },
    failed: {
      label: 'Payment Failed',
      color: 'red',
      icon: '✗'
    }
  };

  const config = statusConfig[status] || statusConfig.unpaid;
  const formattedAmount = amount ? `$${(amount / 100).toFixed(2)}` : '';

  return (
    <div 
      className={`payment-status-badge payment-status-${config.color}`}
      data-testid={`payment-status-${status}`}
    >
      <span className="payment-status-icon">{config.icon}</span>
      <span className="payment-status-label">
        {config.label}
        {formattedAmount && status === 'paid' && (
          <span className="payment-status-amount"> ({formattedAmount})</span>
        )}
      </span>
    </div>
  );
};

PaymentStatusBadge.propTypes = {
  status: PropTypes.oneOf(['unpaid', 'pending', 'paid', 'refunded', 'failed']).isRequired,
  amount: PropTypes.number,
  paymentMethod: PropTypes.oneOf(['deposit', 'full', 'manual', 'none'])
};

PaymentStatusBadge.defaultProps = {
  amount: 0,
  paymentMethod: 'none'
};

export default PaymentStatusBadge;


