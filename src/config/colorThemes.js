/**
 * Color Themes Configuration
 * 
 * Curated color themes based on industry research and design best practices.
 * Each theme includes primary, accent, and background colors with both
 * light and dark mode variants.
 */

/**
 * Color Theme Categories
 * Organized by mood/style for easy browsing
 */
export const THEME_CATEGORIES = {
  PROFESSIONAL: 'professional',
  WARM: 'warm',
  COOL: 'cool',
  BOLD: 'bold',
  NATURAL: 'natural',
  LUXURY: 'luxury',
  MODERN: 'modern',
  CLASSIC: 'classic'
};

/**
 * Master Color Themes
 * 
 * Each theme has:
 * - id: Unique identifier
 * - name: Display name
 * - category: Theme category
 * - colors: Primary, accent, and background colors
 * - industries: Suggested industries/niches
 * - mood: Color psychology description
 */
export const COLOR_THEMES = {
  // ═══════════════════════════════════════════════════════════════
  // 🍽️ FOOD & HOSPITALITY THEMES
  // ═══════════════════════════════════════════════════════════════
  
  'appetite-red': {
    id: 'appetite-red',
    name: 'Appetite Red',
    emoji: '🍷',
    category: THEME_CATEGORIES.WARM,
    colors: {
      primary: '#dc2626',    // Red - stimulates appetite
      accent: '#b91c1c',     // Darker red
      background: '#0f172a', // Dark slate
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    lightMode: {
      background: '#fef2f2',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['restaurant', 'food'],
    mood: 'Stimulates appetite, creates urgency and excitement'
  },

  'warm-gold': {
    id: 'warm-gold',
    name: 'Warm Gold',
    emoji: '✨',
    category: THEME_CATEGORIES.LUXURY,
    colors: {
      primary: '#d4af37',    // Gold
      accent: '#b8941e',     // Antique gold
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    lightMode: {
      background: '#fefce8',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['restaurant', 'salon', 'consultant'],
    mood: 'Elegance, luxury, premium quality'
  },

  'rustic-terracotta': {
    id: 'rustic-terracotta',
    name: 'Rustic Terracotta',
    emoji: '🏺',
    category: THEME_CATEGORIES.WARM,
    colors: {
      primary: '#c2410c',    // Terracotta/Rust
      accent: '#9a3412',
      background: '#1c1917',
      surface: '#292524',
      text: '#fafaf9',
      textMuted: '#a8a29e'
    },
    lightMode: {
      background: '#fef3c7',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['restaurant', 'cleaning'],
    mood: 'Warm, earthy, authentic, handcrafted'
  },

  // ═══════════════════════════════════════════════════════════════
  // 💇 BEAUTY & WELLNESS THEMES
  // ═══════════════════════════════════════════════════════════════

  'lavender-luxury': {
    id: 'lavender-luxury',
    name: 'Lavender Luxury',
    emoji: '💜',
    category: THEME_CATEGORIES.LUXURY,
    colors: {
      primary: '#a855f7',    // Purple/Lavender
      accent: '#9333ea',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    lightMode: {
      background: '#faf5ff',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['salon', 'spa'],
    mood: 'Luxury, creativity, femininity, relaxation'
  },

  'rose-blush': {
    id: 'rose-blush',
    name: 'Rose Blush',
    emoji: '🌸',
    category: THEME_CATEGORIES.WARM,
    colors: {
      primary: '#ec4899',    // Pink
      accent: '#db2777',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    lightMode: {
      background: '#fdf2f8',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['salon', 'spa', 'beauty'],
    mood: 'Soft, feminine, romantic, nurturing'
  },

  'mint-wellness': {
    id: 'mint-wellness',
    name: 'Mint Wellness',
    emoji: '🌿',
    category: THEME_CATEGORIES.NATURAL,
    colors: {
      primary: '#10b981',    // Emerald/Mint
      accent: '#059669',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    lightMode: {
      background: '#ecfdf5',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['salon', 'spa', 'gym', 'cleaning'],
    mood: 'Fresh, clean, healthy, rejuvenating'
  },

  // ═══════════════════════════════════════════════════════════════
  // 💪 FITNESS & ENERGY THEMES
  // ═══════════════════════════════════════════════════════════════

  'power-red': {
    id: 'power-red',
    name: 'Power Red',
    emoji: '🔥',
    category: THEME_CATEGORIES.BOLD,
    colors: {
      primary: '#ef4444',    // Energetic red
      accent: '#dc2626',
      background: '#0a0a0a',
      surface: '#171717',
      text: '#fafafa',
      textMuted: '#a3a3a3'
    },
    lightMode: {
      background: '#fef2f2',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['gym', 'auto-repair'],
    mood: 'Energy, power, intensity, motivation'
  },

  'electric-orange': {
    id: 'electric-orange',
    name: 'Electric Orange',
    emoji: '⚡',
    category: THEME_CATEGORIES.BOLD,
    colors: {
      primary: '#f97316',    // Vibrant orange
      accent: '#ea580c',
      background: '#0a0a0a',
      surface: '#171717',
      text: '#fafafa',
      textMuted: '#a3a3a3'
    },
    lightMode: {
      background: '#fff7ed',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['gym', 'tech-repair', 'electrician'],
    mood: 'Enthusiasm, energy, warmth, action'
  },

  'neon-lime': {
    id: 'neon-lime',
    name: 'Neon Lime',
    emoji: '💚',
    category: THEME_CATEGORIES.BOLD,
    colors: {
      primary: '#84cc16',    // Lime green
      accent: '#65a30d',
      background: '#0a0a0a',
      surface: '#171717',
      text: '#fafafa',
      textMuted: '#a3a3a3'
    },
    lightMode: {
      background: '#f7fee7',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['gym', 'cleaning'],
    mood: 'Fresh, energetic, growth, vitality'
  },

  // ═══════════════════════════════════════════════════════════════
  // 💼 PROFESSIONAL & CORPORATE THEMES
  // ═══════════════════════════════════════════════════════════════

  'corporate-navy': {
    id: 'corporate-navy',
    name: 'Corporate Navy',
    emoji: '🏢',
    category: THEME_CATEGORIES.PROFESSIONAL,
    colors: {
      primary: '#1e40af',    // Navy blue
      accent: '#1d4ed8',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    lightMode: {
      background: '#eff6ff',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['consultant', 'freelancer', 'plumbing', 'electrician'],
    mood: 'Trust, professionalism, stability, expertise'
  },

  'ocean-teal': {
    id: 'ocean-teal',
    name: 'Ocean Teal',
    emoji: '🌊',
    category: THEME_CATEGORIES.COOL,
    colors: {
      primary: '#0891b2',    // Cyan/Teal
      accent: '#0e7490',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    lightMode: {
      background: '#ecfeff',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['consultant', 'freelancer', 'tech-repair', 'cleaning'],
    mood: 'Calm, trustworthy, modern, refreshing'
  },

  'sky-blue': {
    id: 'sky-blue',
    name: 'Sky Blue',
    emoji: '☁️',
    category: THEME_CATEGORIES.COOL,
    colors: {
      primary: '#0ea5e9',    // Sky blue
      accent: '#0284c7',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    lightMode: {
      background: '#f0f9ff',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['freelancer', 'tech-repair', 'plumbing'],
    mood: 'Open, friendly, dependable, clarity'
  },

  // ═══════════════════════════════════════════════════════════════
  // 🏠 HOME SERVICES THEMES
  // ═══════════════════════════════════════════════════════════════

  'safety-yellow': {
    id: 'safety-yellow',
    name: 'Safety Yellow',
    emoji: '⚠️',
    category: THEME_CATEGORIES.BOLD,
    colors: {
      primary: '#eab308',    // Yellow
      accent: '#ca8a04',
      background: '#0a0a0a',
      surface: '#171717',
      text: '#fafafa',
      textMuted: '#a3a3a3'
    },
    lightMode: {
      background: '#fefce8',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['electrician', 'auto-repair', 'plumbing'],
    mood: 'Caution, attention, emergency service, visibility'
  },

  'forest-green': {
    id: 'forest-green',
    name: 'Forest Green',
    emoji: '🌲',
    category: THEME_CATEGORIES.NATURAL,
    colors: {
      primary: '#16a34a',    // Green
      accent: '#15803d',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    lightMode: {
      background: '#f0fdf4',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['cleaning', 'pet-care', 'plumbing'],
    mood: 'Eco-friendly, natural, fresh, reliable'
  },

  'royal-blue': {
    id: 'royal-blue',
    name: 'Royal Blue',
    emoji: '💧',
    category: THEME_CATEGORIES.PROFESSIONAL,
    colors: {
      primary: '#2563eb',    // Blue
      accent: '#1d4ed8',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    lightMode: {
      background: '#eff6ff',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['plumbing', 'cleaning', 'tech-repair'],
    mood: 'Trust, water, cleanliness, professionalism'
  },

  // ═══════════════════════════════════════════════════════════════
  // 🐾 PET & LIFESTYLE THEMES
  // ═══════════════════════════════════════════════════════════════

  'playful-purple': {
    id: 'playful-purple',
    name: 'Playful Purple',
    emoji: '🐾',
    category: THEME_CATEGORIES.WARM,
    colors: {
      primary: '#7c3aed',    // Violet
      accent: '#6d28d9',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    lightMode: {
      background: '#f5f3ff',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['pet-care', 'salon'],
    mood: 'Fun, creative, premium, playful'
  },

  'sunset-coral': {
    id: 'sunset-coral',
    name: 'Sunset Coral',
    emoji: '🌅',
    category: THEME_CATEGORIES.WARM,
    colors: {
      primary: '#f43f5e',    // Rose/Coral
      accent: '#e11d48',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    lightMode: {
      background: '#fff1f2',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['pet-care', 'product-showcase', 'salon'],
    mood: 'Warm, friendly, approachable, caring'
  },

  // ═══════════════════════════════════════════════════════════════
  // 🛍️ RETAIL & E-COMMERCE THEMES
  // ═══════════════════════════════════════════════════════════════

  'artisan-orange': {
    id: 'artisan-orange',
    name: 'Artisan Orange',
    emoji: '🎨',
    category: THEME_CATEGORIES.WARM,
    colors: {
      primary: '#ea580c',    // Deep orange
      accent: '#c2410c',
      background: '#1c1917',
      surface: '#292524',
      text: '#fafaf9',
      textMuted: '#a8a29e'
    },
    lightMode: {
      background: '#fff7ed',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['product-showcase', 'restaurant'],
    mood: 'Handcrafted, artisan, warmth, creativity'
  },

  // ═══════════════════════════════════════════════════════════════
  // 💻 TECH & MODERN THEMES
  // ═══════════════════════════════════════════════════════════════

  'tech-cyan': {
    id: 'tech-cyan',
    name: 'Tech Cyan',
    emoji: '💻',
    category: THEME_CATEGORIES.MODERN,
    colors: {
      primary: '#06b6d4',    // Cyan
      accent: '#0891b2',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    lightMode: {
      background: '#ecfeff',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['tech-repair', 'freelancer'],
    mood: 'Modern, tech-savvy, innovative, clean'
  },

  'matrix-green': {
    id: 'matrix-green',
    name: 'Matrix Green',
    emoji: '🖥️',
    category: THEME_CATEGORIES.MODERN,
    colors: {
      primary: '#22c55e',    // Green
      accent: '#16a34a',
      background: '#0a0a0a',
      surface: '#171717',
      text: '#fafafa',
      textMuted: '#a3a3a3'
    },
    lightMode: {
      background: '#f0fdf4',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['tech-repair', 'freelancer'],
    mood: 'Tech, gaming, growth, success'
  },

  // ═══════════════════════════════════════════════════════════════
  // ⚫ CLASSIC & NEUTRAL THEMES
  // ═══════════════════════════════════════════════════════════════

  'elegant-slate': {
    id: 'elegant-slate',
    name: 'Elegant Slate',
    emoji: '⚫',
    category: THEME_CATEGORIES.CLASSIC,
    colors: {
      primary: '#475569',    // Slate
      accent: '#334155',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8'
    },
    lightMode: {
      background: '#f8fafc',
      surface: '#ffffff',
      text: '#1f2937',
      textMuted: '#6b7280'
    },
    industries: ['consultant', 'freelancer', 'restaurant'],
    mood: 'Sophisticated, neutral, timeless, versatile'
  },

  'charcoal-minimal': {
    id: 'charcoal-minimal',
    name: 'Charcoal Minimal',
    emoji: '🖤',
    category: THEME_CATEGORIES.CLASSIC,
    colors: {
      primary: '#374151',    // Gray
      accent: '#4b5563',
      background: '#111827',
      surface: '#1f2937',
      text: '#f9fafb',
      textMuted: '#9ca3af'
    },
    lightMode: {
      background: '#f9fafb',
      surface: '#ffffff',
      text: '#111827',
      textMuted: '#6b7280'
    },
    industries: ['consultant', 'freelancer', 'product-showcase'],
    mood: 'Minimal, clean, sophisticated, modern'
  }
};

/**
 * Industry-recommended themes
 * Maps each niche to its best-fit color themes
 */
export const INDUSTRY_THEMES = {
  restaurant: ['appetite-red', 'warm-gold', 'rustic-terracotta', 'elegant-slate'],
  salon: ['lavender-luxury', 'rose-blush', 'mint-wellness', 'warm-gold'],
  gym: ['power-red', 'electric-orange', 'neon-lime', 'matrix-green'],
  consultant: ['corporate-navy', 'ocean-teal', 'elegant-slate', 'charcoal-minimal'],
  freelancer: ['sky-blue', 'tech-cyan', 'ocean-teal', 'charcoal-minimal'],
  cleaning: ['mint-wellness', 'forest-green', 'royal-blue', 'ocean-teal'],
  electrician: ['safety-yellow', 'electric-orange', 'corporate-navy', 'royal-blue'],
  plumbing: ['royal-blue', 'sky-blue', 'corporate-navy', 'forest-green'],
  'auto-repair': ['power-red', 'safety-yellow', 'electric-orange', 'charcoal-minimal'],
  'pet-care': ['playful-purple', 'sunset-coral', 'mint-wellness', 'forest-green'],
  'tech-repair': ['tech-cyan', 'matrix-green', 'sky-blue', 'electric-orange'],
  'product-showcase': ['artisan-orange', 'sunset-coral', 'warm-gold', 'charcoal-minimal']
};

/**
 * Get all themes
 */
export function getAllThemes() {
  return Object.values(COLOR_THEMES);
}

/**
 * Get theme by ID
 */
export function getThemeById(themeId) {
  return COLOR_THEMES[themeId] || null;
}

/**
 * Get recommended themes for an industry
 */
export function getThemesForIndustry(industry) {
  const themeIds = INDUSTRY_THEMES[industry] || [];
  return themeIds.map(id => COLOR_THEMES[id]).filter(Boolean);
}

/**
 * Get themes by category
 */
export function getThemesByCategory(category) {
  return Object.values(COLOR_THEMES).filter(t => t.category === category);
}

/**
 * Get theme colors with mode (dark/light)
 */
export function getThemeColors(themeId, mode = 'dark') {
  const theme = COLOR_THEMES[themeId];
  if (!theme) return null;
  
  if (mode === 'light' && theme.lightMode) {
    return {
      ...theme.colors,
      ...theme.lightMode
    };
  }
  
  return theme.colors;
}

/**
 * Default theme
 */
export const DEFAULT_THEME = 'tech-cyan';

export default COLOR_THEMES;



