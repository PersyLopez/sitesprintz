/**
 * Template Normalization Service
 * 
 * Transforms any template format to canonical Pro structure.
 * This ensures consistent data format throughout the system.
 */

export class TemplateNormalizer {
  /**
   * Normalize any template format to canonical structure
   * @param {Object} rawTemplate - Raw template from JSON file
   * @returns {Object} Normalized template with guaranteed structure
   */
  static normalize(rawTemplate) {
    if (!rawTemplate) return this.getDefaultTemplate();

    // Isolate catalog JSON so later merges cannot mutate the shared template
    const source = typeof structuredClone === 'function'
      ? structuredClone(rawTemplate)
      : JSON.parse(JSON.stringify(rawTemplate));

    return {
      // Core identification
      id: source.id || source.template_id || 'unknown',
      tier: source.tier === 'pro' || source.tier === 'premium' ? 'growth' : (source.tier || 'starter'),
      template: source.template || source.id || 'unknown',
      
      // Brand information
      brand: {
        name: source.brand?.name || source.businessName || '',
        tagline: source.brand?.tagline || source.tagline || '',
        phone: source.brand?.phone || source.phone || '',
        email: source.brand?.email || source.email || '',
        logo: source.brand?.logo || source.logo || '',
      },

      // Hero section (always normalize to this format)
      hero: {
        eyebrow: source.hero?.eyebrow || '',
        title: source.hero?.title || source.heroTitle || '',
        subtitle: source.hero?.subtitle || source.heroSubtitle || '',
        image: source.hero?.image || source.heroImage || '',
        imageAlt: source.hero?.imageAlt || '',
        layout: source.hero?.layout || 'default',
        cta: source.hero?.cta || [],
      },

      // Contact section
      contact: {
        email: source.contact?.email || source.brand?.email || source.email || '',
        phone: source.contact?.phone || source.brand?.phone || source.phone || '',
        address: source.contact?.address || source.contactAddress || source.address || '',
        hours: source.contact?.hours || source.businessHours || source.hours || '',
        subtitle: source.contact?.subtitle || '',
      },

      // Theme/Colors
      themeVars: source.themeVars || this.getDefaultTheme(),

      // Navigation
      nav: source.nav || [],

      // Menu/Products (normalize both formats to menu.sections)
      menu: this.normalizeMenu(source),

      // About section
      about: {
        title: source.about?.title || '',
        subtitle: source.about?.subtitle || '',
        body: source.about?.body || '',
        features: source.about?.features || [],
        chef: source.about?.chef || null,
      },

      // Team/Staff
      team: {
        members: source.team?.members || source.staff || [],
      },

      // Gallery
      gallery: {
        categories: source.gallery?.categories || [],
        images: source.gallery?.images || [],
      },

      // Testimonials (normalize both formats)
      testimonials: this.normalizeTestimonials(source),

      // Stats
      stats: {
        items: source.stats?.items || [],
      },

      // FAQ
      faq: {
        items: source.faq?.items || source.faqs || [],
      },

      // Features (explicit flags)
      features: {
        bookingWidget: source.features?.bookingWidget || {
          enabled: false,
          provider: 'calendly',
          url: '',
        },
        tabbedMenu: source.features?.tabbedMenu || false,
        gallery: source.features?.gallery || { filterable: false },
        privateEvents: source.features?.privateEvents || { enabled: false },
        ownerDashboard: source.features?.ownerDashboard || false,
        analytics: source.features?.analytics || false,
      },

      // Booking configuration (if present in template)
      booking: source.booking || {
        enabled: false,
        provider: 'calendly',
        url: '',
      },

      // Special sections (Pro only)
      chefSpecials: source.chefSpecials || { items: [] },
      privateEvents: source.privateEvents || { rooms: [] },
      credentials: source.credentials || { items: [] },

      // Social
      social: {
        facebook: source.social?.facebook || '',
        instagram: source.social?.instagram || '',
        whatsapp: source.social?.whatsapp || '',
        tiktok: source.social?.tiktok || '',
        maps: source.social?.maps || source.social?.googleMapsUrl || '',
        website: source.social?.website || '',
        linkedin: source.social?.linkedin || '',
        ...(source.social?.twitter ? { twitter: source.social.twitter } : {}),
        ...(source.social?.youtube ? { youtube: source.social.youtube } : {}),
      },

      // Settings
      settings: source.settings || {
        allowOrders: false,
      },
    };
  }

  /**
   * Normalize menu from either format (products array OR menu.sections)
   */
  static normalizeMenu(rawTemplate) {
    // If already in menu.sections format, use it
    if (rawTemplate.menu?.sections) {
      return {
        sections: rawTemplate.menu.sections.map(section => ({
          id: section.id || section.name?.toLowerCase().replace(/\s+/g, '-'),
          name: section.name || '',
          description: section.description || '',
          items: section.items || [],
        })),
      };
    }

    // If has products array, convert to menu.sections
    if (rawTemplate.products && Array.isArray(rawTemplate.products)) {
      // Group products by category
      const categories = {};
      rawTemplate.products.forEach(product => {
        const category = product.category || 'Main';
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(product);
      });

      return {
        sections: Object.entries(categories).map(([name, items]) => ({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name: name,
          description: '',
          items: items,
        })),
      };
    }

    // Empty menu
    return { sections: [] };
  }

  /**
   * Normalize testimonials from either format
   */
  static normalizeTestimonials(rawTemplate) {
    let items = [];

    if (rawTemplate.testimonials?.items) {
      items = rawTemplate.testimonials.items;
    } else if (Array.isArray(rawTemplate.testimonials)) {
      items = rawTemplate.testimonials;
    }

    return {
      items: items.map(item => ({
        author: item.author || item.name || '',
        text: item.text || item.content || item.message || '',
        rating: item.rating || item.stars || 5,
        image: item.image || item.photo || '',
        title: item.title || item.role || '',
      })),
    };
  }

  static getDefaultTheme() {
    return {
      'color-primary': '#06b6d4',
      'color-primary-light': '#22d3ee',
      'color-accent': '#0891b2',
      'color-secondary': '#14b8a6',
      'color-success': '#10b981',
      'color-warning': '#f59e0b',
      'color-danger': '#ef4444',
      'color-bg': '#0f172a',
      'color-surface': '#1e293b',
      'color-card': '#1e293b',
      'color-text': '#f8fafc',
      'color-muted': '#94a3b8',
    };
  }

  static getDefaultTemplate() {
    return {
      id: 'default',
      tier: 'pro',
      template: 'default',
      brand: { name: '', tagline: '', phone: '', email: '', logo: '' },
      hero: { eyebrow: '', title: '', subtitle: '', image: '', cta: [] },
      contact: { email: '', phone: '', address: '', hours: '' },
      themeVars: this.getDefaultTheme(),
      nav: [],
      menu: { sections: [] },
      about: { title: '', body: '', features: [] },
      team: { members: [] },
      gallery: { categories: [], images: [] },
      testimonials: { items: [] },
      stats: { items: [] },
      faq: { items: [] },
      features: { bookingWidget: { enabled: false }, tabbedMenu: false },
      booking: { enabled: false, provider: 'calendly', url: '' },
      social: { facebook: '', instagram: '', whatsapp: '', tiktok: '', maps: '', website: '', linkedin: '' },
      settings: { allowOrders: false },
    };
  }
}

export default TemplateNormalizer;

