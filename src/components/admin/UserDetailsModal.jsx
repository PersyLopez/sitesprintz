import React, { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { api } from '../../services/api';
import './UserDetailsModal.css';

function UserDetailsModal({ user, onClose, onUpdate }) {
  const { showError, showSuccess } = useToast();
  const [editing, setEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({ ...user });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/admin/users/${user.id}`, editedUser);
      showSuccess('User updated successfully');
      setEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Update error:', error);
      showError('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async () => {
    try {
      await api.post(`/api/admin/users/${user.id}/resend-invite`);
      showSuccess('Invitation resent successfully');
    } catch (error) {
      console.error('Resend invite error:', error);
      showError('Failed to resend invitation');
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm('Send password reset email to this user?')) return;
    try {
      await api.post(`/api/admin/users/${user.id}/reset-password`);
      showSuccess('Password reset email sent');
    } catch (error) {
      console.error('Reset password error:', error);
      showError('Failed to send reset email');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlanBadgeClass = (plan) => {
    switch (plan?.toLowerCase()) {
      case 'pro': return 'plan-badge-pro';
      case 'growth': return 'plan-badge-growth';
      case 'starter': return 'plan-badge-starter';
      case 'trial': return 'plan-badge-trial';
      case 'premium': return 'plan-badge-premium';
      default: return '';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'invited': return 'status-invited';
      case 'suspended': return 'status-suspended';
      default: return '';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content user-details-modal" data-testid="user-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👤 User Details</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="user-header">
            <div className="user-avatar-large">
              {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
            </div>
            <div className="user-basic-info">
              {editing ? (
                <>
                  <input
                    type="text"
                    value={editedUser.name || ''}
                    onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                    placeholder="User Name"
                    className="edit-input name-input"
                  />
                  <input
                    type="email"
                    value={editedUser.email}
                    onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                    className="edit-input email-input"
                  />
                </>
              ) : (
                <>
                  <h3>{user.name || 'No name set'}</h3>
                  <p>{user.email}</p>
                </>
              )}
              <div className="user-badges">
                <span className={`status-badge ${getStatusBadgeClass(user.status)}`}>{user.status}</span>
                <span className={`plan-badge ${getPlanBadgeClass(user.plan)}`}>{user.plan}</span>
                <span className="role-badge">{user.role}</span>
              </div>
            </div>
          </div>

          <div className="user-stats-section">
            <div className="stat-item" data-testid="stat-item-sites">
              <div className="stat-label">Sites Created</div>
              <div className="stat-value">{user.sitesCount || 0}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Revenue</div>
              <div className="stat-value">${(user.totalRevenue || 0).toLocaleString()}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Stripe</div>
              <div className="stat-value">{user.stripeConnected ? '✅' : '❌'}</div>
            </div>
          </div>

          <div className="user-details-section">
            <div className="detail-row">
              <span className="detail-label">ID:</span>
              <span className="detail-value">{user.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Created:</span>
              <span className="detail-value">{formatDate(user.createdAt)}</span>
            </div>
            {editing && (
              <>
                <div className="detail-row">
                  <span className="detail-label">Role:</span>
                  <select
                    value={editedUser.role}
                    onChange={(e) => setEditedUser({ ...editedUser, role: e.target.value })}
                    className="edit-select"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Plan:</span>
                  <select
                    value={editedUser.plan}
                    onChange={(e) => setEditedUser({ ...editedUser, plan: e.target.value })}
                    className="edit-select"
                  >
                    <option value="trial">Trial</option>
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="user-actions">
            {!editing ? (
              <>
                <button onClick={() => setEditing(true)} className="btn btn-primary">✏️ Edit</button>
                <button onClick={handleResetPassword} className="btn btn-secondary">🔑 Reset PWD</button>
                <button onClick={onClose} className="btn btn-secondary">Close</button>
              </>
            ) : (
              <>
                <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : '💾 Save'}
                </button>
                <button onClick={() => setEditing(false)} className="btn btn-secondary" disabled={saving}>Cancel</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDetailsModal;
