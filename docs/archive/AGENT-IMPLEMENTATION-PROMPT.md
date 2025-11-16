# 🤖 Agent Implementation Prompt - SiteSprintz Critical Features

## Context
You're working on **SiteSprintz**, a small business website builder with 19 templates, dark theme, and production-ready infrastructure. The platform is functional but missing 3 critical features blocking revenue and growth.

**Tech Stack:** Node.js, Express, JWT auth, Stripe (configured but not active), Resend (email), file-based storage (JSON), modern dark theme

**Current State:** 
- ✅ 19 templates working
- ✅ User auth complete
- ✅ Draft system functional
- ✅ Publishing works
- ✅ Email notifications working
- ❌ No real payment processing
- ❌ No site editing after publish
- ❌ No analytics tracking

---

## 🎯 TASK 1: Enable Real Stripe Payments (CRITICAL - Start Here)

**Goal:** Allow users to pay $10 (Starter) or $25 (Pro) per month to publish sites

**What to Implement:**

### 1. Update Stripe Configuration
- Read existing Stripe integration in `server.js` (line ~24-28)
- Note: Stripe is already imported and initialized
- Add subscription price IDs to `.env`:
  ```bash
  STRIPE_PRICE_STARTER=price_xxx  # $10/month
  STRIPE_PRICE_PRO=price_yyy      # $25/month
  ```

### 2. Modify `/api/drafts/:draftId/publish` Endpoint
**File:** `server.js` (around line 1007-1130)

**Current behavior:** Creates site without payment verification

**Required changes:**
1. Check if user has active subscription before allowing publish
2. If no subscription, return error with payment required message
3. If subscription exists, verify it's active via Stripe API
4. Check plan tier matches template requirements:
   - Free templates: No subscription needed
   - Starter templates: Requires Starter or Pro plan
   - Pro templates: Requires Pro plan only

**Pseudo-code:**
```javascript
// In publish endpoint, before creating site:
const { email, plan } = req.body;
const template = // load template to check tier

// Check if payment required
if (template.plan !== 'free') {
  // Query Stripe for customer subscriptions
  const customer = await stripe.customers.list({ email, limit: 1 });
  if (!customer.data.length) {
    return res.status(402).json({ error: 'Payment required' });
  }
  
  const subscriptions = await stripe.subscriptions.list({
    customer: customer.data[0].id,
    status: 'active',
    limit: 1
  });
  
  if (!subscriptions.data.length) {
    return res.status(402).json({ error: 'No active subscription' });
  }
  
  // Verify plan tier matches template
  const userPlan = subscriptions.data[0].items.data[0].price.id;
  if (!isValidPlanForTemplate(userPlan, template.plan)) {
    return res.status(403).json({ error: 'Upgrade required' });
  }
}

// Continue with existing publish logic...
```

### 3. Create Subscription Checkout Endpoint
**New endpoint:** `POST /api/create-checkout-session`

**Purpose:** Create Stripe checkout session for subscription

