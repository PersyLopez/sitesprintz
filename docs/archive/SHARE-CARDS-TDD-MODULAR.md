# 🎯 SHARE CARDS - MODULAR TDD IMPLEMENTATION

**Feature:** Universal Share Cards for ALL Templates  
**Approach:** TDD + Modular Architecture  
**Timeline:** 3-4 hours  
**Templates:** Starter, Pro, Premium

---

## 🏗️ MODULAR ARCHITECTURE

### Core Principle: Template-Agnostic Design

```
shareCardService.js (Universal)
  ├── extractFeatures() - Works for ANY template
  ├── generateCard() - Universal renderer
  ├── getTemplateData() - Normalizes all template types
  └── optimizeForFormat() - Format-specific logic

All templates → Same interface → Beautiful cards
```

---

## 📋 TDD IMPLEMENTATION PHASES

### PHASE 1: Core Service (TDD - 1 hour)

#### File: `tests/unit/shareCardService.test.js`

**RED → GREEN → REFACTOR for each function**

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractFeatures,
  generateShareCard,
  getTemplateData,
  normalizeTemplateData,
  calculateCardDimensions
} from '../../server/services/shareCardService.js';
import sharp from 'sharp';

describe('ShareCardService - Universal Template Support (TDD)', () => {
  
  describe('normalizeTemplateData - Template Agnostic', () => {
    it('should normalize Starter template data', () => {
      const starterTemplate = {
        subdomain: 'test-starter',
        plan: 'Starter',
        brand: { name: 'Test Business' },
        hero: { 
          title: 'Welcome',
          subtitle: 'Best business in town',
          image: 'https://example.com/hero.jpg'
        },
        settings: { allowCheckout: false },
        products: [{ name: 'Product 1' }]
      };

      const normalized = normalizeTemplateData(starterTemplate);

      expect(normalized).toHaveProperty('businessName', 'Test Business');
      expect(normalized).toHaveProperty('tagline', 'Best business in town');
      expect(normalized).toHaveProperty('heroImage');
      expect(normalized).toHaveProperty('subdomain', 'test-starter');
      expect(normalized).toHaveProperty('tier', 'Starter');
    });

    it('should normalize Pro template data', () => {
      const proTemplate = {
        subdomain: 'test-pro',
        plan: 'Pro',
        brand: { name: 'Pro Business' },
        hero: { 
          title: 'Professional',
          subtitle: 'Pro services',
          image: 'https://example.com/pro-hero.jpg'
        },
        settings: { allowCheckout: true },
        features: {
          booking: { enabled: true },
          analytics: true
        }
      };

      const normalized = normalizeTemplateData(proTemplate);

      expect(normalized.tier).toBe('Pro');
      expect(normalized.businessName).toBe('Pro Business');
      expect(normalized.hasAdvancedFeatures).toBe(true);
    });

    it('should normalize Premium template data with meta structure', () => {
      const premiumTemplate = {
        subdomain: 'test-premium',
        plan: 'Premium',
        meta: {
          businessName: 'Premium Corp',
          pageTitle: 'Premium Services',
          logo: 'https://example.com/logo.png'
        },
        // Premium templates use different structure
        hero: { 
          title: 'Premium Title',
          image: 'https://example.com/premium-hero.jpg'
        }
      };

      const normalized = normalizeTemplateData(premiumTemplate);

      expect(normalized.tier).toBe('Premium');
      expect(normalized.businessName).toBe('Premium Corp');
      expect(normalized.heroImage).toBeTruthy();
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalTemplate = {
        subdomain: 'minimal',
        brand: { name: 'Minimal' }
      };

      const normalized = normalizeTemplateData(minimalTemplate);

      expect(normalized.businessName).toBe('Minimal');
      expect(normalized.tagline).toBe('Welcome to our business'); // Default
      expect(normalized.heroImage).toBeTruthy(); // Placeholder
    });
  });

  describe('extractFeatures - Universal Feature Detection', () => {
    it('should extract features from Starter template', () => {
      const normalized = {
        tier: 'Starter',
        hasCheckout: false,
        products: [1, 2, 3],
        services: [1, 2],
        hasTestimonials: true
      };

      const features = extractFeatures(normalized);

      expect(features).toContain('3+ Products');
      expect(features).toContain('2+ Services');
      expect(features).not.toContain('Online Ordering');
    });

    it('should extract features from Pro template', () => {
      const normalized = {
        tier: 'Pro',
        hasCheckout: true,
        hasBooking: true,
        hasAnalytics: true,
        hasReviews: true,
        products: [1, 2, 3, 4, 5]
      };

      const features = extractFeatures(normalized);

      expect(features).toContain('Online Ordering');
      expect(features).toContain('Book Appointments');
      expect(features).toContain('Real-time Analytics');
      expect(features).toContain('Google Reviews');
    });

    it('should extract features from Premium template', () => {
      const normalized = {
        tier: 'Premium',
        hasAdvancedForms: true,
        hasClientPortal: true,
        hasAutomation: true
      };

      const features = extractFeatures(normalized);

      expect(features).toContain('Advanced Forms');
      expect(features).toContain('Client Portal');
      expect(features.length).toBeLessThanOrEqual(4);
    });

    it('should limit features to 4 maximum', () => {
      const normalized = {
        tier: 'Pro',
        hasCheckout: true,
        hasBooking: true,
        hasAnalytics: true,
        hasReviews: true,
        products: [1, 2, 3, 4, 5],
        services: [1, 2, 3],
        hasTestimonials: true,
        hasGallery: true
      };

      const features = extractFeatures(normalized);

      expect(features.length).toBeLessThanOrEqual(4);
    });
  });

  describe('calculateCardDimensions', () => {
    it('should return correct dimensions for social format', () => {
      const dims = calculateCardDimensions('social');
      expect(dims).toEqual({ width: 1200, height: 630 });
    });

    it('should return correct dimensions for story format', () => {
      const dims = calculateCardDimensions('story');
      expect(dims).toEqual({ width: 1080, height: 1920 });
    });

    it('should return correct dimensions for square format', () => {
      const dims = calculateCardDimensions('square');
      expect(dims).toEqual({ width: 1080, height: 1080 });
    });

    it('should default to social format for invalid input', () => {
      const dims = calculateCardDimensions('invalid');
      expect(dims).toEqual({ width: 1200, height: 630 });
    });
  });

  describe('generateShareCard - Universal Card Generation', () => {
    it('should generate card for Starter template', async () => {
      const starterData = {
        subdomain: 'test-starter',
        brand: { name: 'Starter Business' },
        hero: { subtitle: 'Simple & effective' }
      };

      const buffer = await generateShareCard(starterData, 'social');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      const metadata = await sharp(buffer).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(630);
      expect(metadata.format).toBe('png');
    });

    it('should generate card for Pro template', async () => {
      const proData = {
        subdomain: 'test-pro',
        plan: 'Pro',
        brand: { name: 'Pro Business' },
        hero: { subtitle: 'Professional services' },
        features: { booking: { enabled: true } }
      };

      const buffer = await generateShareCard(proData, 'social');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate card for Premium template', async () => {
      const premiumData = {
        subdomain: 'test-premium',
        plan: 'Premium',
        meta: { businessName: 'Premium Corp' },
        hero: { title: 'Premium Services' }
      };

      const buffer = await generateShareCard(premiumData, 'social');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle all formats', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test' }
      };

      const formats = ['social', 'story', 'square'];

      for (const format of formats) {
        const buffer = await generateShareCard(data, format);
        const metadata = await sharp(buffer).metadata();
        
        expect(buffer).toBeInstanceOf(Buffer);
        expect(metadata.format).toBe('png');
      }
    });

    it('should handle missing hero image gracefully', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test' },
        hero: { subtitle: 'Test' }
        // No hero.image
      };

      const buffer = await generateShareCard(data, 'social');

      expect(buffer).toBeInstanceOf(Buffer);
      // Should use gradient background
    });

    it('should escape HTML in business name', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test & "Company"' },
        hero: { subtitle: '<script>alert(1)</script>' }
      };

      const buffer = await generateShareCard(data, 'social');

      expect(buffer).toBeInstanceOf(Buffer);
      // Should not contain raw HTML/scripts
    });

    it('should handle long business names', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Very Long Business Name That Should Be Truncated Properly' },
        hero: { subtitle: 'Test' }
      };

      const buffer = await generateShareCard(data, 'social');

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should include QR code', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test' }
      };

      const buffer = await generateShareCard(data, 'social');

      expect(buffer).toBeInstanceOf(Buffer);
      // QR code should be embedded in image
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid template data', async () => {
      await expect(generateShareCard(null, 'social'))
        .rejects.toThrow('Invalid template data');
    });

    it('should handle image load failures', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test' },
        hero: { image: 'https://invalid-url-that-will-fail.com/image.jpg' }
      };

      const buffer = await generateShareCard(data, 'social');

      // Should fallback to gradient background
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle network timeouts', async () => {
      const data = {
        subdomain: 'test',
        brand: { name: 'Test' },
        hero: { image: 'https://httpstat.us/200?sleep=15000' } // 15s timeout
      };

      // Should timeout and use fallback
      const buffer = await generateShareCard(data, 'social');
      expect(buffer).toBeInstanceOf(Buffer);
    }, 20000);
  });
});
```

---

### PHASE 2: API Routes (TDD - 45 min)

#### File: `tests/integration/share-routes.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import shareRoutes from '../../server/routes/share.routes.js';

