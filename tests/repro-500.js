import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseSiteData(site) {
    if (!site.site_data) return {};
    if (typeof site.site_data === 'string') {
        try {
            return JSON.parse(site.site_data);
        } catch (e) {
            return {};
        }
    }
    return site.site_data;
}

async function main() {
    const siteId = 'test-restaurant';
    console.log(`[REPRO] Testing lookup for siteId: ${siteId}`);

    try {
        let site = await prisma.sites.findUnique({
            where: { id: siteId },
            select: {
                id: true,
                subdomain: true,
                template_id: true,
                status: true,
                plan: true,
                site_data: true,
                created_at: true,
                updated_at: true,
                published_at: true,
                expires_at: true,
                is_public: true
            }
        });

        if (!site) {
            console.log(`[REPRO] Not found by ID, trying subdomain...`);
            site = await prisma.sites.findUnique({
                where: { subdomain: siteId },
                select: {
                    id: true,
                    subdomain: true,
                    template_id: true,
                    status: true,
                    plan: true,
                    site_data: true,
                    created_at: true,
                    updated_at: true,
                    published_at: true,
                    expires_at: true,
                    is_public: true
                }
            });
        }

        if (!site) {
            console.log(`[REPRO] Site not found`);
            return;
        }

        console.log(`[REPRO] Site found:`, site.id);

        console.log('[REPRO] Attempting parseSiteData...');
        const siteData = parseSiteData(site);
        console.log('[REPRO] parseSiteData SUCCESS');

        const result = {
            site: {
                id: site.id,
                subdomain: site.subdomain,
                templateId: site.template_id,
                status: site.status,
                plan: site.plan,
                isPublic: site.is_public,
                createdAt: site.created_at,
                updatedAt: site.updated_at,
                publishedAt: site.published_at,
                expiresAt: site.expires_at,
                data: siteData
            }
        };
        console.log('[REPRO] Construction SUCCESS');
        console.log('[REPRO] Final JSON stringify test...');
        JSON.stringify(result);
        console.log('[REPRO] JSON stringify SUCCESS');

    } catch (err) {
        console.error('[REPRO] ERROR OCCURRED:');
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
