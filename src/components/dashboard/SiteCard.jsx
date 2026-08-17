import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { OptimizedImage } from '../common/OptimizedImage';
import { getSiteDisplayName, getSiteWorkspacePaths } from '../../utils/siteWorkspace';
import ShareModal from '../ShareModal';
import './SiteCard.css';

function SiteCard({ site, onDelete, onDuplicate }) {
  const [shareOpen, setShareOpen] = useState(false);
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const siteUrl = site.subdomain ? `${backendUrl}/sites/${site.subdomain}/` : null;
  const name = getSiteDisplayName(site);
  const paths = getSiteWorkspacePaths(site.id, site);
  const templateLabel = site.template || site.templateId || 'Custom Template';
  const canShare = site.status === 'published' && Boolean(site.subdomain);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="site-card" data-testid="site-card" data-subdomain={site.subdomain}>
      <div className="site-card-header">
        <div className="site-thumbnail">
          {site.heroImage ? (
            <OptimizedImage
              src={site.heroImage}
              alt={name}
              width={400}
              height={225}
              aspectRatio="16/9"
              sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="thumbnail-placeholder">🌐</div>
          )}
        </div>
        <div className={`site-status ${site.status}`}>
          {site.status === 'published' ? '✅ Published' : '📝 Draft'}
        </div>
      </div>

      <div className="site-card-body">
        <h3>{name}</h3>
        <p className="site-template">{templateLabel}</p>
        {site.plan && (
          <p className="site-plan">Plan: <span className={`plan-badge ${site.plan}`}>{site.plan}</span></p>
        )}
        <p className="site-date">
          {site.status === 'published' ? 'Published' : 'Created'}: {formatDate(site.publishedAt || site.createdAt)}
        </p>
      </div>

      <div className="site-card-actions">
        <Link
          to={paths.overview}
          className="btn btn-primary btn-sm"
          data-testid="manage-site-button"
        >
          Manage
        </Link>

        {site.status === 'published' && siteUrl ? (
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            data-testid="view-site-button"
            title="View live site"
          >
            View
          </a>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled
            title="Preview draft"
          >
            Preview
          </button>
        )}

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          data-testid="share-site-button"
          disabled={!canShare}
          title={canShare ? 'Share this site' : 'Publish this site to share it'}
          onClick={() => canShare && setShareOpen(true)}
        >
          Share
        </button>

        <Link
          to={site.status === 'published' && site.subdomain ? paths.liveEdit : paths.edit}
          className="btn btn-secondary btn-sm"
          data-testid="edit-site-button"
        >
          Edit
        </Link>

        {onDuplicate && (
          <button type="button" onClick={onDuplicate} className="btn btn-secondary btn-sm" title="Duplicate site" aria-label="Duplicate site">
            📋
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          className="btn btn-danger btn-sm"
          data-testid="delete-site-button"
          title="Delete site"
          aria-label="Delete site"
        >
          🗑️
        </button>
      </div>

      {shareOpen && canShare && (
        <ShareModal subdomain={site.subdomain} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}

export default SiteCard;
