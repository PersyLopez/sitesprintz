/**
 * Cleaning Service Template Service
 * Handles cleaning service-specific form submissions (quotes, bookings, etc.)
 */

import { BaseTemplateService } from './BaseTemplateService.js';

export class CleaningService extends BaseTemplateService {
  constructor() {
    super('cleaning');
  }

  getFormType() {
    return 'quote_request';
  }

  getRequiredFields() {
    return ['name', 'email', 'phone', 'propertyType', 'squareFootage'];
  }

  getNicheFields() {
    return [
      {
        name: 'propertyType',
        label: 'Property Type',
        type: 'select',
        required: true,
        options: [
          { value: 'residential', label: 'Residential' },
          { value: 'commercial', label: 'Commercial' },
          { value: 'move_in', label: 'Move-In/Out' },
          { value: 'deep', label: 'Deep Clean' }
        ]
      },
      {
        name: 'squareFootage',
        label: 'Square Footage',
        type: 'number',
        required: true,
        min: 100,
        max: 50000,
        placeholder: 'Approximate square footage'
      },
      {
        name: 'frequency',
        label: 'Cleaning Frequency',
        type: 'select',
        required: false,
        options: [
          { value: 'one_time', label: 'One-Time' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'bi_weekly', label: 'Bi-Weekly' },
          { value: 'monthly', label: 'Monthly' }
        ]
      },
      {
        name: 'addOns',
        label: 'Add-On Services',
        type: 'textarea',
        required: false,
        placeholder: 'Windows, inside fridge, oven, etc.'
      },
      {
        name: 'ecoFriendly',
        label: 'Eco-Friendly Products',
        type: 'checkbox',
        required: false,
        note: 'Request eco-friendly cleaning products'
      }
    ];
  }

  validateNicheFields(data) {
    const errors = [];
    const nicheData = {};

    // Property type validation
    if (!data.propertyType) {
      errors.push('Property type is required');
    } else {
      const validTypes = ['residential', 'commercial', 'move_in', 'deep'];
      if (!validTypes.includes(data.propertyType)) {
        errors.push('Invalid property type selected');
      } else {
        nicheData.propertyType = data.propertyType;
      }
    }

    // Square footage validation
    if (!data.squareFootage) {
      errors.push('Square footage is required');
    } else {
      const sqft = parseInt(data.squareFootage, 10);
      if (isNaN(sqft) || sqft < 100 || sqft > 50000) {
        errors.push('Square footage must be between 100 and 50,000');
      } else {
        nicheData.squareFootage = sqft;
      }
    }

    // Frequency (optional)
    if (data.frequency) {
      const validFrequencies = ['one_time', 'weekly', 'bi_weekly', 'monthly'];
      if (!validFrequencies.includes(data.frequency)) {
        errors.push('Invalid frequency selected');
      } else {
        nicheData.frequency = data.frequency;
      }
    }

    // Add-ons (optional)
    if (data.addOns) {
      nicheData.addOns = this.sanitizeInput(data.addOns, 300);
    }

    // Eco-friendly (optional boolean)
    if (data.ecoFriendly !== undefined) {
      nicheData.ecoFriendly = Boolean(data.ecoFriendly);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return nicheData;
  }

  formatConfirmationEmail(data) {
    const subject = `New Cleaning Service Quote Request from ${data.name}`;
    
    const html = `
      <h2>New Cleaning Service Request</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
      <p><strong>Property Type:</strong> ${data.propertyType}</p>
      <p><strong>Square Footage:</strong> ${data.squareFootage.toLocaleString()} sq ft</p>
      ${data.frequency ? `<p><strong>Frequency:</strong> ${data.frequency}</p>` : ''}
      ${data.addOns ? `<p><strong>Add-Ons:</strong> ${data.addOns}</p>` : ''}
      ${data.ecoFriendly ? `<p><strong>Eco-Friendly:</strong> Yes</p>` : ''}
      ${data.preferred_date ? `<p><strong>Preferred Date:</strong> ${data.preferred_date}</p>` : ''}
      ${data.preferred_time ? `<p><strong>Preferred Time:</strong> ${data.preferred_time}</p>` : ''}
      ${data.message ? `<p><strong>Additional Notes:</strong> ${data.message}</p>` : ''}
    `;

    return { subject, html };
  }
}




