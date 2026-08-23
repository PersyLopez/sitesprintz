#!/usr/bin/env node

/**
 * Idempotent seed for the D.E.E.Z. Hands / DH Makeup Artistry claimable
 * Growth salon prospect. Does not touch gallery EXAMPLES.
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

const SUBDOMAIN = 'dh-makeup-artistry';
const THEME_ID = 'onyx-oxblood';
const INSTAGRAM_URL = 'https://www.instagram.com/d.e.e.z._hands/';
const GALLERY_DIR = `/sites/${SUBDOMAIN}/gallery`;
const SERVICE_DIR = `/sites/${SUBDOMAIN}/services`;
const LOGO_SRC = `${GALLERY_DIR}/logo.jpg`;
const HERO_SRC = `${SERVICE_DIR}/soft-glam.jpg`;
const SKIP_GALLERY = new Set(['10']);
const GALLERY_IMAGES = Array.from({ length: 12 }, (_, index) => {
  const n = String(index + 1).padStart(2, '0');
  if (SKIP_GALLERY.has(n)) return null;
  return {
    src: `${GALLERY_DIR}/${n}.jpg`,
    url: `${GALLERY_DIR}/${n}.jpg`,
    alt: 'DH Makeup Artistry work from @d.e.e.z._hands',
  };
}).filter(Boolean);

const HOURS_COPY = 'By appointment. Exact studio location sent the day before.';
const LOCATION_INSTRUCTIONS = 'Exact location in Trenton is sent the day before your appointment.';
const BOOKING_COPY = 'Book your look here. Deposits are non-refundable. Remaining balance is cash at the ATM before your appointment.';
const DROP_SECTION_TYPES = new Set(['team', 'testimonials', 'faq']);

const SERVICES = [
  {
    name: 'Natural Beat',
    price: '$91',
    duration: '60',
    description: 'Full face makeup application. No eyeshadow. 1 hour.',
    image: `${SERVICE_DIR}/natural-beat.jpg`,
    imageAlt: 'Natural Beat — full face, no eyeshadow',
  },
  {
    name: 'Soft Glam',
    price: '$96',
    duration: '80',
    description: 'Soft eye look with 2–3 colors. Neutrals and shimmers. No glitter or bold color. 1 hour 20 minutes.',
    image: `${SERVICE_DIR}/soft-glam.jpg`,
    imageAlt: 'Soft Glam — neutrals and shimmers',
  },
  {
    name: 'Barbie Glam',
    price: '$101',
    duration: '90',
    description: 'Any color or bold look. Glitter on the bottom lash line. 1 hour 30 minutes.',
    image: `${SERVICE_DIR}/barbie-glam.jpg`,
    imageAlt: 'Barbie Glam — bold color with glitter on the lash line',
  },
  {
    name: 'Glitter Goddess',
    price: '$106',
    duration: '90',
    description: 'Full glitter glam. 1 hour 30 minutes.',
    image: `${SERVICE_DIR}/glitter-goddess.jpg`,
    imageAlt: 'Glitter Goddess — full glitter glam',
  },
];

function patchSection(section) {
  const content = section.content || {};
  if (section.type === 'hero') {
    return {
      ...section,
      content: {
        ...content,
        eyebrow: 'D.E.E.Z. Hands',
        title: 'DH Makeup Artistry',
        subtitle: 'Trenton, NJ — exact location sent the day before your appointment.',
        ctaText: 'Book Now',
        ctaLink: '#booking',
        image: HERO_SRC,
        imageAlt: 'Soft glam look by DH Makeup Artistry',
      },
    };
  }
  if (section.type === 'gallery') {
    return {
      ...section,
      content: { ...content, title: 'Client Cam', images: GALLERY_IMAGES },
    };
  }
  if (section.type === 'social') {
    return {
      ...section,
      content: { ...content, instagram: INSTAGRAM_URL },
    };
  }
  if (section.type === 'services') {
    return {
      ...section,
      content: { ...content, title: 'Services', items: SERVICES },
    };
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
        businessMode: 'solo',
        staffAssignment: 'owner',
        noPreferenceText: null,
      },
    };
  }
  if (section.type === 'hours') {
    return {
      ...section,
      content: { ...content, title: 'Hours', hours: HOURS_COPY },
    };
  }
  if (section.type === 'location') {
    return {
      ...section,
      content: {
        ...content,
        title: 'Studio',
        address: 'Trenton, NJ',
        instructions: LOCATION_INSTRUCTIONS,
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
        phone: '',
        email: '',
        address: 'Trenton, NJ',
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
        description: 'D.E.E.Z. Hands is DH Makeup Artistry in Trenton, NJ. Exact location is sent the day before your appointment. Deposits are non-refundable; remaining balance is cash at the ATM before your appointment.',
        body: 'D.E.E.Z. Hands is DH Makeup Artistry in Trenton, NJ. Exact location is sent the day before your appointment. Deposits are non-refundable; remaining balance is cash at the ATM before your appointment.',
        image: LOGO_SRC,
      },
    };
  }
  return section;
}

function buildSiteData() {
  const generated = buildNicheSiteData('salon', {
    businessName: 'DH Makeup Artistry',
    level: 'solo',
    contactPhone: '',
    contactEmail: '',
    contactAddress: 'Trenton, NJ',
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
    _level: 'solo',
    _operatingModel: {
      ...(generated._operatingModel || {}),
      level: 'solo',
      businessMode: 'solo',
      showTeamSection: false,
      staffAssignment: 'owner',
      noPreferenceText: null,
    },
    colors: colorsFromSiteTheme(THEME_ID),
    brand: {
      name: 'DH Makeup Artistry',
      tagline: 'Glam makeup in Trenton, NJ',
      logo: LOGO_SRC,
      phone: '',
      email: '',
    },
    hero: {
      image: HERO_SRC,
      imageAlt: 'Soft glam look by DH Makeup Artistry',
    },
    social: {
      ...(generated.social || {}),
      instagram: INSTAGRAM_URL,
    },
    businessName: 'DH Makeup Artistry',
    businessHours: HOURS_COPY,
    contactAddress: 'Trenton, NJ',
    contact: {
      phone: '',
      email: '',
      address: 'Trenton, NJ',
      hours: HOURS_COPY,
    },
    team: { members: [] },
    products: [],
    gallery: GALLERY_IMAGES,
    booking: {
      enabled: true,
      provider: 'native',
      embedded: true,
      businessMode: 'solo',
    },
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
  const tenant = await prisma.booking_tenants.findFirst({
    where: { site_id: SUBDOMAIN },
  });
  if (tenant) {
    await prisma.appointments.deleteMany({ where: { tenant_id: tenant.id } }).catch(() => {});
    await prisma.booking_services.deleteMany({ where: { tenant_id: tenant.id } });
  }
  await ensurePublishedBooking({
    userId: owner.id,
    siteId: SUBDOMAIN,
    siteData,
  });
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
