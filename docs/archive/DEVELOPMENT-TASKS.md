# Development Tasks Breakdown
## Parallel Implementation Guide for Multiple Agents

---

## 🎯 EPIC 1: Draft System & Publishing Flow

### **Agent A: Draft Management Backend**
**Priority:** High | **Dependencies:** None | **Estimated Time:** 2-3 hours

**Tasks:**
- [ ] Create `/public/drafts/` directory structure
- [ ] Create `POST /api/drafts/save` endpoint
  - Store draft data as JSON files
  - Generate unique draftId
  - Set 7-day expiration timestamp
- [ ] Create `GET /api/drafts/:draftId` endpoint
  - Load draft data
  - Check expiration status
- [ ] Create `DELETE /api/drafts/:draftId` endpoint
  - Cleanup expired drafts
- [ ] Update `POST /api/setup` to support both drafts and published sites
- [ ] Add draft expiration cleanup job

**Files to modify:**
- `server.js` (add draft endpoints)
- Create `public/drafts/` directory

**Test cases:**
- Save draft without payment
- Load draft data
- Expire old drafts automatically

---

### **Agent B: Setup Flow Refactoring**
**Priority:** High | **Dependencies:** Agent A | **Estimated Time:** 3-4 hours

**Tasks:**
- [ ] Modify `setup.html` to save drafts instead of publishing immediately
- [ ] Update `finishSetup()` function to save as draft first
- [ ] Add "Preview Draft" functionality
- [ ] Show draft preview URL after initial save
- [ ] Add draft expiration countdown timer
- [ ] Update UI to distinguish drafts vs published sites
- [ ] Add "Upgrade to Publish" button/modal trigger

**Files to modify:**
- `public/setup.html` (JavaScript section)

**Test cases:**
- Create draft without payment
- Preview draft URL
- Show expiration warning

---

### **Agent C: Payment Modal & Checkout**
**Priority:** High | **Dependencies:** Agent B | **Estimated Time:** 4-5 hours

**Tasks:**
- [ ] Create payment modal HTML in `setup.html`
- [ ] Design plan selection UI (Starter/Business/Pro)
- [ ] Integrate Stripe.js library
- [ ] Create `initPayment()` function
- [ ] Create `processPayment()` function
- [ ] Handle payment success/failure
- [ ] Update draft to published site after payment
- [ ] Show success message with site URL

**Files to modify:**
- `public/setup.html` (add payment modal HTML + JavaScript)
- `server.js` (add payment processing endpoint)

**Test cases:**
- Select plan
- Process payment with Stripe
- Convert draft to published site
- Show error on failure

---

## 🎯 EPIC 2: User Authentication & Accounts

### **Agent D: Authentication Backend**
**Priority:** Medium | **Dependencies:** None | **Estimated Time:** 3-4 hours

**Tasks:**
- [ ] Install/configure bcrypt for password hashing
- [ ] Create user data structure (`public/users/` or database)
- [ ] Create `POST /api/auth/register` endpoint
  - Validate email format
  - Hash password with bcrypt
  - Create user record
- [ ] Create `POST /api/auth/login` endpoint
  - Verify credentials
  - Return JWT session token
- [ ] Create `POST /api/auth/logout` endpoint
- [ ] Create `GET /api/auth/me` endpoint (get current user)
- [ ] Add JWT middleware for protected routes
- [ ] Update existing endpoints to associate drafts/sites with users

**Files to modify:**
- `server.js` (add auth endpoints)
- `package.json` (add bcrypt, jsonwebtoken)
- Create user storage structure

**Test cases:**
- Register new user
- Login with credentials
- JWT token validation
- Logout clears session

---

### **Agent E: Login & Registration Pages**
**Priority:** Medium | **Dependencies:** Agent D | **Estimated Time:** 2-3 hours

**Tasks:**
- [ ] Create `public/login.html` page
  - Email/password form
  - "Forgot Password" link
  - "Create Account" link
- [ ] Create `public/register.html` page
  - Registration form (email, password, confirm password)
  - Password strength indicator
  - Terms & conditions checkbox
- [ ] Create `login.js` for form handling
- [ ] Create `register.js` for form handling
- [ ] Handle authentication flow (store JWT, redirect to dashboard)
- [ ] Add authentication to setup flow (check if user is logged in)

**Files to create:**
- `public/login.html`
- `public/register.html`
- `public/login.js`
- `public/register.js`

**Test cases:**
- Display login form
- Handle successful login
- Display registration form
- Handle validation errors
- Redirect to dashboard after login

---

### **Agent F: User Dashboard**
**Priority:** Medium | **Dependencies:** Agent D, E | **Estimated Time:** 4-5 hours

**Tasks:**
- [ ] Create `public/dashboard.html` page
  - Welcome message with user name
  - Stats overview (sites created, current plan)
  - "Create New Site" button
  - List of user's sites/drafts
- [ ] Create dashboard table/grid showing:
  - Site name
  - Template used
  - Status (draft/published)
  - URL/Preview link
  - Last edited date
  - Actions (Edit, Delete, View)
- [ ] Create `GET /api/user/sites` endpoint
  - Return all sites/drafts for logged-in user
