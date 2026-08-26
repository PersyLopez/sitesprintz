import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { OptimizedImage } from '../common/OptimizedImage';
import { LIVE_EDIT_SCOPE_HINT } from '../../utils/liveEditScope';
import { getSiteDisplayName, getPublishedSiteUrl, getSiteWorkspacePaths } from '../../utils/siteWorkspace';
import ShareModal from '../ShareModal';
import './SiteCard.css';

function SiteCardIcon({ path, className = 'site-card-icon' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="1.1em"
      height="1.1em"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="currentColor" d={path} />
    </svg>
  );
}

const SITE_CARD_ICONS = {
  globe: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
  duplicate: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z',
  delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
};

function SiteCard({ site, onDelete, onDuplicate }) {
  const [shareOpen, setShareOpen] = useState(false);
  const siteUrl = getPublishedSiteUrl(site.subdomain);
  const name = getSiteDisplayName(site);
  const paths = getSiteWorkspacePaths(site.id, site);
  const templateLabel = site.template || site.templateId || 'Custom Template';
  const canShare = site.status === 'published' && Boolean(site.subdomain);
  const canLiveEdit = site.status === 'published' && Boolean(site.subdomain);

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
            <div className="thumbnail-placeholder">
              <SiteCardIcon path={SITE_CARD_ICONS.globe} className="thumbnail-placeholder-icon" />
            </div>
          )}
        </div>
        <div className={`site-status ${site.status}`}>
          {site.status === 'published' ? 'Published' : 'Draft'}
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

        {canLiveEdit ? (
          <>
            <Link
              to={paths.liveEdit}
              className="btn btn-secondary btn-sm"
              data-testid="edit-site-button"
              title={LIVE_EDIT_SCOPE_HINT}
              aria-label={`Edit text on site. ${LIVE_EDIT_SCOPE_HINT}`}
            >
              Edit text
            </Link>
            <Link
              to={paths.edit}
              className="btn btn-secondary btn-sm"
              data-testid="site-card-page-builder"
              title="Photos, sections, FAQ, and menu"
              aria-label="Page builder for photos, sections, FAQ, and menu"
            >
              Page builder
            </Link>
          </>
        ) : (
          <Link
            to={paths.edit}
            className="btn btn-secondary btn-sm"
            data-testid="edit-site-button"
          >
            Edit
          </Link>
        )}

        {onDuplicate && (
          <button type="button" onClick={onDuplicate} className="btn btn-secondary btn-sm site-card-icon-btn" title="Duplicate site" aria-label="Duplicate site">
            <SiteCardIcon path={SITE_CARD_ICONS.duplicate} />
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          className="btn btn-danger btn-sm site-card-icon-btn"
          data-testid="delete-site-button"
          title="Delete site"
          aria-label="Delete site"
        >
          <SiteCardIcon path={SITE_CARD_ICONS.delete} />
        </button>
      </div>

      {shareOpen && canShare && (
        <ShareModal subdomain={site.subdomain} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}

export default SiteCard;