**Implementation:**
```javascript
app.post('/api/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { priceId, plan } = req.body;
    const userEmail = req.user.email;
    
    // Create or retrieve Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: { plan }
      });
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${process.env.SITE_URL}/dashboard.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL}/setup.html`,
      metadata: {
        plan,
        user_email: userEmail
      }
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});
```

### 4. Update Frontend Payment Flow
**File:** `public/setup.html` (around line 2119-2195, the `processPayment` function)

**Current behavior:** Shows payment modal but doesn't process payment

**Required changes:**
```javascript
async function processPayment() {
  const plan = document.getElementById('planSelect').value;
  const email = document.getElementById('emailInput').value;
  
  if (!email || !isValidEmail(email)) {
    showError('Please enter a valid email');
    return;
  }
  
  // Determine price ID based on plan
  const priceIds = {
    'starter': 'price_starter_monthly', // Replace with actual Stripe price ID
    'pro': 'price_pro_monthly'          // Replace with actual Stripe price ID
  };
  
  const priceId = priceIds[plan];
  if (!priceId) {
    showError('Invalid plan selected');
    return;
  }
  
  try {
    // Get token
    const token = localStorage.getItem('token');
    
    // Create checkout session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ priceId, plan })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create checkout session');
    }
    
    // Redirect to Stripe Checkout
    window.location.href = data.url;
  } catch (error) {
    console.error('Payment error:', error);
    showError(error.message);
  }
}
```

### 5. Handle Subscription Webhooks
**File:** `server.js` (webhook handler exists around line 113-164)

**Extend existing webhook handler to process subscription events:**
```javascript
// In the webhook handler switch statement, add:
case 'customer.subscription.created':
case 'customer.subscription.updated':
  const subscription = event.data.object;
  console.log('Subscription event:', event.type, subscription.id);
  // Store subscription data in user file
  const customerEmail = subscription.customer_email || 
    (await stripe.customers.retrieve(subscription.customer)).email;
  await updateUserSubscription(customerEmail, {
    subscriptionId: subscription.id,
    status: subscription.status,
    plan: subscription.items.data[0].price.id,
    currentPeriodEnd: subscription.current_period_end
  });
  break;

case 'customer.subscription.deleted':
  // Handle cancellation
  const cancelledSub = event.data.object;
  const custEmail = (await stripe.customers.retrieve(cancelledSub.customer)).email;
  await updateUserSubscription(custEmail, { status: 'cancelled' });
  break;
```

### 6. Add Helper Function for User Subscription
```javascript
async function updateUserSubscription(email, subscriptionData) {
  const userFilePath = getUserFilePath(email);
  try {
    const userData = JSON.parse(await fs.readFile(userFilePath, 'utf-8'));
    userData.subscription = {
      ...userData.subscription,
      ...subscriptionData,
      updatedAt: Date.now()
    };
    await fs.writeFile(userFilePath, JSON.stringify(userData, null, 2));
  } catch (error) {
    console.error('Failed to update user subscription:', error);
  }
}
```

**Testing Checklist:**
- [ ] Can create checkout session with valid token
- [ ] Redirects to Stripe Checkout page
- [ ] After payment, subscription appears in Stripe dashboard
- [ ] Webhook receives subscription.created event
- [ ] User file updated with subscription data
- [ ] Publishing requires active subscription
- [ ] Free templates still work without payment

---

## 🎯 TASK 2: Add Site Editing Functionality (HIGH PRIORITY)

**Goal:** Allow users to edit and republish their sites after initial publish

**What to Implement:**

### 1. Add "Edit" Button to Dashboard
**File:** `public/dashboard.html` (around line 100-200, site card rendering)

**Add edit button to each site card:**
```javascript
// In the site card rendering code, add:
<div class="site-actions">
  <a href="/sites/${site.subdomain}/" target="_blank" class="btn-view">
    View Site
  </a>
  <button onclick="editSite('${site.subdomain}')" class="btn-edit">
    ✏️ Edit
  </button>
  <button onclick="deleteSite('${site.subdomain}')" class="btn-delete">
    🗑️ Delete
  </button>
</div>
```

**Add CSS for buttons:**
```css
.site-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn-edit, .btn-delete, .btn-view {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  text-align: center;
}

.btn-edit {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-600));
  color: white;
  border: none;
}

.btn-edit:hover {
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
}

.btn-delete {
  background: var(--bg-elevated);
  color: var(--text-muted);
  border: 1px solid var(--border-dark);
}

