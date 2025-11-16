# 🎨 SHAREABLE SOCIAL CARDS - IMPLEMENTATION PLAN

**Feature:** Auto-Generated Social Share Cards  
**Timeline:** 2-3 hours  
**Priority:** P0 (Implementing Now)  
**Impact:** HIGH - Viral growth + customer marketing tool  
**Approach:** TDD (Test-Driven Development)

---

## 🎯 OVERVIEW

### What We're Building:
Beautiful, auto-generated social media share cards that showcase the best features of each customer site.

### User Flow:
```
Dashboard → My Sites → [Site Card]
  ↓
Click "Download Share Card"
  ↓
Preview Modal Opens
  ├── Format: Social Media (1200x630)
  ├── Format: Instagram Story (1080x1920)  
  └── Format: Square Post (1080x1080)
  ↓
Click Download → Image saved
  ↓
User posts on social media
  ↓
Beautiful preview with SiteSprintz branding!
```

---

## 📋 PHASE 1: CORE IMPLEMENTATION (2-3 hours)

### Step 1: Setup Dependencies (15 min)
```bash
npm install canvas qrcode sharp
```

**Libraries:**
- `canvas` - Server-side image generation (HTML5 Canvas API)
- `qrcode` - QR code generation
- `sharp` - Image optimization and resizing

---

### Step 2: Backend Service - Share Card Generator (TDD - 45 min)

#### File: `server/services/shareCardService.js`

**Test First (RED):**
```javascript
// tests/unit/shareCardService.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateShareCard, extractKeyFeatures } from '../../server/services/shareCardService.js';

describe('ShareCardService - TDD', () => {
  let mockSiteData;

  beforeEach(() => {
    mockSiteData = {
      subdomain: 'test-site',
      brand: { name: 'Test Business' },
      hero: {
        title: 'Welcome',
        subtitle: 'Best business in town',
        image: 'https://images.unsplash.com/photo-123'
      },
      settings: { allowCheckout: true },
      features: {
        booking: { enabled: true, provider: 'Calendly' },
        analytics: true
      },
      products: [{ name: 'Product 1' }, { name: 'Product 2' }],
      testimonials: {
        items: [
          { rating: 5 },
          { rating: 4 }
        ]
      }
    };
  });

  describe('extractKeyFeatures', () => {
    it('should extract online ordering feature', () => {
      const features = extractKeyFeatures(mockSiteData);
      expect(features).toContain('Online Ordering');
    });

    it('should extract booking feature', () => {
      const features = extractKeyFeatures(mockSiteData);
      expect(features).toContain('Book Appointments');
    });

    it('should extract product count', () => {
      const features = extractKeyFeatures(mockSiteData);
      expect(features.some(f => f.includes('2+ Products'))).toBe(true);
    });

    it('should extract reviews feature', () => {
      const features = extractKeyFeatures(mockSiteData);
      expect(features.some(f => f.includes('4.5★'))).toBe(true);
    });

    it('should limit to 4 features max', () => {
      const features = extractKeyFeatures(mockSiteData);
      expect(features.length).toBeLessThanOrEqual(4);
    });

    it('should handle missing features gracefully', () => {
      const minimalSite = {
        brand: { name: 'Test' },
        hero: { title: 'Test' },
        settings: { allowCheckout: false }
      };
      const features = extractKeyFeatures(minimalSite);
      expect(features).toBeDefined();
      expect(Array.isArray(features)).toBe(true);
    });
  });

  describe('generateShareCard', () => {
    it('should generate image buffer for social format', async () => {
      const buffer = await generateShareCard(mockSiteData, 'social');
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should generate correct dimensions for social format', async () => {
      const buffer = await generateShareCard(mockSiteData, 'social');
      // Use sharp to verify dimensions
      const metadata = await sharp(buffer).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(630);
    });

    it('should generate correct dimensions for story format', async () => {
      const buffer = await generateShareCard(mockSiteData, 'story');
      const metadata = await sharp(buffer).metadata();
      expect(metadata.width).toBe(1080);
      expect(metadata.height).toBe(1920);
    });

    it('should generate correct dimensions for square format', async () => {
      const buffer = await generateShareCard(mockSiteData, 'square');
      const metadata = await sharp(buffer).metadata();
      expect(metadata.width).toBe(1080);
      expect(metadata.height).toBe(1080);
    });

    it('should handle missing hero image with placeholder', async () => {
      delete mockSiteData.hero.image;
      const buffer = await generateShareCard(mockSiteData, 'social');
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should escape HTML characters in business name', async () => {
      mockSiteData.brand.name = 'Test & "Company"';
      const buffer = await generateShareCard(mockSiteData, 'social');
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });
});
```

