#!/usr/bin/env node

/**
 * Idempotent seed for Plants & Threads (Trenton) claimable Growth shop:
 * plants (cart, pay on site) + sewing (native booking). Street stays private.
 */

import { pathToFileURL } from 'url';
import path from 'path';
import { mkdir } from 'fs/promises';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { prisma } from '../database/db.js';
import { buildNicheSiteData } from '../src/config/nicheTemplateBuilders.js';
import { buildSiteNav } from '../src/config/operatingModel.js';
import { colorsFromSiteTheme } from '../src/config/siteThemes.js';
import { applyVisitorExperienceDefaults } from '../src/utils/visitorExperience.js';
import {
  ADDRESS_DISPLAY_AREA,
  normalizeContactLocationFields,
} from '../src/utils/liveSiteContact.js';
import { applyPayOnSiteSetting } from '../server/utils/payOnSite.js';
import { writeIsolatedSiteFiles } from '../server/utils/siteIsolation.js';
import { sanitizeSiteDataForStorage } from '../server/utils/siteDataSanitizer.js';
import { ensurePublishedBooking } from '../server/services/booking/ensurePublishedBooking.js';
import { hashSourceStrings } from '../server/services/siteTranslationService.js';
import { collectTranslatableStrings } from '../src/utils/localeOverlay.js';
import {
  buildClaimUrl,
  claimExpiryDate,
  generateClaimToken,
  hashClaimToken,
} from '../server/services/claimTokenService.js';

dotenv.config();

const SUBDOMAIN = 'plants-and-threads';
const THEME_ID = 'ivory-grove';
const PRIVATE_STREET = '429 Walnut Avenue, Trenton, NJ';
const AREA_LABEL = 'Trenton, NJ';
const ASSET_DIR = process.env.PLANTS_THREADS_ASSETS
  || '/Users/persylopez/.cursor/projects/Users-persylopez-sitesprintz/assets';
const SITE_ROOT = path.join(process.cwd(), 'public', 'sites', SUBDOMAIN);
const PRODUCT_DIR = `/sites/${SUBDOMAIN}/products`;
const GALLERY_DIR = `/sites/${SUBDOMAIN}/gallery`;
const HERO_SRC = `${GALLERY_DIR}/hero.jpg`;

const HOURS_COPY = 'By appointment. Exact address is shared after you book or order.';
const LOCATION_COPY = 'Trenton, NJ. Exact address is shared after you book or order.';
const PAY_COPY = 'Pay on site. Please bring cash.';
const BOOKING_COPY = 'Book a sewing visit. Price is quoted in person. Please bring cash.';
const ABOUT_COPY = 'Plants & Threads in Trenton, NJ. Plants for sale and sewing services. Pay on site. Exact address is shared after you book or order.';

const DROP_SECTION_TYPES = new Set(['team', 'testimonials', 'faq', 'reviews', 'stats', 'how-to-order']);

const PRODUCTS = [
  { name: 'Hanging basket', price: '$25', description: 'Flowering hanging basket.', image: `${PRODUCT_DIR}/hanging-basket.jpg` },
  { name: 'Mother of Thousands', price: '$25', description: 'Kalanchoe in a terracotta pot.', image: `${PRODUCT_DIR}/mother-of-thousands.jpg` },
  { name: 'Pothos', price: '$25', description: 'Variegated pothos on a moss pole.', image: `${PRODUCT_DIR}/pothos.jpg` },
  { name: 'Impatiens', price: '$12', description: 'Pink flowering impatiens.', image: `${PRODUCT_DIR}/impatiens.jpg` },
  { name: 'Basil (Albahaca)', price: '$12', description: 'Basil plant.', image: `${PRODUCT_DIR}/basil.jpg` },
  { name: 'Eucalyptus (Eucalipto)', price: '$12', description: 'Eucalyptus plant.', image: `${PRODUCT_DIR}/eucalyptus.jpg` },
  { name: 'ZZ plant', price: '$15', description: 'ZZ plant.', image: `${PRODUCT_DIR}/zz-plant.jpg` },
  { name: 'Hibiscus', price: '$20', description: 'Hibiscus in bloom.', image: `${PRODUCT_DIR}/hibiscus.jpg` },
  { name: 'Caladium', price: '$20', description: 'Pink and green caladium.', image: `${PRODUCT_DIR}/caladium.jpg` },
  { name: 'Orange hibiscus', price: '$20', description: 'Orange hibiscus. $20 each.', image: `${PRODUCT_DIR}/hibiscus-orange.jpg` },
  { name: 'Pink hibiscus', price: '$20', description: 'Pink hibiscus. $20 each.', image: `${PRODUCT_DIR}/hibiscus-pink.jpg` },
  { name: 'Coral hibiscus', price: '$20', description: 'Coral hibiscus. $20 each.', image: `${PRODUCT_DIR}/hibiscus-coral.jpg` },
  { name: 'Apricot hibiscus', price: '$20', description: 'Apricot hibiscus with a red center. $20 each.', image: `${PRODUCT_DIR}/hibiscus-apricot.jpg` },
];

