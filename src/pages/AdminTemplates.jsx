import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PublicPageLayout from '../components/layout/PublicPageLayout';
import './AdminTemplates.css';

const STATUS_COLORS = {
  active: 'var(--status-active)',
  draft: 'var(--status-draft)',
  archived: 'var(--status-archived)',
};

const INDUSTRIES = [
  { value: '', label: 'All Industries' },
  { value: 'service', label: 'Service' },
  { value: 'food', label: 'Food & Dining' },
  { value: 'professional', label: 'Professional' },
  { value: 'product', label: 'Product' },
];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

function StatusBadge({ status }) {
  return (
    <span 
      className="admin-badge" 
      style={{ backgroundColor: STATUS_COLORS[status] || 'var(--skyline-border)' }}
    >
      {status}
    </span>
  );
}

function IndustryBadge({ industry }) {
  const colors = {
    service: 'var(--skyline-primary)',
    food: '#f59e0b',
    professional: '#6366f1',
    product: '#ec4899',
  };
  return (
    <span 
      className="admin-badge admin-badge--industry"
      style={{ backgroundColor: colors[industry] || 'var(--skyline-text-muted)' }}
    >
      {industry}
    </span>
  );
}

function TemplateCard({ template, onEdit, onDuplicate, onArchive, onReset }) {
  return (
    <div className="admin-template-card" data-testid={`template-card-${template.slug}`}>
      <div className="admin-template-card-header">
        <h3 className="admin-template-name">{template.name}</h3>
        <StatusBadge status={template.status} />
      </div>
      <p className="admin-template-desc">{template.description || 'No description'}</p>
      
      <div className="admin-template-meta">
        <IndustryBadge industry={template.industry} />
        <span className="admin-template-layout">Layout: {template.layout_key}</span>
        <span className="admin-template-version">v{template.version}</span>
        {template.is_default && (
          <span className="admin-template-default">Default</span>
        )}
      </div>
      
      <div className="admin-template-actions">
        <button 
          className="admin-btn admin-btn--primary"
          onClick={() => onEdit(template.id)}
          data-testid={`edit-${template.slug}`}
        >
          Edit
        </button>
        <button 
          className="admin-btn admin-btn--secondary"
          onClick={() => onDuplicate(template.id)}
          data-testid={`duplicate-${template.slug}`}
        >
          Duplicate
        </button>
        {template.is_default && template.status !== 'active' && (
          <button 
            className="admin-btn admin-btn--secondary"
            onClick={() => onReset(template.id)}
            data-testid={`reset-${template.slug}`}
          >
            Reset
          </button>
        )}
        <button 
          className={`admin-btn ${template.status === 'archived' ? 'admin-btn--secondary' : 'admin-btn--danger'}`}
          onClick={() => onArchive(template.id)}
          data-testid={`archive-${template.slug}`}
        >
          {template.status === 'archived' ? 'Restore' : 'Archive'}
        </button>
      </div>
    </div>
  );
}

export default function AdminTemplates() {
  const { isAuthenticated, token } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
      });
      if (industryFilter) params.append('industry', industryFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`/api/admin/templates?${params}`, {
        credentials: 'include',
        headers,
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      const data = await response.json();
      setTemplates(data.templates || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, industryFilter, statusFilter, search, token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }
    fetchTemplates();
    return undefined;
  }, [fetchTemplates, token]);

  const handleEdit = (id) => {
    navigate(`/admin/templates/${id}`);
  };

  const handleDuplicate = async (id) => {
    try {
      const response = await fetch(`/api/admin/templates/${id}/duplicate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error('Duplicate failed:', err);
    }
  };

  const handleArchive = async (id) => {
    try {
      const response = await fetch(`/api/admin/templates/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error('Archive failed:', err);
    }
  };

  const handleReset = async (id) => {
    if (!window.confirm('Reset this template to its default JSON file? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/admin/templates/${id}/reset`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  if (!isAuthenticated) {
    return <PublicPageLayout>Access denied. Admin only.</PublicPageLayout>;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <PublicPageLayout className="admin-templates-page" data-testid="admin-templates-page">
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>Template Management</h1>
          <p className="admin-subtitle">Create, edit, and manage website templates</p>
        </div>
        <Link to="/admin/templates/new" className="admin-btn admin-btn--primary admin-btn--lg">
          + Create Template
        </Link>
      </div>

      {/* Filters */}
      <div className="admin-filters" data-testid="admin-filters">
        <div className="admin-filter-group">
          <input
            type="search"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="admin-input admin-input--search"
            data-testid="template-search"
          />
        </div>
        <div className="admin-filter-group">
          <select
            value={industryFilter}
            onChange={(e) => { setIndustryFilter(e.target.value); setPage(1); }}
            className="admin-select"
            data-testid="industry-filter"
          >
            {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>
        <div className="admin-filter-group">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="admin-select"
            data-testid="status-filter"
          >
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="admin-loading">Loading templates...</div>
      ) : error ? (
        <div className="admin-error">Error: {error}</div>
      ) : (
        <>
          <div className="admin-templates-grid" data-testid="templates-grid">
            {templates.length === 0 ? (
              <div className="admin-empty">
                <p>No templates found. <Link to="/admin/templates/new">Create one?</Link></p>
              </div>
            ) : (
              templates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onArchive={handleArchive}
                  onReset={handleReset}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="admin-pagination" data-testid="pagination">
              <button
                className="admin-btn admin-btn--secondary"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span className="admin-page-info">
                Page {page} of {totalPages} ({total} total)
              </span>
              <button
                className="admin-btn admin-btn--secondary"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </PublicPageLayout>
  );
}