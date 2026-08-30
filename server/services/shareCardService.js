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
import { getAbsolutePublishedSiteUrl } from '../../src/utils/siteWorkspace.js';
import { extractSiteCatalog } from '../utils/payOnSite.js';

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
    'https://via.placeholder.com/1200x630/4a6d82/f0f9ff?text=Right+Site+Light';

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

function formatOfferPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

/**
 * Shop offer lines for share cards. Catalog (priced) first, then named
 * services without a price. Does not invent platform-feature pills.
 *
 * @param {object|null|undefined} siteData
 * @param {{ limit?: number }} [options]
 * @returns {string[]}
 */
export function extractOfferLines(siteData, { limit = 4 } = {}) {
  const max = Number.isFinite(limit) ? Math.max(0, limit) : 4;
  const lines = [];
  const seen = new Set();

  const pushLine = (name, priced) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) return false;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    lines.push(priced ? `${trimmed} · ${formatOfferPrice(priced)}` : trimmed);
    return lines.length >= max;
  };

  const catalog = extractSiteCatalog(siteData);
  for (const item of catalog) {
    if (pushLine(item.name, item.price)) return lines;
  }

  const services = siteData?.services?.items;
  if (Array.isArray(services)) {
    for (const item of services) {
      if (pushLine(item.name || item.title, 0)) return lines;
    }
  }

  return lines;
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
 * social: OG highlight (no QR). square/story: flyer with shop offer + QR.
 */
export async function generateShareCard(templateData, format = 'social') {
  if (!templateData || typeof templateData !== 'object') {
    throw new Error('Invalid template data');
  }

  const normalized = normalizeTemplateData(templateData);
  const { width, height } = calculateCardDimensions(format);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const businessName = escapeHtml(normalized.businessName);
  const tagline = escapeHtml(normalized.tagline);
  const liveUrl = getAbsolutePublishedSiteUrl(normalized.subdomain);
  const isSocial = format === 'social';
  const isStory = format === 'story';
  const isSquare = format === 'square';
  const offerLimit = isSocial ? 2 : 4;
  const offerLines = extractOfferLines(templateData, { limit: offerLimit }).map((line) => escapeHtml(line));

  try {
    const footerHeight = height * (isStory ? 0.16 : 0.22);
    const contentLeft = width * 0.06;

    let displayName = businessName;
    if (displayName.length > 40) {
      displayName = displayName.substring(0, 37) + '...';
    }

    try {
      const heroImage = await loadImage(normalized.heroImage);
      const scale = Math.max(width / heroImage.width, height / heroImage.height);
      const scaledWidth = heroImage.width * scale;
      const scaledHeight = heroImage.height * scale;
      const x = (width - scaledWidth) / 2;
      const y = (height - scaledHeight) / 2;
      ctx.drawImage(heroImage, x, y, scaledWidth, scaledHeight);

      if (isSocial) {
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
    } catch {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, OCEAN.primary);
      gradient.addColorStop(1, OCEAN.primaryDark);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    if (isSocial) {
      const textBandHeight = height * (offerLines.length ? 0.44 : 0.36);
      const textBandY = height - textBandHeight;
      const bottomGradient = ctx.createLinearGradient(0, textBandY, 0, height);
      bottomGradient.addColorStop(0, 'rgba(3, 7, 18, 0)');
      bottomGradient.addColorStop(0.35, 'rgba(15, 23, 42, 0.62)');
      bottomGradient.addColorStop(1, 'rgba(3, 7, 18, 0.92)');
      ctx.fillStyle = bottomGradient;
      ctx.fillRect(0, textBandY, width, textBandHeight);

      const nameSize = Math.floor(height * 0.068);
      const tagSize = Math.floor(height * 0.032);
      const offerSize = Math.floor(height * 0.028);
      ctx.font = `${tagSize}px "Segoe UI", system-ui, sans-serif`;
      const tagLine = wrapText(ctx, tagline, width * 0.88)[0] || tagline;
      const offerBlock = offerLines.length * offerSize * 1.35;
      const tagY = height - height * 0.06 - offerBlock;
      const nameY = tagY - tagSize * 1.25;

      ctx.fillStyle = OCEAN.text;
      ctx.font = `bold ${nameSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(displayName, contentLeft, nameY);

      ctx.font = `${tagSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = OCEAN.textMuted;
      ctx.fillText(tagLine, contentLeft, tagY);

      ctx.font = `600 ${offerSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = OCEAN.text;
      offerLines.forEach((line, index) => {
        ctx.fillText(line, contentLeft, tagY + offerSize * 1.35 * (index + 1));
      });
    } else {
      const footerY = height - footerHeight;
      ctx.fillStyle = OCEAN.surface;
      ctx.fillRect(0, footerY, width, footerHeight);

      ctx.fillStyle = OCEAN.accent;
      ctx.fillRect(0, footerY, width, 3);

      const nameSize = Math.floor(height * (isStory ? 0.055 : 0.07));
      ctx.fillStyle = OCEAN.text;
      ctx.font = `bold ${nameSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = isSquare ? 'center' : 'left';
      ctx.textBaseline = 'top';

      const nameY = height * (isStory ? 0.08 : 0.1);
      ctx.fillText(displayName, isSquare ? width / 2 : contentLeft, nameY);

      const tagSize = Math.floor(height * (isStory ? 0.028 : 0.034));
      ctx.font = `${tagSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = OCEAN.textMuted;

      const maxWidth = width * (isSquare ? 0.82 : 0.55);
      const lines = wrapText(ctx, tagline, maxWidth);
      const tagY = nameY + nameSize * 1.35;
      lines.forEach((line, index) => {
        ctx.fillText(line, isSquare ? width / 2 : contentLeft, tagY + index * tagSize * 1.4);
      });

      const offerStartY = tagY + lines.length * tagSize * 1.4 + height * 0.04;
      const offerFontSize = Math.floor(height * (isStory ? 0.024 : 0.028));
      ctx.font = `600 ${offerFontSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillStyle = OCEAN.text;

      offerLines.forEach((line, index) => {
        ctx.fillText(line, contentLeft, offerStartY + index * offerFontSize * 1.45);
      });

      const scanSize = Math.floor(footerHeight * 0.22);
      ctx.textAlign = 'left';
      ctx.font = `600 ${scanSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = OCEAN.text;
      ctx.fillText('Scan to visit', contentLeft, footerY + footerHeight * 0.32);

      ctx.font = `${Math.floor(footerHeight * 0.14)}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = OCEAN.textSubtle;
      ctx.fillText('Built with Right Site Light', contentLeft, footerY + footerHeight * 0.62);

      if (liveUrl) {
        try {
          const qrSize = footerHeight * 0.78;
          const qrPad = qrSize * 0.08;
          const qrX = width - contentLeft - qrSize - qrPad * 2;
          const qrY = footerY + (footerHeight - qrSize - qrPad * 2) / 2;

          ctx.fillStyle = '#ffffff';
          roundRect(ctx, qrX, qrY, qrSize + qrPad * 2, qrSize + qrPad * 2, 8);
          ctx.fill();

          const qrCodeDataUrl = await QRCode.toDataURL(liveUrl, {
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
    }

    const buffer = canvas.toBuffer('image/png');
    return sharp(buffer)
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();
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
  extractOfferLines,
  calculateCardDimensions,
  escapeHtml,
  wrapText
};

