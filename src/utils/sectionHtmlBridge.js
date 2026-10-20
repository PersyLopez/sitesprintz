/**
 * Section HTML Bridge — converts composePage() section descriptors into HTML strings.
 *
 * Used by BOTH SSR (publishedSiteRenderer) and PreviewFrame.
 * For types that SectionHtmlBuilder handles, delegates to it.
 * For new types, builds clean HTML inline.
 * Token-aware: uses tokens.theme.bg, tokens.theme.text, tokens.theme.accent.
 * Unknown types render a placeholder div, never null.
 */

import { resolveTeamHeading, shouldRenderTeam, getNamedTeamMembers } from './businessScale.js';
import { telHref } from './liveSiteContact.js';
import { getBookingEmbedUrl, isExternalBookingProvider } from './bookingEmbed.js';
import {
  genericServiceInsertSrc,
  renderGalleryWorkPlaceholders,
  renderPhotoPlaceholder,
} from './photoPlaceholder.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ALL_SECTION_TYPES = [
  'hero',
  'services',
  'about',
  'gallery',
  'before-after',
  'team',
  'testimonials',
  'faq',
  'credentials',
  'contact',
  'catalog',
  'booking',
  'reviews',
  'stats',
  'menu',
  'service-areas',
  'process',
  'case-studies',
  'industries',
  'how-to-order',
  'hours',
  'location',
  'social',
  'native-booking',
  'checkout',
  'zip-checker',
  'interactive-calculator',
  'diagnostic-quiz',
  'progress-tracker',
  'video-gallery',
  'resource-center',
  'class-scheduler',
  'subscription-booking',
  'service-filters',
  'multi-step-form',
  'enhanced-profiles',
  'placeholder',
];

// ---------------------------------------------------------------------------
// Defaults — used when tokens are missing
// ---------------------------------------------------------------------------

const DEFAULT_TOKENS = {
  theme: {
    bg: '#0c0c0e',
    text: '#f4f2ee',
    accent: '#c2683a',
    onAccent: '#f4f2ee',
    muted: '#8a8a8f',
    surface: '#141417',
    hairline: 'rgba(244,242,238,.10)',
  },
};

/**
 * True when the composed page mounts the native booking widget (not Calendly/link/phone).
 * Page service cards only become the catalog when this is true.
 */
export function sectionListHasNativeBooking(sections) {
  return (Array.isArray(sections) ? sections : []).some((section) => {
    if (!section || section.enabled === false) return false;
    if (section.type !== 'booking' && section.type !== 'native-booking') return false;
    const content = section.content || {};
    if (content.enabled === false) return false;
    const provider = content.provider || 'native';
    const externalUrl = content.url || '';
    const isExternal = isExternalBookingProvider(provider) && Boolean(externalUrl);
    const isLinkOnly = content.mode === 'link' || (!isExternal && content.embedded === false);
    return !isExternal && !isLinkOnly;
  });
}

export function withNativeBookingTokens(tokens, sections, siteData) {
  const hasNativeSection = sectionListHasNativeBooking(sections);
  const schedulingOn = !siteData || siteData._features?.booking?.enabled !== false;
  return {
    ...(tokens || DEFAULT_TOKENS),
    _nativeBooking: hasNativeSection && schedulingOn,
  };
}

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------

function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

function escapeAttr(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#039;');
}

// ---------------------------------------------------------------------------
// Token extraction
// ---------------------------------------------------------------------------

function getTokens(tokens) {
  return tokens?.theme ? tokens : DEFAULT_TOKENS;
}

function getBg(tokens) {
  return getTokens(tokens).theme.bg;
}

function getText(tokens) {
  return getTokens(tokens).theme.text;
}

function getAccent(tokens) {
  const theme = getTokens(tokens).theme;
  if (theme.accentValue && String(theme.accentValue).startsWith('#')) {
    return theme.accentValue;
  }
  if (theme.accent && String(theme.accent).startsWith('#')) {
    return theme.accent;
  }
  return DEFAULT_TOKENS.theme.accent;
}

function getMuted(tokens) {
  return getTokens(tokens).theme.muted;
}

function getSurface(tokens) {
  return getTokens(tokens).theme.surface || DEFAULT_TOKENS.theme.surface;
}

function getOnAccent(tokens) {
  const onAccent = getTokens(tokens).theme.onAccent;
  if (onAccent && String(onAccent).startsWith('#')) return onAccent;
  return '#f4f2ee';
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderHeroMeta(content) {
  const parts = [];
  if (content.hoursLine) {
    parts.push(`<span data-testid="hero-hours">${escapeHtml(content.hoursLine)}</span>`);
  }
  if (content.addressLine) {
    parts.push(`<span data-testid="hero-address">${escapeHtml(content.addressLine)}</span>`);
  }
  const phoneHref = telHref(content.phone);
  if (content.phone && phoneHref) {
    parts.push(`<a data-testid="hero-phone" href="${escapeAttr(phoneHref)}">${escapeHtml(content.phone)}</a>`);
  }
  if (content.rating && content.reviewCount) {
    parts.push(`<span data-testid="hero-rating">${escapeHtml(String(content.rating))} from ${escapeHtml(String(content.reviewCount))} Google reviews</span>`);
  }
  if (!parts.length) return '';
  return `<p class="ss-hero-meta">${parts.join('<span aria-hidden="true"> · </span>')}</p>`;
}

function renderHero(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Welcome';
  const subtitle = c.subtitle || '';
  const ctaText = c.ctaText || 'Get Started';
  const ctaLink = c.ctaLink || '#contact';
  const eyebrow = c.eyebrow || '';
  const image = c.image || '';
  const imageAlt = c.imageAlt || title;
  const accent = getAccent(tokens);
  const onAccent = getOnAccent(tokens);
  const photo = image
    ? `<img class="ss-hero-photo" data-photo-field="hero.image" src="${escapeAttr(image)}" alt="${escapeAttr(imageAlt)}" width="1600" height="900" fetchpriority="high" decoding="async" />`
    : renderPhotoPlaceholder('business', { className: 'ss-photo-placeholder--hero', priority: true, photoField: 'hero.image' });

  return `<section class="ss-hero ss-hero--photo">
  ${photo}
  <div class="ss-hero-inner ss-container">
    ${eyebrow ? `<p class="ss-eyebrow">${escapeHtml(eyebrow)}</p>` : ''}
    <h1 class="ss-hero-title">${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="ss-hero-sub">${escapeHtml(subtitle)}</p>` : ''}
    ${renderHeroMeta(c)}
    ${ctaText ? `<a class="ss-btn" href="${escapeAttr(ctaLink)}" style="background: ${accent}; color: ${onAccent};">${escapeHtml(ctaText)}</a>` : ''}
  </div>
</section>`;
}

function serviceKey(item, index) {
  if (item?.id) return String(item.id);
  const slug = String(item?.name || item?.title || 'service')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'service';
  return `${slug}-${index}`;
}

function contactHoneypotField() {
  return '<div aria-hidden="true" style="position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>';
}

function bookServiceLink(item, index, tokens) {
  const id = serviceKey(item, index);
  const name = item.name || item.title || '';
  return `<a class="ss-btn" href="#booking" data-ss-book-service data-service-id="${escapeAttr(id)}" data-service-name="${escapeAttr(name)}" style="background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)}; margin-top: 12px; display: inline-block; text-decoration: none;">Book</a>`;
}

function serviceDuration(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return `${value} min`;
  const text = String(value || '').trim();
  if (!text) return '';
  if (/min|hour|hr/i.test(text)) return text;
  if (/^\d+$/.test(text)) return `${text} min`;
  return text;
}

function serviceCard(item, index, tokens) {
  const name = item.name || item.title || '';
  const desc = item.description || '';
  const price = formatPrice(item.price);
  const image = item.image || item.src || '';
  const genericImage = image ? null : genericServiceInsertSrc(name);
  const duration = serviceDuration(item.duration || item.duration_minutes);
  const serviceId = serviceKey(item, index);
  const media = image || genericImage
    ? `<img class="ss-card-media" data-photo-field="services.items.${index}.image" src="${escapeAttr(image || genericImage)}" alt="${escapeAttr(item.imageAlt || name)}" width="400" height="220" loading="lazy" decoding="async" />`
    : renderPhotoPlaceholder('service', {
        offerName: name,
        className: 'ss-photo-placeholder--card',
        photoField: `services.items.${index}.image`,
      });
  return `<article class="ss-card" data-service-id="${escapeAttr(serviceId)}" data-service-name="${escapeAttr(name)}" style="background: ${getSurface(tokens)}; border: 1px solid ${getTokens(tokens).theme.hairline};">
  ${media}
  <div class="ss-card-body">
    <h3 style="color: ${getAccent(tokens)};">${escapeHtml(name)}</h3>
    ${desc ? `<p style="color: ${getMuted(tokens)};">${escapeHtml(desc)}</p>` : ''}
    ${duration ? `<p class="ss-duration" style="color: ${getMuted(tokens)};">${escapeHtml(duration)}</p>` : ''}
    ${price ? `<div class="ss-price" style="color: ${getAccent(tokens)};">${escapeHtml(price)}</div>` : ''}
    ${tokens?._nativeBooking ? bookServiceLink(item, index, tokens) : ''}
  </div>
</article>`;
}

function renderServices(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Our Services';
  const items = c.items || [];

  if (!items.length) {
    return `<section id="services" class="ss-services" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p style="text-align: center; color: ${getMuted(tokens)};">No services listed yet.</p>
  </div>
</section>`;
  }

  const grouped = items.some((item) => typeof item?._category === 'string' && item._category.trim());
  const cardsHtml = grouped
    ? catalogGroups(items).map((group) => `<div class="ss-menu-group">
  ${group.name ? `<h3 class="ss-h3" style="color: ${getText(tokens)};">${escapeHtml(group.name)}</h3>` : ''}
  ${group.description ? `<p style="color: ${getMuted(tokens)};">${escapeHtml(group.description)}</p>` : ''}
  <div class="ss-card-grid">
    ${group.entries.map(({ item, index }) => serviceCard(item, index, tokens)).join('\n')}
  </div>
</div>`).join('\n')
    : `<div class="ss-card-grid">
      ${items.map((item, index) => serviceCard(item, index, tokens)).join('\n')}
    </div>`;

  return `<section id="services" class="ss-services ss-section" style="background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container">
    <h2 class="ss-h2" style="color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    ${cardsHtml}
  </div>
</section>`;
}

function renderAbout(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'About Us';
  const body = c.body || c.description || '';
  const image = c.image || '';
  const features = Array.isArray(c.features) ? c.features : [];
  const chips = features
    .map((feature) => `<li>${escapeHtml(typeof feature === 'string' ? feature : feature.label || feature.name || '')}</li>`)
    .join('');

  return `<section class="ss-about ss-section" style="background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container ss-about-grid ss-about-grid--media">
    ${image
      ? `<img class="ss-about-media" data-photo-field="about.image" src="${escapeAttr(image)}" alt="${escapeAttr(title)}" width="640" height="280" loading="lazy" decoding="async" />`
      : renderPhotoPlaceholder('shop', { className: 'ss-photo-placeholder--about', photoField: 'about.image' })}
    <div>
      <h2 class="ss-h2" style="color: ${getAccent(tokens)}; text-align: left;">${escapeHtml(title)}</h2>
      <p class="ss-lead">${escapeHtml(body)}</p>
      ${chips ? `<ul class="ss-chips">${chips}</ul>` : ''}
    </div>
  </div>
</section>`;
}

function renderGallery(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Gallery';
  const images = c.images || [];

  if (!images.length) {
    return `<section class="ss-gallery ss-section" style="background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container">
    <h2 class="ss-h2" style="color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <div class="ss-gallery-grid" data-testid="photo-placeholder-gallery">
      ${renderGalleryWorkPlaceholders(3)}
    </div>
  </div>
</section>`;
  }

  const imgsHtml = images
    .map((img, index) => {
      const src = typeof img === 'string' ? img : (img.src || img.url || '');
      const alt = typeof img === 'string' ? '' : (img.alt || '');
      const category = typeof img === 'object' && img ? String(img.category || '').trim() : '';
      const field = `gallery.images.${index}.src`;
      if (!src) {
        return renderPhotoPlaceholder('work', { className: 'ss-photo-placeholder--tile', photoField: field });
      }
      const filterAttr = c.filterable && category
        ? ` data-ss-filter-item data-category="${escapeAttr(category)}" data-testid="gallery-photo"`
        : '';
      return `<img class="ss-gallery-item"${filterAttr} data-photo-field="${escapeAttr(field)}" src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" width="400" height="240" loading="lazy" decoding="async" />`;
    })
    .join('\n');

  const categories = [...new Set(images.map((img) => (
    typeof img === 'object' && img ? String(img.category || '').trim() : ''
  )).filter(Boolean))];
  const showFilter = c.filterable === true && categories.length > 1;
  const controls = showFilter
    ? `<label class="ss-field"><span>Show</span><select data-ss-filter="category" data-testid="gallery-filter"><option value="">All</option>${categories.map((name) => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join('')}</select></label><p data-ss-filter-count data-testid="gallery-filter-count" role="status" aria-live="polite"></p>`
    : '';

  return `<section class="ss-gallery ss-section" style="background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container">
    <h2 class="ss-h2" style="color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    ${controls}
    <div class="ss-gallery-grid"${showFilter ? ' data-ss-filter-root' : ''}>
      ${imgsHtml}
    </div>
  </div>
</section>`;
}

