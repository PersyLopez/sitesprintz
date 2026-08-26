import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { usePlan } from '../hooks/usePlan';
import { isTrialingStatus } from '../config/tiers';
import { sitesService } from '../services/sites';
import api from '../services/api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SiteCard from '../components/dashboard/SiteCard';
import WelcomeModal from '../components/dashboard/WelcomeModal';
import TrialBanner from '../components/dashboard/TrialBanner';
import SkeletonLoader from '../components/common/SkeletonLoader';
import './Dashboard.css';

function DashboardIcon({ path, className = 'dashboard-icon' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="1.15em"
      height="1.15em"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" d={path} />
    </svg>
  );
}

const DASHBOARD_ICONS = {
  stats: 'M3 13h2v8H3v-8zm4-4h2v12H7V9zm4-4h2v16h-2V5zm4 8h2v8h-2v-8z',
  published: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  draft: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
  empty: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
  billing: 'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z',
  admin: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
  users: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  settings: 'M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
};

function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, token, loading: authLoading } = useAuth();
  const { isGrowth } = usePlan();
  const { showSuccess, showError } = useToast();

  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    // Handle return from Stripe Connect
    const connectParam = searchParams.get('connect');
    if (connectParam === 'success') {
      showSuccess('Stripe Connect setup completed!');
      setSearchParams({}, { replace: true });
    } else if (connectParam === 'refresh') {
      showSuccess('Refreshing Stripe Connect setup...');
      setSearchParams({}, { replace: true });
    }

    loadUserSites();
  }, [authLoading]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('hasVisitedDashboard', 'true');
  };

  const loadUserSites = async () => {
    if (!user?.id) return;

    try {
      const data = await sitesService.getUserSites(user.id);
      const list = data.sites || [];
      setSites(list);

      // First-run welcome only when the account has no sites yet
      const hasVisited = localStorage.getItem('hasVisitedDashboard');
      if (!hasVisited && list.length === 0) {
        setShowWelcome(true);
      }
    } catch (error) {
      console.error('Failed to load sites:', error);
      const { analyzeError } = await import('../utils/errorHelpers');
      const errorInfo = analyzeError(error);
      
      showError(errorInfo.message, {
        action: {
          label: errorInfo.action.label,
          type: errorInfo.action.type,
          onRetry: errorInfo.action.type === 'retry' ? () => {
            setLoading(true);
            loadUserSites();
          } : undefined,
          path: errorInfo.action.path
        },
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSite = async (siteId) => {
    if (!confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      return;
    }

    try {
      await sitesService.deleteSite(user.id, siteId);
      setSites(sites.filter(site => site.id !== siteId));
      showSuccess('Site deleted successfully');
    } catch (error) {
      showError('Failed to delete site');
    }
  };

  const handleDuplicateSite = async (siteId) => {
    try {
      const data = await api.post(`/api/sites/${siteId}/duplicate`);
      setSites([...sites, data]);
      showSuccess('Site duplicated successfully');
    } catch (error) {
      showError('Failed to duplicate site');
    }
  };

  const openBillingPortal = async () => {
    try {
      const response = await fetch('/api/payments/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ returnUrl: window.location.href })
      });
      
      if (!response.ok) {
        throw new Error('Failed to open billing portal');
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening billing portal:', error);
      showError('Failed to open billing portal');
    }
  };

  return (
    <div className="dashboard-page">
      <a href="#dashboard-main" className="skip-to-content">
        Skip to main content
      </a>
      <Header />

      <main id="dashboard-main" className="dashboard-container">
        {/* Trial Banner */}
        {(isTrialingStatus(user?.subscriptionStatus) || isTrialingStatus(user?.subscription_status)) && (
          <TrialBanner user={user} />
        )}

        <div className="dashboard-header" data-testid="dashboard-header">
          <div className="user-greeting">
            <h1>Welcome back, {user?.name || user?.email?.split('@')[0] || 'there'}!</h1>
            <p data-testid="dashboard-subtitle">Your sites — open one to manage orders, appointments, and settings</p>
          </div>

          <div className="dashboard-header-actions" data-testid="dashboard-quick-actions">
            {(user?.subscriptionPlan === 'starter' || user?.subscriptionPlan === 'pro' || user?.subscriptionPlan === 'checkout' || user?.subscription_plan === 'starter' || user?.subscription_plan === 'pro' || isGrowth) && (
              <button onClick={openBillingPortal} className="btn btn-secondary dashboard-btn-with-icon" title="Manage your billing and subscription">
                <DashboardIcon path={DASHBOARD_ICONS.billing} /> Manage Billing
              </button>
            )}

            {user?.role === 'admin' && (
              <>
                <Link to="/admin" className="btn btn-secondary dashboard-btn-with-icon">
                  <DashboardIcon path={DASHBOARD_ICONS.admin} /> Admin
                </Link>
                <Link to="/admin/users" className="btn btn-secondary dashboard-btn-with-icon">
                  <DashboardIcon path={DASHBOARD_ICONS.users} /> Users
                </Link>
              </>
            )}

            <Link to="/settings/billing" className="btn btn-secondary dashboard-btn-with-icon" data-testid="dashboard-account-settings">
              <DashboardIcon path={DASHBOARD_ICONS.settings} /> Account
            </Link>

            <Link to="/setup" className="btn btn-primary" data-testid="create-site-button">
              <span>+</span> Create New Site
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="sites-grid" aria-busy="true" aria-label="Loading your sites...">
            <span className="sr-only">Loading your sites...</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonLoader key={i} variant="card" width="100%" height="400px" />
            ))}
          </div>
        ) : sites.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">
              <DashboardIcon path={DASHBOARD_ICONS.empty} className="empty-state-icon-svg" />
            </div>
            <h2 className="empty-state-title">No sites yet</h2>
            <p className="empty-state-description">
              Create your first website to get started. Choose from beautiful templates and launch in minutes.
            </p>
            <Link to="/setup" className="btn btn-primary btn-lg" data-testid="create-first-site-button">
              Create Your First Site
            </Link>
          </div>
        ) : (
          <>
            <div className="sites-stats">
              <div className="stat-card">
                <div className="stat-icon">
                  <DashboardIcon path={DASHBOARD_ICONS.stats} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{sites.length}</div>
                  <div className="stat-label">Total Sites</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon stat-icon-success">
                  <DashboardIcon path={DASHBOARD_ICONS.published} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{sites.filter(s => s.status === 'published').length}</div>
                  <div className="stat-label">Published</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon stat-icon-warning">
                  <DashboardIcon path={DASHBOARD_ICONS.draft} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{sites.filter(s => s.status === 'draft').length}</div>
                  <div className="stat-label">Drafts</div>
                </div>
              </div>
            </div>

            <div className="sites-section">
              <h2>Your Sites</h2>
              <div className="sites-grid">
                {sites.map((site) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    onDelete={() => handleDeleteSite(site.id)}
                    onDuplicate={() => handleDuplicateSite(site.id)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />

      {showWelcome && (
        <WelcomeModal onClose={dismissWelcome} />
      )}
    </div>
  );
}

export default Dashboard;
