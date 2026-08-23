import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import './AdminUsers.css';

function AdminSites() {
  const { token } = useAuth();
  const { showError } = useToast();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/sites', {
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('accessToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load sites');
      }

      const data = await response.json();
      setSites(data.sites || []);
    } catch (error) {
      showError('Failed to load sites');
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = sites.filter(site => {
    const matchesSearch = site.subdomain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         site.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'published': return 'status-published';
      case 'draft': return 'status-draft';
      default: return '';
    }
  };

  const getPlanBadgeClass = (plan) => {
    switch (plan?.toLowerCase()) {
      case 'pro': return 'plan-badge-pro';
      case 'growth': return 'plan-badge-growth';
      case 'starter': return 'plan-badge-starter';
      case 'trial': return 'plan-badge-trial';
      case 'premium': return 'plan-badge-premium';
      default: return '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="admin-sites-page">
      <Header />

      <main className="admin-sites-container">
        {/* Page Header */}
        <div className="admin-sites-header">
          <div className="header-content">
            <h1>🌐 Sites Management</h1>
            <p>View and manage all published and draft sites on the platform</p>
          </div>
        </div>

        {/* Controls */}
        <div className="admin-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by subdomain or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              data-testid="sites-search-input"
            />
          </div>

          <div className="filter-buttons">
            <button
              onClick={() => setStatusFilter('all')}
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              data-testid="filter-all"
            >
              All Sites
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`filter-btn ${statusFilter === 'published' ? 'active' : ''}`}
              data-testid="filter-published"
            >
              Published
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`filter-btn ${statusFilter === 'draft' ? 'active' : ''}`}
              data-testid="filter-draft"
            >
              Draft
            </button>
          </div>
        </div>

        {/* Sites List */}
        {loading ? (
          <div className="loading-state">Loading sites...</div>
        ) : filteredSites.length === 0 ? (
          <div className="empty-state">
            <p>📭 No sites found</p>
          </div>
        ) : (
          <div className="sites-table-wrapper">
            <table className="sites-table" data-testid="sites-table">
              <thead>
                <tr>
                  <th>Subdomain</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredSites.map(site => (
                  <tr key={site.id} data-testid={`site-row-${site.id}`}>
                    <td>
                      <a href={`https://${site.subdomain}.sitesprintz.com`} target="_blank" rel="noopener noreferrer" className="site-link">
                        {site.subdomain}
                      </a>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(site.status)}`}>
                        {site.status}
                      </span>
                    </td>
                    <td>
                      <span className={`plan-badge ${getPlanBadgeClass(site.plan)}`}>
                        {site.plan || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="created-date">{formatDate(site.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminSites;