function renderBeforeAfter(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Transformations';
  const pairs = c.pairs || [];

  const pairsHtml = pairs.length
    ? pairs
      .map((p, index) => `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
  <div>${p.before
    ? `<img data-photo-field="before-after.pairs.${index}.before" src="${escapeAttr(p.before)}" alt="Before" width="800" height="600" style="width: 100%; border-radius: 8px;" loading="lazy" decoding="async" />`
    : renderPhotoPlaceholder('work', { className: 'ss-photo-placeholder--card', photoField: `before-after.pairs.${index}.before` })}<p style="text-align: center; color: ${getMuted(tokens)}; margin-top: 8px;">Before</p></div>
  <div>${p.after
    ? `<img data-photo-field="before-after.pairs.${index}.after" src="${escapeAttr(p.after)}" alt="After" width="800" height="600" style="width: 100%; border-radius: 8px;" loading="lazy" decoding="async" />`
    : renderPhotoPlaceholder('work', { className: 'ss-photo-placeholder--card', photoField: `before-after.pairs.${index}.after` })}<p style="text-align: center; color: ${getMuted(tokens)}; margin-top: 8px;">After</p></div>
</div>`)
      .join('\n')
    : `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
  <div>${renderPhotoPlaceholder('work', { className: 'ss-photo-placeholder--card', photoField: 'before-after.pairs.0.before' })}<p style="text-align: center; color: ${getMuted(tokens)}; margin-top: 8px;">Before</p></div>
  <div>${renderPhotoPlaceholder('work', { className: 'ss-photo-placeholder--card', photoField: 'before-after.pairs.0.after' })}<p style="text-align: center; color: ${getMuted(tokens)}; margin-top: 8px;">After</p></div>
</div>`;

  return `<section class="ss-before-after" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 40px;">${escapeHtml(title)}</h2>
    <div style="display: grid; gap: 32px;">${pairsHtml}</div>
  </div>
</section>`;
}

