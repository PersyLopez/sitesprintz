# Layout System Design — "Refined Instrument" Engine

**Status:** Fully wired end-to-end (engine + tokens + all layouts + wizards + preview + SSR + feature flags + parity guard — 338 tests green)

- Phase 1: layoutTokens, layouts, layoutRenderer, featureFlags
- Phase 2: bazaarDefaults, BazaarWizard (Approachable character)
- Phase 3: nicheTemplateBuilders (Craftsman, Counsel, Mercantile + Atelier)
- Phase 4: LevelSelector, wizardSiteDataBuilder, QuickStartWizard integration (level step + new-engine path with old fallback)
- Phase 5: templateLayouts backward-compat shim, layoutParity regression guard
- Phase 6 (wiring): sectionHtmlBridge (shared SSR/client HTML bridge), PreviewFrame rewrite (composePage + token-driven rendering), publishedSiteRenderer rewrite (composePage + SSR), BazaarWizard wired to Setup.jsx, feature flags enforced at publish
**Scope:** Replaces the current preview (`unifiedRenderer.js`) and publish (`sectionHtml.js`) renderers with one shared layout engine. Introduces 5 named layouts, 2 visual characters, 3 business levels, and a token-driven theme system.

---

## 1. Goals

- **One engine, one parity** — preview and publish use the same rendering spec; no more divergence.
- **Premium, minimalist visual language** — "slightly luxurious casino watch": durable, trustworthy, precise, attention to detail. No glassmorphism, no glows, no gradient bodies.
- **Niches share structure, express identity through tokens** — not through different HTML per niche.
- **Real layouts return** — 5 named layouts replace the dead `templateLayouts.js`.
- **Easy option for pop-ups** — a weekend yard sale or food stall gets the full online business experience (catalog, ordering, location, payments) with minimal config and zero ceremony.
- **Scales from solopreneur to established small business** — same layout composes differently by business level.
- **Essential features available to all, always opt-out** — booking, online ordering, and online payment are offered to every layout/level, but every one can be disabled. A cash-only, no-booking, no-orders business is a first-class configuration, not a degraded one.

---

## 2. Three orthogonal axes

| Axis | Controls | Source of truth |
|------|----------|-----------------|
| **Layout** | Page skeleton, which sections, ordering | Template/niche assignment |
| **Character** | Visual feel (typography, base mode, motion) | Defaults from layout; user-overridable |
| **Level** | Composition density, featured sections, hero variant | Auto-detected from data; user-overridable |

**Tier is separate** — it gates *advanced* features (analytics, advanced booking, custom domains). Level never gates features; it only changes presentation. A Solo+Growth salon can book but stays light. An Established+Starter salon shows full presence but can't take checkout.

### Feature availability — essential vs advanced

The platform separates **essential** features (offered to all, always opt-out) from **advanced** features (tier-gated):

| Feature | Classification | Default | Who can use | Who can disable |
|---------|---------------|---------|-------------|-----------------|
| Contact / inquiry | Essential | On | All tiers | Yes — hide section |
| Online booking | Essential | On (Atelier, Craftsman) / Off (others) | All tiers | Yes — any time |
| Online ordering (cart/pickup) | Essential | On (Mercantile, Bazaar) / Off (others) | All tiers | Yes — any time |
| Online payment (Stripe checkout) | Essential | On when ordering/booking enabled | All tiers | Yes — go cash-only |
| Cash / in-person payment | Essential | On | All tiers | Yes — but at least one payment method required when ordering is on |
| Catalog / menu display | Essential | On (Mercantile, Bazaar) | All tiers | Yes — hide section |
| Gallery | Essential | On | All tiers | Yes — hide section |
| Testimonials | Essential | On (Studio+) | All tiers | Yes — hide section |
| Analytics | Advanced | — | Growth+ only | n/a |
| Custom domain | Advanced | — | Growth+ only | n/a |
| Advanced booking (recurring, buffer, multi-staff scheduling) | Advanced | — | Growth+ only | Yes |
| Reviews integration (Google Reviews) | Advanced | — | Growth+ only | Yes |

