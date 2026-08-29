#!/usr/bin/env node

/**
 * Seed public gallery example sites from the same generators
 * used for preview/publish (niche builders + bazaar + catalog hero art).
 *
 * Idempotent: upserts by subdomain.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { prisma } from '../database/db.js';
import { buildNicheSiteData } from '../src/config/nicheTemplateBuilders.js';
import { buildBazaarSiteData } from '../src/config/bazaarDefaults.js';
import {
  colorsFromSiteTheme,
  defaultThemeIdForNiche,
  getSiteTheme,
  listSiteThemes,
} from '../src/config/siteThemes.js';
import StaffManagementService from '../server/services/booking/StaffManagementService.js';

dotenv.config();

const TEMPLATES_DIR = join(process.cwd(), 'public/data/templates');
const GALLERY_EMAIL = 'gallery@sitesprintz.com';
const GALLERY_PASSWORD = 'GalleryDemo123!';

/**
 * One site per curated theme (all 6), then extra niches so the gallery
 * shows template variety — salon, trades, dining, products, bazaar, etc.
 * themeId is the locked SiteSprintz palette applied at publish.
 */
export const EXAMPLES = [
  // ── Full theme lineup (each SITE_THEMES id exactly once as the lead) ──
  {
    subdomain: 'gallery-salon',
    niche: 'salon',
    level: 'studio',
    featured: true,
    plan: 'growth',
    businessName: 'Luxe Beauty Studio',
    contactPhone: '(555) 234-5678',
    contactEmail: 'hello@luxebeautystudio.com',
    themeId: 'onyx-oxblood',
  },
  {
    subdomain: 'gallery-restaurant',
    niche: 'restaurant',
    level: 'established',
    featured: true,
    plan: 'growth',
    businessName: 'The Grand Table',
    contactPhone: '(555) 789-0123',
    contactEmail: 'reservations@thegrandtable.com',
    themeId: 'onyx-brass',
  },
  {
    subdomain: 'gallery-electrician',
    niche: 'electrician',
    level: 'studio',
    featured: true,
    plan: 'starter',
    businessName: 'Brightline Electric',
    contactPhone: '(555) 410-2200',
    contactEmail: 'dispatch@brightlineelectric.com',
    themeId: 'onyx-ink',
  },
  {
    subdomain: 'gallery-consultant',
    niche: 'consultant',
    level: 'established',
    featured: true,
    plan: 'starter',
    businessName: 'Northstar Advisory',
    contactPhone: '(555) 301-8800',
    contactEmail: 'hello@northstaradvisory.com',
    themeId: 'ivory-navy',
  },
  {
    subdomain: 'gallery-gym',
    niche: 'gym',
    level: 'studio',
    featured: true,
    plan: 'growth',
    businessName: 'Forge Fitness',
    contactPhone: '(555) 612-4400',
    contactEmail: 'front@forgefitness.com',
    themeId: 'onyx-ember',
  },
  {
    subdomain: 'gallery-food-stall',
    bazaar: 'food-stall',
    featured: true,
    plan: 'starter',
    businessName: 'Sunset Tacos',
    location: 'Harbor Market, Stall 12',
    hours: 'Fri–Sun 11am–8pm',
    themeId: 'ivory-grove',
  },

  // ── More niches (reuse themes so every template family is represented) ──
  {
    subdomain: 'gallery-cleaning',
    niche: 'cleaning',
    level: 'studio',
    featured: true,
    plan: 'starter',
    businessName: 'Cedar Clean Co',
    contactPhone: '(555) 720-1144',
    contactEmail: 'book@cedarclean.co',
    themeId: 'ivory-grove',
  },
  {
    subdomain: 'gallery-pet',
    niche: 'pet-care',
    level: 'studio',
    featured: true,
    plan: 'growth',
    businessName: 'Paws & Pine',
    contactPhone: '(555) 833-2290',
    contactEmail: 'hello@pawsandpine.com',
    themeId: 'onyx-oxblood',
  },
  {
    subdomain: 'gallery-freelancer',
    niche: 'freelancer',
    level: 'solo',
    featured: true,
    plan: 'starter',
    businessName: 'Mira Design Studio',
    contactPhone: '(555) 441-9088',
    contactEmail: 'hi@miradesign.studio',
    themeId: 'ivory-navy',
  },
  {
    subdomain: 'gallery-auto',
    niche: 'auto-repair',
    level: 'studio',
    featured: true,
    plan: 'starter',
    businessName: 'Harbor Auto Works',
    contactPhone: '(555) 502-7766',
    contactEmail: 'service@harborautoworks.com',
    themeId: 'onyx-ember',
  },
  {
    subdomain: 'gallery-products',
    niche: 'product-showcase',
    level: 'studio',
    featured: true,
    plan: 'growth',
    businessName: 'Harbor Goods',
    contactPhone: '(555) 218-0090',
    contactEmail: 'shop@harborgoods.com',
    themeId: 'onyx-brass',
  },
  {
    subdomain: 'gallery-plumbing',
    niche: 'plumbing',
    level: 'studio',
    featured: true,
    plan: 'starter',
    businessName: 'Clearflow Plumbing',
    contactPhone: '(555) 360-5511',
    contactEmail: 'help@clearflowplumbing.com',
    themeId: 'onyx-ink',
  },
  {
    subdomain: 'gallery-tech',
    niche: 'tech-repair',
    level: 'studio',
    featured: true,
    plan: 'growth',
    businessName: 'Circuit Fix Mobile',
    contactPhone: '(555) 880-3344',
    contactEmail: 'repair@circuitfixmobile.com',
    themeId: 'onyx-ink',
  },
  {
    subdomain: 'gallery-tow',
    niche: 'tow-truck',
    level: 'studio',
    featured: true,
    plan: 'starter',
    businessName: 'Summit Tow & Recovery',
    contactPhone: '(555) 911-4477',
    contactEmail: 'dispatch@summittow.com',
    themeId: 'onyx-ember',
  },
  {
    subdomain: 'gallery-ordering',
    niche: 'product-ordering',
    level: 'studio',
    featured: true,
    plan: 'growth',
    businessName: 'Oak & Anchor Supply',
    contactPhone: '(555) 204-7788',
    contactEmail: 'orders@oakanchorsupply.com',
    themeId: 'onyx-brass',
  },
];