function renderTeam(section, tokens) {
  const c = section.content || {};
  const members = getNamedTeamMembers(null, c.members || []);

  if (!shouldRenderTeam(members)) {
    return '';
  }

  const title = resolveTeamHeading(members, c.title);

  const membersHtml = members
    .map((m, index) => `<div style="text-align: center; background: ${getSurface(tokens)}; padding: 32px; border-radius: 12px;">
  ${m.photo || m.image
    ? `<img data-photo-field="team.members.${index}.photo" src="${escapeAttr(m.photo || m.image)}" alt="${escapeAttr(m.name)}" width="150" height="150" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin-bottom: 16px; border: 4px solid ${getAccent(tokens)};" loading="lazy" decoding="async" />`
    : renderPhotoPlaceholder('staff', { className: 'ss-photo-placeholder--avatar', photoField: `team.members.${index}.photo` })}
  <h3 style="color: ${getAccent(tokens)}; margin-bottom: 4px;">${escapeHtml(m.name || '')}</h3>
  <div style="color: ${getMuted(tokens)}; font-size: 0.9rem; margin-bottom: 12px;">${escapeHtml(m.role || m.title || '')}</div>
  <p style="color: ${getText(tokens)}; font-size: 0.9rem; line-height: 1.6;">${escapeHtml(m.bio || '')}</p>
</div>`)
    .join('\n');

  return `<section class="ss-team" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 40px;">${escapeHtml(title)}</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px;">
      ${membersHtml}
    </div>
  </div>
</section>`;
}

function renderTestimonials(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'What Clients Say';
  const items = c.items || c.testimonials || [];

  if (!items.length) {
    return `<section class="ss-testimonials" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p style="text-align: center; color: ${getMuted(tokens)};">No testimonials yet.</p>
  </div>
</section>`;
  }

  const itemsHtml = items
    .map((t) => {
      const stars = '⭐'.repeat(t.rating || 5);
      return `<div style="background: ${getSurface(tokens)}; padding: 24px; border-radius: 12px; border-left: 4px solid ${getAccent(tokens)};">
  <div style="color: #fbbf24; margin-bottom: 12px; font-size: 1.2rem;">${stars}</div>
  <p style="color: ${getText(tokens)}; font-style: italic; margin-bottom: 16px; line-height: 1.6;">"${escapeHtml(t.text || t.quote || '')}"</p>
  <div style="color: ${getAccent(tokens)}; font-weight: 600;">${escapeHtml(t.author || t.name || '')}</div>
</div>`;
    })
    .join('\n');

  return `<section class="ss-testimonials" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 40px;">${escapeHtml(title)}</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
      ${itemsHtml}
    </div>
  </div>
</section>`;
}

function renderFaq(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'FAQ';
  const items = c.items || [];

  if (!items.length) {
    return `<section class="ss-faq" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 800px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p style="text-align: center; color: ${getMuted(tokens)};">No questions yet.</p>
  </div>
</section>`;
  }

  const itemsHtml = items
    .map((q) => `<div style="background: ${getSurface(tokens)}; padding: 24px; border-radius: 12px; margin-bottom: 16px; border: 1px solid ${getTokens(tokens).theme.hairline};">
  <div style="color: ${getAccent(tokens)}; font-weight: 600; font-size: 1.1rem; margin-bottom: 12px;">${escapeHtml(q.question || '')}</div>
  <div style="color: ${getText(tokens)}; line-height: 1.6;">${escapeHtml(q.answer || '')}</div>
</div>`)
    .join('\n');

  return `<section class="ss-faq" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 800px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 40px;">${escapeHtml(title)}</h2>
    ${itemsHtml}
  </div>
</section>`;
}

function renderCredentials(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Certifications';
  const items = c.items || [];

  if (!items.length) {
    return `<section class="ss-credentials" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p style="text-align: center; color: ${getMuted(tokens)};">No credentials listed.</p>
  </div>
</section>`;
  }

  const itemsHtml = items
    .map((item) => `<div style="background: ${getSurface(tokens)}; padding: 20px; border-radius: 8px; text-align: center;">
  <h3 style="color: ${getAccent(tokens)}; margin-bottom: 4px;">${escapeHtml(item.name || '')}</h3>
  <p style="color: ${getMuted(tokens)};">${escapeHtml(item.issuer || '')}</p>
  ${item.date ? `<p style="color: ${getMuted(tokens)}; font-size: 0.85rem;">${escapeHtml(item.date)}</p>` : ''}
</div>`)
    .join('\n');

  return `<section class="ss-credentials" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 40px;">${escapeHtml(title)}</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px;">
      ${itemsHtml}
    </div>
  </div>
</section>`;
}

function serviceAreaMapHtml(content) {
  const geo = content?.publicGeo;
  const miles = Number(content?.serviceRadiusMiles);
  if (!geo || !Number.isFinite(Number(geo.lat)) || !Number.isFinite(Number(geo.lng)) || !Number.isFinite(miles) || miles <= 0) {
    return '';
  }
  return `<div class="ss-service-area-map" data-testid="service-area-map" data-lat="${escapeAttr(String(geo.lat))}" data-lng="${escapeAttr(String(geo.lng))}" data-radius-miles="${escapeAttr(String(miles))}" role="img" aria-label="Approximate service area"></div>`;
}

function renderContact(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Contact Us';
  const email = c.email || '';
  const phone = c.phone || '';
  const address = c.address || '';
  const hours = c.hours || '';
  const details = [
    email ? `<div><strong style="display: block; margin-bottom: 8px; color: ${getAccent(tokens)};">Email</strong><a href="mailto:${escapeAttr(email)}" style="color: ${getText(tokens)}; text-decoration: none;">${escapeHtml(email)}</a></div>` : '',
    phone && telHref(phone) ? `<div><strong style="display: block; margin-bottom: 8px; color: ${getAccent(tokens)};">Phone</strong><a href="${escapeAttr(telHref(phone))}" style="color: ${getText(tokens)}; text-decoration: none;">${escapeHtml(phone)}</a></div>` : '',
    address ? `<div><strong style="display: block; margin-bottom: 8px; color: ${getAccent(tokens)};">${c.addressDisplay === 'area' ? 'Service area' : 'Address'}</strong>${escapeHtml(address)}</div>` : '',
    hours ? `<div><strong style="display: block; margin-bottom: 8px; color: ${getAccent(tokens)};">Hours</strong>${escapeHtml(typeof hours === 'string' ? hours : '')}${c.hoursNote ? `<p style="margin: 8px 0 0; color: ${getMuted(tokens)};">${escapeHtml(c.hoursNote)}</p>` : ''}</div>` : '',
  ].filter(Boolean).join('\n');

  return `<section id="contact" class="ss-contact" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 800px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 40px;">${escapeHtml(title)}</h2>
    ${details ? `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 32px;">${details}</div>` : ''}
    ${serviceAreaMapHtml(c)}
    <form id="contact-form" class="ss-contact-form" data-testid="contact-form" data-type="contact" method="post" action="/api/submissions/contact" novalidate>
      <input type="hidden" name="subdomain" value="${escapeAttr(tokens?._contactSubdomain || '')}" />
      ${contactHoneypotField()}
      <p class="ss-form-status" data-testid="contact-form-status" role="status" aria-live="polite"></p>
      <label class="ss-field">
        <span>Name</span>
        <input type="text" name="name" autocomplete="name" data-testid="contact-form-name" maxlength="200" />
      </label>
      <label class="ss-field">
        <span>Email</span>
        <input type="email" name="email" autocomplete="email" required data-testid="contact-form-email" maxlength="254" />
      </label>
      <label class="ss-field">
        <span>Phone <span class="ss-optional">(optional)</span></span>
        <input type="tel" name="phone" autocomplete="tel" data-testid="contact-form-phone" maxlength="40" />
      </label>
      <label class="ss-field">
        <span>Message</span>
        <textarea name="message" required rows="5" data-testid="contact-form-message" maxlength="2000"></textarea>
      </label>
      <button type="submit" class="ss-btn" data-testid="contact-form-submit" style="background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)}; border: 0; cursor: pointer;">Send Message</button>
    </form>
  </div>
</section>`;
}

function parseMoney(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(value) {
  if (value === '' || value === null || value === undefined) return '';
  const price = parseMoney(value);
  if (!Number.isFinite(price) || price <= 0) return '';
  return `$${Number.isInteger(price) ? price : price.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`;
}

function productKey(item, index) {
  if (item?.id) return String(item.id);
  const slug = String(item?.name || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
  return `${slug}-${index}`;
}

function addToCartButton(item, index, tokens) {
  const price = parseMoney(item?.price);
  if (price <= 0) return '';
  const id = productKey(item, index);
  return `<button type="button" class="ss-btn ss-add-to-cart" data-ss-add-to-cart data-testid="add-to-cart-${id}" data-product-id="${escapeAttr(id)}" data-product-name="${escapeAttr(item.name || 'Item')}" data-product-price="${price}" data-product-image="${escapeAttr(item.image || '')}" style="background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)}; margin-top: 12px; border: 0; cursor: pointer;">Add to cart</button>`;
}

function catalogCard(item, index, tokens, purchasable) {
  const dietary = Array.isArray(item.dietary)
    ? item.dietary.filter((tag) => typeof tag === 'string' && tag.trim())
    : [];
  const menuDish = typeof item._category === 'string' && item._category.trim();
  const media = item.image
    ? `<img class="ss-card-media" data-photo-field="catalog.items.${index}.image" src="${escapeAttr(item.image)}" alt="${escapeAttr(item.imageAlt || item.name || '')}" width="400" height="220" loading="lazy" decoding="async" />`
    : (menuDish ? '' : renderPhotoPlaceholder('product', { className: 'ss-photo-placeholder--card', photoField: `catalog.items.${index}.image` }));
  return `<article class="ss-card" style="background: ${getSurface(tokens)}; border: 1px solid ${getTokens(tokens).theme.hairline};">
  ${media}
  <div class="ss-card-body">
    <h3 style="color: ${getAccent(tokens)};">${escapeHtml(item.name || '')}</h3>
    <p style="color: ${getMuted(tokens)};">${escapeHtml(item.description || '')}</p>
    ${dietary.length ? `<p style="color: ${getMuted(tokens)}; font-size: 0.85rem;">${escapeHtml(dietary.join(', '))}</p>` : ''}
    ${item.availability ? `<p data-testid="menu-availability" style="color: ${getMuted(tokens)}; font-size: 0.85rem;">${escapeHtml(item.availability)}</p>` : ''}
    ${formatPrice(item.price) ? `<div class="ss-price" style="color: ${getAccent(tokens)};">${escapeHtml(formatPrice(item.price))}</div>` : ''}
    ${purchasable ? addToCartButton(item, index, tokens) : ''}
  </div>
</article>`;
}

function catalogGroups(items) {
  const groups = [];
  const byName = new Map();
  items.forEach((item, index) => {
    const name = typeof item?._category === 'string' ? item._category.trim() : '';
    if (!byName.has(name)) {
      const description = typeof item?._categoryDescription === 'string' ? item._categoryDescription.trim() : '';
      const group = { name, description, entries: [] };
      byName.set(name, group);
      groups.push(group);
    }
    byName.get(name).entries.push({ item, index });
  });
  return groups;
}

function renderCatalog(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Menu';
  const items = c.items || [];
  const purchasable = Boolean(c.purchasable);

  if (!items.length) {
    return `<section id="catalog" class="ss-catalog" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p style="text-align: center; color: ${getMuted(tokens)};">No items available yet.</p>
  </div>
</section>`;
  }

  const grouped = items.some((item) => typeof item?._category === 'string' && item._category.trim());
  const cardsHtml = grouped
    ? catalogGroups(items).map((group) => `<div class="ss-menu-group">
  ${group.name ? `<h3 class="ss-h3" style="color: ${getText(tokens)};">${escapeHtml(group.name)}</h3>` : ''}
  ${group.description ? `<p style="color: ${getMuted(tokens)};">${escapeHtml(group.description)}</p>` : ''}
  <div class="ss-card-grid">
    ${group.entries.map(({ item, index }) => catalogCard(item, index, tokens, purchasable)).join('\n')}
  </div>
</div>`).join('\n')
    : `<div class="ss-card-grid">
      ${items.map((item, index) => catalogCard(item, index, tokens, purchasable)).join('\n')}
    </div>`;

  return `<section id="catalog" class="ss-catalog ss-section" style="background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container">
    <h2 class="ss-h2" style="color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    ${cardsHtml}
  </div>
</section>`;
}

function allowedBookingEmbedUrl(url) {
  const hosts = ['acuityscheduling.com', 'as.me', 'calendly.com', 'squareup.com', 'square.site'];
  try {
    const parsed = new URL(String(url || '').trim());
    if (parsed.protocol !== 'https:') return '';
    const host = parsed.hostname.toLowerCase();
    const allowed = hosts.some((name) => host === name || host.endsWith(`.${name}`));
    return allowed ? parsed.toString() : '';
  } catch {
    return '';
  }
}

function renderBooking(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Book an Appointment';
  const provider = c.provider || 'native';
  const externalUrl = c.url || '';
  const isExternal = isExternalBookingProvider(provider) && Boolean(externalUrl);
  const isLinkOnly = c.mode === 'link' || (!isExternal && c.embedded === false);
  if (isExternal && !isLinkOnly) {
    const embedUrl = allowedBookingEmbedUrl(getBookingEmbedUrl(provider, externalUrl));
    if (!embedUrl) {
      return `<section id="booking" class="ss-booking ss-section" style="background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 600px; margin: 0 auto; text-align: center;">
    <h2 class="ss-h2" style="color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <div style="background: ${getSurface(tokens)}; padding: 40px; border-radius: 12px; border: 1px solid ${getTokens(tokens).theme.hairline};">
      <p style="color: ${getMuted(tokens)}; margin-bottom: 24px;">Book your appointment online — fast and easy.</p>
      <a href="${escapeAttr(externalUrl)}" class="ss-btn" target="_blank" rel="noopener noreferrer" style="background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)};">Open scheduler</a>
    </div>
  </div>
</section>`;
    }
    return `<section id="booking" class="ss-booking ss-section booking-section" style="background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 900px; margin: 0 auto;">
    <h2 class="ss-h2" style="color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p class="ss-lead" style="text-align: center; margin: -24px auto 28px;">${escapeHtml(c.description || (title === 'Book an Appointment' ? 'Book your appointment online — fast and easy.' : ''))}</p>
    <div class="ss-booking-embed" data-testid="live-booking-embed" style="background: ${getSurface(tokens)}; border-radius: 12px; overflow: hidden; border: 1px solid ${getTokens(tokens).theme.hairline};">
      <button type="button" data-ss-booking-open data-embed-src="${escapeAttr(embedUrl)}" data-testid="booking-embed-open" style="background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)}; border: 0; cursor: pointer; padding: 14px 22px;">Show scheduler</button>
    </div>
    <script>
    (function () {
      var root = document.currentScript && document.currentScript.previousElementSibling;
      if (!root) return;
      root.addEventListener('click', function (event) {
        var button = event.target.closest('[data-ss-booking-open]');
        if (!button || button.parentNode !== root) return;
        var src = button.getAttribute('data-embed-src') || '';
        if (src.indexOf('https://') !== 0) return;
        var frame = document.createElement('iframe');
        frame.src = src;
        frame.title = ${JSON.stringify(title)};
        frame.loading = 'lazy';
        frame.style.cssText = 'width:100%;min-height:700px;border:0;display:block';
        button.replaceWith(frame);
      });
    })();
    </script>
    <p style="text-align: center; margin-top: 16px;"><a href="${escapeAttr(externalUrl)}" target="_blank" rel="noopener noreferrer" style="color: ${getAccent(tokens)};">Open scheduler</a></p>
  </div>
</section>`;
  }
  const href = isLinkOnly
    ? (c.url || (c.phone ? `tel:${c.phone}` : '#contact'))
    : '#booking';
  const cta = isLinkOnly
    ? (c.url ? 'Book Now' : (c.phone ? 'Call to Book' : 'Contact Us'))
    : 'Book Now';
  const copy = c.description || c.subtitle || (isLinkOnly
    ? 'Reach out to reserve a time — we will confirm your appointment.'
    : (title === 'Book an Appointment' ? 'Book your appointment online — fast and easy.' : ''));

  if (isLinkOnly) {
    return `<section id="booking" class="ss-booking ss-section" style="background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 600px; margin: 0 auto; text-align: center;">
    <h2 class="ss-h2" style="color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <div style="background: ${getSurface(tokens)}; padding: 40px; border-radius: 12px; border: 1px solid ${getTokens(tokens).theme.hairline};">
      <p style="color: ${getMuted(tokens)}; margin-bottom: 24px;">${escapeHtml(copy)}</p>
      <a href="${escapeAttr(href)}" class="ss-btn" style="background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)};">${escapeHtml(cta)}</a>
    </div>
  </div>
</section>`;
  }

  return `<section id="booking" class="ss-booking ss-section booking-section" style="background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 800px; margin: 0 auto;">
    <h2 class="ss-h2" style="color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p class="ss-lead" style="text-align: center; margin: -24px auto 28px;">${escapeHtml(copy)}</p>
    <div class="ss-booking-mount booking-widget-container" data-ss-booking-mount data-testid="live-booking-widget"></div>
  </div>
</section>`;
}

function renderReviews(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Reviews';
  const rating = c.rating;
  const reviewCount = c.reviewCount;
  const placeId = c.placeId || '';
  const items = Array.isArray(c.items) ? c.items : [];
  const itemsHtml = items.map((item) => {
    const quote = typeof item === 'string' ? item : (item.quote || item.text || item.review || '');
    const author = typeof item === 'string' ? '' : (item.author || item.name || '');
    return `<blockquote style="background: ${getSurface(tokens)}; padding: 24px; border-radius: 12px; border: 1px solid ${getTokens(tokens).theme.hairline}; margin: 0;">
  <p style="color: ${getText(tokens)}; margin: 0 0 12px;">${escapeHtml(quote)}</p>
  ${author ? `<footer style="color: ${getMuted(tokens)};">— ${escapeHtml(author)}</footer>` : ''}
</blockquote>`;
  }).join('\n');

  const widget = placeId
    ? `<div id="reviews-container" class="ss-google-reviews" data-testid="reviews-widget" data-place-id="${escapeAttr(placeId)}"><div data-google-reviews-live></div></div>`
    : '';

  return `<section class="ss-reviews" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 800px; margin: 0 auto; text-align: center;">
    <h2 style="color: ${getAccent(tokens)}; margin-bottom: 16px;">${escapeHtml(title)}</h2>
    ${rating ? `<div style="font-size: 2rem; margin-bottom: 8px;">⭐ ${escapeHtml(String(rating))}</div>` : ''}
    ${reviewCount ? `<p style="color: ${getMuted(tokens)};">${escapeHtml(String(reviewCount))} reviews</p>` : ''}
    ${widget}
    ${itemsHtml ? `<div style="display: grid; gap: 16px; text-align: left; margin-top: 24px;">${itemsHtml}</div>` : ''}
  </div>
</section>`;
}

function renderStats(section, tokens) {
  const c = section.content || {};
  const items = c.items || [];

  if (!items.length) {
    return `<section class="ss-stats" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <p style="text-align: center; color: ${getMuted(tokens)};">No stats available.</p>
  </div>
</section>`;
  }

  const itemsHtml = items
    .map((s) => `<div style="background: ${getSurface(tokens)}; padding: 32px; border-radius: 12px; text-align: center;">
  <div style="font-size: 3rem; font-weight: 700; color: ${getAccent(tokens)}; margin-bottom: 8px;">${escapeHtml(s.value || s.number || '')}</div>
  <div style="color: ${getMuted(tokens)}; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px;">${escapeHtml(s.label || '')}</div>
</div>`)
    .join('\n');

  return `<section class="ss-stats" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px;">
      ${itemsHtml}
    </div>
  </div>
</section>`;
}

function renderMenu(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Menu';
  const sections = c.sections || [];
  const purchasable = Boolean(c.purchasable);

  if (!sections.length) {
    return `<section class="ss-menu" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 800px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p style="text-align: center; color: ${getMuted(tokens)};">No menu sections yet.</p>
  </div>
</section>`;
  }

  const sectionsHtml = sections
    .map((sec, sectionIndex) => {
      const itemsHtml = (sec.items || [])
        .map((item, itemIndex) => `<div style="padding: 12px 0; border-bottom: 1px solid ${getTokens(tokens).theme.hairline};">
  ${item.image ? `<img class="ss-card-media" src="${escapeAttr(item.image)}" alt="${escapeAttr(item.imageAlt || item.name || '')}" width="400" height="220" loading="lazy" decoding="async" />` : ''}
  <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;">
    <h4 style="color: ${getText(tokens)};">${escapeHtml(item.name || '')}</h4>
    ${formatPrice(item.price) ? `<span style="color: ${getAccent(tokens)}; font-weight: 600;">${escapeHtml(formatPrice(item.price))}</span>` : ''}
  </div>
  ${item.description ? `<p style="color: ${getMuted(tokens)}; font-size: 0.9rem; margin-top: 4px;">${escapeHtml(item.description)}</p>` : ''}
  ${item.dietary?.length ? `<p style="color: ${getMuted(tokens)}; font-size: 0.85rem;">${escapeHtml(item.dietary.join(', '))}</p>` : ''}
  ${item.availability ? `<p data-testid="menu-availability" style="color: ${getMuted(tokens)}; font-size: 0.85rem;">${escapeHtml(item.availability)}</p>` : ''}
  ${purchasable ? addToCartButton(item, `${sectionIndex}-${itemIndex}`, tokens) : ''}
</div>`)
        .join('\n');

      return `<div style="margin-bottom: 32px;">
  <h3 style="color: ${getAccent(tokens)}; margin-bottom: 16px; border-bottom: 2px solid ${getAccent(tokens)}; padding-bottom: 8px;">${escapeHtml(sec.name || '')}</h3>
  ${itemsHtml}
</div>`;
    })
    .join('\n');

  return `<section class="ss-menu" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 800px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 40px;">${escapeHtml(title)}</h2>
    ${sectionsHtml}
  </div>
</section>`;
}

function renderServiceAreas(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Service Areas';
  const areas = c.areas || [];

  if (!areas.length) {
    return `<section class="ss-service-areas" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p style="text-align: center; color: ${getMuted(tokens)};">No service areas listed.</p>
  </div>
</section>`;
  }

  const areasHtml = areas
    .map((area) => {
      const name = typeof area === 'string' ? area : area.name || area.area || '';
      return `<div style="background: ${getSurface(tokens)}; padding: 16px 24px; border-radius: 8px; text-align: center; border-left: 4px solid ${getAccent(tokens)};">
  ${escapeHtml(name)}
</div>`;
    })
    .join('\n');

  return `<section class="ss-service-areas" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 40px;">${escapeHtml(title)}</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
      ${areasHtml}
    </div>
  </div>
</section>`;
}

function renderProcess(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Our Process';
  const steps = c.steps || [];

  if (!steps.length) {
    return `<section class="ss-process" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 800px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p style="text-align: center; color: ${getMuted(tokens)};">No process steps defined.</p>
  </div>
</section>`;
  }

  const stepsHtml = steps
    .map((step, i) => `<div style="display: flex; gap: 16px; align-items: flex-start; padding: 24px; background: ${getSurface(tokens)}; border-radius: 12px;">
  <div style="min-width: 40px; height: 40px; background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700;">${i + 1}</div>
  <div>
    <h3 style="color: ${getAccent(tokens)}; margin-bottom: 4px;">${escapeHtml(step.title || step.name || '')}</h3>
    <p style="color: ${getMuted(tokens)};">${escapeHtml(step.description || '')}</p>
  </div>
</div>`)
    .join('\n');

  return `<section class="ss-process" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 800px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 40px;">${escapeHtml(title)}</h2>
    <div style="display: grid; gap: 16px;">
      ${stepsHtml}
    </div>
  </div>
</section>`;
}

function renderCaseStudies(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Case Studies';
  const items = c.items || [];

  if (!items.length) {
    return `<section class="ss-case-studies" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p style="text-align: center; color: ${getMuted(tokens)};">No case studies yet.</p>
  </div>
</section>`;
  }

  const itemsHtml = items
    .map((item) => `<div style="background: ${getSurface(tokens)}; padding: 24px; border-radius: 12px; border: 1px solid ${getTokens(tokens).theme.hairline};">
  <h3 style="color: ${getAccent(tokens)}; margin-bottom: 8px;">${escapeHtml(item.title || '')}</h3>
  <p style="color: ${getMuted(tokens)};">${escapeHtml(item.description || item.summary || '')}</p>
</div>`)
    .join('\n');

  return `<section class="ss-case-studies" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 40px;">${escapeHtml(title)}</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
      ${itemsHtml}
    </div>
  </div>
</section>`;
}

function renderIndustries(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Industries We Serve';
  const items = c.items || [];

  if (!items.length) {
    return `<section class="ss-industries" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p style="text-align: center; color: ${getMuted(tokens)};">No industries listed.</p>
  </div>
</section>`;
  }

  const itemsHtml = items
    .map((item) => {
      const name = typeof item === 'string' ? item : item.name || '';
      return `<div style="background: ${getSurface(tokens)}; padding: 20px; border-radius: 8px; text-align: center; border-bottom: 3px solid ${getAccent(tokens)};">
  ${escapeHtml(name)}
</div>`;
    })
    .join('\n');

  return `<section class="ss-industries" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 40px;">${escapeHtml(title)}</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
      ${itemsHtml}
    </div>
  </div>
</section>`;
}

function renderHowToOrder(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'How to Order';
  const steps = c.steps || [];
  const instructions = c.instructions || '';

  const stepsHtml = steps.length
    ? `<ol style="list-style: decimal; padding-left: 24px; color: ${getText(tokens)};">
  ${steps.map((s) => {
    const text = typeof s === 'string' ? s : s.title || s.description || '';
    return `<li style="margin-bottom: 12px; font-size: 1.1rem;">${escapeHtml(text)}</li>`;
  }).join('\n')}
</ol>`
    : '';

  return `<section class="ss-how-to-order" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 600px; margin: 0 auto; text-align: center;">
    <h2 style="color: ${getAccent(tokens)}; margin-bottom: 24px;">${escapeHtml(title)}</h2>
    <div style="background: ${getSurface(tokens)}; padding: 32px; border-radius: 12px; border: 2px solid ${getAccent(tokens)};">
      ${stepsHtml}
      ${instructions ? `<p style="margin-top: 16px; color: ${getMuted(tokens)};">${escapeHtml(instructions)}</p>` : ''}
    </div>
  </div>
</section>`;
}

function renderHours(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Hours';
  const lines = Array.isArray(c.lines) && c.lines.length
    ? c.lines.filter((line) => typeof line === 'string' && line.trim())
    : (typeof c.hours === 'string' && c.hours.trim() ? [c.hours.trim()] : []);
  const list = lines.length
    ? `<ul style="list-style: none; padding: 0; margin: 0;">${lines.map((line) => `<li style="margin: 8px 0; font-size: 1.1rem; color: ${getText(tokens)};">${escapeHtml(line)}</li>`).join('')}</ul>`
    : '';
  const note = typeof c.note === 'string' && c.note.trim()
    ? `<p style="color: ${getMuted(tokens)}; margin-top: 16px;">${escapeHtml(c.note.trim())}</p>`
    : '';

  return `<section class="ss-hours" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 600px; margin: 0 auto; text-align: center;">
    <h2 style="color: ${getAccent(tokens)}; margin-bottom: 24px;">${escapeHtml(title)}</h2>
    <div style="background: ${getSurface(tokens)}; padding: 32px; border-radius: 12px;">
      ${list}
      ${note}
      ${c.openUntil ? `<p style="color: ${getAccent(tokens)}; margin-top: 12px; font-weight: 600;">Open until ${escapeHtml(c.openUntil)}</p>` : ''}
    </div>
  </div>
</section>`;
}

function renderLocation(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Location';
  const address = c.address || '';
  const instructions = c.instructions || '';

  return `<section class="ss-location" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 600px; margin: 0 auto; text-align: center;">
    <h2 style="color: ${getAccent(tokens)}; margin-bottom: 24px;">${escapeHtml(title)}</h2>
    <div style="background: ${getSurface(tokens)}; padding: 32px; border-radius: 12px;">
      ${address ? `<p style="font-size: 1.1rem; margin-bottom: 12px; color: ${getText(tokens)};">${escapeHtml(address)}</p>` : ''}
      ${instructions ? `<p style="color: ${getMuted(tokens)};">${escapeHtml(instructions)}</p>` : ''}
      ${c.parking ? `<p style="color: ${getText(tokens)}; margin-top: 12px;"><strong>Parking.</strong> ${escapeHtml(c.parking)}</p>` : ''}
      ${c.accessibility ? `<p style="color: ${getText(tokens)}; margin-top: 8px;"><strong>Access.</strong> ${escapeHtml(c.accessibility)}</p>` : ''}
      ${serviceAreaMapHtml(c)}
      ${c.mapUrl ? `<a href="${escapeAttr(c.mapUrl)}" target="_blank" rel="noopener" class="ss-btn" style="background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)};">View on Map</a>` : ''}
    </div>
  </div>
</section>`;
}

function whatsappHref(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const digits = raw.replace(/\D/g, '');
  if (digits && digits.length >= raw.replace(/\s/g, '').length * 0.5) {
    return `https://wa.me/${digits}`;
  }
  return raw;
}

