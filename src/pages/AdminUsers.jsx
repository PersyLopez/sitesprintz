import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import UserDetailsModal from '../components/admin/UserDetailsModal';
import './AdminUsers.css';

function AdminUsers() {
  const { user, token } = useAuth();
  const { showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [invitePlan, setInvitePlan] = useState('starter');
  const [inviting, setInviting] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    admins: 0,
    trial: 0
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter, planFilter]);

  const loadUsers = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      setUsers(data.users || getMockUsers());
      calculateStats(data.users || getMockUsers());
    } catch (error) {
      console.error('Load users error:', error);
      // Use mock data for development
      const mockUsers = getMockUsers();
      setUsers(mockUsers);
      calculateStats(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const getMockUsers = () => ([
    {
      id: 1,
      email: 'john@example.com',
      name: 'John Doe',
      role: 'admin',
      status: 'active',
      plan: 'pro',
      sitesCount: 12,
      totalRevenue: 2400,
      createdAt: '2024-01-15T10:30:00Z',
      lastLogin: '2025-01-15T10:30:00Z',
      stripeConnected: true
    },
    {
      id: 2,
      email: 'jane@example.com',
      name: 'Jane Smith',
      role: 'user',
      status: 'active',
      plan: 'pro',
      sitesCount: 8,
      totalRevenue: 1800,
      createdAt: '2024-02-20T09:15:00Z',
      lastLogin: '2025-01-14T15:22:00Z',
      stripeConnected: true
    },
    {
      id: 3,
      email: 'bob@example.com',
      name: 'Bob Wilson',
      role: 'user',
      status: 'active',
      plan: 'checkout',
      sitesCount: 6,
      totalRevenue: 1200,
      createdAt: '2024-03-10T14:45:00Z',
      lastLogin: '2025-01-13T08:10:00Z',
      stripeConnected: false
    },
    {
      id: 4,
      email: 'alice@example.com',
      name: 'Alice Johnson',
      role: 'user',
      status: 'active',
      plan: 'starter',
      sitesCount: 5,
      totalRevenue: 900,
      createdAt: '2024-04-05T11:20:00Z',
      lastLogin: '2025-01-12T19:45:00Z',
      stripeConnected: false
    },
    {
      id: 5,
      email: 'charlie@example.com',
      name: 'Charlie Brown',
      role: 'user',
      status: 'active',
      plan: 'trial',
      sitesCount: 4,
      totalRevenue: 0,
      createdAt: '2025-01-10T16:30:00Z',
      lastLogin: '2025-01-15T07:50:00Z',
      stripeConnected: false
    },
    {
      id: 6,
      email: 'diana@example.com',
      name: 'Diana Prince',
      role: 'user',
      status: 'invited',
      plan: 'trial',
      sitesCount: 0,
      totalRevenue: 0,
      createdAt: '2025-01-14T12:00:00Z',
      lastLogin: null,
      stripeConnected: false
    },
    {
      id: 7,
      email: 'emma@example.com',
      name: 'Emma Watson',
      role: 'user',
      status: 'suspended',
      plan: 'checkout',
      sitesCount: 3,
      totalRevenue: 450,
      createdAt: '2024-11-20T10:15:00Z',
      lastLogin: '2024-12-28T14:30:00Z',
      stripeConnected: false
    },
    {
      id: 8,
      email: 'frank@example.com',
      name: 'Frank Miller',
      role: 'user',
      status: 'active',
      plan: 'starter',
      sitesCount: 2,
      totalRevenue: 300,
      createdAt: '2024-12-01T09:45:00Z',
      lastLogin: '2025-01-11T11:20:00Z',
      stripeConnected: false
    }
  ]);

  const calculateStats = (usersList) => {
    setStats({
      total: usersList.length,
      active: usersList.filter(u => u.status === 'active').length,
      admins: usersList.filter(u => u.role === 'admin').length,
      trial: usersList.filter(u => u.plan === 'trial').length
    });
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(term) ||
        u.name?.toLowerCase().includes(term)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.status === statusFilter);
    }

    // Plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter(u => u.plan === planFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();

    if (!inviteEmail) {
      showError('Please enter an email address');
      return;
    }

    setInviting(true);

    try {
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          plan: invitePlan
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }

      const result = await response.json();
      showSuccess(`Invitation sent to ${inviteEmail}!`);

      // Reset form
      setInviteEmail('');
      setInviteRole('user');
      setInvitePlan('starter');

      // Reload users
      loadUsers();
    } catch (error) {
      console.error('Invite error:', error);
      showError('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    const userToUpdate = users.find(u => u.id === userId);

    if (!userToUpdate) return;

    let confirmMessage = '';
    let endpoint = '';
    let method = 'POST';

    switch (action) {
      case 'suspend':
        confirmMessage = `Suspend user ${userToUpdate.email}?`;
        endpoint = `/api/admin/users/${userId}/suspend`;
        break;
      case 'activate':
        confirmMessage = `Activate user ${userToUpdate.email}?`;
        endpoint = `/api/admin/users/${userId}/activate`;
        break;
      case 'delete':
        confirmMessage = `Delete user ${userToUpdate.email}? This cannot be undone.`;
        endpoint = `/api/admin/users/${userId}`;
        method = 'DELETE';
        break;
      case 'make-admin':
        confirmMessage = `Grant admin privileges to ${userToUpdate.email}?`;
        endpoint = `/api/admin/users/${userId}/role`;
        break;
      default:
        return;
    }

    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('accessToken')}`
        },
        body: action === 'make-admin' ? JSON.stringify({ role: 'admin' }) : undefined
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`);
      }

      showSuccess(`User ${action}d successfully`);
      loadUsers();
    } catch (error) {
      console.error(`${action} error:`, error);
      showError(`Failed to ${action} user`);
    }
  };

  const viewUserDetails = (userId) => {
    const userToView = users.find(u => u.id === userId);
    if (userToView) {
      setSelectedUser(userToView);
      setShowUserModal(true);
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

  const getRoleBadgeClass = (role) => {
    return role === 'admin' ? 'role-admin' : 'role-user';
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="admin-users-page">
      <Header />

      <main className="admin-users-container">
        {/* Page Header */}
        <div className="admin-users-header">
          <div className="header-content">
            <h1>👥 User Management</h1>
            <p>Invite users and manage accounts • {stats.total} total users</p>
          </div>

          <div className="header-actions">
            <Link to="/admin" className="btn btn-secondary">
              📊 Admin Dashboard
            </Link>
            <Link to="/dashboard" className="btn btn-secondary">
              ← Back
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="user-stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Users</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active Users</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👑</div>
            <div className="stat-value">{stats.admins}</div>
            <div className="stat-label">Admins</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-value">{stats.trial}</div>
            <div className="stat-label">Trial Users</div>
          </div>
        </div>

        {/* Invite User Section */}
        <div className="invite-section">
          <h2>✉️ Invite New User</h2>
          <form onSubmit={handleInviteUser} className="invite-form">
            <div className="form-group">
              <label htmlFor="inviteEmail">Email Address</label>
              <input
                type="email"
                id="inviteEmail"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="inviteRole">Role</label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="invitePlan">Initial Plan</label>
              <select
                id="invitePlan"
                value={invitePlan}
                onChange={(e) => setInvitePlan(e.target.value)}
              >
                <option value="trial">Trial</option>
                <option value="starter">Starter</option>
                <option value="checkout">Checkout</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={inviting}
            >
              {inviting ? 'Sending...' : 'Send Invitation'}
            </button>
          </form>
        </div>

        {/* Users Section */}
        <div className="users-section">
          <div className="section-header">
            <h2>All Users</h2>

            <div className="filters">
              <input
                type="text"
                placeholder="🔍 Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="suspended">Suspended</option>
              </select>

              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Plans</option>
                <option value="trial">Trial</option>
                <option value="starter">Starter</option>
                <option value="checkout">Checkout</option>
                <option value="pro">Pro</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading users...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Plan</th>
                    <th>Sites</th>
                    <th>Revenue</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((userItem) => (
                    <tr key={userItem.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {userItem.name?.charAt(0).toUpperCase() || userItem.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="user-info">
                            <div className="user-name">{userItem.name || 'No name'}</div>
                            <div className="user-email">{userItem.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge ${getRoleBadgeClass(userItem.role)}`}>
                          {userItem.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusBadgeClass(userItem.status)}`}>
                          {userItem.status}
                        </span>
                      </td>
                      <td>
                        <span className={`plan-badge ${getPlanBadgeClass(userItem.plan)}`}>
                          {userItem.plan}
                        </span>
                      </td>
                      <td>{userItem.sitesCount}</td>
                      <td>${userItem.totalRevenue.toLocaleString()}</td>
                      <td>{formatDate(userItem.lastLogin)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => viewUserDetails(userItem.id)}
                            className="btn-action btn-view"
                            title="View Details"
                          >
                            👁️
                          </button>

                          {userItem.status === 'active' && (
                            <button
                              onClick={() => handleUserAction(userItem.id, 'suspend')}
                              className="btn-action btn-suspend"
                              title="Suspend User"
                            >
                              ⏸️
                            </button>
                          )}

                          {userItem.status === 'suspended' && (
                            <button
                              onClick={() => handleUserAction(userItem.id, 'activate')}
                              className="btn-action btn-activate"
                              title="Activate User"
                            >
                              ▶️
                            </button>
                          )}

                          {userItem.role !== 'admin' && (
                            <button
                              onClick={() => handleUserAction(userItem.id, 'make-admin')}
                              className="btn-action btn-promote"
                              title="Make Admin"
                            >
                              👑
                            </button>
                          )}

                          <button
                            onClick={() => handleUserAction(userItem.id, 'delete')}
                            className="btn-action btn-delete"
                            title="Delete User"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No Users Found</h3>
              <p>Try adjusting your filters or search term.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onUpdate={loadUsers}
        />
      )}
    </div>
  );
}

export default AdminUsers;

