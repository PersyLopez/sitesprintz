/**
 * Map inline-edit field paths onto canonical site_data.
 * Paths look like: brand.name, hero.title, services.items.0.name, team.members.0.role
 */

function ensureSection(siteData, type) {
  if (!Array.isArray(siteData.sections)) siteData.sections = [];
  let section = siteData.sections.find((item) => item?.type === type);
  if (!section) {
    section = { type, enabled: true, content: {} };
    siteData.sections.push(section);
  }
  if (!section.content || typeof section.content !== 'object') {
    section.content = {};
  }
  return section;
}

function ensureListItem(list, index) {
  while (list.length <= index) list.push({});
  if (!list[index] || typeof list[index] !== 'object') {
    list[index] = {};
  }
  return list[index];
}

function mirrorHero(siteData, key, value) {
  if (!siteData.hero || typeof siteData.hero !== 'object') siteData.hero = {};
  if (key === 'title') {
    siteData.hero.title = value;
    siteData.heroTitle = value;
  } else if (key === 'subtitle') {
    siteData.hero.subtitle = value;
    siteData.heroSubtitle = value;
  } else if (key === 'eyebrow') {
    siteData.hero.eyebrow = value;
  } else if (key === 'ctaText') {
    siteData.hero.cta = value;
  }
}

/**
 * @param {object} siteData
 * @param {string} field
 * @param {string|number} value
 * @returns {object} mutated siteData
 */
export function applyEditableField(siteData, field, value) {
  if (!siteData || typeof siteData !== 'object') return siteData;
  if (!field || typeof field !== 'string' || field.includes('..')) {
    throw new Error('Invalid field path');
  }

  const parts = field.split('.');
  const root = parts[0];
  if (!root) throw new Error('Invalid field path');

  if (root === 'brand') {
    if (!siteData.brand || typeof siteData.brand !== 'object') siteData.brand = {};
    const brandKey = parts[1] || 'name';
    siteData.brand[brandKey] = value;
    if (brandKey === 'name') siteData.businessName = value;
    return siteData;
  }

  const section = ensureSection(siteData, root);
  const rest = parts.slice(1);
  const listKey = rest[0];

  if (listKey === 'items' || listKey === 'members') {
    const index = Number(rest[1]);
    const itemField = rest[2];
    if (!Number.isInteger(index) || index < 0 || !itemField) {
      throw new Error('Invalid field path');
    }
    if (!Array.isArray(section.content[listKey])) section.content[listKey] = [];
    const item = ensureListItem(section.content[listKey], index);
    item[itemField] = value;
    if (itemField === 'name') item.title = value;
    if (itemField === 'role') item.title = item.title || value;
    if (listKey === 'items' && Array.isArray(siteData.services?.items) && root === 'services') {
      const mirrored = ensureListItem(siteData.services.items, index);
      mirrored[itemField] = value;
    }
    if (listKey === 'members') {
      if (!siteData.team || typeof siteData.team !== 'object') siteData.team = { members: [] };
      if (!Array.isArray(siteData.team.members)) siteData.team.members = [];
      const mirrored = ensureListItem(siteData.team.members, index);
      mirrored[itemField] = value;
    }
    return siteData;
  }

  const contentKey = rest[0] || 'title';
  section.content[contentKey] = value;
  if (contentKey === 'body') section.content.description = value;

  if (root === 'hero') mirrorHero(siteData, contentKey, value);
  if (root === 'about') {
    if (!siteData.about || typeof siteData.about !== 'object') siteData.about = {};
    siteData.about[contentKey === 'body' ? 'description' : contentKey] = value;
    if (contentKey === 'body') siteData.about.body = value;
  }

  return siteData;
}

export function getSiteDataVersion(siteData) {
  const version = Number(siteData?.version);
  return Number.isFinite(version) && version > 0 ? version : 1;
}
