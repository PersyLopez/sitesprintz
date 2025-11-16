# 🚀 FOUNDATION FEATURES - QUICK REFERENCE

**Last Updated:** November 14, 2025  
**Version:** 1.0.0  
**Status:** Production Ready

---

## 📂 Key Files

```
Client Side:
  📄 public/modules/foundation.js              Core feature module

Server Side:
  📄 server/routes/foundation.routes.js        API endpoints
  📄 server.js (lines ~26, 167-169, 3677)      Integration points

Dashboard:
  📄 src/pages/FoundationSettingsPage.jsx      Settings page
  📄 src/pages/FoundationSettingsPage.css      Page styles
  📄 src/components/dashboard/FoundationSettings.jsx   Settings UI
  📄 src/components/dashboard/FoundationSettings.css   UI styles
  📄 src/pages/Dashboard.jsx (lines ~205-207)  Nav button
  📄 src/App.jsx (lines ~19, 77-84)            Route

Tests:
  📄 tests/unit/foundation-trust-signals.test.js        12 tests
  📄 tests/integration/foundation-config-api.test.js    14 tests

Docs:
  📄 FOUNDATION-FEATURES-COMPLETE.md           Full guide
  📄 FOUNDATION-DEPLOYMENT-READY.md            Deploy checklist
  📄 FOUNDATION-EXECUTIVE-SUMMARY.md           Executive summary
  📄 FOUNDATION-PROGRESS-REPORT.md             Visual report
  📄 FOUNDATION-INTEGRATION-TEST-PLAN.md       Test plan
```

---

## 🔌 API Endpoints

```bash
# Get configuration for a site
GET /api/foundation/config/:subdomain

# Update configuration
PUT /api/foundation/config/:subdomain
Body: { "foundation": { ...config } }

# Submit contact form
POST /api/foundation/contact
Body: { "name", "email", "phone", "message", "subdomain" }

# Get submissions for a site
GET /api/foundation/submissions/:subdomain
```

---

## 🎨 Configuration Schema

```javascript
{
  foundation: {
    // Trust Signals
    trustSignals: {
      enabled: boolean,
      yearsInBusiness: number,
      showSSLBadge: boolean,
      showVerifiedBadge: boolean,
      showPaymentIcons: boolean
    },
    
    // Contact Form
    contactForm: {
      enabled: boolean,
      recipientEmail: string,
      autoResponder: {
        enabled: boolean,
        message: string
      }
    },
    
    // SEO
    seo: {
      enabled: boolean,
      businessType: string,
      customMetaDescription: string,
      autoGenerateAltTags: boolean,
      lazyLoadImages: boolean
    },
    
    // Social Media
    socialMedia: {
      enabled: boolean,
      profiles: {
        facebook: string,
        instagram: string,
        twitter: string,
        linkedin: string,
        youtube: string
      },
      position: 'header' | 'footer'
    },
    
    // Contact Bar
    contactBar: {
      enabled: boolean,
      phone: string,
      email: string,
      position: 'floating' | 'fixed',
      showOnMobile: boolean
    }
  }
}
```

---

## 🧪 Running Tests

```bash
# All foundation tests
npm test -- tests/unit/foundation-trust-signals.test.js tests/integration/foundation-config-api.test.js

# Unit tests only
npm test -- tests/unit/foundation-trust-signals.test.js

# Integration tests only
npm test -- tests/integration/foundation-config-api.test.js

# All tests (entire project)
npm test
```

---

## 🔧 Common Tasks

### Add a New Feature to Foundation:

1. **Client Side** (`public/modules/foundation.js`):
   ```javascript
   function initNewFeature(config, siteData) {
     if (!config.enabled) return;
     // Feature implementation
   }
   ```

2. **Default Config** (same file):
   ```javascript
   const defaultConfig = {
     newFeature: {
       enabled: false,
       // ... settings
     }
   };
   ```

3. **Dashboard UI** (`src/components/dashboard/FoundationSettings.jsx`):
   - Add new tab in `settings-tabs`
   - Add new panel in `settings-content`

4. **Tests**:
   - Add unit tests in `tests/unit/`
   - Add integration tests if API involved

### Enable Feature for a Site:

1. Navigate to `/foundation-settings` in dashboard
2. Select site from sidebar
3. Click feature tab
4. Toggle "Enable [Feature]"
5. Configure settings
6. Click "Save Settings"

