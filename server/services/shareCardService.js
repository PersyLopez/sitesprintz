/**
 * Share Card Service - Universal Template Support
 * 
 * Architecture:
 * - Template-agnostic: Works for Starter, Pro, Premium
 * - Modular: Easy to extend with new formats
 * - Secure: HTML escaping, error handling
 * - Performant: Optimized image generation
 */

import { createCanvas, loadImage } from '@napi-rs/canvas';
import QRCode from 'qrcode';
import sharp from 'sharp';

// Card dimensions by format
const DIMENSIONS = {
  social: { width: 1200, height: 630 },
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 }
};

// SiteSprintz Ocean palette (matches src/styles/global.css)
const OCEAN = {
  primary: '#4a6d82',
  primaryDark: '#2f4a5c',
  primaryDarker: '#1a2c38',
  accent: '#7a9bb0',
  text: '#f0f9ff',
  textMuted: '#cbd5e1',
  textSubtle: '#94a3b8',
  success: '#3d8f72',
  surface: '#0f172a'
};

/**
 * Calculate card dimensions for a given format
 */
export function calculateCardDimensions(format) {
  return DIMENSIONS[format] || DIMENSIONS.social;
}

/**
 * Escape HTML special characters for security
 */
export function escapeHtml(text) {
  if (!text) return '';
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Wrap text to fit within maxWidth
 */
export function wrapText(ctx, text, maxWidth) {
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
 * Normalize template data from ANY template type
 * Handles Starter, Pro, and Premium template structures
 */
export function normalizeTemplateData(template) {
  if (!template || typeof template !== 'object') {
    throw new Error('Invalid template data');
  }

  // Extract business name (different sources for different template types)
  const businessName = 
    template.brand?.name ||
    template.meta?.businessName ||
    template.subdomain ||
    'My Business';

  // Extract tagline/subtitle
  const tagline =
    template.hero?.subtitle ||
    template.hero?.title ||
    template.meta?.pageTitle ||
    'Welcome to our business';

  // Extract hero image
  const heroImage =
    template.hero?.image ||
    'https://via.placeholder.com/1200x630/4a6d82/f0f9ff?text=SiteSprintz';

  // Determine tier
  const tier = template.plan || 'Starter';

  // Extract products
  const products = template.products || [];

  // Extract services
  const services = template.services?.items || [];

  // Detect features
  const hasCheckout = template.settings?.allowCheckout === true;
  const hasBooking = template.features?.booking?.enabled === true;
  const hasAnalytics = template.features?.analytics === true;
  const hasReviews = template.features?.reviews?.enabled === true;
  const hasTestimonials = template.testimonials?.items?.length > 0;
  const hasGallery = template.gallery?.items?.length > 0;

  // Calculate average rating if testimonials exist
  let avgRating = null;
  if (hasTestimonials) {
    const testimonials = template.testimonials.items;
    const ratingsWithValues = testimonials.filter(t => t.rating);
    if (ratingsWithValues.length > 0) {
      const sum = ratingsWithValues.reduce((acc, t) => acc + t.rating, 0);
      avgRating = sum / ratingsWithValues.length;
    }
  }

  // Detect Premium-specific features
  const hasAdvancedForms = tier === 'Premium';
  const hasClientPortal = tier === 'Premium';
  const hasAutomation = tier === 'Premium';

  return {
    subdomain: template.subdomain,
    businessName,
    tagline,
    heroImage,
    tier,
    products,
    services,
    hasCheckout,
    hasBooking,
    hasAnalytics,
    hasReviews,
    hasTestimonials,
    hasGallery,
    avgRating,
    hasAdvancedForms,
    hasClientPortal,
    hasAutomation
  };
}

/**
 * Extract key features from normalized template data
 * Returns top 4 features to display on card
 */
export function extractFeatures(normalized) {
  const features = [];

  // Online ordering (Pro feature)
  if (normalized.hasCheckout) {
    features.push('Online Ordering');
  }

  // Booking (Pro feature)
  if (normalized.hasBooking) {
    features.push('Book Appointments');
  }

  // Analytics (Pro feature)
  if (normalized.hasAnalytics) {
    features.push('Real-time Analytics');
  }

  // Google Reviews (Pro feature)
  if (normalized.hasReviews) {
    features.push('Google Reviews');
  }

  // Products count
  if (normalized.products && normalized.products.length > 0) {
    features.push(`${normalized.products.length}+ Products`);
  }

  // Services count
  if (normalized.services && normalized.services.length > 0) {
    features.push(`${normalized.services.length}+ Services`);
  }

  // Reviews/testimonials with rating
  if (normalized.hasTestimonials && normalized.avgRating) {
    features.push(`${normalized.avgRating.toFixed(1)}★ Reviews`);
  }

  // Gallery
  if (normalized.hasGallery) {
    features.push('Photo Gallery');
  }

  // Premium features
  if (normalized.hasAdvancedForms) {
    features.push('Advanced Forms');
  }

  if (normalized.hasClientPortal) {
    features.push('Client Portal');
  }

  if (normalized.hasAutomation) {
    features.push('Automation');
  }

  // If no features, add default
  if (features.length === 0) {
    features.push('Professional Website');
    features.push('Mobile Responsive');
    features.push('Fast & Secure');
  }

  // Return top 4 features
  return features.slice(0, 4);
}

/**
 * Draw a rounded rectangle path
 */
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Generate share card image
 * Universal function that works for all template types
 */
export async function generateShareCard(templateData, format = 'social') {
  if (!templateData || typeof templateData !== 'object') {
    throw new Error('Invalid template data');
  }

  // Normalize template data
  const normalized = normalizeTemplateData(templateData);
  
  // Get card dimensions
  const { width, height } = calculateCardDimensions(format);
  
  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Escape data for security
  const businessName = escapeHtml(normalized.businessName);
  const tagline = escapeHtml(normalized.tagline);
  const siteUrl = `${normalized.subdomain}.sitesprintz.com`;

  // Extract features
  const features = extractFeatures(normalized);

  try {
    const isSocial = format === 'social';
    const isStory = format === 'story';
    const isSquare = format === 'square';
    const footerHeight = height * (isStory ? 0.14 : 0.18);
    const contentLeft = width * 0.06;

    let displayName = businessName;
    if (displayName.length > 40) {
      displayName = displayName.substring(0, 37) + '...';
    }

    // 1. Hero background — photo is the star on social OG cards
    try {
      const heroImage = await loadImage(normalized.heroImage);
      const scale = Math.max(width / heroImage.width, height / heroImage.height);
      const scaledWidth = heroImage.width * scale;
      const scaledHeight = heroImage.height * scale;
      const x = (width - scaledWidth) / 2;
      const y = (height - scaledHeight) / 2;
      ctx.drawImage(heroImage, x, y, scaledWidth, scaledHeight);

      if (isSocial) {
        // Minimal top vignette — keep hero bright and visible
        const topVignette = ctx.createLinearGradient(0, 0, 0, height * 0.25);
        topVignette.addColorStop(0, 'rgba(15, 23, 42, 0.18)');
        topVignette.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = topVignette;
        ctx.fillRect(0, 0, width, height * 0.25);
      } else {
        const overlay = ctx.createLinearGradient(0, 0, 0, height);
        overlay.addColorStop(0, 'rgba(15, 23, 42, 0.35)');
        overlay.addColorStop(0.55, 'rgba(15, 23, 42, 0.55)');
        overlay.addColorStop(1, 'rgba(3, 7, 18, 0.72)');
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, width, height);
      }
    } catch (error) {
      console.warn('Hero image failed to load, using gradient fallback');
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, OCEAN.primary);
      gradient.addColorStop(1, OCEAN.primaryDark);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    if (isSocial) {
      // 2. Light bottom gradient — name + one-line tagline only (no QR, no pills)
      const textBandHeight = height * 0.36;
      const textBandY = height - textBandHeight;
      const bottomGradient = ctx.createLinearGradient(0, textBandY, 0, height);
      bottomGradient.addColorStop(0, 'rgba(3, 7, 18, 0)');
      bottomGradient.addColorStop(0.4, 'rgba(15, 23, 42, 0.62)');
      bottomGradient.addColorStop(1, 'rgba(3, 7, 18, 0.92)');
      ctx.fillStyle = bottomGradient;
      ctx.fillRect(0, textBandY, width, textBandHeight);

      const nameSize = Math.floor(height * 0.068);
      ctx.fillStyle = OCEAN.text;
      ctx.font = `bold ${nameSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';

      const tagSize = Math.floor(height * 0.032);
      const tagLine = wrapText(ctx, tagline, width * 0.88)[0] || tagline;
      const tagY = height - height * 0.06;
      const nameY = tagY - tagSize * 1.25;

      ctx.fillText(displayName, contentLeft, nameY);

      ctx.font = `${tagSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = OCEAN.textMuted;
      ctx.fillText(tagLine, contentLeft, tagY);
    } else {
      // 2. Footer band — URL + QR on quiet surface (story / square)
      const footerY = height - footerHeight;
      ctx.fillStyle = OCEAN.surface;
      ctx.fillRect(0, footerY, width, footerHeight);

      ctx.fillStyle = OCEAN.accent;
      ctx.fillRect(0, footerY, width, 3);

      // 3. Business name
      const nameSize = Math.floor(height * (isStory ? 0.055 : 0.07));
      ctx.fillStyle = OCEAN.text;
      ctx.font = `bold ${nameSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = isSquare ? 'center' : 'left';
      ctx.textBaseline = 'top';

      const nameY = height * (isStory ? 0.08 : 0.1);
      ctx.fillText(displayName, isSquare ? width / 2 : contentLeft, nameY);

      // 4. Tagline
      const tagSize = Math.floor(height * (isStory ? 0.028 : 0.034));
      ctx.font = `${tagSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = OCEAN.textMuted;

      const maxWidth = width * (isSquare ? 0.82 : 0.55);
      const lines = wrapText(ctx, tagline, maxWidth);
      const tagY = nameY + nameSize * 1.35;
      lines.forEach((line, index) => {
        ctx.fillText(line, isSquare ? width / 2 : contentLeft, tagY + index * tagSize * 1.4);
      });

      // 5. Feature pills
      const featureStartY = tagY + lines.length * tagSize * 1.4 + height * 0.04;
      const featureFontSize = Math.floor(height * (isStory ? 0.024 : 0.028));
      ctx.font = `600 ${featureFontSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'left';

      const pillPadX = width * 0.012;
      const pillPadY = height * 0.008;
      const pillGap = width * 0.015;
      let pillX = contentLeft;
      let pillRowY = featureStartY;
      const maxPillRow = width * 0.88;

      features.forEach((feature) => {
        const textWidth = ctx.measureText(feature).width;
        const pillW = textWidth + pillPadX * 2;
        const pillH = featureFontSize + pillPadY * 2;

        if (pillX + pillW > maxPillRow && pillX > contentLeft) {
          pillX = contentLeft;
          pillRowY += pillH + pillGap * 0.5;
        }

        ctx.fillStyle = 'rgba(122, 155, 176, 0.22)';
        roundRect(ctx, pillX, pillRowY, pillW, pillH, pillH * 0.35);
        ctx.fill();

        ctx.fillStyle = OCEAN.text;
        ctx.fillText(feature, pillX + pillPadX, pillRowY + pillPadY);

        pillX += pillW + pillGap;
      });

      // 6. Footer URL
      const urlFontSize = Math.floor(footerHeight * 0.22);
      ctx.textAlign = 'left';
      ctx.font = `600 ${urlFontSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = OCEAN.text;
      ctx.fillText(siteUrl, contentLeft, footerY + footerHeight * 0.32);

      ctx.font = `${Math.floor(footerHeight * 0.14)}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = OCEAN.textSubtle;
      ctx.fillText('Built with SiteSprintz', contentLeft, footerY + footerHeight * 0.62);

      // 7. QR in footer — white pad
      try {
        const qrSize = footerHeight * 0.72;
        const qrPad = qrSize * 0.08;
        const qrX = width - contentLeft - qrSize - qrPad * 2;
        const qrY = footerY + (footerHeight - qrSize - qrPad * 2) / 2;

        ctx.fillStyle = '#ffffff';
        roundRect(ctx, qrX, qrY, qrSize + qrPad * 2, qrSize + qrPad * 2, 8);
        ctx.fill();

        const qrCodeDataUrl = await QRCode.toDataURL(`https://${siteUrl}`, {
          width: Math.round(qrSize),
          margin: 1,
          color: {
            dark: OCEAN.primaryDarker,
            light: '#ffffff'
          }
        });
        const qrImage = await loadImage(qrCodeDataUrl);
        ctx.drawImage(qrImage, qrX + qrPad, qrY + qrPad, qrSize, qrSize);
      } catch (error) {
        console.error('QR code generation failed:', error);
      }
    }

    // Convert to buffer
    const buffer = canvas.toBuffer('image/png');
    
    // Optimize with sharp
    const optimized = await sharp(buffer)
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();

    return optimized;
  } catch (error) {
    console.error('Share card generation error:', error);
    throw error;
  }
}

/**
 * Generate a standalone QR PNG for a live site URL.
 */
export async function generateQrPng(siteUrl, { width = 512 } = {}) {
  if (!siteUrl || typeof siteUrl !== 'string') {
    throw new Error('Invalid site URL');
  }

  return QRCode.toBuffer(siteUrl, {
    type: 'png',
    width,
    margin: 3,
    errorCorrectionLevel: 'M',
    color: {
      dark: OCEAN.primaryDarker,
      light: '#ffffff'
    }
  });
}

export default {
  generateShareCard,
  generateQrPng,
  normalizeTemplateData,
  extractFeatures,
  calculateCardDimensions,
  escapeHtml,
  wrapText
};

