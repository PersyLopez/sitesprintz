/**
 * Product Showcase Template Service
 * Handles product showcase-specific form submissions (product inquiries, orders, etc.)
 */

import { BaseTemplateService } from './BaseTemplateService.js';

export class ProductShowcaseService extends BaseTemplateService {
  constructor() {
    super('product-showcase');
  }

  getFormType() {
    return 'service_request';
  }

  getRequiredFields() {
    return ['name', 'email', 'phone', 'productInterest'];
  }

  getNicheFields() {
    return [
      {
        name: 'productInterest',
        label: 'Product Interest',
        type: 'text',
        required: true,
        placeholder: 'Which product(s) are you interested in?'
      },
      {
        name: 'quantity',
        label: 'Quantity',
        type: 'number',
        required: false,
        min: 1,
        placeholder: 'How many?'
      },
      {
        name: 'customization',
        label: 'Customization Requests',
        type: 'textarea',
        required: false,
        placeholder: 'Any custom colors, sizes, or modifications?'
      },
      {
        name: 'shippingAddress',
        label: 'Shipping Address',
        type: 'textarea',
        required: false,
        placeholder: 'If ready to order, provide shipping address'
      }
    ];
  }

  validateNicheFields(data) {
    const errors = [];
    const nicheData = {};

    // Product interest validation
    if (!data.productInterest || data.productInterest.trim().length < 2) {
      errors.push('Product interest is required');
    } else {
      nicheData.productInterest = this.sanitizeInput(data.productInterest, 200);
    }

    // Quantity (optional)
    if (data.quantity) {
      const quantity = parseInt(data.quantity, 10);
      if (!isNaN(quantity) && quantity > 0) {
        nicheData.quantity = quantity;
      }
    }

    // Customization (optional)
    if (data.customization) {
      nicheData.customization = this.sanitizeInput(data.customization, 500);
    }

    // Shipping address (optional)
    if (data.shippingAddress) {
      nicheData.shippingAddress = this.sanitizeInput(data.shippingAddress, 500);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return nicheData;
  }

  formatConfirmationEmail(data) {
    const subject = `New Product Inquiry from ${data.name}`;
    
    const html = `
      <h2>New Product Inquiry</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
      <p><strong>Product Interest:</strong> ${data.productInterest}</p>
      ${data.quantity ? `<p><strong>Quantity:</strong> ${data.quantity}</p>` : ''}
      ${data.customization ? `<p><strong>Customization:</strong> ${data.customization}</p>` : ''}
      ${data.shippingAddress ? `<p><strong>Shipping Address:</strong> ${data.shippingAddress}</p>` : ''}
      ${data.preferred_date ? `<p><strong>Preferred Date:</strong> ${data.preferred_date}</p>` : ''}
      ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
    `;

    return { subject, html };
  }
}




