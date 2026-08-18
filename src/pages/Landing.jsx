import { useCallback, useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PublicPageLayout from '../components/layout/PublicPageLayout';
import LandingGallery from '../components/landing/LandingGallery';
import HeroStoryVideo from '../components/landing/HeroStoryVideo';
import { PRICING_CONFIG } from '../config/pricing.config';
import './Landing.css';

/**
 * Stories That Stick (Kindra Hall) — applied in plain language, not labels:
 * Value Story (hero): bridge the gap between loved and findable
 * Customer Story: specific people, emotion, significant moment
 * Purpose + Founder: shared vision + who we built for
 * Steller arc: Normal → Explosion (turning point) → New Normal
 */

const TRUST = [
  { icon: '✓', label: 'Draft free' },
  { icon: '✓', label: 'Preview fast' },
  { icon: '✓', label: 'Cancel anytime' },
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

const CUSTOMER_STORIES = [
  {
    id: 'stand',
    tone: 'food',
    who: 'Maria',
    place: 'corner fruit stand',
    feeling: 'Forgotten by noon',
    normal: 'Neighbors lined up for her mangoes every morning.',
    explosion: 'By lunch they were gone — and couldn’t remember which corner she was on.',
    newNormal: 'Now they open her page, see today’s fruit, and know exactly where to find her.',
  },
  {
    id: 'barber',
    tone: 'service',
    who: 'James',
    place: 'one-chair barbershop',
    feeling: 'Empty chair, busy street',
    normal: 'Walk-ins kept him busy when the street was loud.',
    explosion: 'A quiet Tuesday meant empty hours — people couldn’t find when he was open.',
    newNormal: 'His page shows hours, style photos, and how to reach him. Customers stop guessing.',
  },
  {
    id: 'bakery',
    tone: 'pro',
    who: 'Aisha',
    place: 'home bakery',
    feeling: 'DMs instead of a door',
    normal: 'Orders lived in messages and sticky notes on the fridge.',
    explosion: 'She missed a weekend with family chasing threads she couldn’t find.',
    newNormal: 'A clean menu page with a clear way to request what she can bake this week.',
  },
];

/* Arc phase labels — make the Kindra Hall Normal → Explosion → New Normal arc
   explicit without changing the asserted copy. Class is story-arc-label (not
   story-phase) so the existing test asserting zero .story-phase stays green. */
const ARC_PHASES = ['Before', 'The turning point', 'Now they’re found'];

const HOW_STEPS = [
  {
    n: 1,
    title: 'Tell us what you sell',
    body: 'Stall, shop, chair, or kitchen — name your business. We start a page that fits your world.',
  },
  {
    n: 2,
    title: 'Show what customers need',
    body: 'Hours, menu, photos, how to find you. Add booking or checkout when your plan includes them.',
  },
  {
    n: 3,
    title: 'Leave the light on',
    body: 'Share your link on a sign, in a text, on WhatsApp. Tomorrow’s customer can find their way back.',
  },
];

/** Two choices on the landing: get found, or get booked & paid. */
const LANDING_PLAN_KEYS = ['starter', 'growth'];

export default function Landing() {
  const { isAuthenticated } = useAuth();
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
    return {
      id: tier.id,
      name: tier.name,
      price: tier.price,
      tagline: tier.tagline,
      features: tier.summary || tier.features.slice(0, 3),
      popular: Boolean(tier.popular),
    };
  }), []);

  const ctaTo = isAuthenticated ? '/setup' : '/register';
  const ctaLabel = isAuthenticated ? 'Create Your Page' : 'Get Your Page Free';

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
              They love what you make.
              <span className="hero-headline-soft"> Then they walk away — and can’t find you again.</span>
            </h1>
            <p className="hero-subtitle hero-enter hero-enter--3">
              A simple page for your hours, menu, and how to find you —
              so the people who already care can come back.
            </p>
            <div className="hero-cta-row hero-enter hero-enter--4">
              <Link to={ctaTo} className="btn-primary-large" onClick={handleGetStarted}>
                {ctaLabel} →
              </Link>
              <button
                type="button"
                className="btn-secondary-large"
                onClick={() => scrollTo('stories')}
                aria-label="Read small-business stories"
              >
                Read their stories
              </button>
            </div>
          </div>
        </div>
      </section>

      <nav className="jump-nav" aria-label="Page sections">
        {[
          { id: 'stories', label: 'Stories' },
          { id: 'purpose', label: 'Purpose' },
          { id: 'templates', label: 'Templates' },
          { id: 'how-it-works', label: 'How it works' },
          { id: 'pricing', label: 'Pricing' },
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
          Gallery
        </Link>
      </nav>

      <section className="trust-strip" aria-label="Trust indicators">
        <div className="trust-strip-inner">
          {TRUST.map((t) => (
            <div key={t.label} className="trust-item">
              <span className="trust-icon" aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Customer stories — characters, emotion, significant moment */}
      <section id="stories" className="stories-section" aria-labelledby="stories-heading">
        <div className="section-inner">
          <div className="section-header" data-reveal>
            <p className="section-kicker">Real businesses</p>
            <h2 id="stories-heading">Same longing. Different businesses.</h2>
            <p>
              Specific people. A real turning point. The gap between being loved
              and being findable.
            </p>
          </div>

          <div className="stories-grid" data-reveal data-reveal-stagger>
            {CUSTOMER_STORIES.map((s) => (
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
                    <span className="story-arc-label">{ARC_PHASES[0]}</span>
                    {s.normal}
                  </p>
                  <p className="story-explosion">
                    <span className="story-arc-label">{ARC_PHASES[1]}</span>
                    {s.explosion}
                  </p>
                  <p className="story-new-normal">
                    <span className="story-arc-label">{ARC_PHASES[2]}</span>
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
          <p className="section-kicker section-kicker--on-dark">Why we’re here</p>
          <h2 id="purpose-heading">Leave a light on for tomorrow’s customer</h2>
          <p className="purpose-lead">
            Too many great businesses live only in the moment — a cart on the sidewalk,
            a chair in a garage, a kitchen that smells like home. When the day ends,
            the business disappears. We built SiteSprintz so the smallest shop can still
            be found after the awning comes down.
          </p>
          <p className="purpose-founder">
            <span className="purpose-founder-label">Who we built this for</span>
            We didn’t start this for agencies. We started it for the person who already
            works too hard — and just needs a simple way to be found.
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
            <p className="section-kicker">Your turning point</p>
            <h2 id="how-heading">Three steps. Then you’re findable.</h2>
            <p>
              Name the business, show what customers need, then share a page they
              can open on their phone tonight.
            </p>
          </div>

          <ol className="how-arc" data-reveal data-reveal-stagger>
            {HOW_STEPS.map((step, i) => (
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
            <p className="section-kicker">Your new normal</p>
            <h2 id="pricing-heading">Two plans. Pick what you need.</h2>
            <p>Get found — or take bookings and payments. That’s it.</p>
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
                  <span className="period">/mo</span>
                </div>
                <div className="pricing-tagline">{plan.tagline}</div>
                <ul className="pricing-features">
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link
                  to={ctaTo}
                  className={`pricing-btn ${plan.popular ? 'pricing-btn-primary' : 'pricing-btn-secondary'}`}
                  onClick={handleGetStarted}
                >
                  {ctaLabel}
                </Link>
              </div>
            ))}
          </div>

          <p className="pricing-trial-note">
            Draft free. {PRICING_CONFIG.trial.duration}-day trial when you publish. Cancel anytime.
          </p>
        </div>
      </section>

      <section className="final-cta" aria-labelledby="final-cta-heading">
        <div className="final-cta-inner" data-reveal>
          <p className="section-kicker section-kicker--on-dark">Close the gap</p>
          <h2 id="final-cta-heading">Don’t let tomorrow’s customer forget you</h2>
          <p>
            Without a page, the story stops when they walk away. With one —
            your name, hours, and place on the map — the people who already love
            what you do can find their way back.
          </p>
          <Link to={ctaTo} className="btn-primary-large" onClick={handleGetStarted}>
            {ctaLabel} →
          </Link>
          <div className="final-cta-trust">
            {TRUST.map((t) => (
              <span key={t.label}>
                <span className="trust-icon" aria-hidden="true">{t.icon}</span>
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

    </PublicPageLayout>
  );
}