**Cash-only is a first-class path.** A business that wants only cash transactions:
- Disables online payment (one toggle) → Stripe checkout removed, no payment method collected at order/booking time.
- Keeps online ordering ON → cart/pickup works, customer sees "Pay in person / cash" at checkout.
- Or disables online ordering entirely → no cart, contact-only (still a complete site).

**Booking off is a first-class path.** A salon that takes walk-ins or phone-only:
- Disables booking → booking panel section hidden, hero CTA switches to "Call to book" (uses `contact.phone`).
- The booking section can be re-enabled any time from the editor's Settings.

**At least-one rule.** When ordering or booking is enabled, at least one payment method must be active (online payment, cash, or both). The editor prevents saving a state with ordering on but zero payment methods — it prompts the user to pick one rather than silently breaking checkout.

**Opt-out never degrades the look.** Sections that are off are simply absent from the skeleton; the layout recomposes without gaps (no empty placeholders, no "section coming soon" stubs). A cash-only, no-booking, no-orders Bazaar is a clean catalog + location + contact page.

---

## 3. Layouts

| Layout | Character | Visitor intent | Niches / use cases |
|--------|-----------|---------------|-------------------|
| **Atelier** | Refined | Book an appointment | salon, gym, pet-care, tech-repair |
| **Craftsman** | Refined | Get a problem fixed (trust + reach) | cleaning, electrician, plumbing, auto-repair, tow-truck |
| **Counsel** | Refined | "Can they solve my problem?" — proof | consultant, freelancer |
| **Mercantile** | Refined | Browse and buy/order | product-ordering, product-showcase, restaurant |
| **Bazaar** | Approachable | Pop-up / temporary selling | yard sale, food stall, lemonade stand, pop-up shop, one-day event |

### Skeletons (per layout, per level)

```
Atelier · Solo:        hero(split, "book with me") → services → gallery → booking-panel → hours → location → contact → social
Atelier · Studio:      hero(split) → services → team(staff-picker) → gallery → booking-panel(staff) → testimonials → hours → location → contact → social
Atelier · Established: hero(split) → services → team(grid) → gallery → booking-panel(advanced) → testimonials → reviews → stats → hours → location → contact → social

Craftsman · Solo:        hero(full-bleed, quote CTA) → service-areas → before-after → faq → hours → location → contact → social
Craftsman · Studio:      hero(full-bleed) → service-areas → process → before-after → credentials → faq → hours → location → contact → social
Craftsman · Established: hero(full-bleed) → service-areas → process → before-after → credentials → stats → testimonials → faq → hours → location → contact → social

Counsel · Solo:        hero(lead) → services(index) → case-studies → hours → location → contact → social
Counsel · Studio:      hero(lead) → services(index) → case-studies → process → team → testimonials → hours → location → contact → social
Counsel · Established: hero(lead) → industries → services(index) → case-studies → process → team → testimonials → stats → hours → location → contact → social

Mercantile · Solo:        hero(featured) → catalog-grid → hours → location → contact → social
Mercantile · Studio:      hero(featured) → catalog-grid → showcase-gallery → team → reviews → faq → hours → location → contact → social
Mercantile · Established: hero(featured) → catalog-grid → showcase-gallery → team → reviews → stats → faq → hours → location → contact → social

Bazaar (no levels):    hero(what/where/when) → item-grid → "how to order" strip → hours → location → contact → social
                       optional: countdown banner if end-date set
```

Every skeleton = `nav | hero | content-bands | cta-strip | footer`. Layouts differ only in which sections are *required* and the hero variant. **Every layout/level includes hours, location, contact, and social** (suffix). Social is rendered by the layout engine (`composePage` / `sectionHtmlBridge`), not only Foundation. **Disabled sections simply drop out** — the layout recomposes without gaps. No feature is forced on; no layout requires booking, ordering, or online payment to render correctly.

---

## 4. Characters

| Character | For | Base | Display type | Motion | Radii |
|-----------|-----|------|--------------|--------|-------|
| **Refined** | Established service businesses | Onyx (dark) default | Fraunces serif | Restrained scroll-reveal only | Sharp (0 on hairline cards) |
| **Approachable** | Pop-ups, casual/temporary selling | Ivory (light) default | Inter (heavier weights) | Snappy 200ms hovers, no serif | 6px |

