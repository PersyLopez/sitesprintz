/**
 * Pro Payments Module
 * Modular payment system for all Pro templates
 * Handles Stripe checkout with dynamic pricing
 * 
 * Usage:
 *   <script src="/modules/pro-payments.js"></script>
 *   <button onclick="ProPayments.checkout(0)">Buy Now</button>
 */

const ProPayments = {
  siteId: null,
  siteData: null,
  
  /**
   * Initialize the payment system
   * @param {string} siteId - The site identifier
   * @param {object} siteData - The site configuration data
   */
  init(siteId, siteData) {
    this.siteId = siteId;
    this.siteData = siteData;
    
    // Add CSS if not already loaded
    if (!document.getElementById('pro-payments-styles')) {
      const link = document.createElement('link');
      link.id = 'pro-payments-styles';
      link.rel = 'stylesheet';
      link.href = '/modules/pro-payments.css';
      document.head.appendChild(link);
    }
    
    console.log('ProPayments initialized for site:', siteId);
  },
  
  /**
   * Start checkout for a product
   * @param {number} productIndex - Index of product in siteData.products array
   * @param {number} quantity - Quantity to purchase (default: 1)
   */
  async checkout(productIndex, quantity = 1) {
    try {
      const product = this.siteData.products[productIndex];
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Show loading state
      this.showLoading('Processing...');
      
      // Create checkout session
      const response = await fetch('/api/payments/checkout-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          siteId: this.siteId,
          productIndex: productIndex,
          quantity: quantity
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }
      
      const data = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
      
    } catch (error) {
      console.error('Checkout error:', error);
      this.hideLoading();
      this.showError(error.message);
    }
  },
  
  /**
   * Quick buy button - shows product modal then redirects to checkout
   * @param {number} productIndex - Index of product
   */
  quickBuy(productIndex) {
    const product = this.siteData.products[productIndex];
    
    if (!product) {
      this.showError('Product not found');
      return;
    }
    
    // Show confirmation modal
    const confirmed = confirm(
      `${product.name}\n$${product.price.toFixed(2)}\n\n` +
      `${product.description || ''}\n\n` +
      `Proceed to checkout?`
    );
    
    if (confirmed) {
      this.checkout(productIndex);
    }
  },
  
  /**
   * Render a "Buy Now" button for a product
   * @param {number} productIndex - Index of product
   * @param {string} buttonText - Button text (default: "Buy Now")
   * @param {string} className - Additional CSS classes
   * @returns {string} HTML for button
   */
  renderBuyButton(productIndex, buttonText = 'Buy Now', className = '') {
    const product = this.siteData.products[productIndex];
    
    if (!product || product.available === false) {
      return `<button class="buy-button disabled ${className}" disabled>Unavailable</button>`;
    }
    
    return `
      <button 
        class="buy-button ${className}" 
        onclick="ProPayments.checkout(${productIndex})"
        data-product-index="${productIndex}">
        ${buttonText}
      </button>
    `;
  },
  
  /**
   * Render complete product card with buy button
   * @param {number} productIndex - Index of product
   * @returns {string} HTML for product card
   */
  renderProductCard(productIndex) {
    const product = this.siteData.products[productIndex];
    
    if (!product) return '';
    
    return `
      <div class="pro-product-card" data-product-index="${productIndex}">
        ${product.image ? `
          <div class="product-image">
            <img src="${product.image}" alt="${product.name}">
          </div>
        ` : ''}
        
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          
          ${product.description ? `
            <p class="product-description">${product.description}</p>
          ` : ''}
          
          <div class="product-footer">
            <span class="product-price">$${product.price.toFixed(2)}</span>
            ${this.renderBuyButton(productIndex)}
          </div>
        </div>
      </div>
    `;
  },
  
  /**
   * Render all products as cards
   * @param {string} containerId - ID of container element
   * @param {string} category - Optional category filter
   */
  renderProducts(containerId, category = null) {
    const container = document.getElementById(containerId);
    
    if (!container) {
      console.error('Container not found:', containerId);
      return;
    }
    
    let products = this.siteData.products || [];
    
    // Filter by category if specified
    if (category) {
      products = products.filter(p => p.category === category);
    }
    
    if (products.length === 0) {
      container.innerHTML = '<p class="no-products">No products available</p>';
      return;
    }
    
    const html = products.map((product, index) => {
      // Find original index
      const originalIndex = this.siteData.products.indexOf(product);
      return this.renderProductCard(originalIndex);
    }).join('');
    
    container.innerHTML = html;
  },
  
  /**
   * Handle order success (call this on success page)
   * @param {string} sessionId - Stripe session ID from URL
   */
  async handleOrderSuccess(sessionId) {
    try {
      // You can verify the session with your backend if needed
      this.showSuccess('Order completed successfully! Thank you for your purchase.');
      
      // Optional: Track conversion
      if (window.gtag) {
        gtag('event', 'purchase', {
          transaction_id: sessionId,
          value: 0, // You'd get this from the session
          currency: 'USD'
        });
      }
      
    } catch (error) {
      console.error('Order success handler error:', error);
    }
  },
  
  /**
   * Handle order cancellation
   */
  handleOrderCancel() {
    this.showNotification('Order cancelled. You can try again anytime.', 'info');
  },
  
  /**
   * Check for order status in URL and handle accordingly
   */
  checkOrderStatus() {
    const params = new URLSearchParams(window.location.search);
    const orderStatus = params.get('order');
    const sessionId = params.get('session_id');
    
    if (orderStatus === 'success' && sessionId) {
      this.handleOrderSuccess(sessionId);
    } else if (orderStatus === 'cancelled') {
      this.handleOrderCancel();
    }
  },
  
  // UI Helper Methods
  
  showLoading(message = 'Loading...') {
    const loader = document.createElement('div');
    loader.id = 'pro-payment-loader';
    loader.className = 'pro-payment-overlay';
    loader.innerHTML = `
      <div class="pro-payment-modal">
        <div class="loader-spinner"></div>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(loader);
  },
  
  hideLoading() {
    const loader = document.getElementById('pro-payment-loader');
    if (loader) {
      loader.remove();
    }
  },
  
  showError(message) {
    this.showNotification(message, 'error');
  },
  
  showSuccess(message) {
    this.showNotification(message, 'success');
  },
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `pro-notification pro-notification-${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()" class="close-btn">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }
};

// Auto-initialize on DOMContentLoaded if siteData exists
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.siteData !== 'undefined') {
    const siteId = window.siteData.siteId || window.location.pathname.split('/').filter(Boolean)[1];
    ProPayments.init(siteId, window.siteData);
    
    // Check for order status in URL
    ProPayments.checkOrderStatus();
  }
});

// Make available globally
window.ProPayments = ProPayments;

