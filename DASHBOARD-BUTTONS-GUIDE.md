# Dashboard Button Behaviors - Complete Guide

**Date:** November 5, 2025

---

## 🎯 Button Behaviors by Site Status

### Published Sites

```
┌─────────────────────────────────────────────────────────────┐
│  SiteCard (Published Site)                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 QuickLube Express Auto                                  │
│  ✅ Published                                               │
│  Plan: starter                                              │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ 🌐 View  │  │ ✏️ Edit  │  │ 📋 Dup   │  │ 🗑️ Del   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│       ↓              ↓             ↓             ↓         │
│   Opens in     Opens with    Duplicates    Confirms      │
│   new tab      Visual        site         & deletes     │
│               Editor                                      │
└─────────────────────────────────────────────────────────────┘
```

**View Button:**
- Opens: `http://localhost:3000/sites/{subdomain}/`
- Target: `_blank` (new tab)
- Purpose: View live site

**Edit Button:**
- Opens: `http://localhost:3000/sites/{subdomain}/?edit=true&token={jwt}`
- Target: Same tab
- Purpose: Activate visual editor for on-page editing

---

### Draft Sites

```
┌─────────────────────────────────────────────────────────────┐
│  SiteCard (Draft Site)                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📝 My New Business                                         │
│  📝 Draft                                                   │
│  Template: salon                                            │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │👁️Preview│  │ ✏️ Edit  │  │ 📋 Dup   │  │ 🗑️ Del   │  │
│  │(disabled)│  └──────────┘  └──────────┘  └──────────┘  │
│  └──────────┘       ↓             ↓             ↓         │
│                Opens Setup   Duplicates    Confirms      │
│                Page          draft         & deletes     │
└─────────────────────────────────────────────────────────────┘
```

**Preview Button:**
- Status: Disabled
- Reason: Draft not yet generated

**Edit Button:**
- Opens: `/setup?site={siteId}`
- Target: Same tab
- Purpose: Continue editing in Setup flow

---

## 🔄 Complete User Flows

### Flow 1: Edit Published Site

```
Dashboard
   │
   │ Click "Edit" on published site
   ↓
Site opens with ?edit=true&token=...
   │
   │ Server injects visual-editor.js
   ↓
Visual Editor Initializes
   │
   ├── Inline text editing enabled
   ├── Card/service editing enabled
   ├── Image upload enabled
   ├── Color picker enabled
   ├── Auto-save enabled
   ├── Undo/Redo enabled
   └── Version history enabled
   │
   │ User makes changes
   ↓
Changes auto-saved to site.json
   │
   │ User closes tab
   ↓
Return to Dashboard
   │
   │ Click "View" to see changes
   ↓
Live site reflects all edits ✅
```

### Flow 2: Edit Draft Site

```
Dashboard
   │
   │ Click "Edit" on draft site
   ↓
Setup Page Opens
   │
   ├── Select different template
   ├── Edit business info
   ├── Add services/products
   ├── Customize colors
   └── Upload images
   │
   │ Make changes (auto-saves)
   ↓
Click "Publish"
   │
   ↓
Site published → becomes "Published" status
   │
   ↓
Back to Dashboard
   │
   │ Now shows as Published
   │ Edit button → Visual Editor
   └── View button → Live site
```

---

## 🛠️ Technical Implementation

### SiteCard Component Logic

```javascript
// Conditional Edit Button Rendering
{site.status === 'published' && site.subdomain ? (
  // Published → Visual Editor
  <a href={`/sites/${site.subdomain}/?edit=true&token=${token}`}>
    Edit
  </a>
) : (
  // Draft → Setup Page
  <Link to={`/setup?site=${site.id}`}>
    Edit
  </Link>
)}
```

### Server Route Handler

```javascript
app.get('/sites/:subdomain/', async (req, res, next) => {
  const editMode = req.query.edit === 'true';
  const token = req.query.token;
  
  if (editMode && token) {
    // Read HTML, inject visual editor script
    let html = await fs.readFile(siteIndexFile, 'utf-8');
    html = html.replace('</body>', `
      <script>
        // Load visual-editor.js with token
        const script = document.createElement('script');
        script.src = '/visual-editor.js';
        script.dataset.token = '${token}';
        script.dataset.subdomain = '${subdomain}';
        document.body.appendChild(script);
      </script>
    </body>`);
    res.send(html);
  } else {
    // Normal view
    res.sendFile(siteIndexFile);
  }
});
```

---

## 🎨 Visual Editor Features

### Toolbar (Top of Page)
```
┌────────────────────────────────────────────────────────────┐
│  🎨 Editing Mode                                           │
│  ⏮️ Undo  ⏭️ Redo  💾 Save  📜 History  📥 Export  🔄 Reset │
└────────────────────────────────────────────────────────────┘
```

### Editing Capabilities

1. **Text Editing**
   - Click any text → Inline editable
   - Real-time updates
   - Auto-save on blur

2. **Card/Service Editing**
   - Click service card → Edit modal
   - Update name, description, price
   - Change images
   - Delete service

3. **Image Editing**
   - Click image → Upload new
   - Drag & drop support
   - Preview before save

4. **Color Editing**
   - Click color areas → Color picker
   - Update primary/accent colors
   - Live preview

5. **Auto-Save**
   - Saves after 2 seconds of inactivity
   - Visual feedback ("Saving..." → "Saved ✓")
   - Queue system for multiple rapid edits

6. **Undo/Redo**
   - Ctrl+Z / Cmd+Z to undo
   - Ctrl+Y / Cmd+Y to redo
   - Full change history stack

7. **Version History**
   - View past versions
   - Restore any version
   - Compare changes

---

## ✅ Advantages of This Approach

### For Users
- ✨ Seamless editing experience
- 🎯 See changes exactly as they'll appear
- 💨 Fast - no page reloads
- 📱 Works on mobile
- 💾 Auto-saves - no data loss

### For Developers
- 🔧 No need to regenerate old sites
- 🚀 Dynamic injection - scalable
- 🔒 Secure - token required
- 🎭 Zero impact on normal viewing
- 📦 Single visual-editor.js file

### For System
- ⚡ Performance - only loads when needed
- 🗄️ Storage - no duplicate files
- 🔄 Updates - change one file affects all
- 🐛 Debugging - centralized logic
- 🧪 Testing - one implementation

---

## 📋 Button Action Summary

| Button | Published Sites | Draft Sites |
|--------|----------------|-------------|
| **View** | Opens live site in new tab | Disabled (grayed out) |
| **Edit** | Opens with Visual Editor | Opens in Setup Page |
| **Duplicate** | Creates copy (same status) | Creates copy (same status) |
| **Delete** | Confirms & deletes | Confirms & deletes |

---

## 🔐 Security

### Authentication
- Token required for edit mode
- Token from `localStorage.getItem('token')`
- Server validates token before allowing edits

### Authorization
- Users can only edit their own sites
- Admin users can edit any site
- Guest users cannot edit

### API Endpoints
All visual editor changes go through:
- `POST /api/sites/:subdomain/session` - Create edit session
- `PATCH /api/sites/:subdomain` - Save changes
- `POST /api/sites/:subdomain/history` - Version history
- `POST /api/sites/:subdomain/restore/:versionId` - Restore version

---

**Status:** ✅ COMPLETE & TESTED  
**Last Updated:** November 5, 2025


