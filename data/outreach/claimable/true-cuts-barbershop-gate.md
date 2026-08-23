# Gate — True Cuts Barbershop

## Found-fact score

29 found facts in intake; 28 placed on live site = **96%** (28/29).

| # | Fact | Status |
|---|------|--------|
| 1–5 | Brand, location name, address, phone, email | placed |
| 6–8 | Hours (Mon–Sun blocks) | placed |
| 9–13 | Team model + David, Freddy, Mike, Jose | placed |
| 14–21 | Eight Squire services (name/price/duration) | placed |
| 22–23 | Walk-ins policy, Rutgers/college ID discount | placed |
| 24 | About line | placed |
| 25–26 | Instagram, Facebook | placed |
| 27–28 | Logo, interior/hero images | placed |
| 29 | Squire rating 4.9 (25 reviews) | **missing** (not surfaced on page) |

## Automatic fails

none

## Functional pass (localhost:5173 + API :3000)

| Check | Result |
|-------|--------|
| Site loads (`/view/true-cuts-barbershop`) | **pass** (HTTP 200; API site payload OK) |
| Assets (hero, interior, logo) | **pass** (HTTP 200) |
| Nav anchors on origin | **pass** (#services #gallery #team #booking #contact) |
| CTAs stay on origin | **pass** (hero `#booking`; booking `provider=native`; no Squire/Booksy URL) |
| Claim API | **pass** (200; businessName + subdomain match) |
| Claim page | **pass** (HTTP 200) |
| Booking widget services API | **pass** (8 services match intake) |
| Calendar slot reachable | **pass** (16 slots on +3d date) |
| Contact form POST | **pass** (201 via `/api/csrf-token` + `/api/submissions/contact`) |
| No cart | **pass** (`allowCheckout: false`) |

## URLs

- View: http://localhost:5173/view/true-cuts-barbershop
- Claim: http://localhost:5173/claim/d9b55b0648bf8805c149be6a7c41e04b043e2c86a702a38beaee04dc54fd80c3

## Leftover risk

- Nav team label still says “Stylists” (template default); section title is “Our Barbers”.
- Widget default staff hours may not match posted shop hours (product limit).
- IG grid looks not harvested; gallery is shop photos only.
- Squire lists 16 services; only 8 verified with prices were seeded.
