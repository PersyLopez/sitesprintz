/**
 * Template Service Factory
 * 
 * Returns the appropriate service class for a given template ID.
 * Handles layout variations (e.g., 'restaurant-fine-dining' -> 'restaurant')
 */

import { RestaurantService } from './RestaurantService.js';
import { SalonService } from './SalonService.js';
import { GymService } from './GymService.js';
import { ConsultantService } from './ConsultantService.js';
import { FreelancerService } from './FreelancerService.js';
import { ElectricianService } from './ElectricianService.js';
import { PlumberService } from './PlumberService.js';
import { AutoRepairService } from './AutoRepairService.js';
import { CleaningService } from './CleaningService.js';
import { PetCareService } from './PetCareService.js';
import { TechRepairService } from './TechRepairService.js';
import { ProductShowcaseService } from './ProductShowcaseService.js';
import { BaseTemplateService } from './BaseTemplateService.js';

/**
 * Map of base template IDs to their service classes
 */
const SERVICE_MAP = {
  'restaurant': RestaurantService,
  'salon': SalonService,
  'gym': GymService,
  'consultant': ConsultantService,
  'freelancer': FreelancerService,
  'electrician': ElectricianService,
  'plumbing': PlumberService,
  'auto-repair': AutoRepairService,
  'cleaning': CleaningService,
  'pet-care': PetCareService,
  'tech-repair': TechRepairService,
  'product-showcase': ProductShowcaseService
};

/**
 * Get the appropriate template service for a given template ID
 * 
 * @param {string} templateId - Template ID (e.g., 'restaurant', 'restaurant-fine-dining')
 * @returns {BaseTemplateService} Instance of the appropriate service class
 * @throws {Error} If no service is found for the template
 */
export function getTemplateService(templateId) {
  if (!templateId || typeof templateId !== 'string') {
    throw new Error('Template ID is required and must be a string');
  }

  // Handle layout variations: 'restaurant-fine-dining' -> 'restaurant'
  // Split by '-' and take the first part as the base template
  const baseTemplate = templateId.split('-')[0];
  
  const ServiceClass = SERVICE_MAP[baseTemplate];
  
  if (!ServiceClass) {
    // Fallback: return a generic base service if template not found
    // This allows the system to still work with unknown templates
    console.warn(`No specific service found for template: ${templateId}, using base service`);
    return new BaseTemplateService(templateId);
  }
  
  return new ServiceClass();
}

/**
 * Get all available template IDs that have services
 * @returns {string[]} Array of template IDs
 */
export function getAvailableTemplateIds() {
  return Object.keys(SERVICE_MAP);
}

/**
 * Check if a template has a specific service implementation
 * @param {string} templateId - Template ID
 * @returns {boolean} True if service exists
 */
export function hasTemplateService(templateId) {
  const baseTemplate = templateId.split('-')[0];
  return SERVICE_MAP.hasOwnProperty(baseTemplate);
}

export default {
  getTemplateService,
  getAvailableTemplateIds,
  hasTemplateService
};