const SEWING = {
  name: 'Sewing services',
  price: '',
  duration: '60',
  description: 'Alterations and sewing. Quoted in person. Please bring cash.',
  image: HERO_SRC,
  imageAlt: 'Sewing machine among plants at Plants & Threads',
};

const GALLERY_IMAGES = [
  { src: HERO_SRC, url: HERO_SRC, alt: 'Plants and a sewing machine at Plants & Threads' },
  { src: `${GALLERY_DIR}/yard-plant.jpg`, url: `${GALLERY_DIR}/yard-plant.jpg`, alt: 'Potted plant' },
];

const ES_BY_EN = {
  'Plants & sewing in Trenton, NJ': 'Plantas y costura en Trenton, NJ',
  'Plants for sale and sewing services. Pay on site. Exact address is shared after you book or order.': 'Plantas a la venta y servicios de costura. Pago en el lugar. La dirección exacta se comparte después de reservar o pedir.',
  'Shop plants': 'Ver plantas',
  'Our Plants': 'Nuestras plantas',
  'Sewing': 'Costura',
  'Book sewing': 'Reservar costura',
  'Gallery': 'Galería',
  'Hours': 'Horario',
  'Studio': 'Taller',
  'Contact Us': 'Contáctenos',
  'About': 'Acerca de',
  'Shop': 'Tienda',
  'Book': 'Reservar',
  'Contact': 'Contacto',
  [HOURS_COPY]: 'Con cita. La dirección exacta se comparte después de reservar o pedir.',
  [LOCATION_COPY]: 'Trenton, NJ. La dirección exacta se comparte después de reservar o pedir.',
  [PAY_COPY]: 'Pago en el lugar. Por favor, traiga efectivo.',
  [BOOKING_COPY]: 'Reserve una visita de costura. El precio se cotiza en persona. Por favor, traiga efectivo.',
  [ABOUT_COPY]: 'Plants & Threads en Trenton, NJ. Plantas a la venta y servicios de costura. Pago en el lugar. La dirección exacta se comparte después de reservar o pedir.',
  'Hanging basket': 'Canasta colgante',
  'Flowering hanging basket.': 'Canasta colgante con flores.',
  'Mother of Thousands': 'Madre de miles',
  'Kalanchoe in a terracotta pot.': 'Kalanchoe en maceta de barro.',
  'Pothos': 'Pothos',
  'Variegated pothos on a moss pole.': 'Pothos variegado en tutor de musgo.',
  'Impatiens': 'Alegrías',
  'Pink flowering impatiens.': 'Alegrías con flores rosadas.',
  'Basil (Albahaca)': 'Albahaca',
  'Basil plant.': 'Planta de albahaca.',
  'Eucalyptus (Eucalipto)': 'Eucalipto',
  'Eucalyptus plant.': 'Planta de eucalipto.',
  'ZZ plant': 'Planta ZZ',
  'ZZ plant.': 'Planta ZZ.',
  'Hibiscus': 'Hibisco',
  'Hibiscus in bloom.': 'Hibisco en flor.',
  'Caladium': 'Caladio',
  'Pink and green caladium.': 'Caladio rosa y verde.',
  'Orange hibiscus': 'Hibisco naranja',
  'Orange hibiscus. $20 each.': 'Hibisco naranja. $20 cada uno.',
  'Pink hibiscus': 'Hibisco rosa',
  'Pink hibiscus. $20 each.': 'Hibisco rosa. $20 cada uno.',
  'Coral hibiscus': 'Hibisco coral',
  'Coral hibiscus. $20 each.': 'Hibisco coral. $20 cada uno.',
  'Apricot hibiscus': 'Hibisco albaricoque',
  'Apricot hibiscus with a red center. $20 each.': 'Hibisco albaricoque con centro rojo. $20 cada uno.',
  'Sewing services': 'Servicios de costura',
  'Alterations and sewing. Quoted in person. Please bring cash.': 'Arreglos y costura. Se cotiza en persona. Por favor, traiga efectivo.',
  'Trenton, NJ. Exact location sent after you book or order.': LOCATION_COPY,
};

