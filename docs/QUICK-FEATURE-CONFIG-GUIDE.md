# ⚡ Quick Feature Configuration Guide

**How easy is it?** ⭐⭐⭐⭐⭐ **VERY EASY** - Single file, simple arrays

---

## 🎯 The Answer: **VERY EASY**

Configuring what each template tier can do is **extremely simple**:

1. ✅ **One file** to edit: `src/utils/planFeatures.js`
2. ✅ **Simple arrays** - just add/remove feature names
3. ✅ **Automatic inheritance** - higher tiers get lower-tier features
4. ✅ **No component changes** needed - they automatically use the config
5. ✅ **Instant changes** - no restart required

---

## 📝 Quick Examples

### Example 1: Add Feature to Starter

**File:** `src/utils/planFeatures.js`

**Find:**
```javascript
starter: [
  FEATURES.CONTACT_FORMS,
  FEATURES.SERVICE_DISPLAY,
  // ... other features
],
```

**Add:**
```javascript
starter: [
  FEATURES.CONTACT_FORMS,
  FEATURES.SERVICE_DISPLAY,
  FEATURES.SHOPPING_CART,  // ✅ Just add this line
  // ... other features
],
```

**Done!** Starter users now have shopping cart.

---

### Example 2: Remove Feature from Premium

**File:** `src/utils/planFeatures.js`

**Find:**
```javascript
premium: [
  ...PLAN_FEATURES.pro,
  FEATURES.LIVE_CHAT,  // Remove this
  FEATURES.ADVANCED_BOOKING,
  // ...
],
```

**Change:**
```javascript
premium: [
  ...PLAN_FEATURES.pro,
  // FEATURES.LIVE_CHAT,  // ✅ Commented out or removed
  FEATURES.ADVANCED_BOOKING,
  // ...
],
```

**Done!** Premium users no longer have live chat.

---

### Example 3: Move Feature to Lower Tier

**File:** `src/utils/planFeatures.js`

**Move `FEATURES.FAQ_SECTION` from Starter to Free:**

**Before:**
```javascript
free: [
  FEATURES.CONTACT_FORMS,
  // FAQ not here
],

starter: [
  FEATURES.FAQ_SECTION,  // Currently Starter-only
  // ...
],
```

**After:**
```javascript
free: [
  FEATURES.CONTACT_FORMS,
  FEATURES.FAQ_SECTION,  // ✅ Moved here
],

starter: [
  // FAQ removed (inherited from Free automatically)
  // ...
],
```

**Done!** FAQ is now available to Free users.

---

## 🔄 How Inheritance Works

```
Free: [A, B]
  ↓
Starter: [A, B, C, D]  // Automatically includes A, B
  ↓
Pro: [A, B, C, D, E, F]  // Automatically includes Starter (A, B, C, D)
  ↓
Premium: [A, B, C, D, E, F, G, H]  // Automatically includes Pro (A-F)
```

**You only define NEW features per tier** - inheritance handles the rest!

---

## 📍 File Location

**Main Configuration:**
- `src/utils/planFeatures.js` - Feature permissions

**Supporting Files (optional changes):**
- `src/config/pricing.config.js` - Pricing and marketing copy
- `server/services/subscriptionService.js` - Backend validation

---

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| Add feature to tier | 30 seconds |
| Remove feature from tier | 15 seconds |
| Move feature between tiers | 1 minute |
| Add new feature | 2 minutes |
| Change all tier permissions | 5 minutes |

---

## ✅ Checklist

To change what a tier can do:

- [ ] Open `src/utils/planFeatures.js`
- [ ] Find `PLAN_FEATURES` object
- [ ] Find the tier (free/starter/pro/premium)
- [ ] Add/remove features from array
- [ ] Save file
- [ ] Done! ✅

**No other steps needed!**

---

## 🎨 Visual Example

**Current Config:**
```javascript
PLAN_FEATURES = {
  free: [A, B],
  starter: [A, B, C, D],
  pro: [A, B, C, D, E, F],
  premium: [A, B, C, D, E, F, G, H]
}
```

**Want to add Feature X to Starter?**

```javascript
PLAN_FEATURES = {
  free: [A, B],
  starter: [A, B, C, D, X],  // ✅ Just add X here
  pro: [A, B, C, D, X, E, F],  // ✅ Automatically includes X
  premium: [A, B, C, D, X, E, F, G, H]  // ✅ Automatically includes X
}
```

**That's it!** One line change, automatic inheritance.

---

## 🚀 Summary

**Difficulty:** ⭐ Very Easy (1/5)

**Time:** ⚡ 30 seconds - 2 minutes per change

**Files:** 📄 1 file (`planFeatures.js`)

**Risk:** ✅ Low (centralized, easy to test)

**Flexibility:** 🎯 High (change anything instantly)

---

**For detailed examples, see:** [CONFIGURING-TEMPLATE-TIER-FEATURES.md](./CONFIGURING-TEMPLATE-TIER-FEATURES.md)






