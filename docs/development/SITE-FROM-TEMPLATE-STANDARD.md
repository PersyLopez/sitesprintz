# Site from template — quality standard

Use this whenever a **live site** is created from a named template (wizard, agent fill, claimable prospect, republish). This is not the guide for **authoring a new template JSON** — that is [`TEMPLATE-CREATION-GUIDE.md`](./TEMPLATE-CREATION-GUIDE.md).

Claimable sites from real sources also follow [`.agent/workflows/claimable_prospect.md`](../../.agent/workflows/claimable_prospect.md). This file is the quality floor for every customer site.

Tiers: trial → Starter ($10) → Growth ($35) → Growth Managed ($75). Gating: `src/config/tiers.js` + `src/utils/planFeatures.js`.

---

## Classify first

| If this is… | Then… |
|-------------|--------|
| A real business (URLs, photos, Acuity, Instagram) | Claimable prospect on **Growth** software. Intake first. Claim = paid Growth $35 DIY or Growth Managed $75 (we set it up and keep it updated). No trial. Do not advertise a waived setup fee. This standard **plus** the claimable workflow. Do not seed Starter/flyer claimables — those are self-serve. |
| An owner filling the wizard | Customer site. Map their answers onto the template. Do not leave gallery leftovers. |
| A gallery / example (`gallery@`) | Demo. Example staff and photos are allowed **only** here. `demoMode` stays off on customer sites. |

Do not invent embeds, iframes, or third-party booking to “finish” the site. If we sell the job on the plan, the live site uses ours.

---

## Two gates before any URL

Both required. Fail either → do not hand `/view/:subdomain` (or a claim link).

### 1. Honest content

- Every **known** fact is on the live site in the correct field (name, city, hours wording, each service/product, prices, photos, policies, social URLs, logo, about).
- **Unknown stays blank.** Missing phone, email, street, hours, or staff is not filled with template defaults.
- **Invented leftovers are an automatic fail:** named template people (Sarah / Alex / Maya, etc.), niche `defaultHours`, fake bios, Unsplash or other stock photography on a customer site, a city the business is not in. Labeled first-party sample inserts (“Use your business photo here” over a generic picture, like a store frame) are allowed; they are not stock photos of someone else’s shop.

Claimable content score = (found facts correctly on the site) / (found facts in the intake). Target **≥ 0.90**, prefer **≥ 0.95**. Missing-from-source does not lower the score.

### 2. Fully functional for the plan

Every feature this site’s **plan** is supposed to have works on `/view/:subdomain` (and inner pages). Plug-and-play fill does not skip this.

| Plan | Must actually work |
|------|-------------------|
| Trial / Starter | Identity, hours/location/social when known, contact form or click-to-call/email, images load, nav hits real sections |
| Growth | Everything in Starter, plus native booking **or** cart/checkout as the niche requires — on our origin, not theirs |

Automatic functional fails: widget missing/empty/error, broken images, dead contact, `/view` stuck loading, Book/Shop leaving this origin for a job the plan includes, demo banner on a customer site.

---

## Fill the template — do not fight it

1. Pick the **named** template for the niche and plan. Targeted claimables are **Growth** software only (Starter flyers are self-serve). Claim hosting is Growth $35 or Growth Managed $75.
2. Map every known fact onto an **existing** field (`public/data/section-registry.json` + that template’s JSON). Do not add a one-off section type to finish one site.
3. Rebuild **nav** to the sections that remain. Remove hrefs to stripped sections.
4. Strip every gallery leftover that is not a found fact.
5. Keep `sections[]` and renderer in sync with the registry. Preview and publish must show the same `site.json`.

---

## Page chrome (conversion floor)

On phone and desktop, a finished site must be findable and callable:

- **Header:** business name; Call (`tel:`) when a phone is known; primary CTA that matches the plan (Contact on Starter, Book/Shop on Growth).
- **Hero:** real headline; hours and address **when known** (do not invent); one primary action.
- **Services / menu / products:** real names, prices as numbers, descriptions from the source. A found service with a source photo must have that photo on the live site.
- **Hours + location + social:** in the skeleton (footer / NAP), not only in Foundation settings.
- **Footer:** NAP that matches the header; no empty “lorem” or 2025 copyright leftovers.
- **Growth:** booking or cart is ours. Starter: offline CTA (`tel:` / `mailto:` / contact form), not a fake checkout.

Do not use Unsplash or generic stock photography on customer/claimable sites. Gallery demos may. Empty image fields render a first-party sample insert with a replace label (picture-frame analog) — not a fake photo of someone else’s shop.

---

## Visual and accessibility floor

- Body text contrast ≥ 4.5:1 on the actual background (not the Figma token).
- Images: explicit dimensions or aspect-ratio, lazy except the hero (hero is LCP).
- Focus states visible; primary actions keyboard reachable.
- 375px: header CTA stays usable; no overlapping type; tap targets for Call and Book.

---

## Claimable: inspect, then pitch

Filling the template is the job. **Pitching is the inspection.** Like an oil change that also checks the lights: do not send `/view` or `/claim` because the page looks finished.

Write `data/outreach/claimable/{slug}-gate.md` (neighbor `true-cuts-barbershop-gate.md`) with every **enabled** Growth feature exercised on the live origin. Neighbor `tests/mantest/{n}-{slug}-claimable.plan.yaml` and run it green. Skip a row only when that feature is honestly off (no goods → no cart).

Always: site loads, photos 200, nav/CTAs stay on this origin, claim token names this business. Then booking widget + a reachable slot if booking is on; add-to-cart + the real pay path if they sell goods; contact form POST if they have a destination; EN/ES if bilingual.

The **pitch** (email/text) is that list in customer language — what we already verified — plus view URL, 14-day claim URL, and honest Missing. Do not paste scores, waived setup fees, or a trial. Claim page copy matches: the site was prepared and already checked.

---

## Done checklist

- [ ] Classified (claimable / customer / gallery)
- [ ] Known facts mapped; unknowns blank; leftovers stripped
- [ ] Nav rebuilt; no dead section links
- [ ] Plan features work on `/view/:subdomain` (and menu/service URLs if the layout has pages)
- [ ] No demo banner, no `gallery@` owner, no `_demo: true` on a customer site
- [ ] Hours, location, social present when known
- [ ] Claimable only: intake ledger, score ≥ 90%, 14-day `/claim/:token`, admin-owned
- [ ] Claimable only: `{slug}-gate.md` pre-delivery inspection (every enabled feature) **and** a pitch that names what we checked

Hand off: live URL, Missing, (claimable) score + claim link + inspection + customer pitch. Do not pitch a site that only “looks done.”
