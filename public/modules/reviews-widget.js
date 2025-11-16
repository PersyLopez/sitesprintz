/**
 * Google Reviews Widget (Client-Side)
 * Displays Google Reviews on Pro sites
 * 
 * Features:
 * - Star rating display
 * - Review cards with author, rating, text
 * - Relative time formatting
 * - Text truncation with "Read more"
 * - Responsive design
 * - Error handling
 */

class ReviewsWidget {
  constructor(config = {}) {
    this.config = {
      placeId: config.placeId || '',
      containerId: config.containerId || 'reviews-container',
      maxReviews: config.maxReviews || 5,
      maxLength: config.maxLength || 200,
      showOverallRating: config.showOverallRating !== false // default true
    };

    this.container = null;
    this.reviews = null;
  }

  /**
   * Initialize and load reviews
   */
  async init() {
    if (!this.config.placeId) {
      console.warn('Reviews widget: placeId is required');
      return;
    }

    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.error(`Reviews container ${this.config.containerId} not found`);
      return;
    }

    try {
      await this.loadReviews();
      this.render();
    } catch (error) {
      console.error('Failed to load reviews:', error);
      this.renderError();
    }
  }

  /**
   * Load reviews from backend API
   */
  async loadReviews() {
    const response = await fetch(`/api/reviews/${this.config.placeId}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch reviews');
    }

    this.reviews = await response.json();
  }

  /**
   * Render reviews
   */
  render() {
    if (!this.reviews) {
      this.renderEmpty();
      return;
    }

    const { reviews, rating, user_ratings_total } = this.reviews;
    const displayReviews = reviews.slice(0, this.config.maxReviews);

    let html = '<div class="reviews-widget">';

    // Overall rating
    if (this.config.showOverallRating && rating > 0) {
      html += `
        <div class="reviews-header">
          <div class="overall-rating">
            <div class="rating-stars">${this.renderStars(rating)}</div>
            <div class="rating-text">
              <span class="rating-number">${rating.toFixed(1)}</span>
              <span class="rating-count">(${user_ratings_total} reviews)</span>
            </div>
          </div>
        </div>
      `;
    }

    // Individual reviews
    if (displayReviews.length > 0) {
      html += '<div class="reviews-list">';
      displayReviews.forEach(review => {
        html += this.renderReviewCard(review);
      });
      html += '</div>';
    } else if (rating === 0) {
      // Only show empty state if there's truly no rating
      html += '<p class="no-reviews-text">No reviews yet</p>';
    }

    html += '</div>';

    this.container.innerHTML = html;
  }

  /**
   * Render a single review card
   */
  renderReviewCard(review) {
    const { author_name, rating, text, time } = review;
    const truncatedText = this.truncateText(text);
    const timeAgo = this.formatTimeAgo(time);

    return `
      <div class="review-card">
        <div class="review-header">
          <div class="review-author">${this.escapeHtml(author_name)}</div>
          <div class="review-rating">${this.renderStars(rating)}</div>
        </div>
        <div class="review-text">${this.escapeHtml(truncatedText)}</div>
        <div class="review-time">${timeAgo}</div>
      </div>
    `;
  }

  /**
   * Render star ratings
   */
  renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let html = '';

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        html += '<span class="star star-full">★</span>';
      } else if (i === fullStars && hasHalfStar) {
        html += '<span class="star star-half">★</span>';
      } else {
        html += '<span class="star star-empty">☆</span>';
      }
    }

    return html;
  }

  /**
   * Truncate text with "Read more" link
   */
  truncateText(text) {
    if (text.length <= this.config.maxLength) {
      return text;
    }

    return text.substring(0, this.config.maxLength) + '... Read more';
  }

  /**
   * Format Unix timestamp to relative time
   */
  formatTimeAgo(timestamp) {
    const now = Date.now() / 1000;
    const diffSeconds = now - timestamp;

    if (diffSeconds < 60) {
      return 'just now';
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    }

    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Render empty state
   */
  renderEmpty() {
    this.container.innerHTML = `
      <div class="reviews-widget reviews-empty">
        <p>No reviews yet</p>
      </div>
    `;
  }

  /**
   * Render error state
   */
  renderError() {
    this.container.innerHTML = `
      <div class="reviews-widget reviews-error">
        <p>Unable to load reviews</p>
      </div>
    `;
  }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReviewsWidget;
}

// Export as default for ES modules
if (typeof exports !== 'undefined') {
  exports.default = ReviewsWidget;
}

// Global export for browser
if (typeof window !== 'undefined') {
  window.ReviewsWidget = ReviewsWidget;
}