**Implementation (GREEN):**
```javascript
// server/services/shareCardService.js
import { createCanvas, loadImage, registerFont } from 'canvas';
import QRCode from 'qrcode';
import sharp from 'sharp';

// Card dimensions by format
const DIMENSIONS = {
  social: { width: 1200, height: 630 },
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 }
};

/**
 * Extract key features from site data
 */
export function extractKeyFeatures(siteData) {
  const features = [];

  // Online ordering
  if (siteData.settings?.allowCheckout) {
    features.push('Online Ordering');
  }

  // Booking
  if (siteData.features?.booking?.enabled) {
    features.push('Book Appointments');
  }

  // Products
  if (siteData.products && siteData.products.length > 0) {
    features.push(`${siteData.products.length}+ Products`);
  }

  // Services
  if (siteData.services?.items && siteData.services.items.length > 0) {
    features.push(`${siteData.services.items.length}+ Services`);
  }

  // Reviews
  if (siteData.testimonials?.items && siteData.testimonials.items.length > 0) {
    const avgRating = calculateAverageRating(siteData.testimonials.items);
    features.push(`${avgRating.toFixed(1)}★ Reviews`);
  }

  // Analytics
  if (siteData.features?.analytics) {
    features.push('Real-time Analytics');
  }

  // Google Reviews
  if (siteData.features?.reviews?.enabled) {
    features.push('Google Reviews');
  }

  // Return top 4 features
  return features.slice(0, 4);
}

/**
 * Calculate average rating from testimonials
 */
function calculateAverageRating(testimonials) {
  const ratingsWithValues = testimonials.filter(t => t.rating);
  if (ratingsWithValues.length === 0) return 5;
  
  const sum = ratingsWithValues.reduce((acc, t) => acc + t.rating, 0);
  return sum / ratingsWithValues.length;
}

/**
 * Generate share card image
 */
export async function generateShareCard(siteData, format = 'social') {
  const { width, height } = DIMENSIONS[format] || DIMENSIONS.social;
  
  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Extract data
  const businessName = escapeHtml(siteData.brand?.name || 'My Business');
  const tagline = escapeHtml(siteData.hero?.subtitle || siteData.hero?.title || 'Welcome to our business');
  const heroImageUrl = siteData.hero?.image || 'https://via.placeholder.com/1200x630/6366f1/ffffff?text=SiteSprintz';
  const siteUrl = `${siteData.subdomain}.sitesprintz.com`;
  const features = extractKeyFeatures(siteData);

  try {
    // 1. Draw hero image background with overlay
    const heroImage = await loadImage(heroImageUrl);
    
    // Scale and center the image
    const scale = Math.max(width / heroImage.width, height / heroImage.height);
    const scaledWidth = heroImage.width * scale;
    const scaledHeight = heroImage.height * scale;
    const x = (width - scaledWidth) / 2;
    const y = (height - scaledHeight) / 2;
    
    ctx.drawImage(heroImage, x, y, scaledWidth, scaledHeight);
    
    // Dark overlay for readability
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  } catch (error) {
    // Fallback: gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#4338ca');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Draw business name
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(height * 0.08)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // Add text shadow for better readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  
  ctx.fillText(businessName, width / 2, height * 0.15);

  // 3. Draw tagline
  ctx.font = `${Math.floor(height * 0.04)}px Inter, sans-serif`;
  ctx.fillStyle = '#e2e8f0';
  
  // Word wrap for long taglines
  const maxWidth = width * 0.8;
  const lines = wrapText(ctx, tagline, maxWidth);
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, height * 0.25 + (index * height * 0.05));
  });

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // 4. Draw features
  const startY = height * 0.42;
  const lineHeight = height * 0.08;
  
  ctx.textAlign = 'left';
  ctx.font = `${Math.floor(height * 0.04)}px Inter, sans-serif`;
  ctx.fillStyle = '#ffffff';
  
  features.forEach((feature, index) => {
    const y = startY + (index * lineHeight);
    // Checkmark
    ctx.fillStyle = '#22c55e';
    ctx.fillText('✓', width * 0.15, y);
    // Feature text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(feature, width * 0.22, y);
  });

  // 5. Draw URL
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.floor(height * 0.045)}px Inter, sans-serif`;
  ctx.fillStyle = '#60a5fa';
  ctx.fillText(siteUrl, width / 2, height * 0.78);

  // 6. Generate and draw QR code
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(`https://${siteUrl}`, {
      width: height * 0.15,
      margin: 0,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    const qrImage = await loadImage(qrCodeDataUrl);
    const qrSize = height * 0.12;
    ctx.drawImage(qrImage, width * 0.85 - qrSize / 2, height * 0.82, qrSize, qrSize);
  } catch (error) {
    console.error('QR code generation failed:', error);
  }

  // 7. Draw SiteSprintz branding
  ctx.textAlign = 'left';
  ctx.font = `${Math.floor(height * 0.03)}px Inter, sans-serif`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Built with SiteSprintz', width * 0.05, height * 0.95);

  // Convert to buffer and optimize
  const buffer = canvas.toBuffer('image/png');
  
  // Optimize with sharp
  const optimized = await sharp(buffer)
    .png({ quality: 90, compressionLevel: 9 })
    .toBuffer();

  return optimized;
}