describe('Share Routes - Integration Tests (TDD)', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use('/share', shareRoutes);
  });

  describe('GET /share/:subdomain/card - Share Landing Page', () => {
    it('should return HTML page with Open Graph tags for Starter', async () => {
      const response = await request(app)
        .get('/share/test-starter/card')
        .expect(200)
        .expect('Content-Type', /html/);

      expect(response.text).toContain('og:title');
      expect(response.text).toContain('og:image');
      expect(response.text).toContain('twitter:card');
      expect(response.text).toContain('test-starter');
    });

    it('should return HTML page for Pro template', async () => {
      const response = await request(app)
        .get('/share/test-pro/card')
        .expect(200);

      expect(response.text).toContain('og:title');
      expect(response.text).toContain('Pro');
    });

    it('should return HTML page for Premium template', async () => {
      const response = await request(app)
        .get('/share/test-premium/card')
        .expect(200);

      expect(response.text).toContain('og:title');
      expect(response.text).toContain('Premium');
    });

    it('should return 404 for non-existent site', async () => {
      await request(app)
        .get('/share/non-existent/card')
        .expect(404);
    });

    it('should handle special characters in subdomain', async () => {
      await request(app)
        .get('/share/test-<script>/card')
        .expect(400); // Invalid subdomain
    });
  });

  describe('GET /share/:subdomain/:format.png - Card Image', () => {
    it('should generate PNG for Starter template', async () => {
      const response = await request(app)
        .get('/share/test-starter/social.png')
        .expect(200)
        .expect('Content-Type', 'image/png')
        .expect('Cache-Control', /public/);

      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should generate PNG for Pro template', async () => {
      const response = await request(app)
        .get('/share/test-pro/social.png')
        .expect(200)
        .expect('Content-Type', 'image/png');

      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('should generate PNG for Premium template', async () => {
      const response = await request(app)
        .get('/share/test-premium/social.png')
        .expect(200)
        .expect('Content-Type', 'image/png');

      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('should support all formats', async () => {
      const formats = ['social', 'story', 'square'];

      for (const format of formats) {
        await request(app)
          .get(`/share/test-starter/${format}.png`)
          .expect(200)
          .expect('Content-Type', 'image/png');
      }
    });

    it('should return 400 for invalid format', async () => {
      await request(app)
        .get('/share/test-starter/invalid.png')
        .expect(400);
    });

    it('should cache generated images', async () => {
      const response1 = await request(app)
        .get('/share/test-starter/social.png')
        .expect(200);

      const response2 = await request(app)
        .get('/share/test-starter/social.png')
        .expect(200);

      // Should be same image (from cache)
      expect(response1.body.length).toBe(response2.body.length);
    });

    it('should apply rate limiting', async () => {
      // Make 11 requests (limit is 10/hour)
      for (let i = 0; i < 11; i++) {
        const response = await request(app)
          .get(`/share/test-starter/social.png?v=${i}`);

        if (i < 10) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(429); // Too many requests
        }
      }
    });
  });

  describe('Analytics Tracking', () => {
    it('should track card generation events', async () => {
      const analyticsLog = [];
      
      // Mock analytics
      vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
        if (url.includes('/api/analytics/share-event')) {
          analyticsLog.push(JSON.parse(options.body));
        }
        return { ok: true };
      });

      await request(app)
        .get('/share/test-starter/social.png')
        .expect(200);

      expect(analyticsLog.length).toBeGreaterThan(0);
      expect(analyticsLog[0]).toHaveProperty('subdomain', 'test-starter');
      expect(analyticsLog[0]).toHaveProperty('action', 'card-generated');
      expect(analyticsLog[0]).toHaveProperty('format', 'social');
    });
  });
});
```

---

### PHASE 3: Frontend Component (TDD - 1 hour)

#### File: `tests/unit/ShareModal.test.jsx`

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShareModal from '../../src/components/dashboard/ShareModal';

describe('ShareModal - Universal Template Support (TDD)', () => {
  let mockSite;

  beforeEach(() => {
    mockSite = {
      subdomain: 'test-site',
      site_data: {
        brand: { name: 'Test Business' }
      }
    };

    // Mock fetch
    global.fetch = vi.fn();
    
    // Mock window methods
    global.window.open = vi.fn();
    global.navigator.clipboard = {
      writeText: vi.fn().mockResolvedValue()
    };
  });

  describe('Rendering', () => {
    it('should render share modal with all options', () => {
      render(<ShareModal site={mockSite} onClose={() => {}} />);

      expect(screen.getByText(/Share Your Site/i)).toBeInTheDocument();
      expect(screen.getByText(/Facebook/i)).toBeInTheDocument();
      expect(screen.getByText(/Twitter/i)).toBeInTheDocument();
      expect(screen.getByText(/LinkedIn/i)).toBeInTheDocument();
      expect(screen.getByText(/Download for print/i)).toBeInTheDocument();
    });

    it('should render preview image', () => {
      render(<ShareModal site={mockSite} onClose={() => {}} />);

      const previewImg = screen.getByAltText(/Share preview/i);
      expect(previewImg).toHaveAttribute('src', '/share/test-site/social.png');
    });

    it('should work with Starter template data', () => {
      const starterSite = {
        subdomain: 'starter',
        site_data: {
          brand: { name: 'Starter Biz' },
          plan: 'Starter'
        }
      };

      render(<ShareModal site={starterSite} onClose={() => {}} />);
      expect(screen.getByText(/Share Your Site/i)).toBeInTheDocument();
    });

    it('should work with Pro template data', () => {
      const proSite = {
        subdomain: 'pro',
        site_data: {
          brand: { name: 'Pro Biz' },
          plan: 'Pro',
          features: { booking: { enabled: true } }
        }
      };

      render(<ShareModal site={proSite} onClose={() => {}} />);
      expect(screen.getByText(/Share Your Site/i)).toBeInTheDocument();
    });

    it('should work with Premium template data', () => {
      const premiumSite = {
        subdomain: 'premium',
        site_data: {
          meta: { businessName: 'Premium Biz' },
          plan: 'Premium'
        }
      };

      render(<ShareModal site={premiumSite} onClose={() => {}} />);
      expect(screen.getByText(/Share Your Site/i)).toBeInTheDocument();
    });
  });

  describe('Social Sharing', () => {
    it('should open Facebook share dialog', () => {
      render(<ShareModal site={mockSite} onClose={() => {}} />);

      const facebookBtn = screen.getByText(/Facebook/i);
      fireEvent.click(facebookBtn);

      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('facebook.com/sharer'),
        '_blank',
        expect.any(String)
      );
    });

    it('should open Twitter share dialog', () => {
      render(<ShareModal site={mockSite} onClose={() => {}} />);

      const twitterBtn = screen.getByText(/Twitter/i);
      fireEvent.click(twitterBtn);

      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('twitter.com/intent/tweet'),
        '_blank',
        expect.any(String)
      );
    });

    it('should open LinkedIn share dialog', () => {
      render(<ShareModal site={mockSite} onClose={() => {}} />);

      const linkedinBtn = screen.getByText(/LinkedIn/i);
      fireEvent.click(linkedinBtn);

      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('linkedin.com/sharing'),
        '_blank',
        expect.any(String)
      );
    });
  });

  describe('Download Functionality', () => {
    it('should download social format', async () => {
      const mockBlob = new Blob(['fake image'], { type: 'image/png' });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob
      });

      render(<ShareModal site={mockSite} onClose={() => {}} />);

      const downloadBtn = screen.getAllByRole('button').find(
        btn => btn.textContent.includes('Social Media')
      );
      
      fireEvent.click(downloadBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/share/test-site/social.png'
        );
      });
    });

    it('should download story format', async () => {
      const mockBlob = new Blob(['fake image'], { type: 'image/png' });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob
      });

      render(<ShareModal site={mockSite} onClose={() => {}} />);

      const downloadBtn = screen.getAllByRole('button').find(
        btn => btn.textContent.includes('Story')
      );
      
      fireEvent.click(downloadBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/share/test-site/story.png'
        );
      });
    });

    it('should handle download errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      global.alert = vi.fn();

      render(<ShareModal site={mockSite} onClose={() => {}} />);

      const downloadBtn = screen.getAllByRole('button').find(
        btn => btn.textContent.includes('Social Media')
      );
      
      fireEvent.click(downloadBtn);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining('Failed to download')
        );
      });
    });
  });

  describe('Copy Link', () => {
    it('should copy share link to clipboard', async () => {
      render(<ShareModal site={mockSite} onClose={() => {}} />);

      const copyBtn = screen.getByText(/Copy/i);
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('/share/test-site/card')
        );
      });

      expect(screen.getByText(/Copied!/i)).toBeInTheDocument();
    });
  });

  describe('Close Modal', () => {
    it('should call onClose when close button clicked', () => {
      const onClose = vi.fn();
      render(<ShareModal site={mockSite} onClose={onClose} />);

      const closeBtn = screen.getByText('✕');
      fireEvent.click(closeBtn);

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay clicked', () => {
      const onClose = vi.fn();
      render(<ShareModal site={mockSite} onClose={onClose} />);

      const overlay = screen.getByRole('dialog').parentElement;
      fireEvent.click(overlay);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
```

