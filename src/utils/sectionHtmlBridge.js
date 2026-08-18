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
  const bg = getBg(tokens);

  const backgroundStyle = image
    ? `background-image: linear-gradient(180deg, rgba(8,8,10,0.42) 0%, rgba(8,8,10,0.78) 100%), url('${escapeAttr(image)}'); background-size: cover; background-position: center;`
    : `background: ${bg};`;
  const photoClass = image ? ' ss-hero--photo' : '';

  return `<section class="ss-hero${photoClass}" style="${backgroundStyle}">
  <div class="ss-hero-inner ss-container">
    ${eyebrow ? `<p class="ss-eyebrow">${escapeHtml(eyebrow)}</p>` : ''}
    <h1 class="ss-hero-title">${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="ss-hero-sub">${escapeHtml(subtitle)}</p>` : ''}
    ${ctaText ? `<a class="ss-btn" href="${escapeAttr(ctaLink)}" style="background: ${accent}; color: ${onAccent};">${escapeHtml(ctaText)}</a>` : ''}
  </div>
  ${image ? `<span class="ss-sr-only">${escapeHtml(imageAlt)}</span>` : ''}
</section>`;
}

function renderServices(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Our Services';
  const items = c.items || [];

  if (!items.length) {
    return `<section class="ss-services" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p style="text-align: center; color: ${getMuted(tokens)};">No services listed yet.</p>
  </div>
</section>`;
  }

  const cardsHtml = items
    .map((item) => {
      const name = item.name || item.title || '';
      const desc = item.description || '';
      const price = item.price === 0 || item.price ? String(item.price) : '';
      const image = item.image || item.src || '';
      return `<article class="ss-card" style="background: ${getSurface(tokens)}; border: 1px solid ${getTokens(tokens).theme.hairline};">
  ${image ? `<img class="ss-card-media" src="${escapeAttr(image)}" alt="${escapeAttr(item.imageAlt || name)}" loading="lazy" />` : ''}
  <div class="ss-card-body">
    <h3 style="color: ${getAccent(tokens)};">${escapeHtml(name)}</h3>
    ${desc ? `<p style="color: ${getMuted(tokens)};">${escapeHtml(desc)}</p>` : ''}
    ${price ? `<div class="ss-price" style="color: ${getAccent(tokens)};">${escapeHtml(price)}</div>` : ''}
  </div>
</article>`;
    })
    .join('\n');

  return `<section class="ss-services ss-section" style="background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container">
    <h2 class="ss-h2" style="color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <div class="ss-card-grid">
      ${cardsHtml}
    </div>
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
  <div class="ss-container ss-about-grid${image ? ' ss-about-grid--media' : ''}">
    ${image ? `<img class="ss-about-media" src="${escapeAttr(image)}" alt="${escapeAttr(title)}" loading="lazy" />` : ''}
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
    return `<section class="ss-gallery" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p style="text-align: center; color: ${getMuted(tokens)};">Add photos of your work</p>
  </div>
</section>`;
  }

  const imgsHtml = images
    .map((img) => {
      const src = img.src || img.url || img;
      const alt = img.alt || '';
      return `<img class="ss-gallery-item" src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" />`;
    })
    .join('\n');

  return `<section class="ss-gallery ss-section" style="background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container">
    <h2 class="ss-h2" style="color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <div class="ss-gallery-grid">
      ${imgsHtml}
    </div>
  </div>
</section>`;
}