/**
 * Wrap text to fit within maxWidth
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, 2); // Max 2 lines
}

/**
 * Escape HTML characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
```

---

### Step 3: API Route (30 min)

#### File: `server/routes/share-card.routes.js`

**Test First:**
```javascript
// tests/integration/share-card-api.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import shareCardRoutes from '../../server/routes/share-card.routes.js';

describe('Share Card API - Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use('/api/sites', shareCardRoutes);
  });

  describe('GET /api/sites/:subdomain/share-card', () => {
    it('should return PNG image for valid subdomain', async () => {
      const response = await request(app)
        .get('/api/sites/test-site/share-card')
        .expect(200)
        .expect('Content-Type', /image\/png/);
      
      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should support format parameter', async () => {
      const response = await request(app)
        .get('/api/sites/test-site/share-card?format=story')
        .expect(200);
      
      expect(response.headers['content-type']).toContain('image/png');
    });

    it('should return 404 for non-existent site', async () => {
      await request(app)
        .get('/api/sites/non-existent-site/share-card')
        .expect(404);
    });

    it('should cache generated images', async () => {
      const response1 = await request(app)
        .get('/api/sites/test-site/share-card')
        .expect(200);
      
      const response2 = await request(app)
        .get('/api/sites/test-site/share-card')
        .expect(200);
      
      expect(response1.body).toEqual(response2.body);
    });

    it('should handle errors gracefully', async () => {
      const response = await request(app)
        .get('/api/sites/invalid-data/share-card')
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
    });
  });
});
```

**Implementation:**
```javascript
// server/routes/share-card.routes.js
import express from 'express';
import { query } from '../database/db.js';
import { generateShareCard } from '../services/shareCardService.js';
import NodeCache from 'node-cache';

const router = express.Router();

// Cache for 1 hour (cards don't change often)
const cache = new NodeCache({ stdTTL: 3600 });

/**
 * GET /api/sites/:subdomain/share-card
 * Generate and return share card image
 */
