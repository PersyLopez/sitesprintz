/**
 * Pet Care Template Service
 * Handles pet care/grooming-specific form submissions (appointments, services, etc.)
 */

import { BaseTemplateService } from './BaseTemplateService.js';

export class PetCareService extends BaseTemplateService {
  constructor() {
    super('pet-care');
  }

  getFormType() {
    return 'service_request';
  }

  getRequiredFields() {
    return ['name', 'email', 'phone', 'petType', 'serviceType', 'preferred_date', 'preferred_time'];
  }

  getNicheFields() {
    return [
      {
        name: 'petType',
        label: 'Pet Type',
        type: 'select',
        required: true,
        options: [
          { value: 'dog', label: 'Dog' },
          { value: 'cat', label: 'Cat' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        name: 'breed',
        label: 'Breed',
        type: 'text',
        required: false,
        placeholder: 'e.g., Golden Retriever, Persian'
      },
      {
        name: 'weight',
        label: 'Weight (lbs)',
        type: 'number',
        required: false,
        min: 1,
        max: 300,
        placeholder: 'Pet weight'
      },
      {
        name: 'serviceType',
        label: 'Service Type',
        type: 'select',
        required: true,
        options: [
          { value: 'grooming', label: 'Grooming' },
          { value: 'bath', label: 'Bath & Brush' },
          { value: 'nail_trim', label: 'Nail Trim' },
          { value: 'teeth_cleaning', label: 'Teeth Cleaning' },
          { value: 'full_service', label: 'Full Service' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        name: 'petName',
        label: 'Pet Name',
        type: 'text',
        required: false,
        placeholder: 'Name of pet'
      },
      {
        name: 'specialNotes',
        label: 'Special Notes',
        type: 'textarea',
        required: false,
        placeholder: 'Behavioral notes, special needs, etc.'
      }
    ];
  }

  validateNicheFields(data) {
    const errors = [];
    const nicheData = {};

    // Pet type validation
    if (!data.petType) {
      errors.push('Pet type is required');
    } else {
      const validTypes = ['dog', 'cat', 'other'];
      if (!validTypes.includes(data.petType)) {
        errors.push('Invalid pet type selected');
      } else {
        nicheData.petType = data.petType;
      }
    }

    // Service type validation
    if (!data.serviceType) {
      errors.push('Service type is required');
    } else {
      const validServices = ['grooming', 'bath', 'nail_trim', 'teeth_cleaning', 'full_service', 'other'];
      if (!validServices.includes(data.serviceType)) {
        errors.push('Invalid service type selected');
      } else {
        nicheData.serviceType = data.serviceType;
      }
    }

    // Breed (optional)
    if (data.breed) {
      nicheData.breed = this.sanitizeInput(data.breed, 100);
    }

    // Weight (optional)
    if (data.weight) {
      const weight = parseFloat(data.weight);
      if (!isNaN(weight) && weight > 0 && weight <= 300) {
        nicheData.weight = weight;
      }
    }

    // Pet name (optional)
    if (data.petName) {
      nicheData.petName = this.sanitizeInput(data.petName, 100);
    }

    // Special notes (optional)
    if (data.specialNotes) {
      nicheData.specialNotes = this.sanitizeInput(data.specialNotes, 500);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return nicheData;
  }

  formatConfirmationEmail(data) {
    const subject = `New Pet Care Appointment Request from ${data.name}`;
    
    const html = `
      <h2>New Pet Care Appointment Request</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
      <p><strong>Pet Type:</strong> ${data.petType}</p>
      ${data.petName ? `<p><strong>Pet Name:</strong> ${data.petName}</p>` : ''}
      ${data.breed ? `<p><strong>Breed:</strong> ${data.breed}</p>` : ''}
      ${data.weight ? `<p><strong>Weight:</strong> ${data.weight} lbs</p>` : ''}
      <p><strong>Service Type:</strong> ${data.serviceType}</p>
      <p><strong>Preferred Date:</strong> ${data.preferred_date || 'Not specified'}</p>
      <p><strong>Preferred Time:</strong> ${data.preferred_time || 'Not specified'}</p>
      ${data.specialNotes ? `<p><strong>Special Notes:</strong> ${data.specialNotes}</p>` : ''}
      ${data.message ? `<p><strong>Additional Notes:</strong> ${data.message}</p>` : ''}
    `;

    return { subject, html };
  }
}