- [ ] Add "Edit Site" functionality
  - Load existing data into setup.html
- [ ] Add "Delete Site" functionality
- [ ] Add subscription info section (current plan, billing date)

**Files to create:**
- `public/dashboard.html`
- `public/dashboard.js`
- Update `server.js` (add `/api/user/sites`, `/api/sites/:id/delete`)

**Test cases:**
- Display user's sites
- Create new site from dashboard
- Edit existing site
- Delete site
- Show subscription info

---

## 🎯 EPIC 3: Hosting & Subdomain System

### **Agent G: Subdomain Routing**
**Priority:** High | **Dependencies:** Agent C (payment system) | **Estimated Time:** 3-4 hours

**Tasks:**
- [ ] Update `server.js` to handle subdomain routing
- [ ] Create middleware to detect subdomain from request
- [ ] Route requests like `yourbusiness.fixngomobile.com` to `/public/sites/yourbusiness/`
- [ ] Create subdomain allocation system
  - Check availability
  - Reserve subdomain
  - Associate with user
- [ ] Update `POST /api/drafts/:draftId/publish` to:
  - Generate unique subdomain
  - Move site from drafts to sites directory
  - Return subdomain URL
- [ ] Create wildcard DNS configuration guide
- [ ] Add subdomain preview functionality

**Files to modify:**
- `server.js` (add subdomain routing)
- Update publishing endpoint

**Test cases:**
- Access site via subdomain
- Check subdomain availability
- Reserve unique subdomain
- Route traffic correctly

---

### **Agent H: Domain Customization**
**Priority:** Low | **Dependencies:** Agent G | **Estimated Time:** 3-4 hours

**Tasks:**
- [ ] Create UI for custom domain input (in setup flow)
- [ ] Add "Custom Domain" section to dashboard
- [ ] Create `PUT /api/sites/:id/domain` endpoint
- [ ] Add DNS configuration instructions modal
- [ ] Add domain verification check
- [ ] Show custom domain status (pending/verified)

**Files to modify:**
- `public/setup.html`
- `public/dashboard.html`
- `server.js` (add domain endpoints)

**Test cases:**
- Enter custom domain
- Show DNS instructions
- Verify domain ownership
- Route custom domain to site

---

## 🎯 EPIC 4: Payment Integration

### **Agent I: Stripe Integration**
**Priority:** High | **Dependencies:** Agent C | **Estimated Time:** 4-5 hours

**Tasks:**
- [ ] Create Stripe account and get API keys
- [ ] Install Stripe Node.js SDK
- [ ] Add Stripe API keys to `.env` file
- [ ] Create `POST /api/payment/create-intent` endpoint
  - Create Stripe payment intent
  - Return client secret
- [ ] Create `POST /api/payment/confirm` endpoint
  - Confirm payment with Stripe
  - Create subscription for user
  - Link subscription to user account
- [ ] Add webhook handler for Stripe events
  - Handle subscription.created
  - Handle subscription.deleted
  - Handle payment.failed
- [ ] Add subscription status management
- [ ] Create subscription update/cancel endpoints

**Files to modify:**
- `server.js` (add Stripe endpoints)
- `package.json` (add stripe dependency)
- `.env` (add Stripe keys)

**Test cases:**
- Create payment intent
- Process successful payment
- Handle failed payment
- Webhook event handling

---

### **Agent J: Apple Pay Integration**
**Priority:** Medium | **Dependencies:** Agent I | **Estimated Time:** 2-3 hours

**Tasks:**
- [ ] Research Apple Pay Web API
- [ ] Add Apple Pay button to payment modal
- [ ] Create `initApplePay()` function
- [ ] Handle Apple Pay payment flow
- [ ] Integrate with existing Stripe payment flow
- [ ] Add Apple Pay availability detection
- [ ] Fallback to regular payment if Apple Pay unavailable

**Files to modify:**
- `public/setup.html` (add Apple Pay button)
- Update payment modal JavaScript

**Test cases:**
- Show Apple Pay button on Apple devices
- Process Apple Pay payment
- Handle errors gracefully

---

## 🎯 EPIC 5: Image Management

### **Agent K: Image Upload Fix**
**Priority:** High | **Dependencies:** None | **Estimated Time:** 2-3 hours

**Tasks:**
- [ ] Fix image upload functionality in setup flow
- [ ] Update `pickHeroImage()` function to actually upload files
- [ ] Update `openImagePicker()` for service images
- [ ] Connect file input to FormData upload
- [ ] Show upload progress indicator
- [ ] Handle upload errors gracefully
- [ ] Store uploaded image URLs in draft/site data

**Files to modify:**
- `public/setup.html` (JavaScript section)
- Ensure `server.js` has `/api/upload` endpoint (already exists)

**Test cases:**
- Upload hero image from camera
- Upload service images from gallery
- Handle large file uploads
- Show uploaded image in preview

---

### **Agent L: Image Search Integration**
**Priority:** Low | **Dependencies:** None | **Estimated Time:** 3-4 hours

