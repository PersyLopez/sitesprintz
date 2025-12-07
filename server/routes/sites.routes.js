import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { prisma } from '../../database/db.js';
import { isValidEmail, isValidPhone, sanitizeString } from '../utils/helpers.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../../public');
const uploadsDir = path.join(publicDir, 'uploads');
const draftsDir = path.join(publicDir, 'drafts');
const dataFile = path.join(publicDir, 'data', 'site.json');
const templatesDir = path.join(publicDir, 'data', 'templates');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'dev-token';

// Ensure directories exist
fs.mkdir(uploadsDir, { recursive: true }).catch(() => { });
fs.mkdir(draftsDir, { recursive: true }).catch(() => { });

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Endpoint to get admin token (for image uploads during setup)
router.get('/admin-token', (req, res) => {
    // Return the admin token - in production, you might want to add rate limiting here
    res.json({ token: ADMIN_TOKEN });
});

// Get site data
router.get('/site', async (req, res) => {
    try {
        const raw = await fs.readFile(dataFile, 'utf-8');
        const json = JSON.parse(raw);
        res.json(json);
    } catch (err) {
        // If no site.json yet, fall back to a sensible default template
        if (err && (err.code === 'ENOENT' || err.message?.includes('ENOENT'))) {
            try {
                const fallbackRaw = await fs.readFile(path.join(templatesDir, 'starter.json'), 'utf-8');
                const fallback = JSON.parse(fallbackRaw);
                return res.json(fallback);
            } catch (e) {
                return res.status(500).json({ error: 'No site.json and failed to load default template' });
            }
        }
        res.status(500).json({ error: 'Failed to read site.json' });
    }
});

// Update site data
router.post('/site', requireAdmin, async (req, res) => {
    try {
        const incoming = req.body;
        if (typeof incoming !== 'object' || incoming == null) {
            return res.status(400).json({ error: 'Invalid JSON payload' });
        }
        await fs.mkdir(path.dirname(dataFile), { recursive: true });
        await fs.writeFile(dataFile, JSON.stringify(incoming, null, 2));
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to write site.json' });
    }
});

// Upload image endpoint
router.post('/upload', requireAdmin, (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: err.message || 'Upload failed' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        res.json({
            success: true,
            url: `/uploads/${req.file.filename}`,
            filename: req.file.filename
        });
    });
});

