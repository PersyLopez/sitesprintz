#!/usr/bin/env node

/**
 * Idempotent seed for the True Cuts Barbershop claimable Growth salon prospect.
 */

import { pathToFileURL } from 'url';
import dotenv from 'dotenv';
import { prisma } from '../database/db.js';
import { buildNicheSiteData } from '../src/config/nicheTemplateBuilders.js';
import { buildSiteNav } from '../src/config/operatingModel.js';
import { colorsFromSiteTheme } from '../src/config/siteThemes.js';
import { applyVisitorExperienceDefaults } from '../src/utils/visitorExperience.js';
import { ensurePublishedBooking } from '../server/services/booking/ensurePublishedBooking.js';
import {
  buildClaimUrl,
  claimExpiryDate,
  generateClaimToken,
  hashClaimToken,
} from '../server/services/claimTokenService.js';

dotenv.config();

const SUBDOMAIN = 'true-cuts-barbershop';
const THEME_ID = 'onyx-ink';
const INSTAGRAM_URL = 'https://www.instagram.com/truecuts_at_george/';
const FACEBOOK_URL = 'https://www.facebook.com/truecutsbarbershopnj/';
const GALLERY_DIR = `/sites/${SUBDOMAIN}/gallery`;
const LOGO_SRC = `${GALLERY_DIR}/logo.png`;
const HERO_SRC = `${GALLERY_DIR}/interior.jpg`;
const DROP_SECTION_TYPES = new Set(['testimonials', 'faq']);

const HOURS_COPY = [
  'Monday–Thursday: 10:00 AM – 9:00 PM',
  'Friday–Saturday: 10:00 AM – 10:00 PM',
  'Sunday: 12:00 PM – 7:00 PM',
].join('\n');

const BOOKING_COPY =
  'Book your cut online. Walk-ins are welcome, but booking ahead guarantees your time. Rutgers student discounts with valid college ID.';

const TEAM = [
  { name: 'David', title: 'Barber', bio: '' },
  { name: 'Freddy', title: 'Barber', bio: '' },
  { name: 'Mike', title: 'Barber', bio: '' },
  { name: 'Jose', title: 'Barber', bio: '' },
];

const GALLERY_IMAGES = [
  { src: `${GALLERY_DIR}/interior.jpg`, url: `${GALLERY_DIR}/interior.jpg`, alt: 'True Cuts at George barbershop interior' },
  { src: `${GALLERY_DIR}/hero.jpg`, url: `${GALLERY_DIR}/hero.jpg`, alt: 'True Cuts Barbershop' },
];

const SERVICES = [
  { name: 'Basic Haircut (even all around)', price: '$35', duration: '30', description: 'Even all around.' },
  { name: 'Haircut (Fade/Taper)', price: '$40', duration: '45', description: 'Fade or taper cut.' },
  { name: 'Haircut with Beard', price: '$45', duration: '45', description: 'Haircut plus beard trim.' },
  { name: 'College Haircut (with ID)', price: '$35', duration: '45', description: 'College ID required. Rutgers student discount.' },
  { name: "Kid's Haircut", price: '$25', duration: '30', description: 'Kids cut.' },
  { name: 'Shape Up (line only)', price: '$20', duration: '30', description: 'Line up only.' },
  { name: 'Beard Shaping', price: '$15', duration: '15', description: 'Beard shape and trim.' },
  { name: 'Hot Towel Shave', price: '$30', duration: '30', description: 'Hot towel shave.' },
];

