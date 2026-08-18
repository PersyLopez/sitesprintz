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

const GENERIC_ROSTER = [
  { name: 'Alex Morgan', title: 'Lead', bio: 'Experienced, detail-oriented, and easy to book with.' },
  { name: 'Jamie Lee', title: 'Associate', bio: 'Focused on a great visit every time.' },
  { name: 'Casey Brooks', title: 'Specialist', bio: 'Here for the details that make the difference.' },
];

const DEFAULT_ROSTERS = {
  salon: [
    { name: 'Sarah Williams', title: 'Master Colorist', bio: 'Balayage, color correction, and custom formulations.' },
    { name: 'Alex Rodriguez', title: 'Lead Stylist', bio: 'Precision cuts and wearable everyday styles.' },
    { name: 'Maya Patel', title: 'Bridal Specialist', bio: 'Extensions, updos, and wedding-day styling.' },
    { name: 'Elena Vasquez', title: 'Colorist', bio: 'Gloss, tone, and lived-in color.' },
  ],
  gym: [
    { name: 'Jordan Blake', title: 'Head Coach', bio: 'Strength programming and first-session assessments.' },
    { name: 'Sam Ortiz', title: 'Trainer', bio: 'Small-group circuits and form coaching.' },
    { name: 'Riley Chen', title: 'Recovery Specialist', bio: 'Mobility work and post-workout recovery.' },
    { name: 'Quinn Walsh', title: 'Coach', bio: 'Conditioning and goal-based training plans.' },
  ],
  'pet-care': [
    { name: 'Nina Brooks', title: 'Lead Groomer', bio: 'Full grooms for anxious and long-coat dogs.' },
    { name: 'Owen Park', title: 'Groomer', bio: 'Bath, brush, and tidy trims.' },
    { name: 'Cam Ellis', title: 'Wellness Tech', bio: 'Nails, ears, and low-stress handling.' },
  ],
  'tech-repair': [
    { name: 'Priya Shah', title: 'Lead Technician', bio: 'Phones, laptops, and same-day diagnostics.' },
    { name: 'Noah Kim', title: 'Technician', bio: 'Screen repairs and data recovery.' },
    { name: 'Taylor Reed', title: 'Bench Tech', bio: 'Boards, batteries, and warranty work.' },
  ],
  cleaning: [
    { name: 'Dana Ruiz', title: 'Crew Lead', bio: 'Move-outs and recurring commercial routes.' },
    { name: 'Chris Hale', title: 'Cleaner', bio: 'Detail kitchens, baths, and high-touch surfaces.' },
    { name: 'Pat Nguyen', title: 'Cleaner', bio: 'Eco-friendly products and after-hours jobs.' },
  ],
  electrician: [
    { name: 'Morgan Ellis', title: 'Master Electrician', bio: 'Panels, permits, and troubleshooting.' },
    { name: 'Drew Patel', title: 'Journeyman', bio: 'Lighting, outlets, and EV chargers.' },
    { name: 'Sky Harmon', title: 'Apprentice', bio: 'Rough-in, punch lists, and service calls.' },
  ],
  plumbing: [
    { name: 'Reese Dalton', title: 'Lead Plumber', bio: 'Leaks, water heaters, and repipes.' },
    { name: 'Avery Cole', title: 'Plumber', bio: 'Drains, fixtures, and emergency calls.' },
    { name: 'Lane Ortiz', title: 'Service Tech', bio: 'Cameras, snaking, and same-day fixes.' },
  ],
  'auto-repair': [
    { name: 'Chris Nguyen', title: 'Shop Foreman', bio: 'Diagnostics and complex drivability.' },
    { name: 'Sam Rivera', title: 'Technician', bio: 'Brakes, oil, and inspections.' },
    { name: 'Jordan West', title: 'Technician', bio: 'Tires, alignments, and scheduled service.' },
  ],
  'tow-truck': [
    { name: 'Dale Brooks', title: 'Lead Driver', bio: 'Highway recovery and locked-vehicle calls.' },
    { name: 'Kim Alvarez', title: 'Driver', bio: 'Local tows and jump starts.' },
    { name: 'Ray Chen', title: 'Driver', bio: 'Night shift and heavy recovery.' },
  ],
  consultant: [
    { name: 'Amelia Hart', title: 'Principal', bio: 'Strategy, ops, and executive workshops.' },
    { name: 'Ben Okonkwo', title: 'Advisor', bio: 'Finance and growth planning.' },
    { name: 'Sofia Marin', title: 'Advisor', bio: 'Go-to-market and org design.' },
  ],
  freelancer: [
    { name: 'Mira Chen', title: 'Creative Director', bio: 'Brand systems and campaign design.' },
    { name: 'Luis Ortega', title: 'Designer', bio: 'Web, print, and product UI.' },
  ],
  restaurant: [
    { name: 'James Chen', title: 'Executive Chef', bio: 'Seasonal menus and the chef’s counter.' },
    { name: 'Sophie Laurent', title: 'Pastry Chef', bio: 'Dessert program and breads.' },
    { name: 'Marcus Williams', title: 'Sommelier', bio: 'Pairings and the wine list.' },
  ],
  'product-ordering': [
    { name: 'Harper Quinn', title: 'Studio Lead', bio: 'Product development and wholesale.' },
    { name: 'Ivy Stone', title: 'Maker', bio: 'Small-batch production.' },
    { name: 'Theo Nash', title: 'Fulfillment', bio: 'Orders, packing, and pickup.' },
  ],
  'product-showcase': [
    { name: 'Harper Quinn', title: 'Studio Lead', bio: 'Collections and custom commissions.' },
    { name: 'Ivy Stone', title: 'Maker', bio: 'Craft and finishing.' },
    { name: 'Theo Nash', title: 'Studio', bio: 'Shows, shipping, and client visits.' },
  ],
};

/**
 * Named people the wizard publishes for studio / established sites.
 * Solo sites stay owner-operated with no team grid.
 *
 * @param {string} [niche]
 * @param {string} [level]
 * @returns {{ name: string, title: string, bio: string }[]}
 */
export function defaultNamedTeamMembers(niche, level = 'solo') {
  if (!level || level === 'solo') return [];
  const roster = DEFAULT_ROSTERS[niche] || GENERIC_ROSTER;
  const take = level === 'established' ? Math.min(roster.length, 4) : Math.min(roster.length, 3);
  return roster.slice(0, Math.max(2, take)).map((member) => ({ ...member }));
}

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
