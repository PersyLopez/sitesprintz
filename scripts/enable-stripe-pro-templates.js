/**
 * Enable Stripe Connect for All Pro Templates
 * Updates settings to allow checkout and Stripe payments
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PRO_TEMPLATES = [
  { file: 'restaurant-pro.json', cta: 'Order Now', note: 'Secure online ordering powered by Stripe. Connect your account to start accepting payments.' },
  { file: 'salon-pro.json', cta: 'Buy Now', note: 'Sell products and gift cards online. Connect your Stripe account to enable checkout.' },
  { file: 'gym-pro.json', cta: 'Purchase', note: 'Sell memberships and products online. Connect your Stripe account to enable payments.' },
  { file: 'pet-care-pro.json', cta: 'Buy Now', note: 'Sell pet products and services. Connect your Stripe account to start selling.' },
  { file: 'auto-repair-pro.json', cta: 'Buy Now', note: 'Sell parts and services online. Connect your Stripe account to enable checkout.' },
  { file: 'tech-repair-pro.json', cta: 'Buy Now', note: 'Sell devices and services. Connect your Stripe account to start accepting payments.' },
  { file: 'plumbing-pro.json', cta: 'Buy Now', note: 'Sell fixtures and services online. Connect your Stripe account to enable checkout.' },
  { file: 'electrician-pro.json', cta: 'Buy Now', note: 'Sell devices and services. Connect your Stripe account to start accepting payments.' },
  { file: 'cleaning-pro.json', cta: 'Buy Now', note: 'Sell products and service packages. Connect your Stripe account to enable checkout.' },
  { file: 'consultant-pro.json', cta: 'Purchase', note: 'Sell consulting packages and courses. Connect your Stripe account to start selling.' },
  { file: 'freelancer-pro.json', cta: 'Hire Me', note: 'Sell services and packages online. Connect your Stripe account to enable payments.' },
  { file: 'product-showcase-pro.json', cta: 'Buy Now', note: 'Sell your products online with secure checkout. Connect your Stripe account to start selling.' }
];

class StripeEnabler {
  constructor() {
    this.results = [];
    this.errors = [];
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

  async enableStripeForTemplate(templateInfo) {
    const templatePath = path.join(__dirname, '../public/data/templates', templateInfo.file);
    
    try {
      // Read template
      const content = await fs.readFile(templatePath, 'utf-8');
      const template = JSON.parse(content);

      // Store original settings
      const originalSettings = { ...template.settings };

      // Update settings to enable Stripe
      template.settings = {
        ...template.settings,
        allowCheckout: true,
        allowOrders: true,
        stripeEnabled: true,
        productCta: templateInfo.cta,
        productNote: templateInfo.note
      };

      // Write back to file
      await fs.writeFile(templatePath, JSON.stringify(template, null, 2) + '\n');

      this.results.push({
        template: templateInfo.file,
        success: true,
        changes: {
          allowCheckout: { from: originalSettings.allowCheckout, to: true },
          allowOrders: { from: originalSettings.allowOrders, to: true },
          stripeEnabled: { from: originalSettings.stripeEnabled, to: true },
          productCta: { from: originalSettings.productCta, to: templateInfo.cta }
        }
      });

      return true;

    } catch (error) {
      this.errors.push({
        template: templateInfo.file,
        error: error.message
      });
      return false;
    }
  }

  async enableAllTemplates() {
    this.log('\n💳 ENABLING STRIPE CONNECT FOR ALL PRO TEMPLATES', 'info');
    this.log('='.repeat(60), 'info');

    let successCount = 0;
    let failCount = 0;

    for (const templateInfo of PRO_TEMPLATES) {
      this.log(`\nProcessing: ${templateInfo.file}`, 'info');
      
      const success = await this.enableStripeForTemplate(templateInfo);
      
      if (success) {
        successCount++;
        this.log(`✓ Enabled Stripe: ${templateInfo.file}`, 'success');
        this.log(`  CTA: "${templateInfo.cta}"`, 'info');
      } else {
        failCount++;
        this.log(`✗ Failed: ${templateInfo.file}`, 'error');
      }
    }

    this.log('\n' + '='.repeat(60), 'info');
    this.log('SUMMARY', 'info');
    this.log('='.repeat(60), 'info');
    this.log(`Total Templates: ${PRO_TEMPLATES.length}`, 'info');
    this.log(`Successfully Updated: ${successCount}`, 'success');
    this.log(`Failed: ${failCount}`, failCount > 0 ? 'error' : 'info');

    if (this.errors.length > 0) {
      this.log('\nErrors:', 'error');
      this.errors.forEach(err => {
        this.log(`  ${err.template}: ${err.error}`, 'error');
      });
    }

    // Generate report
    await this.generateReport();

    return { successCount, failCount };
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalTemplates: PRO_TEMPLATES.length,
      successCount: this.results.filter(r => r.success).length,
      failCount: this.errors.length,
      changes: this.results,
      errors: this.errors,
      stripeSettings: {
        allowCheckout: true,
        allowOrders: true,
        stripeEnabled: true,
        productCta: 'Varies by template',
        productNote: 'Varies by template'
      },
      notes: [
        'All Pro templates now support Stripe Connect payments',
        'Users must connect their Stripe account via Dashboard > Payment Settings',
        'Stripe Connect uses OAuth for secure, easy setup',
        'No transaction fees from SiteSprintz - only Stripe\'s standard 2.9% + $0.30',
        'Booking and checkout can coexist in the same template'
      ]
    };

    const reportPath = path.join(__dirname, '../PRO-TEMPLATES-STRIPE-ENABLED-REPORT.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    this.log('\n📄 Report saved: PRO-TEMPLATES-STRIPE-ENABLED-REPORT.json', 'success');
  }
}

// Main execution
async function main() {
  const enabler = new StripeEnabler();
  const result = await enabler.enableAllTemplates();

  if (result.failCount === 0) {
    enabler.log('\n🎉 SUCCESS! All Pro templates now support Stripe Connect!', 'success');
    enabler.log('\nNext steps:', 'info');
    enabler.log('  1. Test Stripe Connect flow in Dashboard', 'info');
    enabler.log('  2. Verify checkout works on published sites', 'info');
    enabler.log('  3. Update user documentation', 'info');
    process.exit(0);
  } else {
    enabler.log('\n⚠️  Some templates failed to update. Check errors above.', 'warning');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

