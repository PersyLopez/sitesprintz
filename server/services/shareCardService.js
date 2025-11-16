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
    'https://via.placeholder.com/1200x630/6366f1/ffffff?text=SiteSprintz';

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
    // 1. Draw hero image background with overlay
    try {
      const heroImage = await loadImage(normalized.heroImage);
      
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
      // Fallback: gradient background if image fails
      console.warn('Hero image failed to load, using gradient fallback');
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(1, '#4338ca');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Draw business name
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(height * 0.08)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Add text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    
    // Truncate long business names
    let displayName = businessName;
    if (displayName.length > 40) {
      displayName = displayName.substring(0, 37) + '...';
    }
    
    ctx.fillText(displayName, width / 2, height * 0.15);

    // 3. Draw tagline
    ctx.font = `${Math.floor(height * 0.04)}px Arial, sans-serif`;
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
    ctx.font = `${Math.floor(height * 0.04)}px Arial, sans-serif`;
    
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
    ctx.font = `bold ${Math.floor(height * 0.045)}px Arial, sans-serif`;
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
    ctx.font = `${Math.floor(height * 0.03)}px Arial, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Built with SiteSprintz', width * 0.05, height * 0.95);

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

export default {
  generateShareCard,
  normalizeTemplateData,
  extractFeatures,
  calculateCardDimensions,
  escapeHtml,
  wrapText
};