Both minimalist, both detailed. A Bazaar user can flip `character: refined` for a high-end pop-up; an Atelier user can flip `character: approachable` for a breezy beach salon. Defaults match intent.

---

## 5. Theme tokens

### 5.1 Base modes (two)

```
Onyx  (Refined default)
  bg       #0c0c0e
  surface  #141417
  text     #f4f2ee
  muted    #8a8a8f
  hairline rgba(244,242,238,.10)

Ivory  (Approachable default)
  bg       #f6f4ef
  surface  #fffefb
  text     #1b1b1f
  muted    #6b6b72
  hairline rgba(27,27,31,.10)
```

### 5.2 Accent palette (one curated hue per category, no gradients)

```
REFINED accents (Onyx base)
  Trade      steel    #3b6ea5    plumbing, electrician, tech-repair
  Workshop   bronze   #a8763e    auto-repair, tow-truck
  Studio     oxblood  #7c2d2d    salon
  Club       graphite #4a4f57    gym
  Counsel    indigo   #2e3a6b    consultant, freelancer
  Hearth     forest   #2f5d43    cleaning, pet-care
  Table      amber    #9a6a1f    restaurant, product-ordering, product-showcase

APPROACHABLE accents (Ivory base)
  Market     terracotta  #c2683a    weekend food stall, pop-up food
  Garage     rust        #a4563a    yard sale, estate sale
  Stand      ochre       #c98a2b    lemonade stand, bake sale, casual one-off
  Fair       plum        #7a4a6b    pop-up shop, craft market
```

Accent is used only for: nav active indicator, primary button, section eyebrow labels, key links. Everything else neutral. That restraint is what reads "premium" not "themed."

### 5.3 Typography

```
Display (Refined):  "Fraunces"  weights 400/600, tight leading
Display (Approachable): "Inter" weights 600/700
Body:    "Inter" 400/500/600
Labels:  Inter, uppercase, letter-spacing .14em, .75rem  (the "dial markings")

Scale:
  display-xl  3.25rem / 1.08   (hero)
  display-lg  2.5rem  / 1.1
  h2          1.75rem / 1.2    (section heads)
  h3          1.25rem / 1.3
  body-lg     1.125rem / 1.6
  body        1rem / 1.65
  label       .75rem / 1.4    uppercase tracked
```

### 5.4 Spacing, radii, elevation

```
Spacing (8px baseline): xs 8 · sm 16 · md 24 · lg 40 · xl 64 · 2xl 96
Section vertical padding: clamp(64px, 8vw, 96px)

Radii:
  hairline-bounded cards: 0   (sharp = precise/instrument-like)
  inputs/buttons: 4px
  nav active indicator: full pill
  (Approachable: 6px on cards for friendliness)

Elevation:
  card:  0 1px 0 hairline + 0 8px 24px rgba(0,0,0,.18)  (Onyx) / none (Ivory)
  hover: translate-y -2px, accent hairline appears — no scale, no glow
```

---

## 6. Business levels

| Level | Auto-detect signals | Composition effect |
|-------|---------------------|--------------------|
| **Solo** | 1 staff · ≤3 services · single location · no team data | Light skeleton — no team grid, no staff picker, first-person hero, more whitespace |
| **Studio** | 2–6 staff · multiple service categories · has team data | Medium — staff/team section appears, staff picker in booking, testimonials promoted |
| **Established** | 6+ staff · full team · reviews present · multiple staff/locations | Full — team grid, reviews/credentials/stats prominent, densest, most ceremony |

### Auto-detection (suggested, user-overridable)

```
function suggestLevel(siteData) {
  const staff = siteData.team?.length ?? 0;
  const services = siteData.services?.length ?? siteData.products?.length ?? 0;
  const hasReviews = (siteData.testimonials?.length ?? 0) > 0;
  const hasCredentials = !!siteData.credentials;
  if (staff >= 6 || (hasReviews && hasCredentials && staff >= 3)) return 'established';
  if (staff >= 2 || services > 3) return 'studio';
  return 'solo';
}
```

