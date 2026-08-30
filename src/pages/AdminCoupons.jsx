import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import AdminSubnav from '../components/admin/AdminSubnav';
import Footer from '../components/layout/Footer';
import './AdminCoupons.css';

const CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;
const PLAN_OPTIONS = [
  { id: 'starter', label: 'Starter' },
  { id: 'growth', label: 'Growth' },
  { id: 'growth_managed', label: 'Growth Managed' },
];

function AdminCoupons() {
  const { token } = useAuth();
  const { showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState([]);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [usageLimit, setUsageLimit] = useState('unlimited');
  const [limitedCount, setLimitedCount] = useState('');
  const [duration, setDuration] = useState('once');
  const [durationMonths, setDurationMonths] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [firstTimeOnly, setFirstTimeOnly] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState([]);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token || localStorage.getItem('accessToken')}`,
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/coupons', {
        headers: { Authorization: authHeaders().Authorization },
      });
      if (!response.ok) throw new Error('Failed to load coupons');
      const data = await response.json();
      setCoupons(data.coupons || []);
    } catch {
      showError('Failed to load coupons');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCode('');
    setDiscountType('percent');
    setDiscountValue('');
    setUsageLimit('unlimited');
    setLimitedCount('');
    setDuration('once');
    setDurationMonths('');
    setExpiresAt('');
    setFirstTimeOnly(false);
    setSelectedPlans([]);
  };

  const togglePlan = (planId) => {
    setSelectedPlans((prev) =>
      prev.includes(planId) ? prev.filter((p) => p !== planId) : [...prev, planId]
    );
  };

  const validateForm = () => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      showError('Please enter a coupon code');
      return null;
    }
    if (!CODE_PATTERN.test(normalized)) {
      showError('Code must be 3–32 characters: letters, numbers, underscore, or hyphen');
      return null;
    }

    const value = Number(discountValue);
    if (!discountValue || Number.isNaN(value) || value <= 0) {
      showError('Please enter a discount value');
      return null;
    }

    if (discountType === 'percent') {
      if (!Number.isInteger(value) || value < 1 || value > 100) {
        showError('Percent off must be a whole number from 1 to 100');
        return null;
      }
    } else if (!Number.isInteger(value * 100) || value <= 0) {
      showError('Dollar amount must be greater than zero');
      return null;
    }

    if (usageLimit === 'limited') {
      const max = Number(limitedCount);
      if (!Number.isInteger(max) || max < 1) {
        showError('Please enter how many people can use this code');
        return null;
      }
    }

    if (duration === 'repeating') {
      const months = Number(durationMonths);
      if (!Number.isInteger(months) || months < 1 || months > 36) {
        showError('Repeat months must be between 1 and 36');
        return null;
      }
    }

    const body = {
      code: normalized,
      duration,
      firstTimeOnly: firstTimeOnly || undefined,
    };

    if (discountType === 'percent') {
      body.percent = value;
    } else {
      body.amount = Math.round(value * 100);
    }

    if (usageLimit === 'one') {
      body.maxRedemptions = 1;
    } else if (usageLimit === 'limited') {
      body.maxRedemptions = Number(limitedCount);
    }

    if (duration === 'repeating') {
      body.durationInMonths = Number(durationMonths);
    }

    if (expiresAt) {
      body.expiresAt = new Date(`${expiresAt}T23:59:59`).toISOString();
    }

    if (selectedPlans.length > 0) {
      body.appliesToPlans = selectedPlans;
    }

    return body;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const body = validateForm();
    if (!body) return;

    setCreating(true);
    try {
      const response = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data.error || 'Failed to create coupon';
        if (data.code === 'STRIPE_NOT_CONFIGURED') {
          showError('Stripe is not configured on this server');
        } else {
          showError(message);
        }
        return;
      }

      showSuccess(data.message || `Coupon ${body.code} created`);
      resetForm();
      loadCoupons();
    } catch {
      showError('Failed to create coupon');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (coupon) => {
    setTogglingId(coupon.id);
    try {
      const response = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ active: !coupon.active }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.code === 'STRIPE_NOT_CONFIGURED') {
          showError('Stripe is not configured on this server');
        } else {
          showError(data.error || 'Failed to update coupon');
        }
        return;
      }

      showSuccess(coupon.active ? 'Coupon deactivated' : 'Coupon activated');
      loadCoupons();
    } catch {
      showError('Failed to update coupon');
    } finally {
      setTogglingId(null);
    }
  };

  const formatDiscount = (coupon) => {
    if (coupon.percentOff != null) return `${coupon.percentOff}% off`;
    if (coupon.amountOffCents != null) return `$${(coupon.amountOffCents / 100).toFixed(2)} off`;
    return '—';
  };

  const formatUsage = (coupon) => {
    if (coupon.maxRedemptions == null) return 'Unlimited';
    if (coupon.maxRedemptions === 1) return 'One person';
    return `Up to ${coupon.maxRedemptions}`;
  };

  const formatDuration = (coupon) => {
    if (coupon.duration === 'once') return 'First invoice only';
    if (coupon.duration === 'forever') return 'Every invoice';
    if (coupon.duration === 'repeating') {
      return `${coupon.durationInMonths} month${coupon.durationInMonths === 1 ? '' : 's'}`;
    }
    return coupon.duration;
  };

  const formatPlans = (plans) => {
    if (!plans?.length) return 'All plans';
    return plans
      .map((p) => PLAN_OPTIONS.find((o) => o.id === p)?.label || p)
      .join(', ');
  };

  return (
    <div className="admin-coupons-page" data-testid="admin-coupons-page">
      <Header />
      <AdminSubnav />

      <main className="admin-coupons-container">
        <div className="admin-coupons-header">
          <div className="header-content">
            <h1>Coupon Codes</h1>
            <p>Create discount codes for subscriptions • {coupons.length} total</p>
          </div>
          <div className="header-actions">
            <Link to="/dashboard" className="btn btn-secondary">
              ← Back
            </Link>
          </div>
        </div>

        <div className="create-section">
          <h2>Create a coupon</h2>
          <form onSubmit={handleCreate} className="coupon-form">
            <div className="form-group">
              <label htmlFor="couponCode">Code</label>
              <input
                type="text"
                id="couponCode"
                data-testid="coupon-code-input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SUMMER25"
                autoComplete="off"
              />
            </div>

            <div className="form-group">
              <label htmlFor="discountType">Discount type</label>
              <select
                id="discountType"
                data-testid="coupon-discount-type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
              >
                <option value="percent">Percent off</option>
                <option value="amount">Dollar off</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="discountValue">
                {discountType === 'percent' ? 'Percent off' : 'Dollar amount'}
              </label>
              <input
                type="number"
                id="discountValue"
                data-testid="coupon-discount-value"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percent' ? '25' : '10.00'}
                min="0"
                step={discountType === 'percent' ? '1' : '0.01'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="usageLimit">Who can use this code</label>
              <select
                id="usageLimit"
                data-testid="coupon-usage-limit"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
              >
                <option value="one">One person only</option>
                <option value="limited">Limited number</option>
                <option value="unlimited">Unlimited</option>
              </select>
            </div>

            {usageLimit === 'limited' && (
              <div className="form-group">
                <label htmlFor="limitedCount">Maximum uses</label>
                <input
                  type="number"
                  id="limitedCount"
                  data-testid="coupon-limited-count"
                  value={limitedCount}
                  onChange={(e) => setLimitedCount(e.target.value)}
                  placeholder="100"
                  min="1"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="duration">On a subscription</label>
              <select
                id="duration"
                data-testid="coupon-duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                <option value="once">First invoice only</option>
                <option value="repeating">Repeat for N months</option>
                <option value="forever">Every invoice</option>
              </select>
            </div>

            {duration === 'repeating' && (
              <div className="form-group">
                <label htmlFor="durationMonths">Number of months</label>
                <input
                  type="number"
                  id="durationMonths"
                  data-testid="coupon-duration-months"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  placeholder="3"
                  min="1"
                  max="36"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="expiresAt">Expiry date (optional)</label>
              <input
                type="date"
                id="expiresAt"
                data-testid="coupon-expires-at"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="form-group form-group-checkbox">
              <label>
                <input
                  type="checkbox"
                  data-testid="coupon-first-time-only"
                  checked={firstTimeOnly}
                  onChange={(e) => setFirstTimeOnly(e.target.checked)}
                />
                First-time customers only
              </label>
            </div>

            <fieldset className="form-group plans-fieldset">
              <legend>Which plans (leave unchecked for all)</legend>
              {PLAN_OPTIONS.map((plan) => (
                <label key={plan.id} className="plan-checkbox">
                  <input
                    type="checkbox"
                    data-testid={`coupon-plan-${plan.id}`}
                    checked={selectedPlans.includes(plan.id)}
                    onChange={() => togglePlan(plan.id)}
                  />
                  {plan.label}
                </label>
              ))}
            </fieldset>

            <button
              type="submit"
              className="btn btn-primary"
              data-testid="coupon-create-submit"
              disabled={creating}
            >
              {creating ? 'Creating…' : 'Create coupon'}
            </button>
          </form>
        </div>

        <div className="coupons-section">
          <h2>All coupons</h2>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner" />
              <p>Loading coupons…</p>
            </div>
          ) : coupons.length > 0 ? (
            <div className="coupons-table-container" data-testid="coupon-list">
              <table className="coupons-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Discount</th>
                    <th>Usage limit</th>
                    <th>Duration</th>
                    <th>Plans</th>
                    <th>Redeemed</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} data-testid={`coupon-row-${coupon.id}`}>
                      <td className="coupon-code-cell">{coupon.code}</td>
                      <td>{formatDiscount(coupon)}</td>
                      <td>{formatUsage(coupon)}</td>
                      <td>{formatDuration(coupon)}</td>
                      <td>{formatPlans(coupon.appliesToPlans)}</td>
                      <td>{coupon.timesRedeemed ?? 0}</td>
                      <td>
                        <span className={`status-badge ${coupon.active ? 'status-active' : 'status-inactive'}`}>
                          {coupon.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-sm ${coupon.active ? 'btn-secondary' : 'btn-primary'}`}
                          data-testid={`coupon-toggle-${coupon.id}`}
                          disabled={togglingId === coupon.id}
                          onClick={() => handleToggleActive(coupon)}
                        >
                          {togglingId === coupon.id
                            ? 'Saving…'
                            : coupon.active
                              ? 'Deactivate'
                              : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" data-testid="coupon-list">
              <h3>No coupons yet</h3>
              <p>Create your first discount code using the form above.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AdminCoupons;
