/**
 * Unified Template Loading Service
 * 
 * Architecture: ONE high-quality template per niche
 * Differentiation: Features are gated by subscription tier, not template quality
 */

import { TEMPLATE_FEATURES, getTemplateById } from '../utils/templateFeatures.js';

/**
 * Master template list - these are the 12 unified templates
 * Each template is high-quality with all features (features gated at render time)
 */
const MASTER_TEMPLATES = [
  'restaurant',
  'salon',
  'gym',
  'consultant',
  'freelancer',
  'cleaning',
  'electrician',
  'plumbing',
  'auto-repair',
  'pet-care',
  'tech-repair',
  'product-showcase',
  'tow-truck',
  'product-ordering'
];

/**
 * Template icon mapping
 */
const TEMPLATE_ICONS = {
  restaurant: '🍽️',
  salon: '💇',
  gym: '💪',
  consultant: '💼',
  freelancer: '👔',
  cleaning: '🧹',
  electrician: '⚡',
  plumbing: '🔧',
  'auto-repair': '🚗',
  'pet-care': '🐾',
  'tech-repair': '💻',
  'product-showcase': '🛍️',
  'tow-truck': '🚛',
  'product-ordering': '📦'
};

function normalizeTemplateTier(value) {
  const raw = String(value || 'starter').toLowerCase().trim();
  if (raw === 'pro' || raw === 'premium' || raw === 'business') return 'growth';
  if (raw === 'free') return 'trial';
  return raw;
}

export const templatesService = {
  /**
   * Get all available templates
   * Returns unified templates - same high-quality template for all tiers
   */
  async getTemplates() {
    try {
      // Try to fetch the unified index
      const response = await fetch('/data/templates/index.json');
      if (response.ok) {
        const data = await response.json();
        return data.templates.map(template => ({
          ...template,
          template: template.id,
          type: template.id,
          tier: normalizeTemplateTier(template.tier || template.plan),
          icon: TEMPLATE_ICONS[template.id] || '🌐'
        }));
      }

      const unified = await fetch('/data/templates/index-unified.json');
      if (unified.ok) {
        const data = await unified.json();
        return data.templates.map(template => ({
          ...template,
          template: template.id,
          type: template.id,
          tier: normalizeTemplateTier(template.tier || template.plan),
          icon: TEMPLATE_ICONS[template.id] || '🌐'
        }));
      }

      // Fallback: Build from master templates
      return await this.loadMasterTemplates();
    } catch (error) {
      console.error('Failed to load templates:', error);
      // Last resort fallback
      return await this.loadMasterTemplates();
    }
  },

  /**
   * Load master templates from individual JSON files
   * Uses the Pro templates as the master (highest quality)
   */
  async loadMasterTemplates() {
    const templateData = await Promise.all(
      MASTER_TEMPLATES.map(async (name) => {
        try {
          // Load ONLY base template (now Pro structure)
          const res = await fetch(`/data/templates/${name}.json`);
          
          if (!res.ok) {
            console.warn(`Template not found: ${name}`);
            return null;
          }
          
          const data = await res.json();
          const templateConfig = getTemplateById(name) || {};
          
          // Ensure tier is set
          if (!data.tier) data.tier = 'starter';
          
          return {
            id: name,
            template: name,
            name: data.brand?.name || this.formatTemplateName(name),
            description: data.brand?.tagline || data.hero?.subtitle || templateConfig.description || '',
            category: templateConfig.category || this.extractCategory(name),
            color: templateConfig.color || data.themeVars?.['color-primary'] || '#06b6d4',
            icon: TEMPLATE_ICONS[name] || '🌐',
            preview: data.hero?.image,
            businessName: data.brand?.name,
            heroImage: data.hero?.image,
            type: name,
            tier: normalizeTemplateTier(data.tier || 'starter'),
            // Include full normalized template data
            ...data
          };
        } catch (error) {
          console.warn(`Failed to load template: ${name}`, error);
          return null;
        }
      })
    );

    return templateData.filter(t => t !== null);
  },

  /**
   * Get a specific template by ID
   * @param {string} templateId - Template ID (e.g., 'restaurant')
   */
  async getTemplate(templateId) {
    try {
      // Normalize template ID (remove -pro suffix if present for backward compatibility)
      const normalizedId = templateId.replace(/-pro$/, '').replace(/-premium$/, '');
      
      // Load base template (now Pro structure)
      const response = await fetch(`/data/templates/${normalizedId}.json`);
      
      if (!response.ok) {
        throw new Error(`Template not found: ${templateId}`);
      }
      
      const data = await response.json();
      const templateConfig = getTemplateById(normalizedId) || {};
      
      // Ensure tier is set
      if (!data.tier) data.tier = 'starter';

      return {
        id: normalizedId,
        template: normalizedId,
        name: data.brand?.name || this.formatTemplateName(normalizedId),
        description: data.brand?.tagline || data.hero?.subtitle || '',
        category: templateConfig.category || this.extractCategory(normalizedId),
        color: templateConfig.color || data.themeVars?.['color-primary'] || '#06b6d4',
        icon: TEMPLATE_ICONS[normalizedId] || '🌐',
        tier: normalizeTemplateTier(data.tier || 'starter'),
        ...data
      };
    } catch (error) {
      console.error(`Failed to load template ${templateId}:`, error);
      throw error;
    }
  },

  /**
   * Get templates by category
   * @param {string} category - Category name
   */
  async getTemplatesByCategory(category) {
    const templates = await this.getTemplates();
    return templates.filter(t => 
      t.category?.toLowerCase() === category.toLowerCase()
    );
  },

  /**
   * Get all categories
   */
  async getCategories() {
    const templates = await this.getTemplates();
    const categories = [...new Set(templates.map(t => t.category).filter(Boolean))];
    return categories.sort();
  },

  /**
   * Get template icon
   * @param {string} templateName - Template name
   */
  getTemplateIcon(templateName) {
    const type = templateName.split('-')[0];
    return TEMPLATE_ICONS[type] || TEMPLATE_ICONS[templateName] || '🌐';
  },

  /**
   * Format template name for display
   * @param {string} name - Template ID
   */
  formatTemplateName(name) {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  /**
   * Extract category from template name
   * @param {string} name - Template ID
   */
  extractCategory(name) {
    const categoryMap = {
      restaurant: 'Food & Dining',
      salon: 'Beauty & Wellness',
      gym: 'Fitness & Health',
      consultant: 'Professional Services',
      freelancer: 'Professional Services',
      cleaning: 'Home Services',
      electrician: 'Home Services',
      plumbing: 'Home Services',
      'auto-repair': 'Automotive',
      'pet-care': 'Pet Services',
      'tech-repair': 'Technology',
      'product-showcase': 'Retail'
    };
    return categoryMap[name] || 'Other';
  },

  /**
   * Check if template supports a feature
   * @param {string} templateId - Template ID
   * @param {string} feature - Feature key
   */
  templateSupportsFeature(templateId, feature) {
    const config = TEMPLATE_FEATURES[templateId];
    if (!config) return false;
    return config.uses?.[feature] === true;
  }
};

export default templatesService;
