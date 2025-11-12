import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import StatsCard from '../components/analytics/StatsCard';
import SiteAnalyticsTable from '../components/analytics/SiteAnalyticsTable';
import AnalyticsChart from '../components/analytics/AnalyticsChart';
import './Analytics.css';

function Analytics() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const siteId = searchParams.get('siteId');

  useEffect(() => {
    loadAnalytics();
  }, [siteId, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    
    try {
      const endpoint = siteId 
        ? `/api/sites/${siteId}/analytics?days=${timeRange}`
        : `/api/users/${user.id}/analytics?days=${timeRange}`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const data = await response.json();
      setAnalyticsData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Load analytics error:', error);
      showError('Failed to load analytics');
      // Set mock data for development
      setAnalyticsData(getMockData());
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  const getMockData = () => ({
    totalViews: 12458,
    totalVisitors: 3876,
    avgDuration: '2m 34s',
    bounceRate: 42.3,
    trends: {
      views: 15.2,
      visitors: 8.7,
      duration: -3.1,
      bounceRate: -5.4
    },
    chartData: {
      views: [850, 920, 1100, 980, 1050, 1200, 1150, 1300, 1250, 1400, 1380, 1500, 1450, 1600],
      visitors: [320, 350, 390, 360, 380, 420, 410, 450, 440, 480, 470, 510, 495, 540],
      orders: [12, 15, 18, 14, 16, 22, 20, 25, 23, 28, 26, 32, 30, 35],
      revenue: [480, 600, 720, 560, 640, 880, 800, 1000, 920, 1120, 1040, 1280, 1200, 1400]
    },
    labels: ['Jan 1', 'Jan 3', 'Jan 5', 'Jan 7', 'Jan 9', 'Jan 11', 'Jan 13', 'Jan 15', 'Jan 17', 'Jan 19', 'Jan 21', 'Jan 23', 'Jan 25', 'Jan 27'],
    sites: [
      {
        id: '1',
        name: 'Main Site',
        views: 5234,
        visitors: 1543,
        bounceRate: 38.2,
        avgDuration: '3m 12s'
      },
      {
        id: '2',
        name: 'Restaurant Site',
        views: 4156,
        visitors: 1234,
        bounceRate: 45.1,
        avgDuration: '2m 08s'
      },
      {
        id: '3',
        name: 'Salon Site',
        views: 3068,
        visitors: 1099,
        bounceRate: 43.5,
        avgDuration: '2m 25s'
      }
    ]
  });

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    return lastUpdated.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="analytics-page">
      <Header />
      
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
            
            <Link to="/dashboard" className="btn btn-secondary">
              ← Dashboard
            </Link>
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
      
      <Footer />
    </div>
  );
}

export default Analytics;

