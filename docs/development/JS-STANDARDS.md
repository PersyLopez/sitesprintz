# JavaScript Standards for Starter Templates

## Overview

This document defines the required and optional JavaScript functionality for all Starter tier templates. These standards ensure consistent user experience, accessibility, and performance across all templates.

## Required JavaScript Functions

All starter templates MUST implement these core functions:

### 1. Mobile Navigation Toggle

**Purpose**: Enable/disable mobile menu

**Requirements:**
- Hamburger icon toggles menu open/closed
- Menu closes when clicking outside
- Menu closes when selecting a nav item
- Smooth animations for open/close
- Body scroll lock when menu is open
- Keyboard accessible (Enter, Escape keys)

**Implementation Example:**
```javascript
const nav = document.querySelector('.nav');
const hamburger = document.querySelector('.hamburger');

function toggleNav() {
  nav.classList.toggle('active');
  hamburger.classList.toggle('active');
  document.body.classList.toggle('nav-open');
}

hamburger.addEventListener('click', toggleNav);

// Close on outside click
document.addEventListener('click', (e) => {
  if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
    nav.classList.remove('active');
  }
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && nav.classList.contains('active')) {
    toggleNav();
  }
});
```

### 2. Smooth Scroll Navigation

**Purpose**: Smooth scroll to anchor sections

**Requirements:**
- Click nav links to smooth scroll to sections
- Auto-adjust for fixed header height
- Update active nav item based on scroll position
- Works on both desktop and mobile

**Implementation Example:**
```javascript
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const offset = 80; // Fixed header height
      const targetPosition = target.offsetTop - offset;
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  });
});
```

### 3. Contact Form Validation

**Purpose**: Validate contact form before submission

**Requirements:**
- Required field validation (name, email, message)
- Email format validation
- Phone format validation (if applicable)
- Show error messages inline
- Prevent submission if invalid
- Clear errors on input change
- Accessible error messages (ARIA)

**Implementation Example:**
```javascript
const contactForm = document.querySelector('#contact-form');

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateForm(form) {
  const errors = [];
  const name = form.querySelector('[name="name"]');
  const email = form.querySelector('[name="email"]');
  const message = form.querySelector('[name="message"]');
  
  // Clear previous errors
  form.querySelectorAll('.error').forEach(el => el.remove());
  
  // Validate name
  if (!name.value.trim()) {
    errors.push({field: name, message: 'Name is required'});
  }
  
  // Validate email
  if (!email.value.trim()) {
    errors.push({field: email, message: 'Email is required'});
  } else if (!validateEmail(email.value)) {
    errors.push({field: email, message: 'Please enter a valid email'});
  }
  
  // Validate message
  if (!message.value.trim()) {
    errors.push({field: message, message: 'Message is required'});
  }
  
  // Show errors
  errors.forEach(error => {
    const errorEl = document.createElement('span');
    errorEl.className = 'error';
    errorEl.textContent = error.message;
    errorEl.setAttribute('role', 'alert');
    error.field.parentNode.appendChild(errorEl);
    error.field.classList.add('has-error');
  });
  
  return errors.length === 0;
}

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!validateForm(contactForm)) {
    return;
  }
  
  // Submit form logic here
});
```

### 4. Order Form Validation & Submission

**Purpose**: Handle order/booking submissions

**Requirements:**
- Validate customer information (name, email, phone)
- Validate item selections
- Handle special requests/notes
- Show loading state during submission
- Display success/error messages
- Reset form after successful submission
- Email confirmation to customer and owner

**Implementation Example:**
```javascript
const orderForm = document.querySelector('#order-form');

async function submitOrder(formData) {
  try {
    const response = await fetch('/api/orders/submit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(formData)
    });
    
    if (!response.ok) throw new Error('Submission failed');
    
    const result = await response.json();
    return {success: true, data: result};
  } catch (error) {
    return {success: false, error: error.message};
  }
}

orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!validateForm(orderForm)) {
    return;
  }
  
  // Show loading
  const submitBtn = orderForm.querySelector('[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  
  // Collect form data
  const formData = new FormData(orderForm);
  const orderData = {
    customerName: formData.get('name'),
    customerEmail: formData.get('email'),
    customerPhone: formData.get('phone'),
    items: getSelectedItems(),
    specialRequests: formData.get('notes')
  };
  
  // Submit
  const result = await submitOrder(orderData);
  
  if (result.success) {
    showSuccessMessage('Order submitted! Check your email for confirmation.');
    orderForm.reset();
  } else {
    showErrorMessage('Failed to submit order. Please try again.');
  }
  
  // Reset button
  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit Order';
});
```

### 5. Image Lazy Loading

**Purpose**: Load images only when needed

**Requirements:**
- Images below the fold should lazy load
- Show placeholder while loading
- Handle failed image loads with fallback
- Works across all browsers

**Implementation Example:**
```javascript
// Use native lazy loading where supported
document.querySelectorAll('img[data-src]').forEach(img => {
  img.loading = 'lazy';
  
  // Fallback for older browsers
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    });
    observer.observe(img);
  } else {
    // Load immediately if no support
    img.src = img.dataset.src;
  }
  
  // Handle errors
  img.addEventListener('error', () => {
    img.src = 'assets/placeholder.svg';
  });
});
```

