/**
 * ShareModal Component (TDD Implementation)
 * 
 * Universal share modal that works for ALL templates:
 * - Direct sharing to social media (Facebook, Twitter, LinkedIn)
 * - Native share API (mobile)
 * - Copy link
 * - Download high-res card for print
 * 
 * Features:
 * - Modular & reusable
 * - Format selection (Social, Story, Square)
 * - Loading states
 * - Error handling
 * - Analytics tracking
 */

import React, { useState, useEffect } from 'react';
import './ShareModal.css';

const ShareModal = ({ subdomain, onClose }) => {
  const [format, setFormat] = useState('social');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cardUrl, setCardUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const siteUrl = `https://${subdomain}.sitesprintz.com`;
  const shareCardEndpoint = `/api/share/${subdomain}/${format}`;

  // Pre-generate card on mount and format change
  useEffect(() => {
    preGenerateCard();
  }, [format, subdomain]);

  const preGenerateCard = async () => {
    try {
      const response = await fetch(shareCardEndpoint);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setCardUrl(url);
      }
    } catch (err) {
      console.warn('Pre-generation failed:', err);
    }
  };

  const trackShare = async (platform) => {
    try {
      await fetch('/api/analytics/conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain,
          type: 'share',
          metadata: { platform, format }
        })
      });
    } catch (err) {
      console.warn('Analytics tracking failed:', err);
    }
  };

  const handleFacebookShare = () => {
    trackShare('facebook');
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const handleTwitterShare = () => {
    trackShare('twitter');
    const text = `Check out my site: ${subdomain}`;
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(siteUrl)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const handleLinkedInShare = () => {
    trackShare('linkedin');
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      alert('Native sharing is not supported on this device');
      return;
    }

    try {
      trackShare('native');
      await navigator.share({
        title: `${subdomain} - SiteSprintz`,
        text: `Check out my site!`,
        url: siteUrl
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Native share failed:', err);
        setError('Failed to share');
      }
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      trackShare('copy-link');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      setError('Failed to copy link');
    }
  };

  const handleVisitSharePage = () => {
    trackShare('visit-page');
    window.open(`${siteUrl}?share=true`, '_blank');
  };

  const handleDownload = async () => {
    setLoading(true);
    setError(null);

    try {
      trackShare('download');
      
      const response = await fetch(shareCardEndpoint);
      
      if (!response.ok) {
        throw new Error('Failed to generate share card');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${subdomain}-share-card-${format}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLoading(false);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download share card');
      setLoading(false);
    }
  };

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (cardUrl) {
        URL.revokeObjectURL(cardUrl);
      }
    };
  }, [cardUrl]);

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="share-modal-header">
          <h2>Share Your Site</h2>
          <button className="share-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Preview */}
        <div className="share-modal-preview">
          {cardUrl ? (
            <img src={cardUrl} alt="Share card preview" />
          ) : (
            <div className="share-modal-preview-loading">
              <div className="spinner"></div>
              <p>Generating preview...</p>
            </div>
          )}
        </div>

        {/* Format Selection */}
        <div className="share-format-selector">
          <label>Card Format:</label>
          <div className="share-format-buttons">
            <button
              className={format === 'social' ? 'active' : ''}
              onClick={() => setFormat('social')}
            >
              Social (1200×630)
            </button>
            <button
              className={format === 'story' ? 'active' : ''}
              onClick={() => setFormat('story')}
            >
              Story (1080×1920)
            </button>
            <button
              className={format === 'square' ? 'active' : ''}
              onClick={() => setFormat('square')}
            >
              Square (1080×1080)
            </button>
          </div>
        </div>

        {/* Share Options */}
        <div className="share-options">
          <h3>Share Directly</h3>
          <div className="share-buttons">
            <button onClick={handleFacebookShare} className="share-btn facebook">
              <span className="icon">f</span>
              Facebook
            </button>
            <button onClick={handleTwitterShare} className="share-btn twitter">
              <span className="icon">𝕏</span>
              Twitter
            </button>
            <button onClick={handleLinkedInShare} className="share-btn linkedin">
              <span className="icon">in</span>
              LinkedIn
            </button>
            {navigator.share && (
              <button onClick={handleNativeShare} className="share-btn native">
                <span className="icon">⤴</span>
                More...
              </button>
            )}
          </div>
        </div>

        {/* Link Options */}
        <div className="share-link-section">
          <h3>Share Link</h3>
          <div className="share-link-input">
            <input type="text" value={siteUrl} readOnly />
            <button onClick={handleCopyLink} className={copied ? 'copied' : ''}>
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Download for Print */}
        <div className="share-print-section">
          <h3>Print Marketing</h3>
          <p className="share-print-description">
            Download high-resolution card for flyers, business cards, or posters
          </p>
          <button 
            onClick={handleDownload} 
            className="share-btn download"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Generating...
              </>
            ) : (
              <>
                <span className="icon">⬇</span>
                Download for Print
              </>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="share-error">
            {error}
          </div>
        )}

        {/* Visit Share Page */}
        <button onClick={handleVisitSharePage} className="share-visit-link">
          View live share page →
        </button>
      </div>
    </div>
  );
};

export default ShareModal;

