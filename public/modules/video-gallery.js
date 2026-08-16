/**
 * Video Gallery Component
 * 
 * Video library with category tabs and YouTube/Vimeo embedding.
 * Used for: Gym (workout library), All niches (tutorial videos)
 * 
 * Features:
 * - YouTube/Vimeo embedding
 * - Category tabs
 * - Video grid layout
 * - Playlist support
 * - Responsive design
 */

class VideoGallery {
  constructor(config) {
    this.config = {
      containerId: config.containerId || 'video-gallery-container',
      videos: config.videos || [],
      categories: config.categories || [],
      defaultCategory: config.defaultCategory || 'all',
      showCategories: config.showCategories !== false,
      ...config
    };
    
    this.container = null;
    this.selectedCategory = this.config.defaultCategory;
    this.currentVideo = null;
  }

  /**
   * Initialize and render the gallery
   */
  init() {
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.error(`VideoGallery: Container ${this.config.containerId} not found`);
      return;
    }

    this.render();
    this.attachEventListeners();
  }

  /**
   * Render the gallery
   */
  render() {
    const categoriesHTML = this.buildCategoriesHTML();
    const videosHTML = this.buildVideosHTML();
    
    this.container.innerHTML = `
      <div class="video-gallery">
        <h3 class="gallery-title">${this.config.title || 'Video Library'}</h3>
        ${this.config.description ? `<p class="gallery-description">${this.config.description}</p>` : ''}
        
        ${categoriesHTML}
        ${videosHTML}
      </div>
      <style>
        .video-gallery {
          max-width: 1200px;
          margin: 0 auto;
        }
        .gallery-title {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .gallery-description {
          color: var(--color-muted, #666);
          margin-bottom: 32px;
        }
        .category-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid var(--color-border, #e5e7eb);
        }
        .category-tab {
          padding: 10px 20px;
          background: var(--color-surface, #f8f9fa);
          border: 1px solid var(--color-border, #e5e7eb);
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .category-tab:hover {
          background: var(--color-surface-hover, #e5e7eb);
        }
        .category-tab.active {
          background: var(--color-primary, #2563eb);
          color: white;
          border-color: var(--color-primary, #2563eb);
        }
        .videos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }
        .video-card {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.2s;
          cursor: pointer;
        }
        .video-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          transform: translateY(-2px);
        }
        .video-thumbnail {
          position: relative;
          width: 100%;
          padding-bottom: 56.25%; /* 16:9 aspect ratio */
          background: var(--color-surface, #f8f9fa);
          overflow: hidden;
        }
        .video-thumbnail img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .video-play-button {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 64px;
          height: 64px;
          background: rgba(0,0,0,0.7);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
          transition: all 0.2s;
        }
        .video-card:hover .video-play-button {
          background: var(--color-primary, #2563eb);
          transform: translate(-50%, -50%) scale(1.1);
        }
        .video-info {
          padding: 16px;
        }
        .video-title {
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 1.1rem;
        }
        .video-description {
          font-size: 0.9rem;
          color: var(--color-muted, #666);
          margin-bottom: 8px;
          line-height: 1.5;
        }
        .video-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
          color: var(--color-muted, #666);
        }
        .video-modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.9);
          z-index: 10000;
          align-items: center;
          justify-content: center;
        }
        .video-modal.active {
          display: flex;
        }
        .video-modal-content {
          position: relative;
          width: 90%;
          max-width: 1200px;
          background: black;
        }
        .video-modal-close {
          position: absolute;
          top: -40px;
          right: 0;
          background: none;
          border: none;
          color: white;
          font-size: 32px;
          cursor: pointer;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .video-embed {
          position: relative;
          padding-bottom: 56.25%; /* 16:9 aspect ratio */
          height: 0;
          overflow: hidden;
        }
        .video-embed iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        @media (max-width: 768px) {
          .videos-grid {
            grid-template-columns: 1fr;
          }
          .category-tabs {
            overflow-x: auto;
            flex-wrap: nowrap;
          }
        }
      </style>
    `;
  }

  /**
   * Build categories HTML
   */
  buildCategoriesHTML() {
    if (!this.config.showCategories || this.config.categories.length === 0) {
      return '';
    }

    const categories = this.getCategories();
    
    return `
      <div class="category-tabs">
        <div class="category-tab ${this.selectedCategory === 'all' ? 'active' : ''}" 
             data-category="all">
          All Videos
        </div>
        ${categories.map(cat => `
          <div class="category-tab ${this.selectedCategory === cat ? 'active' : ''}" 
               data-category="${cat}">
            ${cat}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Build videos HTML
   */
  buildVideosHTML() {
    const filteredVideos = this.getFilteredVideos();
    
    if (filteredVideos.length === 0) {
      return `
        <div style="text-align: center; padding: 48px; color: var(--color-muted, #666);">
          No videos found in this category.
        </div>
      `;
    }

    return `
      <div class="videos-grid">
        ${filteredVideos.map(video => this.buildVideoCardHTML(video)).join('')}
      </div>
      ${this.buildVideoModalHTML()}
    `;
  }

  /**
   * Build video card HTML
   */
  buildVideoCardHTML(video) {
    const thumbnail = this.getVideoThumbnail(video);
    
    return `
      <div class="video-card" data-video-id="${video.id}">
        <div class="video-thumbnail">
          ${thumbnail ? `<img src="${thumbnail}" alt="${video.title}">` : ''}
          <div class="video-play-button">▶</div>
        </div>
        <div class="video-info">
          <div class="video-title">${video.title}</div>
          ${video.description ? `
            <div class="video-description">${video.description}</div>
          ` : ''}
          <div class="video-meta">
            ${video.duration ? `<span>${video.duration}</span>` : ''}
            ${video.category ? `<span>${video.category}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build video modal HTML
   */
  buildVideoModalHTML() {
    return `
      <div class="video-modal" id="video-modal">
        <button class="video-modal-close" data-action="close-modal">×</button>
        <div class="video-modal-content">
          <div class="video-embed" id="video-embed-container"></div>
        </div>
      </div>
    `;
  }

  /**
   * Get video thumbnail
   */
  getVideoThumbnail(video) {
    if (video.thumbnail) return video.thumbnail;
    
    // Generate thumbnail URL for YouTube/Vimeo
    if (video.provider === 'youtube' && video.videoId) {
      return `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`;
    } else if (video.provider === 'vimeo' && video.videoId) {
      // Vimeo requires API call for thumbnail, use placeholder
      return video.thumbnail || null;
    }
    
    return null;
  }

  /**
   * Get categories from videos
   */
  getCategories() {
    return [...new Set(this.config.videos.map(v => v.category).filter(Boolean))];
  }

  /**
   * Get filtered videos
   */
  getFilteredVideos() {
    let filtered = [...this.config.videos];

    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(v => v.category === this.selectedCategory);
    }

    return filtered;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Category tabs
    this.container.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const category = tab.getAttribute('data-category');
        this.selectCategory(category);
      });
    });

    // Video cards
    this.container.querySelectorAll('.video-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const videoId = card.getAttribute('data-video-id');
        this.playVideo(videoId);
      });
    });

    // Modal close
    const closeBtn = document.querySelector('[data-action="close-modal"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // Close modal on background click
    const modal = document.getElementById('video-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  /**
   * Select category
   */
  selectCategory(category) {
    this.selectedCategory = category;
    this.render();
    this.attachEventListeners();
  }

  /**
   * Play video
   */
  playVideo(videoId) {
    const video = this.config.videos.find(v => v.id === videoId);
    if (!video) return;

    this.currentVideo = video;
    const modal = document.getElementById('video-modal');
    const embedContainer = document.getElementById('video-embed-container');
    
    if (!modal || !embedContainer) return;

    // Build embed URL
    let embedUrl = '';
    if (video.provider === 'youtube' && video.videoId) {
      embedUrl = `https://www.youtube.com/embed/${video.videoId}?autoplay=1`;
    } else if (video.provider === 'vimeo' && video.videoId) {
      embedUrl = `https://player.vimeo.com/video/${video.videoId}?autoplay=1`;
    } else if (video.url) {
      embedUrl = video.url;
    }

    if (embedUrl) {
      embedContainer.innerHTML = `
        <iframe src="${embedUrl}" 
                frameborder="0" 
                allow="autoplay; fullscreen; picture-in-picture" 
                allowfullscreen
                title="${video.title}">
        </iframe>
      `;
      modal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
  }

  /**
   * Close modal
   */
  closeModal() {
    const modal = document.getElementById('video-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = ''; // Restore scrolling
      
      // Clear iframe to stop video
      const embedContainer = document.getElementById('video-embed-container');
      if (embedContainer) {
        embedContainer.innerHTML = '';
      }
    }
    this.currentVideo = null;
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoGallery;
}

// Make available globally
window.VideoGallery = VideoGallery;

