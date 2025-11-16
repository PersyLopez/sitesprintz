/**
 * Visitor Share Widget for Published Sites
 * 
 * Allows site visitors to share beautiful custom cards or fallback to default sharing.
 * Lightweight, vanilla JS, no dependencies.
 */

(function() {
  'use strict';

  // Get subdomain from window location
  const subdomain = window.location.hostname.split('.')[0];
  const siteUrl = window.location.origin;

  // Check if share cards are available
  let shareCardsAvailable = false;
  let previewImageUrl = null;

  // Try to load a preview card to check availability
  async function checkShareCardAvailability() {
    try {
      const response = await fetch(`/api/share/${subdomain}/social`, { method: 'HEAD' });
      shareCardsAvailable = response.ok;
      if (shareCardsAvailable) {
        previewImageUrl = `/api/share/${subdomain}/social`;
      }
    } catch (err) {
      shareCardsAvailable = false;
    }
  }

  // Initialize on load
  checkShareCardAvailability();

  // Create share modal HTML
  function createShareModal() {
    const modalHTML = `
      <div id="visitor-share-modal" class="visitor-share-modal-overlay">
        <div class="visitor-share-modal">
          <div class="visitor-share-header">
            <h3>Share this site</h3>
            <button class="visitor-share-close" aria-label="Close">&times;</button>
          </div>
          
          <div class="visitor-share-preview" id="share-preview">
            <div class="visitor-share-loading">Loading preview...</div>
          </div>
          
          <div class="visitor-share-options">
            <button class="visitor-share-btn facebook" data-platform="facebook">
              <span>f</span> Facebook
            </button>
            <button class="visitor-share-btn twitter" data-platform="twitter">
              <span>𝕏</span> Twitter
            </button>
            <button class="visitor-share-btn linkedin" data-platform="linkedin">
              <span>in</span> LinkedIn
            </button>
            <button class="visitor-share-btn email" data-platform="email">
              <span>✉</span> Email
            </button>
          </div>
          
          <div class="visitor-share-link">
            <input type="text" readonly value="${siteUrl}" id="share-link-input">
            <button class="visitor-share-copy" id="copy-link-btn">Copy</button>
          </div>
          
          <div class="visitor-share-footer" id="share-card-download" style="display: none;">
            <button class="visitor-share-download" id="download-card-btn">
              ⬇ Download Share Card
            </button>
          </div>
        </div>
      </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    injectModalStyles();
    attachModalEventListeners();
  }

  // Inject modal styles
  function injectModalStyles() {
    if (document.getElementById('visitor-share-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'visitor-share-styles';
    styles.textContent = `
      .visitor-share-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        z-index: 999999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.2s ease-out;
      }
      
      .visitor-share-modal-overlay.active {
        display: flex;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .visitor-share-modal {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border-radius: 16px;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        animation: slideUp 0.3s ease-out;
      }
      
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      .visitor-share-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .visitor-share-header h3 {
        margin: 0;
        color: #fff;
        font-size: 1.5rem;
        font-weight: 700;
      }
      
      .visitor-share-close {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 2rem;
        cursor: pointer;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s;
      }
      
      .visitor-share-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      
      .visitor-share-preview {
        padding: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 150px;
        background: rgba(0, 0, 0, 0.2);
      }
      
      .visitor-share-preview img {
        max-width: 100%;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      }
      
      .visitor-share-loading {
        color: #94a3b8;
        font-size: 0.9rem;
      }
      
      .visitor-share-options {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        padding: 20px;
      }
      
      .visitor-share-btn {
        padding: 12px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: #fff;
      }
      
      .visitor-share-btn span {
        font-size: 18px;
        font-weight: bold;
      }
      
      .visitor-share-btn.facebook {
        background: #1877f2;
      }
      
      .visitor-share-btn.facebook:hover {
        background: #1564c0;
        transform: translateY(-2px);
      }
      
      .visitor-share-btn.twitter {
        background: #000;
      }
      
      .visitor-share-btn.twitter:hover {
        background: #1a1a1a;
        transform: translateY(-2px);
      }
      
      .visitor-share-btn.linkedin {
        background: #0077b5;
      }
      
      .visitor-share-btn.linkedin:hover {
        background: #005e8c;
        transform: translateY(-2px);
      }
      
      .visitor-share-btn.email {
        background: #6366f1;
      }
      
      .visitor-share-btn.email:hover {
        background: #5558e3;
        transform: translateY(-2px);
      }
      
      .visitor-share-link {
        padding: 0 20px 20px;
        display: flex;
        gap: 8px;
      }
      
      .visitor-share-link input {
        flex: 1;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #cbd5e1;
        font-size: 13px;
        font-family: monospace;
      }
      
      .visitor-share-copy {
        padding: 10px 20px;
        background: #6366f1;
        border: none;
        border-radius: 8px;
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .visitor-share-copy:hover {
        background: #5558e3;
        transform: translateY(-2px);
      }
      
      .visitor-share-copy.copied {
        background: #22c55e;
      }
      
      .visitor-share-footer {
        padding: 0 20px 20px;
      }
      
      .visitor-share-download {
        width: 100%;
        padding: 12px;
        background: #22c55e;
        border: none;
        border-radius: 8px;
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .visitor-share-download:hover {
        background: #16a34a;
        transform: translateY(-2px);
      }
      
      .visitor-share-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 52px;
        height: 52px;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        border: none;
        border-radius: 50%;
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        z-index: 999998;
      }
      
      .visitor-share-fab svg {
        width: 20px;
        height: 20px;
      }
      
      .visitor-share-fab:hover {
        transform: translateY(-3px) scale(1.08);
        box-shadow: 0 10px 28px rgba(99, 102, 241, 0.5);
      }
      
      @media (max-width: 640px) {
        .visitor-share-options {
          grid-template-columns: 1fr;
        }
        
        .visitor-share-fab {
          bottom: 16px;
          right: 16px;
          width: 46px;
          height: 46px;
        }
        
        .visitor-share-fab svg {
          width: 18px;
          height: 18px;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  // Attach event listeners to modal
  function attachModalEventListeners() {
    const modal = document.getElementById('visitor-share-modal');
    const closeBtn = modal.querySelector('.visitor-share-close');
    const copyBtn = document.getElementById('copy-link-btn');
    const downloadBtn = document.getElementById('download-card-btn');
    const shareButtons = modal.querySelectorAll('[data-platform]');
    
    // Close modal
    closeBtn.addEventListener('click', closeShareModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeShareModal();
    });
    
    // Copy link
    copyBtn.addEventListener('click', async () => {
      const input = document.getElementById('share-link-input');
      try {
        await navigator.clipboard.writeText(input.value);
        copyBtn.textContent = '✓ Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        input.select();
        document.execCommand('copy');
      }
    });
    
    // Download card
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async () => {
        if (!shareCardsAvailable) return;
        
        try {
          const response = await fetch(`/api/share/${subdomain}/social`);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${subdomain}-share-card.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error('Download failed:', err);
        }
      });
    }
    
    // Share buttons
    shareButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const platform = btn.dataset.platform;
        handleShare(platform);
      });
    });
  }

  // Handle sharing to different platforms
  function handleShare(platform) {
    const title = document.title;
    const text = `Check out ${title}!`;
    
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(siteUrl)}&text=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`,
      email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + ' ' + siteUrl)}`
    };
    
    if (platform === 'email') {
      window.location.href = urls[platform];
    } else {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  }

  // Open share modal
  function openShareModal() {
    let modal = document.getElementById('visitor-share-modal');
    
    if (!modal) {
      createShareModal();
      modal = document.getElementById('visitor-share-modal');
    }
    
    modal.classList.add('active');
    
    // Load preview
    loadSharePreview();
  }

  // Close share modal
  function closeShareModal() {
    const modal = document.getElementById('visitor-share-modal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  // Load share preview
  async function loadSharePreview() {
    const previewContainer = document.getElementById('share-preview');
    const downloadSection = document.getElementById('share-card-download');
    
    if (shareCardsAvailable && previewImageUrl) {
      // Show custom share card
      previewContainer.innerHTML = `<img src="${previewImageUrl}" alt="Share card preview">`;
      downloadSection.style.display = 'block';
    } else {
      // Show default preview (meta image)
      const metaImage = document.querySelector('meta[property="og:image"]');
      const imageUrl = metaImage ? metaImage.content : '';
      
      if (imageUrl) {
        previewContainer.innerHTML = `<img src="${imageUrl}" alt="Site preview" style="max-height: 200px;">`;
      } else {
        previewContainer.innerHTML = `<div style="color: #94a3b8;">No preview available</div>`;
      }
      
      downloadSection.style.display = 'none';
    }
  }

  // Create and inject FAB (Floating Action Button)
  function createShareFAB() {
    const fab = document.createElement('button');
    fab.className = 'visitor-share-fab';
    fab.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
        <polyline points="16 6 12 2 8 6"></polyline>
        <line x1="12" y1="2" x2="12" y2="15"></line>
      </svg>
    `;
    fab.title = 'Share this site';
    fab.setAttribute('aria-label', 'Share this site');
    
    fab.addEventListener('click', openShareModal);
    
    document.body.appendChild(fab);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createShareFAB);
  } else {
    createShareFAB();
  }

  // Expose global function for programmatic triggering
  window.openSiteShareModal = openShareModal;

})();

