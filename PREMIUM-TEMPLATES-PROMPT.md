# Premium Templates Implementation Brief

## Project Context

You are working on an existing website builder platform that allows users to create single-page business websites. The platform currently has **Starter-tier templates** (basic display) and **Checkout-tier templates** (with payment processing). Your task is to implement **Premium-tier templates** for established businesses in high-value verticals that require advanced conversion features.

### Current Technical Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js with Express
- **Storage**: JSON files for site data
- **Payments**: Stripe integration (already implemented for Checkout tier)
- **Email**: Resend API for transactional emails
- **File Structure**: 
  - Templates defined in `/public/data/templates/*.json`
  - Template registry in `/public/data/templates/index.json`
  - User sites generated to `/public/sites/[site-slug]/`
  - Main app logic in `/public/app.js`

### Existing Template Structure Example
Each template JSON contains:
```json
{
  "id": "template-name",
  "name": "Display Name",
  "meta": {
    "businessName": "Example Business",
    "tagline": "Your tagline here"
  },
  "sections": [
    {
      "id": "hero",
      "type": "hero",
      "settings": { /* section-specific config */ }
    }
  ],
  "styles": {
    "primaryColor": "#2563eb",
    "accentColor": "#dc2626"
  }
}
```

---

## Mission: Create 4 Premium-Tier Templates

Implement production-ready premium templates for these high-value verticals:

1. **Home Services & Trades** (HVAC, Plumbing, Electrical, Roofing, General Contractor)
2. **Medical & Healthcare** (Dentist, Chiropractor, Physical Therapy, Med Spa, Veterinary)
3. **Legal Services** (Personal Injury, Family Law, Estate Planning, Business Law)
4. **Real Estate** (Residential Agent, Commercial Broker, Property Management)

---

## Template 1: Home Services & Trades Premium

### ID: `home-services-premium`
### Category: Home Services
### Target Verticals: HVAC, Plumbing, Electrical, Roofing, Contractors

### Required Sections (in order):

#### 1. **Hero Section** - `emergency-hero`
```
MUST INCLUDE:
- Large headline with service area emphasis
- Emergency availability badge (e.g., "24/7 Emergency Service Available")
- Dual CTAs: "Get Free Quote" (primary) + "Call Now" (secondary with large phone)
- Trust indicators row: "Licensed & Insured • 25+ Years • A+ BBB Rating • 500+ Reviews"
- Background: High-quality trade photo or subtle gradient
```

#### 2. **Services Grid** - `services-advanced`
```
MUST INCLUDE:
- 6-8 primary services with icons
- Each service card shows: icon, name, 2-line description, "Learn More" link
- Hover effects with subtle elevation
- Optional emergency service badge on specific cards
- "View All Services" CTA at bottom
```

#### 3. **Multi-Step Quote Form** - `quote-form-wizard`
```
MUST INCLUDE:
- Step 1: Service type selection (radio buttons with icons)
- Step 2: Project details (textarea + optional file upload for photos)
- Step 3: Contact info (name, phone, email, address/zip)
- Step 4: Preferred contact method & urgency level
- Progress indicator (1 of 4, 2 of 4, etc.)
- "Previous" and "Next" buttons, final "Submit Quote Request"
- Success message: "Quote request received! We'll contact you within 2 hours."
- NOTE: Form submits to existing /api/contact-form endpoint with type: "quote"
```

#### 4. **Before/After Gallery** - `before-after-showcase`
```
MUST INCLUDE:
- 3-6 before/after image pairs
- Interactive slider UI (drag handle to reveal before/after)
- Each project shows: title, service type tag, brief description
- Filter buttons: "All Projects", "Residential", "Commercial", "Emergency"
- Lightbox modal on click for full-size view
- CTA: "See Your Project Here - Get Started"
```

#### 5. **Trust Signals** - `credentials-showcase`
```
MUST INCLUDE:
- License & certifications grid (visual badges)
- Insurance coverage callout (General Liability, Workers Comp, Bonding)
- Manufacturer certifications (e.g., Carrier, Trane, Kohler logos)
- Financing options: "Flexible Payment Plans Available" with partner logos
- Warranty information: "All Work Guaranteed - Up to 10-Year Warranties"
- Emergency service badge: "Fast Response - Usually Within 2 Hours"
```

#### 6. **Testimonials Carousel** - `testimonials-advanced`
```
MUST INCLUDE:
- Rotating carousel (auto-advance every 6 seconds)
- Each testimonial shows: 5-star rating, quote text, customer name, location, service type
- 6-8 testimonials minimum
- Integration callout: "Verified Reviews from Google" or "Real Reviews from Yelp"
- CTA: "Read More Reviews on Google"
```

