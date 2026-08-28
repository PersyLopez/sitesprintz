# Frontend Documentation

**Last Updated:** 15 Aug 2026

The SiteSprintz frontend is a React 19 single-page application built with Vite 7. Styling is plain CSS: a component-scoped stylesheet per file plus global design tokens. Tailwind is not installed or used.

---

## Table of Contents

1. [Stack and Architecture](#stack-and-architecture)
2. [Project Structure](#project-structure)
3. [Routing](#routing)
4. [State Management](#state-management)
5. [Theme System](#theme-system)
6. [Setup and Publish UX](#setup-and-publish-ux)
7. [Tier Gating](#tier-gating)
8. [Component Inventory](#component-inventory)
9. [Pages](#pages)
10. [Hooks](#hooks)
11. [Services](#services)
12. [Styling](#styling)
13. [Build and Development](#build-and-development)

---

## Stack and Architecture

- **React 19.2** with functional components and hooks.
- **React Router DOM 7.9** for client-side routing.
- **Vite 7.2** for dev server, HMR, and production builds.
- **Chart.js / react-chartjs-2** for analytics charts.
- **Custom CSS** for all styling. No Tailwind CSS, no CSS-in-JS library.
- **Vitest** for unit/integration tests, **Playwright** for E2E tests.

The app is wrapped in context providers for auth, toasts, site editing, cart, tips, and staff state. Code splitting is done with React.lazy and Suspense, with `Landing`, `Login`, `About`, and `Contact` loaded eagerly.

---

## Project Structure

```
src/
├── App.jsx                      # Root routing and providers
├── components/
│   ├── admin/                   # Admin dashboard sub-components
│   ├── admin/template-editor/   # Template editor (new, untracked)
│   ├── analytics/               # StatsCard, SiteAnalyticsTable
│   ├── auth/                    # ProtectedRoute, AdminRoute, PasswordStrengthMeter
│   ├── booking/                 # Booking widget, staff/schedule/fee settings
│   ├── common/                  # ErrorBoundary, FeatureGate, OnboardingTour,
│   │                            # FAQWidget, ProgressBar, SkeletonLoader, etc.
│   ├── dashboard/               # SiteCard, WelcomeModal, TrialBanner,
│   │                            # CustomDomainSettings, FoundationSettings
│   ├── ecommerce/               # ShoppingCart, CheckoutButton, PayOnSiteCheckout
│   ├── forms/                   # NicheFieldRenderer, ServiceRequestForm
│   ├── landing/                 # Landing page sections (HeroStoryVideo, LandingGallery)
│   ├── layout/                  # Header, Footer, PublicPageLayout
│   ├── products/                # Product management modals
│   ├── setup/                   # Setup/editor components (see below)
│   └── tracking/                # Tracking widgets (new, untracked)
├── config/                      # Tiers, themes, layouts, section registry, feature flags
├── context/                     # Auth, Toast, Site, Cart, Tips, Staff providers
├── hooks/                       # useAuth, useToast, useSite, usePlan, useCart,
│                                # useKeyboardShortcuts, usePolling, useTips
├── pages/                       # Route-level page components
├── services/                    # API clients
├── styles/                      # global.css, story-public.css, published-site-viewer.css
├── utils/                       # Layout renderer, section normalizer/bridge,
│                                # wizard site builder, plan features, template features
└── __tests__/                   # Unit and integration tests
```

---

## Routing

### Public routes

```
/                          Landing page
/about                     About page
/contact                   Contact page
/login                     Login
/register                  Registration
/verify-email              Email verification
/forgot-password           Password reset request
/reset-password            Password reset form
/oauth/callback            Google OAuth callback
/showcase                  Public showcase gallery
/showcase/:subdomain       Showcase detail page
/view/:subdomain           Live published site viewer
/sites/:subdomain          Alias for live published site viewer
/payment-success           Stripe payment success
/payment-cancel            Stripe payment cancellation
/booking/user/:userId      Public booking page
/booking/appointment/:code Appointment detail
/track                     Order/appointment lookup
/track/order/:token        Order tracking detail
/track/appointment/:code   Appointment tracking detail
/staff/accept/:token       Staff invitation acceptance
```

### Protected routes (require authentication)

```
/dashboard                 Account-level site list
/dashboard/sites/:siteId   Per-site workspace with nested tabs:
  /                        Site overview
  /orders                  Order management
  /appointments            Booking dashboard
  /products                Product management
  /settings                Site settings
  /analytics               Site analytics
/setup                     Site setup/editor
/orders                    Order management (legacy top-level)
/analytics                 Analytics overview
/analytics/:subdomain      Per-site analytics
/settings/*                Account settings (payments, billing, foundation, domain)
/products                  Product management
/booking-dashboard         Booking management
/staff/dashboard           Staff dashboard
/staff/appointments/:tenantId
/staff/schedule/:tenantId
/staff/orders/:tenantId
```

### Admin routes (require admin role)

```
/admin                     Admin dashboard
/admin/analytics           Platform analytics
/admin/users               User management
/admin/sites               Site management
/admin/pricing             Pricing management
/admin/plan-features       Plan feature configuration
/admin/templates           Template list
/admin/templates/:templateId Template editor
```

---

## State Management

Global state is handled through React Context providers:

- `AuthContext` — user, JWT token, auth status, login/logout/register.
- `SiteContext` — active draft/site data, undo/redo, save draft, publish.
- `CartContext` — shopping cart items, add/remove, clear.
- `ToastContext` — success/error/info/warning toast notifications.
- `TipsContext` — contextual help tips.
- `StaffContext` — staff scheduling and booking state.
- `SiteWorkspaceContext` — per-site dashboard workspace state.

Custom hooks expose each context: `useAuth`, `useSite`, `useCart`, `useToast`, `usePlan`, `useTips`, `usePolling`, `useKeyboardShortcuts`.

---

## Theme System

There are two distinct visual themes:

### Ocean Blue (authenticated app)

Used by default across the app: dashboard, setup, admin, settings, and internal flows. Defined in `src/styles/global.css`.

- Dark navy background (`#030712`) with subtle blue ambient glow.
- Primary royal blue (`#3b82f6`) with indigo accent (`#6366f1`).
- Component-scoped CSS files import `global.css` and use CSS custom properties for spacing, radius, color, and shadow tokens.

### Story Public (marketing and auth surfaces)

Used by `Landing`, `About`, `Contact`, `Login`, `Register`, `ForgotPassword`, and public pages. Scoped via the `.story-public` or `.public-page` class. Defined in `src/styles/story-public.css`.

- Warm cream background (`#fff8ef`), warm ink text (`#1c140f`).
- Orange accent (`#e87b1e`) with rounded, friendly buttons.
- Header, footer, buttons, and navigation links are re-themed when inside a `.story-public` or `.public-page` container.

Auth pages (`Login`, `Register`) render the `Header` but intentionally omit the `Footer` to keep the form focused. `ForgotPassword` currently includes `Footer`; this is inconsistent.

---

## Setup and Publish UX

The setup flow was rebuilt around two entry paths and a new layout engine.

### Entry choice

`Setup.jsx` first asks whether the user is building a pop-up/temporary site or a permanent business site:

- **Bazaar** path — `BazaarWizard` for yard sales, food stalls, bake sales, pop-up shops, etc.
- **Business** path — `QuickStartWizard` for permanent businesses.

Both paths produce a complete `siteData` object and load it into the editor.

### QuickStart Wizard

`QuickStartWizard` walks through four steps:

1. Industry selection (restaurant, salon, gym, consultant, etc.).
2. Business essentials (name, phone, email).
3. Business size via `LevelSelector` (`solo`, `studio`, `established`).
4. Curated theme selection via `src/config/siteThemes.js`.

For known niches, the wizard delegates to `wizardSiteDataBuilder.js` and the new layout engine. For unknown niches, it falls back to the legacy `templatesService` flow.

### Layout engine

- `src/config/layouts.js` defines five layouts: `atelier`, `craftsman`, `counsel`, `mercantile`, and `bazaar`. Each layout specifies required sections, optional sections, per-level composition, and default features.
- `src/config/sectionRegistry.js` is the canonical section list. Each section declares a type, category, icon, required tier, and whether it is removable/repeatable. The public mirror lives at `public/data/section-registry.json`.
- `src/utils/layoutRenderer.js` composes a page from a layout + level + site data.
- `src/utils/sectionHtmlBridge.js` renders a composed section to HTML using the active theme tokens.
- `src/utils/unifiedRenderer.js` and `src/utils/publishedSiteDocument.js` handle preview and published output.

### Editor

- After a template is selected, Setup hides the template column until Change template. The workspace is `PageBuilder` (section list, drag or Alt+Arrow reorder, hide/remove) plus one live `PreviewFrame` iframe. Preview writes are debounced while typing; template load flushes immediately and the loading overlay does not cover later updates.
- `EditorPanel` still exists for those form tabs but is not mounted on `/setup`.
- `SectionEditors.jsx` exports specialized editors for `native-booking`, `checkout`, `reviews`, and premium modules (calculator, class scheduler, quiz, etc.).
- `PreviewFrame` writes composed HTML into a full-column iframe. It falls back to legacy inline HTML if the layout engine fails.
- `PublishModal` handles the final publish step.

Keyboard shortcuts in `Setup.jsx`: `Cmd/Ctrl+S` saves the draft, `Cmd/Ctrl+P` opens preview, `Cmd/Ctrl+Shift+P` triggers publish.

---

## Tier Gating

The canonical tier model is defined in `src/config/tiers.js`:

- `trial` (free trial)
- `starter`
- `growth`

Legacy aliases (`free`, `pro`, `premium`, `business`, `enterprise`, `checkout`) are normalized to `trial` or `growth`. `src/utils/planFeatures.js` exposes `hasFeature`, `getRequiredPlan`, `PLAN_FEATURES`, and `PLAN_INFO` for UI gating.

The `FeatureGate` component in `src/components/common/FeatureGate.jsx` conditionally renders content or an upgrade prompt based on the user's plan and the feature key. `PageBuilder` uses the same logic to show available vs. locked sections.

`AdminPlanFeatures.jsx` uses software plans `trial` / `starter` / `growth` (`TIER_HIERARCHY` minus `growth_managed`). Growth Managed uses the same features as Growth. Legacy `pro` / `premium` aliases are handled by `normalizeTier` elsewhere, not as separate admin columns.

---

## Component Inventory

### Setup/editor

- `BazaarWizard` — two-step pop-up wizard.
- `QuickStartWizard` — four-step permanent business wizard.
- `CustomTemplateBuilder` — layout, color, and content picker for custom sites.
- `LevelSelector` — solo/studio/established selector with niche-aware layout preview.
- `PageBuilder` — section list, add/reorder/hide/remove, inspector forms.
- `SectionEditors` — registry of section-specific editors.
- `EditorPanel` — form tabs (not mounted on `/setup`).
- `PreviewFrame` — full-column iframe preview.
- `PublishModal` — publish confirmation and configuration.
- `TemplateGrid` — template selection grid.
- `ThemePicker`, `BusinessInfoForm`, `ServicesProductsEditor`, `ContactBookingForm`, `ProductsEditor`, `ImageUploader`.

### Common

- `ErrorBoundary` — global and local error boundary with recovery UI.
- `FeatureGate` — tier-based conditional rendering and upgrade prompts.
- `OnboardingTour` — guided first-run tour.
- `FAQWidget` — help and FAQ panel.
- `ProgressBar`, `ProgressIndicator`, `SkeletonLoader`, `LoadingFallback`, `SaveIndicator`.
- `ContextualTip`, `FeedbackWidget`, `HelpPanel`, `FieldValidation`, `Modal`.

### Dashboard

- `SiteCard` — site summary with actions.
- `WelcomeModal`, `TrialBanner`.
- `StripeConnectSection`, `FoundationSettings`, `CustomDomainSettings`.
- `SiteOverview`, `SiteSettingsPanel`.

### Layout

- `Header` — responsive top navigation with mobile menu and auth-aware links.
- `Footer` — public footer with product/company/account links.
- `PublicPageLayout` — wrapper for public marketing pages.

---

## Pages

- `Landing` — story-driven marketing page with gallery and pricing.
- `About`, `Contact` — public content pages.
- `Login`, `Register`, `ForgotPassword`, `ResetPassword`, `VerifyEmail` — auth pages.
- `Dashboard` — account-level site list.
- `SiteDashboard` — per-site workspace with nested routes.
- `Setup` — site creation and editor.
- `Orders`, `Analytics`, `SiteAnalytics`, `Products` — management pages.
- `BookingDashboard`, `BookingPage`, `AppointmentPage` — booking pages.
- `Settings` — account settings with payments, billing, foundation, and custom domain tabs.
- `PublishedSiteViewer` — live `/view/:subdomain` and `/sites/:subdomain` renderer.
- `ShowcaseGallery`, `ShowcaseDetail` — public showcase.
- `TrackLookup`, `TrackOrder`, `TrackAppointment` — customer tracking pages.
- `StaffDashboard`, `StaffAppointments`, `StaffSchedule`, `StaffOrders` — staff flows.
- `Admin`, `AdminUsers`, `AdminSites`, `AdminTemplates`, `AdminPlanFeatures`, `PricingManagement` — admin pages.

---

## Hooks

- `useAuth` — auth state and actions.
- `useSite` — site draft state, undo/redo, update helpers.
- `usePlan` — current plan, tier helpers, `isGrowth`, `canAccess`.
- `useCart` — cart operations.
- `useToast` — toast notifications.
- `useTips` — contextual tips.
- `usePolling` — polling for async state.
- `useKeyboardShortcuts` — declarative keyboard shortcuts.

---

## Services

- `api.js` — base HTTP client with token injection, CSRF, retry, and 401 handling.
- `auth.js` — login, register, forgot/reset password, email verification.
- `sites.js` — fetch, create, update, delete, publish sites.
- `templates.js` — template catalog and detail.
- `publishService.js` — publish-specific helpers.
- `adminSectionsService.js` — admin section/registry API helpers.
- `pollingService.js` — generic polling utility.

---

## Styling

- `src/styles/global.css` — Ocean Blue tokens, base typography, buttons, forms, cards, badges, empty states, and utility classes.
- `src/styles/story-public.css` — Story Public theme overrides scoped to `.story-public` and `.public-page`.
- `src/styles/published-site-viewer.css` — live published site chrome.
- Component files pair `Component.jsx` with `Component.css` and use BEM-like class names.
- CSS custom properties are used for spacing, colors, radius, shadows, transitions, and z-index.

No Tailwind CSS is present in dependencies or source code.

---

## Build and Development

```bash
npm run dev          # Vite dev server (frontend only)
npm run dev:backend  # Express server (backend only)
npm run dev:all      # Both frontend and backend concurrently
npm run build        # Production Vite build
npm run preview      # Preview production build locally
npm test             # Vitest unit/integration tests
npm run test:e2e     # Playwright E2E tests
npm run lint         # ESLint
```

Build output is written to `dist/`. The backend serves the API from `server/`. Environment variables are loaded from `.env` based on `.env.example`; do not commit secrets.

---

## Related Documentation

- `docs/ARCHITECTURE.md` — system architecture overview.
- `docs/ecommerce/README.md` — e-commerce flows and gating.
- `docs/features/QUICK_REFERENCE_STATUS.md` — feature status matrix.
- `docs/development/JS-STANDARDS.md` — JavaScript and React conventions.
- `docs/verification/SITE_CREATION_PROCESS_VERIFICATION.md` — site creation verification.
