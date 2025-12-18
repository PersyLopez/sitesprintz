/**
 * Salon Template Service
 * Handles salon/spa-specific form submissions (appointments, services, etc.)
 */

import { BaseTemplateService } from './BaseTemplateService.js';

export class SalonService extends BaseTemplateService {
  constructor() {
    super('salon');
  }

  getFormType() {
    return 'service_request';
  }

  getRequiredFields() {
    return ['name', 'email', 'phone', 'serviceType', 'preferred_date', 'preferred_time'];
  }

  getNicheFields() {
    return [
      {
        name: 'serviceType',
        label: 'Service Type',
        type: 'select',
        required: true,
        options: [
          { value: 'haircut', label: 'Haircut' },
          { value: 'color', label: 'Hair Color' },
          { value: 'styling', label: 'Styling' },
          { value: 'treatment', label: 'Hair Treatment' },
          { value: 'nail', label: 'Nail Service' },
          { value: 'facial', label: 'Facial' },
          { value: 'massage', label: 'Massage' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        name: 'stylistPreference',
        label: 'Preferred Stylist',
        type: 'text',
        required: false,
        placeholder: 'Any stylist or specific name'
      },
      {
        name: 'addOns',
        label: 'Add-On Services',
        type: 'textarea',
        required: false,
        placeholder: 'Blow dry, deep conditioning, etc.'
      },
      {
        name: 'hairLength',
        label: 'Hair Length',
        type: 'select',
        required: false,
        options: [
          { value: '', label: 'N/A' },
          { value: 'short', label: 'Short' },
          { value: 'medium', label: 'Medium' },
          { value: 'long', label: 'Long' }
        ]
      }
    ];
  }

  validateNicheFields(data) {
    const errors = [];
    const nicheData = {};

    // Service type validation
    if (!data.serviceType) {
      errors.push('Service type is required');
    } else {
      const validServices = ['haircut', 'color', 'styling', 'treatment', 'nail', 'facial', 'massage', 'other'];
      if (!validServices.includes(data.serviceType)) {
        errors.push('Invalid service type selected');
      } else {
        nicheData.serviceType = data.serviceType;
      }
    }

    // Stylist preference (optional)
    if (data.stylistPreference) {
      nicheData.stylistPreference = this.sanitizeInput(data.stylistPreference, 100);
    }

    // Add-ons (optional)
    if (data.addOns) {
      nicheData.addOns = this.sanitizeInput(data.addOns, 300);
    }

    // Hair length (optional)
    if (data.hairLength) {
      const validLengths = ['short', 'medium', 'long', ''];
      if (!validLengths.includes(data.hairLength)) {
        errors.push('Invalid hair length selected');
      } else {
        nicheData.hairLength = data.hairLength;
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return nicheData;
  }

  formatConfirmationEmail(data) {
    const subject = `New Appointment Request from ${data.name}`;
    
    const html = `
      <h2>New Appointment Request</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
      <p><strong>Service Type:</strong> ${data.serviceType}</p>
      <p><strong>Preferred Date:</strong> ${data.preferred_date || 'Not specified'}</p>
      <p><strong>Preferred Time:</strong> ${data.preferred_time || 'Not specified'}</p>
      ${data.stylistPreference ? `<p><strong>Preferred Stylist:</strong> ${data.stylistPreference}</p>` : ''}
      ${data.hairLength ? `<p><strong>Hair Length:</strong> ${data.hairLength}</p>` : ''}
      ${data.addOns ? `<p><strong>Add-Ons:</strong> ${data.addOns}</p>` : ''}
      ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
    `;

    return { subject, html };
  }
}