function parseMoney(value) {
  const parsed = Number.parseFloat(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function patchSection(section) {
  const content = section.content || {};
  if (section.type === 'hero') {
    return {
      ...section,
      content: {
        ...content,
        eyebrow: 'True Cuts at George',
        title: 'True Cuts Barbershop',
        subtitle: '353 George Street, New Brunswick, NJ — fades, tapers, shape-ups, and hot towel shaves.',
        ctaText: 'Book Now',
        ctaLink: '#booking',
        image: HERO_SRC,
        imageAlt: 'True Cuts at George barbershop interior',
      },
    };
  }
  if (section.type === 'gallery') {
    return { ...section, content: { ...content, title: 'The Shop', images: GALLERY_IMAGES } };
  }
  if (section.type === 'social') {
    return { ...section, content: { ...content, instagram: INSTAGRAM_URL, facebook: FACEBOOK_URL } };
  }
  if (section.type === 'services') {
    return { ...section, content: { ...content, title: 'Services', items: SERVICES } };
  }
  if (section.type === 'team') {
    return { ...section, content: { ...content, title: 'Our Barbers', members: TEAM } };
  }
  if (section.type === 'booking') {
    return {
      ...section,
      content: {
        ...content,
        title: 'Book Your Appointment',
        description: BOOKING_COPY,
        enabled: true,
        provider: 'native',
        embedded: true,
        businessMode: 'team',
        staffAssignment: 'pick',
        noPreferenceText: 'Any Available Barber',
      },
    };
  }
  if (section.type === 'hours') {
    return { ...section, content: { ...content, title: 'Hours', hours: HOURS_COPY } };
  }
  if (section.type === 'location') {
    return {
      ...section,
      content: {
        ...content,
        title: 'Location',
        address: '353 George Street, New Brunswick, NJ 08901',
        instructions: '',
        mapUrl: '',
      },
    };
  }
  if (section.type === 'contact') {
    return {
      ...section,
      content: {
        ...content,
        title: 'Contact Us',
        phone: '(732) 317-1087',
        email: 'truecuts18@gmail.com',
        address: '353 George Street, New Brunswick, NJ 08901',
        hours: HOURS_COPY,
      },
    };
  }
  if (section.type === 'about') {
    return {
      ...section,
      content: {
        ...content,
        title: 'About',
        description:
          'Classy and professional barbershop on George Street. Fades, tapers, shape-ups, beard work, kids cuts, and hot towel shaves. Rutgers student discounts with ID. Walk-ins welcome — book ahead to secure your time.',
        body:
          'Classy and professional barbershop on George Street. Fades, tapers, shape-ups, beard work, kids cuts, and hot towel shaves. Rutgers student discounts with ID. Walk-ins welcome — book ahead to secure your time.',
        image: LOGO_SRC,
      },
    };
  }
  return section;
}

function buildSiteData() {
  const generated = buildNicheSiteData('salon', {
    businessName: 'True Cuts Barbershop',
    level: 'established',
    contactPhone: '(732) 317-1087',
    contactEmail: 'truecuts18@gmail.com',
    contactAddress: '353 George Street, New Brunswick, NJ 08901',
    includeStockPhotos: false,
    features: { booking: { enabled: true, offered: true } },
  });

  const sections = (generated.sections || [])
    .filter((section) => !DROP_SECTION_TYPES.has(section.type))
    .map(patchSection);

  const siteData = applyVisitorExperienceDefaults({
    ...generated,
    _demo: false,
    _themeId: THEME_ID,
    _niche: 'salon',
    _level: 'established',
    _operatingModel: {
      ...(generated._operatingModel || {}),
      level: 'established',
      businessMode: 'team',
      showTeamSection: true,
      customerPicksStaff: true,
      staffAssignment: 'pick',
      noPreferenceText: 'Any Available Barber',
    },
    colors: colorsFromSiteTheme(THEME_ID),
    brand: {
      name: 'True Cuts Barbershop',
      tagline: 'Fades & cuts on George Street',
      logo: LOGO_SRC,
      phone: '(732) 317-1087',
      email: 'truecuts18@gmail.com',
    },
    hero: { image: HERO_SRC, imageAlt: 'True Cuts at George barbershop interior' },
    social: { ...(generated.social || {}), instagram: INSTAGRAM_URL, facebook: FACEBOOK_URL },
    businessName: 'True Cuts Barbershop',
    businessHours: HOURS_COPY,
    contactAddress: '353 George Street, New Brunswick, NJ 08901',
    contact: {
      phone: '(732) 317-1087',
      email: 'truecuts18@gmail.com',
      address: '353 George Street, New Brunswick, NJ 08901',
      hours: HOURS_COPY,
    },
    team: { members: TEAM },
    products: [],
    gallery: GALLERY_IMAGES,
    booking: { enabled: true, provider: 'native', embedded: true, businessMode: 'team' },
    sections,
    settings: {
      bookingEnabled: true,
      demoMode: false,
      payOnSite: true,
      allowCheckout: false,
    },
  });

  if (siteData.booking) {
    delete siteData.booking.url;
    siteData.booking.provider = 'native';
    siteData.booking.embedded = true;
    siteData.booking.mode = 'native';
    siteData.booking.enabled = true;
    siteData.booking.businessMode = 'team';
  }
  siteData.sections = (siteData.sections || []).map((section) => {
    if (section.type !== 'booking') return section;
    const content = { ...(section.content || {}) };
    delete content.url;
    delete content.mode;
    return {
      ...section,
      content: {
        ...content,
        provider: 'native',
        embedded: true,
        description: BOOKING_COPY,
        businessMode: 'team',
      },
    };
  });
  siteData.nav = buildSiteNav(siteData);
  return siteData;
}

async function ensureAdminOwner() {
  const admin = await prisma.users.findFirst({
    where: { role: 'admin' },
    orderBy: { created_at: 'asc' },
  });
  if (!admin) {
    throw new Error('Claimable prospect sites must be owned by an admin until claimed. No admin user found.');
  }
  return admin;
}

async function replaceNativeBooking(owner, siteData) {
  const tenant = await prisma.booking_tenants.findFirst({ where: { site_id: SUBDOMAIN } });
  if (tenant) {
    await prisma.appointments.deleteMany({ where: { tenant_id: tenant.id } }).catch(() => {});
    await prisma.booking_services.deleteMany({ where: { tenant_id: tenant.id } });
  }
  const ensured = await ensurePublishedBooking({ userId: owner.id, siteId: SUBDOMAIN, siteData });
  if (!ensured) throw new Error('ensurePublishedBooking failed');
  const existing = await prisma.booking_services.findMany({
    where: { tenant_id: ensured.id },
    orderBy: { display_order: 'asc' },
  });
  const existingNames = new Set(existing.map((row) => row.name.toLowerCase()));
  let order = existing.length;
  for (const item of SERVICES) {
    if (existingNames.has(item.name.toLowerCase())) continue;
    order += 1;
    await prisma.booking_services.create({
      data: {
        tenant_id: ensured.id,
        name: item.name,
        description: item.description || '',
        duration_minutes: Number.parseInt(item.duration, 10) || 30,
        price_cents: Math.round(parseMoney(item.price) * 100),
        online_booking_enabled: true,
        requires_approval: false,
        requires_payment: false,
        payment_type: 'none',
        display_order: order,
        status: 'active',
      },
    });
  }
}

async function upsertProspectSite(owner) {
  const siteData = buildSiteData();
  const claimToken = generateClaimToken();
  const payload = {
    user_id: owner.id,
    subdomain: SUBDOMAIN,
    template_id: 'salon',
    status: 'published',
    plan: 'growth',
    site_data: siteData,
    published_at: new Date(),
    created_at: new Date(),
    is_public: true,
    is_featured: false,
    json_file_path: `sites/${SUBDOMAIN}/data/site.json`,
    claim_token_hash: hashClaimToken(claimToken),
    claim_token_expires: claimExpiryDate(),
  };

  const existing = await prisma.sites.findUnique({ where: { subdomain: SUBDOMAIN } });
  if (existing) {
    await prisma.sites.update({ where: { subdomain: SUBDOMAIN }, data: payload });
  } else {
    await prisma.sites.create({ data: { id: SUBDOMAIN, ...payload } });
  }
  await replaceNativeBooking(owner, siteData);
  return { status: existing ? 'updated' : 'created', claimToken };
}

async function main() {
  const owner = await ensureAdminOwner();
  const { status, claimToken } = await upsertProspectSite(owner);
  const origin = process.env.SITE_URL || process.env.BASE_URL || 'http://localhost:5173';
  console.log(`${status}  ${origin.replace(/\/$/, '')}/view/${SUBDOMAIN}`);
  console.log(`claim   ${buildClaimUrl(claimToken)}`);
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

export { buildSiteData, SUBDOMAIN };