function loadCatalog(niche) {
  try {
    return JSON.parse(readFileSync(join(TEMPLATES_DIR, `${niche}.json`), 'utf-8'));
  } catch {
    return {};
  }
}

function flattenProducts(catalog, generated) {
  if (Array.isArray(generated.products) && generated.products.length > 0) {
    return generated.products;
  }
  if (Array.isArray(catalog.products) && catalog.products.length > 0) {
    return catalog.products;
  }
  const menuSections = catalog.menu?.sections || [];
  return menuSections.flatMap((section) =>
    (section.items || []).map((item) => ({
      ...item,
      category: section.name || item.category,
    }))
  );
}

function viewerHours(hours) {
  if (!hours) return undefined;
  if (typeof hours === 'string') return { Hours: hours };
  if (Array.isArray(hours.items)) {
    return { Hours: hours.items.join(' · ') };
  }
  if (typeof hours === 'object') {
    const stringEntries = Object.entries(hours).filter(([, value]) => typeof value === 'string');
    if (stringEntries.length > 0) return Object.fromEntries(stringEntries);
  }
  return undefined;
}

function heroCtaLabel(hero) {
  if (typeof hero?.cta === 'string') return hero.cta;
  if (Array.isArray(hero?.cta) && hero.cta[0]?.label) return hero.cta[0].label;
  return undefined;
}

/**
 * Fill empty showcase sections so demos look complete (gallery/team/faq/reviews).
 */