#### 7. **Service Area Map** - `coverage-map`
```
MUST INCLUDE:
- Visual representation of service area (can be text-based list or stylized map graphic)
- "Enter Your Zip Code" lookup field (validates and shows "Yes, we serve your area!" or coverage info)
- List of primary cities/neighborhoods served
- Coverage radius display (e.g., "Serving a 50-mile radius")
- "Not sure if we serve you? Call us!" CTA
```

#### 8. **FAQ Accordion** - `faq-section`
```
MUST INCLUDE:
- 8-10 common questions specific to trades:
  * "Are you licensed and insured?"
  * "Do you offer emergency services?"
  * "What's your warranty policy?"
  * "Do you offer financing?"
  * "How quickly can you respond?"
  * "Do you provide free estimates?"
  * etc.
- Expand/collapse functionality
- Clean, readable design
```

#### 9. **Final CTA Section** - `cta-conversion`
```
MUST INCLUDE:
- Attention-grabbing headline: "Ready to Get Started?"
- Subheading with value prop: "Join 500+ satisfied customers in [City]"
- Dual CTAs: "Schedule Free Estimate" + "Call Now: (555) 123-4567"
- Trust reinforcement: badges row (Licensed, Insured, Satisfaction Guaranteed)
- Background: Brand color with subtle pattern or contrast section
```

#### 10. **Footer** - `footer-comprehensive`
```
MUST INCLUDE:
- Company info column (logo, tagline, license #)
- Quick links column (Services, About, Reviews, Contact)
- Contact column (phone with tel: link, email, address)
- Hours of operation
- Social media icons (Facebook, Instagram, LinkedIn, YouTube)
- Trust badges row (BBB, Angie's List, HomeAdvisor, etc.)
- Copyright and basic legal links
```

