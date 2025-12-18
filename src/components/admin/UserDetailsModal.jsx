import React, { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import './UserDetailsModal.css';

function UserDetailsModal({ user, onClose, onUpdate }) {
  const { showError, showSuccess } = useToast();
  const [editing, setEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({ ...user });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editedUser)
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

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
      const response = await fetch(`/api/admin/users/${user.id}/resend-invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to resend invitation');
      }

      showSuccess('Invitation resent successfully');
    } catch (error) {
      console.error('Resend invite error:', error);
      showError('Failed to resend invitation');
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm('Send password reset email to this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to send reset email');
      }

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
      case 'checkout': return 'plan-badge-checkout';
      case 'starter': return 'plan-badge-starter';
      case 'trial': return 'plan-badge-trial';
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
      <div className="modal-content user-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👤 User Details</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* User Avatar & Basic Info */}
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
                <span className={`status-badge ${getStatusBadgeClass(user.status)}`}>
                  {user.status}
                </span>
                <span className={`plan-badge ${getPlanBadgeClass(user.plan)}`}>
                  {user.plan}
                </span>
                <span className="role-badge">
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* User Stats */}
          <div className="user-stats-section">
            <div className="stat-item">
              <div className="stat-label">Sites Created</div>
              <div className="stat-value">{user.sitesCount || 0}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">${(user.totalRevenue || 0).toLocaleString()}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Stripe Connected</div>
              <div className="stat-value">{user.stripeConnected ? '✅ Yes' : '❌ No'}</div>
            </div>
          </div>

          {/* User Details */}
          <div className="user-details-section">
            <div className="detail-row">
              <span className="detail-label">User ID:</span>
              <span className="detail-value">{user.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Account Created:</span>
              <span className="detail-value">{formatDate(user.createdAt)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Last Login:</span>
              <span className="detail-value">{formatDate(user.lastLogin)}</span>
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
                    <option value="checkout">Checkout</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <select
                    value={editedUser.status}
                    onChange={(e) => setEditedUser({ ...editedUser, status: e.target.value })}
                    className="edit-select"
                  >
                    <option value="active">Active</option>
                    <option value="invited">Invited</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="user-actions">
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="btn btn-primary"
                >
                  ✏️ Edit User
                </button>
                {user.status === 'invited' && (
                  <button
                    onClick={handleResendInvite}
                    className="btn btn-secondary"
                  >
                    📧 Resend Invite
                  </button>
                )}
                <button
                  onClick={handleResetPassword}
                  className="btn btn-secondary"
                >
                  🔑 Reset Password
                </button>
                <button
                  onClick={onClose}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditedUser({ ...user });
                  }}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDetailsModal;

