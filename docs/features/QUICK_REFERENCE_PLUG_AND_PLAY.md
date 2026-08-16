---
title: "Plug-and-Play Feature Builder - Developer Quick Reference"
category: Developer Guide
---

# Quick Reference Guide

## For Site Owners (Page Builder Users)

### Adding a Section
1. Go to Page Builder tab in Site Editor
2. Click "+ Add Section"
3. Browse available sections or filter by category
4. Click a section to add it
5. Configure section settings in the inline editor

### Removing a Section
1. Find section in "Current Sections" list
2. Click red 🗑️ trash icon
3. Confirm deletion

### Reordering Sections
1. Click and drag section from drag handle (≡)
2. Drop in new position
3. Automatically saves order

### Managing Section Visibility
1. Click 👁️ (visible) or 🚫 (hidden) toggle
2. Hidden sections won't appear in preview or published site

---

## For Developers (Integration & Extension)

### Load and Normalize a Template

```javascript
import { normalizeTemplateSections } from '@/utils/sectionNormalizer.js';

const templateData = await fetch(`/api/templates/${templateId}`).then(r => r.json());
const sections = normalizeTemplateSections(templateData);
// sections = [ {id, type, enabled, order, settings, content}, ... ]
```

### Render Sections

```javascript
import { renderAllSections } from '@/utils/unifiedRenderer.js';

const rendered = renderAllSections(sections, siteData, renderContext);
// rendered = array of rendered components
```

### Check Feature Access

```javascript
import { usePlan } from '@/hooks/usePlan';
import { canAccessSection } from '@/config/sectionRegistry.js';

const { plan } = usePlan();

if (canAccessSection(plan, 'checkout')) {
  // User can use checkout section
}
```

### Publish a Site

```javascript
import { preparePublishPayload } from '@/services/publishService.js';

const payload = preparePublishPayload(draftData, userPlan);
// payload = { businessData: {...}, publishSettings: {...} }

const response = await fetch(`/api/drafts/${draftId}/publish`, {
  method: 'POST',
  body: JSON.stringify(payload)
});
```

### Add a New Section Type

1. Add to `public/data/section-registry.json`:
```json
{
  "type": "my-widget",
  "name": "My Widget",
  "category": "premium-modules",
  "icon": "🎨",
  "requiredTier": "growth",
  "defaultSettings": {...},
  "defaultContent": {...}
}
```

2. Update `src/utils/unifiedRenderer.js`:
```javascript
function renderMyWidget(section, siteData, ctx) {
  // Rendering logic
  return { type: 'my-widget', ... };
}

// In renderers object:
'my-widget': renderMyWidget
```

3. Optionally add editor in `src/components/setup/SectionEditors.jsx`

### Apply Admin Overrides

```javascript
import { mergeWithAdminOverrides } from '@/services/adminSectionsService.js';

const sections = getAllSections();
const overrides = await AdminSectionsService.getSectionOverrides();

const effective = mergeWithAdminOverrides(sections, overridesMap);
```

---

## API Reference

### Tier System

```javascript
import { 
  TIERS, 
  TIER_HIERARCHY, 
  normalizeTier, 
  hasTierAccess 
} from '@/config/tiers.js';

TIERS.TRIAL    // 'trial'
TIERS.STARTER  // 'starter'
TIERS.GROWTH   // 'growth'
TIERS.PRO      // 'pro'
TIERS.PREMIUM  // 'premium'

normalizeTier('free')       // → 'trial'
normalizeTier('business')   // → 'pro'

hasTierAccess('pro', 'growth')     // true (pro >= growth)
hasTierAccess('starter', 'growth') // false (starter < growth)
```

### Section Registry

```javascript
import {
  getAllSections,
  getSectionByType,
  getSectionsByCategory,
  getAllCategories,
  getSectionsForNiche,
  canAccessSection,
  createSectionInstance
} from '@/config/sectionRegistry.js';

getAllSections()                     // All ~25 sections
getSectionByType('hero')             // Single section definition
getSectionsByCategory('premium-modules')
getAllCategories()                   // ['core', 'media', ...]
getSectionsForNiche('restaurant')    // Applicable sections
canAccessSection('growth', 'calculator')  // true/false
createSectionInstance('hero', {...}) // New instance with ID
```

### Rendering

```javascript
import { 
  renderAllSections, 
  getRendererForType 
} from '@/utils/unifiedRenderer.js';

renderAllSections(sections, siteData, renderContext)
// → array of rendered items

getRendererForType('services')
// → function(section, siteData, ctx) => rendered
```

### Publishing

```javascript
import {
  buildPublishableContent,
  validatePublishedContent,
  preparePublishPayload,
  applyTierFiltering
} from '@/services/publishService.js';

buildPublishableContent(draft, 'pro')     // Full site.json
validatePublishedContent(content)         // {valid, errors}
preparePublishPayload(draft, 'pro')       // API payload
applyTierFiltering(sections, 'starter')   // Filtered sections
```

