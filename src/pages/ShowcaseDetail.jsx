/**
 * ShowcaseDetail Component
 * 
 * Individual site showcase page
 * - Site hero section with image
 * - About section
 * - Contact information
 * - Image gallery
 * - Call to action
 * - Social sharing
 * - SEO optimized
 */

import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import './ShowcaseDetail.css';

function ShowcaseDetail() {
  const { subdomain } = useParams();
  const navigate = useNavigate();
  
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Set page title and meta for SEO
  useEffect(() => {
    if (site) {
      const siteTitle = getSiteTitle(site);
      document.title = `${siteTitle} - Made with SiteSprintz`;
      
      // Update meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      const description = site.site_data?.about?.description || site.site_data?.hero?.subtitle || `${siteTitle} - A beautiful website made with SiteSprintz`;
      metaDescription.setAttribute('content', description);
    }
  }, [site]);

  // Fetch site details
  useEffect(() => {
    const fetchSite = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/showcase/${subdomain}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Site not found. It may be private or does not exist.');
          } else {
            setError('Failed to load site details. Please try again later.');
          }
          return;
        }

        const data = await response.json();
        setSite(data);
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
    return siteData?.site_data?.hero?.title || 'Untitled Site';
  };

  const getSiteSubtitle = (siteData) => {
    return siteData?.site_data?.hero?.subtitle || '';
  };

  const getSiteHeroImage = (siteData) => {
    return siteData?.site_data?.images?.hero || siteData?.site_data?.hero?.backgroundImage || '/images/default-hero.jpg';
  };

  const getSiteUrl = (siteData) => {
    return `https://${siteData.subdomain}.sitesprintz.com`;
  };

  const formatCategory = (category) => {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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

  // Loading state
  if (loading) {
    return (
      <div className="showcase-detail-loading">
        <div className="spinner"></div>
        <p>Loading site details...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="showcase-detail-error">
        <h2>Oops! Something went wrong</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={handleRetry} className="btn btn-primary">
            Try Again
          </button>
          <Link to="/showcase" className="btn btn-secondary">
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  // No site state
  if (!site) {
    return (
      <div className="showcase-detail-error">
        <h2>Site not found</h2>
        <p>This site doesn't exist or is not public.</p>
        <Link to="/showcase" className="btn btn-primary">
          Back to Gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="showcase-detail" data-testid="showcase-detail">
      {/* Back Button */}
      <div className="showcase-detail-nav">
        <Link to="/showcase" className="back-link">
          ← Back to Gallery
        </Link>
      </div>

      {/* Hero Section */}
      <section className="showcase-hero">
        <div className="hero-image">
          <img 
            src={getSiteHeroImage(site)} 
            alt={`${getSiteTitle(site)} hero image`}
            style={{ maxWidth: '100%' }}
          />
        </div>
        <div className="hero-content">
          <div className="hero-badges">
            <span className="category-badge">
              {formatCategory(site.template_id)}
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
              className="btn btn-primary"
            >
              Visit Site →
            </a>
            <button onClick={handleCopyLink} className="btn btn-secondary">
              {copySuccess ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      </section>

      {/* Metadata */}
      <section className="showcase-metadata">
        <div className="metadata-item">
          <span className="metadata-label">Launched</span>
          <span className="metadata-value">{formatDate(site.created_at)}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Category</span>
          <span className="metadata-value">{formatCategory(site.template_id)}</span>
        </div>
        <div className="metadata-item">
          <span className="metadata-label">Plan</span>
          <span className="metadata-value">{site.plan}</span>
        </div>
      </section>

      {/* About Section */}
      {site.site_data?.about && (
        <section className="showcase-about">
          <h2>{site.site_data.about.title || 'About'}</h2>
          <p>{site.site_data.about.description}</p>
        </section>
      )}

      {/* Contact Information */}
      {site.site_data?.contact && (
        <section className="showcase-contact">
          <h2>Contact Information</h2>
          <div className="contact-grid">
            {site.site_data.contact.phone && (
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <span>{site.site_data.contact.phone}</span>
              </div>
            )}
            {site.site_data.contact.email && (
              <div className="contact-item">
                <span className="contact-icon">✉️</span>
                <span>{site.site_data.contact.email}</span>
              </div>
            )}
            {site.site_data.contact.address && (
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <span>{site.site_data.contact.address}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Image Gallery */}
      {site.site_data?.images?.gallery && site.site_data.images.gallery.length > 0 && (
        <section className="showcase-gallery">
          <h2>Gallery</h2>
          <div className="gallery-grid">
            {site.site_data.images.gallery.map((image, index) => (
              <img 
                key={index}
                src={image} 
                alt={`${getSiteTitle(site)} gallery image ${index + 1}`}
                loading="lazy"
                style={{ maxWidth: '100%' }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Social Share */}
      <section className="showcase-share">
        <h3>Share this site</h3>
        <div className="share-buttons">
          <button 
            onClick={() => handleShare('twitter')}
            className="share-btn share-twitter"
            aria-label="Share on Twitter"
          >
            Twitter
          </button>
          <button 
            onClick={() => handleShare('facebook')}
            className="share-btn share-facebook"
            aria-label="Share on Facebook"
          >
            Facebook
          </button>
          <button 
            onClick={() => handleShare('linkedin')}
            className="share-btn share-linkedin"
            aria-label="Share on LinkedIn"
          >
            LinkedIn
          </button>
        </div>
      </section>

      {/* Call to Action */}
      <section className="showcase-cta">
        <div className="cta-content">
          <h2>Create Your Own Beautiful Website</h2>
          <p>Join thousands of businesses using SiteSprintz to build their online presence.</p>
          <Link to="/" className="btn btn-primary btn-large">
            Get Started Free →
          </Link>
        </div>
      </section>
    </div>
  );
}

export default ShowcaseDetail;