function renderBeforeAfter(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Transformations';
  const pairs = c.pairs || [];

  if (!pairs.length) {
    return `<section class="ss-before-after" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 1200px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <p style="text-align: center; color: ${getMuted(tokens)};">No transformations yet.</p>
  </div>
</section>`;
  }

  const pairsHtml = pairs
    .map((p) => `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
  <div><img src="${escapeAttr(p.before)}" alt="Before" style="width: 100%; border-radius: 8px;" /><p style="text-align: center; color: ${getMuted(tokens)}; margin-top: 8px;">Before</p></div>
  <div><img src="${escapeAttr(p.after)}" alt="After" style="width: 100%; border-radius: 8px;" /><p style="text-align: center; color: ${getMuted(tokens)}; margin-top: 8px;">After</p></div>
</div>`)
    .join('\n');

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
    .map((m) => `<div style="text-align: center; background: ${getSurface(tokens)}; padding: 32px; border-radius: 12px;">
  ${m.photo || m.image ? `<img src="${escapeAttr(m.photo || m.image)}" alt="${escapeAttr(m.name)}" style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin-bottom: 16px; border: 4px solid ${getAccent(tokens)};" />` : ''}
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

function renderContact(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Contact Us';
  const email = c.email || '';
  const phone = c.phone || '';
  const address = c.address || '';
  const hours = c.hours || '';
  const details = [
    email ? `<div><strong style="display: block; margin-bottom: 8px; color: ${getAccent(tokens)};">Email</strong><a href="mailto:${escapeAttr(email)}" style="color: ${getText(tokens)}; text-decoration: none;">${escapeHtml(email)}</a></div>` : '',
    phone ? `<div><strong style="display: block; margin-bottom: 8px; color: ${getAccent(tokens)};">Phone</strong><a href="tel:${escapeAttr(phone)}" style="color: ${getText(tokens)}; text-decoration: none;">${escapeHtml(phone)}</a></div>` : '',
    address ? `<div><strong style="display: block; margin-bottom: 8px; color: ${getAccent(tokens)};">Address</strong>${escapeHtml(address)}</div>` : '',
    hours ? `<div><strong style="display: block; margin-bottom: 8px; color: ${getAccent(tokens)};">Hours</strong>${escapeHtml(typeof hours === 'string' ? hours : '')}</div>` : '',
  ].filter(Boolean).join('\n');

  return `<section id="contact" class="ss-contact" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 800px; margin: 0 auto;">
    <h2 style="text-align: center; color: ${getAccent(tokens)}; margin-bottom: 40px;">${escapeHtml(title)}</h2>
    ${details ? `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 32px;">${details}</div>` : ''}
    <form id="contact-form" class="ss-contact-form" data-testid="contact-form" data-type="contact" novalidate>
      <input type="hidden" name="subdomain" value="" />
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

  const cardsHtml = items
    .map((item, index) => `<article class="ss-card" style="background: ${getSurface(tokens)}; border: 1px solid ${getTokens(tokens).theme.hairline};">
  ${item.image ? `<img class="ss-card-media" src="${escapeAttr(item.image)}" alt="${escapeAttr(item.imageAlt || item.name || '')}" loading="lazy" />` : ''}
  <div class="ss-card-body">
    <h3 style="color: ${getAccent(tokens)};">${escapeHtml(item.name || '')}</h3>
    <p style="color: ${getMuted(tokens)};">${escapeHtml(item.description || '')}</p>
    ${item.price ? `<div class="ss-price" style="color: ${getAccent(tokens)};">${escapeHtml(String(item.price))}</div>` : ''}
    ${purchasable ? addToCartButton(item, index, tokens) : ''}
  </div>
</article>`)
    .join('\n');

  return `<section id="catalog" class="ss-catalog ss-section" style="background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container">
    <h2 class="ss-h2" style="color: ${getAccent(tokens)};">${escapeHtml(title)}</h2>
    <div class="ss-card-grid">
      ${cardsHtml}
    </div>
  </div>
</section>`;
}

function renderBooking(section, tokens) {
  const c = section.content || {};
  const title = c.title || 'Book an Appointment';
  const isLinkOnly = c.mode === 'link' || c.embedded === false;
  const href = isLinkOnly
    ? (c.url || (c.phone ? `tel:${c.phone}` : '#contact'))
    : '#booking';
  const cta = isLinkOnly
    ? (c.url ? 'Book Now' : (c.phone ? 'Call to Book' : 'Contact Us'))
    : 'Book Now';
  const copy = isLinkOnly
    ? 'Reach out to reserve a time — we will confirm your appointment.'
    : 'Book your appointment online — fast and easy.';

  if (isLinkOnly) {
    return `<section class="ss-booking ss-section" style="background: ${getBg(tokens)}; color: ${getText(tokens)};">
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
  <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;">
    <h4 style="color: ${getText(tokens)};">${escapeHtml(item.name || '')}</h4>
    ${item.price ? `<span style="color: ${getAccent(tokens)}; font-weight: 600;">${escapeHtml(String(item.price))}</span>` : ''}
  </div>
  ${item.description ? `<p style="color: ${getMuted(tokens)}; font-size: 0.9rem; margin-top: 4px;">${escapeHtml(item.description)}</p>` : ''}
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
  const hours = c.hours || '';

  return `<section class="ss-hours" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 600px; margin: 0 auto; text-align: center;">
    <h2 style="color: ${getAccent(tokens)}; margin-bottom: 24px;">${escapeHtml(title)}</h2>
    <div style="background: ${getSurface(tokens)}; padding: 32px; border-radius: 12px;">
      <p style="font-size: 1.2rem; color: ${getText(tokens)};">${escapeHtml(hours)}</p>
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
      ${address ? `<p style="font-size: 1.1rem; margin-bottom: 12px; color: ${getText(tokens)};">📍 ${escapeHtml(address)}</p>` : ''}
      ${instructions ? `<p style="color: ${getMuted(tokens)};">${escapeHtml(instructions)}</p>` : ''}
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

function renderCheckout(section, tokens) {
  const c = section.content || {};
  const enabled = c.enabled !== false;

  return `<section class="ss-checkout" style="padding: 60px 20px; background: ${getBg(tokens)}; color: ${getText(tokens)};">
  <div class="ss-container" style="max-width: 600px; margin: 0 auto; text-align: center;">
    <div style="background: ${getSurface(tokens)}; padding: 40px; border-radius: 12px; border: 1px solid ${getTokens(tokens).theme.hairline};">
      <h2 style="color: ${getAccent(tokens)}; margin-bottom: 16px;">Checkout</h2>
      <p style="color: ${enabled ? getText(tokens) : getMuted(tokens)};">${enabled ? 'Ready to complete your order.' : 'Checkout is currently unavailable.'}</p>
    </div>
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
  const sectionsHtml = enabled
    .map((section) => renderSectionToHtml(section, tokens || DEFAULT_TOKENS))
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
