import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { sitesService } from '../services/sites';
import { isAbortError } from '../services/api';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SkeletonLoader from '../components/common/SkeletonLoader';
import ShareModal from '../components/ShareModal';
import { SiteWorkspaceProvider } from '../context/SiteWorkspaceContext';
import {
  getSiteDisplayName,
  getPublishedSiteUrl,
  getSiteWorkspacePaths,
  normalizeSiteRecord,
} from '../utils/siteWorkspace';
import { LIVE_EDIT_SCOPE_HINT } from '../utils/liveEditScope';
import './SiteDashboard.css';

function SiteDashboard() {
  const { siteId } = useParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { showError } = useToast();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('site-workspace-main')?.scrollIntoView({ block: 'start' });
  }, [location.pathname]);

  useEffect(() => {
    if (authLoading || !user?.id || !siteId) return undefined;

    setSite(null);
    setShareOpen(false);
    setNotFound(false);
    setLoading(true);

    const controller = new AbortController();
    const { signal } = controller;

    const loadSite = async () => {
      try {
        const listData = await sitesService.getUserSites(user.id, { signal });
        if (signal.aborted) return;
        const list = listData.sites || [];
        const listed = list.find((item) => item.id === siteId || item.subdomain === siteId);

        if (!listed) {
          if (!signal.aborted) {
            setNotFound(true);
          }
          return;
        }

        let detail = listed;
        try {
          const payload = await sitesService.getSite(listed.id, { signal });
          detail = normalizeSiteRecord(payload) || listed;
        } catch (error) {
          if (isAbortError(error) || signal.aborted) return;
          detail = normalizeSiteRecord(listed);
        }

        const record = { ...listed, ...detail, id: listed.id };
        const matchesRoute = record.id === siteId || record.subdomain === siteId;
        if (!signal.aborted && matchesRoute) {
          setSite(record);
        }
      } catch (error) {
        if (isAbortError(error) || signal.aborted) return;
        showError('Failed to load this site');
        setNotFound(true);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    loadSite();
    return () => {
      controller.abort();
    };
  }, [authLoading, user?.id, siteId, showError]);

  if (authLoading || loading) {
    return (
      <div className="site-workspace-page">
        <Header />
        <main className="site-workspace" aria-busy="true">
          <span className="sr-only">Loading site dashboard...</span>
          <SkeletonLoader variant="card" width="100%" height="180px" />
          <div className="site-workspace-skeleton-grid">
            <SkeletonLoader variant="card" width="100%" height="120px" />
            <SkeletonLoader variant="card" width="100%" height="120px" />
            <SkeletonLoader variant="card" width="100%" height="120px" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !site) {
    return (
      <div className="site-workspace-page">
        <Header />
        <main className="site-workspace">
          <div className="site-workspace-empty" data-testid="site-dashboard-not-found">
            <h1>Site not found</h1>
            <p>This site is not in your account, or it may have been deleted.</p>
            <Link to="/dashboard" className="btn btn-primary">Back to your sites</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const name = getSiteDisplayName(site);
  const paths = getSiteWorkspacePaths(site.id, site);
  const liveUrl = site.status === 'published'
    ? getPublishedSiteUrl(site.subdomain)
    : null;

  const navItems = [
    { to: paths.overview, label: 'Overview', end: true, testId: 'site-nav-overview' },
    { to: paths.orders, label: 'Orders', testId: 'site-nav-orders' },
    { to: paths.appointments, label: 'Appointments', testId: 'site-nav-appointments' },
    { to: paths.products, label: 'Products', testId: 'site-nav-products' },
    { to: paths.settings, label: 'Settings', testId: 'site-nav-settings' },
    { to: paths.analytics, label: 'Analytics', testId: 'site-nav-analytics' },
  ];

  return (
    <SiteWorkspaceProvider site={site} siteId={site.id}>
      <div className="site-workspace-page">
        <a href="#site-workspace-main" className="skip-to-content">Skip to main content</a>
        <Header />

        <main id="site-workspace-main" className="site-workspace" data-testid="site-dashboard">
          <nav className="site-workspace-breadcrumb" aria-label="Breadcrumb">
            <Link to="/dashboard" data-testid="site-workspace-all-sites">All sites</Link>
            <span aria-hidden="true">/</span>
            <span>{name}</span>
          </nav>

          <div className="site-workspace-toolbar">
          <header className="site-workspace-header">
            <div className="site-workspace-identity">
              <p className="site-workspace-kicker">{site.template || site.templateId || 'Site'}</p>
              <h1>{name}</h1>
              <div className="site-workspace-meta">
                <span className={`site-status-pill ${site.status}`}>{site.status === 'published' ? 'Published' : 'Draft'}</span>
                {site.plan && <span className="site-plan-pill">{site.plan}</span>}
                {site.subdomain && <span className="site-subdomain-pill">{site.subdomain}</span>}
              </div>
            </div>

            <div className="site-workspace-header-actions">
              {liveUrl ? (
                <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" data-testid="site-dashboard-view">
                  View site
                </a>
              ) : (
                <button type="button" className="btn btn-secondary" disabled title="Publish this site to view it live">
                  View site
                </button>
              )}
              {site.status === 'published' && site.subdomain ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-testid="site-dashboard-share"
                  onClick={() => setShareOpen(true)}
                >
                  Share
                </button>
              ) : null}
              {site.status === 'published' && site.subdomain ? (
                <Link
                  to={paths.liveEdit}
                  className="btn btn-primary"
                  data-testid="site-dashboard-edit"
                  title={LIVE_EDIT_SCOPE_HINT}
                >
                  Edit site
                </Link>
              ) : (
                <Link to={paths.edit} className="btn btn-primary" data-testid="site-dashboard-edit">
                  Edit site
                </Link>
              )}
              {site.status === 'published' && (
                <Link to={paths.edit} className="btn btn-secondary" data-testid="site-dashboard-builder">
                  Page builder
                </Link>
              )}
            </div>
          </header>

          <nav className="site-workspace-nav" aria-label="Site dashboard" data-testid="site-dashboard-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={item.testId}
                className={({ isActive }) => `site-workspace-nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          </div>

          <section className="site-workspace-panel">
            <Outlet />
          </section>
        </main>

        {shareOpen && site.subdomain && (
          <ShareModal subdomain={site.subdomain} onClose={() => setShareOpen(false)} />
        )}

        <Footer />
      </div>
    </SiteWorkspaceProvider>
  );
}

export default SiteDashboard;
