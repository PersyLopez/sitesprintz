/**
 * Restaurant Template Service
 * Handles restaurant-specific form submissions (reservations, catering, etc.)
 */

import { BaseTemplateService } from './BaseTemplateService.js';

export class RestaurantService extends BaseTemplateService {
  constructor() {
    super('restaurant');
  }

  getFormType() {
    return 'service_request';
  }

  getRequiredFields() {
    return ['name', 'email', 'phone', 'partySize', 'preferred_date', 'preferred_time'];
  }

  getNicheFields() {
    return [
      {
        name: 'partySize',
        label: 'Party Size',
        type: 'number',
        required: true,
        min: 1,
        max: 50,
        placeholder: 'Number of guests'
      },
      {
        name: 'occasion',
        label: 'Special Occasion',
        type: 'select',
        required: false,
        options: [
          { value: '', label: 'None' },
          { value: 'birthday', label: 'Birthday' },
          { value: 'anniversary', label: 'Anniversary' },
          { value: 'business', label: 'Business Meeting' },
          { value: 'date', label: 'Date Night' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        name: 'dietaryRestrictions',
        label: 'Dietary Restrictions',
        type: 'textarea',
        required: false,
        placeholder: 'Allergies, vegetarian, vegan, etc.'
      },
      {
        name: 'specialRequests',
        label: 'Special Requests',
        type: 'textarea',
        required: false,
        placeholder: 'Any special accommodations needed'
      }
    ];
  }

  validateNicheFields(data) {
    const errors = [];
    const nicheData = {};

    // Party size validation
    if (!data.partySize) {
      errors.push('Party size is required');
    } else {
      const partySize = parseInt(data.partySize, 10);
      if (isNaN(partySize) || partySize < 1 || partySize > 50) {
        errors.push('Party size must be between 1 and 50');
      } else {
        nicheData.partySize = partySize;
      }
    }

    // Occasion (optional)
    if (data.occasion) {
      const validOccasions = ['birthday', 'anniversary', 'business', 'date', 'other', ''];
      if (!validOccasions.includes(data.occasion)) {
        errors.push('Invalid occasion selected');
      } else {
        nicheData.occasion = data.occasion;
      }
    }

    // Dietary restrictions (optional)
    if (data.dietaryRestrictions) {
      nicheData.dietaryRestrictions = this.sanitizeInput(data.dietaryRestrictions, 500);
    }

    // Special requests (optional)
    if (data.specialRequests) {
      nicheData.specialRequests = this.sanitizeInput(data.specialRequests, 500);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return nicheData;
  }

  formatConfirmationEmail(data) {
    const subject = `New Reservation Request from ${data.name}`;
    
    const html = `
      <h2>New Reservation Request</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
      <p><strong>Party Size:</strong> ${data.partySize} guests</p>
      <p><strong>Preferred Date:</strong> ${data.preferred_date || 'Not specified'}</p>
      <p><strong>Preferred Time:</strong> ${data.preferred_time || 'Not specified'}</p>
      ${data.occasion ? `<p><strong>Occasion:</strong> ${data.occasion}</p>` : ''}
      ${data.dietaryRestrictions ? `<p><strong>Dietary Restrictions:</strong> ${data.dietaryRestrictions}</p>` : ''}
      ${data.specialRequests ? `<p><strong>Special Requests:</strong> ${data.specialRequests}</p>` : ''}
      ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
    `;

    return { subject, html };
  }
}