**Tasks:**
- [ ] Research Unsplash or Pexels API
- [ ] Get API key and add to `.env`
- [ ] Create `GET /api/images/search?query=restaurant` endpoint
- [ ] Add search UI to image picker modal
- [ ] Display search results in grid
- [ ] Allow selecting image from search results
- [ ] Handle API rate limits
- [ ] Add image attribution (required by Unsplash)

**Files to modify:**
- `public/setup.html` (add search UI)
- `server.js` (add image search endpoint)
- `.env` (add API key)

**Test cases:**
- Search for images
- Select image from search
- Handle API errors
- Show image attribution

---

## 🎯 EPIC 6: Homepage & Marketing

### **Agent M: Homepage Redesign**
**Priority:** Medium | **Dependencies:** None | **Estimated Time:** 3-4 hours

**Tasks:**
- [ ] Redesign homepage hero section
  - Update headline to "Create Your Website Free"
  - Add "Browse Templates" primary CTA
  - Add "See How It Works" secondary CTA
- [ ] Create "How It Works" section
  - Step 1: Browse Templates
  - Step 2: Customize Free
  - Step 3: Preview & Publish
- [ ] Create "Examples" gallery
  - Showcase published sites
  - Link to live examples
- [ ] Move pricing section lower on page
- [ ] Add social proof section
- [ ] Optimize for conversion

**Files to modify:**
- `public/index.html`
- `public/style.css` or inline styles

**Test cases:**
- Display updated hero
- Show "How It Works" steps
- Link to templates gallery
- Mobile responsive

---

### **Agent N: Template Gallery Enhancement**
**Priority:** Medium | **Dependencies:** None | **Estimated Time:** 2-3 hours

**Tasks:**
- [ ] Enhance `public/templates.html` design
- [ ] Add template filters (by industry)
- [ ] Add template search functionality
- [ ] Show template preview images
- [ ] Add "Try Template" buttons
- [ ] Add template categories
- [ ] Make templates clickable to start setup

**Files to modify:**
- `public/templates.html`
- Update template gallery styling

**Test cases:**
- Filter templates by category
- Search for templates
- Click template to start setup
- Mobile responsive

---

## 📊 Dependencies Map

```
Epic 1: Draft System (Foundation)
├── Agent A: Draft Backend ──────┐
├── Agent B: Setup Refactoring ──┤
└── Agent C: Payment Modal ─────┘
           └─→ Depends on A & B

Epic 2: Authentication (Independent)
├── Agent D: Auth Backend
├── Agent E: Login/Register Pages ──→ Depends on D
└── Agent F: Dashboard ───────────→ Depends on D & E

Epic 3: Hosting (Depends on payment)
├── Agent G: Subdomain Routing ──→ Depends on Epic 1
└── Agent H: Custom Domains ──────→ Depends on G

Epic 4: Payment (Independent)
├── Agent I: Stripe Integration ──→ Independent
└── Agent J: Apple Pay ───────────→ Depends on I

Epic 5: Images (Independent)
├── Agent K: Upload Fix ─────────→ Independent
└── Agent L: Search Integration ──→ Independent

Epic 6: Marketing (Independent)
├── Agent M: Homepage Redesign ──→ Independent
└── Agent N: Template Gallery ────→ Independent
```

---

## 🚀 Parallel Execution Plan

### **Phase 1: Foundation (Week 1)**
**Can be done in parallel:**
- Agent A (Draft Backend)
- Agent D (Auth Backend)
- Agent K (Image Upload Fix)
- Agent M (Homepage Redesign)
- Agent N (Template Gallery)

**Blocked until Phase 1:**
- Agent B (needs Agent A)
- Agent E (needs Agent D)
- Agent F (needs D & E)

### **Phase 2: Core Features (Week 2)**
**Can be done in parallel:**
- Agent B (Setup Refactoring)
- Agent E (Login/Register Pages)
- Agent I (Stripe Integration)
- Agent L (Image Search)

**Blocked until Phase 2:**
- Agent C (needs A & B)
- Agent F (needs D & E)

### **Phase 3: Payment & Hosting (Week 3)**
**Can be done in parallel:**
- Agent C (Payment Modal)
- Agent F (Dashboard)
- Agent G (Subdomain Routing)
- Agent J (Apple Pay)

**Blocked until Phase 3:**
- Agent H (needs G)

### **Phase 4: Polish (Week 4)**
- Agent H (Custom Domains)
- Testing & Integration
- Bug fixes
- Documentation

---

## 🎯 Quick Start for Agents

### **To start working on your task:**

1. **Pull latest changes:**
   ```bash
   git pull origin small-biz-template
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b agent-[letter]-[feature-name]
   # Example: git checkout -b agent-a-draft-backend
   ```

3. **Work on your tasks** (see your section above)

4. **Test locally:**
   ```bash
   npm start
   ```

5. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: [your feature description]"
   git push origin agent-[letter]-[feature-name]
   ```

6. **Create pull request** when complete

---

## 📝 Notes

- **Conflicts:** Communicate early if you need to modify the same file
- **API Endpoints:** Use REST conventions, document new endpoints
- **Testing:** Each agent should test their feature independently
- **Integration:** Agent F (Dashboard) should coordinate with others for API contracts

