import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import PaymentSettings from '../components/setup/forms/PaymentSettings';
import FoundationSettings from '../components/dashboard/FoundationSettings';
import CustomDomainSettings from '../components/dashboard/CustomDomainSettings';
import HelpPanel from '../components/common/HelpPanel';
import FAQWidget from '../components/common/FAQWidget';
import LaborExtrasNote from '../components/pricing/LaborExtrasNote';
import LaborCheckoutButtons from '../components/pricing/LaborCheckoutButtons';
import { isPaidHostingPlan, isTrialingStatus } from '../config/tiers.js';
import { PLATFORM_SUPPORT_EMAIL } from '../config/pricing.config';
import './Settings.css';

function BillingSection({ user, token }) {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const highlightedPlan = searchParams.get('plan');

  const currentPlan = (user?.subscriptionPlan || user?.plan || '').toLowerCase();
  const subscriptionStatus = (user?.subscriptionStatus || user?.subscription_status || '').toLowerCase();
  const hasActivePlan = (subscriptionStatus === 'active' || isTrialingStatus(subscriptionStatus))
    && isPaidHostingPlan(currentPlan);

  const openBillingPortal = async () => {
    try {
      setLoading(true);
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
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan, { additionalSite = false } = {}) => {
    try {
      setLoading(true);
      const response = await fetch('/api/payments/create-subscription-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan, additionalSite: additionalSite || undefined }),
      });

      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.code === 'SITE_SLOT_AVAILABLE') {
        throw new Error(data.error || 'You already have an unused site slot. Publish without paying again.');
      }
      throw new Error(data.error || 'Failed to create checkout session');
    } catch (error) {
      console.error('Error starting subscription checkout:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-section">
      <h2>💳 Billing Management</h2>
      <p className="section-description">Manage your subscription and payment methods</p>
      
      <div className="settings-card">
        <h3>Subscription & Payment Method</h3>
        <p>Access the Stripe Customer Portal to manage your subscription and payment methods.</p>
        <button 
          onClick={openBillingPortal}
          disabled={loading}
          className="btn btn-primary"
          data-testid="open-billing-portal"
        >
          {loading ? '⏳ Loading...' : '📊 Open Billing Portal'}
        </button>
        <p className="section-description" style={{ marginTop: '0.75rem' }}>
          Billing questions:{' '}
          <a href={`mailto:${PLATFORM_SUPPORT_EMAIL}`}>{PLATFORM_SUPPORT_EMAIL}</a>
        </p>
      </div>

      <div className="settings-card">
        <h3>Current Plan</h3>
        <div className="billing-info">
          <div className="info-row">
            <span className="label">Plan:</span>
            <span className="value">{user?.subscriptionPlan || user?.plan || 'Trial'}</span>
          </div>
          <div className="info-row">
            <span className="label">Status:</span>
            <span className="value">{user?.subscriptionStatus || user?.subscription_status || 'Inactive'}</span>
          </div>
          {user?.currentPeriodEnd && (
            <div className="info-row">
              <span className="label">Next Billing Date:</span>
              <span className="value">{new Date(user.currentPeriodEnd).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {!hasActivePlan && (
          <div className="billing-subscribe-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleSubscribe('starter')}
              disabled={loading}
              className={`btn btn-secondary ${highlightedPlan === 'starter' ? 'btn-primary' : ''}`}
              data-testid="subscribe-starter"
            >
              {loading ? 'Loading…' : 'Subscribe to Starter'}
            </button>
            <button
              type="button"
              onClick={() => handleSubscribe('growth')}
              disabled={loading}
              className={`btn btn-primary ${highlightedPlan === 'growth' ? 'featured' : ''}`}
              data-testid="subscribe-growth"
            >
              {loading ? 'Loading…' : 'Subscribe to Growth'}
            </button>
            <button
              type="button"
              onClick={() => handleSubscribe('growth_managed')}
              disabled={loading}
              className={`btn btn-secondary ${highlightedPlan === 'growth_managed' ? 'btn-primary' : ''}`}
              data-testid="subscribe-growth-managed"
            >
              {loading ? 'Loading…' : 'Subscribe to Growth Managed'}
            </button>
          </div>
        )}
        {highlightedPlan && !hasActivePlan && (
          <p className="section-description" style={{ marginTop: '0.75rem' }}>
            You selected the {highlightedPlan} plan — choose a subscribe button above to continue.
          </p>
        )}
        {hasActivePlan && (
          <div className="billing-subscribe-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <p className="section-description" style={{ flexBasis: '100%', margin: 0 }}>
              Each plan covers one live site. Pay for another plan to publish a second site.
            </p>
            <button
              type="button"
              onClick={() => handleSubscribe('starter', { additionalSite: true })}
              disabled={loading}
              className="btn btn-secondary"
              data-testid="add-site-starter"
            >
              {loading ? 'Loading…' : 'Add a Starter site'}
            </button>
            <button
              type="button"
              onClick={() => handleSubscribe('growth', { additionalSite: true })}
              disabled={loading}
              className="btn btn-primary"
              data-testid="add-site-growth"
            >
              {loading ? 'Loading…' : 'Add a Growth site'}
            </button>
            <button
              type="button"
              onClick={() => handleSubscribe('growth_managed', { additionalSite: true })}
              disabled={loading}
              className="btn btn-secondary"
              data-testid="add-site-growth-managed"
            >
              {loading ? 'Loading…' : 'Add a Growth Managed site'}
            </button>
          </div>
        )}
      </div>

      <LaborCheckoutButtons token={token} />
      <LaborExtrasNote compact />
    </div>
  );
}

function Settings() {
  const { user, token } = useAuth();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);
  const [primarySubdomain, setPrimarySubdomain] = useState(null);
  const [primarySite, setPrimarySite] = useState(null);
  const [sitesLoading, setSitesLoading] = useState(true);

  // Fetch user's primary site subdomain on mount (abort on unmount/nav)
  useEffect(() => {
    if (!user?.id || !token) {
      setSitesLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setSitesLoading(true);

    const fetchPrimarySite = async () => {
      try {
        const response = await fetch('/api/sites', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          const list = data.data || data.sites || [];
          if (list.length > 0) {
            setPrimarySubdomain(list[0].subdomain);
            setPrimarySite(list[0]);
          }
        }
      } catch (error) {
        if (error?.name === 'AbortError') return;
        // Non-fatal — settings still work without a primary site
      } finally {
        if (!controller.signal.aborted) {
          setSitesLoading(false);
        }
      }
    };

    fetchPrimarySite();
    return () => controller.abort();
  }, [user?.id, token]);

  const settingsTabs = [
    { id: 'payments', label: '💳 Payment Settings', path: '/settings/payments' },
    { id: 'billing', label: '📊 Billing', path: '/settings/billing' },
    { id: 'foundation', label: '🏢 Foundation Settings', path: '/settings/foundation' },
    { id: 'domain', label: '🌐 Custom Domain', path: '/settings/domain' },
  ];

  return (
    <div className="settings-page">
      <Header />
      <main className="settings-container">
        <div className="settings-sidebar">
          <h2>Settings</h2>
          <nav className="settings-nav">
            {settingsTabs.map(tab => (
              <Link
                key={tab.id}
                to={tab.path}
                className={`settings-nav-item ${location.pathname === tab.path ? 'active' : ''}`}
                data-testid={`settings-nav-${tab.id}`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="settings-content">
          <Routes>
            <Route path="payments" element={<PaymentSettings site={primarySite} />} />
            <Route path="billing" element={<BillingSection user={user} token={token} />} />
            <Route path="foundation" element={
              primarySite ? (
                <FoundationSettings site={primarySite} onUpdate={() => {}} />
              ) : (
                <div className="settings-section" data-testid="settings-foundation-empty">
                  <h2>🏢 Foundation Settings</h2>
                  {sitesLoading ? (
                    <p>Loading foundation settings...</p>
                  ) : (
                    <>
                      <p>
                        Create and publish a site first to configure foundation features
                        (trust signals, SEO, contact forms).
                      </p>
                      <Link to="/setup" className="btn btn-primary" data-testid="settings-create-site-cta">
                        Create a Site
                      </Link>
                    </>
                  )}
                </div>
              )
            } />
            <Route path="domain" element={
              primarySubdomain ? (
                <CustomDomainSettings subdomain={primarySubdomain} />
              ) : (
                <div className="settings-section" data-testid="settings-domain-empty">
                  <h2>🌐 Custom Domain</h2>
                  {sitesLoading ? (
                    <p>Loading domain settings...</p>
                  ) : (
                    <>
                      <p>Create and publish a site first to connect a custom domain.</p>
                      <Link to="/setup" className="btn btn-primary">
                        Create a Site
                      </Link>
                    </>
                  )}
                </div>
              )
            } />
            <Route path="" element={
              <div className="settings-welcome">
                <h1>Settings</h1>
                <p>Select a setting category from the sidebar to get started.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowHelp(true)}
                >
                  📚 Help & FAQ
                </button>
              </div>
            } />
          </Routes>
        </div>
      </main>
      <Footer />
      <HelpPanel isOpen={showHelp} onClose={() => setShowHelp(false)}>
        <FAQWidget onClose={() => setShowHelp(false)} />
      </HelpPanel>
    </div>
  );
}

export default Settings;

