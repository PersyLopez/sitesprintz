import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { usePlan } from '../hooks/usePlan';
import { sitesService } from '../services/sites';
import api from '../services/api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SiteCard from '../components/dashboard/SiteCard';
import WelcomeModal from '../components/dashboard/WelcomeModal';
import TrialBanner from '../components/dashboard/TrialBanner';
import SkeletonLoader from '../components/common/SkeletonLoader';
import './Dashboard.css';

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
        {(user?.subscriptionStatus === 'trial' || user?.subscription_status === 'trial') && (
          <TrialBanner user={user} />
        )}

        <div className="dashboard-header" data-testid="dashboard-header">
          <div className="user-greeting">
            <h1>Welcome back, {user?.name || user?.email?.split('@')[0] || 'there'}!</h1>
            <p data-testid="dashboard-subtitle">Your sites — open one to manage orders, appointments, and settings</p>
          </div>

          <div className="dashboard-header-actions" data-testid="dashboard-quick-actions">
            {(user?.subscriptionPlan === 'starter' || user?.subscriptionPlan === 'pro' || user?.subscriptionPlan === 'checkout' || user?.subscription_plan === 'starter' || user?.subscription_plan === 'pro' || isGrowth) && (
              <button onClick={openBillingPortal} className="btn btn-secondary btn-icon" title="Manage your billing and subscription">
                <span>💳</span> Manage Billing
              </button>
            )}

            {user?.role === 'admin' && (
              <>
                <Link to="/admin" className="btn btn-secondary btn-icon">
                  <span>👑</span> Admin
                </Link>
                <Link to="/admin/users" className="btn btn-secondary btn-icon">
                  <span>👥</span> Users
                </Link>
              </>
            )}

            <Link to="/settings/billing" className="btn btn-secondary btn-icon" data-testid="dashboard-account-settings">
              <span>⚙️</span> Account
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
            <div className="empty-state-icon" aria-hidden="true">🚀</div>
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
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-value">{sites.length}</div>
                  <div className="stat-label">Total Sites</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <div className="stat-value">{sites.filter(s => s.status === 'published').length}</div>
                  <div className="stat-label">Published</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📝</div>
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
