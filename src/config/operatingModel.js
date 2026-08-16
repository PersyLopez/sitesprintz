/**
 * Operating model — what a non-solopreneur site actually has to do.
 *
 * Business *level* (solo / studio / established) is how dense the site looks.
 * Operating *model* is how work gets done:
 *   - owner:    one person is the provider (solopreneur)
 *   - pick:     customers choose a person (salon, gym, associates)
 *   - dispatch: the business assigns who goes (trades, cleaning, tow)
 *   - showcase: people appear on the site but are not bookable (kitchen, makers)
 *
 * Booking already supports solo / team / hybrid. This module is the niche-aware
 * default so templates, the wizard, and live nav all tell the same story.
 */

import { getLayoutForNiche } from './layouts.js';
import { getNamedTeamMembers } from '../utils/businessScale.js';

export const STAFF_ASSIGNMENT = {
  OWNER: 'owner',
  PICK: 'pick',
  DISPATCH: 'dispatch',
  SHOWCASE: 'showcase',
};

const NICHE_TEAM_COPY = {
  salon: { teamTitle: 'Meet Our Stylists', noPreferenceText: 'Any Available Stylist', bookingNavLabel: 'Book' },
  gym: { teamTitle: 'Our Trainers', noPreferenceText: 'Any Available Trainer', bookingNavLabel: 'Book' },
  'pet-care': { teamTitle: 'Our Groomers', noPreferenceText: 'Any Groomer', bookingNavLabel: 'Book' },
  'tech-repair': { teamTitle: 'Our Technicians', noPreferenceText: 'Any Technician', bookingNavLabel: 'Book' },
  cleaning: { teamTitle: 'Our Crew', noPreferenceText: 'Next Available', bookingNavLabel: 'Request' },
  electrician: { teamTitle: 'Our Electricians', noPreferenceText: 'Next Available', bookingNavLabel: 'Request' },
  plumbing: { teamTitle: 'Our Plumbers', noPreferenceText: 'Next Available', bookingNavLabel: 'Request' },
  'auto-repair': { teamTitle: 'Our Technicians', noPreferenceText: 'Next Available', bookingNavLabel: 'Request' },
  'tow-truck': { teamTitle: 'Our Drivers', noPreferenceText: 'Next Available', bookingNavLabel: 'Call' },
  consultant: { teamTitle: 'Our Advisors', noPreferenceText: 'Any Available', bookingNavLabel: 'Book' },
  freelancer: { teamTitle: 'The Studio', noPreferenceText: 'Any Available', bookingNavLabel: 'Book' },
  restaurant: { teamTitle: 'Meet the Kitchen', noPreferenceText: null, bookingNavLabel: 'Reserve' },
  'product-ordering': { teamTitle: 'Our Team', noPreferenceText: null, bookingNavLabel: 'Order' },
  'product-showcase': { teamTitle: 'Our Makers', noPreferenceText: null, bookingNavLabel: 'Shop' },
};

const DEFAULT_COPY = {
  teamTitle: 'Our Team',
  noPreferenceText: 'Any Available',
  bookingNavLabel: 'Book',
};

function copyFor(niche) {
  return NICHE_TEAM_COPY[niche] || DEFAULT_COPY;
}

function assignmentForLayout(layoutKey) {
  switch (layoutKey) {
    case 'atelier':
      return STAFF_ASSIGNMENT.PICK;
    case 'craftsman':
      return STAFF_ASSIGNMENT.DISPATCH;
    case 'counsel':
      return STAFF_ASSIGNMENT.PICK;
    case 'mercantile':
      return STAFF_ASSIGNMENT.SHOWCASE;
    default:
      return STAFF_ASSIGNMENT.OWNER;
  }
}

function businessModeFor(assignment, isSolo) {
  if (isSolo) return 'solo';
  if (assignment === STAFF_ASSIGNMENT.PICK) return 'team';
  if (assignment === STAFF_ASSIGNMENT.DISPATCH) return 'hybrid';
  return 'solo';
}