### Admin Services

```javascript
import {
  AdminSectionsService,
  mergeWithAdminOverrides
} from '@/services/adminSectionsService.js';

await AdminSectionsService.getSectionOverrides()
await AdminSectionsService.updateSectionOverride(type, override)
await AdminSectionsService.disableSection('checkout')
await AdminSectionsService.enableSection('checkout')
await AdminSectionsService.setTierOverride('calculator', 'starter')
await AdminSectionsService.resetSection('calculator')

mergeWithAdminOverrides(sections, overrides)
```

---

## Common Patterns

### Check if user can add a section during editing

```javascript
import { canAccessSection } from '@/config/sectionRegistry.js';

const allowedSections = availableSections.filter(s => 
  canAccessSection(userPlan, s.type)
);
```

### Apply tier filtering before publishing

```javascript
import { applyTierFiltering } from '@/services/publishService.js';

const publishable = applyTierFiltering(draft.sections, userPlan);
// publishable won't include pro/premium sections if user is starter
```

### Create a section and add to site

```javascript
import { createSectionInstance } from '@/config/sectionRegistry.js';

const newSection = createSectionInstance('gallery', {
  order: currentSections.length,
  content: { title: 'My Gallery' }
});

const updated = [...sections, newSection];
saveSite({ ...siteData, sections: updated });
```

### Disable a section globally (admin only)

```javascript
import { AdminSectionsService } from '@/services/adminSectionsService.js';

await AdminSectionsService.disableSection('checkout');
// All users: checkout section now hidden from Page Builder and renders as empty
```

---

## File Locations

| Component | Location |
|-----------|----------|
| Tier config | `src/config/tiers.js` |
| Registry | `public/data/section-registry.json` + `src/config/sectionRegistry.js` |
| Normalization | `src/utils/sectionNormalizer.js` |
| Rendering | `src/utils/unifiedRenderer.js` |
| Page Builder UI | `src/components/setup/PageBuilder.jsx` + `.css` |
| Section Editors | `src/components/setup/SectionEditors.jsx` |
| Publishing | `src/services/publishService.js` |
| Admin Service | `src/services/adminSectionsService.js` |
| Admin Routes | `server/routes/admin-sections.routes.js` |
| Tests | `src/__tests__/plugAndPlay.test.js` |

---

## Debugging Tips

### Why isn't my section showing up?

1. Check if section is in registry: `getSectionByType('my-section')`
2. Check if section is enabled: `section.enabled !== false`
3. Check if user has tier access: `canAccessSection(userPlan, 'my-section')`
4. Check if section is in admin overrides as disabled
5. Check if renderer exists: `getRendererForType('my-section')`

### Why doesn't custom template publish?

1. Check if sections[] is in canonical form: each item has {id, type, enabled, order, settings, content}
2. Validate with: `validatePublishedContent(publishData)`
3. Ensure hero and contact sections exist (required)
4. Check tier filtering: sections might be removed if over user's tier

### Why are section settings not persisting?

1. Ensure section editor is calling `onChange()` callback
2. Check that `updateField('sections', updated)` is called in useSite hook
3. Verify save request includes full sections[] array
4. Check browser DevTools Network tab for save failures

---

## Testing Checklist

Before deploying new sections or features:

- [ ] Run: `npm test plugAndPlay.test.js`
- [ ] Section appears in Page Builder
- [ ] Can add section
- [ ] Can remove section
- [ ] Can reorder sections
- [ ] Can toggle section visibility
- [ ] Upgrade prompt shows for locked sections
- [ ] Section renders in preview
- [ ] Section renders when published
- [ ] Tier gating works (user without tier can't publish)
- [ ] All 12 niches still render without errors

---

## Related Documentation

| Topic | Doc |
|-------|-----|
| Full implementation | [PLUG_AND_PLAY_IMPLEMENTATION.md](./PLUG_AND_PLAY_IMPLEMENTATION.md) |
| Feature status | [QUICK_REFERENCE_STATUS.md](./QUICK_REFERENCE_STATUS.md) |
| Tier configuration | [../development/CONFIGURING-TEMPLATE-TIER-FEATURES.md](../development/CONFIGURING-TEMPLATE-TIER-FEATURES.md) |
| Architecture | [../ARCHITECTURE.md](../ARCHITECTURE.md) |
| Tests | `src/__tests__/plugAndPlay.test.js` |

**Doc index**: [../README.md](../README.md)  
**Maintaining docs**: Update this file — [../governance/AGENT_DOCUMENTATION_GUIDE.md](../governance/AGENT_DOCUMENTATION_GUIDE.md)

*Last updated: June 2026*
