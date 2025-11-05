import React from 'react';
import { Link } from 'react-router-dom';
import './SiteCard.css';

function SiteCard({ site, onDelete, onDuplicate }) {
  const siteUrl = site.subdomain 
    ? `${window.location.protocol}//${window.location.host}/sites/${site.subdomain}`
    : null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const isProSite = site.plan === 'pro' || site.plan === 'checkout';

  return (
    <div className="site-card">
      <div className="site-card-header">
        <div className="site-thumbnail">
          {site.heroImage ? (
            <img src={site.heroImage} alt={site.businessName} />
          ) : (
            <div className="thumbnail-placeholder">
              <span>🌐</span>
            </div>
          )}
        </div>
        
        <div className={`site-status ${site.status}`}>
          {site.status === 'published' ? '✅ Published' : '📝 Draft'}
        </div>
      </div>

      <div className="site-card-body">
        <h3>{site.businessName || site.name || 'Untitled Site'}</h3>
        <p className="site-template">{site.template || 'Custom Template'}</p>
        {site.plan && (
          <p className="site-plan">Plan: <span className={`plan-badge ${site.plan}`}>{site.plan}</span></p>
        )}
        <p className="site-date">
          {site.status === 'published' ? 'Published' : 'Created'}: {formatDate(site.publishedAt || site.createdAt)}
        </p>
      </div>

      {/* Pro Site - Orders Button */}
      {isProSite && site.status === 'published' && (
        <div className="site-card-orders">
          <Link 
            to={`/orders?siteId=${site.id}`}
            className="btn btn-warning btn-sm btn-full"
          >
            <span>📦</span> View Orders
          </Link>
        </div>
      )}

      <div className="site-card-actions">
        {site.status === 'published' && siteUrl ? (
          <a 
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            title="View live site"
          >
            <span>🌐</span> View
          </a>
        ) : (
          <button 
            className="btn btn-secondary btn-sm"
            title="Preview draft"
            disabled
          >
            <span>👁️</span> Preview
          </button>
        )}
        
        <Link 
          to={`/setup?site=${site.id}`}
          className="btn btn-primary btn-sm"
          title="Edit site"
        >
          <span>✏️</span> Edit
        </Link>
        
        {onDuplicate && (
          <button 
            onClick={onDuplicate}
            className="btn btn-secondary btn-sm"
            title="Duplicate site"
          >
            <span>📋</span>
          </button>
        )}
        
        <button 
          onClick={onDelete}
          className="btn btn-danger btn-sm"
          title="Delete site"
        >
          <span>🗑️</span>
        </button>
      </div>
    </div>
  );
}

export default SiteCard;