### Level ↔ Tier (never conflicts)

- Level never unlocks gated features — only tier does.
- Solo + Growth → can book, layout stays light (no staff picker).
- Established + Starter → full presence, checkout gated off.
- QuickStart asks level for Refined layouts only; Bazaar skips it.

---

## 7. Section variants (one engine serves all niches)

Same primitives, variant per data — avoids per-niche HTML.

```
hero.variant:
  split        (Atelier)     text left, image right, booking CTA primary
  full-bleed   (Craftsman)  image bg, quote/emergency CTA, overlay text
  lead         (Counsel)    centered, restrained, single lead CTA
  featured     (Mercantile) text left, featured product image right
  stall        (Bazaar)     what/where/when headline, open-until countdown optional

services.variant:
  grid    3-col cards (default)
  list    row-based, denser (Craftsman)
  index   numbered list (Counsel process)

gallery.variant:
  masonry       varied heights (Atelier portfolio)
  before-after  slider pairs (Craftsman)
  grid          uniform (Mercantile showcase)

testimonials.variant:
  rail    horizontal scroller
  feature one large pull-quote
  grid    3-up compact

team.variant:
  staff-picker  selectable cards with booking CTA (Atelier Studio+)
  grid          equal cards (Established)
  solo          single profile card (Solo)
```

Every registry section type maps to a primitive. Unknown types render a clean placeholder, **never `null`** — fixes the silent-drop bug in the current `sectionHtml.js`.

---

## 8. Bazaar — the "easy" path

Built for "someone decides to sell food for the weekend." Full online business experience, minimal complexity.

| Concern | Refined layouts | Bazaar |
|---------|----------------|--------|
| Required fields | brand, hero, 2+ sections, contact | name + items + (location or contact) |
| Wizard steps | 3 (industry → basics → style) + level | 2 (what + where/when) — no industry pick, no level |
| Sections available | full registry | curated short list: items, hours, location, social, "how to order", gallery (optional) |
| Booking/staff | available, tier-gated | hidden entirely |
| Online ordering | available | On by default — but fully disableable for a display-only pop-up |
| Online payment | available when ordering on | Offable → cash-only checkout ("pay at pickup") |
| Default end-date | none | optional "open until" → countdown banner, auto-archival hook |
| Publish gating | essential features always available; advanced tier-gated |

A growing pop-up graduates to Mercantile when it adds permanence (recurring hours, team, multiple categories).

---

## 9. Token schema (file format)

One JSON document per site, resolved at render time. Lives alongside `siteData`.

```json
{
  "layout": "atelier",
  "character": "refined",
  "level": "studio",
  "theme": {
    "mode": "onyx",
    "accent": "oxblood",
    "accentValue": "#7c2d2d"
  },
  "features": {
    "booking":         { "enabled": true,  "requiresPayment": false },
    "onlineOrdering":  { "enabled": true,  "requiresPayment": true  },
    "onlinePayment":   { "enabled": true  },
    "cashPayment":     { "enabled": true  },
    "contactOnly":     { "enabled": false }
  },
  "sections": [
    { "id": "s1", "type": "hero", "variant": "split", "enabled": true, "order": 0, "content": {}, "settings": {} },
    { "id": "s2", "type": "services", "variant": "grid", "enabled": true, "order": 1, "content": {}, "settings": {} }
  ]
}
```

### Feature toggle semantics

```js
// Resolve the effective payment methods shown at checkout
function resolvePayment(features) {
  if (!features) return ['cash'];
  const methods = [];
  if (features.onlinePayment?.enabled)  methods.push('online');   // Stripe
  if (features.cashPayment?.enabled)     methods.push('cash');      // in-person
  if (methods.length === 0)              methods.push('cash');      // safe default
  return methods;
}

// Validate on save: ordering/booking need at least one payment method
function validateFeatures(features) {
  const needsPayment = (features.onlineOrdering?.enabled && features.onlineOrdering.requiresPayment)
                    || (features.booking?.enabled && features.booking.requiresPayment);
  if (needsPayment) {
    const methods = resolvePayment(features);
    if (methods.length === 0) return { ok: false, error: 'PICK_A_PAYMENT_METHOD' };
  }
  return { ok: true };
}

// Resolve effective ordering/booking display (cash-only is valid)
// - booking.enabled false  → booking panel hidden, hero CTA → "Call to book"
// - onlineOrdering.enabled false → no cart, contact-only site
// - onlinePayment.enabled false + onlineOrdering true → cart shows "Pay in person / cash"
// - features.contactOnly true → shorthand: booking off, ordering off, payment off
```

