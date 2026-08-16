/**
 * Gym/Fitness Template Service
 * Handles gym/fitness-specific form submissions (memberships, tours, classes, etc.)
 */

import { BaseTemplateService } from './BaseTemplateService.js';

export class GymService extends BaseTemplateService {
  constructor() {
    super('gym');
  }

  getFormType() {
    return 'service_request';
  }

  getRequiredFields() {
    return ['name', 'email', 'phone'];
  }

  getNicheFields() {
    return [
      {
        name: 'membershipType',
        label: 'Interest Type',
        type: 'select',
        required: false,
        options: [
          { value: 'tour', label: 'Schedule a Tour' },
          { value: 'trial', label: 'Free Trial' },
          { value: 'membership', label: 'Membership Info' },
          { value: 'personal_training', label: 'Personal Training' },
          { value: 'class', label: 'Class Schedule' }
        ]
      },
      {
        name: 'fitnessGoals',
        label: 'Fitness Goals',
        type: 'textarea',
        required: false,
        placeholder: 'What are you hoping to achieve?'
      },
      {
        name: 'experienceLevel',
        label: 'Experience Level',
        type: 'select',
        required: false,
        options: [
          { value: 'beginner', label: 'Beginner' },
          { value: 'intermediate', label: 'Intermediate' },
          { value: 'advanced', label: 'Advanced' }
        ]
      },
      {
        name: 'preferredTime',
        label: 'Preferred Visit Time',
        type: 'select',
        required: false,
        options: [
          { value: 'morning', label: 'Morning' },
          { value: 'afternoon', label: 'Afternoon' },
          { value: 'evening', label: 'Evening' },
          { value: 'flexible', label: 'Flexible' }
        ]
      }
    ];
  }

  validateNicheFields(data) {
    const errors = [];
    const nicheData = {};

    // Membership type (optional)
    if (data.membershipType) {
      const validTypes = ['tour', 'trial', 'membership', 'personal_training', 'class'];
      if (!validTypes.includes(data.membershipType)) {
        errors.push('Invalid membership type selected');
      } else {
        nicheData.membershipType = data.membershipType;
      }
    }

    // Fitness goals (optional)
    if (data.fitnessGoals) {
      nicheData.fitnessGoals = this.sanitizeInput(data.fitnessGoals, 500);
    }

    // Experience level (optional)
    if (data.experienceLevel) {
      const validLevels = ['beginner', 'intermediate', 'advanced'];
      if (!validLevels.includes(data.experienceLevel)) {
        errors.push('Invalid experience level');
      } else {
        nicheData.experienceLevel = data.experienceLevel;
      }
    }

    // Preferred time (optional)
    if (data.preferredTime) {
      const validTimes = ['morning', 'afternoon', 'evening', 'flexible'];
      if (!validTimes.includes(data.preferredTime)) {
        errors.push('Invalid preferred time');
      } else {
        nicheData.preferredTime = data.preferredTime;
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return nicheData;
  }

  formatConfirmationEmail(data) {
    const subject = `New ${data.membershipType || 'Inquiry'} Request from ${data.name}`;
    
    const html = `
      <h2>New Gym/Fitness Inquiry</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
      ${data.membershipType ? `<p><strong>Interest Type:</strong> ${data.membershipType}</p>` : ''}
      ${data.experienceLevel ? `<p><strong>Experience Level:</strong> ${data.experienceLevel}</p>` : ''}
      ${data.fitnessGoals ? `<p><strong>Fitness Goals:</strong> ${data.fitnessGoals}</p>` : ''}
      ${data.preferredTime ? `<p><strong>Preferred Time:</strong> ${data.preferredTime}</p>` : ''}
      ${data.preferred_date ? `<p><strong>Preferred Date:</strong> ${data.preferred_date}</p>` : ''}
      ${data.preferred_time ? `<p><strong>Preferred Time:</strong> ${data.preferred_time}</p>` : ''}
      ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
    `;

    return { subject, html };
  }
}




