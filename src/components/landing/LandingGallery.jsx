import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../i18n/LocaleContext.jsx';
import { getShowcasePath } from '../../utils/galleryTemplateMap.js';
import './LandingGallery.css';

/* ──────────────────────────────────────────────
   Template catalog with section previews
   Warm accents aligned with story-public theme
   ────────────────────────────────────────────── */
const TEMPLATES = [
  {
    id: 'salon',
    category: 'service',
    title: 'Salon & Spa',
    emoji: '💇',
    accent: '#be185d',
    sections: ['hero', 'services', 'booking', 'gallery', 'team', 'testimonials'],
    tags: ['Hair', 'Spa', 'Nails'],
    description: 'Booking, services & gallery',
  },
  {
    id: 'restaurant',
    category: 'food',
    title: 'Restaurant',
    emoji: '🍽️',
    accent: '#e87b1e',
    sections: ['hero', 'catalog', 'hours', 'gallery', 'reviews', 'contact'],
    tags: ['Fine Dining', 'Casual', 'Fast Food'],
    description: 'Menus, hours & reservations',
  },
  {
    id: 'gym',
    category: 'service',
    title: 'Fitness & Gym',
    emoji: '💪',
    accent: '#9a3412',
    sections: ['hero', 'services', 'booking', 'gallery', 'team', 'stats'],
    tags: ['CrossFit', 'Yoga', 'Training'],
    description: 'Classes, pricing & memberships',
  },
  {
    id: 'consultant',
    category: 'professional',
    title: 'Consultant',
    emoji: '💼',
    accent: '#b45309',
    sections: ['hero', 'services', 'case-studies', 'process', 'stats', 'contact'],
    tags: ['Business', 'Strategy', 'Coaching'],
    description: 'Services, case studies & contact',
  },
  {
    id: 'freelancer',
    category: 'professional',
    title: 'Freelancer',
    emoji: '👔',
    accent: '#c2410c',
    sections: ['hero', 'services', 'case-studies', 'gallery', 'testimonials', 'contact'],
    tags: ['Designer', 'Developer', 'Writer'],
    description: 'Portfolio, services & booking',
  },
  {
    id: 'cleaning',
    category: 'service',
    title: 'Cleaning Services',
    emoji: '🧹',
    accent: '#0f766e',
    sections: ['hero', 'services', 'service-areas', 'before-after', 'credentials', 'faq'],
    tags: ['Residential', 'Commercial'],
    description: 'Services, pricing & booking',
  },
  {
    id: 'electrician',
    category: 'service',
    title: 'Electrician',
    emoji: '⚡',
    accent: '#ca8a04',
    sections: ['hero', 'services', 'service-areas', 'before-after', 'credentials', 'faq'],
    tags: ['Residential', 'Commercial'],
    description: 'Services, emergency & booking',
  },
  {
    id: 'auto-repair',
    category: 'service',
    title: 'Auto Repair',
    emoji: '🚗',
    accent: '#78716c',
    sections: ['hero', 'services', 'service-areas', 'before-after', 'credentials', 'contact'],
    tags: ['Quick Service', 'Full Service'],
    description: 'Services, booking & pricing',
  },
  {
    id: 'pet-care',
    category: 'service',
    title: 'Pet Care',
    emoji: '🐾',
    accent: '#ea580c',
    sections: ['hero', 'services', 'booking', 'gallery', 'testimonials', 'contact'],
    tags: ['Grooming', 'Boarding'],
    description: 'Services, gallery & booking',
  },
  {
    id: 'plumbing',
    category: 'service',
    title: 'Plumbing',
    emoji: '🔧',
    accent: '#0f766e',
    sections: ['hero', 'services', 'service-areas', 'before-after', 'credentials', 'faq'],
    tags: ['Emergency', 'Residential'],
    description: 'Services, areas & booking',
  },
  {
    id: 'tech-repair',
    category: 'service',
    title: 'Tech Repair',
    emoji: '💻',
    accent: '#1d4ed8',
    sections: ['hero', 'services', 'booking', 'gallery', 'testimonials', 'contact'],
    tags: ['Phones', 'Computers'],
    description: 'Repairs, hours & booking',
  },
  {
    id: 'tow-truck',
    category: 'service',
    title: 'Tow Truck',
    emoji: '🚛',
    accent: '#a8763e',
    sections: ['hero', 'services', 'service-areas', 'credentials', 'contact'],
    tags: ['Roadside', 'Recovery'],
    description: 'Dispatch, areas & contact',
  },
  {
    id: 'product-showcase',
    category: 'shop',
    title: 'Product Showcase',
    emoji: '🛍️',
    accent: '#9a3412',
    sections: ['hero', 'catalog', 'gallery', 'reviews', 'contact'],
    tags: ['Retail', 'Maker'],
    description: 'Catalog, photos & contact',
  },
  {
    id: 'product-ordering',
    category: 'shop',
    title: 'Product Ordering',
    emoji: '📦',
    accent: '#c2410c',
    sections: ['hero', 'catalog', 'hours', 'reviews', 'contact'],
    tags: ['Orders', 'Pickup'],
    description: 'Catalog, hours & checkout',
  },
];