// Delete uploaded image
router.delete('/uploads/:filename', requireAdmin, async (req, res) => {
    try {
        const filename = req.params.filename;
        await fs.unlink(path.join(uploadsDir, filename));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// Draft Management Endpoints
router.post('/drafts', async (req, res) => {
    try {
        const draftData = req.body;

        if (!draftData || !draftData.templateId) {
            return res.status(400).json({ error: 'Invalid draft data: templateId is required' });
        }

        // Validate business data if provided
        if (draftData.businessData) {
            const bd = draftData.businessData;

            // Validate email if provided
            if (bd.email && !isValidEmail(bd.email)) {
                return res.status(400).json({ error: 'Invalid email address' });
            }

            // Validate phone if provided
            if (bd.phone && !isValidPhone(bd.phone)) {
                return res.status(400).json({ error: 'Invalid phone number format' });
            }

            // Sanitize string fields
            if (bd.businessName) bd.businessName = sanitizeString(bd.businessName, 200);
            if (bd.heroTitle) bd.heroTitle = sanitizeString(bd.heroTitle, 200);
            if (bd.heroSubtitle) bd.heroSubtitle = sanitizeString(bd.heroSubtitle, 500);
            if (bd.address) bd.address = sanitizeString(bd.address, 300);
        }

        // Generate unique draft ID
        const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const draftFile = path.join(draftsDir, `${draftId}.json`);

        // Add expiration timestamp (7 days from now)
        const draft = {
            draftId: draftId,
            templateId: draftData.templateId,
            businessData: draftData.businessData || {},
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'draft'
        };

        await fs.writeFile(draftFile, JSON.stringify(draft, null, 2));

        res.json({
            success: true,
            draftId: draftId,
            previewUrl: `/preview/${draftId}`,
            expiresAt: draft.expiresAt
        });
    } catch (err) {
        console.error('Draft save error:', err);
        res.status(500).json({ error: 'Failed to save draft' });
    }
});

router.get('/drafts/:draftId', async (req, res) => {
    try {
        const draftId = req.params.draftId;
        const draftFile = path.join(draftsDir, `${draftId}.json`);

        const draftRaw = await fs.readFile(draftFile, 'utf-8');
        const draft = JSON.parse(draftRaw);

        // Check if draft is expired
        if (new Date(draft.expiresAt) < new Date()) {
            await fs.unlink(draftFile);
            return res.status(410).json({ error: 'Draft has expired' });
        }

        res.json(draft);
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.status(404).json({ error: 'Draft not found' });
        } else {
            res.status(500).json({ error: 'Failed to load draft' });
        }
    }
});

router.delete('/drafts/:draftId', async (req, res) => {
    try {
        const draftId = req.params.draftId;
        const draftFile = path.join(draftsDir, `${draftId}.json`);
        await fs.unlink(draftFile);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete draft' });
    }
});

// Save site data from setup flow
router.post('/setup', async (req, res) => {
    try {
        const setupData = req.body;
        console.log('Received setup data:', JSON.stringify(setupData, null, 2));

        if (!setupData) {
            return res.status(400).json({ error: 'No data received' });
        }

        if (!setupData.templateId) {
            return res.status(400).json({ error: 'templateId is required' });
        }

        // Load the template
        const templateFile = path.join(templatesDir, `${setupData.templateId}.json`);
        let siteData;

        try {
            const templateRaw = await fs.readFile(templateFile, 'utf-8');
            siteData = JSON.parse(templateRaw);
        } catch (err) {
            // Fallback to starter template if template not found
            const starterRaw = await fs.readFile(path.join(templatesDir, 'starter.json'), 'utf-8');
            siteData = JSON.parse(starterRaw);
        }

        // Update site data with setup information
        if (setupData.businessData && typeof setupData.businessData === 'object') {
            if (setupData.businessData.businessName && setupData.businessData.businessName.trim()) {
                siteData.brand.name = setupData.businessData.businessName;
            }

            if (siteData.hero) {
                if (setupData.businessData.heroTitle && setupData.businessData.heroTitle.trim()) {
                    siteData.hero.title = setupData.businessData.heroTitle;
                }
                if (setupData.businessData.heroSubtitle && setupData.businessData.heroSubtitle.trim()) {
                    siteData.hero.subtitle = setupData.businessData.heroSubtitle;
                }
                if (setupData.businessData.heroImage && setupData.businessData.heroImage.trim()) {
                    siteData.hero.image = setupData.businessData.heroImage;
                }
            }

            if (siteData.contact) {
                if (setupData.businessData.email && setupData.businessData.email.trim()) siteData.contact.email = setupData.businessData.email;
                if (setupData.businessData.phone && setupData.businessData.phone.trim()) siteData.contact.phone = setupData.businessData.phone;
                if (setupData.businessData.address && setupData.businessData.address.trim()) siteData.contact.subtitle = setupData.businessData.address;
                if (setupData.businessData.businessHours && setupData.businessData.businessHours.trim()) siteData.contact.hours = setupData.businessData.businessHours;
            }

            // Update services/products
            if (Array.isArray(setupData.businessData.services) && setupData.businessData.services.length > 0) {
                // Determine if this template uses 'products' or 'services'
                if (siteData.products) {
                    siteData.products = setupData.businessData.services
                        .filter(s => s.name && s.name.trim())
                        .map(s => ({
                            name: s.name,
                            price: parseFloat(s.price) || 0,
                            description: s.description || '',
                            ...(s.image && s.image.trim() && { image: s.image }),
                            ...(s.imageAlt && { imageAlt: s.imageAlt })
                        }));
                } else if (siteData.services) {
                    siteData.services.items = setupData.businessData.services
                        .filter(s => s.name && s.name.trim())
                        .map(s => ({
                            title: s.name,
                            description: s.description || '',
                            ...(s.price && { price: s.price }),
                            ...(s.image && s.image.trim() && { image: s.image }),
                            ...(s.imageAlt && { imageAlt: s.imageAlt })
                        }));
                }
            }
        }

        // Create unique page ID
        const pageId = `site-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // In a real app, we would save this to a database or a new file
        // For now, we'll just return the modified site data

        res.json({
            success: true,
            pageId: pageId,
            siteData: siteData
        });

    } catch (err) {
        console.error('Setup error:', err);
        res.status(500).json({ error: 'Failed to process setup data' });
    }
});

// Product Management Endpoints
router.get('/sites/:siteId/products', async (req, res) => {
    try {
        const { siteId } = req.params;
        console.log(`GET products for site: ${siteId}`);
        const siteFile = path.join(publicDir, 'sites', siteId, 'data', 'site.json');

        try {
            const raw = await fs.readFile(siteFile, 'utf-8');
            const data = JSON.parse(raw);

            // Normalize products/services structure
            let products = [];
            if (data.products && Array.isArray(data.products)) {
                products = data.products;
            } else if (data.services && data.services.items && Array.isArray(data.services.items)) {
                // Convert services to products format if needed
                products = data.services.items.map(s => ({
                    id: s.id || Date.now().toString() + Math.random(),
                    name: s.title || s.name,
                    description: s.description,
                    price: s.price || 0,
                    image: s.image,
                    category: 'General'
                }));
            }
            console.log(`Found ${products.length} products`);
            res.json({ products });
        } catch (err) {
            console.error(`Error reading site file: ${err.message}`);
            if (err.code === 'ENOENT') {
                return res.status(404).json({ error: 'Site not found' });
            }
            throw err;
        }
    } catch (err) {
        console.error('Get products error:', err);
        res.status(500).json({ error: 'Failed to get products' });
    }
});

router.put('/sites/:siteId/products', async (req, res) => {
    try {
        const { siteId } = req.params;
        const { products } = req.body;
        console.log(`PUT products for site: ${siteId}, count: ${products.length}`);

        if (!Array.isArray(products)) {
            return res.status(400).json({ error: 'Products must be an array' });
        }

        const siteFile = path.join(publicDir, 'sites', siteId, 'data', 'site.json');

        try {
            const raw = await fs.readFile(siteFile, 'utf-8');
            const data = JSON.parse(raw);

            // Update products
            // If template uses services, we might need to update that too, but for now assume products
            data.products = products;

            // Also update services if they exist and map to products
            if (data.services && data.services.items) {
                data.services.items = products.map(p => ({
                    title: p.name,
                    description: p.description,
                    price: p.price,
                    image: p.image
                }));
            }

            await fs.writeFile(siteFile, JSON.stringify(data, null, 2));
            console.log('Products updated successfully');
            res.json({ success: true });
        } catch (err) {
            console.error(`Error updating site file: ${err.message}`);
            if (err.code === 'ENOENT') {
                return res.status(404).json({ error: 'Site not found' });
            }
            throw err;
        }
    } catch (err) {
        console.error('Update products error:', err);
        res.status(500).json({ error: 'Failed to update products' });
    }
});

router.put('/sites/:siteId/public', requireAuth, async (req, res) => {
    try {
        const { siteId } = req.params;
        const { isPublic } = req.body;
        const userId = req.user.userId || req.user.id; // handle both formats

        if (typeof isPublic !== 'boolean') {
            return res.status(400).json({ error: 'isPublic must be a boolean' });
        }

        const site = await prisma.sites.findUnique({
            where: { id: siteId }
        });

        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }

        // Check ownership
        if (site.user_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check if site is published
        if (site.status !== 'published') {
            return res.status(400).json({ error: 'Only published sites can be made public' });
        }

        const updated = await prisma.sites.update({
            where: { id: siteId },
            data: { is_public: isPublic }
        });

        res.json({
            success: true,
            isPublic: updated.is_public
        });
    } catch (err) {
        console.error('Error toggling public status:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
