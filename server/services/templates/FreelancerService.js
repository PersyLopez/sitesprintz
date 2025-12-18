/**
 * Freelancer Template Service
 * Handles freelancer-specific form submissions (project inquiries, quotes, etc.)
 */

import { BaseTemplateService } from './BaseTemplateService.js';

export class FreelancerService extends BaseTemplateService {
  constructor() {
    super('freelancer');
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
          { value: 'web_design', label: 'Web Design' },
          { value: 'web_development', label: 'Web Development' },
          { value: 'branding', label: 'Branding/Identity' },
          { value: 'graphic_design', label: 'Graphic Design' },
          { value: 'ui_ux', label: 'UI/UX Design' },
          { value: 'content', label: 'Content Writing' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        name: 'budget',
        label: 'Budget Range',
        type: 'select',
        required: false,
        options: [
          { value: 'under_1k', label: 'Under $1K' },
          { value: '1k_5k', label: '$1K - $5K' },
          { value: '5k_10k', label: '$5K - $10K' },
          { value: '10k_25k', label: '$10K - $25K' },
          { value: 'over_25k', label: 'Over $25K' }
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
          { value: '2_3_months', label: '2-3 months' },
          { value: 'flexible', label: 'Flexible' }
        ]
      },
      {
        name: 'projectScope',
        label: 'Project Scope',
        type: 'textarea',
        required: false,
        placeholder: 'Brief description of your project needs'
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
      const validTypes = ['web_design', 'web_development', 'branding', 'graphic_design', 'ui_ux', 'content', 'other'];
      if (!validTypes.includes(data.projectType)) {
        errors.push('Invalid project type selected');
      } else {
        nicheData.projectType = data.projectType;
      }
    }

    // Budget (optional)
    if (data.budget) {
      const validBudgets = ['under_1k', '1k_5k', '5k_10k', '10k_25k', 'over_25k'];
      if (!validBudgets.includes(data.budget)) {
        errors.push('Invalid budget range');
      } else {
        nicheData.budget = data.budget;
      }
    }

    // Timeline (optional)
    if (data.timeline) {
      const validTimelines = ['asap', '1_month', '2_3_months', 'flexible'];
      if (!validTimelines.includes(data.timeline)) {
        errors.push('Invalid timeline');
      } else {
        nicheData.timeline = data.timeline;
      }
    }

    // Project scope (optional)
    if (data.projectScope) {
      nicheData.projectScope = this.sanitizeInput(data.projectScope, 1000);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return nicheData;
  }

  formatConfirmationEmail(data) {
    const subject = `New Project Inquiry: ${data.projectType} from ${data.name}`;
    
    const html = `
      <h2>New Project Inquiry</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
      <p><strong>Project Type:</strong> ${data.projectType}</p>
      ${data.budget ? `<p><strong>Budget Range:</strong> ${data.budget}</p>` : ''}
      ${data.timeline ? `<p><strong>Timeline:</strong> ${data.timeline}</p>` : ''}
      ${data.projectScope ? `<p><strong>Project Scope:</strong> ${data.projectScope}</p>` : ''}
      ${data.preferred_date ? `<p><strong>Preferred Date:</strong> ${data.preferred_date}</p>` : ''}
      ${data.preferred_time ? `<p><strong>Preferred Time:</strong> ${data.preferred_time}</p>` : ''}
      ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
    `;

    return { subject, html };
  }
}