const CROP_SHOTS = [
  { file: 'Screenshot_2026-08-29_at_2.57.39_PM-a2db8047-38a1-4938-90b4-c7fb6b9b86eb.png', dest: 'products/hanging-basket.jpg', top: 0.18, right: 0.24, bottom: 0.18 },
  { file: 'Screenshot_2026-08-29_at_2.57.51_PM-f5959f69-0438-454c-b6b1-aa58982ecada.png', dest: 'products/mother-of-thousands.jpg', top: 0.16 },
  { file: 'Screenshot_2026-08-29_at_2.58.04_PM-602a89a6-9e46-4bc3-8e7e-3ac90dd4ae44.png', dest: 'products/pothos.jpg', top: 0.16, right: 0.18, bottom: 0.12 },
  { file: 'Screenshot_2026-08-29_at_2.59.06_PM-c091713f-49a7-47d2-8225-e208669dbfdb.png', dest: 'products/impatiens.jpg', bottom: 0.28 },
  { file: 'Screenshot_2026-08-29_at_2.59.24_PM-8f99b6c9-6ae9-4fbc-a114-598bc7024aae.png', dest: 'products/basil.jpg', bottom: 0.26 },
  { file: 'Screenshot_2026-08-29_at_2.59.37_PM-2abad9c1-4d28-4ad5-b42f-3f73a8e98896.png', dest: 'products/eucalyptus.jpg', bottom: 0.28 },
  { file: 'Screenshot_2026-08-29_at_2.59.49_PM-18d67783-213c-44f2-8cb9-7c1c0803984c.png', dest: 'products/zz-plant.jpg', bottom: 0.32 },
  { file: 'Screenshot_2026-08-29_at_2.59.59_PM-976a4c03-0065-4dda-9d6e-95c474d89e42.png', dest: 'products/hibiscus.jpg', bottom: 0.26 },
  { file: 'Screenshot_2026-08-29_at_3.00.20_PM-1887f2aa-dd4a-4b89-8542-7a856e4f0f22.png', dest: 'products/caladium.jpg', bottom: 0.18 },
  { file: 'Screenshot_2026-08-29_at_2.58.40_PM-65843bf4-467f-4763-9506-eabf1dd108fb.png', dest: 'gallery/yard-plant.jpg', top: 0.06, bottom: 0.08, right: 0.06 },
];

const HIBISCUS_GRID_FILE = 'Screenshot_2026-08-29_at_3.01.01_PM-85c1a433-4874-461d-928b-2d014f789a03.png';
const HIBISCUS_GRID_DESTS = [
  'products/hibiscus-orange.jpg',
  'products/hibiscus-pink.jpg',
  'products/hibiscus-coral.jpg',
  'products/hibiscus-apricot.jpg',
];

const HERO_FILE = 'Gemini_Generated_Image_rb4gp8rb4gp8rb4g-388e744a-a5c7-4dfb-a3f6-183bcb45916a.jpg';

async function cleanPhoneScreenshot(src, dest, opts = {}) {
  const meta = await sharp(src).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (!width || !height) throw new Error(`No dimensions for ${src}`);
  const topPct = opts.top ?? 0.14;
  const bottomPct = opts.bottom ?? 0.24;
  const leftPct = opts.left ?? 0.03;
  const rightPct = opts.right ?? 0.14;
  const left = Math.round(width * leftPct);
  const top = Math.max(96, Math.round(height * topPct));
  const right = Math.max(52, Math.round(width * rightPct));
  const bottom = Math.max(110, Math.round(height * bottomPct));
  const extractWidth = Math.max(40, width - left - right);
  const extractHeight = Math.max(40, height - top - bottom);
  await sharp(src)
    .extract({ left, top, width: extractWidth, height: extractHeight })
    .removeAlpha()
    .jpeg({ quality: 88 })
    .toFile(dest);
}

