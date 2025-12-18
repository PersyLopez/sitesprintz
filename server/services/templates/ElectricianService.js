/**
 * Electrician Template Service
 * Handles electrician-specific form submissions (service requests, quotes, etc.)
 */

import { BaseTemplateService } from './BaseTemplateService.js';

export class ElectricianService extends BaseTemplateService {
  constructor() {
    super('electrician');
  }

  getFormType() {
    return 'quote_request';
  }

  getRequiredFields() {
    return ['name', 'email', 'phone', 'issueType'];
  }

  getNicheFields() {
    return [
      {
        name: 'issueType',
        label: 'Service Type',
        type: 'select',
        required: true,
        options: [
          { value: 'outlet', label: 'Outlet/Receptacle' },
          { value: 'panel', label: 'Panel Upgrade' },
          { value: 'wiring', label: 'Wiring Installation' },
          { value: 'lighting', label: 'Lighting Installation' },
          { value: 'smart_home', label: 'Smart Home/Solar' },
          { value: 'ev_charging', label: 'EV Charging Station' },
          { value: 'emergency', label: 'Emergency Repair' },
          { value: 'inspection', label: 'Electrical Inspection' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        name: 'urgency',
        label: 'Urgency',
        type: 'select',
        required: true,
        options: [
          { value: 'emergency', label: 'Emergency - 24/7' },
          { value: 'urgent', label: 'Urgent - Same day' },
          { value: 'soon', label: 'Soon - Within a week' },
          { value: 'routine', label: 'Routine - No rush' }
        ]
      },
      {
        name: 'propertyType',
        label: 'Property Type',
        type: 'select',
        required: false,
        options: [
          { value: 'residential', label: 'Residential' },
          { value: 'commercial', label: 'Commercial' },
          { value: 'industrial', label: 'Industrial' }
        ]
      },
      {
        name: 'photoUpload',
        label: 'Photo of Issue',
        type: 'file',
        required: false,
        accept: 'image/*',
        note: 'Optional: Upload a photo to help us understand the issue'
      },
      {
        name: 'description',
        label: 'Issue Description',
        type: 'textarea',
        required: true,
        placeholder: 'Describe the electrical issue or work needed'
      }
    ];
  }

  validateNicheFields(data) {
    const errors = [];
    const nicheData = {};

    // Issue type validation
    if (!data.issueType) {
      errors.push('Service type is required');
    } else {
      const validTypes = ['outlet', 'panel', 'wiring', 'lighting', 'smart_home', 'ev_charging', 'emergency', 'inspection', 'other'];
      if (!validTypes.includes(data.issueType)) {
        errors.push('Invalid service type selected');
      } else {
        nicheData.issueType = data.issueType;
      }
    }

    // Urgency validation
    if (!data.urgency) {
      errors.push('Urgency level is required');
    } else {
      const validUrgencies = ['emergency', 'urgent', 'soon', 'routine'];
      if (!validUrgencies.includes(data.urgency)) {
        errors.push('Invalid urgency level');
      } else {
        nicheData.urgency = data.urgency;
      }
    }

    // Property type (optional)
    if (data.propertyType) {
      const validTypes = ['residential', 'commercial', 'industrial'];
      if (!validTypes.includes(data.propertyType)) {
        errors.push('Invalid property type');
      } else {
        nicheData.propertyType = data.propertyType;
      }
    }

    // Description validation
    if (!data.description || data.description.trim().length < 10) {
      errors.push('Issue description must be at least 10 characters');
    } else {
      nicheData.description = this.sanitizeInput(data.description, 1000);
    }

    // Photo upload (optional - just store filename if provided)
    if (data.photoUpload) {
      nicheData.photoUpload = this.sanitizeInput(data.photoUpload, 255);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return nicheData;
  }

  formatConfirmationEmail(data) {
    const urgencyLabel = {
      emergency: 'EMERGENCY - 24/7',
      urgent: 'Urgent - Same day',
      soon: 'Soon - Within a week',
      routine: 'Routine - No rush'
    }[data.urgency] || data.urgency;

    const subject = `${urgencyLabel}: New Electrical Service Request from ${data.name}`;
    
    const html = `
      <h2>New Electrical Service Request</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
      <p><strong>Service Type:</strong> ${data.issueType}</p>
      <p><strong>Urgency:</strong> ${urgencyLabel}</p>
      ${data.propertyType ? `<p><strong>Property Type:</strong> ${data.propertyType}</p>` : ''}
      <p><strong>Description:</strong> ${data.description}</p>
      ${data.preferred_date ? `<p><strong>Preferred Date:</strong> ${data.preferred_date}</p>` : ''}
      ${data.preferred_time ? `<p><strong>Preferred Time:</strong> ${data.preferred_time}</p>` : ''}
      ${data.photoUpload ? `<p><strong>Photo:</strong> ${data.photoUpload}</p>` : ''}
      ${data.message ? `<p><strong>Additional Notes:</strong> ${data.message}</p>` : ''}
    `;

    return { subject, html };
  }
}

