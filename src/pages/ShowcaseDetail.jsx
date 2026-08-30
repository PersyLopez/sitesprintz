/**
 * ShowcaseDetail Component — individual site showcase page
 */

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PublicPageLayout from '../components/layout/PublicPageLayout';
import { resolveShowcaseTemplateId } from '../utils/galleryTemplateMap.js';
import './ShowcaseDetail.css';

function ShowcaseDetail() {
  const { subdomain } = useParams();
  const { isAuthenticated } = useAuth();

  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (site) {
      const siteTitle = getSiteTitle(site);
      document.title = `${siteTitle} - Made with Right Site Light`;

      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      const payload = site.data || site.site_data || {};
      const description =
        payload.about?.description ||
        payload.hero?.subtitle ||
        `${siteTitle} - A beautiful website made with Right Site Light`;
      metaDescription.setAttribute('content', description);
    }
  }, [site]);

  useEffect(() => {
    const fetchSite = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/showcases/${subdomain}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Site not found. It may be private or does not exist.');
          } else {
            setError('Failed to load site details. Please try again later.');
          }
          return;
        }

        const data = await response.json();
        setSite(data.site || data);
      } catch (err) {
        console.error('Error fetching site:', err);
        setError('An error occurred while loading the site. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (subdomain) {
      fetchSite();
    }
  }, [subdomain]);

  const getSiteTitle = (siteData) => {
    const payload = siteData?.data || siteData?.site_data || {};
    return (
      siteData?.name ||
      payload.brand?.name ||
      payload.hero?.title ||
      siteData?.subdomain ||
      'Untitled Site'
    );
  };

  const getSiteSubtitle = (siteData) => {
    const payload = siteData?.data || siteData?.site_data || {};
    return payload.hero?.subtitle || payload.brand?.tagline || '';
  };

  const getSiteHeroImage = (siteData) => {
    const payload = siteData?.data || siteData?.site_data || {};
    return (
      payload.hero?.image ||
      payload.hero?.backgroundImage ||
      payload.images?.hero ||
      '/images/default-hero.jpg'
    );
  };

  const getSiteUrl = (siteData) => {
    return `/view/${siteData.subdomain}`;
  };

  const formatCategory = (category) => {
    if (!category || typeof category !== 'string') return 'Unknown';
    return category
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/showcase/${subdomain}`;
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShare = (platform) => {
    const url = `${window.location.origin}/showcase/${subdomain}`;
    const title = getSiteTitle(site);

    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Check out ${title}!`)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      default:
        return;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const templateId = resolveShowcaseTemplateId(site, subdomain);
  const templateQuery = templateId ? `?template=${templateId}` : '';
  const ctaTarget = isAuthenticated ? `/setup${templateQuery}` : `/register${templateQuery}`;
  const ctaLabel = 'Use this look →';

  if (loading) {
    return (
      <PublicPageLayout className="showcase-detail-page">
        <div className="showcase-detail-loading" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading site details...</p>
        </div>
      </PublicPageLayout>
    );
  }

  if (error) {
    return (
      <PublicPageLayout className="showcase-detail-page">
        <div className="showcase-detail-error">
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button type="button" onClick={handleRetry} className="btn btn-primary">
              Try Again
            </button>
            <Link to="/showcase" className="btn btn-secondary">
              Back to Gallery
            </Link>
          </div>
        </div>
      </PublicPageLayout>
    );
  }

  if (!site) {
    return (
      <PublicPageLayout className="showcase-detail-page">
        <div className="showcase-detail-error">
          <h2>Site not found</h2>
          <p>This site doesn&apos;t exist or is not public.</p>
          <Link to="/showcase" className="btn btn-primary">
            Back to Gallery
          </Link>
        </div>
      </PublicPageLayout>
    );
  }

  const payload = site.data || site.site_data || {};

  return (
    <PublicPageLayout className="showcase-detail-page">
      <div className="showcase-detail" data-testid="showcase-detail">
        <nav className="showcase-detail-nav" aria-label="Breadcrumb">
          <Link to="/showcase" className="back-link">
            ← Back to Gallery
          </Link>
        </nav>

        <section className="showcase-hero">
          <div className="hero-image">
            <img
              src={getSiteHeroImage(site)}
              alt={`${getSiteTitle(site)} hero image`}
            />
          </div>
          <div className="hero-content">
            <div className="hero-badges">
              <span className="category-badge">
                {formatCategory(site.template || site.template_id)}
              </span>
              <span className="plan-badge">
                {site.plan} Plan
              </span>
            </div>
            <h1>{getSiteTitle(site)}</h1>
            {getSiteSubtitle(site) && (
              <p className="hero-subtitle">{getSiteSubtitle(site)}</p>
            )}
            <div className="hero-actions">
              <a
                href={getSiteUrl(site)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary cta-button"
              >
                Visit example →
              </a>
              <Link to={ctaTarget} className="btn btn-secondary cta-button">
                {ctaLabel}
              </Link>
              <button type="button" onClick={handleCopyLink} className="btn btn-secondary share-button">
                {copySuccess ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </section>

        <section className="showcase-metadata" aria-label="Example site details">
          <div className="metadata-item">
            <span className="metadata-label">Example for</span>
            <span className="metadata-value">{formatCategory(site.template || site.template_id)}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Theme</span>
            <span className="metadata-value">
              {payload.galleryTheme?.name || payload.colors?.themeId || 'Right Site Light theme'}
            </span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Plan shown</span>
            <span className="metadata-value">{site.plan}</span>
          </div>
        </section>
        {payload.about && (
          <section className="showcase-about">
            <h2>{payload.about.title || 'About'}</h2>
            <p>{payload.about.description}</p>
          </section>
        )}

        {payload.contact && (
          <section className="showcase-contact">
            <h2>Contact Information</h2>
            <div className="contact-grid">
              {payload.contact.phone && (
                <div className="contact-item">
                  <span className="contact-icon" aria-hidden="true">📞</span>
                  <span>{payload.contact.phone}</span>
                </div>
              )}
              {payload.contact.email && (
                <div className="contact-item">
                  <span className="contact-icon" aria-hidden="true">✉️</span>
                  <span>{payload.contact.email}</span>
                </div>
              )}
              {payload.contact.address && (
                <div className="contact-item">
                  <span className="contact-icon" aria-hidden="true">📍</span>
                  <span>{payload.contact.address}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {payload.images?.gallery && payload.images.gallery.length > 0 && (
          <section className="showcase-image-gallery">
            <h2>Gallery</h2>
            <div className="gallery-grid">
              {payload.images.gallery.map((image, index) => (
                <img
                  key={image}
                  src={image}
                  alt={`${getSiteTitle(site)} gallery image ${index + 1}`}
                  loading="lazy"
                />
              ))}
            </div>
          </section>
        )}

        <section className="showcase-share">
          <h3>Share this site</h3>
          <div className="share-buttons">
            <button
              type="button"
              onClick={() => handleShare('twitter')}
              className="share-btn share-twitter"
              aria-label="Share on Twitter"
            >
              Twitter
            </button>
            <button
              type="button"
              onClick={() => handleShare('facebook')}
              className="share-btn share-facebook"
              aria-label="Share on Facebook"
            >
              Facebook
            </button>
            <button
              type="button"
              onClick={() => handleShare('linkedin')}
              className="share-btn share-linkedin"
              aria-label="Share on LinkedIn"
            >
              LinkedIn
            </button>
          </div>
        </section>

        <section className="showcase-cta">
          <div className="cta-content">
            <h2>Want a page that looks like this?</h2>
            <p>
              This is an example — start a free draft, pick your theme, and make it yours.
            </p>
            <Link to={ctaTarget} className="btn btn-primary btn-large">
              {ctaLabel}
            </Link>
          </div>
        </section>
      </div>
    </PublicPageLayout>
  );
}

export default ShowcaseDetail;