---

## 🎯 IMPLEMENTATION CHECKLIST

### Tests First (RED):
- [ ] Write `shareCardService.test.js` (all tests fail) ✅
- [ ] Write `share-routes.test.js` (all tests fail) ✅
- [ ] Write `ShareModal.test.jsx` (all tests fail) ✅

### Implementation (GREEN):
- [ ] Implement `shareCardService.js` (make tests pass)
- [ ] Implement `share.routes.js` (make tests pass)
- [ ] Implement `ShareModal.jsx` (make tests pass)

### Refactor:
- [ ] Clean up code
- [ ] Add comments
- [ ] Optimize performance
- [ ] All tests still passing ✅

---

## 🔑 KEY MODULARITY FEATURES

### 1. Template Normalization Layer
```javascript
// Handles ANY template structure
normalizeTemplateData(rawTemplate) {
  // Starter: brand.name
  // Pro: brand.name
  // Premium: meta.businessName
  
  return {
    businessName: /* extract from any structure */,
    tagline: /* extract from any structure */,
    heroImage: /* extract from any structure */,
    tier: /* Starter/Pro/Premium */,
    features: /* extracted features */
  };
}
```

### 2. Feature Detection System
```javascript
// Auto-detects features from ANY template
extractFeatures(normalizedData) {
  const features = [];
  
  // Universal checks
  if (normalizedData.hasCheckout) features.push('Online Ordering');
  if (normalizedData.hasBooking) features.push('Book Appointments');
  if (normalizedData.products) features.push(`${count}+ Products`);
  // ... etc
  
  return features.slice(0, 4); // Top 4
}
```

### 3. Format Configuration
```javascript
// Easy to add new formats
const FORMATS = {
  social: { width: 1200, height: 630, name: 'Social Media' },
  story: { width: 1080, height: 1920, name: 'Story' },
  square: { width: 1080, height: 1080, name: 'Square' },
  // Future: 'print', 'banner', 'thumbnail'
};
```

---

## ✅ QUALITY ASSURANCE

### Test Coverage Goals:
- Unit tests: >90% coverage
- Integration tests: All endpoints
- Component tests: All user interactions
- Error cases: All handled

### What We're Testing:
✅ Works with Starter templates  
✅ Works with Pro templates  
✅ Works with Premium templates  
✅ Handles missing data gracefully  
✅ Escapes HTML/scripts  
✅ Generates correct dimensions  
✅ Caches efficiently  
✅ Rate limits properly  
✅ Tracks analytics  
✅ Mobile-friendly  

---

**Ready to start with Phase 1 (RED phase - writing failing tests)?** 🚀

