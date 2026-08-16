/**
 * Business scale helpers — solopreneur vs small team vs established.
 *
 * Templates store team as an array, `{ members }`, a team section, or a
 * `teamSize` hint. These helpers normalize that so layout, copy, and
 * publish rendering all see the same reality.
 */

const DEFAULT_TEAM_TITLES = new Set(['our team', 'meet our team', 'the team', 'team']);

function asList(value) {
  if (Array.isArray(value)) return value.filter((item) => item != null);
  if (value && typeof value === 'object') {
    if (Array.isArray(value.members)) return value.members.filter((item) => item != null);
    if (Array.isArray(value.items)) return value.items.filter((item) => item != null);
  }
  return [];
}

function teamSectionMembers(siteData) {
  if (!Array.isArray(siteData?.sections)) return [];
  const section = siteData.sections.find((s) => s?.type === 'team');
  return asList(section?.content?.members || section?.members);
}

/**
 * Raw team slots (including unnamed placeholders). Used for level detection.
 * @param {Object} [siteData]
 * @returns {Object[]}
 */
export function getTeamMemberList(siteData) {
  if (!siteData) return [];
  const fromTeam = asList(siteData.team);
  if (fromTeam.length) return fromTeam;
  const fromStaff = asList(siteData.staff);
  if (fromStaff.length) return fromStaff;
  return teamSectionMembers(siteData);
}

/**
 * Count team slots for auto-detecting Solo / Studio / Established.
 * Prefers an explicit `teamSize` hint (wizard / builder).
 * @param {Object} [siteData]
 * @returns {number}
 */
export function countTeamSlots(siteData) {
  if (!siteData) return 0;
  if (Number.isFinite(siteData.teamSize) && siteData.teamSize > 0) {
    return siteData.teamSize;
  }
  return getTeamMemberList(siteData).length;
}

function hasDisplayName(member) {
  if (!member || typeof member !== 'object') return false;
  const name = String(member.name || '').trim();
  return name.length > 0;
}

/**
 * Members that should actually appear on a published team/about section.
 * @param {Object} [siteData]
 * @param {Object[]} [explicitMembers]
 * @returns {Object[]}
 */
export function getNamedTeamMembers(siteData, explicitMembers) {
  const list = Array.isArray(explicitMembers) && explicitMembers.length
    ? explicitMembers
    : getTeamMemberList(siteData);
  return list.filter(hasDisplayName);
}

/**
 * Solo voice: one person (or none listed), regardless of a richer studio layout.
 * @param {Object} [siteData]
 * @param {string} [level]
 * @returns {boolean}
 */
export function isSoloVoice(siteData, level) {
  if (level === 'solo') return true;
  return countTeamSlots(siteData) <= 1;
}

/**
 * Whether a team section should be emitted as HTML (preview/publish).
 * Empty "Our Team" placeholders must not appear on live sites.
 * @param {Object[]} members
 * @returns {boolean}
 */
export function shouldRenderTeam(members) {
  return getNamedTeamMembers(null, members).length > 0;
}

/**
 * Heading for a team section based on how many named people exist.
 * Custom titles (e.g. "Meet Our Stylists") are preserved.
 * @param {Object[]} members
 * @param {string} [explicitTitle]
 * @returns {string}
 */
export function resolveTeamHeading(members, explicitTitle) {
  const named = getNamedTeamMembers(null, members);
  const custom = String(explicitTitle || '').trim();
  if (custom && !DEFAULT_TEAM_TITLES.has(custom.toLowerCase())) {
    return custom;
  }
  if (named.length <= 1) return 'About';
  return custom || 'Our Team';
}

/**
 * Default section copy that changes between solopreneur and team sites.
 * @param {Object} [siteData]
 * @param {string} [level]
 * @returns {{ servicesTitle: string, processTitle: string, aboutTitle: string, industriesTitle: string, isSolo: boolean }}
 */
export function resolveVoiceCopy(siteData, level) {
  const isSolo = isSoloVoice(siteData, level);
  return {
    isSolo,
    servicesTitle: isSolo ? 'Services' : 'Our Services',
    processTitle: isSolo ? 'How I Work' : 'Our Process',
    aboutTitle: isSolo ? 'About' : 'About Us',
    industriesTitle: isSolo ? 'Industries I Serve' : 'Industries We Serve',
    teamTitle: resolveTeamHeading(getTeamMemberList(siteData)),
  };
}
