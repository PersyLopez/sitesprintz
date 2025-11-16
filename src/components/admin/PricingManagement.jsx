import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import './PricingManagement.css';

function PricingManagement() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [history, setHistory] = useState({});

  useEffect(() => {
    if (user?.role === 'admin') {
      loadPricing();
    }
  }, [user]);

  const loadPricing = async () => {
    try {
      const response = await fetch('/api/pricing/admin/all', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setPricing(data.pricing);
      }
    } catch (error) {
      console.error('Error loading pricing:', error);
      showError('Failed to load pricing');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (plan) => {
    try {
      const response = await fetch(`/api/pricing/admin/history/${plan}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setHistory(prev => ({ ...prev, [plan]: data.history }));
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    loadHistory(plan.plan);
  };

  const handleSave = async (plan) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/pricing/admin/${plan.plan}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          price_monthly: plan.price_monthly_dollars, // Send as dollars
          price_annual: plan.price_annual_dollars,
          name: plan.name,
          description: plan.description,
          features: plan.features,
          trial_days: plan.trial_days,
          is_active: plan.is_active,
          is_popular: plan.is_popular,
          display_order: plan.display_order
        })
      });

      const data = await response.json();
      if (data.success) {
        showSuccess('Pricing updated successfully');
        setEditingPlan(null);
        loadPricing();
      } else {
        showError(data.error || 'Failed to update pricing');
      }
    } catch (error) {
      console.error('Error saving pricing:', error);
      showError('Failed to save pricing');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickUpdate = async () => {
    setSaving(true);
    try {
      const starterPrice = pricing.find(p => p.plan === 'starter')?.price_monthly_dollars;
      const proPrice = pricing.find(p => p.plan === 'pro')?.price_monthly_dollars;
      const premiumPrice = pricing.find(p => p.plan === 'premium')?.price_monthly_dollars;

      const response = await fetch('/api/pricing/admin/quick-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          starter: starterPrice,
          pro: proPrice,
          premium: premiumPrice
        })
      });

      const data = await response.json();
      if (data.success) {
        showSuccess('All pricing updated successfully');
        loadPricing();
      } else {
        showError(data.error || 'Failed to update pricing');
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
      showError('Failed to update pricing');
    } finally {
      setSaving(false);
    }
  };

  const updatePlanPrice = (planName, field, value) => {
    setPricing(prev => prev.map(p => 
      p.plan === planName 
        ? { ...p, [field]: parseFloat(value) || 0 }
        : p
    ));
  };

  if (user?.role !== 'admin') {
    return (
      <div className="pricing-management">
        <div className="error-message">
          <h2>Access Denied</h2>
          <p>You must be an administrator to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pricing-management">
        <div className="loading">Loading pricing...</div>
      </div>
    );
  }

  return (
    <div className="pricing-management">
      <div className="pricing-header">
        <h1>💰 Pricing Management</h1>
        <p>Manage subscription pricing for all plans</p>
      </div>

      <div className="quick-update-section">
        <h2>Quick Price Update</h2>
        <div className="quick-update-grid">
          {pricing.map(plan => (
            <div key={plan.plan} className="quick-update-item">
              <label>
                <span className="plan-name">{plan.name}</span>
                <div className="price-input-group">
                  <span className="currency">$</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={plan.price_monthly_dollars || ''}
                    onChange={(e) => updatePlanPrice(plan.plan, 'price_monthly_dollars', e.target.value)}
                    className="price-input"
                  />
                  <span className="period">/month</span>
                </div>
              </label>
            </div>
          ))}
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleQuickUpdate}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Update All Prices'}
        </button>
      </div>

      <div className="pricing-table">
        <h2>Detailed Plan Management</h2>
        <table>
          <thead>
            <tr>
              <th>Plan</th>
              <th>Name</th>
              <th>Monthly Price</th>
              <th>Annual Price</th>
              <th>Trial Days</th>
              <th>Status</th>
              <th>Popular</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pricing.map(plan => (
              <tr key={plan.plan} className={!plan.is_active ? 'inactive' : ''}>
                <td><strong>{plan.plan}</strong></td>
                <td>{plan.name}</td>
                <td className="price-cell">
                  ${plan.price_monthly_dollars}/mo
                  <span className="price-cents">({plan.price_monthly} cents)</span>
                </td>
                <td className="price-cell">
                  {plan.price_annual_dollars 
                    ? `$${plan.price_annual_dollars}/yr` 
                    : '—'}
                </td>
                <td>{plan.trial_days} days</td>
                <td>
                  <span className={`status-badge ${plan.is_active ? 'active' : 'inactive'}`}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  {plan.is_popular && <span className="popular-badge">⭐ Popular</span>}
                </td>
                <td>
                  <button 
                    className="btn btn-small btn-secondary"
                    onClick={() => handleEdit(plan)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingPlan && (
        <div className="modal-overlay" onClick={() => setEditingPlan(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit {editingPlan.name} Plan</h2>
              <button className="close-btn" onClick={() => setEditingPlan(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Plan Name</label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label>Monthly Price ($)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={editingPlan.price_monthly_dollars || ''}
                    onChange={(e) => setEditingPlan({ 
                      ...editingPlan, 
                      price_monthly_dollars: parseFloat(e.target.value) || 0 
                    })}
                    className="form-control"
                  />
                  <small className="form-hint">Current: ${editingPlan.price_monthly_dollars}/month</small>
                </div>

                <div className="form-group">
                  <label>Annual Price ($) <span className="optional">(optional)</span></label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={editingPlan.price_annual_dollars || ''}
                    onChange={(e) => setEditingPlan({ 
                      ...editingPlan, 
                      price_annual_dollars: parseFloat(e.target.value) || 0 
                    })}
                    className="form-control"
                  />
                  <small className="form-hint">
                    {editingPlan.price_annual_dollars 
                      ? `Equivalent to $${(editingPlan.price_annual_dollars / 12).toFixed(2)}/month`
                      : 'Leave empty for no annual option'}
                  </small>
                </div>

                <div className="form-group">
                  <label>Trial Period (days)</label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={editingPlan.trial_days || 0}
                    onChange={(e) => setEditingPlan({ 
                      ...editingPlan, 
                      trial_days: parseInt(e.target.value) || 0 
                    })}
                    className="form-control"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={editingPlan.description || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                    className="form-control"
                    rows="2"
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editingPlan.is_active || false}
                      onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                    />
                    <span>Active (visible to customers)</span>
                  </label>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editingPlan.is_popular || false}
                      onChange={(e) => setEditingPlan({ ...editingPlan, is_popular: e.target.checked })}
                    />
                    <span>Mark as "Popular"</span>
                  </label>
                </div>
              </div>

              {history[editingPlan.plan] && history[editingPlan.plan].length > 0 && (
                <div className="pricing-history">
                  <h3>Price Change History</h3>
                  <div className="history-list">
                    {history[editingPlan.plan].slice(0, 5).map((change, idx) => (
                      <div key={idx} className="history-item">
                        <span className="history-date">
                          {new Date(change.changed_at).toLocaleDateString()}
                        </span>
                        <span className="history-change">
                          ${change.old_price_dollars} → ${change.new_price_dollars}
                        </span>
                        <span className="history-user">
                          by {change.changed_by_email}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setEditingPlan(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => handleSave(editingPlan)}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PricingManagement;