function renderSocial(section, tokens) {
  const c = section.content || {};
  const platforms = [
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'whatsapp', label: 'WhatsApp', href: whatsappHref },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'maps', label: 'Find us on the map' },
    { key: 'website', label: 'Website' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'twitter', label: 'Twitter' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'yelp', label: 'Yelp' },
    { key: 'pinterest', label: 'Pinterest' },
  ];

  const links = platforms
    .filter((platform) => String(c[platform.key] || '').trim())
    .map((platform) => {
      const href = platform.href ? platform.href(c[platform.key]) : String(c[platform.key]).trim();
      return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" style="color: ${getAccent(tokens)}; display: block; margin: 8px 0;">${escapeHtml(platform.label)}</a>`;
    })
    .join('');

  const title = c.title || (links ? 'Find us' : '');
  if (!links && !title) return '';

  return `<section class="ss-social" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 600px; margin: 0 auto; text-align: center;">
    ${title ? `<h2 style="color: ${getAccent(tokens)}; margin-bottom: 24px;">${escapeHtml(title)}</h2>` : ''}
    <div style="background: ${getSurface(tokens)}; padding: 32px; border-radius: 12px;">
      ${links}
    </div>
  </div>
</section>`;
}

function renderZipChecker(section, tokens) {
  const c = section.content || {};
  const areas = (Array.isArray(c.areas) ? c.areas : []).filter((zip) => /^\d{5}$/.test(String(zip)));
  const ranges = (Array.isArray(c.ranges) ? c.ranges : [])
    .filter((range) => Number.isFinite(Number(range?.start)) && Number.isFinite(Number(range?.end)))
    .map((range) => `${Number(range.start)}-${Number(range.end)}`);
  const title = c.title || 'Check service availability';
  const description = c.description || '';
  return `<section id="zip-check" class="ss-zip" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 640px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 16px;">${escapeHtml(title)}</h2>
    ${description ? `<p style="text-align: center; color: ${getMuted(tokens)}; margin-bottom: 24px;">${escapeHtml(description)}</p>` : ''}
    <form class="ss-contact-form" data-testid="zip-check-form" data-type="zip-check" method="post" action="/api/submissions/contact" data-areas="${escapeAttr(areas.join(','))}" data-ranges="${escapeAttr(ranges.join(','))}" data-covered="${escapeAttr(c.successMessage || 'We serve your area.')}" data-outside="${escapeAttr(c.unavailableMessage || 'We do not serve that area yet.')}" novalidate>
      <input type="hidden" name="subdomain" value="${escapeAttr(tokens?._contactSubdomain || '')}" />
      ${contactHoneypotField()}
      <input type="hidden" name="type" value="zip-check" />
      <p class="ss-form-status" data-testid="zip-form-status" data-ss-zip-result role="status" aria-live="polite"></p>
      <label class="ss-field">
        <span>ZIP code</span>
        <input type="text" name="zip" inputmode="numeric" autocomplete="postal-code" required data-testid="zip-check-input" maxlength="5" pattern="[0-9]{5}" />
      </label>
      <label class="ss-field">
        <span>Email</span>
        <input type="email" name="email" autocomplete="email" required maxlength="254" />
      </label>
      <label class="ss-field">
        <span>Name <span class="ss-optional">(optional)</span></span>
        <input type="text" name="name" autocomplete="name" maxlength="200" />
      </label>
      <label class="ss-field">
        <span>Phone <span class="ss-optional">(optional)</span></span>
        <input type="tel" name="phone" autocomplete="tel" maxlength="40" />
      </label>
      <label class="ss-field">
        <span>Message <span class="ss-optional">(optional)</span></span>
        <textarea name="message" rows="3" maxlength="2000">Please check this ZIP.</textarea>
      </label>
      <button type="submit" class="ss-btn" data-testid="zip-check-submit" style="background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)}; border: 0; cursor: pointer;">Check ZIP</button>
    </form>
    <script>
    (function () {
      var form = document.currentScript && document.currentScript.previousElementSibling;
      if (!form || !form.getAttribute) return;
      var result = form.querySelector('[data-ss-zip-result]');
      var areas = (form.getAttribute('data-areas') || '').split(',').filter(Boolean);
      var ranges = (form.getAttribute('data-ranges') || '').split(',').filter(Boolean).map(function (pair) {
        var parts = pair.split('-');
        return { start: Number(parts[0]), end: Number(parts[1]) };
      });
      form.addEventListener('input', function (event) {
        if (!event.target || event.target.name !== 'zip' || !result) return;
        var zip = String(event.target.value || '').trim();
        if (!/^\\d{5}$/.test(zip)) { result.textContent = ''; return; }
        var n = Number(zip);
        var covered = areas.indexOf(zip) !== -1 || ranges.some(function (range) { return n >= range.start && n <= range.end; });
        result.textContent = covered ? (form.getAttribute('data-covered') || '') : (form.getAttribute('data-outside') || '');
      });
    })();
    </script>
  </div>
</section>`;
}