/* ──────────────────────────────────────────────
   Category tabs
   ────────────────────────────────────────────── */
const CATEGORIES = [
  { id: 'all', label: 'All Templates' },
  { id: 'service', label: 'Service' },
  { id: 'food', label: 'Food & Dining' },
  { id: 'professional', label: 'Professional' },
  { id: 'shop', label: 'Shop' },
];

/* ──────────────────────────────────────────────
   Section mini-block colors (for the preview)
   ────────────────────────────────────────────── */
const SECTION_STYLES = {
  hero:          { height: 40, bg: 'var(--gl-accent)', opacity: 0.9 },
  services:      { height: 18, bg: 'var(--gl-accent)', opacity: 0.25 },
  booking:       { height: 22, bg: 'var(--gl-accent)', opacity: 0.55 },
  catalog:       { height: 20, bg: 'var(--gl-accent)', opacity: 0.3 },
  gallery:       { height: 14, bg: 'var(--gl-accent)', opacity: 0.15 },
  'case-studies':{ height: 18, bg: 'var(--gl-accent)', opacity: 0.25 },
  team:          { height: 16, bg: 'var(--gl-accent)', opacity: 0.2 },
  testimonials:  { height: 16, bg: 'var(--gl-accent)', opacity: 0.2 },
  reviews:       { height: 14, bg: 'var(--gl-accent)', opacity: 0.18 },
  stats:         { height: 10, bg: 'var(--gl-accent)', opacity: 0.4 },
  process:       { height: 16, bg: 'var(--gl-accent)', opacity: 0.22 },
  'service-areas':{ height: 12, bg: 'var(--gl-accent)', opacity: 0.18 },
  'before-after':{ height: 18, bg: 'var(--gl-accent)', opacity: 0.25 },
  credentials:   { height: 10, bg: 'var(--gl-accent)', opacity: 0.15 },
  faq:           { height: 16, bg: 'var(--gl-accent)', opacity: 0.18 },
  contact:       { height: 14, bg: 'var(--gl-accent)', opacity: 0.35 },
};

const DEFAULT_SECTION_STYLE = { height: 14, bg: 'var(--gl-accent)', opacity: 0.2 };

/* ──────────────────────────────────────────────
   Mini section preview component
   ────────────────────────────────────────────── */
