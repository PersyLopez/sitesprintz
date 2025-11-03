import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class TemplateValidator {
  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    this.errors = [];
    this.warnings = [];
  }

  async loadSchema() {
    const schemaPath = path.join(__dirname, 'starter-template-schema.json');
    const schemaContent = await fs.readFile(schemaPath, 'utf-8');
    return JSON.parse(schemaContent);
  }

  async loadTemplate(templatePath) {
    const content = await fs.readFile(templatePath, 'utf-8');
    return JSON.parse(content);
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  addError(message) {
    this.errors.push(message);
  }

  addWarning(message) {
    this.warnings.push(message);
  }

  validatePrices(template) {
    // Check services prices
    if (template.services?.items) {
      template.services.items.forEach((service, index) => {
        if (service.price !== undefined && typeof service.price !== 'number') {
          this.addError(`services.items[${index}].price must be a number, got ${typeof service.price}`);
        }
      });
    }

    // Check products prices
    if (template.products) {
      template.products.forEach((product, index) => {
        if (product.price !== undefined && typeof product.price !== 'number') {
          this.addError(`products[${index}].price must be a number, got ${typeof product.price}`);
        }
      });
    }
  }

  validateImages(template) {
    // Check hero image alt text
    if (template.hero?.image && !template.hero?.imageAlt) {
      this.addError('hero.image requires hero.imageAlt for accessibility');
    }

    // Check product images
    if (template.products) {
      template.products.forEach((product, index) => {
        if (product.image && !product.imageAlt) {
          this.addWarning(`products[${index}] has image but missing imageAlt`);
        }
      });
    }

    // Check team member images
    if (template.team?.members) {
      template.team.members.forEach((member, index) => {
        if (member.image && !member.imageAlt) {
          this.addWarning(`team.members[${index}] has image but missing imageAlt`);
        }
      });
    }
  }

  validateURLs(template) {
    // Validate phone numbers use tel: protocol
    if (template.settings?.productCtaHref) {
      const href = template.settings.productCtaHref;
      if (href.match(/^\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/)) {
        this.addWarning('settings.productCtaHref should use tel: protocol for phone numbers');
      }
    }

    // Validate email addresses use mailto: protocol
    if (template.settings?.productCtaHref) {
      const href = template.settings.productCtaHref;
      if (href.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) && !href.startsWith('mailto:')) {
        this.addWarning('settings.productCtaHref should use mailto: protocol for email addresses');
      }
    }
  }

  validateStarterTierSettings(template) {
    // Ensure Starter tier restrictions
    if (template.settings?.allowCheckout !== false) {
      this.addError('settings.allowCheckout must be false for Starter tier');
    }

    if (template.settings?.allowOrders !== true) {
      this.addError('settings.allowOrders must be true for order submission');
    }

    if (!template.settings?.orderNotificationEmail) {
      this.addWarning('settings.orderNotificationEmail is recommended for order notifications');
    }
  }

  validateContent(template) {
    // Check for placeholder/lorem content
    const checkPlaceholder = (text, field) => {
      if (!text) return;
      const lower = text.toLowerCase();
      if (lower.includes('lorem ipsum') || lower.includes('placeholder')) {
        this.addWarning(`${field} contains placeholder text`);
      }
    };

    checkPlaceholder(template.hero?.title, 'hero.title');
    checkPlaceholder(template.hero?.subtitle, 'hero.subtitle');
    checkPlaceholder(template.about?.body, 'about.body');

    // Check for generic business names
    const genericNames = ['acme', 'example', 'business name', 'company name'];
    const brandName = template.brand?.name?.toLowerCase();
    if (brandName && genericNames.some(generic => brandName.includes(generic))) {
      this.addWarning('brand.name appears to be a generic placeholder');
    }
  }

  validateNavigation(template) {
    // Check nav items point to valid sections
    const navItems = template.nav || [];
    navItems.forEach((item, index) => {
      if (item.href?.startsWith('#')) {
        const section = item.href.substring(1);
        // Common sections to check
        const validSections = ['top', 'home', 'services', 'products', 'about', 'team', 'testimonials', 'faq', 'contact', 'gallery'];
        if (!validSections.includes(section)) {
          this.addWarning(`nav[${index}].href points to #${section} which may not be a standard section`);
        }
      }
    });
  }

  async validate(templatePath) {
    try {
      this.log(`\n${'='.repeat(60)}`, 'cyan');
      this.log(`Validating: ${path.basename(templatePath)}`, 'cyan');
      this.log('='.repeat(60), 'cyan');

      // Load schema and template
      const schema = await this.loadSchema();
      const template = await this.loadTemplate(templatePath);

      // Validate against JSON Schema
      const validate = this.ajv.compile(schema);
      const valid = validate(template);

      if (!valid) {
        validate.errors.forEach(error => {
          const path = error.instancePath || 'root';
          const message = error.message;
          this.addError(`${path}: ${message}`);
        });
      }

      // Custom validations
      this.validatePrices(template);
      this.validateImages(template);
      this.validateURLs(template);
      this.validateStarterTierSettings(template);
      this.validateContent(template);
      this.validateNavigation(template);

      // Report results
      if (this.errors.length === 0 && this.warnings.length === 0) {
        this.log('\n✓ Template is valid!', 'green');
        return true;
      }

      if (this.errors.length > 0) {
        this.log(`\n✗ ${this.errors.length} Error(s) found:`, 'red');
        this.errors.forEach((error, index) => {
          this.log(`  ${index + 1}. ${error}`, 'red');
        });
      }

      if (this.warnings.length > 0) {
        this.log(`\n⚠ ${this.warnings.length} Warning(s):`, 'yellow');
        this.warnings.forEach((warning, index) => {
          this.log(`  ${index + 1}. ${warning}`, 'yellow');
        });
      }

      return this.errors.length === 0;

    } catch (error) {
      this.log(`\n✗ Failed to validate: ${error.message}`, 'red');
      return false;
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node validate-template.js <template-file.json>');
    console.log('  node validate-template.js <directory>  # validates all .json files');
    console.log('\nExamples:');
    console.log('  node validate-template.js public/data/templates/restaurant.json');
    console.log('  node validate-template.js public/data/templates/');
    process.exit(1);
  }

  const targetPath = path.resolve(args[0]);
  const stat = await fs.stat(targetPath);

  let filesToValidate = [];

  if (stat.isDirectory()) {
    // Validate all JSON files in directory
    const files = await fs.readdir(targetPath);
    filesToValidate = files
      .filter(file => file.endsWith('.json') && file !== 'index.json')
      .map(file => path.join(targetPath, file));
  } else {
    // Validate single file
    filesToValidate = [targetPath];
  }

  console.log(`\nValidating ${filesToValidate.length} template(s)...\n`);

  let allValid = true;
  const results = [];

  for (const file of filesToValidate) {
    const validator = new TemplateValidator();
    const isValid = await validator.validate(file);
    allValid = allValid && isValid;
    results.push({
      file: path.basename(file),
      valid: isValid,
      errors: validator.errors.length,
      warnings: validator.warnings.length
    });
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));

  results.forEach(result => {
    const status = result.valid ? `${colors.green}✓ VALID${colors.reset}` : `${colors.red}✗ INVALID${colors.reset}`;
    const details = result.errors > 0 ? ` (${result.errors} errors, ${result.warnings} warnings)` : '';
    console.log(`${status} ${result.file}${details}`);
  });

  const validCount = results.filter(r => r.valid).length;
  const invalidCount = results.length - validCount;

  console.log(`\n${validCount} valid, ${invalidCount} invalid`);

  process.exit(allValid ? 0 : 1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

