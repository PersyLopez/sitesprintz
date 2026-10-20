/**
 * Ensure a published site with embedded booking has a tenant, bookable
 * services, and default staff hours so the visitor widget works immediately.
 */

import { prisma } from '../../../database/db.js';
import { siteWantsNativeBooking } from '../../../src/utils/visitorExperience.js';
import { getNamedTeamMembers } from '../../../src/utils/businessScale.js';
import { resolveOperatingModel } from '../../../src/config/operatingModel.js';
import { parseSiteDataJson } from '../../utils/showcaseDemo.js';
import StaffManagementService from './StaffManagementService.js';
import TenantService from './TenantService.js';

const tenantService = new TenantService();
const staffService = new StaffManagementService();

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

/** Niches without a menu of their own. One honest request, not another trade’s prices. */
const UNLISTED_BOOKING_REQUEST = [
  {
    name: 'Appointment request',
    price: 0,
    duration: 60,
    description: 'Tell us what you need. We confirm the time and price before we start.',
  },
];

function parseMoney(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDurationMinutes(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return clampBookableMinutes(value);
  }
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return 60;

  const range = text.match(
    /(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?|m)?/
  );
  if (range) {
    return clampBookableMinutes(toMinutes(range[2], range[3]));
  }

  const labeled = text.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?|m)\b/);
  if (labeled) {
    return clampBookableMinutes(toMinutes(labeled[1], labeled[2]));
  }

  const bare = Number.parseFloat(text);
  if (Number.isFinite(bare) && bare > 0) return clampBookableMinutes(bare);
  return 60;
}

function toMinutes(amount, unit) {
  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value) || value <= 0) return 60;
  return String(unit || '').startsWith('h') ? value * 60 : value;
}

function clampBookableMinutes(minutes) {
  const rounded = Math.round(minutes);
  if (!Number.isFinite(rounded) || rounded < 1) return 60;
  return Math.min(480, rounded);
}

function asItemList(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray(value.items)) return value.items;
  return [];
}

/**
 * Pick bookable services from published site content.
 *
 * @param {object} siteData
 * @returns {Array<{ name: string, description: string, price: number, duration: number }>}
 */
function mapBookableItem(item) {
  const sourceDuration = item.duration || item.duration_minutes || 60;
  return {
    name: item.name,
    description: item.description || '',
    price: parseMoney(item.price),
    duration: parseDurationMinutes(sourceDuration),
    sourceDuration,
  };
}

/**
 * Republish repair for durations that were stored with the old minute parse.
 * "3 hours" used to become 3. An owner edit that is no longer that leftover stays.
 *
 * @param {Array<{ id: string, name: string, duration_minutes: number }>} existing
 * @param {Array<{ name: string, duration: number, sourceDuration?: string|number }>} picks
 * @returns {Array<{ id: string, duration_minutes: number }>}
 */
export function durationCorrections(existing, picks) {
  const byName = new Map();
  for (const pick of picks || []) {
    const key = String(pick?.name || '').trim().toLowerCase();
    if (key && !byName.has(key)) byName.set(key, pick);
  }
  const updates = [];
  for (const row of existing || []) {
    const pick = byName.get(String(row?.name || '').trim().toLowerCase());
    if (!pick) continue;
    const next = correctedDuration(row.duration_minutes, pick.sourceDuration ?? pick.duration);
    if (next == null || !row.id) continue;
    updates.push({ id: row.id, duration_minutes: next });
  }
  return updates;
}

function correctedDuration(stored, label) {
  const correct = parseDurationMinutes(label);
  const storedMinutes = Number(stored);
  if (!Number.isFinite(storedMinutes) || storedMinutes === correct) return null;
  const broken = Number.parseInt(String(label ?? '').trim(), 10);
  if (Number.isFinite(broken) && storedMinutes === broken && broken !== correct) return correct;
  return null;
}

export function pickBookingServicesFromSiteData(siteData = {}) {
  const niche = siteData._niche || siteData.niche || '';
  const fromServices = asItemList(siteData.services);
  const fromServiceSections = (siteData.sections || [])
    .filter((section) => section?.type === 'services')
    .flatMap((section) => section.content?.items || []);
  const explicit = [...fromServices, ...fromServiceSections].filter((item) => item && item.name);

  if (explicit.length > 0 && niche !== 'restaurant') {
    return explicit.slice(0, 40).map(mapBookableItem);
  }

  const fromMenu = (siteData.menu?.sections || []).flatMap((section) => section.items || []);
  const fromSections = (siteData.sections || [])
    .filter((section) => ['menu', 'catalog'].includes(section?.type))
    .flatMap((section) => section.content?.items || section.content?.sections?.flatMap((s) => s.items || []) || []);
  const fromProducts = Array.isArray(siteData.products) ? siteData.products : [];
  const pool = [...fromSections, ...fromMenu, ...fromProducts]
    .filter((item) => item && item.name)
    .slice(0, 40);

  if (pool.length > 0 && niche !== 'restaurant') {
    return pool.map(mapBookableItem);
  }

  return BOOKING_FALLBACKS[niche] || UNLISTED_BOOKING_REQUEST;
}

/**
 * Named providers to seed when the published site is team or hybrid.
 *
 * @param {object} siteData
 * @returns {{
 *   businessMode: string,
 *   staffSelectionEnabled: boolean,
 *   noPreferenceText: string,
 *   members: Array<{ name: string, title: string, bio: string, is_primary: boolean, display_order: number }>
 * }}
 */
