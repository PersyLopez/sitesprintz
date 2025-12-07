
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../public');
const templatesDir = path.join(publicDir, 'data', 'templates');

const SITES_TO_RESTORE = [
    { subdomain: 'test-restaurant', templateId: 'restaurant' },
    { subdomain: 'test-salon', templateId: 'salon' },
    { subdomain: 'admin-site', templateId: 'business' }
];

async function regenerate() {
    console.log('🔄 Regenerating test sites...');

    for (const site of SITES_TO_RESTORE) {
        console.log(`\n📦 Processing ${site.subdomain}...`);

        try {
            const siteDir = path.join(publicDir, 'sites', site.subdomain);

            // Clean up old directory
            // await fs.rm(siteDir, { recursive: true, force: true }).catch(() => {});

            // 1. Create directories
            await fs.mkdir(siteDir, { recursive: true });
            await fs.mkdir(path.join(siteDir, 'data'), { recursive: true });

            // 2. Load template data
            const templatePath = path.join(templatesDir, `${site.templateId}.json`);
            // Fallback to starter if template missing
            let templateData;
            try {
                const raw = await fs.readFile(templatePath, 'utf-8');
                templateData = JSON.parse(raw);
            } catch (e) {
                console.warn(`  ⚠️ Template ${site.templateId} not found, using starter`);
                const starterRaw = await fs.readFile(path.join(templatesDir, 'starter.json'), 'utf-8');
                templateData = JSON.parse(starterRaw);
            }

            // 3. Write site.json
            await fs.writeFile(
                path.join(siteDir, 'data', 'site.json'),
                JSON.stringify(templateData, null, 2)
            );
            console.log('  ✓ Created data/site.json');

            // 4. Copy index.html (This includes our new Analytics fix!)
            const templateHtml = await fs.readFile(path.join(publicDir, 'site-template.html'), 'utf-8');
            await fs.writeFile(path.join(siteDir, 'index.html'), templateHtml);
            console.log('  ✓ Created index.html');

        } catch (error) {
            console.error(`  ❌ Failed to regenerate ${site.subdomain}:`, error);
        }
    }
    console.log('\n✨ Regeneration complete!');
}

regenerate();
