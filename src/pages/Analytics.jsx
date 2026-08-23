import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { usePlan } from '../hooks/usePlan';
import { useSiteWorkspace } from '../context/SiteWorkspaceContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import StatsCard from '../components/analytics/StatsCard';
import SiteAnalyticsTable from '../components/analytics/SiteAnalyticsTable';
import LoadingFallback from '../components/common/LoadingFallback';
import FeatureGate from '../components/common/FeatureGate';
import { api } from '../services/api';
import { FEATURES, hasFeature } from '../utils/planFeatures';
import './Analytics.css';

const AnalyticsChart = lazy(() => import('../components/analytics/AnalyticsChart'));

function daysToPeriod(days) {
  return `${days}d`;
}

function formatChartLabels(timeSeries) {
  return (timeSeries || []).map((point) => {
    const date = new Date(point.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
}

function normalizeSiteAnalytics(stats, timeSeries) {
  const series = Array.isArray(timeSeries) ? timeSeries : [];
  return {
    totalViews: stats?.pageViews ?? 0,
    totalVisitors: stats?.uniqueVisitors ?? 0,
    avgDuration: '—',
    bounceRate: null,
    chartData: {
      views: series.map((point) => point.pageViews ?? 0),
      visitors: series.map((point) => point.uniqueVisitors ?? point.pageViews ?? 0),
      orders: series.map((point) => point.orders ?? 0),
      revenue: series.map((point) => point.revenue ?? 0),
    },
    labels: formatChartLabels(series),
    topPages: stats?.topPages,
    referrers: stats?.referrers,
  };
}

async function fetchSiteAnalytics(subdomain, days) {
  const period = daysToPeriod(days);

  const [statsPayload, timeSeriesPayload, topPagesPayload, referrersPayload] = await Promise.all([
    api.get(`/api/analytics/stats/${subdomain}`, { params: { period } }),
    api.get(`/api/analytics/timeseries/${subdomain}`, { params: { period } }),
    api.get(`/api/analytics/top-pages/${subdomain}`, { params: { period, limit: 10 } }),
    api.get(`/api/analytics/referrers/${subdomain}`, { params: { period } }),
  ]);

  const stats = {
    pageViews: statsPayload.pageViews ?? statsPayload.stats?.pageViews ?? 0,
    uniqueVisitors: statsPayload.uniqueVisitors ?? statsPayload.stats?.uniqueVisitors ?? 0,
    orders: statsPayload.orders ?? statsPayload.stats?.orders ?? 0,
    revenue: statsPayload.revenue ?? statsPayload.stats?.revenue ?? 0,
    topPages: topPagesPayload.pages ?? topPagesPayload.topPages ?? topPagesPayload,
    referrers: referrersPayload.referrers ?? referrersPayload,
  };

  const timeSeries = timeSeriesPayload.timeSeries ?? timeSeriesPayload;
  return normalizeSiteAnalytics(stats, timeSeries);
}

function Analytics() {
  const [searchParams] = useSearchParams();
  const { embedded, siteId: workspaceSiteId, site } = useSiteWorkspace();
  const { user, loading: authLoading } = useAuth();
  const { plan } = usePlan();
  const { showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timeRange, setTimeRange] = useState('30');
  const [lastUpdated, setLastUpdated] = useState(null);

  const siteId = workspaceSiteId || searchParams.get('siteId');
  const subdomain = site?.subdomain || null;
  const siteAnalyticsMode = Boolean(siteId && subdomain);
  const hasAnalyticsAccess = hasFeature(plan, FEATURES.BASIC_ANALYTICS);

  const loadAnalytics = useCallback(async () => {
    if (siteAnalyticsMode && !hasAnalyticsAccess) {
      setLoading(false);
      setAnalyticsData(null);
      return;
    }

    setLoading(true);

    try {
      if (siteAnalyticsMode) {
        const data = await fetchSiteAnalytics(subdomain, timeRange);
        setAnalyticsData(data);
        setLastUpdated(new Date());
        return;
      }

      const endpoint = `/api/users/${user.id}/analytics?days=${timeRange}`;
      const data = await api.get(endpoint);
      setAnalyticsData(data);
      setLastUpdated(new Date());
    } catch {
      showError('Failed to load analytics');
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  }, [
    siteAnalyticsMode,
    hasAnalyticsAccess,
    subdomain,
    timeRange,
    user?.id,
    showError,
  ]);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    loadAnalytics();
  }, [authLoading, user?.id, loadAnalytics]);

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    return lastUpdated.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const bounceRateDisplay =
    analyticsData?.bounceRate === null || analyticsData?.bounceRate === undefined
      ? '—'
      : `${analyticsData.bounceRate}%`;

  const analyticsBody = siteAnalyticsMode && !hasAnalyticsAccess ? (
    <FeatureGate
      feature={FEATURES.BASIC_ANALYTICS}
      userPlan={plan}
      upgradeMessage="Upgrade to Growth to view traffic and performance for this site."
    />
  ) : loading ? (
    <div className="loading-container" data-testid="analytics-loading">
      <div className="loading-spinner" />
      <p>Loading analytics...</p>
    </div>
  ) : analyticsData ? (
    <>
      <div className="stats-grid" data-testid="workspace-analytics-panel">
        <StatsCard
          icon="👁️"
          label="Total Views"
          value={analyticsData.totalViews?.toLocaleString() || '0'}
          change={analyticsData.trends?.views}
          changeLabel="vs previous period"
        />

        <StatsCard
          icon="👥"
          label="Unique Visitors"
          value={analyticsData.totalVisitors?.toLocaleString() || '0'}
          change={analyticsData.trends?.visitors}
          changeLabel="vs previous period"
        />

        <StatsCard
          icon="⏱️"
          label="Avg. Duration"
          value={analyticsData.avgDuration || '—'}
          change={analyticsData.trends?.duration}
          changeLabel="vs previous period"
        />

        <StatsCard
          icon="📈"
          label="Bounce Rate"
          value={bounceRateDisplay}
          change={analyticsData.trends?.bounceRate}
          changeLabel="vs previous period"
          invertChange
        />
      </div>

      <div className="charts-section">
        <Suspense fallback={<LoadingFallback message="Loading charts..." />}>
          <div className="chart-grid">
            <AnalyticsChart
              title="📈 Site Views Over Time"
              data={analyticsData.chartData?.views || []}
              labels={analyticsData.labels || []}
              color="#06b6d4"
            />

            <AnalyticsChart
              title="👥 Unique Visitors"
              data={analyticsData.chartData?.visitors || []}
              labels={analyticsData.labels || []}
              color="#8b5cf6"
            />
          </div>

          <div className="chart-grid">
            <AnalyticsChart
              title="📦 Orders Over Time"
              data={analyticsData.chartData?.orders || []}
              labels={analyticsData.labels || []}
              color="#22c55e"
            />

            <AnalyticsChart
              title="💰 Revenue Trend"
              data={analyticsData.chartData?.revenue || []}
              labels={analyticsData.labels || []}
              color="#f59e0b"
            />
          </div>
        </Suspense>
      </div>

      {!siteId && analyticsData.sites && analyticsData.sites.length > 0 && (
        <div className="sites-analytics-section">
          <h2>Your Sites Performance</h2>
          <SiteAnalyticsTable sites={analyticsData.sites} />
        </div>
      )}

      {siteAnalyticsMode && Array.isArray(analyticsData.referrers) && analyticsData.referrers.length > 0 && (
        <div className="sites-analytics-section">
          <h2>Traffic Sources</h2>
          <ul className="analytics-referrer-list">
            {analyticsData.referrers.map((ref) => (
              <li key={ref.domain || ref.referrer || ref.visits}>
                <span>{ref.domain || ref.referrer || 'Direct'}</span>
                <span>{ref.visits ?? ref.count ?? 0} visits</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!siteAnalyticsMode && (
        <div className="coming-soon-section">
          <h3>🚀 Coming Soon</h3>
          <div className="coming-soon-grid">
            <div className="coming-soon-item">
              <span>🗺️</span>
              <p>Geographic Heatmap</p>
            </div>
            <div className="coming-soon-item">
              <span>📱</span>
              <p>Device Breakdown</p>
            </div>
            <div className="coming-soon-item">
              <span>🔗</span>
              <p>Referral Sources</p>
            </div>
            <div className="coming-soon-item">
              <span>⏰</span>
              <p>Real-time Visitors</p>
            </div>
          </div>
        </div>
      )}
    </>
  ) : (
    <div className="empty-state" data-testid="analytics-empty">
      <div className="empty-icon">📊</div>
      <h2>No Analytics Data</h2>
      <p>Analytics data will appear here once your site receives visitors.</p>
    </div>
  );

  return (
    <div className={`analytics-page${embedded ? ' embedded-page' : ''}`}>
      {!embedded && <Header />}

      <main className="analytics-container" data-testid="analytics-page">
        <div className="analytics-header">
          <div className="header-content">
            <h1>📊 Analytics Dashboard</h1>
            <p>
              {siteId ? 'Site Performance' : 'All Sites'} •
              {' '}
              Last updated:
              {' '}
              {formatLastUpdated()}
            </p>
          </div>

          <div className="header-actions">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="time-range-select"
              disabled={siteAnalyticsMode && !hasAnalyticsAccess}
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>

            <button
              type="button"
              onClick={loadAnalytics}
              className="btn btn-secondary"
              disabled={siteAnalyticsMode && !hasAnalyticsAccess}
            >
              🔄 Refresh
            </button>

            {!embedded && (
              <Link to="/dashboard" className="btn btn-secondary">
                ← Dashboard
              </Link>
            )}
          </div>
        </div>

        {analyticsBody}
      </main>

      {!embedded && <Footer />}
    </div>
  );
}

export default Analytics;