export function pickBookingStaffFromSiteData(siteData = {}) {
  const model = siteData._operatingModel
    || resolveOperatingModel(siteData._niche || siteData.niche, siteData._level);
  const bookingSection = (siteData.sections || []).find(
    (section) => section?.type === 'booking' || section?.type === 'native-booking'
  );
  const businessMode = siteData.booking?.businessMode
    || bookingSection?.content?.businessMode
    || model.businessMode
    || 'solo';
  const named = namedTeamForBooking(siteData);
  const seedsTeam = businessMode === 'team' || businessMode === 'hybrid';
  const staffSelectionEnabled = businessMode === 'team'
    || model.customerPicksStaff === true;

  return {
    businessMode,
    staffSelectionEnabled,
    noPreferenceText: siteData.booking?.noPreferenceText
      || bookingSection?.content?.noPreferenceText
      || model.noPreferenceText
      || 'Any Available',
    members: seedsTeam
      ? named.map((member, index) => ({
          name: String(member.name).trim(),
          title: member.title || member.role || null,
          bio: member.bio || '',
          is_primary: index === 0,
          display_order: index,
        }))
      : [],
  };
}

function namedTeamForBooking(siteData) {
  const fromTop = getNamedTeamMembers(siteData);
  if (fromTop.length >= 2) return fromTop;
  const section = (siteData.sections || []).find((item) => item?.type === 'team');
  const fromSection = getNamedTeamMembers(null, section?.content?.members || []);
  return fromSection.length ? fromSection : fromTop;
}

async function loadSiteRecord(userId, siteId) {
  if (!siteId) return null;
  const key = String(siteId);
  return prisma.sites.findFirst({
    where: {
      user_id: userId,
      OR: [{ id: key }, { subdomain: key }],
    },
  });
}

/**
 * Create or reuse a site-scoped booking tenant, seed services when empty,
 * and repair hour labels that were stored as a few minutes.
 *
 * @param {object} options
 * @param {string} options.userId
 * @param {string} options.siteId
 * @param {object} [options.siteData]
 * @returns {Promise<object|null>}
 */
export async function ensurePublishedBooking({ userId, siteId, siteData } = {}) {
  if (!userId || !siteId) return null;

  let data = siteData;
  if (!data) {
    const site = await loadSiteRecord(userId, siteId);
    data = parseSiteDataJson(site);
  }
  if (!siteWantsNativeBooking(data)) return null;

  const tenant = await tenantService.getOrCreateTenant(userId, String(siteId));
  const businessName = data.brand?.name || data.businessName || tenant.business_name;
  if (businessName && businessName !== tenant.business_name) {
    await prisma.booking_tenants.update({
      where: { id: tenant.id },
      data: { business_name: businessName },
    });
    tenant.business_name = businessName;
  }

  const existingCount = await prisma.booking_services.count({
    where: { tenant_id: tenant.id },
  });

  const picks = pickBookingServicesFromSiteData(data);
  if (existingCount === 0) {
    for (const [index, item] of picks.entries()) {
      await prisma.booking_services.create({
        data: {
          tenant_id: tenant.id,
          name: item.name,
          description: item.description || '',
          duration_minutes: parseDurationMinutes(item.duration),
          price_cents: Math.round(parseMoney(item.price) * 100),
          online_booking_enabled: true,
          requires_approval: false,
          requires_payment: false,
          payment_type: 'none',
          display_order: index + 1,
          status: 'active',
        },
      });
    }
  } else {
    const existing = await prisma.booking_services.findMany({
      where: { tenant_id: tenant.id },
      select: { id: true, name: true, duration_minutes: true },
    });
    for (const update of durationCorrections(existing, picks)) {
      await prisma.booking_services.update({
        where: { id: update.id },
        data: { duration_minutes: update.duration_minutes },
      });
    }
  }

  await ensurePublishedStaff(tenant, data);
  return tenant;
}

async function ensurePublishedStaff(tenant, siteData) {
  const { businessMode, staffSelectionEnabled, noPreferenceText, members } =
    pickBookingStaffFromSiteData(siteData);

  await staffService.getOrCreateDefaultStaff(tenant.id);

  if (members.length >= 2) {
    const existing = await prisma.booking_staff.findMany({
      where: { tenant_id: tenant.id },
      orderBy: { created_at: 'asc' },
    });
    const byName = new Map(existing.map((staff) => [staff.name.toLowerCase(), staff]));
    const defaultStaff = existing[0];

    if (
      defaultStaff
      && members[0]
      && !byName.has(members[0].name.toLowerCase())
      && (defaultStaff.name === tenant.business_name || defaultStaff.name === 'My Business')
    ) {
      await prisma.booking_staff.update({
        where: { id: defaultStaff.id },
        data: {
          name: members[0].name,
          title: members[0].title,
          bio: members[0].bio,
          is_primary: true,
          display_order: 0,
        },
      });
      byName.delete(defaultStaff.name.toLowerCase());
      byName.set(members[0].name.toLowerCase(), defaultStaff);
    }

    for (const member of members) {
      const key = member.name.toLowerCase();
      if (byName.has(key)) continue;
      const created = await prisma.booking_staff.create({
        data: {
          tenant_id: tenant.id,
          name: member.name,
          title: member.title,
          bio: member.bio,
          is_primary: member.is_primary,
          display_order: member.display_order,
          status: 'active',
        },
      });
      await staffService.ensureDefaultAvailabilityRules(created.id, tenant.id);
      byName.set(key, created);
    }
  }

  await prisma.booking_tenants.update({
    where: { id: tenant.id },
    data: {
      business_mode: businessMode,
      staff_selection_enabled: staffSelectionEnabled,
      no_preference_text: noPreferenceText,
    },
  });
}