Token resolution priority: explicit user override → layout default → character default → engine default.

---

## 10. Build plan (phased, publish-flow-safe)

Each phase ends with a working, parity-checked publish. We never break the draft → publish → site.json flow.

### Phase 1 — Foundation (engine + tokens + Atelier)
- Create `src/config/layoutTokens.js` — token schema, accent palette, base modes, type/spacing/radii.
- Create `src/config/layouts.js` — 5 layout definitions with per-level skeletons + section slots.
- Create `src/config/featureFlags.js` — essential-feature toggles (booking, ordering, onlinePayment, cashPayment, contactOnly) + `validateFeatures()` / `resolvePayment()`.
- Create shared renderer spec `src/utils/layoutRenderer.js` — one function per section primitive, variant-aware, tolerant data access. Reads `features` to include/skip booking panel, cart, payment UI.
- Replace `server/rendering/sectionHtml.js` to call the **same** primitives (SSR strings; client uses React wrappers around the same logic). Unknown sections → placeholder, never null.
- Editor Settings panel: feature toggles (booking on/off, ordering on/off, online payment on/off, cash on/off) with live layout recomposition.
- Migrate salon template to Atelier + Refined + Onyx + oxblood. Wire cash-only and booking-off as tested configs.
- Verify: preview === publish byte-equivalent in section order and theming.
- Tests: token resolution, level suggestion, section parity, no-null-section regression, **feature-toggle validation (cash-only, booking-off, ordering-off all render correctly), at-least-one-payment guard**.

### Phase 2 — Bazaar (Approachable character switch)
- Implement Ivory base + Inter display + 6px radii + snappy motion.
- Bazaar skeleton + QuickStart 2-step wizard branch.
- Curated short section list + "open until" countdown.
- Migrate a weekend food stall demo.
- Verify character switch doesn't affect Refined layouts.

### Phase 3 — Craftsman, Counsel, Mercantile
- One layout per pass, each with level variations.
- Migrate remaining niche templates.
- Remove dead `LayoutSelector` import of `templateLayouts.js` (replace with `layouts.js`).

### Phase 4 — Level detection + wizard integration
- `suggestLevel()` + QuickStart level question for Refined layouts.
- Editor: level override in Settings.
- Layout recomposes live on level change.

### Phase 5 — Cleanup + parity enforcement
- Delete `unifiedRenderer.js` and old `sectionHtml.js` paths once shared engine covers all types.
- Add CI parity test: render same `siteData` through preview and publish, assert section order + token values match.
- Update `docs/features/QUICK_REFERENCE_STATUS.md` status.

---

## 11. What this fixes (traceable to findings)

1. **Theme applied** — accent + base mode flow from tokens into both renderers. No more indigo on a purple salon.
2. **Parity** — one engine for preview and publish replaces the divergent `unifiedRenderer.js` / `sectionHtml.js`.
3. **No dropped sections** — every registry type has a primitive; unknown types render a placeholder, never `null`.
4. **Real layouts return** — 5 named layouts replace dead `templateLayouts.js`; `LayoutSelector` becomes functional.
5. **Consistency** — one visual language (Refined) + one approachable variant, four-plus-one skeletons, all niches read as the same premium brand family while pop-ups stay warm and simple.
6. **Scalable composition** — level lets a solopreneur salon and an established salon share a layout without one feeling empty or the other feeling bloated.
7. **Feature flexibility** — booking, online ordering, and online payment are offered to every layout and level but are always opt-out. Cash-only, booking-off, and orders-off are first-class configurations; the layout recomposes without gaps, so a no-frills cash business never looks degraded.