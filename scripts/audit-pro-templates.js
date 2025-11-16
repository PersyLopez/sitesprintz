#!/usr/bin/env node
/**
 * Pro Template Audit & Standardization Script
 * 
 * Ensures all Pro templates have:
 * - Consistent features configuration
 * - Required Pro features enabled
 * - Proper schema structure
 * - Analytics enabled
 * - Owner dashboard enabled
 * - Reviews configuration present
 * - Booking widget configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.join(__dirname, '../public/data/templates');

// Required features schema for Pro templates
const REQUIRED_PRO_FEATURES = {
  bookingWidget: {
    enabled: false, // Can be false, but must be present
    provider: '',
    url: '',
    embedMode: true
  },
  reviews: {
    enabled: false,
    placeId: '',
    maxReviews: 5,
    showOverallRating: true
  },
  ownerDashboard: true,
  analytics: true
};

class TemplateAuditor {
  constructor() {
    this.issues = [];
    this.fixed = [];
    this.templates = [];
  }

  /**
   * Run full audit on all Pro templates
   */
  async audit() {
    console.log('🔍 Starting Pro Template Audit...\n');

    const files = fs.readdirSync(TEMPLATES_DIR)
      .filter(f => f.endsWith('-pro.json'));

    console.log(`Found ${files.length} Pro templates\n`);

    for (const file of files) {
      await this.auditTemplate(file);
    }

    this.printSummary();
  }

  /**
   * Audit individual template
   */
  async auditTemplate(filename) {
    const filepath = path.join(TEMPLATES_DIR, filename);
    console.log(`📄 Auditing: ${filename}`);

    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const template = JSON.parse(content);
      const templateIssues = [];

      // Check required top-level keys
      const requiredKeys = ['brand', 'themeVars', 'nav', 'hero', 'features'];
      for (const key of requiredKeys) {
        if (!template[key]) {
          templateIssues.push(`Missing required key: ${key}`);
        }
      }

      // Check features object
      if (template.features) {
        const featureIssues = this.checkFeatures(template.features);
        templateIssues.push(...featureIssues);

        // Fix features if needed
        if (featureIssues.length > 0) {
          template.features = this.fixFeatures(template.features);
          fs.writeFileSync(filepath, JSON.stringify(template, null, 2) + '\n', 'utf8');
          this.fixed.push({ file: filename, issues: featureIssues });
          console.log(`   ✅ Fixed ${featureIssues.length} issue(s)`);
        } else {
          console.log(`   ✅ All checks passed`);
        }
      }

      // Store results
      this.templates.push({
        name: filename,
        issues: templateIssues,
        template
      });

      if (templateIssues.length > 0) {
        this.issues.push({ file: filename, issues: templateIssues });
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      this.issues.push({ file: filename, issues: [`Parse error: ${error.message}`] });
    }

    console.log('');
  }

  /**
   * Check features configuration
   */
  checkFeatures(features) {
    const issues = [];

    // Check analytics
    if (features.analytics !== true) {
      issues.push('analytics not enabled (should be true for Pro)');
    }

    // Check owner dashboard
    if (features.ownerDashboard !== true) {
      issues.push('ownerDashboard not enabled (should be true for Pro)');
    }

    // Check booking widget structure
    if (!features.bookingWidget) {
      issues.push('bookingWidget configuration missing');
    } else {
      if (!features.bookingWidget.hasOwnProperty('enabled')) {
        issues.push('bookingWidget.enabled property missing');
      }
      if (!features.bookingWidget.hasOwnProperty('embedMode')) {
        issues.push('bookingWidget.embedMode property missing');
      }
    }

    // Check reviews configuration
    if (!features.reviews) {
      issues.push('reviews configuration missing');
    } else {
      const reviewsKeys = ['enabled', 'placeId', 'maxReviews', 'showOverallRating'];
      for (const key of reviewsKeys) {
        if (!features.reviews.hasOwnProperty(key)) {
          issues.push(`reviews.${key} property missing`);
        }
      }
    }

    return issues;
  }

  /**
   * Fix features configuration
   */
  fixFeatures(features) {
    const fixed = { ...features };

    // Ensure analytics is enabled
    if (fixed.analytics !== true) {
      fixed.analytics = true;
    }

    // Ensure owner dashboard is enabled
    if (fixed.ownerDashboard !== true) {
      fixed.ownerDashboard = true;
    }

    // Fix booking widget
    if (!fixed.bookingWidget) {
      fixed.bookingWidget = { ...REQUIRED_PRO_FEATURES.bookingWidget };
    } else {
      fixed.bookingWidget = {
        ...REQUIRED_PRO_FEATURES.bookingWidget,
        ...fixed.bookingWidget,
        embedMode: true // Always ensure embedMode is true
      };
    }

    // Fix reviews
    if (!fixed.reviews) {
      fixed.reviews = { ...REQUIRED_PRO_FEATURES.reviews };
    } else {
      fixed.reviews = {
        ...REQUIRED_PRO_FEATURES.reviews,
        ...fixed.reviews
      };
    }

    return fixed;
  }

  /**
   * Print audit summary
   */
  printSummary() {
    console.log('=' .repeat(60));
    console.log('📊 AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`\nTotal templates audited: ${this.templates.length}`);
    console.log(`Templates with issues: ${this.issues.length}`);
    console.log(`Templates auto-fixed: ${this.fixed.length}`);
    console.log(`Templates passing: ${this.templates.length - this.issues.length}`);

    if (this.fixed.length > 0) {
      console.log(`\n✅ AUTO-FIXED TEMPLATES (${this.fixed.length}):`);
      for (const { file, issues } of this.fixed) {
        console.log(`\n   ${file}:`);
        for (const issue of issues) {
          console.log(`      • ${issue}`);
        }
      }
    }

    if (this.issues.length > this.fixed.length) {
      console.log(`\n⚠️  REMAINING ISSUES (${this.issues.length - this.fixed.length}):`);
      const remaining = this.issues.filter(
        issue => !this.fixed.find(f => f.file === issue.file)
      );
      for (const { file, issues } of remaining) {
        console.log(`\n   ${file}:`);
        for (const issue of issues) {
          console.log(`      • ${issue}`);
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    
    if (this.issues.length === this.fixed.length) {
      console.log('✅ ALL ISSUES FIXED! All Pro templates are standardized.');
    } else {
      console.log('⚠️  Some issues require manual review.');
    }
    
    console.log(`${'='.repeat(60)}\n`);
  }

  /**
   * Generate compliance report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalTemplates: this.templates.length,
      compliant: this.templates.length - this.issues.length,
      fixed: this.fixed.length,
      templates: this.templates.map(t => ({
        name: t.name,
        compliant: !this.issues.find(i => i.file === t.name),
        features: t.template.features
      }))
    };

    const reportPath = path.join(__dirname, '../PRO-TEMPLATE-AUDIT-REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`📋 Compliance report saved to: PRO-TEMPLATE-AUDIT-REPORT.json\n`);

    return report;
  }
}

// Run audit
const auditor = new TemplateAuditor();
await auditor.audit();
auditor.generateReport();

