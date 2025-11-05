import React from 'react';
import { Link } from 'react-router-dom';
import './SiteCard.css';

function SiteCard({ site, onDelete }) {
  const siteUrl = site.subdomain 
    ? `${window.location.protocol}//${window.location.host}/sites/${site.subdomain}`
    : null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

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
          {site.status === 'published' ? '✓ Published' : '📝 Draft'}
        </div>
      </div>

      <div className="site-card-body">
        <h3>{site.businessName || 'Untitled Site'}</h3>
        <p className="site-template">{site.template || 'Custom Template'}</p>
        <p className="site-date">
          {site.status === 'published' ? 'Published' : 'Created'} {formatDate(site.createdAt || site.publishedAt)}
        </p>
      </div>

      <div className="site-card-actions">
        {site.status === 'published' && siteUrl && (
          <a 
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <span>👁️</span> View
          </a>
        )}
        
        <Link 
          to={`/setup?site=${site.id}`}
          className="btn btn-primary btn-sm"
        >
          <span>✏️</span> Edit
        </Link>
        
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

