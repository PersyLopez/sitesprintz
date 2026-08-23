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

function parseMoney(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDurationMinutes(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
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
export function pickBookingServicesFromSiteData(siteData = {}) {
  const niche = siteData._niche || siteData.niche || '';
  const fromServices = asItemList(siteData.services);
  const fromMenu = (siteData.menu?.sections || []).flatMap((section) => section.items || []);
  const fromSections = (siteData.sections || [])
    .filter((section) => ['services', 'menu', 'catalog'].includes(section?.type))
    .flatMap((section) => section.content?.items || section.content?.sections?.flatMap((s) => s.items || []) || []);
  const fromProducts = Array.isArray(siteData.products) ? siteData.products : [];
  const pool = [...fromServices, ...fromSections, ...fromMenu, ...fromProducts]
    .filter((item) => item && item.name)
    .slice(0, 5);

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
 * Create or reuse a site-scoped booking tenant and seed services when empty.
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

  if (existingCount === 0) {
    const picks = pickBookingServicesFromSiteData(data);
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