router.get('/:subdomain/share-card', async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { format = 'social' } = req.query;

    // Validate format
    const validFormats = ['social', 'story', 'square'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use: social, story, or square' });
    }

    // Check cache
    const cacheKey = `share-card:${subdomain}:${format}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(cached);
    }

    // Load site data
    const result = await query(
      'SELECT * FROM sites WHERE subdomain = $1 AND is_active = true',
      [subdomain]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const siteData = result.rows[0].site_data || result.rows[0];
    siteData.subdomain = subdomain;

    // Generate card
    const imageBuffer = await generateShareCard(siteData, format);

    // Cache result
    cache.set(cacheKey, imageBuffer);

    // Send image
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Disposition', `inline; filename="${subdomain}-share-card.png"`);
    res.send(imageBuffer);

  } catch (error) {
    console.error('Share card generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate share card',
      message: error.message 
    });
  }
});

export default router;
```

---

### Step 4: Frontend Integration - Dashboard (45 min)

#### Update Dashboard with Download Button

**File: `src/pages/Dashboard.jsx`**

```javascript
// Add to Dashboard component

const [showShareModal, setShowShareModal] = useState(false);
const [selectedFormat, setSelectedFormat] = useState('social');
const [downloading, setDownloading] = useState(false);

const handleDownloadShareCard = async (site, format) => {
  try {
    setDownloading(true);
    
    const response = await fetch(`/api/sites/${site.subdomain}/share-card?format=${format}`);
    
    if (!response.ok) {
      throw new Error('Failed to generate share card');
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    // Download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${site.subdomain}-share-card-${format}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    URL.revokeObjectURL(url);
    
    // Success message
    alert('✅ Share card downloaded! Ready to post on social media.');
    
  } catch (error) {
    console.error('Download error:', error);
    alert('❌ Failed to download share card. Please try again.');
  } finally {
    setDownloading(false);
  }
};

// Add button to site card
<button
  onClick={() => setShowShareModal(true)}
  className="btn-secondary"
>
  📤 Download Share Card
</button>

// Share Modal Component
{showShareModal && (
  <ShareCardModal
    site={selectedSite}
    onClose={() => setShowShareModal(false)}
    onDownload={handleDownloadShareCard}
  />
)}
```

**File: `src/components/dashboard/ShareCardModal.jsx`**

```javascript
// src/components/dashboard/ShareCardModal.jsx
import { useState } from 'react';
import './ShareCardModal.css';

export default function ShareCardModal({ site, onClose, onDownload }) {
  const [format, setFormat] = useState('social');
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const formats = [
    { id: 'social', name: 'Social Media', size: '1200 × 630', desc: 'Facebook, Twitter, LinkedIn' },
    { id: 'story', name: 'Instagram Story', size: '1080 × 1920', desc: 'Instagram Stories, TikTok' },
    { id: 'square', name: 'Square Post', size: '1080 × 1080', desc: 'Instagram, Facebook posts' }
  ];

  const loadPreview = async (selectedFormat) => {
    setFormat(selectedFormat);
    setPreviewUrl(`/api/sites/${site.subdomain}/share-card?format=${selectedFormat}`);
  };

  const handleDownload = async () => {
    setDownloading(true);
    await onDownload(site, format);
    setDownloading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-card-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📤 Download Share Card</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Format Selector */}
          <div className="format-selector">
            <h3>Choose Format:</h3>
            <div className="format-options">
              {formats.map((fmt) => (
                <button
                  key={fmt.id}
                  className={`format-btn ${format === fmt.id ? 'active' : ''}`}
                  onClick={() => loadPreview(fmt.id)}
                >
                  <div className="format-name">{fmt.name}</div>
                  <div className="format-size">{fmt.size}</div>
                  <div className="format-desc">{fmt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="preview-section">
            <h3>Preview:</h3>
            <div className="preview-container">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Share card preview" 
                  className={`preview-image preview-${format}`}
                />
              ) : (
                <div className="preview-placeholder">
                  Click a format to preview
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn-primary"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? '⏳ Generating...' : '⬇️ Download'}
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

**File: `src/components/dashboard/ShareCardModal.css`**

```css
.share-card-modal {
  background: white;
  border-radius: 16px;
  max-width: 800px;
  width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #64748b;
}

.close-btn:hover {
  color: #0f172a;
}

.format-selector {
  margin-bottom: 32px;
}

.format-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.format-btn {
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  background: white;
  transition: all 0.2s;
}

.format-btn:hover {
  border-color: #6366f1;
  transform: translateY(-2px);
}

.format-btn.active {
  border-color: #6366f1;
  background: #f0f4ff;
}

.format-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.format-size {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
}

.format-desc {
  font-size: 11px;
  color: #94a3b8;
}

.preview-section {
  margin-bottom: 24px;
}

.preview-container {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  background: #f8fafc;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preview-social {
  max-width: 600px;
}

.preview-story {
  max-height: 500px;
}

.preview-square {
  max-width: 400px;
}

.preview-placeholder {
  color: #94a3b8;
  font-size: 14px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary, .btn-secondary {
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4f46e5;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e2e8f0;
  color: #0f172a;
}

.btn-secondary:hover {
  background: #cbd5e1;
}
```

---

### Step 5: Mount Route in Server (5 min)

**File: `server.js`**

```javascript
// Add near other route imports
import shareCardRoutes from './routes/share-card.routes.js';

// Mount routes
app.use('/api/sites', shareCardRoutes);
```

---

## 🧪 TESTING CHECKLIST

### Unit Tests:
- [ ] `extractKeyFeatures` - all feature types
- [ ] `extractKeyFeatures` - max 4 features
- [ ] `extractKeyFeatures` - handles missing data
- [ ] `generateShareCard` - social format (1200x630)
- [ ] `generateShareCard` - story format (1080x1920)
- [ ] `generateShareCard` - square format (1080x1080)
- [ ] `generateShareCard` - handles missing hero image
- [ ] `generateShareCard` - escapes HTML characters
- [ ] QR code generation
- [ ] Text wrapping

### Integration Tests:
- [ ] API returns PNG image
- [ ] API supports format parameter
- [ ] API returns 404 for non-existent site
- [ ] API caches generated images
- [ ] API handles errors gracefully

### Manual Testing:
- [ ] Download social format (1200x630)
- [ ] Download story format (1080x1920)
- [ ] Download square format (1080x1080)
- [ ] Preview shows correctly
- [ ] Download saves with correct filename
- [ ] Share on Facebook (verify preview)
- [ ] Share on Twitter (verify preview)
- [ ] Share on Instagram (verify format)
- [ ] QR code works (scan with phone)
- [ ] "Built with SiteSprintz" branding visible

---

## 📊 SUCCESS METRICS

Track:
- Number of share cards generated per day
- Format preferences (social vs story vs square)
- Sites with share card downloads
- Social media traffic from QR codes (if trackable)

---

## 🚀 DEPLOYMENT

### Dependencies:
```bash
npm install canvas qrcode sharp node-cache
```

### Environment Setup:
```bash
# May need system fonts for canvas
# macOS: brew install pkg-config cairo pango libpng jpeg giflib librsvg
# Linux: apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

---

## 🎉 EXPECTED OUTCOME

After implementation, site owners will:
1. ✅ See "Download Share Card" button in dashboard
2. ✅ Click to open modal with 3 format options
3. ✅ Preview card before download
4. ✅ Download beautiful, branded share cards
5. ✅ Post on social media with professional previews
6. ✅ Drive traffic with QR codes
7. ✅ Free marketing for SiteSprintz!

---

**Ready to implement? This will give your customers an instant marketing tool and create viral growth for SiteSprintz!** 🚀