### Debug Feature Issues:

1. **Check browser console** - foundation.js logs errors
2. **Check API response** - `/api/foundation/config/:subdomain`
3. **Check database** - `sites.site_data.foundation` column
4. **Check tests** - Run automated tests
5. **Check server logs** - API endpoint errors

---

## 📊 Feature Status

```
Feature           | Status | Tests | Docs | Plan
------------------|--------|-------|------|------
Trust Signals     |   ✅   |  ✅   |  ✅  | Starter
Contact Forms     |   ✅   |  ✅   |  ✅  | Starter
SEO Optimization  |   ✅   |  ✅   |  ✅  | Starter
Social Media Hub  |   ✅   |  ✅   |  ✅  | Starter
Contact Bar       |   ✅   |  ✅   |  ✅  | Starter
```

---

## 🎯 Plan-Based Features

```
Starter (FREE):
  ✅ All 5 basic features

Pro ($29/mo):
  ⏳ Trust Signals Pro (custom badges, counters)
  ⏳ Contact Forms Pro (multi-step, files, Zapier)
  ⏳ SEO Dashboard Pro (scores, recommendations)
  ⏳ Social Feeds Pro (Instagram, Twitter feeds)
  ⏳ Chat Integration Pro (WhatsApp, SMS)
  ⏳ Email Marketing Pro (newsletters, 500 subs)

Premium ($99/mo):
  ⏳ AI Content Assistant
  ⏳ Live Chat + AI Chatbot
  ⏳ Email Automation (5K subs, sequences)
  ⏳ Smart Notifications (SMS/Push)
  ⏳ Appointment Scheduling
  ⏳ Customer Portal
  ⏳ Advanced Automations
```

---

## 🐛 Troubleshooting

### Foundation.js not loading:
- Check `server.js` injection (line ~3677)
- Verify `/modules/foundation.js` is accessible
- Check browser console for 404 errors

### Features not rendering:
- Verify `data-site-plan` and `data-subdomain` attributes
- Check API response: `/api/foundation/config/:subdomain`
- Ensure `enabled: true` in configuration

### Configuration not saving:
- Check authentication token
- Verify API endpoint: `PUT /api/foundation/config/:subdomain`
- Check database `site_data` column

### Contact form not working:
- Verify `recipientEmail` is configured
- Check honeypot field is hidden (spam protection)
- Check API: `POST /api/foundation/contact`
- Check submissions table in database

---

## 📚 Documentation Index

| Document | Purpose | Audience |
|----------|---------|----------|
| `FOUNDATION-FEATURES-COMPLETE.md` | Full implementation guide | Developers |
| `FOUNDATION-DEPLOYMENT-READY.md` | Deployment checklist | DevOps |
| `FOUNDATION-EXECUTIVE-SUMMARY.md` | Business overview | Management |
| `FOUNDATION-PROGRESS-REPORT.md` | Visual progress report | All |
| `FOUNDATION-INTEGRATION-TEST-PLAN.md` | Test strategy | QA/Devs |
| `QUICK-REFERENCE.md` | This file | Developers |

---

## 🔗 Related Files

```
Share Cards Feature:
  📄 SHARE-CARDS-IMPLEMENTATION-COMPLETE.md
  📄 server/routes/share.routes.js
  📄 public/modules/visitor-share-widget.js

Templates:
  📄 public/data/templates/*.json
  📄 STARTER-TEMPLATES-CORRECTED-ANALYSIS.md

Backlog:
  📄 BACKLOG.md (Pro & Premium features)
```

---

## 💡 Quick Tips

1. **Always test locally first** - Run tests before committing
2. **Use TDD** - Write tests first, then implement
3. **Check browser console** - Most issues show errors there
4. **Read the docs** - Comprehensive guides available
5. **Ask for help** - Check documentation index above

---

## 📞 Support

**Documentation:** See `FOUNDATION-FEATURES-COMPLETE.md`  
**Tests:** Run `npm test -- tests/unit/foundation-trust-signals.test.js`  
**API Docs:** See `FOUNDATION-DEPLOYMENT-READY.md` (API section)

---

**Last Updated:** November 14, 2025  
**Maintained By:** SiteSprintz Development Team


