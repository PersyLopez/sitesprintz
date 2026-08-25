import { useCallback, useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PublicPageLayout from '../components/layout/PublicPageLayout';
import LandingGallery from '../components/landing/LandingGallery';
import HeroStoryVideo from '../components/landing/HeroStoryVideo';
import { PRICING_CONFIG } from '../config/pricing.config';
import { useLocale } from '../i18n/LocaleContext.jsx';
import LaborExtrasNote from '../components/pricing/LaborExtrasNote';
import './Landing.css';

/**
 * Stories That Stick (Kindra Hall) — applied in plain language, not labels:
 * Value Story (hero): bridge the gap between loved and findable
 * Customer Story: specific people, emotion, significant moment
 * Purpose + Founder: shared vision + who we built for
 * Steller arc: Normal → Explosion (turning point) → New Normal
 */

const TRUST_KEYS = [
  { icon: '✓', key: 'landing.trust.draft' },
  { icon: '✓', key: 'landing.trust.preview' },
  { icon: '✓', key: 'landing.trust.cancel' },
];

/* Tiny inline scene illustrations — match the sunny cartoon hero videos.
   Pure SVG, no new binary assets. Tone-keyed so each story has its own mark. */
const STORY_ICONS = {
  food: (
    <svg viewBox="0 0 48 48" className="story-icon-svg" aria-hidden="true">
      <circle cx="24" cy="27" r="13" fill="#f59e0b" stroke="#c45a0a" strokeWidth="2" />
      <path d="M24 14c-2-4 1-7 4-7-1 3 0 5 2 6" fill="#15803d" stroke="#0f5132" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M17 30c2 3 8 3 12 1" stroke="#c45a0a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  ),
  service: (
    <svg viewBox="0 0 48 48" className="story-icon-svg" aria-hidden="true">
      <circle cx="24" cy="24" r="14" fill="#d5f5f0" stroke="#0f766e" strokeWidth="2" />
      <path d="M16 16l10 10M26 16L16 26" stroke="#0f766e" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.2" fill="#fff" stroke="#0f766e" strokeWidth="1.8" />
      <circle cx="26" cy="16" r="3.2" fill="#fff" stroke="#0f766e" strokeWidth="1.8" />
      <path d="M30 30l6 6" stroke="#0f766e" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  ),
  pro: (
    <svg viewBox="0 0 48 48" className="story-icon-svg" aria-hidden="true">
      <path d="M14 26h20v6a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4v-6z" fill="#fff1de" stroke="#be185d" strokeWidth="2" />
      <path d="M18 26v-4a6 6 0 0 1 12 0v4" fill="#fff" stroke="#be185d" strokeWidth="2" />
      <circle cx="20" cy="20" r="1.4" fill="#be185d" />
      <circle cx="28" cy="20" r="1.4" fill="#be185d" />
      <path d="M22 14c0-2 4-2 4 0" stroke="#be185d" strokeWidth="1.6" fill="#f97316" />
    </svg>
  ),
};

/* How-it-works step icons — storefront, clipboard, share — keep the arc human. */
const STEP_ICONS = [
  (
    <svg viewBox="0 0 48 48" className="how-arc-icon-svg" aria-hidden="true">
      <path d="M10 20h28v18a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V20z" fill="#fff1de" stroke="#c45a0a" strokeWidth="2" />
      <path d="M10 20l3-7h22l3 7" fill="#e87b1e" stroke="#c45a0a" strokeWidth="2" strokeLinejoin="round" />
      <rect x="20" y="26" width="8" height="14" fill="#fff" stroke="#c45a0a" strokeWidth="1.6" />
    </svg>
  ),
  (
    <svg viewBox="0 0 48 48" className="how-arc-icon-svg" aria-hidden="true">
      <rect x="12" y="10" width="24" height="30" rx="3" fill="#fff" stroke="#0f766e" strokeWidth="2" />
      <rect x="18" y="7" width="12" height="6" rx="2" fill="#0f766e" />
      <path d="M17 20h14M17 26h14M17 32h9" stroke="#0f766e" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  (
    <svg viewBox="0 0 48 48" className="how-arc-icon-svg" aria-hidden="true">
      <circle cx="18" cy="18" r="6" fill="#fff1de" stroke="#c45a0a" strokeWidth="2" />
      <circle cx="30" cy="30" r="6" fill="#fff1de" stroke="#c45a0a" strokeWidth="2" />
      <path d="M22 22l4 4" stroke="#c45a0a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 14l-2-2M34 34l2 2" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
];

const CUSTOMER_STORY_IDS = [
  { id: 'stand', tone: 'food', who: 'Maria', key: 'stand' },
  { id: 'barber', tone: 'service', who: 'James', key: 'barber' },
  { id: 'bakery', tone: 'pro', who: 'Aisha', key: 'bakery' },
];

/* Arc phase labels — make the Kindra Hall Normal → Explosion → New Normal arc
   explicit without changing the asserted copy. Class is story-arc-label (not
   story-phase) so the existing test asserting zero .story-phase stays green. */
const ARC_PHASE_KEYS = ['landing.arc.before', 'landing.arc.turn', 'landing.arc.now'];

const HOW_STEP_KEYS = [
  { n: 1, title: 'landing.how.1.title', body: 'landing.how.1.body' },
  { n: 2, title: 'landing.how.2.title', body: 'landing.how.2.body' },
  { n: 3, title: 'landing.how.3.title', body: 'landing.how.3.body' },
];

/** Three hosting choices: brochure, DIY Growth, or we take the list. */
const LANDING_PLAN_KEYS = ['starter', 'growth', 'growth_managed'];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const { t } = useLocale();
  const navigate = useNavigate();
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [activeSection, setActiveSection] = useState('stories');

  useEffect(() => {
    const root = document.querySelector('.landing-page');
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (root && !prefersReduced) {
      root.classList.add('landing-page--motion');
    }

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.35, rootMargin: '-10% 0px -45% 0px' }
    );

    ['templates', 'how-it-works', 'pricing', 'stories', 'purpose'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) sectionObserver.observe(el);
    });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el));

    return () => {
      sectionObserver.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  const landingPlans = useMemo(() => LANDING_PLAN_KEYS.map((key) => {
    const tier = PRICING_CONFIG.tiers[key];
    const features = (tier.summary || tier.features.slice(0, 3)).map((fallback, index) => (
      t(`landing.plan.${key}.f${index}`) || fallback
    ));
    return {
      id: tier.id,
      name: tier.name,
      price: tier.price,
      tagline: t(`landing.plan.${key}.tagline`) || tier.tagline,
      features,
      popular: Boolean(tier.popular),
    };
  }), [t]);

  const ctaTo = isAuthenticated ? '/setup' : '/register';
  const ctaLabel = isAuthenticated ? t('landing.cta.auth') : t('landing.cta.guest');
  const pricingCtaTo = (planId) => (
    isAuthenticated ? `/settings/billing?plan=${planId}` : `/register?plan=${planId}`
  );
  const trustItems = TRUST_KEYS.map((item) => ({ icon: item.icon, label: t(item.key) }));
  const customerStories = CUSTOMER_STORY_IDS.map((story) => ({
    ...story,
    place: t(`landing.stories.${story.key}.place`),
    feeling: t(`landing.stories.${story.key}.feeling`),
    normal: t(`landing.stories.${story.key}.normal`),
    explosion: t(`landing.stories.${story.key}.explosion`),
    newNormal: t(`landing.stories.${story.key}.newNormal`),
  }));
  const arcPhases = ARC_PHASE_KEYS.map((key) => t(key));
  const howSteps = HOW_STEP_KEYS.map((step) => ({
    n: step.n,
    title: t(step.title),
    body: t(step.body),
  }));

  const handleGetStarted = useCallback((e) => {
    if (isAuthenticated) {
      e.preventDefault();
      navigate('/setup');
    }
  }, [isAuthenticated, navigate]);

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <PublicPageLayout className="landing-page">

      {/* Value story — bridge the gap */}
      <section className="landing-hero landing-hero--ambient" aria-labelledby="hero-heading">
        <HeroStoryVideo />
        <div className="hero-content">
          <div className="hero-text">
            <p className="hero-brand hero-enter hero-enter--1">SiteSprintz</p>
            <h1 id="hero-heading" className="hero-headline hero-enter hero-enter--2">
              {t('landing.hero.headline')}
              <span className="hero-headline-soft">{t('landing.hero.headlineSoft')}</span>
            </h1>
            <p className="hero-subtitle hero-enter hero-enter--3">
              {t('landing.hero.subtitle')}
            </p>
            <div className="hero-cta-row hero-enter hero-enter--4">
              <Link to={ctaTo} className="btn-primary-large" onClick={handleGetStarted}>
                {ctaLabel} →
              </Link>
              <button
                type="button"
                className="btn-secondary-large"
                onClick={() => scrollTo('stories')}
                aria-label={t('landing.hero.storiesAria')}
              >
                {t('landing.hero.stories')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <nav className="jump-nav" aria-label="Page sections">
        {[
          { id: 'stories', label: t('landing.jump.stories') },
          { id: 'purpose', label: t('landing.jump.purpose') },
          { id: 'templates', label: t('landing.jump.templates') },
          { id: 'how-it-works', label: t('landing.jump.how') },
          { id: 'pricing', label: t('landing.jump.pricing') },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`jump-chip ${activeSection === item.id ? 'jump-chip--active' : ''}`}
            onClick={() => scrollTo(item.id)}
            aria-current={activeSection === item.id ? 'true' : undefined}
          >
            {item.label}
          </button>
        ))}
        <Link to="/showcase" className="jump-chip jump-chip--gallery" data-testid="jump-nav-gallery">
          {t('landing.jump.gallery')}
        </Link>
      </nav>

      <section className="trust-strip" aria-label={t('landing.trustAria')}>
        <div className="trust-strip-inner">
          {trustItems.map((item) => (
            <div key={item.label} className="trust-item">
              <span className="trust-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Customer stories — characters, emotion, significant moment */}
      <section id="stories" className="stories-section" aria-labelledby="stories-heading">
        <div className="section-inner">
          <div className="section-header" data-reveal>
            <p className="section-kicker">{t('landing.stories.kicker')}</p>
            <h2 id="stories-heading">{t('landing.stories.heading')}</h2>
            <p>
              {t('landing.stories.lead')}
            </p>
          </div>

          <div className="stories-grid" data-reveal data-reveal-stagger>
            {customerStories.map((s) => (
              <article key={s.id} className={`story-card story-card--${s.tone}`}>
                <div className="story-card-head">
                  <span className="story-icon" aria-hidden="true">{STORY_ICONS[s.tone]}</span>
                  <div className="story-who">
                    <span className="story-name">{s.who}</span>
                    <span className="story-place">{s.place}</span>
                  </div>
                </div>
                <p className="story-feeling">{s.feeling}</p>
                <div className="story-arc">
                  <p className="story-normal">
                    <span className="story-arc-label">{arcPhases[0]}</span>
                    {s.normal}
                  </p>
                  <p className="story-explosion">
                    <span className="story-arc-label">{arcPhases[1]}</span>
                    {s.explosion}
                  </p>
                  <p className="story-new-normal">
                    <span className="story-arc-label">{arcPhases[2]}</span>
                    {s.newNormal}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Purpose + Founder */}
      <section id="purpose" className="purpose-section" aria-labelledby="purpose-heading">
        <svg className="purpose-sun" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="22" fill="#f4a261" opacity="0.9" />
          <circle cx="60" cy="60" r="32" fill="none" stroke="#f4a261" strokeWidth="2" opacity="0.45" />
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={i}
              x1="60" y1="14" x2="60" y2="6"
              stroke="#f4a261" strokeWidth="2.4" strokeLinecap="round"
              opacity="0.55"
              transform={`rotate(${i * 30} 60 60)`}
            />
          ))}
        </svg>
        <div className="section-inner purpose-inner" data-reveal>
          <p className="section-kicker section-kicker--on-dark">{t('landing.purpose.kicker')}</p>
          <h2 id="purpose-heading">{t('landing.purpose.heading')}</h2>
          <p className="purpose-lead">
            {t('landing.purpose.lead')}
          </p>
          <p className="purpose-founder">
            <span className="purpose-founder-label">{t('landing.purpose.founderLabel')}</span>
            {t('landing.purpose.founder')}
          </p>
        </div>
      </section>

      <LandingGallery
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={setSelectedTemplateId}
      />

      {/* Steller arc as the plan */}
      <section id="how-it-works" className="how-section" aria-labelledby="how-heading">
        <div className="section-inner">
          <div className="section-header" data-reveal>
            <p className="section-kicker">{t('landing.how.kicker')}</p>
            <h2 id="how-heading">{t('landing.how.heading')}</h2>
            <p>
              {t('landing.how.lead')}
            </p>
          </div>

          <ol className="how-arc" data-reveal data-reveal-stagger>
            {howSteps.map((step, i) => (
              <li key={step.n} className="how-arc-step">
                <div className="how-arc-marker" aria-hidden="true">
                  <span className="how-arc-icon">{STEP_ICONS[i]}</span>
                  <span className="how-arc-num">{step.n}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="pricing" className="pricing-section" aria-labelledby="pricing-heading">
        <div className="section-inner">
          <div className="section-header" data-reveal>
            <p className="section-kicker">{t('landing.pricing.kicker')}</p>
            <h2 id="pricing-heading">{t('landing.pricing.heading')}</h2>
            <p>{t('landing.pricing.lead')}</p>
          </div>

          <div className="pricing-grid pricing-grid--simple" data-reveal data-reveal-stagger>
            {landingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`pricing-card ${plan.popular ? 'featured' : ''}`}
              >
                <div className="pricing-tier-name">{plan.name}</div>
                <div className="pricing-price">
                  <span className="currency">$</span>{plan.price}
                  <span className="period">{t('landing.pricing.period')}</span>
                </div>
                <div className="pricing-tagline">{plan.tagline}</div>
                <ul className="pricing-features">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link
                  to={pricingCtaTo(plan.id)}
                  className={`pricing-btn ${plan.popular ? 'pricing-btn-primary' : 'pricing-btn-secondary'}`}
                  data-testid={`pricing-cta-${plan.id}`}
                >
                  {ctaLabel}
                </Link>
              </div>
            ))}
          </div>

          <p className="pricing-trial-note">
            {t('landing.pricing.trial', { days: PRICING_CONFIG.trial.duration })}
          </p>
          <LaborExtrasNote anchor />
        </div>
      </section>

      <section className="final-cta" aria-labelledby="final-cta-heading">
        <div className="final-cta-inner" data-reveal>
          <p className="section-kicker section-kicker--on-dark">{t('landing.final.kicker')}</p>
          <h2 id="final-cta-heading">{t('landing.final.heading')}</h2>
          <p>
            {t('landing.final.body')}
          </p>
          <Link to={ctaTo} className="btn-primary-large" onClick={handleGetStarted}>
            {ctaLabel} →
          </Link>
          <div className="final-cta-trust">
            {trustItems.map((item) => (
              <span key={item.label}>
                <span className="trust-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </section>

    </PublicPageLayout>
  );
}
