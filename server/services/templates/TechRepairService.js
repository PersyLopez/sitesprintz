/**
 * Tech Repair Template Service
 * Handles tech repair-specific form submissions (device repair requests, quotes, etc.)
 */

import { BaseTemplateService } from './BaseTemplateService.js';

export class TechRepairService extends BaseTemplateService {
  constructor() {
    super('tech-repair');
  }

  getFormType() {
    return 'quote_request';
  }

  getRequiredFields() {
    return ['name', 'email', 'phone', 'deviceType', 'issueType'];
  }

  getNicheFields() {
    return [
      {
        name: 'deviceType',
        label: 'Device Type',
        type: 'select',
        required: true,
        options: [
          { value: 'iphone', label: 'iPhone' },
          { value: 'android', label: 'Android Phone' },
          { value: 'ipad', label: 'iPad' },
          { value: 'tablet', label: 'Tablet' },
          { value: 'laptop', label: 'Laptop' },
          { value: 'desktop', label: 'Desktop PC' },
          { value: 'gaming', label: 'Gaming Console' },
          { value: 'other', label: 'Other Device' }
        ]
      },
      {
        name: 'deviceModel',
        label: 'Device Model',
        type: 'text',
        required: true,
        placeholder: 'e.g., iPhone 14 Pro, Samsung Galaxy S23'
      },
      {
        name: 'issueType',
        label: 'Issue Type',
        type: 'select',
        required: true,
        options: [
          { value: 'screen', label: 'Screen Repair' },
          { value: 'battery', label: 'Battery Replacement' },
          { value: 'water_damage', label: 'Water Damage' },
          { value: 'charging', label: 'Charging Port' },
          { value: 'software', label: 'Software Issue' },
          { value: 'performance', label: 'Performance Issue' },
          { value: 'data_recovery', label: 'Data Recovery' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        name: 'hasBackup',
        label: 'Do you have a backup?',
        type: 'select',
        required: false,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'unsure', label: 'Not sure' }
        ]
      },
      {
        name: 'description',
        label: 'Issue Description',
        type: 'textarea',
        required: true,
        placeholder: 'Describe what happened and the current issue'
      }
    ];
  }

  validateNicheFields(data) {
    const errors = [];
    const nicheData = {};

    // Device type validation
    if (!data.deviceType) {
      errors.push('Device type is required');
    } else {
      const validTypes = ['iphone', 'android', 'ipad', 'tablet', 'laptop', 'desktop', 'gaming', 'other'];
      if (!validTypes.includes(data.deviceType)) {
        errors.push('Invalid device type selected');
      } else {
        nicheData.deviceType = data.deviceType;
      }
    }

    // Device model validation
    if (!data.deviceModel || data.deviceModel.trim().length < 2) {
      errors.push('Device model is required');
    } else {
      nicheData.deviceModel = this.sanitizeInput(data.deviceModel, 100);
    }

    // Issue type validation
    if (!data.issueType) {
      errors.push('Issue type is required');
    } else {
      const validIssues = ['screen', 'battery', 'water_damage', 'charging', 'software', 'performance', 'data_recovery', 'other'];
      if (!validIssues.includes(data.issueType)) {
        errors.push('Invalid issue type selected');
      } else {
        nicheData.issueType = data.issueType;
      }
    }

    // Has backup (optional)
    if (data.hasBackup) {
      const validOptions = ['yes', 'no', 'unsure'];
      if (!validOptions.includes(data.hasBackup)) {
        errors.push('Invalid backup option');
      } else {
        nicheData.hasBackup = data.hasBackup;
      }
    }

    // Description validation
    if (!data.description || data.description.trim().length < 10) {
      errors.push('Issue description must be at least 10 characters');
    } else {
      nicheData.description = this.sanitizeInput(data.description, 500);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return nicheData;
  }

  formatConfirmationEmail(data) {
    const subject = `New Tech Repair Request: ${data.deviceType} ${data.deviceModel}`;
    
    const html = `
      <h2>New Tech Repair Request</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
      <p><strong>Device Type:</strong> ${data.deviceType}</p>
      <p><strong>Device Model:</strong> ${data.deviceModel}</p>
      <p><strong>Issue Type:</strong> ${data.issueType}</p>
      ${data.hasBackup ? `<p><strong>Has Backup:</strong> ${data.hasBackup}</p>` : ''}
      <p><strong>Description:</strong> ${data.description}</p>
      ${data.preferred_date ? `<p><strong>Preferred Date:</strong> ${data.preferred_date}</p>` : ''}
      ${data.preferred_time ? `<p><strong>Preferred Time:</strong> ${data.preferred_time}</p>` : ''}
      ${data.message ? `<p><strong>Additional Notes:</strong> ${data.message}</p>` : ''}
    `;

    return { subject, html };
  }
}

