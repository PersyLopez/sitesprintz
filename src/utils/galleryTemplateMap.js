/** Landing template id → admin gallery example subdomain */
export const TEMPLATE_TO_SHOWCASE_SUBDOMAIN = {
  salon: 'gallery-salon',
  restaurant: 'gallery-restaurant',
  gym: 'gallery-gym',
  consultant: 'gallery-consultant',
  freelancer: 'gallery-freelancer',
  cleaning: 'gallery-cleaning',
  electrician: 'gallery-electrician',
  'auto-repair': 'gallery-auto',
  'pet-care': 'gallery-pet',
  plumbing: 'gallery-plumbing',
  'product-showcase': 'gallery-products',
  'tech-repair': 'gallery-tech',
  'tow-truck': 'gallery-tow',
  'product-ordering': 'gallery-ordering',
};

const SUBDOMAIN_TO_TEMPLATE = Object.fromEntries(
  Object.entries(TEMPLATE_TO_SHOWCASE_SUBDOMAIN).map(([templateId, subdomain]) => [
    subdomain,
    templateId,
  ])
);

export function getShowcasePath(templateId) {
  const subdomain = TEMPLATE_TO_SHOWCASE_SUBDOMAIN[templateId];
  return subdomain ? `/showcase/${subdomain}` : '/showcase';
}

export function getTemplateIdFromShowcaseSubdomain(subdomain) {
  if (!subdomain || typeof subdomain !== 'string') return null;
  return SUBDOMAIN_TO_TEMPLATE[subdomain] || null;
}

export function resolveShowcaseTemplateId(site, subdomain) {
  const fromSite = site?.template_id || site?.template;
  if (fromSite && TEMPLATE_TO_SHOWCASE_SUBDOMAIN[fromSite]) return fromSite;
  return getTemplateIdFromShowcaseSubdomain(subdomain);
}
