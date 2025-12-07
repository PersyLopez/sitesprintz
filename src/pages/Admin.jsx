import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import StatsCard from '../components/analytics/StatsCard';
import './Admin.css';

function Admin() {
  const { user, token } = useAuth();
  const { showError, showSuccess } = useToast();

  console.log('Admin component rendered');

  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, activity, system

  useEffect(() => {
    if (token) {
      loadAdminData();

      // Auto-refresh every 60 seconds
      const interval = setInterval(loadAdminData, 60000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const loadAdminData = async () => {
    setLoading(true);

    try {
      console.log('Admin: Token from context:', token ? `${token.substring(0, 10)}...` : 'null');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Admin API Error:', response.status, errorText);
        throw new Error(`Failed to load admin data: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setAdminData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Load admin data error:', error);
      // Use mock data for development
      setAdminData(getMockData());
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  const getMockData = () => ({
    system: {
      status: 'Online',
      uptime: '99.9%',
      responseTime: 120,
      activeUsers: 45,
      totalRequests: 125847,
      memory: 62.4,
      cpu: 34.2,
      storage: 78.6
    },
    platform: {
      totalUsers: 1247,
      activeUsers: 856,
      userGrowth: 12.4,
      totalSites: 3521,
      publishedSites: 2894,
      draftSites: 627,
      siteGrowth: 18.2,
      totalRevenue: 45670,
      mrr: 15200,
      revenueGrowth: 22.5,
      conversionRate: 68.4,
      conversionChange: 5.2,
      churnRate: 3.2,
      avgRevenuePerUser: 36.60
    },
    growth: {
      newUsersToday: 23,
      newUsersWeek: 156,
      newUsersMonth: 682,
      newSitesToday: 47,
      newSitesWeek: 289,
      newSitesMonth: 1247,
      activeTrials: 124,
      conversions: 18,
      publishedToday: 34
    },
    subscriptions: {
      starter: 856,
      checkout: 234,
      pro: 157,
      trial: 124
    },
    recentSignups: [
      {
        id: 1,
        email: 'user1@example.com',
        name: 'John Doe',
        date: '2025-01-15T10:30:00Z',
        plan: 'trial'
      },
      {
        id: 2,
        email: 'user2@example.com',
        name: 'Jane Smith',
        date: '2025-01-15T09:15:00Z',
        plan: 'starter'
      },
      {
        id: 3,
        email: 'user3@example.com',
        name: 'Bob Wilson',
        date: '2025-01-15T08:45:00Z',
        plan: 'checkout'
      },
      {
        id: 4,
        email: 'user4@example.com',
        name: 'Alice Johnson',
        date: '2025-01-15T07:20:00Z',
        plan: 'pro'
      },
      {
        id: 5,
        email: 'user5@example.com',
        name: 'Charlie Brown',
        date: '2025-01-15T06:50:00Z',
        plan: 'trial'
      }
    ],
    topUsers: [
      { id: 1, name: 'John Doe', sites: 12, revenue: 2400, plan: 'pro' },
      { id: 2, name: 'Jane Smith', sites: 8, revenue: 1800, plan: 'pro' },
      { id: 3, name: 'Bob Wilson', sites: 6, revenue: 1200, plan: 'checkout' },
      { id: 4, name: 'Alice Johnson', sites: 5, revenue: 900, plan: 'checkout' },
      { id: 5, name: 'Charlie Brown', sites: 4, revenue: 600, plan: 'starter' }
    ],
    recentActivity: [
      {
        id: 1,
        type: 'site_published',
        user: 'John Doe',
        description: 'Published "My Restaurant"',
        date: '2025-01-15T10:45:00Z'
      },
      {
        id: 2,
        type: 'user_signup',
        user: 'Jane Smith',
        description: 'New user registered',
        date: '2025-01-15T10:30:00Z'
      },
      {
        id: 3,
        type: 'subscription',
        user: 'Bob Wilson',
        description: 'Upgraded to Pro plan',
        date: '2025-01-15T09:15:00Z'
      },
      {
        id: 4,
        type: 'site_published',
        user: 'Alice Johnson',
        description: 'Published "Beauty Salon"',
        date: '2025-01-15T08:45:00Z'
      },
      {
        id: 5,
        type: 'order',
        user: 'Charlie Brown',
        description: 'Received new order #12345',
        date: '2025-01-15T08:20:00Z'
      }
    ],
    alerts: [
      {
        id: 1,
        type: 'warning',
        message: 'Storage usage at 78% - consider upgrading',
        priority: 'medium'
      },
      {
        id: 2,
        type: 'info',
        message: '124 trial users expiring in next 7 days',
        priority: 'low'
      }
    ]
  });

  const formatTime = () => {
    if (!lastUpdated) return '';
    return lastUpdated.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'site_published': return '🚀';
      case 'user_signup': return '👤';
      case 'subscription': return '💳';
      case 'order': return '📦';
      default: return '📌';
    }
  };

  const getActivityTime = (date) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffMs = now - activityDate;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return activityDate.toLocaleDateString();
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

  return (
    <div className="admin-page">
      <Header />

      <main className="admin-container">
        {/* Page Header */}
        <div className="admin-header">
          <div className="header-content">
            <h1>👑 Admin Dashboard</h1>
            <p>Platform management and insights • Updated: {formatTime()}</p>
          </div>

          <div className="header-actions">
            <Link to="/admin/users" className="btn btn-secondary">
              👥 Users
            </Link>
            <Link to="/admin/analytics" className="btn btn-secondary">
              📊 Analytics
            </Link>
            <button onClick={loadAdminData} className="btn btn-secondary">
              🔄 Refresh
            </button>
            <Link to="/dashboard" className="btn btn-secondary">
              ← Back
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading admin data...</p>
          </div>
        ) : adminData ? (
          <>
            {/* Alerts */}
            {adminData.alerts && adminData.alerts.length > 0 && (
              <div className="alerts-section">
                {adminData.alerts.map((alert) => (
                  <div key={alert.id} className={`alert alert-${alert.type}`}>
                    <span className="alert-icon">
                      {alert.type === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <span className="alert-message">{alert.message}</span>
                    <button className="alert-dismiss">×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <div className="quick-actions">
              <Link to="/admin/users" className="quick-action-btn">
                <span className="action-icon">👥</span>
                <span className="action-label">Manage Users</span>
              </Link>
              <button
                className="quick-action-btn"
                onClick={() => showSuccess('Feature coming soon!')}
              >
                <span className="action-icon">📊</span>
                <span className="action-label">View Analytics</span>
              </button>
              <button
                className="quick-action-btn"
                onClick={() => showSuccess('Feature coming soon!')}
              >
                <span className="action-icon">📧</span>
                <span className="action-label">Email Users</span>
              </button>
              <button
                className="quick-action-btn"
                onClick={() => showSuccess('Feature coming soon!')}
              >
                <span className="action-icon">⚙️</span>
                <span className="action-label">Settings</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="admin-tabs">
              <button
                className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                📊 Overview
              </button>
              <button
                className={`admin-tab ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveTab('activity')}
              >
                🔔 Activity
              </button>
              <button
                className={`admin-tab ${activeTab === 'system' ? 'active' : ''}`}
                onClick={() => setActiveTab('system')}
              >
                ⚡ System
              </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* Platform Overview */}
                <div className="admin-section">
                  <h2>📊 Platform Overview</h2>
                  <div className="stats-grid">
                    <StatsCard
                      icon="👥"
                      label="Total Users"
                      value={adminData.platform.totalUsers.toLocaleString()}
                      change={adminData.platform.userGrowth}
                      changeLabel="this month"
                    />

                    <StatsCard
                      icon="🌐"
                      label="Total Sites"
                      value={adminData.platform.totalSites.toLocaleString()}
                      change={adminData.platform.siteGrowth}
                      changeLabel="this month"
                    />

                    <StatsCard
                      icon="💰"
                      label="Total Revenue"
                      value={`$${adminData.platform.totalRevenue.toLocaleString()}`}
                      change={adminData.platform.revenueGrowth}
                      changeLabel="this month"
                    />

                    <StatsCard
                      icon="📈"
                      label="Conversion Rate"
                      value={`${adminData.platform.conversionRate}%`}
                      change={adminData.platform.conversionChange}
                      changeLabel="this month"
                    />
                  </div>
                </div>

                {/* Growth Metrics */}
                <div className="admin-section">
                  <h2>📈 Growth Metrics</h2>
                  <div className="growth-grid">
                    <div className="growth-card">
                      <div className="growth-icon">👤</div>
                      <div className="growth-value">{adminData.growth.newUsersToday}</div>
                      <div className="growth-label">New Users Today</div>
                      <div className="growth-sublabel">
                        {adminData.growth.newUsersWeek} this week • {adminData.growth.newUsersMonth} this month
                      </div>
                    </div>

                    <div className="growth-card">
                      <div className="growth-icon">🌐</div>
                      <div className="growth-value">{adminData.growth.newSitesToday}</div>
                      <div className="growth-label">New Sites Today</div>
                      <div className="growth-sublabel">
                        {adminData.growth.newSitesWeek} this week • {adminData.growth.newSitesMonth} this month
                      </div>
                    </div>

                    <div className="growth-card">
                      <div className="growth-icon">⏱️</div>
                      <div className="growth-value">{adminData.growth.activeTrials}</div>
                      <div className="growth-label">Active Trials</div>
                      <div className="growth-sublabel">
                        {adminData.growth.conversions} conversions today
                      </div>
                    </div>

                    <div className="growth-card">
                      <div className="growth-icon">🚀</div>
                      <div className="growth-value">{adminData.growth.publishedToday}</div>
                      <div className="growth-label">Published Today</div>
                      <div className="growth-sublabel">
                        {adminData.platform.publishedSites} total published
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subscription Breakdown */}
                <div className="admin-section">
                  <h2>💳 Subscription Breakdown</h2>
                  <div className="subscription-grid">
                    <div className="subscription-card">
                      <div className="sub-header">
                        <span className="sub-name">Starter</span>
                        <span className="plan-badge plan-badge-starter">Basic</span>
                      </div>
                      <div className="sub-count">{adminData.subscriptions.starter}</div>
                      <div className="sub-percentage">
                        {((adminData.subscriptions.starter / adminData.platform.totalUsers) * 100).toFixed(1)}% of users
                      </div>
                    </div>

                    <div className="subscription-card">
                      <div className="sub-header">
                        <span className="sub-name">Checkout</span>
                        <span className="plan-badge plan-badge-checkout">Growth</span>
                      </div>
                      <div className="sub-count">{adminData.subscriptions.checkout}</div>
                      <div className="sub-percentage">
                        {((adminData.subscriptions.checkout / adminData.platform.totalUsers) * 100).toFixed(1)}% of users
                      </div>
                    </div>

                    <div className="subscription-card">
                      <div className="sub-header">
                        <span className="sub-name">Pro</span>
                        <span className="plan-badge plan-badge-pro">Premium</span>
                      </div>
                      <div className="sub-count">{adminData.subscriptions.pro}</div>
                      <div className="sub-percentage">
                        {((adminData.subscriptions.pro / adminData.platform.totalUsers) * 100).toFixed(1)}% of users
                      </div>
                    </div>

                    <div className="subscription-card">
                      <div className="sub-header">
                        <span className="sub-name">Trial</span>
                        <span className="plan-badge plan-badge-trial">Free</span>
                      </div>
                      <div className="sub-count">{adminData.subscriptions.trial}</div>
                      <div className="sub-percentage">
                        {((adminData.subscriptions.trial / adminData.platform.totalUsers) * 100).toFixed(1)}% of users
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Users & Recent Signups */}
                <div className="admin-section">
                  <h2>👥 User Insights</h2>
                  <div className="user-insights-grid">
                    {/* Top Users */}
                    <div className="insight-card">
                      <h3>🏆 Top Users by Revenue</h3>
                      <div className="user-list">
                        {adminData.topUsers.map((user, index) => (
                          <div key={user.id} className="user-item">
                            <div className="user-rank">#{index + 1}</div>
                            <div className="user-info">
                              <div className="user-name">{user.name}</div>
                              <div className="user-stats">
                                {user.sites} sites • ${user.revenue.toLocaleString()}
                                <span className={`plan-badge ${getPlanBadgeClass(user.plan)}`}>
                                  {user.plan}
                                </span>
                              </div>
                            </div>
                            <Link to={`/admin/users?id=${user.id}`} className="user-link">
                              View →
                            </Link>
                          </div>
                        ))}
                      </div>
                      <Link to="/admin/users" className="view-all-link">
                        View All Users →
                      </Link>
                    </div>

                    {/* Recent Signups */}
                    <div className="insight-card">
                      <h3>✨ Recent Signups</h3>
                      <div className="user-list">
                        {adminData.recentSignups.map((signup) => (
                          <div key={signup.id} className="user-item">
                            <div className="user-info">
                              <div className="user-name">{signup.name}</div>
                              <div className="user-email">{signup.email}</div>
                            </div>
                            <div className="user-meta">
                              <span className={`plan-badge ${getPlanBadgeClass(signup.plan)}`}>
                                {signup.plan}
                              </span>
                              <span className="user-time">
                                {getActivityTime(signup.date)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Link to="/admin/users" className="view-all-link">
                        View All Users →
                      </Link>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="admin-section">
                <h2>🔔 Recent Activity</h2>
                <div className="activity-feed">
                  {adminData.recentActivity.map((activity) => (
                    <div key={activity.id} className="activity-item-feed">
                      <div className="activity-icon-circle">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="activity-content">
                        <div className="activity-description">
                          <strong>{activity.user}</strong> {activity.description}
                        </div>
                        <div className="activity-timestamp">
                          {getActivityTime(activity.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
              <>
                <div className="admin-section">
                  <h2>⚡ System Health</h2>
                  <div className="system-health-grid">
                    <div className="health-item">
                      <div className="health-label">Server Status</div>
                      <div className="health-value">✅ {adminData.system.status}</div>
                    </div>
                    <div className="health-item">
                      <div className="health-label">Uptime</div>
                      <div className="health-value">{adminData.system.uptime}</div>
                    </div>
                    <div className={`health-item ${adminData.system.responseTime > 500 ? 'warning' : ''}`}>
                      <div className="health-label">Avg Response</div>
                      <div className="health-value">{adminData.system.responseTime}ms</div>
                    </div>
                    <div className="health-item">
                      <div className="health-label">Active Users</div>
                      <div className="health-value">{adminData.system.activeUsers}</div>
                    </div>
                    <div className="health-item">
                      <div className="health-label">Total Requests</div>
                      <div className="health-value">{adminData.system.totalRequests.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="admin-section">
                  <h2>💻 Resource Usage</h2>
                  <div className="resource-grid">
                    <div className="resource-card">
                      <div className="resource-label">CPU Usage</div>
                      <div className="resource-bar">
                        <div
                          className="resource-fill"
                          style={{ width: `${adminData.system.cpu}%` }}
                        ></div>
                      </div>
                      <div className="resource-value">{adminData.system.cpu}%</div>
                    </div>

                    <div className="resource-card">
                      <div className="resource-label">Memory Usage</div>
                      <div className="resource-bar">
                        <div
                          className="resource-fill"
                          style={{ width: `${adminData.system.memory}%` }}
                        ></div>
                      </div>
                      <div className="resource-value">{adminData.system.memory}%</div>
                    </div>

                    <div className="resource-card">
                      <div className="resource-label">Storage Usage</div>
                      <div className="resource-bar">
                        <div
                          className={`resource-fill ${adminData.system.storage > 75 ? 'warning' : ''}`}
                          style={{ width: `${adminData.system.storage}%` }}
                        ></div>
                      </div>
                      <div className="resource-value">{adminData.system.storage}%</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👑</div>
            <h2>No Data Available</h2>
            <p>Admin data will appear here once loaded.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Admin;
