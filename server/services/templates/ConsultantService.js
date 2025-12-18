/**
 * Consultant Template Service
 * Handles consultant-specific form submissions (consultation requests, project inquiries, etc.)
 */

import { BaseTemplateService } from './BaseTemplateService.js';

export class ConsultantService extends BaseTemplateService {
  constructor() {
    super('consultant');
  }

  getFormType() {
    return 'quote_request';
  }

  getRequiredFields() {
    return ['name', 'email', 'phone', 'projectType'];
  }

  getNicheFields() {
    return [
      {
        name: 'projectType',
        label: 'Project Type',
        type: 'select',
        required: true,
        options: [
          { value: 'strategy', label: 'Strategic Planning' },
          { value: 'digital', label: 'Digital Transformation' },
          { value: 'operations', label: 'Operations Improvement' },
          { value: 'growth', label: 'Growth Strategy' },
          { value: 'm_a', label: 'M&A / Due Diligence' },
          { value: 'change', label: 'Change Management' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        name: 'companySize',
        label: 'Company Size',
        type: 'select',
        required: false,
        options: [
          { value: 'startup', label: 'Startup (1-10)' },
          { value: 'small', label: 'Small (11-50)' },
          { value: 'medium', label: 'Medium (51-200)' },
          { value: 'large', label: 'Large (201-1000)' },
          { value: 'enterprise', label: 'Enterprise (1000+)' }
        ]
      },
      {
        name: 'budget',
        label: 'Budget Range',
        type: 'select',
        required: false,
        options: [
          { value: 'under_10k', label: 'Under $10K' },
          { value: '10k_25k', label: '$10K - $25K' },
          { value: '25k_50k', label: '$25K - $50K' },
          { value: '50k_100k', label: '$50K - $100K' },
          { value: 'over_100k', label: 'Over $100K' }
        ]
      },
      {
        name: 'timeline',
        label: 'Timeline',
        type: 'select',
        required: false,
        options: [
          { value: 'asap', label: 'ASAP' },
          { value: '1_month', label: 'Within 1 month' },
          { value: '3_months', label: 'Within 3 months' },
          { value: '6_months', label: 'Within 6 months' },
          { value: 'flexible', label: 'Flexible' }
        ]
      }
    ];
  }

  validateNicheFields(data) {
    const errors = [];
    const nicheData = {};

    // Project type validation
    if (!data.projectType) {
      errors.push('Project type is required');
    } else {
      const validTypes = ['strategy', 'digital', 'operations', 'growth', 'm_a', 'change', 'other'];
      if (!validTypes.includes(data.projectType)) {
        errors.push('Invalid project type selected');
      } else {
        nicheData.projectType = data.projectType;
      }
    }

    // Company size (optional)
    if (data.companySize) {
      const validSizes = ['startup', 'small', 'medium', 'large', 'enterprise'];
      if (!validSizes.includes(data.companySize)) {
        errors.push('Invalid company size');
      } else {
        nicheData.companySize = data.companySize;
      }
    }

    // Budget (optional)
    if (data.budget) {
      const validBudgets = ['under_10k', '10k_25k', '25k_50k', '50k_100k', 'over_100k'];
      if (!validBudgets.includes(data.budget)) {
        errors.push('Invalid budget range');
      } else {
        nicheData.budget = data.budget;
      }
    }

    // Timeline (optional)
    if (data.timeline) {
      const validTimelines = ['asap', '1_month', '3_months', '6_months', 'flexible'];
      if (!validTimelines.includes(data.timeline)) {
        errors.push('Invalid timeline');
      } else {
        nicheData.timeline = data.timeline;
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return nicheData;
  }

  formatConfirmationEmail(data) {
    const subject = `New Consultation Request: ${data.projectType} from ${data.name}`;
    
    const html = `
      <h2>New Consultation Request</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
      <p><strong>Project Type:</strong> ${data.projectType}</p>
      ${data.companySize ? `<p><strong>Company Size:</strong> ${data.companySize}</p>` : ''}
      ${data.budget ? `<p><strong>Budget Range:</strong> ${data.budget}</p>` : ''}
      ${data.timeline ? `<p><strong>Timeline:</strong> ${data.timeline}</p>` : ''}
      ${data.preferred_date ? `<p><strong>Preferred Date:</strong> ${data.preferred_date}</p>` : ''}
      ${data.preferred_time ? `<p><strong>Preferred Time:</strong> ${data.preferred_time}</p>` : ''}
      ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
    `;

    return { subject, html };
  }
}

