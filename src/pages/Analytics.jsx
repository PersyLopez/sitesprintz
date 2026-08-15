import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useSiteWorkspace } from '../context/SiteWorkspaceContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import StatsCard from '../components/analytics/StatsCard';
import SiteAnalyticsTable from '../components/analytics/SiteAnalyticsTable';
import LoadingFallback from '../components/common/LoadingFallback';
import { api } from '../services/api';
import './Analytics.css';

// Lazy load AnalyticsChart (heavy Chart.js component)
const AnalyticsChart = lazy(() => import('../components/analytics/AnalyticsChart'));

function Analytics() {
  const [searchParams] = useSearchParams();
  const { embedded, siteId: workspaceSiteId } = useSiteWorkspace();
  const { user, token, loading: authLoading } = useAuth();
  const { showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [lastUpdated, setLastUpdated] = useState(null);

  const siteId = workspaceSiteId || searchParams.get('siteId');

  useEffect(() => {
    if (authLoading) return;
    loadAnalytics();
  }, [siteId, timeRange, authLoading]);

  const loadAnalytics = async () => {
    setLoading(true);

    try {
      const endpoint = siteId
        ? `/api/sites/${siteId}/analytics?days=${timeRange}`
        : `/api/users/${user.id}/analytics?days=${timeRange}`;

      const data = await api.get(endpoint);
      setAnalyticsData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Load analytics error:', error);
      showError('Failed to load analytics');
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    return lastUpdated.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`analytics-page${embedded ? ' embedded-page' : ''}`}>
      {!embedded && <Header />}

      <main className="analytics-container">
        {/* Page Header */}
        <div className="analytics-header">
          <div className="header-content">
            <h1>📊 Analytics Dashboard</h1>
            <p>
              {siteId ? 'Site Performance' : 'All Sites'} •
              Last updated: {formatLastUpdated()}
            </p>
          </div>

          <div className="header-actions">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="time-range-select"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>

            <button onClick={loadAnalytics} className="btn btn-secondary">
              🔄 Refresh
            </button>

            {!embedded && (
              <Link to="/dashboard" className="btn btn-secondary">
                ← Dashboard
              </Link>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading analytics...</p>
          </div>
        ) : analyticsData ? (
          <>
            {/* Key Stats */}
            <div className="stats-grid">
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
                value={analyticsData.avgDuration || '0m 0s'}
                change={analyticsData.trends?.duration}
                changeLabel="vs previous period"
              />

              <StatsCard
                icon="📈"
                label="Bounce Rate"
                value={`${analyticsData.bounceRate || 0}%`}
                change={analyticsData.trends?.bounceRate}
                changeLabel="vs previous period"
                invertChange={true}
              />
            </div>

            {/* Charts Section */}
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

            {/* Sites Analytics Table */}
            {!siteId && analyticsData.sites && analyticsData.sites.length > 0 && (
              <div className="sites-analytics-section">
                <h2>Your Sites Performance</h2>
                <SiteAnalyticsTable sites={analyticsData.sites} />
              </div>
            )}

            {/* Coming Soon Features */}
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
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h2>No Analytics Data</h2>
            <p>Analytics data will appear here once your site receives visitors.</p>
          </div>
        )}
      </main>

      {!embedded && <Footer />}
    </div>
  );
}

export default Analytics;

