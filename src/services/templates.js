// Template loading service
import api from './api.js';

export const templatesService = {
  // Get all templates
  async getTemplates() {
    try {
      // Fetch templates index from server
      const response = await fetch('/api/templates');
      if (response.ok) {
        const templates = await response.json();
        return templates;
      }
      
      // Fallback: load known templates manually
      const templateNames = [
        // Pro templates (newly standardized)
        'restaurant-pro',
        'salon-pro',
        'gym-pro',
        'consultant-pro',
        'freelancer-pro',
        'cleaning-pro',
        'electrician-pro',
        'plumbing-pro',
        'auto-repair-pro',
        'pet-care-pro',
        'tech-repair-pro',
        'product-showcase-pro',
        
        // Checkout templates  
        'restaurant',
        'salon',
        'gym',
        'consultant',
        'freelancer',
        'cleaning',
        'electrician',
        'plumber',
        'auto-repair',
        'pet-care',
        'photography',
        'tech-repair',
        
        // Starter templates - variations
        'restaurant-fine-dining',
        'restaurant-casual',
        'restaurant-fast-casual',
        'salon-hair',
        'salon-nails',
        'salon-spa',
        'gym-crossfit',
        'gym-yoga',
        'gym-personal-training',
        'consultant-corporate',
        'consultant-executive-coach',
        'consultant-small-business',
        'cleaning-residential',
        'cleaning-commercial',
        'cleaning-eco-friendly',
        'electrician-residential',
        'electrician-commercial',
        'electrician-industrial',
        'plumber-residential',
        'plumber-commercial',
        'plumber-emergency',
        'auto-repair-quick-service',
        'auto-repair-full-service',
        'auto-repair-performance',
        'pet-care-grooming',
        'pet-care-daycare',
        'pet-care-mobile',
      ];
      
      const templateData = await Promise.all(
        templateNames.map(async (name) => {
          try {
            const res = await fetch(`/data/templates/${name}.json`);
            if (res.ok) {
              const data = await res.json();
              
              // Determine tier from name
              let tier = 'Starter';
              if (name.endsWith('-pro')) {
                tier = 'Pro';
              } else if (!name.includes('-')) {
                tier = 'Checkout';
              }
              
              return {
                id: name,
                template: name,
                name: data.brand?.name || name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                description: data.brand?.tagline || data.hero?.subtitle || `${tier} template for ${name.split('-')[0]}`,
                tier: tier,
                icon: this.getTemplateIcon(name),
                preview: data.hero?.image,
                businessName: data.brand?.name,
                heroImage: data.hero?.image,
                type: name.split('-')[0],
                ...data,
              };
            }
            return null;
          } catch (error) {
            console.warn(`Failed to load template: ${name}`, error);
            return null;
          }
        })
      );
      
      return templateData.filter(t => t !== null);
    } catch (error) {
      console.error('Failed to load templates:', error);
      throw error;
    }
  },

  // Get template icon based on type
  getTemplateIcon(templateName) {
    const type = templateName.split('-')[0];
    const icons = {
      restaurant: '🍽️',
      salon: '💇',
      gym: '💪',
      consultant: '💼',
      freelancer: '👔',
      cleaning: '🧹',
      electrician: '⚡',
      plumber: '🔧',
      'auto-repair': '🚗',
      'pet-care': '🐾',
      photography: '📸',
      'tech-repair': '💻',
    };
    return icons[type] || '🌐';
  },

  // Get specific template
  async getTemplate(templateName) {
    try {
      const response = await fetch(`/data/templates/${templateName}.json`);
      if (!response.ok) {
        throw new Error(`Template not found: ${templateName}`);
      }
      const data = await response.json();
      
      return {
        id: templateName,
        template: templateName,
        ...data,
      };
    } catch (error) {
      console.error(`Failed to load template ${templateName}:`, error);
      throw error;
    }
  },
};

export default templatesService;

