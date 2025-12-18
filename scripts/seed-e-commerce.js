#!/usr/bin/env node

/**
 * Seed E-commerce Test Data
 * 
 * This script seeds the database with a specific e-commerce site for E2E tests.
 * Uses the 'product-ordering' template for 'demo-store'.
 */

import { prisma } from '../database/db.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

async function seedEcommerceData() {
    console.log('\n🛍️  Seeding e-commerce test data...\n');

    try {
        // 1. Get or Create Test User
        const userEmail = 'test@example.com';
        let user = await prisma.users.findUnique({
            where: { email: userEmail }
        });

        if (!user) {
            console.log('User not found, relying on main seed script or creating basic user...');
            // Basic fallback creation if user doesn't exist (though main seed should run first)
            // We'll assume main seed runs, or fail if no user. 
            // Better: create if missing to be robust.
            const bcrypt = await import('bcryptjs');
            const hashedPassword = await bcrypt.hash('password123', 10);
            user = await prisma.users.create({
                data: {
                    email: userEmail,
                    password_hash: hashedPassword,
                    role: 'user',
                    subscription_plan: 'pro',
                    status: 'active',
                    created_at: new Date()
                }
            });
            console.log(`  ✓ Created user ${userEmail}`);
        } else {
            console.log(`  ✓ Using existing user ${userEmail}`);
        }

        // 2. Load Product Ordering Template
        const templateId = 'product-ordering';
        const templatePath = path.join(projectRoot, 'public', 'data', 'templates', `${templateId}.json`);

        let siteData;
        try {
            const raw = fs.readFileSync(templatePath, 'utf-8');
            siteData = JSON.parse(raw);
            console.log(`  ✓ Loaded template: ${templateId}`);
        } catch (err) {
            console.error(`  ❌ Failed to load template ${templateId}:`, err.message);
            throw err;
        }

        // 3. Create or Update demo-store site
        const subdomain = 'demo-store';

        const existingSite = await prisma.sites.findFirst({
            where: {
                user_id: user.id,
                subdomain: subdomain
            }
        });

        if (existingSite) {
            // Update existing site
            await prisma.sites.update({
                where: { id: existingSite.id },
                data: {
                    template_id: templateId,
                    site_data: siteData,
                    status: 'published',
                    is_public: true
                }
            });
            console.log(`  ✓ Updated site "${subdomain}" (ID: ${existingSite.id})`);

            // Ensure site file exists in public/sites for static serving
            await writeSiteToPublic(existingSite.id, siteData);
            await writeSiteToPublic('demo-store', siteData);

        } else {
            // Create new site
            const newSite = await prisma.sites.create({
                data: {
                    id: `site_${Date.now()}_commerce`,
                    user_id: user.id,
                    subdomain: subdomain,
                    template_id: templateId,
                    status: 'published',
                    is_public: true,
                    site_data: siteData,
                    created_at: new Date()
                }
            });
            console.log(`  ✓ Created site "${subdomain}" (ID: ${newSite.id})`);

            // Ensure site file exists in public/sites for static serving
            await writeSiteToPublic(newSite.id, siteData);
            await writeSiteToPublic('demo-store', siteData);
        }

        console.log('\n✅ E-commerce test data seeded successfully!\n');

    } catch (error) {
        console.error('\n❌ Error seeding e-commerce data:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function writeSiteToPublic(siteIdOrName, siteData) {
    // If siteIdOrName is "demo-store", we write to that specific folder
    // checking if siteIdOrName looks like an ID or a folder name

    // Construct path
    const siteDir = path.join(projectRoot, 'public', 'sites', siteIdOrName, 'data');
    const siteFile = path.join(siteDir, 'site.json');
    const indexFile = path.join(projectRoot, 'public', 'sites', siteIdOrName, 'index.html');

    try {
        await fs.promises.mkdir(siteDir, { recursive: true });
        await fs.promises.writeFile(siteFile, JSON.stringify(siteData, null, 2));
        console.log(`  ✓ Wrote static site data to ${siteFile}`);

        // Read preview.html to use as index.html
        const previewPath = path.join(projectRoot, 'public', 'preview.html');
        let previewHtml = await fs.promises.readFile(previewPath, 'utf-8');

        // Fix script path to be absolute/root-relative so it finds /app.js
        previewHtml = previewHtml.replace('src="app.js"', 'src="/app.js"');
        previewHtml = previewHtml.replace('href="styles.css"', 'href="/styles.css"');
        previewHtml = previewHtml.replace('href="premium.css"', 'href="/premium.css"');

        // Write index.html
        await fs.promises.writeFile(indexFile, previewHtml);
        console.log(`  ✓ Wrote index.html to ${indexFile}`);

    } catch (err) {
        console.error(`  ⚠️ Failed to write static site files: ${err.message}`);
    }
}

// Run the seeding
seedEcommerceData();
