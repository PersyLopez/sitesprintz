/**
 * Site Analytics Dashboard
 * Displays comprehensive analytics for Pro sites
 * 
 * Features:
 * - Overview stats cards
 * - Time series chart (Chart.js)
 * - Top pages table
 * - Referrer sources
 * - Date range filtering
 * - Real-time refresh
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './SiteAnalytics.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function SiteAnalytics({ subdomain }) {
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [topPages, setTopPages] = useState([]);
  const [referrers, setReferrers] = useState([]);

  // Fetch all analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch overview stats
      const statsRes = await fetch(
        `/api/analytics/stats/${subdomain}?period=${period}`,
        { credentials: 'include' }
      );
      if (!statsRes.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsRes.json();
      setStats(statsData);

      // Fetch time series data
      const timeSeriesRes = await fetch(
        `/api/analytics/timeseries/${subdomain}?period=${period}&groupBy=day`,
        { credentials: 'include' }
      );
      if (!timeSeriesRes.ok) throw new Error('Failed to fetch time series');
      const timeSeriesResult = await timeSeriesRes.json();
      setTimeSeriesData(timeSeriesResult);

      // Fetch top pages
      const topPagesRes = await fetch(
        `/api/analytics/top-pages/${subdomain}?period=${period}&limit=10`,
        { credentials: 'include' }
      );
      if (!topPagesRes.ok) throw new Error('Failed to fetch top pages');
      const topPagesData = await topPagesRes.json();
      setTopPages(topPagesData);

      // Fetch referrers
      const referrersRes = await fetch(
        `/api/analytics/referrers/${subdomain}?period=${period}`,
        { credentials: 'include' }
      );
      if (!referrersRes.ok) throw new Error('Failed to fetch referrers');
      const referrersData = await referrersRes.json();
      setReferrers(referrersData);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subdomain) {
      fetchAnalytics();
    }
  }, [subdomain, period]);

  // Format number with commas
  const formatNumber = (num) => {
    return num.toLocaleString('en-US');
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Prepare chart data
  const chartData = {
    labels: (timeSeriesData || []).map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Page Views',
        data: (timeSeriesData || []).map(d => d.pageViews),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4
      },
      {
        label: 'Orders',
        data: (timeSeriesData || []).map(d => d.orders),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  if (loading && !stats) {
    return (
      <div className="analytics-loading">
        <div className="spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-error">
        <p>Error loading analytics: {error}</p>
        <button onClick={fetchAnalytics} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="analytics-header">
        <h1>Analytics</h1>
        <div className="header-actions">
          <button 
            onClick={fetchAnalytics}
            className="btn btn-secondary"
            aria-label="Refresh analytics"
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="period-selector">
        {['24h', '7d', '30d', '90d'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`period-btn ${period === p ? 'active' : ''}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Overview Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Page Views</h3>
            <p className="stat-value">{formatNumber(stats.pageViews)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Unique Visitors</h3>
            <p className="stat-value">{formatNumber(stats.uniqueVisitors)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🛒</div>
          <div className="stat-content">
            <h3>Orders</h3>
            <p className="stat-value">{formatNumber(stats.orders)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Revenue</h3>
            <p className="stat-value">{formatCurrency(stats.revenue)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>Avg Order Value</h3>
            <p className="stat-value">{formatCurrency(stats.avgOrderValue)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>Conversion Rate</h3>
            <p className="stat-value">{stats.conversionRate}%</p>
          </div>
        </div>
      </div>

      {/* Time Series Chart */}
      <div className="chart-container">
        <h2>Trend</h2>
        <div className="chart-wrapper">
          <Line 
            data={chartData} 
            options={chartOptions}
            aria-label="Analytics chart showing page views and orders over time"
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="analytics-columns">
        {/* Top Pages */}
        <div className="analytics-section">
          <h2>Top Pages</h2>
          {topPages.length === 0 ? (
            <p className="empty-state">No data available yet</p>
          ) : (
            <div className="table-container">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th>Views</th>
                    <th>Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map((page, index) => (
                    <tr key={index}>
                      <td className="page-path">{page.path}</td>
                      <td>{formatNumber(page.views)}</td>
                      <td>{formatNumber(page.uniqueVisitors)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Traffic Sources */}
        <div className="analytics-section">
          <h2>Traffic Sources</h2>
          {referrers.length === 0 ? (
            <p className="empty-state">No data available yet</p>
          ) : (
            <div className="table-container">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Visits</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {referrers.map((referrer, index) => (
                    <tr key={index}>
                      <td className="referrer-domain">{referrer.domain}</td>
                      <td>{formatNumber(referrer.visits)}</td>
                      <td>{referrer.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