.btn-delete:hover {
  background: #dc2626;
  color: white;
  border-color: #dc2626;
}
```

### 2. Create Edit Site Function
**File:** `public/dashboard.html` (JavaScript section)

```javascript
async function editSite(subdomain) {
  try {
    const token = localStorage.getItem('token');
    
    // Load site data
    const response = await fetch(`/api/sites/${subdomain}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load site');
    }
    
    const siteData = await response.json();
    
    // Store in localStorage for setup page
    localStorage.setItem('editingSite', JSON.stringify({
      subdomain,
      data: siteData,
      isEditing: true
    }));
    
    // Redirect to setup page
    window.location.href = '/setup.html?edit=' + subdomain;
  } catch (error) {
    console.error('Edit site error:', error);
    alert('Failed to load site for editing: ' + error.message);
  }
}

async function deleteSite(subdomain) {
  if (!confirm(`Are you sure you want to delete ${subdomain}? This cannot be undone.`)) {
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/sites/${subdomain}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete site');
    }
    
    alert('Site deleted successfully');
    loadUserSites(); // Refresh site list
  } catch (error) {
    console.error('Delete site error:', error);
    alert('Failed to delete site: ' + error.message);
  }
}
```

### 3. Create Backend Endpoints for Site Management
**File:** `server.js`

**Add GET endpoint to load site for editing:**
```javascript
// Get site data for editing
app.get('/api/sites/:subdomain', authenticateToken, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    
    // Load site data
    const sitePath = path.join(publicDir, 'sites', subdomain, 'site.json');
    const siteData = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    
    // Verify ownership
    if (siteData.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized to edit this site' });
    }
    
    res.json(siteData);
  } catch (error) {
    console.error('Load site error:', error);
    res.status(500).json({ error: 'Failed to load site' });
  }
});

// Update published site
app.put('/api/sites/:subdomain', authenticateToken, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    const updatedData = req.body;
    
    // Load existing site
    const sitePath = path.join(publicDir, 'sites', subdomain, 'site.json');
    const existingSite = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    
    // Verify ownership
    if (existingSite.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized to edit this site' });
    }
    
    // Create backup
    const backupPath = path.join(publicDir, 'sites', subdomain, `site.backup.${Date.now()}.json`);
    await fs.writeFile(backupPath, JSON.stringify(existingSite, null, 2));
    
    // Update site data (preserve published metadata)
    const updatedSite = {
      ...updatedData,
      published: {
        ...existingSite.published,
        lastUpdated: new Date().toISOString()
      }
    };
    
    // Save updated site
    await fs.writeFile(sitePath, JSON.stringify(updatedSite, null, 2));
    
    res.json({ success: true, message: 'Site updated successfully' });
  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({ error: 'Failed to update site' });
  }
});

// Delete published site
app.delete('/api/sites/:subdomain', authenticateToken, async (req, res) => {
  try {
    const { subdomain } = req.params;
    const userEmail = req.user.email;
    
    // Load site to verify ownership
    const sitePath = path.join(publicDir, 'sites', subdomain, 'site.json');
    const siteData = JSON.parse(await fs.readFile(sitePath, 'utf-8'));
    
    // Verify ownership
    if (siteData.published?.email !== userEmail) {
      return res.status(403).json({ error: 'Not authorized to delete this site' });
    }
    
    // Delete site directory
    const siteDir = path.join(publicDir, 'sites', subdomain);
    await fs.rm(siteDir, { recursive: true, force: true });
    
    res.json({ success: true, message: 'Site deleted successfully' });
  } catch (error) {
    console.error('Delete site error:', error);
    res.status(500).json({ error: 'Failed to delete site' });
  }
});
```

### 4. Modify Setup Page to Handle Editing
**File:** `public/setup.html`

**On page load, check if editing:**
```javascript
// Add to init function
window.addEventListener('DOMContentLoaded', async () => {
  // Check if we're editing a site
  const urlParams = new URLSearchParams(window.location.search);
  const editSubdomain = urlParams.get('edit');
  
  if (editSubdomain) {
    const editData = localStorage.getItem('editingSite');
    if (editData) {
      const { subdomain, data, isEditing } = JSON.parse(editData);
      if (subdomain === editSubdomain && isEditing) {
        await loadSiteForEditing(data);
        localStorage.removeItem('editingSite'); // Clear after loading
      }
    }
  }
  
  // Continue with normal init...
});

async function loadSiteForEditing(siteData) {
  // Populate form fields with existing data
  document.getElementById('brandName').value = siteData.brand?.name || '';
  document.getElementById('heroTitle').value = siteData.hero?.title || '';
  document.getElementById('heroSubtitle').value = siteData.hero?.subtitle || '';
  // ... populate all other fields
  
  // Change button text to "Update Site"
  const publishBtn = document.querySelector('.publish-btn');
  if (publishBtn) {
    publishBtn.textContent = '📝 Update Site';
    publishBtn.dataset.editing = 'true';
    publishBtn.dataset.subdomain = new URLSearchParams(window.location.search).get('edit');
  }
  
  // Show notification
  showNotification('Editing existing site. Click "Update Site" to save changes.');
}
```

**Modify publish/save function:**
```javascript
async function saveOrPublish() {
  const publishBtn = document.querySelector('.publish-btn');
  const isEditing = publishBtn.dataset.editing === 'true';
  const subdomain = publishBtn.dataset.subdomain;
  
  if (isEditing && subdomain) {
    // Update existing site
    await updateExistingSite(subdomain);
  } else {
    // Normal publish flow
    await publishNewSite();
  }
}

async function updateExistingSite(subdomain) {
  try {
    const token = localStorage.getItem('token');
    const siteData = collectFormData(); // Function to gather all form data
    
    const response = await fetch(`/api/sites/${subdomain}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(siteData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update site');
    }
    
    showSuccess('Site updated successfully!');
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 2000);
  } catch (error) {
    console.error('Update error:', error);
    showError('Failed to update site: ' + error.message);
  }
}
```

**Testing Checklist:**
- [ ] Click "Edit" on published site in dashboard
- [ ] Redirected to setup page with data pre-filled
- [ ] Can modify any field
- [ ] Click "Update Site" saves changes
- [ ] Changes visible on published site
- [ ] Backup created before update
- [ ] Can delete site from dashboard
- [ ] Confirm deletion prompt works

---

## 🎯 TASK 3: Add Google Analytics Tracking (QUICK WIN)

**Goal:** Track user behavior, conversions, and optimize the platform

**What to Implement:**

### 1. Add GA4 Tracking Code to All Pages
**Files to modify:**
- `public/index.html`
- `public/setup.html`
- `public/dashboard.html`
- `public/login.html`
- `public/register.html`

**Add before closing `</head>` tag:**
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 2. Add Event Tracking for Key Actions
**Create:** `public/analytics.js`

```javascript
// Analytics helper functions
const Analytics = {
  // Track custom events
  trackEvent(eventName, params = {}) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
      console.log('Analytics event:', eventName, params);
    }
  },
  
  // User lifecycle events
  trackSignup(method = 'email') {
    this.trackEvent('sign_up', { method });
  },
  
  trackLogin(method = 'email') {
    this.trackEvent('login', { method });
  },
  
  // Template browsing
  trackTemplateView(templateId, templateName) {
    this.trackEvent('view_template', {
      template_id: templateId,
      template_name: templateName
    });
  },
  
  trackTemplateSelect(templateId, templateName, tier) {
    this.trackEvent('select_template', {
      template_id: templateId,
      template_name: templateName,
      tier: tier
    });
  },
  
  // Draft management
  trackDraftSave(templateId) {
    this.trackEvent('save_draft', {
      template_id: templateId
    });
  },
  
  // Publishing funnel
  trackPublishAttempt(plan, templateId) {
    this.trackEvent('begin_checkout', {
      plan: plan,
      template_id: templateId,
      value: plan === 'starter' ? 10 : 25,
      currency: 'USD'
    });
  },
  
  trackPublishSuccess(subdomain, plan) {
    this.trackEvent('purchase', {
      transaction_id: subdomain,
      value: plan === 'starter' ? 10 : (plan === 'pro' ? 25 : 0),
      currency: 'USD',
      items: [{
        item_id: plan,
        item_name: `${plan} Plan`,
        price: plan === 'starter' ? 10 : (plan === 'pro' ? 25 : 0)
      }]
    });
  },
  
  // Editing
  trackSiteEdit(subdomain) {
    this.trackEvent('edit_site', {
      subdomain: subdomain
    });
  },
  
  // Engagement
  trackFeatureUse(featureName) {
    this.trackEvent('feature_use', {
      feature: featureName
    });
  }
};

