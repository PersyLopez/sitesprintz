import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { sitesService } from '../services/sites';
import api from '../services/api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SiteCard from '../components/dashboard/SiteCard';
import WelcomeModal from '../components/dashboard/WelcomeModal';
import StripeConnectSection from '../components/dashboard/StripeConnectSection';
import TrialBanner from '../components/dashboard/TrialBanner';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    loadUserSites();
    checkFirstTimeUser();
    checkStripeConnection();
    loadPendingOrders();
  }, []);

  const checkFirstTimeUser = () => {
    const hasVisited = localStorage.getItem('hasVisitedDashboard');
    if (!hasVisited) {
      setShowWelcome(true);
      localStorage.setItem('hasVisitedDashboard', 'true');
    }
  };

  const loadUserSites = async () => {
    if (!user?.id) return;

    try {
      const data = await sitesService.getUserSites(user.id);
      setSites(data.sites || []);
    } catch (error) {
      console.error('Failed to load sites:', error);
      showError('Failed to load your sites');
    } finally {
      setLoading(false);
    }
  };

  const checkStripeConnection = async () => {
    try {
      const data = await api.get('/api/stripe/status');
      setStripeConnected(data.connected || false);
    } catch (error) {
      // Ignore error - Stripe connection is optional
      // Endpoint may not exist, which is fine
      setStripeConnected(false);
    }
  };

  const loadPendingOrders = async () => {
    try {
      const data = await api.get('/api/orders/pending-count');
      setPendingOrders(data.count || 0);
    } catch (error) {
      // Ignore error - orders are optional for non-pro users
      // Endpoint may not exist, which is fine
      setPendingOrders(0);
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
      const response = await fetch(`/api/sites/${siteId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const newSite = await response.json();
        setSites([...sites, newSite]);
        showSuccess('Site duplicated successfully');
      } else {
        throw new Error('Failed to duplicate site');
      }
    } catch (error) {
      showError('Failed to duplicate site');
    }
  };

  const isProOrCheckoutPlan = user?.subscriptionPlan === 'pro' || user?.subscriptionPlan === 'checkout';
  const hasProSites = sites.some(site => site.plan === 'pro' || site.plan === 'checkout');

  return (
    <div className="dashboard-page">
      <Header />

      <main className="dashboard-container">
        {/* Trial Banner */}
        {user?.subscriptionStatus === 'trial' && (
          <TrialBanner user={user} />
        )}

        <div className="dashboard-header">
          <div className="user-greeting">
            <h1>Welcome back, {user?.name || user?.email?.split('@')[0] || 'there'}!</h1>
            <p>Manage your websites and create new ones</p>
          </div>

          <div className="dashboard-header-actions">
            {/* Analytics Button */}
            <Link to="/analytics" className="btn btn-secondary btn-icon">
              <span>📊</span> Analytics
            </Link>

            {/* Orders Button (only for Pro/Checkout sites) */}
            {hasProSites && (
              <Link to="/orders" className="btn btn-secondary btn-icon badge-container">
                <span>📦</span> Orders
                {pendingOrders > 0 && (
                  <span className="notification-badge">{pendingOrders}</span>
                )}
              </Link>
            )}

            {/* Bookings Button (only for Pro/Checkout users) */}
            {isProOrCheckoutPlan && (
              <Link to="/booking-dashboard" className="btn btn-secondary btn-icon">
                <span>📅</span> Bookings
              </Link>
            )}

            {/* Admin Buttons */}
            {user?.role === 'admin' && (
              <>
                <Link to="/admin" className="btn btn-secondary btn-icon">
                  <span>👑</span> Admin
                </Link>
                <Link to="/users" className="btn btn-secondary btn-icon">
                  <span>👥</span> Users
                </Link>
              </>
            )}

            {/* Create New Site */}
            <Link to="/setup" className="btn btn-primary">
              <span>+</span> Create New Site
            </Link>
          </div>
        </div>

        {/* Stripe Connect Section */}
        {isProOrCheckoutPlan && (
          <StripeConnectSection
            connected={stripeConnected}
            onConnect={() => checkStripeConnection()}
          />
        )}

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your sites...</p>
          </div>
        ) : sites.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">🚀</div>
            <h2 className="empty-state-title">No sites yet</h2>
            <p className="empty-state-description">
              Create your first website to get started. Choose from beautiful templates and launch in minutes.
            </p>
            <Link to="/setup" className="btn btn-primary btn-lg">
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
        <WelcomeModal onClose={() => setShowWelcome(false)} />
      )}
    </div>
  );
}

export default Dashboard;