function enrichGallerySections(sections, example, catalog) {
  const name = example.businessName;
  return (sections || []).map((section) => {
    const content = { ...(section.content || {}) };
    const type = section.type;

    if (type === 'gallery' && (!Array.isArray(content.images) || content.images.length === 0)) {
      const heroImg = catalog.hero?.image
        || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80';
      content.images = [
        { src: heroImg, alt: `${name} space` },
        { src: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80', alt: `${name} detail` },
        { src: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80', alt: `${name} team` },
      ];
    }

    if (type === 'team' && (!Array.isArray(content.members) || content.members.length === 0)) {
      content.members = [
        { name: 'Alex Rivera', role: 'Owner', bio: `Leads ${name} day to day.` },
        { name: 'Jordan Lee', role: 'Lead specialist', bio: 'Here to help you get set up.' },
      ];
    }

    if (type === 'faq' && (!Array.isArray(content.items) || content.items.length === 0)) {
      content.items = [
        { question: 'How do I get started?', answer: `Reach out through the contact form or book online — ${name} will follow up quickly.` },
        { question: 'Do you serve my area?', answer: 'Yes for the greater metro area. Ask us about nearby neighborhoods.' },
        { question: 'What should I bring?', answer: 'Nothing special — we will confirm details when you book or order.' },
      ];
    }

    if (
      (type === 'reviews' || type === 'testimonials')
      && (!Array.isArray(content.items) || content.items.length === 0)
      && !content.rating
    ) {
      content.rating = 4.9;
      content.reviewCount = 48;
      content.items = [
        { author: 'Sam T.', text: `${name} made everything simple. Highly recommend.`, rating: 5 },
        { author: 'Casey M.', text: 'Clear pricing and a polished experience from start to finish.', rating: 5 },
      ];
    }

    if (type === 'catalog' || type === 'menu' || type === 'products') {
      if ((!Array.isArray(content.items) || content.items.length === 0) && Array.isArray(catalog.products)) {
        content.items = catalog.products;
      }
    }

    return { ...section, content };
  });
}

function applyCuratedTheme(siteData, example) {
  const themeId = example.themeId || defaultThemeIdForNiche(example.niche || example.bazaar);
  const theme = getSiteTheme(themeId);
  return {
    ...siteData,
    _themeId: themeId,
    colors: colorsFromSiteTheme(themeId),
    brand: {
      ...(siteData.brand || {}),
      name: siteData.brand?.name || example.businessName,
      tagline: siteData.brand?.tagline || theme.description,
    },
    // Helps showcase detail / SEO show which look this demo uses
    galleryTheme: {
      id: theme.id,
      name: theme.name,
      mode: theme.mode,
      description: theme.description,
    },
  };
}

function assembleSiteData(example) {
  if (example.bazaar) {
    const generated = buildBazaarSiteData({
      popUpType: example.bazaar,
      businessName: example.businessName,
      location: example.location,
      hours: example.hours,
      contactPhone: example.contactPhone || '(555) 010-1010',
      contactEmail: example.contactEmail || 'hello@example.com',
    });
    return {
      ...generated,
      brand: {
        name: example.businessName,
        tagline: generated.heroSubtitle || 'Pop-up, ready this weekend',
      },
      hero: {
        title: example.businessName,
        subtitle: generated.heroSubtitle || '',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80',
        imageAlt: `${example.businessName} stall`,
        cta: 'Order Now',
      },
      businessName: example.businessName,
      contact: {
        phone: example.contactPhone || '(555) 010-1010',
        email: example.contactEmail || 'hello@example.com',
        address: example.location || '',
        hours: viewerHours(example.hours),
      },
      products: generated.products || [],
      sections: (generated.sections || []).map((section) => {
        if (section.type !== 'hero') return section;
        return {
          ...section,
          content: {
            ...(section.content || {}),
            eyebrow: example.businessName,
            title: example.businessName,
            subtitle: generated.heroSubtitle || section.content?.subtitle,
            image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80',
            ctaText: 'Order Now',
          },
        };
      }),
      settings: {
        allowCheckout: true,
        bookingEnabled: false,
        payOnSite: true,
        demoMode: true,
      },
    };
  }

  const catalog = loadCatalog(example.niche);
  const isCommerce = ['restaurant', 'product-showcase', 'product-ordering'].includes(example.niche);
  const isBooking = ['salon', 'gym', 'pet-care', 'tech-repair', 'restaurant'].includes(example.niche);
  const generated = buildNicheSiteData(example.niche, {
    businessName: example.businessName,
    level: example.level,
    contactPhone: example.contactPhone,
    contactEmail: example.contactEmail,
    features: isBooking
      ? { booking: { enabled: true, offered: true } }
      : undefined,
  });

  const aboutText =
    (typeof catalog.about?.description === 'string' && catalog.about.description) ||
    catalog.hero?.subtitle ||
    generated.heroSubtitle ||
    '';

  const products = flattenProducts(catalog, generated).map((item, index) => ({
    ...item,
    id: item.id || `gallery-${example.subdomain}-${index + 1}`,
  }));

  return {
    ...generated,
    ...catalog,
    brand: {
      ...(catalog.brand || {}),
      name: example.businessName,
      tagline: catalog.brand?.tagline || generated.heroSubtitle,
      phone: example.contactPhone,
      email: example.contactEmail,
    },
    hero: {
      ...(catalog.hero || {}),
      eyebrow: example.businessName,
      title: catalog.hero?.title || generated.heroTitle || example.businessName,
      subtitle: catalog.hero?.subtitle || generated.heroSubtitle || '',
      image: catalog.hero?.image || '',
      imageAlt: catalog.hero?.imageAlt || example.businessName,
      cta: heroCtaLabel(catalog.hero),
    },
    businessName: example.businessName,
    contact: {
      phone: example.contactPhone || catalog.contact?.phone,
      email: example.contactEmail || catalog.contact?.email,
      address: catalog.contact?.address,
      hours: viewerHours(catalog.contact?.hours),
    },
    about: catalog.about || {
      title: 'About',
      description: aboutText,
    },
    sections: enrichGallerySections(
      (generated.sections || []).map((section) => {
        if (section.type !== 'hero') return section;
        return {
          ...section,
          content: {
            ...(section.content || {}),
            eyebrow: example.businessName,
            title: catalog.hero?.title || section.content?.title || example.businessName,
            subtitle: catalog.hero?.subtitle || section.content?.subtitle || generated.heroSubtitle,
            image: catalog.hero?.image || section.content?.image || '',
            imageAlt: catalog.hero?.imageAlt || example.businessName,
            ctaText: heroCtaLabel(catalog.hero) || section.content?.ctaText,
          },
        };
      }),
      example,
      catalog
    ),
    _layout: generated._layout,
    _character: generated._character,
    _level: generated._level,
    _niche: generated._niche,
    _theme: generated._theme,
    _features: generated._features,
    _layoutSections: generated.sections,
    products,
    settings: {
      allowCheckout: isCommerce,
      bookingEnabled: isBooking,
      bookingWidget: isBooking ? 'native' : undefined,
      bookingTitle: example.niche === 'restaurant' ? 'Reserve a Table' : 'Book an Appointment',
      payOnSite: isCommerce,
      demoMode: true,
    },
  };
}

async function ensureOwner() {
  const email = GALLERY_EMAIL.toLowerCase();
  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.users.create({
    data: {
      email,
      password_hash: await bcrypt.hash(GALLERY_PASSWORD, 10),
      role: 'user',
      status: 'active',
      plan: 'growth',
      subscription_plan: 'growth',
      subscription_status: 'active',
      email_verified: true,
    },
  });
}

async function upsertSite(owner, example) {
  const siteData = applyCuratedTheme(assembleSiteData(example), example);
  const templateId = example.niche || example.bazaar;
  const payload = {
    user_id: owner.id,
    subdomain: example.subdomain,
    template_id: templateId,
    status: 'published',
    plan: example.plan,
    site_data: siteData,
    published_at: new Date(),
    created_at: new Date(),
    is_public: true,
    is_featured: example.featured !== false,
    json_file_path: `sites/${example.subdomain}/data/site.json`,
  };

  const existing = await prisma.sites.findUnique({
    where: { subdomain: example.subdomain },
  });

  if (existing) {
    await prisma.sites.update({
      where: { subdomain: example.subdomain },
      data: payload,
    });
    return { subdomain: example.subdomain, name: example.businessName, status: 'updated' };
  }

  await prisma.sites.create({
    data: {
      id: example.subdomain,
      ...payload,
    },
  });
  return { subdomain: example.subdomain, name: example.businessName, status: 'created' };
}

function parseMoney(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDurationMinutes(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
}

const BOOKING_FALLBACKS = {
  salon: [
    { name: 'Signature Haircut', price: 85, duration: 60, description: 'Precision cut with consultation' },
    { name: 'Blowout & Style', price: 55, duration: 45, description: 'Shampoo, condition, and blowout' },
    { name: 'Color Refresh', price: 120, duration: 90, description: 'Tone and gloss for vibrant color' },
  ],
  gym: [
    { name: 'Intro Training Session', price: 65, duration: 60, description: '1:1 assessment and workout plan' },
    { name: 'Small Group Class', price: 35, duration: 45, description: 'Coach-led strength circuit' },
    { name: 'Recovery Massage', price: 80, duration: 50, description: 'Post-workout soft tissue work' },
  ],
  'pet-care': [
    { name: 'Full Groom', price: 75, duration: 75, description: 'Bath, trim, nails, and ears' },
    { name: 'Bath & Brush', price: 45, duration: 45, description: 'Gentle wash and fluff dry' },
    { name: 'Nail Trim', price: 20, duration: 20, description: 'Quick, low-stress nail care' },
  ],
  restaurant: [
    { name: 'Table for 2', price: 0, duration: 90, description: 'Evening dining reservation' },
    { name: 'Table for 4', price: 0, duration: 90, description: 'Family or friends reservation' },
    { name: 'Chef’s Counter', price: 25, duration: 120, description: 'Tasting seats with a small booking fee' },
  ],
};

function bookingServicePicks(example, siteData) {
  const niche = example.niche;
  const fromServices = Array.isArray(siteData.services)
    ? siteData.services
    : Array.isArray(siteData.services?.items)
      ? siteData.services.items
      : [];
  const fromMenu = (siteData.menu?.sections || []).flatMap((section) => section.items || []);
  const fromSections = (siteData.sections || [])
    .filter((section) => ['services', 'menu', 'catalog'].includes(section?.type))
    .flatMap((section) => section.content?.items || section.content?.sections?.flatMap((s) => s.items || []) || []);
  const fromProducts = Array.isArray(siteData.products) ? siteData.products : [];
  const pool = [...fromServices, ...fromSections, ...fromMenu, ...fromProducts]
    .filter((item) => item && item.name)
    .slice(0, 3);

  if (pool.length > 0 && niche !== 'restaurant') {
    return pool.map((item) => ({
      name: item.name,
      description: item.description || '',
      price: parseMoney(item.price),
      duration: item.duration || item.duration_minutes || 60,
    }));
  }

  return BOOKING_FALLBACKS[niche] || BOOKING_FALLBACKS.salon;
}

async function ensureSiteBooking(owner, example) {
  const siteData = applyCuratedTheme(assembleSiteData(example), example);
  const siteId = example.subdomain;

  let tenant = await prisma.booking_tenants.findFirst({
    where: { site_id: siteId },
  });

  if (!tenant) {
    tenant = await prisma.booking_tenants.create({
      data: {
        user_id: owner.id,
        site_id: siteId,
        business_name: example.businessName,
        business_type: example.niche || 'service',
        email: example.contactEmail,
        phone: example.contactPhone,
        timezone: 'America/New_York',
        currency: 'USD',
        booking_page_enabled: true,
        confirmation_email_enabled: false,
        reminder_email_enabled: false,
        status: 'active',
      },
    });
  } else {
    tenant = await prisma.booking_tenants.update({
      where: { id: tenant.id },
      data: {
        user_id: owner.id,
        business_name: example.businessName,
        business_type: example.niche || 'service',
        email: example.contactEmail,
        phone: example.contactPhone,
        booking_page_enabled: true,
        confirmation_email_enabled: false,
        reminder_email_enabled: false,
        status: 'active',
      },
    });
  }

  await prisma.booking_services.deleteMany({ where: { tenant_id: tenant.id } });
  // Clear prior demo appointments so reseeding services never conflicts
  await prisma.appointments.deleteMany({ where: { tenant_id: tenant.id } }).catch(() => {});

  const services = bookingServicePicks(example, siteData);
  for (const [index, item] of services.entries()) {
    await prisma.booking_services.create({
      data: {
        tenant_id: tenant.id,
        name: item.name,
        description: item.description || '',
        duration_minutes: parseDurationMinutes(item.duration),
        price_cents: Math.round(parseMoney(item.price) * 100),
        online_booking_enabled: true,
        requires_approval: false,
        display_order: index + 1,
        status: 'active',
      },
    });
  }

  const staffService = new StaffManagementService();
  await staffService.getOrCreateDefaultStaff(tenant.id);
}

async function ensureGalleryBookings(owner) {
  const bookingExamples = EXAMPLES.filter((example) =>
    ['salon', 'gym', 'pet-care', 'restaurant'].includes(example.niche)
  );

  // Drop orphan gallery tenants tied to this owner before recreating per site
  const keepIds = new Set(bookingExamples.map((example) => example.subdomain));
  const existing = await prisma.booking_tenants.findMany({
    where: { user_id: owner.id },
    select: { id: true, site_id: true },
  });
  for (const tenant of existing) {
    if (tenant.site_id && keepIds.has(tenant.site_id)) continue;
    await prisma.appointments.deleteMany({ where: { tenant_id: tenant.id } }).catch(() => {});
    await prisma.service_staff.deleteMany({ where: { tenant_id: tenant.id } }).catch(() => {});
    await prisma.booking_availability_rules.deleteMany({ where: { tenant_id: tenant.id } }).catch(() => {});
    await prisma.booking_notifications.deleteMany({ where: { tenant_id: tenant.id } }).catch(() => {});
    await prisma.booking_services.deleteMany({ where: { tenant_id: tenant.id } }).catch(() => {});
    await prisma.booking_staff.deleteMany({ where: { tenant_id: tenant.id } }).catch(() => {});
    await prisma.booking_tenants.delete({ where: { id: tenant.id } }).catch(() => {});
  }

  for (const example of bookingExamples) {
    await ensureSiteBooking(owner, example);
  }
}

async function clearStaleGallerySites(owner, keepSubdomains) {
  const stale = await prisma.sites.findMany({
    where: {
      OR: [
        { user_id: owner.id },
        { subdomain: { startsWith: 'gallery-' } },
        { subdomain: 'test-restaurant' },
      ],
    },
    select: { id: true, subdomain: true },
  });

  const removed = [];
  for (const site of stale) {
    if (keepSubdomains.has(site.subdomain)) continue;

    // Booking tenants may reference site_id with Restrict — clear first
    await prisma.booking_tenants.deleteMany({
      where: { OR: [{ site_id: site.id }, { site_id: site.subdomain }] },
    }).catch(() => {});

    await prisma.sites.delete({ where: { id: site.id } });
    removed.push(site.subdomain);
  }
  return removed;
}

async function main() {
  const themes = listSiteThemes();
  const themeIdsInExamples = new Set(EXAMPLES.map((e) => e.themeId));
  const missingThemes = themes.filter((t) => !themeIdsInExamples.has(t.id));
  if (missingThemes.length > 0) {
    throw new Error(
      `Gallery seed must showcase every curated theme. Missing: ${missingThemes.map((t) => t.id).join(', ')}`
    );
  }

  const owner = await ensureOwner();
  const keep = new Set(EXAMPLES.map((e) => e.subdomain));
  const removed = await clearStaleGallerySites(owner, keep);

  const results = [];
  for (const example of EXAMPLES) {
    results.push(await upsertSite(owner, example));
  }
  await ensureGalleryBookings(owner);

  if (removed.length > 0) {
    console.log('Removed stale gallery sites:');
    for (const subdomain of removed) {
      console.log(`  deleted  /view/${subdomain}`);
    }
  }

  console.log('Gallery example sites (theme → niche):');
  for (const example of EXAMPLES) {
    const row = results.find((r) => r.subdomain === example.subdomain);
    const theme = getSiteTheme(example.themeId);
    console.log(
      `  ${(row?.status || 'ok').padEnd(8)} /view/${example.subdomain.padEnd(22)} ${theme.name.padEnd(14)} ${example.niche || example.bazaar} — ${example.businessName}`
    );
  }
  console.log(`Owner: ${GALLERY_EMAIL} / ${GALLERY_PASSWORD}`);
  console.log(`Themes covered: ${[...themeIdsInExamples].join(', ')}`);

  await prisma.$disconnect();
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
}