function packageMoney(amount) {
  const price = Number(amount) || 0;
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

function renderPackageCalculator(section, tokens) {
  const c = section.content || {};
  const items = (Array.isArray(c.items) ? c.items : [])
    .map((item) => ({
      name: String(item?.name || '').trim(),
      price: Number(item?.price) || 0,
      description: typeof item?.description === 'string' ? item.description : '',
    }))
    .filter((item) => item.name);
  const title = c.title || 'Build your package';
  const description = c.description || '';
  const choices = items.map((item, index) => `<label class="ss-field" style="display: flex; gap: 12px; align-items: flex-start;">
        <input type="checkbox" name="item_${index}" value="${escapeAttr(`${item.name} — ${packageMoney(item.price)}`)}" data-price="${item.price}" data-testid="package-item-${index}" />
        <span><strong>${escapeHtml(item.name)}</strong> ${escapeHtml(packageMoney(item.price))}${item.description ? `<br><span style="color: ${getMuted(tokens)};">${escapeHtml(item.description)}</span>` : ''}</span>
      </label>`).join('\n');
  return `<section id="package" class="ss-package" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 640px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 16px;">${escapeHtml(title)}</h2>
    ${description ? `<p style="text-align: center; color: ${getMuted(tokens)}; margin-bottom: 24px;">${escapeHtml(description)}</p>` : ''}
    <form class="ss-contact-form" data-testid="package-quote-form" data-type="package-quote" method="post" action="/api/submissions/contact" novalidate>
      <input type="hidden" name="subdomain" value="${escapeAttr(tokens?._contactSubdomain || '')}" />
      ${contactHoneypotField()}
      <input type="hidden" name="type" value="package-quote" />
      <p class="ss-form-status" data-testid="package-form-status" data-ss-package-total role="status" aria-live="polite"></p>
      ${choices}
      <label class="ss-field">
        <span>Email</span>
        <input type="email" name="email" autocomplete="email" required maxlength="254" />
      </label>
      <label class="ss-field">
        <span>Name <span class="ss-optional">(optional)</span></span>
        <input type="text" name="name" autocomplete="name" maxlength="200" />
      </label>
      <label class="ss-field">
        <span>Phone <span class="ss-optional">(optional)</span></span>
        <input type="tel" name="phone" autocomplete="tel" maxlength="40" />
      </label>
      <label class="ss-field">
        <span>Note <span class="ss-optional">(optional)</span></span>
        <textarea name="message" rows="3" maxlength="2000">Please quote this package.</textarea>
      </label>
      <button type="submit" class="ss-btn" data-testid="package-quote-submit" style="background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)}; border: 0; cursor: pointer;">Request quote</button>
    </form>
    <script>
    (function () {
      var form = document.currentScript && document.currentScript.previousElementSibling;
      if (!form || !form.querySelectorAll) return;
      var result = form.querySelector('[data-ss-package-total]');
      form.addEventListener('change', function () {
        if (!result) return;
        var total = 0;
        var boxes = form.querySelectorAll('input[type="checkbox"][data-price]');
        for (var i = 0; i < boxes.length; i++) {
          if (boxes[i].checked) total += Number(boxes[i].getAttribute('data-price')) || 0;
        }
        result.textContent = total ? ('Estimated total $' + total) : '';
      });
    })();
    </script>
  </div>
</section>`;
}

function renderDiagnosticQuiz(section, tokens) {
  const c = section.content || {};
  const questions = (Array.isArray(c.questions) ? c.questions : [])
    .filter((question) => question?.title && Array.isArray(question.options) && question.options.length);
  const title = c.title || 'Get an estimate';
  const description = c.description || '';
  const groups = questions.map((question, questionIndex) => {
    const options = question.options.map((option, optionIndex) => {
      const price = Number(option?.price) || 0;
      const label = String(option?.label || '').trim();
      const value = price > 0 ? `${label} — ${packageMoney(price)}` : label;
      return `<label class="ss-field" style="display: flex; gap: 12px; align-items: flex-start;">
        <input type="radio" name="answer_${questionIndex}" value="${escapeAttr(value)}" data-price="${price}" ${optionIndex === 0 ? 'required' : ''} data-testid="diagnostic-option-${questionIndex}-${optionIndex}" />
        <span>${escapeHtml(label)}${price > 0 ? ` ${escapeHtml(packageMoney(price))}` : ''}</span>
      </label>`;
    }).join('\n');
    return `<fieldset style="border: 0; padding: 0; margin: 0 0 20px;">
      <legend style="font-weight: 700; margin-bottom: 8px;">${escapeHtml(question.title)}</legend>
      ${options}
    </fieldset>`;
  }).join('\n');
  return `<section id="diagnostic" class="ss-diagnostic" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 640px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 16px;">${escapeHtml(title)}</h2>
    ${description ? `<p style="text-align: center; color: ${getMuted(tokens)}; margin-bottom: 24px;">${escapeHtml(description)}</p>` : ''}
    <form class="ss-contact-form" data-testid="diagnostic-quote-form" data-type="diagnostic-quote" method="post" action="/api/submissions/contact" novalidate>
      <input type="hidden" name="subdomain" value="${escapeAttr(tokens?._contactSubdomain || '')}" />
      ${contactHoneypotField()}
      <input type="hidden" name="type" value="diagnostic-quote" />
      <p class="ss-form-status" data-testid="diagnostic-form-status" data-ss-diagnostic-total role="status" aria-live="polite"></p>
      ${groups}
      <label class="ss-field">
        <span>Email</span>
        <input type="email" name="email" autocomplete="email" required maxlength="254" />
      </label>
      <label class="ss-field">
        <span>Name <span class="ss-optional">(optional)</span></span>
        <input type="text" name="name" autocomplete="name" maxlength="200" />
      </label>
      <label class="ss-field">
        <span>Phone <span class="ss-optional">(optional)</span></span>
        <input type="tel" name="phone" autocomplete="tel" maxlength="40" />
      </label>
      <label class="ss-field">
        <span>Note <span class="ss-optional">(optional)</span></span>
        <textarea name="message" rows="3" maxlength="2000">Please estimate this repair.</textarea>
      </label>
      <button type="submit" class="ss-btn" data-testid="diagnostic-quote-submit" style="background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)}; border: 0; cursor: pointer;">Request estimate</button>
    </form>
    <script>
    (function () {
      var form = document.currentScript && document.currentScript.previousElementSibling;
      if (!form || !form.querySelectorAll) return;
      var result = form.querySelector('[data-ss-diagnostic-total]');
      form.addEventListener('change', function () {
        if (!result) return;
        var total = 0;
        var choices = form.querySelectorAll('input[type="radio"][data-price]:checked');
        for (var i = 0; i < choices.length; i++) total += Number(choices[i].getAttribute('data-price')) || 0;
        result.textContent = total ? ('Estimated total $' + total) : '';
      });
    })();
    </script>
  </div>
</section>`;
}

function renderEnhancedProfiles(section, tokens) {
  const c = section.content || {};
  const profiles = Array.isArray(c.profiles) ? c.profiles : [];
  const title = c.title || 'Meet the team';
  const description = c.description || '';
  const cards = profiles.map((profile, index) => {
    const photo = profile.image
      ? `<img src="${escapeAttr(profile.image)}" alt="${escapeAttr(profile.name)}" width="150" height="150" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover;" loading="lazy" decoding="async" />`
      : renderPhotoPlaceholder('staff', { className: 'ss-photo-placeholder--avatar', photoField: `profiles.${index}.photo` });
    const credentials = c.showCredentials !== false && profile.credentials?.length
      ? `<ul data-testid="profile-credentials">${profile.credentials.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : '';
    const specializations = c.showSpecializations !== false && profile.specializations?.length
      ? `<p data-testid="profile-specializations">${escapeHtml(profile.specializations.join(', '))}</p>`
      : '';
    return `<article data-testid="profile-card" style="background: ${getSurface(tokens)}; padding: 24px; border-radius: 12px;">
      ${photo}
      <h3 style="color: ${getAccent(tokens)};">${escapeHtml(profile.name)}</h3>
      ${profile.title ? `<p style="color: ${getMuted(tokens)};">${escapeHtml(profile.title)}</p>` : ''}
      ${profile.bio ? `<p>${escapeHtml(profile.bio)}</p>` : ''}
      ${credentials}
      ${specializations}
    </article>`;
  }).join('\n');
  return `<section id="profiles" class="ss-profiles" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 960px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 16px;">${escapeHtml(title)}</h2>
    ${description ? `<p style="text-align: center; color: ${getMuted(tokens)}; margin-bottom: 24px;">${escapeHtml(description)}</p>` : ''}
    <div data-testid="profile-list" style="display: grid; gap: 16px;">${cards}</div>
  </div>
</section>`;
}

function inquiryControlName(name) {
  if (name === 'contactEmail') return 'email';
  if (name === 'contactName') return 'name';
  if (name === 'contactPhone') return 'phone';
  return name;
}

function renderInquiryField(field) {
  const inputName = inquiryControlName(field.name);
  const required = field.required ? 'required data-ss-required="true"' : '';
  const placeholder = field.placeholder ? ` placeholder="${escapeAttr(field.placeholder)}"` : '';
  if (field.type === 'textarea') {
    return `<label class="ss-field"><span>${escapeHtml(field.label)}</span><textarea name="${escapeAttr(inputName)}" rows="4" maxlength="2000" ${required}${placeholder}></textarea></label>`;
  }
  if (field.type === 'select') {
    const options = field.options.map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.value)}</option>`).join('');
    return `<label class="ss-field"><span>${escapeHtml(field.label)}</span><select name="${escapeAttr(inputName)}" ${required}><option value="">Choose</option>${options}</select></label>`;
  }
  const min = field.type === 'number' && field.min != null ? ` min="${field.min}"` : '';
  const max = field.type === 'number' && field.max != null ? ` max="${field.max}"` : '';
  const autocomplete = inputName === 'email' ? ' autocomplete="email"' : inputName === 'name' ? ' autocomplete="name"' : inputName === 'phone' ? ' autocomplete="tel"' : '';
  return `<label class="ss-field"><span>${escapeHtml(field.label)}</span><input type="${escapeAttr(field.type)}" name="${escapeAttr(inputName)}" maxlength="200"${autocomplete}${min}${max} ${required}${placeholder} /></label>`;
}

function renderMultiStepForm(section, tokens) {
  const c = section.content || {};
  const steps = Array.isArray(c.steps) ? c.steps : [];
  const title = c.title || 'Inquiry';
  const description = c.description || '';
  const stepHtml = steps.map((step, index) => {
    const fields = (step.fields || []).map((field) => renderInquiryField(field)).join('\n');
    return `<fieldset data-ss-step data-testid="inquiry-step" style="border: 0; padding: 0; margin: 0 0 20px;">
      <legend style="font-weight: 700; margin-bottom: 8px;">${index + 1}. ${escapeHtml(step.title)}</legend>
      ${step.description ? `<p style="color: ${getMuted(tokens)};">${escapeHtml(step.description)}</p>` : ''}
      ${fields}
    </fieldset>`;
  }).join('\n');
  return `<section id="inquiry" class="ss-inquiry" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 640px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 16px;">${escapeHtml(title)}</h2>
    ${description ? `<p style="text-align: center; color: ${getMuted(tokens)}; margin-bottom: 24px;">${escapeHtml(description)}</p>` : ''}
    <form class="ss-contact-form" data-testid="inquiry-form" data-type="inquiry" method="post" action="/api/submissions/contact" novalidate>
      <input type="hidden" name="subdomain" value="${escapeAttr(tokens?._contactSubdomain || '')}" />
      ${contactHoneypotField()}
      <input type="hidden" name="type" value="inquiry" />
      <input type="hidden" name="message" value="Please tell us about this event." />
      <p class="ss-form-status" data-testid="inquiry-form-status" role="status" aria-live="polite"></p>
      ${stepHtml}
      <button type="submit" class="ss-btn" data-ss-step-submit data-testid="inquiry-submit" style="background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)}; border: 0; cursor: pointer;">Submit inquiry</button>
    </form>
    <script>
    (function () {
      var form = document.currentScript && document.currentScript.previousElementSibling;
      if (!form || !form.querySelectorAll) return;
      var steps = form.querySelectorAll('[data-ss-step]');
      if (steps.length < 2) return;
      var index = 0;
      var bar = document.createElement('div');
      bar.style.display = 'flex';
      bar.style.gap = '12px';
      bar.style.marginBottom = '16px';
      var back = document.createElement('button');
      back.type = 'button';
      back.textContent = 'Back';
      back.setAttribute('data-ss-step-back', '');
      var next = document.createElement('button');
      next.type = 'button';
      next.textContent = 'Next';
      next.setAttribute('data-ss-step-next', '');
      bar.appendChild(back);
      bar.appendChild(next);
      var submit = form.querySelector('[data-ss-step-submit]');
      form.insertBefore(bar, submit);
      function show(nextIndex) {
        index = nextIndex;
        for (var i = 0; i < steps.length; i++) {
          var on = i === index;
          steps[i].hidden = !on;
          var fields = steps[i].querySelectorAll('[data-ss-required]');
          for (var j = 0; j < fields.length; j++) fields[j].required = on;
        }
        back.hidden = index === 0;
        next.hidden = index === steps.length - 1;
        if (submit) submit.hidden = index !== steps.length - 1;
      }
      form.addEventListener('click', function (event) {
        if (event.target.closest('[data-ss-step-next]')) {
          event.preventDefault();
          if (form.reportValidity()) show(Math.min(index + 1, steps.length - 1));
        } else if (event.target.closest('[data-ss-step-back]')) {
          event.preventDefault();
          show(Math.max(index - 1, 0));
        }
      });
      show(0);
    })();
    </script>
  </div>
</section>`;
}

function filterDataAttr(key) {
  return key === 'petType' ? 'pettype' : key;
}

function renderServiceFilters(section, tokens) {
  const c = section.content || {};
  const items = Array.isArray(c.items) ? c.items : [];
  const groups = Array.isArray(c.groups) ? c.groups : [];
  const title = c.title || 'Filter';
  const description = c.description || '';
  const controls = groups.map((group) => {
    const attr = filterDataAttr(group.key);
    const options = (group.options || []).map((option) => `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`).join('');
    return `<label class="ss-field">
      <span>${escapeHtml(group.label)}</span>
      <select data-ss-filter="${escapeAttr(attr)}" data-testid="service-filter">
        <option value="">All</option>
        ${options}
      </select>
    </label>`;
  }).join('\n');
  const cards = items.map((item) => {
    const price = Number(item.price) > 0 ? packageMoney(item.price) : '';
    return `<li data-ss-filter-item data-category="${escapeAttr(item.category || '')}" data-dietary="${escapeAttr((item.dietary || []).join('|'))}" data-pettype="${escapeAttr((item.petType || []).join('|'))}" data-testid="filter-item" style="padding: 16px; background: ${getSurface(tokens)}; border-radius: 12px;">
      <strong>${escapeHtml(item.name)}</strong>
      ${price ? `<span> ${escapeHtml(price)}</span>` : ''}
      ${item.category ? `<p style="color: ${getMuted(tokens)}; margin: 4px 0 0;">${escapeHtml(item.category)}</p>` : ''}
      ${item.description ? `<p style="margin: 4px 0 0;">${escapeHtml(item.description)}</p>` : ''}
    </li>`;
  }).join('\n');
  return `<section id="filters" class="ss-filters" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 720px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 16px;">${escapeHtml(title)}</h2>
    ${description ? `<p style="text-align: center; color: ${getMuted(tokens)}; margin-bottom: 24px;">${escapeHtml(description)}</p>` : ''}
    <div data-ss-filter-root>
      <div style="display: grid; gap: 12px; margin-bottom: 16px;">${controls}</div>
      <p data-ss-filter-count data-testid="filter-count" role="status" aria-live="polite"></p>
      <ul data-testid="filter-list" style="list-style: none; padding: 0; margin: 0; display: grid; gap: 12px;">${cards}</ul>
    </div>
    <script>
    (function () {
      var root = document.currentScript && document.currentScript.previousElementSibling;
      if (!root || !root.querySelectorAll) return;
      var items = root.querySelectorAll('[data-ss-filter-item]');
      var count = root.querySelector('[data-ss-filter-count]');
      function apply() {
        var controls = root.querySelectorAll('[data-ss-filter]');
        var shown = 0;
        for (var i = 0; i < items.length; i++) {
          var visible = true;
          for (var j = 0; j < controls.length; j++) {
            var value = controls[j].value;
            if (!value) continue;
            var attr = 'data-' + controls[j].getAttribute('data-ss-filter');
            var parts = (items[i].getAttribute(attr) || '').split('|');
            if (parts.indexOf(value) === -1) visible = false;
          }
          items[i].hidden = !visible;
          if (visible) shown += 1;
        }
        if (count) count.textContent = 'Showing ' + shown + ' of ' + items.length;
      }
      root.addEventListener('change', apply);
      apply();
    })();
    </script>
  </div>
</section>`;
}

function renderSubscriptionBooking(section, tokens) {
  const c = section.content || {};
  const plans = Array.isArray(c.plans) ? c.plans : [];
  const frequencies = Array.isArray(c.frequencies) ? c.frequencies : [];
  const title = c.title || 'Plans';
  const description = c.description || '';
  const planChoices = plans.map((plan, index) => {
    const price = Number(plan.price) > 0 ? ` — ${packageMoney(plan.price)}` : '';
    const value = `${plan.name}${price}`;
    return `<label class="ss-field" style="display: flex; gap: 12px; align-items: flex-start; padding: 16px; background: ${getSurface(tokens)}; border-radius: 12px;">
      <input type="radio" name="plan_choice" value="${escapeAttr(value)}" ${index === 0 ? 'required' : ''} data-testid="plan-choice" />
      <span>
        <strong>${escapeHtml(plan.name)}${price ? ` ${escapeHtml(packageMoney(plan.price))}` : ''}</strong>
        ${plan.description ? `<span style="display: block; color: ${getMuted(tokens)};">${escapeHtml(plan.description)}</span>` : ''}
      </span>
    </label>`;
  }).join('\n');
  const frequencyChoices = frequencies.map((item, index) => {
    const off = item.discount > 0 ? ` (${item.discount}% off)` : '';
    const value = `${item.label}${off}`;
    return `<label class="ss-field" style="display: flex; gap: 12px; align-items: center;">
      <input type="radio" name="frequency_choice" value="${escapeAttr(value)}" ${index === 0 ? 'required' : ''} data-testid="plan-frequency" />
      <span>${escapeHtml(value)}</span>
    </label>`;
  }).join('\n');
  return `<section id="plans" class="ss-plans" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 720px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 16px;">${escapeHtml(title)}</h2>
    ${description ? `<p style="text-align: center; color: ${getMuted(tokens)}; margin-bottom: 24px;">${escapeHtml(description)}</p>` : ''}
    <form class="ss-contact-form" data-testid="plan-request-form" data-type="plan-request" method="post" action="/api/submissions/contact" novalidate>
      <input type="hidden" name="subdomain" value="${escapeAttr(tokens?._contactSubdomain || '')}" />
      ${contactHoneypotField()}
      <input type="hidden" name="type" value="plan-request" />
      <p class="ss-form-status" data-testid="plan-form-status" role="status" aria-live="polite"></p>
      <div style="display: grid; gap: 12px; margin-bottom: 20px;">${planChoices}</div>
      ${frequencyChoices ? `<div style="display: grid; gap: 8px; margin-bottom: 20px;">${frequencyChoices}</div>` : ''}
      <label class="ss-field">
        <span>Email</span>
        <input type="email" name="email" autocomplete="email" required maxlength="254" />
      </label>
      <label class="ss-field">
        <span>Name <span class="ss-optional">(optional)</span></span>
        <input type="text" name="name" autocomplete="name" maxlength="200" />
      </label>
      <label class="ss-field">
        <span>Phone <span class="ss-optional">(optional)</span></span>
        <input type="tel" name="phone" autocomplete="tel" maxlength="40" />
      </label>
      <label class="ss-field">
        <span>Note <span class="ss-optional">(optional)</span></span>
        <textarea name="message" rows="3" maxlength="2000">Please set up this plan.</textarea>
      </label>
      <button type="submit" class="ss-btn" data-testid="plan-request-submit" style="background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)}; border: 0; cursor: pointer;">Request this plan</button>
    </form>
  </div>
</section>`;
}

const CLASS_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function classWhen(item) {
  const days = (item.daysOfWeek || []).map((day) => CLASS_DAYS[day]).filter(Boolean).join(', ');
  return [days, item.time].filter(Boolean).join(' · ');
}

function classChoiceLabel(item) {
  const when = classWhen(item);
  return when ? `${item.name} — ${when}` : item.name;
}

function renderClassScheduler(section, tokens) {
  const c = section.content || {};
  const classes = Array.isArray(c.classes) ? c.classes : [];
  const title = c.title || 'Class schedule';
  const description = c.description || '';
  const choices = classes.map((item, index) => {
    const detail = [item.type, item.duration, item.instructor].filter(Boolean).join(' · ');
    return `<label class="ss-field" style="display: flex; gap: 12px; align-items: flex-start; padding: 16px; background: ${getSurface(tokens)}; border-radius: 12px;">
      <input type="radio" name="class_choice" value="${escapeAttr(classChoiceLabel(item))}" ${index === 0 ? 'required' : ''} data-testid="class-choice" />
      <span>
        <strong>${escapeHtml(item.name)}</strong>
        ${detail ? `<span style="display: block; color: ${getMuted(tokens)};">${escapeHtml(detail)}</span>` : ''}
        <span style="display: block;">${escapeHtml(classWhen(item))}</span>
        ${item.description ? `<span style="display: block; color: ${getMuted(tokens)};">${escapeHtml(item.description)}</span>` : ''}
      </span>
    </label>`;
  }).join('\n');
  return `<section id="schedule" class="ss-schedule" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 720px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 16px;">${escapeHtml(title)}</h2>
    ${description ? `<p style="text-align: center; color: ${getMuted(tokens)}; margin-bottom: 24px;">${escapeHtml(description)}</p>` : ''}
    <form class="ss-contact-form" data-testid="class-request-form" data-type="class-request" method="post" action="/api/submissions/contact" novalidate>
      <input type="hidden" name="subdomain" value="${escapeAttr(tokens?._contactSubdomain || '')}" />
      ${contactHoneypotField()}
      <input type="hidden" name="type" value="class-request" />
      <p class="ss-form-status" data-testid="class-form-status" role="status" aria-live="polite"></p>
      <div style="display: grid; gap: 12px; margin-bottom: 20px;">${choices}</div>
      <label class="ss-field">
        <span>Email</span>
        <input type="email" name="email" autocomplete="email" required maxlength="254" />
      </label>
      <label class="ss-field">
        <span>Name <span class="ss-optional">(optional)</span></span>
        <input type="text" name="name" autocomplete="name" maxlength="200" />
      </label>
      <label class="ss-field">
        <span>Phone <span class="ss-optional">(optional)</span></span>
        <input type="tel" name="phone" autocomplete="tel" maxlength="40" />
      </label>
      <label class="ss-field">
        <span>Note <span class="ss-optional">(optional)</span></span>
        <textarea name="message" rows="3" maxlength="2000">Please hold a spot in this class.</textarea>
      </label>
      <button type="submit" class="ss-btn" data-testid="class-request-submit" style="background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)}; border: 0; cursor: pointer;">Request a spot</button>
    </form>
  </div>
</section>`;
}

function videoWatchUrl(provider, videoId) {
  const id = String(videoId || '').trim();
  if (provider === 'youtube' && /^[\w-]{11}$/.test(id)) {
    return `https://www.youtube.com/watch?v=${id}`;
  }
  if (provider === 'vimeo' && /^\d{6,12}$/.test(id)) {
    return `https://vimeo.com/${id}`;
  }
  return '';
}

function renderVideoGallery(section, tokens) {
  const c = section.content || {};
  const videos = Array.isArray(c.videos) ? c.videos : [];
  const title = c.title || 'Videos';
  const description = c.description || '';
  const cards = videos.map((video) => {
    const watchUrl = videoWatchUrl(video.provider, video.videoId);
    const category = c.showCategories !== false && video.category
      ? `<p style="color: ${getMuted(tokens)}; margin: 0 0 8px;">${escapeHtml(video.category)}</p>`
      : '';
    const watch = watchUrl
      ? `<a href="${escapeAttr(watchUrl)}" target="_blank" rel="noopener noreferrer" data-testid="video-watch">Watch</a>`
      : '';
    return `<li data-testid="video-card" style="padding: 20px; background: ${getSurface(tokens)}; border-radius: 12px;">
      ${category}
      <h3 style="color: ${getAccent(tokens)}; margin: 0 0 8px;">${escapeHtml(video.title)}</h3>
      ${video.description ? `<p style="color: ${getMuted(tokens)}; margin: 0 0 8px;">${escapeHtml(video.description)}</p>` : ''}
      ${video.duration ? `<p style="margin: 0 0 12px;">${escapeHtml(video.duration)}</p>` : ''}
      ${watch}
    </li>`;
  }).join('\n');
  return `<section id="videos" class="ss-videos" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 960px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 16px;">${escapeHtml(title)}</h2>
    ${description ? `<p style="text-align: center; color: ${getMuted(tokens)}; margin-bottom: 24px;">${escapeHtml(description)}</p>` : ''}
    <ul data-testid="video-library" style="list-style: none; padding: 0; margin: 0; display: grid; gap: 16px;">
      ${cards}
    </ul>
  </div>
</section>`;
}

function renderProgressTracker(section, tokens) {
  const c = section.content || {};
  const stages = Array.isArray(c.stages) ? c.stages : [];
  const title = c.title || 'Track your repair';
  const current = c.currentStatus || '';
  const items = stages.map((stage, index) => {
    const mark = stage.id && stage.id === current ? ' aria-current="step"' : '';
    return `<li${mark} data-testid="repair-stage" style="padding: 16px 0; border-bottom: 1px solid ${getTokens(tokens).theme.hairline};">
      <strong style="color: ${getAccent(tokens)};">${index + 1}. ${escapeHtml(stage.label)}</strong>
      ${stage.description ? `<p style="color: ${getMuted(tokens)}; margin: 4px 0 0;">${escapeHtml(stage.description)}</p>` : ''}
    </li>`;
  }).join('\n');
  return `<section id="progress" class="ss-progress" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 720px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 24px;">${escapeHtml(title)}</h2>
    <ol data-testid="repair-progress" style="list-style: none; padding: 0; margin: 0;">
      ${items}
    </ol>
  </div>
</section>`;
}

function renderCheckout(section, tokens) {
  const c = section.content || {};
  if (c.enabled === false) return '';

  return `<section class="ss-checkout" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 600px; margin: 0 auto; text-align: center;">
    <div style="background: ${getSurface(tokens)}; padding: 40px; border-radius: 12px; border: 1px solid ${getTokens(tokens).theme.hairline};">
      <h2 style="color: ${getAccent(tokens)}; margin-bottom: 16px;">Your order</h2>
      <button type="button" data-ss-open-cart data-testid="checkout-open-cart" style="background: ${getAccent(tokens)}; color: ${getOnAccent(tokens)}; border: 0; cursor: pointer; padding: 14px 22px;">Review your order</button>
    </div>
  </div>
  <script>
  (function () {
    var section = document.currentScript && document.currentScript.previousElementSibling;
    if (!section) return;
    section.addEventListener('click', function (event) {
      var button = event.target.closest('[data-ss-open-cart]');
      if (!button || !section.contains(button)) return;
      var toggle = document.querySelector('[data-testid="cart-toggle-button"]');
      if (toggle) toggle.click();
    });
  })();
  </script>
</section>`;
}

function resourceHref(url) {
  const value = String(url || '').trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '';
}

function resourceItems(section) {
  const content = section.content || {};
  const settings = section.settings || {};
  if (Array.isArray(content.items) && content.items.length) return content.items;
  if (Array.isArray(content.resources) && content.resources.length) return content.resources;
  if (Array.isArray(settings.resources)) return settings.resources;
  return [];
}

function renderResourceCenter(section, tokens) {
  const content = section.content || {};
  const settings = section.settings || {};
  const items = resourceItems(section);
  const title = content.title || settings.title || 'Resources';
  const description = content.description || settings.description || '';
  const searchable = content.searchable !== false && settings.searchable !== false && items.length > 0;
  const cards = items.map((item) => {
    const href = resourceHref(item.url || item.href);
    const label = item.title || item.name || 'Resource';
    const haystack = [label, item.description, item.category].filter(Boolean).join(' ');
    const link = href
      ? `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" data-testid="resource-open">${escapeHtml(label)}</a>`
      : `<strong>${escapeHtml(label)}</strong>`;
    return `<li data-ss-resource-item data-resource-text="${escapeAttr(haystack)}" data-testid="resource-card" style="padding: 20px; background: ${getSurface(tokens)}; border-radius: 12px;">
      ${item.category ? `<p style="color: ${getMuted(tokens)}; margin: 0 0 8px;">${escapeHtml(item.category)}</p>` : ''}
      <h3 style="color: ${getAccent(tokens)}; margin: 0 0 8px;">${link}</h3>
      ${item.description ? `<p style="color: ${getMuted(tokens)}; margin: 0;">${escapeHtml(item.description)}</p>` : ''}
    </li>`;
  }).join('\n');
  const search = searchable
    ? `<label class="ss-field" style="display: block; margin-bottom: 16px;">
      <span>Search</span>
      <input type="search" data-ss-resource-search data-testid="resource-search" />
    </label>`
    : '';
  const empty = items.length
    ? ''
    : `<p style="text-align: center; color: ${getMuted(tokens)};">No resources yet.</p>`;
  return `<section id="resources" class="ss-resources" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 960px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 16px;">${escapeHtml(title)}</h2>
    ${description ? `<p style="text-align: center; color: ${getMuted(tokens)}; margin-bottom: 24px;">${escapeHtml(description)}</p>` : ''}
    ${search}
    ${empty}
    <ul data-ss-resource-root data-testid="resource-list" style="list-style: none; padding: 0; margin: 0; display: grid; gap: 16px;">
      ${cards}
    </ul>
  </div>
</section>`;
}

function renderPlaceholder(section, tokens) {
  const originalType = section.type || 'unknown';

  return `<div class="ss-placeholder" data-original-type="${escapeAttr(originalType)}" style="padding: 40px 20px; background: ${getSurface(tokens)}; border: 2px dashed ${getTokens(tokens).theme.hairline}; border-radius: 12px; text-align: center; color: ${getMuted(tokens)};">
  <p>Section: ${escapeHtml(originalType)}</p>
  <p style="font-size: 0.85rem;">This section type is not yet supported in preview.</p>
</div>`;
}

// ---------------------------------------------------------------------------
// Renderer map
// ---------------------------------------------------------------------------

const RENDERERS = {
  hero: renderHero,
  services: renderServices,
  about: renderAbout,
  gallery: renderGallery,
  'before-after': renderBeforeAfter,
  team: renderTeam,
  testimonials: renderTestimonials,
  faq: renderFaq,
  credentials: renderCredentials,
  contact: renderContact,
  catalog: renderCatalog,
  booking: renderBooking,
  reviews: renderReviews,
  stats: renderStats,
  menu: renderMenu,
  'service-areas': renderServiceAreas,
  process: renderProcess,
  'case-studies': renderCaseStudies,
  industries: renderIndustries,
  'how-to-order': renderHowToOrder,
  hours: renderHours,
  location: renderLocation,
  social: renderSocial,
  'native-booking': renderBooking,
  checkout: renderCheckout,
  'zip-checker': renderZipChecker,
  'interactive-calculator': renderPackageCalculator,
  'diagnostic-quiz': renderDiagnosticQuiz,
  'progress-tracker': renderProgressTracker,
  'video-gallery': renderVideoGallery,
  'resource-center': renderResourceCenter,
  'class-scheduler': renderClassScheduler,
  'subscription-booking': renderSubscriptionBooking,
  'service-filters': renderServiceFilters,
  'multi-step-form': renderMultiStepForm,
  'enhanced-profiles': renderEnhancedProfiles,
  placeholder: renderPlaceholder,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render a section descriptor into an HTML string.
 *
 * @param {Object} section - Section descriptor { type, content, settings }
 * @param {Object} [tokens] - Theme tokens from resolveTheme()
 * @returns {string} HTML string — never null, never empty
 */
export function renderSectionToHtml(section, tokens) {
  if (!section || !section.type) {
    return renderPlaceholder({ type: 'unknown' }, tokens);
  }

  const renderer = RENDERERS[section.type] || renderPlaceholder;
  const html = renderer(section, tokens);
  if (!html || !html.startsWith('<section')) return html;
  return html.replace(
    /^<section\b/,
    `<section data-ss-edit-type="${escapeAttr(section.type)}"`
  );
}

/**
 * Render a full page (sections + optional brand/metadata) into an HTML document.
 * Used by TemplatePreview for admin template editor iframes.
 *
 * @param {Object} page
 * @param {Array}  [page.sections]
 * @param {Object} [page.metadata]
 * @param {Object} [page.brand]
 * @param {Object} [tokens]
 * @returns {string} Full HTML document string
 */
export function renderPageToHtml(page = {}, tokens) {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const brand = page.brand || page.metadata?._brand || {};
  const t = tokens?.theme || DEFAULT_TOKENS.theme;
  const bg = brand.bg || t.bg;
  const text = brand.text || t.text;
  const accent = brand.accent || t.accent;
  const muted = brand.muted || t.muted;

  const enabled = sections.filter((s) => s && s.enabled !== false);
  const renderTokens = withNativeBookingTokens(tokens || DEFAULT_TOKENS, enabled, page.siteData);
  const sectionsHtml = enabled
    .map((section) => renderSectionToHtml(section, renderTokens))
    .filter(Boolean)
    .join('\n');

  const title = escapeHtml(
    page.metadata?.title || page.metadata?.name || brand.name || 'Template Preview'
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: ${escapeAttr(bg)};
      color: ${escapeAttr(text)};
      line-height: 1.6;
    }
    .container { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${sectionsHtml || `<div style="padding:80px 24px;text-align:center;"><h1 style="color:${escapeAttr(accent)};">${title}</h1><p style="color:${escapeAttr(muted)};">No sections configured.</p></div>`}
</body>
</html>`;
}
