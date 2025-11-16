/**
 * Platform Share Widget
 * 
 * Allows visitors to share the SiteSprintz platform itself
 * Simpler version focused on platform marketing
 */

import React, { useState } from 'react';
import './PlatformShareButton.css';

function PlatformShareButton({ className = '' }) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const platformUrl = window.location.origin;
  const platformTitle = 'SiteSprintz - Build Your Business Website in Minutes';
  const platformDescription = 'Create beautiful, professional websites for your business with SiteSprintz. No coding required!';

  const handleShare = (platform) => {
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(platformUrl)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(platformUrl)}&text=${encodeURIComponent(platformTitle)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(platformUrl)}`,
      email: `mailto:?subject=${encodeURIComponent(platformTitle)}&body=${encodeURIComponent(platformDescription + '\n\n' + platformUrl)}`
    };

    if (platform === 'email') {
      window.location.href = urls[platform];
    } else {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }

    // Track share
    try {
      fetch('/api/analytics/conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: 'platform',
          type: 'platform_share',
          metadata: { platform }
        })
      });
    } catch (err) {
      // Silent fail
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(platformUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
      const input = document.createElement('input');
      input.value = platformUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <button
        className={`platform-share-trigger ${className}`}
        onClick={() => setShowModal(true)}
        title="Share SiteSprintz"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
          <polyline points="16 6 12 2 8 6"></polyline>
          <line x1="12" y1="2" x2="12" y2="15"></line>
        </svg>
        Share
      </button>

      {showModal && (
        <div className="platform-share-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="platform-share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="platform-share-header">
              <h3>Share SiteSprintz</h3>
              <button 
                className="platform-share-close" 
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <p className="platform-share-description">
              Help others discover SiteSprintz! Share on your favorite platform:
            </p>

            <div className="platform-share-buttons">
              <button 
                className="platform-share-btn facebook"
                onClick={() => handleShare('facebook')}
              >
                <span>f</span> Facebook
              </button>
              <button 
                className="platform-share-btn twitter"
                onClick={() => handleShare('twitter')}
              >
                <span>𝕏</span> Twitter
              </button>
              <button 
                className="platform-share-btn linkedin"
                onClick={() => handleShare('linkedin')}
              >
                <span>in</span> LinkedIn
              </button>
              <button 
                className="platform-share-btn email"
                onClick={() => handleShare('email')}
              >
                <span>✉</span> Email
              </button>
            </div>

            <div className="platform-share-link">
              <input 
                type="text" 
                readOnly 
                value={platformUrl}
                onClick={(e) => e.target.select()}
              />
              <button 
                className={`platform-share-copy ${copied ? 'copied' : ''}`}
                onClick={handleCopyLink}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PlatformShareButton;

