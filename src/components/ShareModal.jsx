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
  const [shareHint, setShareHint] = useState(null);

  const siteUrl = `https://${subdomain}.sitesprintz.com`;
  const shareText = `Check out my site: ${siteUrl}`;
  const shareCardEndpoint = `/api/share/${subdomain}/${format}`;
  const shareQrEndpoint = `/api/share/${subdomain}/qr`;

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

  const handleWhatsAppShare = () => {
    trackShare('whatsapp');
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const copySiteUrl = async () => {
    await navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInstagramShare = async () => {
    try {
      trackShare('instagram');
      await copySiteUrl();
      setShareHint('Link copied. Paste it in Instagram (bio, Story sticker, or DM).');
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  const handleTikTokShare = async () => {
    try {
      trackShare('tiktok');
      await copySiteUrl();
      setShareHint('Link copied. Paste it in TikTok (bio or comments).');
    } catch (err) {
      setError('Failed to copy link');
    }
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
      await copySiteUrl();
      trackShare('copy-link');
      setShareHint(null);
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

  const handleDownloadQr = async () => {
    setLoading(true);
    setError(null);

    try {
      trackShare('download-qr');

      const response = await fetch(shareQrEndpoint);

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${subdomain}-qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLoading(false);
    } catch (err) {
      console.error('QR download failed:', err);
      setError('Failed to download QR code');
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
            <button onClick={handleFacebookShare} className="share-btn facebook" data-testid="share-facebook">
              <span className="icon">f</span>
              Facebook
            </button>
            <button onClick={handleWhatsAppShare} className="share-btn whatsapp" data-testid="share-whatsapp">
              <span className="icon">WA</span>
              WhatsApp
            </button>
            <button onClick={handleInstagramShare} className="share-btn instagram" data-testid="share-instagram">
              <span className="icon">IG</span>
              Instagram
            </button>
            <button onClick={handleTikTokShare} className="share-btn tiktok" data-testid="share-tiktok">
              <span className="icon">TT</span>
              TikTok
            </button>
            {navigator.share && (
              <button onClick={handleNativeShare} className="share-btn native">
                <span className="icon">⤴</span>
                More...
              </button>
            )}
          </div>
          <p className="share-app-hint">
            Instagram and TikTok have no web sharer — copy your link and paste it in the app.
          </p>
          {shareHint && (
            <p className="share-app-hint copied" data-testid="share-copy-hint">{shareHint}</p>
          )}
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
          <button
            type="button"
            onClick={handleDownloadQr}
            className="share-btn download qr"
            data-testid="share-download-qr"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Generating...
              </>
            ) : (
              <>
                <span className="icon">▦</span>
                Download QR
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

