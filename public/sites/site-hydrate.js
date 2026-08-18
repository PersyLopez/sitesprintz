/**
 * Minimal Site Hydration Script
 * 
 * Provides client-side interactivity for SSR-rendered published sites:
 * - Contact form submission
 * - Booking widget interaction
 * - Smooth scroll behavior
 * - Mobile menu toggle
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize contact forms
  initializeContactForms();
  
  // Initialize smooth scrolling
  initializeSmoothScroll();
  
  // Initialize mobile menu
  initializeMobileMenu();
  
  // Initialize booking widgets
  initializeBooking();

  initializeReviews();
});

/**
 * Initialize contact form handling
 */
function initializeContactForms() {
  const contactForms = document.querySelectorAll('form[data-type="contact"]');

  contactForms.forEach(form => {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();

      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      if (!data.subdomain) {
        const parts = window.location.pathname.split('/').filter(Boolean);
        const index = parts.findIndex((part) => part === 'sites' || part === 'view');
        if (index >= 0 && parts[index + 1]) data.subdomain = parts[index + 1];
      }

      try {
        const response = await fetch('/api/submissions/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        const payload = await response.json().catch(() => ({}));

        if (response.ok) {
          showMessage(form, payload.message || 'Thank you! Your message has been sent.', 'success');
          form.reset();
        } else {
          showMessage(form, payload.error || payload.message || 'Failed to send message. Please try again.', 'error');
        }
      } catch (error) {
        console.error('Contact form error:', error);
        showMessage(form, 'An error occurred. Please try again later.', 'error');
      }
    });
  });
}

/**
 * Show form message
 */
function showMessage(form, message, type = 'info') {
  // Remove existing message
  const existingMsg = form.querySelector('[data-message]');
  if (existingMsg) existingMsg.remove();
  
  // Create message element
  const msgEl = document.createElement('div');
  msgEl.setAttribute('data-message', type);
  msgEl.className = `message message-${type}`;
  msgEl.textContent = message;
  msgEl.style.cssText = `
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 8px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    animation: slideIn 0.3s ease-out;
  `;
  
  form.insertBefore(msgEl, form.firstChild);
  
  // Auto-remove after 5 seconds
  setTimeout(() => msgEl.remove(), 5000);
}

/**
 * Initialize smooth scrolling for anchor links
 */
function initializeSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      e.preventDefault();
      
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/**
 * Initialize mobile menu toggle
 */
function initializeMobileMenu() {
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function() {
      mobileMenu.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', 
        menuToggle.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
      );
    });
    
    // Close menu when link clicked
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function() {
        mobileMenu.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

/**
 * Initialize booking widgets
 */
function initializeBooking() {
  // Native booking is hydrated by the React published-site viewer.
  // SSR crawler HTML keeps the Book Now CTA pointing at #booking / contact.
}

function initializeReviews() {
  const el = document.querySelector('[data-testid="reviews-widget"]');
  const placeId = el && el.getAttribute('data-place-id');
  if (!el || !placeId) return;

  fetch(`/api/reviews/${encodeURIComponent(placeId)}`, { credentials: 'include' })
    .then((response) => (response.ok ? response.json() : null))
    .then((payload) => {
      if (!payload || !el) return;
      const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
      const rating = Number(payload.rating) || 0;
      const total = payload.user_ratings_total || reviews.length;
      const mount = el.querySelector('[data-google-reviews-live]') || el;
      if (rating) {
        const header = document.createElement('p');
        header.setAttribute('data-testid', 'google-reviews-rating');
        header.textContent = `${rating.toFixed(1)} · ${total} Google reviews`;
        mount.appendChild(header);
      }
      reviews.slice(0, 5).forEach((review) => {
        const block = document.createElement('blockquote');
        const p = document.createElement('p');
        p.textContent = review.text || review.quote || '';
        block.appendChild(p);
        if (review.author_name || review.author) {
          const footer = document.createElement('footer');
          footer.textContent = `— ${review.author_name || review.author}`;
          block.appendChild(footer);
        }
        mount.appendChild(block);
      });
    })
    .catch(() => {
      // Fail closed: keep any static quotes already in the section.
    });
}

/**
 * Utility: Request animation frame throttle
 */
function throttle(func, limit = 100) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Utility: Detect if element is in viewport
 */
function isInViewport(el) {
  const rect = el.getBoundingClientRect();
  return (
    rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
    rect.bottom > 0
  );
}

/**
 * Initialize scroll reveal animations
 */
function initializeScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  
  const revealOnScroll = throttle(function() {
    revealElements.forEach(el => {
      if (isInViewport(el)) {
        el.classList.add('is-visible');
      }
    });
  });
  
  window.addEventListener('scroll', revealOnScroll);
  revealOnScroll(); // Initial check
}

// Add slide-in animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);
