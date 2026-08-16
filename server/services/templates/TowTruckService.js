/**
 * Tow Truck Template Service
 * Handles tow truck/roadside assistance form submissions
 */

import { BaseTemplateService } from './BaseTemplateService.js';

export class TowTruckService extends BaseTemplateService {
  constructor() {
    super('tow-truck');
  }

  getFormType() {
    return 'service_request';
  }

  getRequiredFields() {
    return ['name', 'email', 'phone', 'serviceType', 'location'];
  }

  getNicheFields() {
    return [
      {
        name: 'serviceType',
        label: 'Service Type',
        type: 'select',
        required: true,
        options: [
          { value: 'tow', label: 'Towing Service' },
          { value: 'roadside', label: 'Roadside Assistance' },
          { value: 'lockout', label: 'Vehicle Lockout' },
          { value: 'battery', label: 'Battery Jump Start' },
          { value: 'flat_tire', label: 'Flat Tire Assistance' },
          { value: 'fuel_delivery', label: 'Fuel Delivery' },
          { value: 'other', label: 'Other Emergency' }
        ]
      },
      {
        name: 'location',
        label: 'Current Location / Zip Code',
        type: 'text',
        required: true,
        placeholder: 'Enter location or zip code'
      },
      {
        name: 'vehicleInfo',
        label: 'Vehicle Information',
        type: 'text',
        required: false,
        placeholder: 'Year, make, model (e.g., 2020 Honda Civic)'
      },
      {
        name: 'serviceArea',
        label: 'Service Area Coverage',
        type: 'textarea',
        required: false,
        placeholder: 'Our service area and coverage zones'
      },
      {
        name: 'urgency',
        label: 'Urgency Level',
        type: 'select',
        required: false,
        options: [
          { value: 'immediate', label: 'Immediate - Emergency' },
          { value: 'urgent', label: 'Urgent - Within 1 hour' },
          { value: 'normal', label: 'Normal - Same day' }
        ]
      }
    ];
  }

  validateNicheFields(data) {
    const errors = [];

    if (!data.serviceType) {
      errors.push('Service type is required');
    }

    if (!data.location || typeof data.location !== 'string' || data.location.trim().length === 0) {
      errors.push('Location or zip code is required');
    }

    if (errors.length > 0) {
      throw new Error(`Tow truck validation failed: ${errors.join(', ')}`);
    }

    return {
      serviceType: data.serviceType,
      location: data.location.trim(),
      vehicleInfo: data.vehicleInfo || null,
      serviceArea: data.serviceArea || null,
      urgency: data.urgency || 'normal'
    };
  }

  formatConfirmationEmail(data) {
    return {
      subject: `Tow Truck Service Request - ${data.name}`,
      html: `
        <h2>New Tow Truck Service Request</h2>
        <p><strong>Customer Name:</strong> ${data.name}</p>
        <p><strong>Phone:</strong> ${data.phone}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Service Type:</strong> ${data.serviceType}</p>
        <p><strong>Location:</strong> ${data.location}</p>
        ${data.vehicleInfo ? `<p><strong>Vehicle:</strong> ${data.vehicleInfo}</p>` : ''}
        ${data.urgency ? `<p><strong>Urgency:</strong> ${data.urgency}</p>` : ''}
        ${data.message ? `<p><strong>Additional Notes:</strong> ${data.message}</p>` : ''}
      `
    };
  }
}