### Color Scheme
- Primary: Professional blue (#1e40af)
- Accent: Safety orange (#f97316)
- Trust: Green (#059669)
- Emergency: Red (#dc2626)

### Key Features Summary
- ✅ Emergency service emphasis throughout
- ✅ Multi-step quote form with file upload capability
- ✅ Before/after project showcase
- ✅ Credentials and trust signals
- ✅ Service area coverage validation
- ✅ Mobile-responsive with sticky call button
- ✅ Multiple conversion paths (form, phone, chat)

---

## Template 2: Medical & Healthcare Premium

### ID: `medical-premium`
### Category: Healthcare
### Target Verticals: Dentist, Chiropractor, Physical Therapy, Med Spa, Veterinary

### Required Sections (in order):

#### 1. **Hero Section** - `healthcare-hero`
```
MUST INCLUDE:
- Welcoming headline focused on patient care
- Trust emphasis: "Accepting New Patients" badge
- Primary CTA: "Book Appointment" + Secondary: "Call Office"
- Trust indicators: "Board Certified • Insurance Accepted • Evening Hours Available"
- Clean, professional medical imagery or calming colors
- HIPAA compliance notice in footer area
```

#### 2. **Services Grid** - `medical-services`
```
MUST INCLUDE:
- 6-10 medical services/treatments with medical icons
- Each card: service name, brief description, typical duration, "Learn More"
- Organized by category if applicable (Preventive, Cosmetic, Urgent, etc.)
- Visual hierarchy with primary services highlighted
- "See All Services" CTA
```

#### 3. **Appointment Booking Section** - `booking-advanced`
```
MUST INCLUDE:
- Prominent "Schedule Your Appointment" heading
- Appointment type selector (New Patient, Follow-up, Consultation, Emergency)
- Calendar widget showing available dates (visual representation - can be stylized)
- Time slot selector (Morning, Afternoon, Evening)
- Patient info form: Name, DOB, Phone, Email, Insurance Provider
- Preferred provider selection (if multi-provider practice)
- Reason for visit (textarea)
- New patient checkbox: "This is my first visit"
- Success message: "Appointment request received! Our team will confirm within 1 hour."
- Note: Submits to /api/appointment-request with type: "medical-appointment"
```

#### 4. **Provider Profiles** - `team-showcase`
```
MUST INCLUDE:
- 1-4 provider profiles with professional headshots
- Each profile shows:
  * Professional photo (placeholder provided)
  * Name with credentials (Dr., DDS, DVM, PT, etc.)
  * Specialty or focus areas
  * Education (2-3 institutions)
  * Board certifications
  * Years of experience
  * "Book with Dr. [Name]" button
  * Personal statement or philosophy (2-3 sentences)
- Clean, trust-building design
```

#### 5. **Insurance & Payment** - `insurance-accepted`
```
MUST INCLUDE:
- "Insurance Plans Accepted" heading
- Grid of 12-16 insurance logos (Blue Cross, Aetna, United, Cigna, etc.)
- "We accept most major insurance plans" statement
- Payment options: Cash, Credit/Debit, CareCredit, Payment Plans
- "No Insurance? We offer affordable self-pay rates" callout
- "Verify Your Coverage" CTA button
```

#### 6. **Patient Testimonials** - `testimonials-medical`
```
MUST INCLUDE:
- 6-8 patient testimonials with 5-star ratings
- Each includes: rating stars, quote, patient first name + last initial, service received
- Optional: verification badge "Verified Patient"
- Carousel or grid layout
- CTA: "Read More on Healthgrades" or similar
- HIPAA-compliant disclaimer: "Patient consent obtained for all testimonials"
```

#### 7. **What to Expect** - `patient-journey`
```
MUST INCLUDE:
- "Your First Visit" or "What to Expect" heading
- 4-step visual process:
  * Step 1: "Schedule Appointment" - Online or by phone
  * Step 2: "Complete Forms" - Bring insurance card & ID
  * Step 3: "Meet Your Provider" - Comprehensive evaluation
  * Step 4: "Treatment Plan" - Personalized care approach
- Downloadable new patient forms link
- "Questions? Call us at [phone]" support CTA
```

#### 8. **FAQ Accordion** - `faq-medical`
```
MUST INCLUDE:
- 8-12 healthcare-specific questions:
  * "Do you accept my insurance?"
  * "What should I bring to my first visit?"
  * "Do you offer emergency appointments?"
  * "What are your office hours?"
  * "Do you offer telemedicine visits?"
  * "What is your cancellation policy?"
  * "Are you accepting new patients?"
  * "Do you provide payment plans?"
  * etc.
- Expand/collapse accordion
- Professional, reassuring tone
```

#### 9. **Office Information** - `location-hours`
```
MUST INCLUDE:
- Office location with embedded map representation (can be static image or styled element)
- Full address with directions link
- Office hours by day
- Phone number (large, prominent, clickable)
- Parking information
- Accessibility information
- "We're here to help" messaging
```

#### 10. **Final CTA** - `cta-appointment`
```
MUST INCLUDE:
- "Ready to Take the Next Step?" heading
- "New patients welcome - most insurance accepted" subheading
- Primary CTA: "Schedule Appointment"
- Secondary: "Call Us: (555) 123-4567"
- Trust reinforcement: Board certified, accepting insurance, evening hours
- Calming background color
```

#### 11. **Footer** - `footer-medical`
```
MUST INCLUDE:
- Practice name and credentials
- Quick links (Services, About, New Patients, Contact, Patient Portal)
- Contact info (phone, fax, email, address)
- Office hours summary
- Social media links
- Compliance links: HIPAA Privacy Policy, Notice of Privacy Practices, Accessibility
- Professional affiliations (ADA, AMA, state medical boards, etc.)
- Copyright
```

### Color Scheme
- Primary: Medical blue (#0369a1) or calming teal (#0891b2)
- Accent: Trust green (#059669)
- Neutral: Soft grays for professionalism
- Avoid: Harsh reds or alarming colors

### Key Features Summary
- ✅ Appointment booking emphasis
- ✅ Provider credentials and profiles
- ✅ Insurance acceptance clarity
- ✅ Patient journey explanation
- ✅ HIPAA compliance messaging
- ✅ New patient onboarding focus
- ✅ Professional, trustworthy design

---

## Template 3: Legal Services Premium

### ID: `legal-premium`
### Category: Legal
### Target Verticals: Personal Injury, Family Law, Estate Planning, Business Law

### Required Sections (in order):

#### 1. **Hero Section** - `legal-hero`
```
MUST INCLUDE:
- Authority-building headline: "Experienced Legal Representation You Can Trust"
- Subheading with specialization: "Protecting Your Rights for 25+ Years"
- Trust badges row: "No Fee Unless We Win • Free Consultation • 24/7 Availability"
- Dual CTAs: "Free Case Evaluation" (primary) + "Call Now" (secondary)
- Professional imagery: justice scales, law books, or confident attorney photo
- Case results ticker: "$2.5M+ Recovered for Clients" or similar
```

#### 2. **Practice Areas** - `practice-areas-grid`
```
MUST INCLUDE:
- 6-10 primary practice areas with legal icons
- Each card shows:
  * Icon (scales, gavel, documents, etc.)
  * Practice area name
  * 2-3 sentence description
  * Key services bullet list (2-4 items)
  * "Learn More" link
- Examples: Personal Injury, Family Law, Criminal Defense, Estate Planning, 
  Business Law, Real Estate, Immigration, Workers' Comp
- Professional color scheme
```

#### 3. **Free Consultation Form** - `case-evaluation-form`
```
MUST INCLUDE:
- Prominent heading: "Free, Confidential Case Evaluation"
- Subheading: "No obligation. We'll review your case and explain your options."
- Form fields:
  * Full Name
  * Phone Number
  * Email
  * Case Type (dropdown: Personal Injury, Family Law, Criminal, Estate, Business, Other)
  * Brief Case Description (textarea with character limit)
  * Preferred Contact Method (Phone, Email, Text)
  * Best Time to Reach You
  * "Is this urgent?" checkbox
- Confidentiality notice: "Attorney-client privilege applies from first contact"
- Privacy assurance: "Your information is confidential and will not be shared"
- Submit button: "Request Free Consultation"
- Success message: "Thank you. An attorney will review your case within 24 hours."
- Note: Submits to /api/contact-form with type: "legal-consultation"
```

#### 4. **Case Results** - `results-showcase`
```
MUST INCLUDE:
- "Proven Results" or "Case Victories" heading
- 6-10 notable case results (anonymized for confidentiality)
- Each result shows:
  * Case type icon/tag
  * Result amount or outcome (e.g., "$750,000 Settlement - Car Accident")
  * Brief description (1-2 sentences, no identifying info)
  * Year/timeframe if relevant
- Disclaimer: "Past results do not guarantee future outcomes"
- Grid or timeline layout
- "See More Results" CTA
```

#### 5. **Attorney Profiles** - `attorney-team`
```
MUST INCLUDE:
- "Meet Our Legal Team" heading
- 1-4 attorney profiles with professional photos
- Each profile includes:
  * Professional headshot (placeholder provided)
  * Full Name, Esq. (or JD)
  * Title/Role (Partner, Senior Attorney, etc.)
  * Bar admissions (state bars, federal courts)
  * Education (law school, undergrad)
  * Years practicing
  * Practice focus areas
  * Professional memberships (State Bar Assoc, Trial Lawyers Assoc, etc.)
  * Notable achievements or publications
  * "Contact [Name]" button
- Confidence-building, authoritative tone
```

#### 6. **Why Choose Us** - `differentiators`
```
MUST INCLUDE:
- "Why Choose [Firm Name]?" heading
- 4-6 key differentiators with icons:
  * "25+ Years Combined Experience"
  * "No Fee Unless We Win Your Case"
  * "Aggressive Representation"
  * "Personal Attention to Every Case"
  * "Available 24/7 for Emergencies"
  * "Proven Track Record"
- Each with icon, heading, 2-3 sentence explanation
- Trust-building design
```

#### 7. **Client Testimonials** - `testimonials-legal`
```
MUST INCLUDE:
- 6-8 client testimonials
- Each shows: 5-star rating, quote, client initials (for privacy), case type, year
- "Verified Client" badges if applicable
- Emphasis on outcomes and attorney expertise
- Carousel or grid layout
- Links to third-party review sites (Avvo, Martindale-Hubbell, Google)
- Disclaimer: "Testimonials do not guarantee similar results"
```

#### 8. **Legal Process Timeline** - `process-steps`
```
MUST INCLUDE:
- "What to Expect" or "Our Process" heading
- 5-6 step timeline:
  * Step 1: Free Consultation - "We listen to your story"
  * Step 2: Case Investigation - "We gather evidence and build your case"
  * Step 3: Strategy Development - "We create a winning legal strategy"
  * Step 4: Negotiation/Filing - "We fight for maximum compensation"
  * Step 5: Settlement or Trial - "We don't back down until you get justice"
  * Step 6: Case Resolution - "We ensure you receive what you deserve"
- Visual timeline with icons
- Reassuring, confidence-building messaging
```

#### 9. **FAQ Accordion** - `faq-legal`
```
MUST INCLUDE:
- 10-12 common legal questions:
  * "How much does a lawyer cost?"
  * "What is a contingency fee?"
  * "How long will my case take?"
  * "Do I need a lawyer for my case?"
  * "What if I can't afford a lawyer?"
  * "Should I accept the insurance company's offer?"
  * "What is my case worth?"
  * "Will my case go to trial?"
  * "How often will you communicate with me?"
  * "What should I bring to my consultation?"
  * etc.
- Clear, jargon-free answers
- Expand/collapse functionality
```

#### 10. **Awards & Recognition** - `credentials-legal`
```
MUST INCLUDE:
- Bar admissions (state and federal)
- Professional associations (State Trial Lawyers, ABA, specialty bar sections)
- Awards: Super Lawyers, Best Lawyers, Avvo Rating, Martindale-Hubbell
- Speaking engagements or publications
- Community involvement
- Visual badge display
```

#### 11. **Final CTA** - `cta-urgent`
```
MUST INCLUDE:
- Compelling headline: "Don't Wait - Your Case Has Deadlines"
- Subheading: "Free consultation. No obligation. We're here to help."
- Dual CTAs: "Start Your Free Consultation" + "Call 24/7: (555) 123-4567"
- Urgency messaging: "Time-sensitive? Call now for immediate assistance."
- Trust reinforcement: No fee unless we win, confidential, experienced
- Bold, action-oriented design
```

#### 12. **Footer** - `footer-legal`
```
MUST INCLUDE:
- Firm name and logo
- Office locations (if multiple)
- Contact: Phone (24/7 availability noted), Email, Fax
- Practice areas quick links
- About, Attorneys, Case Results, Blog/Resources, Contact
- Bar admissions and licensing
- Social proof links (Avvo, Google Reviews, etc.)
- Disclaimer: "This website is for informational purposes only and does not constitute legal advice. 
  No attorney-client relationship is formed by using this website."
- Privacy Policy, Terms of Use
- Copyright
```

### Color Scheme
- Primary: Authority navy (#1e3a8a) or professional charcoal (#374151)
- Accent: Trust gold (#f59e0b) or confident burgundy (#991b1b)
- Neutral: Professional grays
- Avoid: Frivolous or playful colors

### Key Features Summary
- ✅ Free consultation emphasis
- ✅ Confidentiality and trust messaging throughout
- ✅ Case results showcase (with disclaimers)
- ✅ Attorney credentials and authority
- ✅ No fee unless we win messaging
- ✅ 24/7 availability
- ✅ Urgency and time-sensitivity reminders
- ✅ Professional, authoritative design

---

## Template 4: Real Estate Premium

### ID: `real-estate-premium`
### Category: Real Estate
### Target Verticals: Residential Agent, Commercial Broker, Property Management

### Required Sections (in order):

#### 1. **Hero Section** - `realtor-hero`
```
MUST INCLUDE:
- Personal brand headline: "Your Trusted Real Estate Expert in [City]"
- Subheading with credibility: "Helping families buy and sell homes since 2005"
- Key stats: "200+ Homes Sold • $50M+ in Sales • 5-Star Reviews"
- Primary CTA: "Free Home Valuation" + Secondary: "View Current Listings"
- Professional headshot or property photo background
- Trust badges: Realtor®, MLS member, local expertise
```

#### 2. **Featured Listings** - `property-showcase`
```
MUST INCLUDE:
- "Featured Properties" or "Current Listings" heading
- 6-9 property cards in responsive grid
- Each card shows:
  * High-quality property photo (placeholder provided)
  * Property address (street + city)
  * Price (large, prominent)
  * Key specs: Beds, Baths, Sq Ft
  * Status badge: "Active", "Pending", "Just Sold"
  * "View Details" button
- Filter buttons: "For Sale", "Recently Sold", "All Properties"
- "See All Listings" CTA to external MLS link
```

#### 3. **Home Valuation Form** - `valuation-calculator`
```
MUST INCLUDE:
- "What's Your Home Worth?" heading
- Subheading: "Get a free, no-obligation market analysis"
- Form fields:
  * Property Address (street)
  * City, State, Zip
  * Property Type (Single Family, Condo, Townhouse, Multi-Family, Other)
  * Bedrooms (dropdown)
  * Bathrooms (dropdown)
  * Square Footage (approximate)
  * Year Built (optional)
  * Recent Updates? (checkbox list: Kitchen, Bathrooms, Flooring, Roof, HVAC)
  * Your Name
  * Email
  * Phone
  * "Planning to sell?" (In next 3 months, 3-6 months, 6-12 months, Just curious)
- Submit: "Get My Free Home Valuation"
- Success: "Thank you! We'll prepare your personalized market analysis and contact you within 24 hours."
- Note: Submits to /api/contact-form with type: "home-valuation"
```

#### 4. **Services Overview** - `realtor-services`
```
MUST INCLUDE:
- "How I Can Help" or "Services" heading
- 4-6 service cards:
  * Buyer Representation - "Find Your Dream Home"
  * Seller Representation - "Sell for Top Dollar"
  * Investment Properties - "Build Your Portfolio"
  * Relocation Services - "Smooth Transitions"
  * First-Time Homebuyers - "Expert Guidance"
  * Luxury Properties - "Premium Marketing"
- Each with icon, heading, description, key benefits
- "Let's Get Started" CTA
```

#### 5. **Agent Profile** - `agent-bio`
```
MUST INCLUDE:
- Professional headshot (placeholder)
- Agent name with credentials (Realtor®, designations like CRS, ABR, etc.)
- Bio headline: "Local Expert • Dedicated Advocate • Proven Results"
- Bio text (3-4 paragraphs):
  * Years in business and local market expertise
  * Personal connection to community
  * Sales philosophy and approach
  * Notable achievements
- Key stats box: Total Sales, Homes Sold, Average DOM, Client Satisfaction
- Credentials: Certifications, Awards, MLS memberships
- "Work With Me" CTA button
```

#### 6. **Neighborhood Expertise** - `market-areas`
```
MUST INCLUDE:
- "Markets I Serve" or "Local Expertise" heading
- Grid of 6-12 neighborhoods/cities with:
  * Neighborhood name
  * Brief description (1-2 sentences about character, schools, amenities)
  * Key stats: Median price, market trend
  * Optional: Small map or neighborhood photo
- "View Market Reports" CTA
- Establishes local authority
```

#### 7. **Client Success Stories** - `testimonials-realtor`
```
MUST INCLUDE:
- "What My Clients Say" heading
- 6-8 testimonials with 5-star ratings
- Each includes:
  * Star rating
  * Quote about service experience
  * Client first name + last initial
  * Transaction type (Bought/Sold) + City
  * Year
- Optional: Property photo if available
- "Read More Reviews on Zillow" or Google Reviews link
- Video testimonial embed (optional but powerful)
```

#### 8. **Selling Process** - `seller-journey`
```
MUST INCLUDE:
- "Selling Your Home - Step by Step" heading
- 6-8 step process:
  * Step 1: Consultation - "We discuss your goals and timeline"
  * Step 2: Home Valuation - "Competitive market analysis"
  * Step 3: Pre-Listing Prep - "Maximize your home's appeal"
  * Step 4: Professional Marketing - "Photography, staging, MLS, social media"
  * Step 5: Showings & Open Houses - "Showcase your property"
  * Step 6: Negotiations - "Secure the best offer"
  * Step 7: Inspection & Appraisal - "Navigate due diligence"
  * Step 8: Closing - "Smooth transaction to sold!"
- Visual timeline or numbered steps
- "Get Your Home Selling Plan" CTA
```

#### 9. **Buying Process** - `buyer-journey`
```
MUST INCLUDE:
- "Buying a Home - Your Roadmap" heading
- 6-7 step process:
  * Step 1: Get Pre-Approved - "Know your budget"
  * Step 2: Define Your Criteria - "We identify your perfect home"
  * Step 3: Home Search - "I'll find properties that match"
  * Step 4: Tours & Showings - "See homes in person"
  * Step 5: Make an Offer - "Strategic negotiation"
  * Step 6: Inspection & Financing - "Protect your investment"
  * Step 7: Closing - "Keys in hand!"
- Visual timeline
- "Start Your Home Search" CTA
```

#### 10. **Market Insights** - `market-stats`
```
MUST INCLUDE:
- "Current Market Snapshot" heading
- Key stats display:
  * Average Home Price: $XXX,XXX
  * Average Days on Market: XX days
  * Month's Supply of Inventory: X.X months
  * Market Trend: Seller's/Buyer's/Balanced Market
- Optional: Simple chart visual (can be styled bars or icons)
- "This data is for [City/County] as of [Month Year]"
- "Get Detailed Market Report" CTA
```

#### 11. **Resources & Tools** - `buyer-seller-resources`
```
MUST INCLUDE:
- "Helpful Resources" heading
- Resource links/sections:
  * Mortgage Calculator (link or simple embedded version)
  * Buyer's Guide (downloadable PDF)
  * Seller's Guide (downloadable PDF)
  * Local School Information
  * Moving Checklist
  * Home Maintenance Tips
- Each with icon, title, brief description
- Positions agent as helpful resource
```

#### 12. **FAQ Accordion** - `faq-realtor`
```
MUST INCLUDE:
- 10-12 real estate questions:
  * "How much does it cost to work with you?"
  * "How do you determine my home's value?"
  * "How long does it take to sell a home?"
  * "Should I buy or sell first?"
  * "What should I look for in a home inspection?"
  * "How much should I offer on a home?"
  * "What are closing costs?"
  * "Do I need a pre-approval letter?"
  * "What's your commission?"
  * "How many clients do you work with at once?"
  * etc.
- Clear, transparent answers
- Expand/collapse design
```

#### 13. **Final CTA** - `cta-contact`
```
MUST INCLUDE:
- Personal headline: "Ready to Make Your Move?"
- Subheading: "Whether buying or selling, I'm here to help every step of the way"
- Dual CTAs: "Schedule a Consultation" + "Call/Text Me: (555) 123-4567"
- Trust reinforcement: "No pressure. Just expert guidance and local knowledge."
- Professional photo of agent or welcoming background
```

#### 14. **Footer** - `footer-realtor`
```
MUST INCLUDE:
- Agent name, photo, contact info
- Brokerage information and logo
- Office address and phone
- Quick links: Buy, Sell, About, Listings, Contact, Blog
- Social media: Facebook, Instagram, LinkedIn, YouTube
- MLS disclaimer: "Listings courtesy of [MLS] and [Brokerage]"
- Equal Housing Opportunity logo and statement
- Realtor® logo and trademark
- Privacy Policy, Terms of Use
- Copyright
- License numbers (if required by state)
```

### Color Scheme
- Primary: Trustworthy blue (#2563eb) or sophisticated gray (#475569)
- Accent: Luxury gold (#d97706) or modern teal (#0891b2)
- Neutrals: Clean whites and grays for property photos to shine
- Professional, upscale feel

### Key Features Summary
- ✅ Property showcase with filtering
- ✅ Home valuation lead capture
- ✅ Detailed buyer and seller processes
- ✅ Neighborhood/market expertise
- ✅ Agent credibility and personal branding
- ✅ Market statistics and insights
- ✅ Resource library for buyers/sellers
- ✅ Strong testimonials and social proof
- ✅ Professional, trustworthy design that showcases properties

---

## Universal Requirements for All 4 Templates

### Technical Implementation

1. **Responsive Design**
   - Mobile-first approach
   - Breakpoints: 320px, 768px, 1024px, 1440px
   - Touch-friendly buttons (min 44x44px tap targets)
   - Collapsible navigation on mobile

2. **Performance**
   - Lazy load images below the fold
   - Optimize image placeholders (provide at reasonable sizes)
   - Minimize inline styles where possible
   - Fast load times (target < 3s on 3G)

3. **Accessibility**
   - Semantic HTML5 elements
   - ARIA labels where needed
   - Keyboard navigation support
   - Color contrast ratios meeting WCAG AA standards (4.5:1 for text)
   - Alt text for all images

4. **Form Handling**
   - Client-side validation before submit
   - Clear error messages
   - Success confirmation messages
   - Submit to existing `/api/contact-form` endpoint with appropriate `type` parameter
   - All forms should capture: name, email, phone minimum

5. **SEO Optimization**
   - Proper heading hierarchy (H1 > H2 > H3)
   - Meta description support in template
   - Schema.org markup for LocalBusiness
   - Alt text for images

6. **Browser Compatibility**
   - Modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
   - Graceful degradation for older browsers
   - No reliance on cutting-edge CSS that breaks in IE11 (if still supported)

### Design Standards

1. **Typography**
   - Primary font: Modern sans-serif (Inter, Poppins, or similar via Google Fonts)
   - Headings: Bold, clear hierarchy (H1: 2.5-3rem, H2: 2rem, H3: 1.5rem)
   - Body: 16px base, 1.5-1.6 line height
   - Readable, professional

2. **Spacing**
   - Consistent spacing scale (8px base unit: 8, 16, 24, 32, 48, 64, 96)
   - Generous whitespace for premium feel
   - Section padding: 64-96px vertical on desktop, 48px on mobile

3. **Colors**
   - Each template has unique primary/accent colors (specified above)
   - Neutrals: Use gray scale for text and backgrounds
   - High contrast for readability
   - Consistent color usage throughout

4. **Buttons**
   - Primary CTA: Bold, high contrast, accent color
   - Secondary CTA: Outline style or muted color
   - Hover states: Darken or lighten by 10-15%
   - Clear, action-oriented copy

5. **Images**
   - Use provided placeholders or specify placeholder requirements
   - Maintain aspect ratios
   - High-quality, professional imagery
   - Optimized file sizes

6. **Icons**
   - Consistent icon style (line icons or solid - choose one system)
   - Suggest using Lucide, Heroicons, or Font Awesome
   - Appropriate sizes (24-32px standard)

### Content Guidelines

1. **Tone**
   - Professional yet approachable
   - Build trust and authority
   - Clear, benefit-focused messaging
   - Avoid jargon (or explain when necessary)

2. **Copy Length**
   - Headlines: 5-10 words
   - Subheadlines: 10-20 words
   - Body paragraphs: 2-4 sentences
   - Service descriptions: 2-3 sentences
   - Testimonials: 2-4 sentences

3. **CTAs**
   - Action-oriented: "Get", "Start", "Schedule", "Request", "Call"
   - Value-focused: "Free Quote", "Free Consultation", "No Obligation"
   - Multiple CTAs throughout (aim for CTA every 1.5-2 screen scrolls)

4. **Default Content**
   - Provide realistic, industry-appropriate placeholder content
   - Use [brackets] for customizable fields: [Business Name], [City], [Phone]
   - Provide 6-10 examples for repeated elements (testimonials, services, etc.)

### Conversion Optimization

1. **Multiple Contact Methods**
   - Phone (clickable tel: links)
   - Email (mailto: links)
   - Contact forms
   - Optional: Live chat widget integration point

2. **Trust Signals Throughout**
   - Credentials, certifications, badges
   - Client counts, years in business
   - Testimonials and reviews
   - Industry affiliations

3. **Mobile Optimization**
   - Sticky header with phone button on mobile
   - Simplified forms on small screens
   - Large, thumb-friendly tap targets
   - Fast load times

4. **Clear Value Propositions**
   - Front and center in hero
   - Reinforced throughout page
   - Specific benefits, not just features

### File Delivery

Each template should be delivered as:

1. **JSON file** (`/public/data/templates/[template-id].json`)
   - Following existing template structure
   - Complete section definitions
   - Style configurations
   - Placeholder content

2. **Documentation** (optional but helpful)
   - Section descriptions
   - Customization points
   - Any special implementation notes

3. **Assets** (if needed)
   - Icon recommendations
   - Image specifications (dimensions, aspect ratios)
   - Font recommendations

4. **Registry Update**
   - Add entries to `/public/data/templates/index.json`:
   ```json
   {
     "id": "home-services-premium",
     "name": "Home Services Pro",
     "description": "Premium template for contractors, HVAC, plumbing, and trade businesses",
     "category": "Home Services",
     "color": "#1e40af",
     "plan": "Premium",
     "features": [
       "Multi-step quote form with file upload",
       "Before/after project galleries",
       "Service area coverage map",
       "Credentials & trust badges",
       "Emergency service modules",
       "Testimonials with star ratings"
     ]
   }
   ```

---

## Quality Checklist

Before submitting each template, verify:

- [ ] All required sections are included in correct order
- [ ] All forms submit to appropriate endpoints with correct parameters
- [ ] Responsive design works on mobile, tablet, desktop
- [ ] Color scheme is professional and on-brand for vertical
- [ ] All placeholder content is realistic and industry-appropriate
- [ ] CTAs are prominent and action-oriented (at least 5-7 per template)
- [ ] Trust signals appear throughout (not just one section)
- [ ] Accessibility standards met (semantic HTML, ARIA, contrast)
- [ ] JSON structure follows existing template format
- [ ] Template is registered in index.json
- [ ] No broken links or missing images
- [ ] Professional, premium feel throughout

---

## Success Criteria

Each premium template should:

1. ✅ **Convert Better** - Multiple lead capture points, clear CTAs, friction reduction
2. ✅ **Build Trust** - Credentials, testimonials, social proof, authority signals
3. ✅ **Look Premium** - Professional design, generous whitespace, high-quality imagery
4. ✅ **Mobile Optimized** - Perfect experience on all devices
5. ✅ **Industry-Specific** - Feels purpose-built for that vertical, not generic
6. ✅ **Easy to Customize** - Clear placeholder content, logical structure
7. ✅ **Feature-Rich** - Demonstrates clear value over Starter tier

---

## Questions or Clarifications?

If you encounter any ambiguities or need clarification on:
- Technical implementation details
- Existing codebase structure
- API endpoints or backend functionality
- Design decisions or styling approaches
- Content requirements

Please ask before making assumptions. The goal is production-ready, high-quality premium templates that businesses will pay $49-79/month to use.

---

## Getting Started

1. **Review existing templates** in `/public/data/templates/` to understand JSON structure
2. **Examine `/public/app.js`** to understand how sections are rendered
3. **Check `/public/styles.css`** and `/public/theme.css`** for existing style patterns
4. **Start with Template 1** (Home Services) as the reference implementation
5. **Test responsiveness** at each breakpoint
6. **Validate forms** submit correctly
7. **Move to Templates 2-4** once first template is approved

Good luck! Build something businesses will be proud to publish.

