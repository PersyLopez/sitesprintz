/**
 * Pro Template Features Audit Script
 * Validates that all Pro templates have required Pro features
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Required Pro features
const REQUIRED_PRO_FEATURES = {
  'features.bookingWidget': {
    required: true,
    type: 'object',
    properties: ['enabled', 'provider', 'url', 'embedMode']
  },
  'features.reviews': {
    required: true,
    type: 'object',
    properties: ['enabled', 'placeId', 'maxReviews', 'showOverallRating']
  },
  'features.ownerDashboard': {
    required: true,
    type: 'boolean',
    value: true
  },
  'features.analytics': {
    required: true,
    type: 'boolean',
    value: true
  }
};

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

class ProTemplateAuditor {
  constructor() {
    this.results = [];
    this.errors = [];
    this.warnings = [];
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async loadTemplate(filename) {
    const templatePath = path.join(__dirname, '../public/data/templates', filename);
    const content = await fs.readFile(templatePath, 'utf-8');
    return JSON.parse(content);
  }

  checkFeatureExists(template, featurePath) {
    const parts = featurePath.split('.');
    let current = template;
    
    for (const part of parts) {
      if (!current || typeof current !== 'object' || !(part in current)) {
        return { exists: false, value: undefined };
      }
      current = current[part];
    }
    
    return { exists: true, value: current };
  }

  validateProFeatures(template, templateName) {
    const issues = [];
    const warnings = [];

    // Check if features object exists
    if (!template.features || typeof template.features !== 'object') {
      issues.push('Missing features object');
      return { issues, warnings, hasRequiredFeatures: false };
    }

    // Check each required feature
    for (const [featurePath, requirements] of Object.entries(REQUIRED_PRO_FEATURES)) {
      const { exists, value } = this.checkFeatureExists(template, featurePath);

      if (!exists) {
        issues.push(`Missing required feature: ${featurePath}`);
        continue;
      }

      // Type validation
      if (requirements.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== requirements.type) {
          issues.push(`${featurePath} should be ${requirements.type}, got ${actualType}`);
          continue;
        }
      }

      // Value validation (for booleans)
      if (requirements.value !== undefined && value !== requirements.value) {
        issues.push(`${featurePath} should be ${requirements.value}, got ${value}`);
      }

      // Properties validation (for objects)
      if (requirements.properties && typeof value === 'object') {
        for (const prop of requirements.properties) {
          if (!(prop in value)) {
            issues.push(`${featurePath}.${prop} is missing`);
          }
        }

        // Special validation for embedMode
        if (featurePath === 'features.bookingWidget' && 'embedMode' in value && value.embedMode !== true) {
          warnings.push(`${featurePath}.embedMode should be true for iframe embedding`);
        }
      }
    }

    // Additional checks
    if (template.features.bookingWidget?.enabled && !template.features.bookingWidget.provider) {
      warnings.push('bookingWidget is enabled but no provider specified');
    }

    if (template.features.reviews?.enabled && !template.features.reviews.placeId) {
      warnings.push('reviews are enabled but no placeId specified');
    }

    return {
      issues,
      warnings,
      hasRequiredFeatures: issues.length === 0
    };
  }

  async auditTemplate(filename) {
    this.log(`\n${'='.repeat(60)}`, 'info');
    this.log(`Auditing: ${filename}`, 'info');
    this.log('='.repeat(60), 'info');

    try {
      const template = await this.loadTemplate(filename);
      const validation = this.validateProFeatures(template, filename);

      const result = {
        template: filename,
        passed: validation.hasRequiredFeatures,
        issues: validation.issues,
        warnings: validation.warnings
      };

      this.results.push(result);

      if (validation.issues.length === 0 && validation.warnings.length === 0) {
        this.log('✓ All Pro features present and valid', 'success');
      } else {
        if (validation.issues.length > 0) {
          this.log(`\n✗ ${validation.issues.length} Issue(s):`, 'error');
          validation.issues.forEach((issue, i) => {
            this.log(`  ${i + 1}. ${issue}`, 'error');
          });
        }

        if (validation.warnings.length > 0) {
          this.log(`\n⚠ ${validation.warnings.length} Warning(s):`, 'warning');
          validation.warnings.forEach((warning, i) => {
            this.log(`  ${i + 1}. ${warning}`, 'warning');
          });
        }
      }

      return result;

    } catch (error) {
      this.log(`\n✗ Failed to audit: ${error.message}`, 'error');
      const result = {
        template: filename,
        passed: false,
        issues: [error.message],
        warnings: []
      };
      this.results.push(result);
      return result;
    }
  }

  printSummary() {
    this.log(`\n${'='.repeat(60)}`, 'info');
    this.log('AUDIT SUMMARY', 'info');
    this.log('='.repeat(60), 'info');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.length - passed;
    const totalIssues = this.results.reduce((sum, r) => sum + r.issues.length, 0);
    const totalWarnings = this.results.reduce((sum, r) => sum + r.warnings.length, 0);

    this.log(`\nTotal Templates: ${this.results.length}`, 'info');
    this.log(`Passed: ${passed}`, passed === this.results.length ? 'success' : 'info');
    this.log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    this.log(`Total Issues: ${totalIssues}`, totalIssues > 0 ? 'error' : 'success');
    this.log(`Total Warnings: ${totalWarnings}`, totalWarnings > 0 ? 'warning' : 'info');

    this.log('\n' + '-'.repeat(60), 'info');
    this.log('TEMPLATE RESULTS:', 'info');
    this.log('-'.repeat(60), 'info');

    this.results.forEach(result => {
      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      const color = result.passed ? 'success' : 'error';
      const details = result.issues.length > 0 ? ` (${result.issues.length} issues, ${result.warnings.length} warnings)` : '';
      this.log(`${status} ${result.template}${details}`, color);
    });

    this.log('', 'info');
  }

  async generateReport() {
    const report = {
      auditDate: new Date().toISOString(),
      totalTemplates: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => r.passed === false).length,
      totalIssues: this.results.reduce((sum, r) => sum + r.issues.length, 0),
      totalWarnings: this.results.reduce((sum, r) => sum + r.warnings.length, 0),
      results: this.results,
      requiredFeatures: REQUIRED_PRO_FEATURES
    };

    const reportPath = path.join(__dirname, '../PRO-TEMPLATE-AUDIT-REPORT.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    this.log(`\n📄 Detailed report saved to: PRO-TEMPLATE-AUDIT-REPORT.json`, 'success');

    return report;
  }
}

// Main execution
async function main() {
  const auditor = new ProTemplateAuditor();

  auditor.log('\n🔍 PRO TEMPLATE FEATURES AUDIT', 'info');
  auditor.log('Checking all Pro templates for required features...', 'info');

  // Audit each template
  for (const template of PRO_TEMPLATES) {
    await auditor.auditTemplate(template);
  }

  // Print summary
  auditor.printSummary();

  // Generate detailed report
  const report = await auditor.generateReport();

  // Exit with appropriate code
  process.exit(report.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