async function splitHibiscusGrid(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const bg = [data[0], data[1], data[2]];
  function isBg(x, y) {
    const i = (y * width + x) * channels;
    return Math.abs(data[i] - bg[0]) < 18
      && Math.abs(data[i + 1] - bg[1]) < 18
      && Math.abs(data[i + 2] - bg[2]) < 18;
  }
  const step = 2;
  const seen = new Uint8Array(width * height);
  const cells = [];
  function flood(sx, sy) {
    const q = [[sx, sy]];
    seen[sy * width + sx] = 1;
    let minx = sx;
    let maxx = sx;
    let miny = sy;
    let maxy = sy;
    let n = 0;
    while (q.length) {
      const [x, y] = q.pop();
      n += 1;
      if (x < minx) minx = x;
      if (x > maxx) maxx = x;
      if (y < miny) miny = y;
      if (y > maxy) maxy = y;
      for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const idx = ny * width + nx;
        if (seen[idx] || isBg(nx, ny)) continue;
        seen[idx] = 1;
        q.push([nx, ny]);
      }
    }
    return { minx, maxx, miny, maxy, n };
  }
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (seen[y * width + x] || isBg(x, y)) continue;
      const box = flood(x, y);
      if (box.maxx - box.minx > 80 && box.maxy - box.miny > 80 && box.n > 400) {
        cells.push(box);
      }
    }
  }
  cells.sort((a, b) => a.miny - b.miny || a.minx - b.minx);
  if (cells.length !== 4) {
    throw new Error(`Expected 4 hibiscus photos in the grid, found ${cells.length}`);
  }
  const inset = 8;
  await Promise.all(cells.map((cell, index) => {
    const left = cell.minx + inset;
    const top = cell.miny + inset;
    const extractWidth = cell.maxx - cell.minx - inset * 2;
    const extractHeight = cell.maxy - cell.miny - inset * 2;
    return sharp(src)
      .extract({ left, top, width: extractWidth, height: extractHeight })
      .jpeg({ quality: 90 })
      .toFile(path.join(SITE_ROOT, HIBISCUS_GRID_DESTS[index]));
  }));
}

async function prepareAssets() {
  await mkdir(path.join(SITE_ROOT, 'products'), { recursive: true });
  await mkdir(path.join(SITE_ROOT, 'gallery'), { recursive: true });
  await sharp(path.join(ASSET_DIR, HERO_FILE)).jpeg({ quality: 88 }).toFile(path.join(SITE_ROOT, 'gallery', 'hero.jpg'));
  for (const shot of CROP_SHOTS) {
    await cleanPhoneScreenshot(path.join(ASSET_DIR, shot.file), path.join(SITE_ROOT, shot.dest), shot);
  }
  await splitHibiscusGrid(path.join(ASSET_DIR, HIBISCUS_GRID_FILE));
}

function attachCuratedSpanish(siteData) {
  const strings = collectTranslatableStrings(siteData);
  const translated = {};
  for (const [pathKey, english] of Object.entries(strings)) {
    translated[pathKey] = ES_BY_EN[english] ?? english;
  }
  return {
    ...siteData,
    locales: {
      ...(siteData.locales || {}),
      es: { strings: translated, sourceHash: hashSourceStrings(strings) },
    },
  };
}