function wizardNote(assignment, isSolo, level) {
  if (isSolo) {
    return 'Customers work with you. No team page, and no staff picker.';
  }
  if (assignment === STAFF_ASSIGNMENT.PICK) {
    return level === 'established'
      ? 'Full team grid plus reviews. Clients can book a specific person or take the next available.'
      : 'Adds a team page and lets clients pick who they see.';
  }
  if (assignment === STAFF_ASSIGNMENT.DISPATCH) {
    return level === 'established'
      ? 'Show the crew, credentials, and reviews. Customers request a time — you decide who goes.'
      : 'Adds a crew page. Customers request a time; you dispatch the right person.';
  }
  return level === 'established'
    ? 'Show the people behind the business. Ordering and reservations stay simple — no staff picker.'
    : 'Adds a people section. Customers still order or reserve without choosing a person.';
}

/**
 * @param {string} [niche]
 * @param {string} [level]
 * @returns {Object} Operating model for this niche + level
 */
export function resolveOperatingModel(niche, level = 'solo') {
  const isSolo = !level || level === 'solo';
  const layout = getLayoutForNiche(niche);
  const assignment = isSolo ? STAFF_ASSIGNMENT.OWNER : assignmentForLayout(layout);
  const copy = copyFor(niche);
  const businessMode = businessModeFor(assignment, isSolo);

  return {
    niche: niche || null,
    layout,
    level: isSolo ? 'solo' : level,
    staffAssignment: assignment,
    businessMode,
    customerPicksStaff: assignment === STAFF_ASSIGNMENT.PICK,
    showTeamSection: !isSolo,
    teamTitle: isSolo ? 'About' : copy.teamTitle,
    noPreferenceText: isSolo ? null : copy.noPreferenceText,
    bookingNavLabel: copy.bookingNavLabel,
    allowNoPreference: assignment !== STAFF_ASSIGNMENT.SHOWCASE,
    wizardNote: wizardNote(assignment, isSolo, level),
  };
}

/**
 * Short implication line for the wizard level cards.
 * @param {string} niche
 * @param {string} level
 * @returns {string}
 */
export function getOperatingImplication(niche, level) {
  return resolveOperatingModel(niche, level).wizardNote;
}

function navTeamLabel(teamTitle, namedCount) {
  if (namedCount <= 1) return 'About';
  const trimmed = String(teamTitle || 'Team')
    .replace(/^Meet\s+/i, '')
    .replace(/^Our\s+/i, '')
    .trim();
  return trimmed || 'Team';
}

/**
 * Build public nav from the sections that will actually appear.
 * Team is linked only when named people exist (empty crew pages stay out of nav).
 * @param {Object} siteData
 * @returns {{ label: string, href: string }[]}
 */
export function buildSiteNav(siteData = {}) {
  const model = siteData._operatingModel
    || resolveOperatingModel(siteData._niche, siteData._level);
  const named = getNamedTeamMembers(siteData);
  const types = new Set(
    (Array.isArray(siteData.sections) ? siteData.sections : [])
      .filter((section) => section && section.enabled !== false)
      .map((section) => section.type)
  );

  const items = [];
  if (types.has('services')) items.push({ label: 'Services', href: '#services' });
  if (types.has('catalog')) {
    const label = siteData._niche === 'restaurant' ? 'Menu' : 'Shop';
    items.push({ label, href: '#catalog' });
  }
  if (types.has('gallery')) items.push({ label: 'Gallery', href: '#gallery' });
  if (types.has('team') && named.length > 0) {
    items.push({
      label: navTeamLabel(model.teamTitle, named.length),
      href: '#team',
    });
  }
  if (types.has('case-studies')) items.push({ label: 'Work', href: '#case-studies' });
  if (types.has('booking')) {
    items.push({ label: model.bookingNavLabel || 'Book', href: '#booking' });
  }
  if (types.has('contact')) items.push({ label: 'Contact', href: '#contact' });
  return items.slice(0, 6);
}