// Export for use in other scripts
window.Analytics = Analytics;
```

### 3. Add Analytics Calls Throughout Application

**In `public/register.html`:**
```javascript
// After successful registration
Analytics.trackSignup('email');
```

**In `public/login.html`:**
```javascript
// After successful login
Analytics.trackLogin('email');
```

**In `public/setup.html`:**
```javascript
// When template is selected
Analytics.trackTemplateSelect(templateId, templateName, tier);

// When draft is saved
Analytics.trackDraftSave(currentTemplate);

// When publish button is clicked
Analytics.trackPublishAttempt(selectedPlan, currentTemplate);

// After successful publish
Analytics.trackPublishSuccess(subdomain, plan);
```

**In `public/dashboard.html`:**
```javascript
// When edit button is clicked
Analytics.trackSiteEdit(subdomain);
```

### 4. Add Analytics to Published Sites
**File:** `public/app.js` (this renders published sites)

**Add GA4 tracking for published sites:**
```javascript
// At the top of app.js, after loading config
const siteConfig = await loadConfig();
if (siteConfig.published?.subdomain) {
  // Track site view
  if (typeof gtag === 'function') {
    gtag('event', 'page_view', {
      page_title: siteConfig.brand?.name || 'Site',
      page_location: window.location.href,
      site_subdomain: siteConfig.published.subdomain
    });
  }
}
```

**Testing Checklist:**
- [ ] GA4 property created in Google Analytics
- [ ] Tracking code added to all pages
- [ ] Events fire on signup, login, template select
- [ ] Publish events tracked with revenue data
- [ ] Can see real-time events in GA4
- [ ] Conversion funnel visible in GA4

---

## 🎯 IMPLEMENTATION ORDER

**Execute in this sequence:**

1. **Start with Task 1 (Payments)** - Most critical for revenue
   - Steps 1-3 first (backend infrastructure)
   - Then step 4 (frontend integration)
   - Finally steps 5-6 (webhooks & helpers)
   - Test thoroughly with Stripe test cards

2. **Then Task 3 (Analytics)** - Quick win while testing payments
   - Add GA4 tracking code (15 minutes)
   - Create analytics.js (30 minutes)
   - Add event calls (30 minutes)
   - Verify events firing (15 minutes)

3. **Finally Task 2 (Site Editing)** - Requires most code changes
   - Backend endpoints first (steps 3)
   - Dashboard UI (steps 1-2)
   - Setup page modifications (step 4)
   - Test edit/update/delete flow

---

## ⚠️ IMPORTANT NOTES

### Environment Variables Needed
Add these to `.env`:
```bash
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_PRO=price_yyy
```

### Testing Stripe
Use these test cards:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Requires 3DS: 4000 0025 0000 3155

### File Locations
- Backend: `server.js`
- Dashboard: `public/dashboard.html`
- Setup wizard: `public/setup.html`
- Site renderer: `public/app.js`

### Success Criteria
- ✅ Users can pay via Stripe and publish sites
- ✅ Users can edit published sites from dashboard
- ✅ All key events tracked in Google Analytics
- ✅ No breaking changes to existing functionality

---

## 🚀 READY TO IMPLEMENT

These three tasks will:
1. **Enable revenue generation** (Task 1)
2. **Improve user retention** (Task 2)
3. **Enable data-driven optimization** (Task 3)

**Estimated total time:** 12-16 hours  
**Business impact:** Transforms platform from demo to revenue-generating product

Proceed with implementation in the order specified above.

