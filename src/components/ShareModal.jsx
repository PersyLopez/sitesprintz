/**
 * Owner share sheet: two jobs (social tap-through vs print flyer).
 * Entry points stay SiteCard and SiteDashboard. Ocean tokens in ShareModal.css.
 */

import React, { useState, useEffect } from 'react';
import { getPublishedSiteUrl } from '../utils/siteWorkspace';
import './ShareModal.css';

const SOCIAL_GOAL =
  'People see a photo of your shop and tap through. They never type your link.';
const PRINT_GOAL =
  'Tape this up or hand it out. Scan the code to open the shop — no long web address to type.';
const STORY_AS_PICTURE_HINT =
  'A Story or post as a picture should use the print flyer (QR), not this preview.';

const ShareModal = ({ subdomain, onClose }) => {
  const [printFormat, setPrintFormat] = useState('square');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socialCardUrl, setSocialCardUrl] = useState(null);
  const [printCardUrl, setPrintCardUrl] = useState(null);
  const [qrUrl, setQrUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [shareHint, setShareHint] = useState(null);

  const siteUrl = getPublishedSiteUrl(subdomain) || `${window.location.origin}/view/${encodeURIComponent(subdomain)}`;
  const shareText = `Check out my site: ${siteUrl}`;
  const socialCardEndpoint = `/api/share/${subdomain}/social`;
  const printCardEndpoint = `/api/share/${subdomain}/${printFormat}`;
  const shareQrEndpoint = `/api/share/${subdomain}/qr`;

  const fetchBlobInto = async (endpoint, setUrl) => {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      }
    } catch (err) {
      console.warn('Share asset failed:', err);
    }
  };

  useEffect(() => {
    fetchBlobInto(socialCardEndpoint, setSocialCardUrl);
  }, [subdomain]);

  useEffect(() => {
    fetchBlobInto(printCardEndpoint, setPrintCardUrl);
  }, [printFormat, subdomain]);

  useEffect(() => {
    fetchBlobInto(shareQrEndpoint, setQrUrl);
  }, [subdomain]);

  const trackShare = async (platform, extra = {}) => {
    try {
      await fetch('/api/analytics/conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain,
          type: 'share',
          metadata: { platform, format: extra.format ?? printFormat, ...extra }
        })
      });
    } catch (err) {
      console.warn('Analytics tracking failed:', err);
    }
  };

  const handleFacebookShare = () => {
    trackShare('facebook', { format: 'social', job: 'social' });
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const handleWhatsAppShare = () => {
    trackShare('whatsapp', { format: 'social', job: 'social' });
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
      trackShare('instagram', { format: 'social', job: 'social' });
      await copySiteUrl();
      setShareHint('Link copied. Paste it in Instagram (bio or DM).');
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  const handleTikTokShare = async () => {
    try {
      trackShare('tiktok', { format: 'social', job: 'social' });
      await copySiteUrl();
      setShareHint('Link copied. Paste it in TikTok (bio or DM).');
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
      trackShare('native', { format: 'social', job: 'social' });
      await navigator.share({
        title: `${subdomain} - Right Site Light`,
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
      trackShare('copy-link', { format: 'social', job: 'social' });
      setShareHint(null);
    } catch (err) {
      console.error('Copy failed:', err);
      setError('Failed to copy link');
    }
  };

  const handleVisitSharePage = () => {
    trackShare('visit-page', { format: 'social', job: 'social' });
    window.open(`${siteUrl}?share=true`, '_blank');
  };

  const downloadBlob = async (endpoint, filename, trackName, failMessage) => {
    setLoading(true);
    setError(null);

    try {
      await trackShare(trackName, { format: printFormat, job: 'print' });

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(failMessage);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLoading(false);
    } catch (err) {
      console.error(failMessage, err);
      setError(failMessage);
      setLoading(false);
    }
  };

  const handleDownloadFlyer = () =>
    downloadBlob(
      printCardEndpoint,
      `${subdomain}-flyer-${printFormat}.png`,
      'download-flyer',
      'Failed to download flyer'
    );

  const handleDownloadQr = () =>
    downloadBlob(
      shareQrEndpoint,
      `${subdomain}-qr.png`,
      'download-qr',
      'Failed to download QR code'
    );

  useEffect(() => {
    document.querySelector('[data-testid="share-job-social"]')?.scrollIntoView({ block: 'nearest' });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (socialCardUrl) URL.revokeObjectURL(socialCardUrl);
      if (printCardUrl) URL.revokeObjectURL(printCardUrl);
      if (qrUrl) URL.revokeObjectURL(qrUrl);
    };
  }, [socialCardUrl, printCardUrl, qrUrl]);

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" data-testid="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2>Share Your Site</h2>
          <button type="button" className="share-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <section className="share-job" data-testid="share-job-social" aria-labelledby="share-job-social-heading">
          <h3 id="share-job-social-heading">Social media</h3>
          <p className="share-job-goal" data-testid="share-job-social-goal">{SOCIAL_GOAL}</p>

          <div className="share-preview-row share-preview-row--solo">
            <div className="share-modal-preview" data-testid="share-card-preview">
              <p className="share-preview-label">Card preview</p>
              <div className="share-preview-frame share-preview-frame--og">
                {socialCardUrl ? (
                  <img src={socialCardUrl} alt="Share card preview" />
                ) : (
                  <div className="share-modal-preview-loading">
                    <div className="spinner"></div>
                    <p>Generating preview…</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="share-options">
            <div className="share-buttons">
              <button type="button" onClick={handleWhatsAppShare} className="share-btn whatsapp" data-testid="share-whatsapp">
                <span className="icon">WA</span>
                WhatsApp
              </button>
              <button type="button" onClick={handleFacebookShare} className="share-btn facebook" data-testid="share-facebook">
                <span className="icon">f</span>
                Facebook
              </button>
              <button type="button" onClick={handleInstagramShare} className="share-btn instagram" data-testid="share-instagram">
                <span className="icon">IG</span>
                Instagram
              </button>
              <button type="button" onClick={handleTikTokShare} className="share-btn tiktok" data-testid="share-tiktok">
                <span className="icon">TT</span>
                TikTok
              </button>
              {navigator.share && (
                <button type="button" onClick={handleNativeShare} className="share-btn native">
                  <span className="icon">⤴</span>
                  More…
                </button>
              )}
            </div>
            <p className="share-app-hint">
              Instagram and TikTok: paste the link in a bio or DM.
            </p>
            <p className="share-app-hint">{STORY_AS_PICTURE_HINT}</p>
            {shareHint && (
              <p className="share-app-hint copied" data-testid="share-copy-hint">{shareHint}</p>
            )}
          </div>

          <div className="share-link-section">
            <h4 className="share-link-heading">Copy link</h4>
            <div className="share-link-input">
              <input type="text" value={siteUrl} readOnly aria-label="Live site URL" />
              <button type="button" onClick={handleCopyLink} className={copied ? 'copied' : ''}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </section>

        <section className="share-job" data-testid="share-job-print" aria-labelledby="share-job-print-heading">
          <h3 id="share-job-print-heading">Print flyer</h3>
          <p className="share-job-goal" data-testid="share-job-print-goal">{PRINT_GOAL}</p>

          <div className="share-preview-row">
            <div className="share-modal-preview">
              <p className="share-preview-label">Flyer preview</p>
              <div className={`share-preview-frame share-preview-frame--flyer${printFormat === 'story' ? ' share-preview-frame--story' : ''}`}>
                {printCardUrl ? (
                  <img src={printCardUrl} alt="Print flyer preview" />
                ) : (
                  <div className="share-modal-preview-loading">
                    <div className="spinner"></div>
                    <p>Generating preview…</p>
                  </div>
                )}
              </div>
            </div>

            <div className="share-qr-block" data-testid="share-qr-block">
              <p className="share-preview-label">Scan to open</p>
              <div className="share-qr-surface">
                {qrUrl ? (
                  <img src={qrUrl} alt="QR code for your site" data-testid="share-qr-preview" />
                ) : (
                  <div className="share-modal-preview-loading">
                    <div className="spinner"></div>
                  </div>
                )}
              </div>
              <p className="share-qr-caption">Scan to open the shop</p>
            </div>
          </div>

          <div className="share-format-selector">
            <label>Flyer size</label>
            <div className="share-format-buttons" role="group" aria-label="Flyer size">
              <button
                type="button"
                className={printFormat === 'square' ? 'active' : ''}
                onClick={() => setPrintFormat('square')}
                aria-label="Square 1080 by 1080"
              >
                Square
                <span className="share-format-dim">1080×1080</span>
              </button>
              <button
                type="button"
                className={printFormat === 'story' ? 'active' : ''}
                onClick={() => setPrintFormat('story')}
                aria-label="Story 1080 by 1920"
              >
                Story
                <span className="share-format-dim">1080×1920</span>
              </button>
            </div>
          </div>

          <div className="share-print-section">
            <button
              type="button"
              onClick={handleDownloadFlyer}
              className="share-btn download"
              data-testid="share-download-flyer"
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
                  Download flyer
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
            <p className="share-download-qr-caption">Scan-only. No shop photo — just the code.</p>
          </div>
        </section>

        {error && (
          <div className="share-error">
            {error}
          </div>
        )}

        <button type="button" onClick={handleVisitSharePage} className="share-visit-link">
          View live share page →
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
