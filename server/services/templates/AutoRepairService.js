/**
 * Auto Repair Template Service
 * Handles auto repair-specific form submissions (service requests, quotes, etc.)
 */

import { BaseTemplateService } from './BaseTemplateService.js';

export class AutoRepairService extends BaseTemplateService {
  constructor() {
    super('auto-repair');
  }

  getFormType() {
    return 'quote_request';
  }

  getRequiredFields() {
    return ['name', 'email', 'phone', 'vehicleYear', 'vehicleMake', 'issueType'];
  }

  getNicheFields() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 30; i--) {
      years.push({ value: i.toString(), label: i.toString() });
    }

    return [
      {
        name: 'vehicleYear',
        label: 'Vehicle Year',
        type: 'select',
        required: true,
        options: years
      },
      {
        name: 'vehicleMake',
        label: 'Make & Model',
        type: 'text',
        required: true,
        placeholder: 'e.g., Toyota Camry'
      },
      {
        name: 'vehicleModel',
        label: 'Model (if different)',
        type: 'text',
        required: false,
        placeholder: 'Optional additional details'
      },
      {
        name: 'vehicleMileage',
        label: 'Mileage',
        type: 'number',
        required: false,
        placeholder: 'Current mileage'
      },
      {
        name: 'issueType',
        label: 'Service Needed',
        type: 'select',
        required: true,
        options: [
          { value: 'oil_change', label: 'Oil Change' },
          { value: 'brakes', label: 'Brake Service' },
          { value: 'tires', label: 'Tire Service' },
          { value: 'engine', label: 'Engine Repair' },
          { value: 'transmission', label: 'Transmission' },
          { value: 'diagnostic', label: 'Diagnostic Check' },
          { value: 'maintenance', label: 'Routine Maintenance' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        name: 'urgency',
        label: 'Urgency',
        type: 'select',
        required: false,
        options: [
          { value: 'routine', label: 'Routine - No rush' },
          { value: 'soon', label: 'Soon - Within a week' },
          { value: 'urgent', label: 'Urgent - As soon as possible' }
        ]
      },
      {
        name: 'symptoms',
        label: 'Symptoms/Description',
        type: 'textarea',
        required: false,
        placeholder: 'Describe the issue or symptoms'
      }
    ];
  }

  validateNicheFields(data) {
    const errors = [];
    const nicheData = {};

    // Vehicle year validation
    if (!data.vehicleYear) {
      errors.push('Vehicle year is required');
    } else {
      const year = parseInt(data.vehicleYear, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < currentYear - 30 || year > currentYear) {
        errors.push('Invalid vehicle year');
      } else {
        nicheData.vehicleYear = year;
      }
    }

    // Vehicle make validation
    if (!data.vehicleMake || data.vehicleMake.trim().length < 2) {
      errors.push('Vehicle make is required');
    } else {
      nicheData.vehicleMake = this.sanitizeInput(data.vehicleMake, 100);
    }

    // Vehicle model (optional)
    if (data.vehicleModel) {
      nicheData.vehicleModel = this.sanitizeInput(data.vehicleModel, 100);
    }

    // Mileage (optional)
    if (data.vehicleMileage) {
      const mileage = parseInt(data.vehicleMileage, 10);
      if (!isNaN(mileage) && mileage >= 0) {
        nicheData.vehicleMileage = mileage;
      }
    }

    // Issue type validation
    if (!data.issueType) {
      errors.push('Service type is required');
    } else {
      const validTypes = ['oil_change', 'brakes', 'tires', 'engine', 'transmission', 'diagnostic', 'maintenance', 'other'];
      if (!validTypes.includes(data.issueType)) {
        errors.push('Invalid service type selected');
      } else {
        nicheData.issueType = data.issueType;
      }
    }

    // Urgency (optional)
    if (data.urgency) {
      const validUrgencies = ['routine', 'soon', 'urgent'];
      if (!validUrgencies.includes(data.urgency)) {
        errors.push('Invalid urgency level');
      } else {
        nicheData.urgency = data.urgency;
      }
    }

    // Symptoms (optional)
    if (data.symptoms) {
      nicheData.symptoms = this.sanitizeInput(data.symptoms, 500);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return nicheData;
  }

  formatConfirmationEmail(data) {
    const subject = `New Service Request: ${data.vehicleYear} ${data.vehicleMake}`;
    
    const html = `
      <h2>New Auto Repair Service Request</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
      <p><strong>Vehicle:</strong> ${data.vehicleYear} ${data.vehicleMake}${data.vehicleModel ? ` ${data.vehicleModel}` : ''}</p>
      ${data.vehicleMileage ? `<p><strong>Mileage:</strong> ${data.vehicleMileage.toLocaleString()} miles</p>` : ''}
      <p><strong>Service Needed:</strong> ${data.issueType}</p>
      ${data.urgency ? `<p><strong>Urgency:</strong> ${data.urgency}</p>` : ''}
      ${data.symptoms ? `<p><strong>Description:</strong> ${data.symptoms}</p>` : ''}
      ${data.preferred_date ? `<p><strong>Preferred Date:</strong> ${data.preferred_date}</p>` : ''}
      ${data.preferred_time ? `<p><strong>Preferred Time:</strong> ${data.preferred_time}</p>` : ''}
      ${data.message ? `<p><strong>Additional Notes:</strong> ${data.message}</p>` : ''}
    `;

    return { subject, html };
  }
}

