import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { post } from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import './RefundModal.css';

/**
 * RefundModal - UI for processing appointment refunds
 * 
 * @param {object} appointment - Appointment object with payment details
 * @param {string} userId - User ID for API authentication
 * @param {function} onRefund - Callback after successful refund
 * @param {function} onClose - Callback to close modal
 */
const RefundModal = ({ appointment, userId, onRefund, onClose }) => {
  const [reason, setReason] = useState('customer_request');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleRefund = async () => {
    // Confirmation
    const confirmMessage = `Refund $${(appointment.payment_amount_cents / 100).toFixed(2)} to ${appointment.customer_email}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    
    try {
      const refundReason = reason === 'other' ? customReason : reason;
      
      await post(
        `/api/booking/admin/${userId}/appointments/${appointment.id}/refund`,
        { reason: refundReason }
      );

      showSuccess('Refund processed successfully');
      onRefund(); // Refresh appointment list
      onClose();
    } catch (err) {
      console.error('Refund error:', err);
      showError(err.message || 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  const canRefund = appointment.payment_status === 'paid';

  return (
    <div className="refund-modal-overlay" onClick={onClose}>
      <div 
        className="refund-modal" 
        onClick={(e) => e.stopPropagation()}
        data-testid="refund-modal"
      >
        <div className="refund-modal-header">
          <h3>Issue Refund</h3>
          <button 
            className="refund-modal-close" 
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="refund-modal-body">
          {!canRefund ? (
            <div className="refund-error">
              <p>❌ Only paid appointments can be refunded.</p>
              <p className="refund-error-detail">
                Current status: <strong>{appointment.payment_status}</strong>
              </p>
            </div>
          ) : (
            <>
              <div className="refund-details">
                <div className="refund-detail-row">
                  <span className="refund-detail-label">Customer:</span>
                  <span className="refund-detail-value">{appointment.customer_name}</span>
                </div>
                <div className="refund-detail-row">
                  <span className="refund-detail-label">Email:</span>
                  <span className="refund-detail-value">{appointment.customer_email}</span>
                </div>
                <div className="refund-detail-row">
                  <span className="refund-detail-label">Amount:</span>
                  <span className="refund-detail-value refund-amount">
                    ${(appointment.payment_amount_cents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="refund-detail-row">
                  <span className="refund-detail-label">Payment Method:</span>
                  <span className="refund-detail-value">
                    {appointment.payment_method === 'deposit' ? 'Deposit' : 'Full Payment'}
                  </span>
                </div>
              </div>

              <div className="refund-reason-section">
                <label htmlFor="refund-reason" className="refund-label">
                  Reason for Refund:
                </label>
                <select
                  id="refund-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="refund-select"
                  data-testid="refund-reason-select"
                >
                  <option value="customer_request">Customer Request</option>
                  <option value="business_cancelled">Business Cancelled</option>
                  <option value="duplicate">Duplicate Booking</option>
                  <option value="service_issue">Service Issue</option>
                  <option value="other">Other</option>
                </select>

                {reason === 'other' && (
                  <textarea
                    placeholder="Please specify the reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="refund-custom-reason"
                    rows={3}
                    data-testid="refund-custom-reason"
                  />
                )}
              </div>

              <div className="refund-warning">
                <p>⚠️ <strong>Important:</strong></p>
                <ul>
                  <li>Refunds are processed immediately</li>
                  <li>Customer receives email confirmation</li>
                  <li>Funds return to original payment method</li>
                  <li>Processing may take 5-10 business days</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="refund-modal-footer">
          {canRefund ? (
            <>
              <button
                onClick={handleRefund}
                disabled={loading || (reason === 'other' && !customReason.trim())}
                className="refund-button refund-button-primary"
                data-testid="refund-confirm-button"
              >
                {loading ? 'Processing...' : 'Issue Refund'}
              </button>
              <button
                onClick={onClose}
                disabled={loading}
                className="refund-button refund-button-secondary"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="refund-button refund-button-secondary"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

RefundModal.propTypes = {
  appointment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    customer_name: PropTypes.string.isRequired,
    customer_email: PropTypes.string.isRequired,
    payment_status: PropTypes.string.isRequired,
    payment_amount_cents: PropTypes.number.isRequired,
    payment_method: PropTypes.string
  }).isRequired,
  userId: PropTypes.string.isRequired,
  onRefund: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default RefundModal;


