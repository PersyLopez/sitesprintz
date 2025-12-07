# Final Regression & Stabilization

## Goal Description
Conduct a comprehensive regression test suite to verify the stability of all core modules (Auth, Site Lifecycle, Booking, Checkout, Pro Features) and address any remaining flakes or failures before release.

## User Review Required
None.

## Proposed Changes

### Test Config & Stability
- Refactor `admin-flow.spec.js` to verify site management via User Details modal (since global `/admin/sites` does not exist).
- Ensure all E2E tests pass reliably in a clean environment.

## Phase 3: Visual Polish & "Premium" Feel
The current template is functional but "safe" (Plain). We will upgrade the visual language to be more modern and "Premium".

### 1. Visual Language Upgrade
- [x] **Typography**: Increase contrast. Use `Clamp()` for fluid typography.
- [x] **Micro-interactions**: Add specific hover states (lift, glow, scale) to cards and buttons.
- [x] **Scroll Animations**: Implement a lightweight `IntersectionObserver` script for "fade-in-up" elements.

### 2. Layout Diversity
- [x] **Hero**: Move from always-centered to supporting "Split" (Text Left / Image Right) layouts via CSS classes.
- [x] **Grid**: Add "Masonry" or "Highlight" variants where the first item spans 2 columns.

### 3. "Premium" Theme Var Sets
- [x] Create 3 distinct premium presets in `site.json` examples:
    - **Midnight Luxury**: Deep blacks, gold accents, serif fonts. (`consultant-pro.json`)
    - **Neon Tech**: Dark mode, vibrant gradients, glassmorphism. (`starter.json`)
    - **Clean Scandinavian**: Off-white, distinct borders, ample whitespace.

## Verification Plan
### Core Regression Suite
- [x] Auth Flow (`auth-flow.spec.js`)
- [x] Site Lifecycle (`site-creation.spec.js`, `site-management.spec.js`)
- [x] Booking System (`booking-flow.spec.js`)
- [x] E-commerce (`checkout-flow.spec.js`)
- [x] Pro Features (`pro-features.spec.js`, `admin-analytics.spec.js`)
- [x] Admin Dashboard (`admin-flow.spec.js`)
