/**
 * Base Template Service (Parent Class)
 * 
 * Provides shared functionality for all niche-specific template services.
 * Child classes must implement abstract methods for niche-specific logic.
 * 
 * Follows SOLID principles:
 * - Single Responsibility: Handles base form submission logic
 * - Open/Closed: Extend via inheritance, no modification needed
 * - Liskov Substitution: Any child can replace BaseTemplateService
 */

import { prisma } from '../../../database/db.js';
import { validateEmail, validatePhone, sanitizeString } from '../../utils/validators.js';
import { sendEmail } from '../../utils/email-service-wrapper.js';

export class BaseTemplateService {
  constructor(templateId) {
    this.templateId = templateId;
  }

  // ===== SHARED METHODS (all niches use these) =====
  
  /**
   * Create a submission with base and niche-specific data
   * @param {string} siteId - Site ID
   * @param {object} formData - Form data from request
   * @returns {Promise<object>} Created submission
   */
  async createSubmission(siteId, formData) {
    // Validate base fields (name, email, phone, message)
    const baseData = this.validateBaseFields(formData);
    
    // Validate niche-specific fields (implemented by child)
    const nicheData = this.validateNicheFields(formData);
    
    // Get form type (implemented by child)
    const formType = this.getFormType();
    
    // Create submission in database
    const submission = await prisma.submissions.create({
      data: {
        site_id: siteId,
        form_type: formType,
        name: baseData.name,
        email: baseData.email,
        phone: baseData.phone || null,
        message: baseData.message || null,
        data: {
          ...baseData,
          ...nicheData,
          preferred_date: formData.preferred_date || null,
          preferred_time: formData.preferred_time || null
        },
        status: 'unread',
        created_at: new Date()
      }
    });
    
    // Send notification email to site owner
    await this.sendNotificationEmail(siteId, { ...baseData, ...nicheData });
    
    return submission;
  }

  /**
   * Validate base fields that all forms require
   * @param {object} data - Form data
   * @returns {object} Validated base data
   * @throws {Error} If validation fails
   */
  validateBaseFields(data) {
    const errors = [];
    
    // Name validation
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Name is required');
    }
    const name = sanitizeString(data.name?.trim() || '', 200);
    if (name.length < 2) {
      errors.push('Name must be at least 2 characters');
    }
    
    // Email validation
    const emailValidation = validateEmail(data.email);
    if (!emailValidation.valid) {
      errors.push(emailValidation.error || 'Invalid email');
    }
    
    // Phone validation (optional)
    let phone = null;
    if (data.phone) {
      const phoneValidation = validatePhone(data.phone);
      if (!phoneValidation.valid) {
        errors.push(phoneValidation.error || 'Invalid phone number');
      } else {
        phone = phoneValidation.value;
      }
    }
    
    // Message validation (optional but recommended)
    const message = data.message ? sanitizeString(data.message, 2000) : null;
    
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    return {
      name,
      email: emailValidation.value,
      phone,
      message
    };
  }

  /**
   * Send notification email to site owner
   * @param {string} siteId - Site ID
   * @param {object} data - Submission data
   */
  async sendNotificationEmail(siteId, data) {
    try {
      // Get site and owner email
      const site = await prisma.sites.findUnique({
        where: { id: siteId },
        include: {
          users: {
            select: { email: true }
          }
        }
      });
      
      if (!site) {
        console.error(`Site not found: ${siteId}`);
        return;
      }
      
      // Parse site_data for business name
      let siteData = {};
      if (site.site_data) {
        siteData = typeof site.site_data === 'string' 
          ? JSON.parse(site.site_data) 
          : site.site_data;
      }
      
      const businessName = siteData.brand?.name || 'Your Business';
      const ownerEmail = siteData.published?.email || siteData.contact?.email || site.users?.email;
      
      if (!ownerEmail) {
        console.error(`No owner email found for site: ${siteId}`);
        return;
      }
      
      // Format email using child's implementation
      const emailContent = this.formatConfirmationEmail(data);
      
      // Send email to site owner
      await sendEmail({
        to: ownerEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text || emailContent.html.replace(/<[^>]*>/g, '')
      });
    } catch (error) {
      // Log but don't fail submission if email fails
      console.error('Failed to send notification email:', error);
    }
  }

  /**
   * Format price display from cents
   * @param {number} cents - Price in cents
   * @returns {string} Formatted price string
   */
  formatPriceDisplay(cents) {
    if (typeof cents !== 'number' || isNaN(cents)) {
      return '$0.00';
    }
    return `$${(cents / 100).toFixed(2)}`;
  }

  /**
   * Sanitize input text
   * @param {string} text - Text to sanitize
   * @param {number} maxLength - Maximum length
   * @returns {string} Sanitized text
   */
  sanitizeInput(text, maxLength = 1000) {
    return sanitizeString(text || '', maxLength);
  }

  // ===== ABSTRACT METHODS (child must implement) =====
  
  /**
   * Get form type identifier
   * @returns {string} Form type (e.g., 'service_request', 'quote_request')
   * @throws {Error} If not implemented
   */
  getFormType() {
    throw new Error(`Subclass must implement getFormType() for template: ${this.templateId}`);
  }

  /**
   * Get list of required field names
   * @returns {string[]} Array of required field names
   * @throws {Error} If not implemented
   */
  getRequiredFields() {
    throw new Error(`Subclass must implement getRequiredFields() for template: ${this.templateId}`);
  }

  /**
   * Get niche-specific field definitions
   * @returns {object[]} Array of field definition objects
   * @throws {Error} If not implemented
   */
  getNicheFields() {
    throw new Error(`Subclass must implement getNicheFields() for template: ${this.templateId}`);
  }

  /**
   * Validate niche-specific fields
   * @param {object} data - Form data
   * @returns {object} Validated niche data
   * @throws {Error} If validation fails
   */
  validateNicheFields(data) {
    throw new Error(`Subclass must implement validateNicheFields() for template: ${this.templateId}`);
  }

  /**
   * Format confirmation email content
   * @param {object} data - Submission data
   * @returns {object} Email content with subject, html, text
   * @throws {Error} If not implemented
   */
  formatConfirmationEmail(data) {
    throw new Error(`Subclass must implement formatConfirmationEmail() for template: ${this.templateId}`);
  }
}

