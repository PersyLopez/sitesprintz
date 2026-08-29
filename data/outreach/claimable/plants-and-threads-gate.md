# Gate — Plants & Threads

Neighbor: `true-cuts-barbershop-gate.md`. Do not pitch without this file.

## Found-fact score

34 found facts in intake; 34 placed on live site = **100%** (34/34). Missing phone/email/street/hours/sewing price stay blank.

## Automatic fails

none

## Pre-delivery inspection

| Check | Result |
|---|---|
| Site loads (`/view/plants-and-threads`) | **pass** (local mantest 59; production API 200) |
| Assets (hero + product JPEGs) | **pass** (production hero 200 `image/jpeg`) |
| Street stays private | **pass** (no Walnut / 429) |
| EN / ES switcher | **pass** (mantest 59) |
| Cash hint, no “cash or card” | **pass** (page + checkout) |
| Add plant → pay-on-site checkout | **pass** (mantest 59) |
| Booking widget mount | **pass** (mantest 59 `[data-testid="live-booking-widget"]`) |
| Sewing on the page | **pass** |
| Calendar slot reachable | **pass** (mantest 59: weekday times → customer form; did not submit) |
| Contact form POST | skip — phone and email are Missing; form has nowhere honest to deliver |
| Claim API + claim page | **pass** (production `GET /api/claim/:token` 200, Plants & Threads) |

## URLs (production)

- View: https://sitesprintz.com/view/plants-and-threads
- Claim: https://sitesprintz.com/claim/1e6179cfa92ed0118c6ec09567f9802f1adad911748603c218342dc83e8e1e36

## Pitch (send this, not the score sheet)

We put Plants & Threads on a live SiteSprintz page from your photos, then checked that it actually works before sending this.

Already verified:
- The page loads and the plant photos show
- English and Spanish both work on the same page
- Shop: add a plant and pay on site (please bring cash — we do not take cards)
- Book sewing stays on this site; you can pick a weekday time (price quoted in person)
- Your street is not on the public page

Look: https://sitesprintz.com/view/plants-and-threads
Claim this page (14 days): https://sitesprintz.com/claim/1e6179cfa92ed0118c6ec09567f9802f1adad911748603c218342dc83e8e1e36

We left blank what we did not have: phone, email, public street, a hours grid, and a sewing price.

Growth is $35/month if you will edit, or Growth Managed $75/month if we keep the list updated.

## Operator claim walk (not the customer pitch)

Log in — do not register. Admin accounts cannot claim this site.

- Email: `persylopez99+plantsclaim@gmail.com`
- Password: `ClaimWalk!2026`
- Coupon: `PLANTSWALK` (100% off, one use, bound to that Stripe customer)
- Claim: https://sitesprintz.com/claim/1e6179cfa92ed0118c6ec09567f9802f1adad911748603c218342dc83e8e1e36

On Subscribe, choose Growth or Growth Managed, apply `PLANTSWALK` on Stripe Checkout. Card is not required at $0. Then finish claim.

## Leftover risk

- Widget default hours are Mon–Fri 9–5 (product default). Public Hours still say by appointment — do not invent a salon week on the page.
- Nav currently lists Shop twice.
- Contact form not posted (no phone/email in intake).
