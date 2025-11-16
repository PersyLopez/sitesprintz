/**
 * SEO Service
 * Handles meta tag generation, Schema.org markup, sitemaps, and robots.txt
 * Following TDD: Implementation written to pass tests
 */

class SEOService {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'sitesprintz.com';
    this.protocol = 'https';
  }

  /**
   * Generate meta tags for a site
   * @param {Object} siteData - Site information
   * @returns {Object} Meta tags object
   */
  generateMetaTags(siteData) {
    const {
      businessName,
      businessDescription = '',
      businessPhone,
      businessEmail,
      businessAddress,
      category,
      logo
    } = siteData;

    // Generate optimized title (max 60 chars)
    let title = businessName || 'My Business';
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }

    // Generate optimized description (50-160 chars)
    let description = businessDescription || `Welcome to ${businessName}`;
    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    } else if (description.length < 50 && businessDescription) {
      // Pad with category info if too short
      const categoryText = this._getCategoryText(category);
      description = `${description}. ${categoryText}`.substring(0, 160);
    }

    // Generate keywords
    const keywords = this._generateKeywords(businessName, category, businessDescription);

    // Build meta tags object
    const metaTags = {
      title,
      description,
      keywords,
      viewport: 'width=device-width, initial-scale=1.0',
      charset: 'UTF-8',
      
      // Open Graph tags
      'og:title': title,
      'og:description': description,
      'og:type': 'website',
      
      // Twitter Card tags
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description
    };

    // Add logo/image if available
    if (logo) {
      metaTags['og:image'] = logo;
      metaTags['twitter:image'] = logo;
    }

    return metaTags;
  }

  /**
   * Generate Schema.org JSON-LD markup
   * @param {string} type - Type of schema (restaurant, product, service, etc.)
   * @param {Object} data - Business/product data
   * @returns {Object} Schema.org markup object
   */
  generateSchemaMarkup(type, data) {
    const schema = {
      '@context': 'https://schema.org'
    };

    switch (type) {
      case 'restaurant':
        return this._generateRestaurantSchema(data);
      
      case 'salon':
      case 'gym':
      case 'plumbing':
      case 'electrician':
      case 'auto-repair':
      case 'tech-repair':
      case 'cleaning':
      case 'pet-care':
        return this._generateLocalBusinessSchema(data, type);
      
      case 'consultant':
      case 'freelancer':
        return this._generateProfessionalServiceSchema(data);
      
      case 'product':
        return this._generateProductSchema(data);
      
      case 'service':
        return this._generateServiceSchema(data);
      
      default:
        return this._generateLocalBusinessSchema(data, 'LocalBusiness');
    }
  }

  /**
   * Generate XML sitemap
   * @param {string} subdomain - Site subdomain
   * @param {Array} pages - Array of page objects with path, priority, changefreq
   * @param {Object} options - Options (customDomain)
   * @returns {string} XML sitemap
   */
  async generateSitemap(subdomain, pages = [], options = {}) {
    const domain = options.customDomain || `${subdomain}.${this.baseUrl}`;
    const baseUrl = `${this.protocol}://${domain}`;

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    for (const page of pages) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.path}</loc>\n`;
      
      if (page.lastmod) {
        xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
      }
      
      if (page.changefreq) {
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      }
      
      if (page.priority !== undefined && page.priority !== null) {
        // Ensure priority is formatted as decimal (e.g., 1.0 not 1)
        const priority = typeof page.priority === 'number' 
          ? page.priority.toFixed(1)
          : parseFloat(page.priority).toFixed(1);
        xml += `    <priority>${priority}</priority>\n`;
      }
      
      xml += '  </url>\n';
    }

    xml += '</urlset>';
    return xml;
  }

  /**
   * Generate robots.txt
   * @param {string} subdomain - Site subdomain
   * @param {Object} options - Options (customDomain, disallow, noindex)
   * @returns {string} robots.txt content
   */
  generateRobotsTxt(subdomain, options = {}) {
    const { customDomain, disallow = [], noindex = false } = options;
    
    const domain = customDomain || `${subdomain}.${this.baseUrl}`;
    const baseUrl = `${this.protocol}://${domain}`;

    let txt = 'User-agent: *\n';
    
    if (noindex) {
      txt += 'Disallow: /\n';
    } else {
      txt += 'Allow: /\n';
      
      // Add specific disallows
      for (const path of disallow) {
        txt += `Disallow: ${path}\n`;
      }
    }
    
    txt += '\n';
    txt += `Sitemap: ${baseUrl}/sitemap.xml\n`;
    
    return txt;
  }

  /**
   * Get canonical URL
   * @param {string} subdomain - Site subdomain
   * @param {string} path - Page path
   * @param {Object} options - Options (customDomain)
   * @returns {string} Canonical URL
   */
  getCanonicalUrl(subdomain, path, options = {}) {
    const domain = options.customDomain || `${subdomain}.${this.baseUrl}`;
    const baseUrl = `${this.protocol}://${domain}`;

    // Remove query parameters
    const cleanPath = path.split('?')[0];
    
    // Remove trailing slash (except for root)
    const normalizedPath = cleanPath === '/' ? '/' : cleanPath.replace(/\/$/, '');
    
    return `${baseUrl}${normalizedPath}`;
  }

  /**
   * Parse address string into components
   * @param {string} addressString - Full address string
   * @returns {Object|null} Parsed address object
   */
  parseAddress(addressString) {
    if (!addressString || typeof addressString !== 'string') {
      return null;
    }

    // Simple address parsing: "Street, City, State Zip"
    const parts = addressString.split(',').map(p => p.trim());
    
    if (parts.length < 2) {
      return null;
    }

    const streetAddress = parts[0];
    const addressLocality = parts[1];
    
    // Try to parse state and zip from last part
    let addressRegion = '';
    let postalCode = '';
    
    if (parts[2]) {
      const lastPart = parts[2].trim();
      const match = lastPart.match(/^([A-Z]{2})\s*(\d{5})?$/);
      if (match) {
        addressRegion = match[1];
        postalCode = match[2] || '';
      } else {
        addressRegion = lastPart;
      }
    }

    return {
      '@type': 'PostalAddress',
      streetAddress,
      addressLocality,
      addressRegion,
      postalCode,
      addressCountry: 'US'
    };
  }

  /**
   * Suggest alt tags for images based on filename
   * @param {Array} images - Array of image objects
   * @returns {Array} Suggestions for missing alt tags
   */
  suggestAltTags(images) {
    return images
      .filter(img => !img.alt || img.alt.trim() === '')
      .map(img => {
        const filename = img.src.split('/').pop().split('.')[0];
        // Keep lowercase and convert hyphens/underscores to spaces
        const suggestedAlt = filename.split(/[-_]/).join(' ');
        
        return {
          src: img.src,
          suggestedAlt
        };
      });
  }

  /**
   * Validate meta tags
   * @param {Object} metaTags - Meta tags object
   * @returns {Object} Validation result
   */
  validateMetaTags(metaTags) {
    const errors = [];
    const warnings = [];

    // Title validation
    if (!metaTags.title) {
      errors.push('Title is required');
    } else if (metaTags.title.length > 60) {
      errors.push('Title is too long');
    } else if (metaTags.title.length < 10) {
      warnings.push('Title is too short');
    }

    // Description validation
    if (!metaTags.description) {
      errors.push('Description is required');
    } else if (metaTags.description.length > 160) {
      warnings.push('Description is too long');
    } else if (metaTags.description.length < 50) {
      warnings.push('Description is too short');
    }

    // Keywords validation
    if (!metaTags.keywords || metaTags.keywords.trim() === '') {
      warnings.push('Keywords are missing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Private helper methods

  _generateRestaurantSchema(data) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: data.businessName,
      description: data.businessDescription
    };

    if (data.businessAddress) {
      schema.address = this.parseAddress(data.businessAddress);
    }

    if (data.businessPhone) {
      schema.telephone = data.businessPhone;
    }

    if (data.businessEmail) {
      schema.email = data.businessEmail;
    }

    if (data.averageRating && data.reviewCount) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: data.averageRating,
        reviewCount: data.reviewCount
      };
    }

    return schema;
  }

  _generateLocalBusinessSchema(data, businessType) {
    const typeMap = {
      'salon': 'BeautySalon',
      'gym': 'HealthClub',
      'plumbing': 'Plumber',
      'electrician': 'Electrician',
      'auto-repair': 'AutoRepair',
      'tech-repair': 'ComputerRepair',
      'cleaning': 'HousePainter', // Closest match
      'pet-care': 'VeterinaryCare'
    };

    const schema = {
      '@context': 'https://schema.org',
      '@type': typeMap[businessType] || 'LocalBusiness',
      name: data.businessName,
      description: data.businessDescription
    };

    if (data.businessAddress) {
      schema.address = this.parseAddress(data.businessAddress);
    }

    if (data.businessPhone) {
      schema.telephone = data.businessPhone;
    }

    if (data.businessEmail) {
      schema.email = data.businessEmail;
    }

    if (data.averageRating && data.reviewCount) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: data.averageRating,
        reviewCount: data.reviewCount
      };
    }

    return schema;
  }

  _generateProfessionalServiceSchema(data) {
    return {
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      name: data.businessName,
      description: data.businessDescription,
      telephone: data.businessPhone,
      email: data.businessEmail
    };
  }

  _generateProductSchema(data) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: data.name,
      description: data.description
    };

    if (data.image) {
      schema.image = data.image;
    }

    if (data.price !== undefined) {
      schema.offers = {
        '@type': 'Offer',
        price: data.price,
        priceCurrency: data.currency || 'USD'
      };
    }

    return schema;
  }

  _generateServiceSchema(data) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: data.serviceName,
      description: data.serviceDescription
    };

    if (data.businessName) {
      schema.provider = {
        '@type': 'Organization',
        name: data.businessName
      };
    }

    return schema;
  }

  _generateKeywords(businessName, category, description) {
    const keywords = new Set();

    // Add business name words
    if (businessName) {
      businessName.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 3) keywords.add(word);
      });
    }

    // Add category keywords
    const categoryKeywords = this._getCategoryKeywords(category);
    categoryKeywords.forEach(kw => keywords.add(kw));

    // Extract key words from description
    if (description) {
      const words = description.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      words.slice(0, 5).forEach(word => keywords.add(word));
    }

    return Array.from(keywords).join(', ');
  }

  _getCategoryKeywords(category) {
    const keywordMap = {
      'restaurant': ['restaurant', 'food', 'dining', 'menu', 'cuisine'],
      'salon': ['salon', 'beauty', 'hair', 'styling', 'spa'],
      'gym': ['gym', 'fitness', 'workout', 'training', 'exercise'],
      'consultant': ['consultant', 'consulting', 'business', 'advisory', 'expert'],
      'freelancer': ['freelancer', 'professional', 'services', 'expertise'],
      'cleaning': ['cleaning', 'maid', 'housekeeping', 'janitorial'],
      'pet-care': ['pet care', 'veterinary', 'grooming', 'pets', 'animals'],
      'tech-repair': ['repair', 'technology', 'computer', 'electronics', 'tech support'],
      'electrician': ['electrician', 'electrical', 'wiring', 'electrical services'],
      'auto-repair': ['auto repair', 'mechanic', 'car service', 'automotive'],
      'plumbing': ['plumber', 'plumbing', 'pipes', 'drainage', 'plumbing services'],
      'product-showcase': ['products', 'shop', 'store', 'buy', 'shopping']
    };

    return keywordMap[category] || ['business', 'services', 'professional'];
  }

  _getCategoryText(category) {
    const textMap = {
      'restaurant': 'Quality dining and delicious food.',
      'salon': 'Professional beauty and hair services.',
      'gym': 'Fitness training and wellness programs.',
      'consultant': 'Expert business consulting services.',
      'freelancer': 'Professional freelance services.',
      'cleaning': 'Professional cleaning services.',
      'pet-care': 'Quality pet care services.',
      'tech-repair': 'Expert technology repair services.',
      'electrician': 'Professional electrical services.',
      'auto-repair': 'Reliable auto repair services.',
      'plumbing': 'Professional plumbing services.',
      'product-showcase': 'Browse our quality products.'
    };

    return textMap[category] || 'Professional business services.';
  }
}

export default SEOService;