function patchSection(section) {
  const content = section.content || {};
  if (section.type === 'hero') {
    return {
      ...section,
      content: {
        ...content,
        eyebrow: 'Trenton, NJ',
        title: 'Plants & Threads',
        subtitle: 'Plants for sale and sewing services. Pay on site. Exact address is shared after you book or order.',
        ctaText: 'Shop plants',
        ctaLink: '#catalog',
        image: HERO_SRC,
        imageAlt: 'Plants and a sewing machine at Plants & Threads',
      },
    };
  }
  if (section.type === 'catalog') {
    return {
      ...section,
      content: { ...content, title: 'Our Plants', items: PRODUCTS },
    };
  }
  if (section.type === 'gallery') {
    return { ...section, content: { ...content, title: 'Gallery', images: GALLERY_IMAGES } };
  }
  if (section.type === 'services') {
    return { ...section, content: { ...content, title: 'Sewing', items: [SEWING] } };
  }
  if (section.type === 'booking') {
    return {
      ...section,
      content: {
        ...content,
        title: 'Book sewing',
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
    return { ...section, content: { ...content, title: 'Hours', hours: HOURS_COPY } };
  }
  if (section.type === 'location') {
    return {
      ...section,
      content: {
        ...content,
        title: 'Studio',
        address: AREA_LABEL,
        instructions: LOCATION_COPY,
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
        address: AREA_LABEL,
        hours: HOURS_COPY,
      },
    };
  }
  if (section.type === 'about') {
    return {
      ...section,
      content: { ...content, title: 'About', description: ABOUT_COPY, body: ABOUT_COPY, image: HERO_SRC },
    };
  }
  if (section.type === 'social') {
    return { ...section, content: { ...content, instagram: '', facebook: '', maps: '' } };
  }
  return section;
}

function buildSiteData() {
  const generated = buildNicheSiteData('product-showcase', {
    businessName: 'Plants & Threads',
    level: 'solo',
    contactPhone: '',
    contactEmail: '',
    contactAddress: AREA_LABEL,
    includeStockPhotos: false,
    features: {
      booking: { enabled: true, offered: true },
      onlineOrdering: { enabled: true, offered: true },
    },
  });

  let sections = (generated.sections || [])
    .filter((section) => !DROP_SECTION_TYPES.has(section.type))
    .map(patchSection);

  if (!sections.some((section) => section.type === 'gallery')) {
    sections.push({
      id: 'gallery-plants-threads',
      type: 'gallery',
      enabled: true,
      order: 2,
      content: { title: 'Gallery', images: GALLERY_IMAGES },
    });
  }
  if (!sections.some((section) => section.type === 'services')) {
    sections.push({
      id: 'sewing-plants-threads',
      type: 'services',
      enabled: true,
      order: 3,
      content: { title: 'Sewing', items: [SEWING] },
    });
  }
  if (!sections.some((section) => section.type === 'about')) {
    sections.push({
      id: 'about-plants-threads',
      type: 'about',
      enabled: true,
      order: 4,
      content: { title: 'About', description: ABOUT_COPY, body: ABOUT_COPY, image: HERO_SRC },
    });
  }

  sections = sections.map(patchSection);

  let siteData = applyVisitorExperienceDefaults({
    ...generated,
    _demo: false,
    _themeId: THEME_ID,
    _niche: 'product-showcase',
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
    brand: { name: 'Plants & Threads', tagline: 'Plants & sewing in Trenton, NJ', logo: HERO_SRC, phone: '', email: '' },
    hero: { image: HERO_SRC, imageAlt: 'Plants and a sewing machine at Plants & Threads' },
    social: { ...(generated.social || {}), instagram: '', facebook: '', maps: '' },
    businessName: 'Plants & Threads',
    businessHours: HOURS_COPY,
    contactAddress: AREA_LABEL,
    contact: {
      phone: '',
      email: '',
      address: PRIVATE_STREET,
      addressDisplay: ADDRESS_DISPLAY_AREA,
      serviceAreaLabel: AREA_LABEL,
      serviceRadiusMiles: 10,
      hours: HOURS_COPY,
    },
    team: { members: [] },
    products: PRODUCTS,
    services: [SEWING],
    gallery: GALLERY_IMAGES,
    booking: { enabled: true, provider: 'native', embedded: true, businessMode: 'solo' },
    sections,
    settings: { bookingEnabled: true, demoMode: false, payOnSite: true, allowCheckout: true },
  });

  siteData = applyPayOnSiteSetting(siteData, true);
  siteData = normalizeContactLocationFields(siteData);
  siteData.googleMapsUrl = '';
  if (siteData.booking) {
    delete siteData.booking.url;
    siteData.booking.provider = 'native';
    siteData.booking.embedded = true;
    siteData.booking.mode = 'native';
    siteData.booking.enabled = true;
  }
  siteData.nav = buildSiteNav(siteData);
  return attachCuratedSpanish(sanitizeSiteDataForStorage(siteData));
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
  await prisma.booking_services.deleteMany({ where: { tenant_id: ensured.id } });
  await prisma.booking_services.create({
    data: {
      tenant_id: ensured.id,
      name: SEWING.name,
      description: SEWING.description,
      duration_minutes: 60,
      price_cents: 0,
      online_booking_enabled: true,
      requires_approval: false,
      requires_payment: false,
      payment_type: 'none',
      display_order: 1,
      status: 'active',
    },
  });
}

export function resolveClaimableOwnerPatch(existing, admin, {
  assignOwner = null,
  keepOwner = false,
  claimToken,
} = {}) {
  if (assignOwner?.id) {
    return {
      user_id: assignOwner.id,
      claim_token_hash: null,
      claim_token_expires: null,
    };
  }
  if (keepOwner && existing?.user_id) {
    return {
      user_id: existing.user_id,
      claim_token_hash: existing.claim_token_hash,
      claim_token_expires: existing.claim_token_expires,
    };
  }
  return {
    user_id: admin.id,
    claim_token_hash: hashClaimToken(claimToken),
    claim_token_expires: claimExpiryDate(),
  };
}

async function transferBookingTenantToUser(site, userId) {
  const siteId = site?.id ? String(site.id) : SUBDOMAIN;
  await prisma.booking_tenants.updateMany({
    where: {
      OR: [{ site_id: siteId }, { site_id: SUBDOMAIN }],
    },
    data: { user_id: userId },
  });
}

async function upsertProspectSite(admin, { assignOwner = null, keepOwner = false } = {}) {
  const siteData = buildSiteData();
  const claimToken = generateClaimToken();
  const existing = await prisma.sites.findUnique({ where: { subdomain: SUBDOMAIN } });
  const ownership = resolveClaimableOwnerPatch(existing, admin, {
    assignOwner,
    keepOwner,
    claimToken,
  });
  const payload = {
    ...ownership,
    subdomain: SUBDOMAIN,
    template_id: 'product-showcase',
    status: 'published',
    plan: 'growth',
    site_data: siteData,
    published_at: new Date(),
    created_at: existing?.created_at || new Date(),
    is_public: true,
    is_featured: false,
    json_file_path: `sites/${SUBDOMAIN}/data/site.json`,
  };

  let site;
  if (existing) {
    site = await prisma.sites.update({ where: { subdomain: SUBDOMAIN }, data: payload });
  } else {
    site = await prisma.sites.create({ data: { id: SUBDOMAIN, ...payload } });
  }
  await writeIsolatedSiteFiles(SUBDOMAIN, siteData);
  if (assignOwner || keepOwner) {
    await transferBookingTenantToUser(site, site.user_id);
  } else {
    await replaceNativeBooking(admin, siteData);
  }
  return { status: existing ? 'updated' : 'created', claimToken, ownerId: site.user_id };
}

async function main() {
  if (process.env.SKIP_PLANTS_ASSETS !== '1') {
    await prepareAssets();
  }
  const assignEmail = String(process.env.ASSIGN_OWNER_EMAIL || '').trim().toLowerCase();
  const assignOwner = assignEmail
    ? await prisma.users.findFirst({
      where: { email: { equals: assignEmail, mode: 'insensitive' } },
    })
    : null;
  if (assignEmail && !assignOwner) {
    throw new Error(`No user found for ${assignEmail}. They must have an account before ownership can move.`);
  }
  const admin = await ensureAdminOwner();
  const keepOwner = process.env.KEEP_CLAIM_OWNER === '1';
  const { status, claimToken, ownerId } = await upsertProspectSite(admin, { assignOwner, keepOwner });
  const origin = process.env.SITE_URL || process.env.BASE_URL || 'http://localhost:5173';
  console.log(`${status}  ${origin.replace(/\/$/, '')}/view/${SUBDOMAIN}`);
  console.log(`owner   ${assignOwner?.email || (keepOwner ? ownerId : admin.email)}`);
  if (!assignOwner && !keepOwner) {
    console.log(`claim   ${buildClaimUrl(claimToken)}`);
  }
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

export { buildSiteData, SUBDOMAIN, PRIVATE_STREET };
