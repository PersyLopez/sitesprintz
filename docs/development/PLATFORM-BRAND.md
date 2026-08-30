# Platform brand and host

Visitor-facing product name and public host. Repo, GitHub, and some fixtures may still say SiteSprintz.

**Current (30 Aug 2026):** name **Right Site Light**, host **rightsitelight.com**, support **support@rightsitelight.com**. Live shops use `https://rightsitelight.com/view/:subdomain` (`livePublishedPath`). There is no `{sub}.rightsitelight.com` wildcard.

Do not invent a `brand.js`. Extend the seams below. Last in-repo copy pass: `3abbe267`. Host as platform (not custom-domain): `3352d366`.

---

## Seams to edit (next rename)

| Job | Neighbor |
|-----|----------|
| Marketing name, footer, about, gallery, consent | `src/i18n/marketing/en.js` + `es.js` key `brand.name` (Header / Footer / Landing already use `t('brand.name')`) |
| Live `/view` watermark copy | `src/i18n/liveChrome/en.js` + `es.js` `madeWith` |
| Watermark link | `src/utils/publishedSiteDocument.js` `renderSiteBadge` → `getPublicSiteHost()` |
| Public host + 301 host still loads the SPA | `src/utils/customDomainHost.js` `PLATFORM_ROOTS` + `getPublicSiteHost()`; env `PUBLIC_SITE_HOST` / `VITE_PUBLIC_SITE_HOST` in `.env.example` |
| Live path (not wildcard subdomains) | `src/utils/visitorExperience.js` `livePublishedPath`; share/SEO/QR via `getAbsolutePublishedSiteUrl` / `getPublishedSiteDisplayUrl` in `src/utils/siteWorkspace.js` |
| Support inbox in product copy | `src/config/pricing.config.js` `PLATFORM_SUPPORT_EMAIL` |
| Legal HTML | `server/routes/legal.routes.js` |
| Transactional mail From-name fallback | `server/services/emailService.js` (`FROM_NAME`); root `email-service.js` / `email-service-hybrid.js` / `email-service-smtp.js` |
| Stripe Checkout product titles | `server/config/platformPlans.js` plan `name`s (Dashboard catalog may still be old until synced) |
| Claim links | `server/services/claimTokenService.js` `publicAppOrigin()` (`SITE_URL`) |
| SPA chrome | `index.html` title + og/twitter |
| Legacy static HTML / JSON | `public/*.html`, `public/app.js`, `public/data/homepage.json`, `public/data/site.json` |
| Share / showcase / sitemap | `server/routes/share.routes.js`, `server/services/shareCardService.js`, `server/services/showcaseService.js`, `server/services/seoService.js`, `server/services/showcaseSitemapService.js` |
| Custom-domain empty state | `src/components/published/CustomDomainGate.jsx` |

Hardcoded strings also live in dashboard/share/welcome/register/payment pages. Grep the new name after a pass; do not stop at i18n.

**Tests:** `tests/mantest/01-public-landing-nav.plan.yaml`, `16-legal-docs.plan.yaml`, `56-powered-by-watermark.plan.yaml` (href = `https://<public-host>`), `65-live-view-not-legacy-sites.plan.yaml`. Unit neighbors: Header / Footer / Landing / `seoService` / `shareCardService`.

---

## Leave as-is unless the old host dies

| Keep | Why |
|------|-----|
| Old apex in `PLATFORM_ROOTS` | `sitesprintz.com` 301s here; without it CustomDomainGate shows “Site not connected” on the hop |
| `data-testid="sitesprintz-badge"` and `.ss-sitesprintz-badge` | Selectors / CSS, not visitor copy |
| `gallery@sitesprintz.com` (and other tester emails in `tests/fixtures/test-credentials.js`) | Seeded accounts, not brand |
| GitHub `PersyLopez/sitesprintz` | Repo identity |

Do **not** rotate `claim_token_hash` on a shop that is already claimed. Null the hash instead.

---

## Outside the repo (ops)

Same rename must touch: Cloudflare (apex + `www` + old-host 301), Railway `SITE_URL` / `CLIENT_URL` / `FRONTEND_URL` / `GOOGLE_CALLBACK_URL` / `FROM_EMAIL` / `RESEND_FROM_EMAIL` / optional `FROM_NAME`, Google OAuth redirect URIs, Turnstile hostnames, Resend domain + Cloudflare Email Routing, Stripe webhook URL and live Price/product names, uptime probe host.

---

## Name clearance (not done in this cutover)

Owning the domain is not a trademark or LLC-name clearance. Formation (including Northwest) only checks the **state entity** register. USPTO, common-law, and similar names in other industries are a lawyer’s job before filing **Right Site Light LLC**.