function SectionPreview({ sections, accent }) {
  return (
    <div
      className="gl-sections"
      style={{ '--gl-accent': accent }}
      aria-hidden="true"
    >
      {sections.map((sectionType, i) => {
        const style = SECTION_STYLES[sectionType] || DEFAULT_SECTION_STYLE;
        return (
          <div
            key={i}
            className="gl-section-block"
            style={{
              height: `${style.height}px`,
              background: style.bg,
              opacity: style.opacity,
            }}
          />
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Template card
   ────────────────────────────────────────────── */
function TemplateCard({ template, showcaseTo, useLookTo, onUseLook, isSelected, style, t }) {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      className={`gl-card ${hovered ? 'gl-card--hovered' : ''} ${isSelected ? 'gl-card--selected' : ''}`}
      style={{ '--card-accent': template.accent, ...style }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-testid={`gallery-card-${template.id}`}
    >
      <Link
        to={showcaseTo}
        className="gl-card-example"
        data-testid={`gallery-card-${template.id}-example`}
      >
        <div className="gl-card-preview">
          <SectionPreview sections={template.sections} accent={template.accent} />
          <div className="gl-card-emoji-wrap">
            <span className="gl-card-emoji">{template.emoji}</span>
          </div>
        </div>

        <div className="gl-card-info">
          <h3 className="gl-card-title">{t(`gallery.tpl.${template.id}.title`)}</h3>
          <p className="gl-card-desc">{t(`gallery.tpl.${template.id}.desc`)}</p>
          <div className="gl-card-tags">
            {template.tags.map((tag) => (
              <span key={tag} className="gl-tag">{tag}</span>
            ))}
          </div>
        </div>

        <div className="gl-card-cta">
          <span>{t('gallery.seeExample')}</span>
        </div>
      </Link>

      <Link
        to={useLookTo}
        className="gl-card-use"
        onClick={onUseLook}
        data-testid={`gallery-card-${template.id}-use`}
      >
        {t('gallery.useThisLook')}
      </Link>
    </article>
  );
}

/* ──────────────────────────────────────────────
   LandingGallery (main export)
   ────────────────────────────────────────────── */
export default function LandingGallery({ selectedTemplateId, onSelectTemplate }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [liveSites, setLiveSites] = useState([]);
  const { isAuthenticated } = useAuth();
  const { t } = useLocale();

  useEffect(() => {
    const controller = new AbortController();

    const loadLive = async () => {
      try {
        const response = await fetch('/api/showcases?kind=clients&page=1&pageSize=4', {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        setLiveSites(Array.isArray(data.sites) ? data.sites.slice(0, 4) : []);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setLiveSites([]);
      }
    };

    loadLive();
    return () => controller.abort();
  }, []);

  const handleUseLook = (templateId) => {
    onSelectTemplate?.(templateId);
  };

  const showcaseTo = (templateId) => getShowcasePath(templateId);

  const useLookTo = (templateId) =>
    isAuthenticated ? `/setup?template=${templateId}` : `/register?template=${templateId}`;

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return TEMPLATES;
    return TEMPLATES.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  const liveTitle = (site) =>
    site.name ||
    site.site_data?.hero?.title ||
    site.site_data?.brand?.name ||
    site.subdomain ||
    t('gallery.liveTitle');

  return (
    <section id="templates" className="gl-section" aria-label={t('gallery.sectionAria')} data-testid="landing-gallery">
      <div className="gl-inner">
        <div className="gl-header" data-reveal>
          <p className="section-kicker">{t('gallery.kicker')}</p>
          <h2>{t('gallery.heading')}</h2>
          <p>
            {t('gallery.lead')}
          </p>
        </div>

        <div className="gl-tabs" role="tablist" aria-label={t('gallery.filterAria')} data-reveal>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={activeCategory === cat.id}
              className={`gl-tab ${activeCategory === cat.id ? 'gl-tab--active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              data-testid={`gallery-tab-${cat.id}`}
            >
              {t(`gallery.tab.${cat.id}`)}
            </button>
          ))}
        </div>

        <div className="gl-grid" data-testid="gallery-grid" data-reveal data-reveal-stagger>
          {filtered.map((template, i) => (
            <TemplateCard
              key={template.id}
              template={template}
              showcaseTo={showcaseTo(template.id)}
              useLookTo={useLookTo(template.id)}
              onUseLook={() => handleUseLook(template.id)}
              isSelected={selectedTemplateId === template.id}
              t={t}
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>

        {liveSites.length > 0 && (
          <div className="gl-live" data-reveal data-testid="landing-live-showcase">
            <div className="gl-live-header">
              <p className="section-kicker">{t('gallery.live.kicker')}</p>
              <h3>{t('gallery.live.heading')}</h3>
              <p>{t('gallery.live.lead')}</p>
            </div>
            <div className="gl-live-grid">
              {liveSites.map((site) => (
                <Link
                  key={site.id || site.subdomain}
                  to={`/showcase/${site.subdomain}`}
                  className="gl-live-card"
                  data-testid={`landing-live-${site.subdomain}`}
                >
                  <span className="gl-live-emoji" aria-hidden="true">
                    {site.template?.includes('salon') ? '💇'
                      : site.template?.includes('restaurant') || site.template?.includes('food') ? '🍽️'
                        : site.template?.includes('gym') ? '💪'
                          : '🌐'}
                  </span>
                  <span className="gl-live-title">{liveTitle(site)}</span>
                  <span className="gl-live-meta">/view/{site.subdomain}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="gl-footer" data-reveal>
          <Link to="/showcase" className="gl-see-all" data-testid="landing-gallery-showcase-link">
            Browse example sites →
          </Link>
        </div>
      </div>
    </section>
  );
}
