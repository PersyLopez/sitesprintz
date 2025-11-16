/**
 * Stripe Payment Configuration Audit for Pro Templates
 * Ensures all Pro templates have payment/ordering configuration
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Pro template list
const PRO_TEMPLATES = [
  'restaurant-pro.json',
  'salon-pro.json',
  'gym-pro.json',
  'pet-care-pro.json',
  'auto-repair-pro.json',
  'tech-repair-pro.json',
  'plumbing-pro.json',
  'electrician-pro.json',
  'cleaning-pro.json',
  'consultant-pro.json',
  'freelancer-pro.json',
  'product-showcase-pro.json'
];

// Payment configuration requirements
const PAYMENT_CONFIG_TYPES = {
  BOOKING_ONLY: {
    description: 'Service-based with booking (no direct payments)',
    settings: {
      allowCheckout: false,
      allowOrders: false,
      bookingEnabled: true
    }
  },
  ORDERING_WITH_STRIPE: {
    description: 'Product-based with Stripe checkout',
    settings: {
      allowCheckout: true,
      allowOrders: true,
      stripeEnabled: true
    }
  },
  MIXED: {
    description: 'Services + optional product sales',
    settings: {
      allowCheckout: true, // For products
      allowOrders: true,
      bookingEnabled: true,  // For services
      stripeEnabled: true
    }
  }
};

class StripeConfigAuditor {
  constructor() {
    this.results = [];
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async loadTemplate(filename) {
    const templatePath = path.join(__dirname, '../public/data/templates', filename);
    const content = await fs.readFile(templatePath, 'utf-8');
    return JSON.parse(content);
  }

  determineBusinessType(template) {
    // Check if template has products (indicates potential for sales)
    const hasProducts = template.products && Array.isArray(template.products) && template.products.length > 0;
    const hasMenu = template.menu && template.menu.sections && template.menu.sections.length > 0;
    const hasServices = template.services && (
      (template.services.items && template.services.items.length > 0) ||
      (Array.isArray(template.services) && template.services.length > 0)
    );

    // Check for booking configuration
    const hasBooking = template.features?.bookingWidget?.enabled || template.settings?.bookingEnabled;

    if ((hasProducts || hasMenu) && !hasBooking) {
      return 'PRODUCT_BASED'; // Should support Stripe checkout
    } else if (hasBooking && !(hasProducts || hasMenu)) {
      return 'SERVICE_BOOKING'; // Booking only, no direct sales
    } else if ((hasProducts || hasMenu) && hasBooking) {
      return 'MIXED'; // Both booking and product sales
    } else {
      return 'SERVICE_ONLY'; // Services without booking (lead generation)
    }
  }

  analyzePaymentConfig(template, businessType) {
    const issues = [];
    const recommendations = [];
    const settings = template.settings || {};

    // Analyze based on business type
    switch (businessType) {
      case 'PRODUCT_BASED':
        // Should have Stripe checkout enabled
        if (!settings.allowCheckout) {
          issues.push('Product-based template should have allowCheckout: true');
        }
        if (settings.allowOrders === undefined) {
          issues.push('Missing allowOrders setting');
        }
        if (!settings.productCta) {
          recommendations.push('Add productCta (e.g., "Buy Now", "Add to Cart")');
        }
        break;

      case 'SERVICE_BOOKING':
        // Booking-only, no checkout needed
        if (settings.allowCheckout === true) {
          recommendations.push('Service-booking template typically has allowCheckout: false');
        }
        if (!settings.bookingEnabled) {
          recommendations.push('Add bookingEnabled: true');
        }
        break;

      case 'MIXED':
        // Should support both booking and checkout
        if (!settings.allowCheckout && (template.products || template.menu)) {
          recommendations.push('Consider allowing checkout for product/menu sales');
        }
        if (!settings.bookingEnabled && template.features?.bookingWidget) {
          recommendations.push('Add bookingEnabled: true');
        }
        break;

      case 'SERVICE_ONLY':
        // Lead generation, no payments
        if (settings.allowCheckout === undefined) {
          settings.allowCheckout = false;
        }
        if (settings.allowOrders === undefined) {
          settings.allowOrders = false;
        }
        break;
    }

    // Check for Stripe-specific configuration (if checkout is enabled)
    if (settings.allowCheckout === true) {
      // Pro templates should indicate Stripe is available
      // Note: Actual Stripe Connect happens at user level via OAuth
      recommendations.push('Ensure users connect Stripe via Dashboard > Payment Settings');
    }

    return { issues, recommendations, businessType };
  }

  async auditTemplate(filename) {
    this.log(`\n${'='.repeat(60)}`, 'info');
    this.log(`Auditing: ${filename}`, 'info');
    this.log('='.repeat(60), 'info');

    try {
      const template = await this.loadTemplate(filename);
      const businessType = this.determineBusinessType(template);
      const analysis = this.analyzePaymentConfig(template, businessType);

      const result = {
        template: filename,
        businessType,
        settings: template.settings || {},
        hasProducts: !!(template.products && template.products.length > 0),
        hasMenu: !!(template.menu && template.menu.sections),
        hasBooking: !!(template.features?.bookingWidget),
        issues: analysis.issues,
        recommendations: analysis.recommendations,
        stripeReady: template.settings?.allowCheckout === true
      };

      this.results.push(result);

      // Display results
      this.log(`\nBusiness Type: ${businessType}`, 'info');
      this.log(`Stripe Checkout: ${result.stripeReady ? 'ENABLED' : 'DISABLED'}`, 
        result.stripeReady ? 'success' : 'info');
      
      this.log(`\nCurrent Settings:`, 'info');
      this.log(`  allowCheckout: ${template.settings?.allowCheckout}`, 'info');
      this.log(`  allowOrders: ${template.settings?.allowOrders}`, 'info');
      this.log(`  bookingEnabled: ${template.settings?.bookingEnabled}`, 'info');

      if (analysis.issues.length > 0) {
        this.log(`\n✗ ${analysis.issues.length} Issue(s):`, 'error');
        analysis.issues.forEach((issue, i) => {
          this.log(`  ${i + 1}. ${issue}`, 'error');
        });
      }

      if (analysis.recommendations.length > 0) {
        this.log(`\n💡 ${analysis.recommendations.length} Recommendation(s):`, 'warning');
        analysis.recommendations.forEach((rec, i) => {
          this.log(`  ${i + 1}. ${rec}`, 'warning');
        });
      }

      if (analysis.issues.length === 0) {
        this.log('\n✓ Payment configuration is appropriate for business type', 'success');
      }

      return result;

    } catch (error) {
      this.log(`\n✗ Failed to audit: ${error.message}`, 'error');
      const result = {
        template: filename,
        error: error.message,
        issues: [error.message]
      };
      this.results.push(result);
      return result;
    }
  }

  printSummary() {
    this.log(`\n${'='.repeat(60)}`, 'info');
    this.log('STRIPE PAYMENT CONFIGURATION SUMMARY', 'info');
    this.log('='.repeat(60), 'info');

    const stripeEnabled = this.results.filter(r => r.stripeReady).length;
    const bookingOnly = this.results.filter(r => r.businessType === 'SERVICE_BOOKING').length;
    const mixed = this.results.filter(r => r.businessType === 'MIXED').length;
    const productBased = this.results.filter(r => r.businessType === 'PRODUCT_BASED').length;
    const totalIssues = this.results.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
    const totalRecommendations = this.results.reduce((sum, r) => sum + (r.recommendations?.length || 0), 0);

    this.log(`\nTotal Templates: ${this.results.length}`, 'info');
    this.log(`Stripe Checkout Enabled: ${stripeEnabled}`, 'info');
    this.log(`  - Product-Based: ${productBased}`, 'info');
    this.log(`  - Mixed (Products + Booking): ${mixed}`, 'info');
    this.log(`  - Booking Only: ${bookingOnly}`, 'info');
    this.log(`  - Service Only: ${this.results.length - stripeEnabled - bookingOnly - mixed}`, 'info');
    this.log(`\nTotal Issues: ${totalIssues}`, totalIssues > 0 ? 'error' : 'success');
    this.log(`Total Recommendations: ${totalRecommendations}`, totalRecommendations > 0 ? 'warning' : 'info');

    this.log('\n' + '-'.repeat(60), 'info');
    this.log('TEMPLATE BREAKDOWN:', 'info');
    this.log('-'.repeat(60), 'info');

    this.results.forEach(result => {
      const stripeStatus = result.stripeReady ? '💳 STRIPE' : (result.hasBooking ? '📅 BOOKING' : '📝 LEAD GEN');
      const issueCount = result.issues?.length || 0;
      const status = issueCount > 0 ? '⚠️' : '✓';
      
      this.log(`${status} ${stripeStatus} | ${result.template} (${result.businessType})`, 
        issueCount > 0 ? 'warning' : 'success');
    });

    this.log('', 'info');
  }

  async generateReport() {
    const report = {
      auditDate: new Date().toISOString(),
      totalTemplates: this.results.length,
      stripeEnabled: this.results.filter(r => r.stripeReady).length,
      bookingOnly: this.results.filter(r => r.businessType === 'SERVICE_BOOKING').length,
      mixed: this.results.filter(r => r.businessType === 'MIXED').length,
      productBased: this.results.filter(r => r.businessType === 'PRODUCT_BASED').length,
      totalIssues: this.results.reduce((sum, r) => sum + (r.issues?.length || 0), 0),
      totalRecommendations: this.results.reduce((sum, r) => sum + (r.recommendations?.length || 0), 0),
      results: this.results,
      notes: [
        'Stripe Connect is configured at the user level via OAuth',
        'Templates indicate payment capability via settings.allowCheckout',
        'Users connect their Stripe account in Dashboard > Payment Settings',
        'Product-based templates should have allowCheckout: true',
        'Service-based templates typically use booking only'
      ]
    };

    const reportPath = path.join(__dirname, '../PRO-TEMPLATE-STRIPE-AUDIT.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    this.log(`\n📄 Detailed report saved to: PRO-TEMPLATE-STRIPE-AUDIT.json`, 'success');

    return report;
  }
}

// Main execution
async function main() {
  const auditor = new StripeConfigAuditor();

  auditor.log('\n💳 PRO TEMPLATE STRIPE CONFIGURATION AUDIT', 'info');
  auditor.log('Analyzing payment/ordering configuration for all Pro templates...', 'info');

  // Audit each template
  for (const template of PRO_TEMPLATES) {
    await auditor.auditTemplate(template);
  }

  // Print summary
  auditor.printSummary();

  // Generate detailed report
  await auditor.generateReport();

  auditor.log('\n📚 IMPORTANT NOTES:', 'info');
  auditor.log('  • Stripe Connect is configured at USER level (not template level)', 'info');
  auditor.log('  • Users connect via Dashboard > Payment Settings (OAuth flow)', 'info');
  auditor.log('  • Templates indicate payment capability via settings.allowCheckout', 'info');
  auditor.log('  • Product-based Pro templates SHOULD support Stripe checkout', 'info');
  auditor.log('  • Service-based Pro templates typically use booking only', 'info');

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

