// Template loading service
import api from './api.js';

export const templatesService = {
  // Get all templates
  async getTemplates() {
    try {
      // Templates are served as static files from /data/templates/
      const templates = [
        'restaurant-pro',
        'salon-pro',
        'gym-pro',
        'restaurant',
        'salon',
        'gym',
        'freelancer',
        'consultant',
        'tech-repair',
        'cleaning',
        'pet-care',
      ];
      
      const templateData = await Promise.all(
        templates.map(async (name) => {
          try {
            const response = await fetch(`/data/templates/${name}.json`);
            if (response.ok) {
              return response.json();
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

  // Get specific template
  async getTemplate(templateName) {
    try {
      const response = await fetch(`/data/templates/${templateName}.json`);
      if (!response.ok) {
        throw new Error(`Template not found: ${templateName}`);
      }
      return response.json();
    } catch (error) {
      console.error(`Failed to load template ${templateName}:`, error);
      throw error;
    }
  },
};

export default templatesService;

