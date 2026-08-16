/**
 * Fee Configuration Component - Phase 2.1
 * Admin UI for managing cancellation fees, no-show penalties, and booking fees
 */

import React, { useState, useEffect } from 'react';
import './FeeConfiguration.css';

export default function FeeConfiguration({ serviceId, serviceName }) {
  const [cancellationPolicy, setCancellationPolicy] = useState({
    enabled: true,
    type: 'sliding_scale',
    rules: [
      { cancelWithinHours: 24, feePercentage: 100 },
      { cancelWithinHours: 48, feePercentage: 50 },
      { cancelAfterHours: 48, feePercentage: 0 }
    ]
  });

  const [noShowPolicy, setNoShowPolicy] = useState({
    enabled: true,
    chargeOnNoShow: true,
    feeType: 'percentage',
    feeAmount: 100,
    requireConfirmation: true
  });

  const [bookingFeePolicy, setBookingFeePolicy] = useState({
    enabled: false,
    type: 'percentage',
    percentage: 2.5,
    nonRefundable: false
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadPolicies();
  }, [serviceId]);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/booking/services/${serviceId}/fee-policies`);
      if (!response.ok) throw new Error('Failed to load policies');
      
      const data = await response.json();
      if (data.cancellationPolicy) setCancellationPolicy(data.cancellationPolicy);
      if (data.noShowPolicy) setNoShowPolicy(data.noShowPolicy);
      if (data.bookingFeePolicy) setBookingFeePolicy(data.bookingFeePolicy);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');

      const response = await fetch(`/api/booking/services/${serviceId}/fee-policies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellationPolicy,
          noShowPolicy,
          bookingFeePolicy
        })
      });

      if (!response.ok) throw new Error('Failed to save policies');

      setMessage('✅ Fee policies saved successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('❌ ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateCancellationRule = (index, field, value) => {
    const newRules = [...cancellationPolicy.rules];
    newRules[index] = {
      ...newRules[index],
      [field]: field.includes('Hours') ? parseInt(value) : parseInt(value)
    };
    setCancellationPolicy({ ...cancellationPolicy, rules: newRules });
  };

  return (
    <div className="fee-configuration">
      <h2>💰 Fee Configuration - {serviceName}</h2>

      {/* Cancellation Fees */}
      <section className="fee-section">
        <div className="section-header">
          <h3>⚠️ Cancellation Fees (Sliding Scale)</h3>
          <label className="toggle">
            <input
              type="checkbox"
              checked={cancellationPolicy.enabled}
              onChange={(e) =>
                setCancellationPolicy({ ...cancellationPolicy, enabled: e.target.checked })
              }
              disabled={loading}
            />
            <span>{cancellationPolicy.enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>

        {cancellationPolicy.enabled && (
          <div className="policy-details">
            <p className="info">
              Charges customers who cancel within a certain timeframe. Sliding scale is more fair
              than fixed fees.
            </p>

            <div className="rules-list">
              <h4>Cancellation Rules:</h4>
              {cancellationPolicy.rules.map((rule, idx) => (
                <div key={idx} className="rule-row">
                  {rule.cancelWithinHours !== undefined ? (
                    <>
                      <div className="rule-input">
                        <label>If cancel within</label>
                        <input
                          type="number"
                          value={rule.cancelWithinHours}
                          onChange={(e) => updateCancellationRule(idx, 'cancelWithinHours', e.target.value)}
                          min="1"
                        />
                        <span>hours</span>
                      </div>
                      <div className="rule-output">
                        <label>Charge</label>
                        <input
                          type="number"
                          value={rule.feePercentage}
                          onChange={(e) => updateCancellationRule(idx, 'feePercentage', e.target.value)}
                          min="0"
                          max="100"
                        />
                        <span>% of service</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rule-input">
                        <label>If cancel after</label>
                        <input
                          type="number"
                          value={rule.cancelAfterHours}
                          onChange={(e) => updateCancellationRule(idx, 'cancelAfterHours', e.target.value)}
                          min="1"
                        />
                        <span>hours</span>
                      </div>
                      <div className="rule-output">
                        <label>Charge</label>
                        <input
                          type="number"
                          value={rule.feePercentage}
                          onChange={(e) => updateCancellationRule(idx, 'feePercentage', e.target.value)}
                          min="0"
                          max="100"
                        />
                        <span>% of service</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="fee-preview">
              <strong>Example Preview:</strong>
              <ul>
                {cancellationPolicy.rules.map((rule, idx) => (
                  <li key={idx}>
                    {rule.cancelWithinHours ? `< ${rule.cancelWithinHours}h` : `> ${rule.cancelAfterHours}h`}:{' '}
                    {rule.feePercentage}% fee
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* No-Show Penalties */}
      <section className="fee-section">
        <div className="section-header">
          <h3>🚫 No-Show Penalties</h3>
          <label className="toggle">
            <input
              type="checkbox"
              checked={noShowPolicy.enabled}
              onChange={(e) =>
                setNoShowPolicy({ ...noShowPolicy, enabled: e.target.checked })
              }
              disabled={loading}
            />
            <span>{noShowPolicy.enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>

        {noShowPolicy.enabled && (
          <div className="policy-details">
            <p className="info">
              Automatically charges customer if they don't show up for appointment. Requires 24h
              confirmation.
            </p>

            <div className="policy-group">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={noShowPolicy.chargeOnNoShow}
                  onChange={(e) =>
                    setNoShowPolicy({ ...noShowPolicy, chargeOnNoShow: e.target.checked })
                  }
                />
                <span>Charge on no-show</span>
              </label>

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={noShowPolicy.requireConfirmation}
                  onChange={(e) =>
                    setNoShowPolicy({ ...noShowPolicy, requireConfirmation: e.target.checked })
                  }
                />
                <span>Require 24h confirmation</span>
              </label>
            </div>

            <div className="policy-group">
              <label>Fee Amount:</label>
              <div className="input-group">
                <input
                  type="number"
                  value={noShowPolicy.feeAmount}
                  onChange={(e) =>
                    setNoShowPolicy({ ...noShowPolicy, feeAmount: parseInt(e.target.value) })
                  }
                  min="0"
                  max="100"
                />
                <select
                  value={noShowPolicy.feeType}
                  onChange={(e) =>
                    setNoShowPolicy({ ...noShowPolicy, feeType: e.target.value })
                  }
                >
                  <option value="percentage">% of service</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Booking Fees */}
      <section className="fee-section">
        <div className="section-header">
          <h3>💳 Booking/Platform Fees</h3>
          <label className="toggle">
            <input
              type="checkbox"
              checked={bookingFeePolicy.enabled}
              onChange={(e) =>
                setBookingFeePolicy({ ...bookingFeePolicy, enabled: e.target.checked })
              }
              disabled={loading}
            />
            <span>{bookingFeePolicy.enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>

        {bookingFeePolicy.enabled && (
          <div className="policy-details">
            <p className="info">
              Platform fee added to booking cost. Shows transparently at checkout.
            </p>

            <div className="policy-group">
              <label>Fee Type:</label>
              <select
                value={bookingFeePolicy.type}
                onChange={(e) =>
                  setBookingFeePolicy({ ...bookingFeePolicy, type: e.target.value })
                }
              >
                <option value="percentage">Percentage</option>
                <option value="flat">Fixed Amount</option>
              </select>
            </div>

            <div className="policy-group">
              <label>Amount:</label>
              <div className="input-group">
                <input
                  type="number"
                  value={
                    bookingFeePolicy.type === 'percentage'
                      ? bookingFeePolicy.percentage
                      : bookingFeePolicy.amount
                  }
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (bookingFeePolicy.type === 'percentage') {
                      setBookingFeePolicy({ ...bookingFeePolicy, percentage: value });
                    } else {
                      setBookingFeePolicy({ ...bookingFeePolicy, amount: value });
                    }
                  }}
                  step="0.01"
                  min="0"
                />
                <span>{bookingFeePolicy.type === 'percentage' ? '%' : '$'}</span>
              </div>
            </div>

            <label className="toggle">
              <input
                type="checkbox"
                checked={bookingFeePolicy.nonRefundable}
                onChange={(e) =>
                  setBookingFeePolicy({ ...bookingFeePolicy, nonRefundable: e.target.checked })
                }
              />
              <span>Non-refundable</span>
            </label>
          </div>
        )}
      </section>

      {/* Messages */}
      {message && <div className="message success">{message}</div>}
      {error && <div className="message error">{error}</div>}

      {/* Actions */}
      <div className="actions">
        <button onClick={handleSave} disabled={loading} className="btn btn-primary">
          {loading ? 'Saving...' : '💾 Save Fee Policies'}
        </button>
      </div>
    </div>
  );
}


