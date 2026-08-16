/**
 * Product Ordering Template Service
 * Handles custom product and merchandise ordering form submissions
 */

import { BaseTemplateService } from './BaseTemplateService.js';

export class ProductOrderingService extends BaseTemplateService {
  constructor() {
    super('product-ordering');
  }

  getFormType() {
    return 'product_order';
  }

  getRequiredFields() {
    return ['name', 'email', 'phone', 'productSelection', 'quantity'];
  }

  getNicheFields() {
    return [
      {
        name: 'productSelection',
        label: 'Product Selection',
        type: 'select',
        required: true,
        options: [
          { value: 'custom_tshirt', label: 'Custom T-Shirt' },
          { value: 'custom_hoodie', label: 'Custom Hoodie' },
          { value: 'custom_mug', label: 'Custom Mug' },
          { value: 'custom_hat', label: 'Custom Hat' },
          { value: 'custom_bag', label: 'Custom Bag' },
          { value: 'custom_other', label: 'Other Custom Product' }
        ]
      },
      {
        name: 'quantity',
        label: 'Quantity',
        type: 'number',
        required: true,
        placeholder: 'Enter quantity'
      },
      {
        name: 'customization',
        label: 'Customization Details',
        type: 'textarea',
        required: true,
        placeholder: 'Size, color, text, design preferences, etc.'
      },
      {
        name: 'shippingOption',
        label: 'Shipping Preference',
        type: 'select',
        required: true,
        options: [
          { value: 'standard', label: 'Standard (5-7 business days)' },
          { value: 'expedited', label: 'Expedited (2-3 business days)' },
          { value: 'overnight', label: 'Overnight' },
          { value: 'local_pickup', label: 'Local Pickup' }
        ]
      },
      {
        name: 'budget',
        label: 'Budget Range',
        type: 'select',
        required: false,
        options: [
          { value: 'under_50', label: 'Under $50' },
          { value: '50_100', label: '$50 - $100' },
          { value: '100_500', label: '$100 - $500' },
          { value: 'over_500', label: 'Over $500' }
        ]
      },
      {
        name: 'attachments',
        label: 'Upload Design/Logo',
        type: 'file',
        required: false,
        placeholder: 'PNG, JPG, or PDF'
      }
    ];
  }

  validateNicheFields(data) {
    const errors = [];

    if (!data.productSelection) {
      errors.push('Product selection is required');
    }

    if (!data.quantity || isNaN(parseInt(data.quantity)) || parseInt(data.quantity) < 1) {
      errors.push('Valid quantity is required');
    }

    if (!data.customization || typeof data.customization !== 'string' || data.customization.trim().length === 0) {
      errors.push('Customization details are required');
    }

    if (!data.shippingOption) {
      errors.push('Shipping option is required');
    }

    if (errors.length > 0) {
      throw new Error(`Product ordering validation failed: ${errors.join(', ')}`);
    }

    return {
      productSelection: data.productSelection,
      quantity: parseInt(data.quantity),
      customization: data.customization.trim(),
      shippingOption: data.shippingOption,
      budget: data.budget || null
    };
  }

  formatConfirmationEmail(data) {
    return {
      subject: `Product Order Request - Order from ${data.name}`,
      html: `
        <h2>New Product Order Request</h2>
        <p><strong>Customer Name:</strong> ${data.name}</p>
        <p><strong>Phone:</strong> ${data.phone}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Product:</strong> ${data.productSelection}</p>
        <p><strong>Quantity:</strong> ${data.quantity}</p>
        <p><strong>Customization Details:</strong></p>
        <pre>${data.customization}</pre>
        <p><strong>Shipping Option:</strong> ${data.shippingOption}</p>
        ${data.budget ? `<p><strong>Budget Range:</strong> ${data.budget}</p>` : ''}
        ${data.message ? `<p><strong>Additional Notes:</strong> ${data.message}</p>` : ''}
      `
    };
  }
}