### 6. Accessibility Features

**Purpose**: Ensure site is accessible to all users

**Requirements:**
- ARIA labels on interactive elements
- Keyboard navigation support (Tab, Enter, Escape)
- Focus management for modals/menus
- Skip to main content link
- Proper heading hierarchy
- Alt text on all images
- Form field labels properly associated

**Implementation Example:**
```javascript
// Skip to main content
const skipLink = document.querySelector('.skip-link');
skipLink.addEventListener('click', (e) => {
  e.preventDefault();
  const main = document.querySelector('main');
  main.tabIndex = -1;
  main.focus();
});

// Trap focus in modal
function trapFocus(element) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  });
}

// Announce dynamic content changes
function announce(message, priority = 'polite') {
  const announcer = document.createElement('div');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.className = 'sr-only';
  announcer.textContent = message;
  document.body.appendChild(announcer);
  setTimeout(() => announcer.remove(), 1000);
}
```

## Optional JavaScript Functions

These functions enhance the experience but are not required:

### 7. Testimonial Carousel

**When to use**: Templates with 3+ testimonials

**Requirements:**
- Auto-rotate every 5-8 seconds
- Manual navigation (prev/next buttons)
- Pause on hover
- Swipe support on mobile
- Keyboard accessible
- Indicate current slide

### 8. FAQ Accordion

**When to use**: Templates with FAQ section

**Requirements:**
- Expand/collapse FAQ items
- Only one open at a time (optional)
- Smooth height transitions
- Keyboard accessible
- ARIA expanded states

### 9. Stats Counter Animation

**When to use**: Templates with stats section

**Requirements:**
- Animate numbers counting up
- Trigger when scrolled into view
- Only run once per page load
- Smooth easing function

### 10. Gallery Lightbox

**When to use**: Templates with image galleries

**Requirements:**
- Click image to expand fullscreen
- Navigate between images (prev/next)
- Close with X button or Escape key
- Swipe support on mobile
- Keyboard navigation
- Focus trap when open

### 11. Back to Top Button

**When to use**: Long single-page templates

**Requirements:**
- Show after scrolling down
- Smooth scroll to top
- Keyboard accessible
- Appropriate z-index

## Performance Standards

### Bundle Size
- Keep JavaScript under 50KB (minified)
- Use code splitting for optional features
- Load non-critical JS asynchronously

### Load Time
- DOMContentLoaded < 1.5 seconds
- First Contentful Paint < 2 seconds
- Time to Interactive < 3 seconds

### Best Practices
- Minimize DOM manipulation
- Debounce scroll/resize handlers
- Use event delegation where possible
- Clean up event listeners on removal
- Avoid memory leaks

## Browser Support

### Minimum Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari iOS 14+
- Chrome Android 90+

### Progressive Enhancement
- Core functionality works without JavaScript
- Enhanced features degrade gracefully
- Polyfills for critical features in older browsers

## Testing Requirements

### Manual Testing
- [ ] Test on desktop (Chrome, Firefox, Safari)
- [ ] Test on mobile (iOS Safari, Chrome Android)
- [ ] Test with keyboard only
- [ ] Test with screen reader (VoiceOver, NVDA)
- [ ] Test slow network (throttle to 3G)
- [ ] Test with JavaScript disabled (graceful degradation)

### Automated Testing (Future)
- Unit tests for validation functions
- Integration tests for form submissions
- Accessibility audits with axe-core
- Performance benchmarks with Lighthouse

## Code Style

### General Guidelines
- Use modern ES6+ syntax
- Write semantic, self-documenting code
- Add comments for complex logic
- Use meaningful variable names
- Follow consistent formatting

### Example:
```javascript
// ✅ Good
const isEmailValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ❌ Bad
function v(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}
```

## Error Handling

### User-Facing Errors
- Show clear, actionable error messages
- Guide users to fix the problem
- Don't expose technical details
- Log errors for debugging

### Example:
```javascript
try {
  await submitOrder(data);
  showMessage('Order submitted successfully!');
} catch (error) {
  console.error('Order submission error:', error);
  showMessage('Unable to submit order. Please try again or contact us directly.');
}
```

## Security Considerations

### Client-Side
- Never store sensitive data in localStorage
- Sanitize user input before display
- Use HTTPS for all API calls
- Validate all form data client-side AND server-side
- Don't trust client-side validation alone

### Example:
```javascript
// Sanitize before displaying user content
function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

## Future Enhancements

As the platform evolves, consider:

1. **Progressive Web App (PWA)**: Service workers, offline support
2. **Real-time Updates**: WebSockets for live order updates (Premium tier)
3. **Advanced Analytics**: User behavior tracking, heatmaps
4. **AI Integration**: Chatbots, smart form filling
5. **Internationalization**: Multi-language support

## Version History

- **v1.0** (2025-11-03): Initial JavaScript standards for Starter templates

