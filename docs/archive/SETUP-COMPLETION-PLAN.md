# Setup Page - Completion Plan

## Current Status

### ✅ What's Working
- [x] Template selection grid
- [x] Templates load with full demo content
- [x] Publishing flow (draft → publish)
- [x] Three-panel layout (Templates | Editor | Preview)
- [x] Mobile responsive tabs
- [x] Auto-save (30 second intervals)
- [x] Draft management

### ❌ What's Missing/Broken
- [ ] **Editor Panel is Empty** - No actual form fields
- [ ] Image upload functionality
- [ ] Live preview not updating
- [ ] Services/Products editing
- [ ] Contact information editing
- [ ] Color theme picker
- [ ] Preview device toggle

---

## Components to Build

### 1. Business Info Form
**File**: `src/components/setup/forms/BusinessInfoForm.jsx`

```javascript
// Fields needed:
- Business Name (text input)
- Tagline/Subtitle (text input)
- Hero Title (text input)
- Hero Subtitle (textarea)
- Hero Image (image upload)
- Logo (image upload)
- Primary Color (color picker)
- Secondary Color (color picker)
- Accent Color (color picker)
```

**Props**:
- `data` - Current site data
- `onChange` - Callback for field changes

---

### 2. Services Editor
**File**: `src/components/setup/forms/ServicesEditor.jsx`

```javascript
// Features:
- List of services/products
- Add new service button
- Edit service (inline or modal)
- Delete service
- Reorder services (drag & drop - optional for v1)

// Service fields:
- Title (text)
- Description (textarea)
- Price (number)
- Image (image upload - optional)
- Icon (emoji picker or icon selector)
```

**Props**:
- `services` - Array of services
- `onAdd` - Add new service
- `onUpdate` - Update service
- `onDelete` - Delete service
- `onReorder` - Reorder services (optional)

---

### 3. Contact Form
**File**: `src/components/setup/forms/ContactForm.jsx`

```javascript
// Fields:
- Email (email input)
- Phone (tel input with formatting)
- Address (textarea)
- Business Hours (structured input)
- Website URL (url input)
- Facebook URL (url input)
- Instagram URL (url input)
- Twitter URL (url input)
- LinkedIn URL (url input)
- Google Maps URL (url input)
```

**Props**:
- `data` - Current contact data
- `onChange` - Callback for field changes

---

### 4. Image Uploader
**File**: `src/components/setup/forms/ImageUploader.jsx`

```javascript
// Features:
- Drag & drop zone
- Click to browse
- Image preview
- File size validation (max 5MB)
- File type validation (jpg, png, webp)
- Upload progress indicator
- Remove image button
- Optional: Image cropping/resizing

// API:
POST /api/uploads - Upload image, returns URL
```

**Props**:
- `value` - Current image URL
- `onChange` - Callback with new URL
- `label` - Field label
- `aspectRatio` - Optional aspect ratio (e.g., "16:9")
- `maxSize` - Max file size in bytes

---

### 5. Color Picker
**File**: `src/components/setup/forms/ColorPicker.jsx`

```javascript
// Features:
- Color input with preview
- Predefined color palette
- Recent colors
- Hex input field
- RGB sliders (optional)

// Use react-color library or custom
```

**Props**:
- `value` - Current color (hex)
- `onChange` - Callback with new color
- `label` - Field label
- `presets` - Array of preset colors

---

### 6. Business Hours Editor
**File**: `src/components/setup/forms/BusinessHoursEditor.jsx`

```javascript
// Features:
- Day of week checkboxes
- Open/close time pickers for each day
- "Closed" toggle per day
- Quick fill (e.g., "Mon-Fri 9-5")
- Output as formatted string or structured data

// Example output:
"Mon-Fri: 9:00 AM - 5:00 PM, Sat: 10:00 AM - 3:00 PM, Sun: Closed"
```

**Props**:
- `value` - Current hours (string or object)
- `onChange` - Callback with new hours
- `format` - "12h" or "24h"

---

## Updated EditorPanel.jsx

**File**: `src/components/setup/EditorPanel.jsx`

```javascript
import React, { useState } from 'react';
import { useSite } from '../../hooks/useSite';
import BusinessInfoForm from './forms/BusinessInfoForm';
import ServicesEditor from './forms/ServicesEditor';
import ContactForm from './forms/ContactForm';
import './EditorPanel.css';

function EditorPanel() {
  const { siteData, updateField, updateNestedField, addService, updateService, deleteService } = useSite();
  const [activeTab, setActiveTab] = useState('business');

  const renderContent = () => {
    switch (activeTab) {
      case 'business':
        return (
          <BusinessInfoForm
            data={siteData}
            onChange={(field, value) => {
              if (field.includes('.')) {
                updateNestedField(field, value);
              } else {
                updateField(field, value);
              }
            }}
          />
        );
      
      case 'services':
        return (
          <ServicesEditor
            services={siteData.services || []}
            onAdd={addService}
            onUpdate={updateService}
            onDelete={deleteService}
          />
        );
      
      case 'contact':
        return (
          <ContactForm
            data={siteData}
            onChange={(field, value) => {
              if (field.includes('.')) {
                updateNestedField(field, value);
              } else {
                updateField(field, value);
              }
            }}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="editor-panel">
      <div className="editor-tabs">
        <button
          className={`tab-button ${activeTab === 'business' ? 'active' : ''}`}
          onClick={() => setActiveTab('business')}
        >
          🏢 Business
        </button>
        <button
          className={`tab-button ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          ⭐ Services
        </button>
        <button
          className={`tab-button ${activeTab === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          📞 Contact
        </button>
      </div>
      
      <div className="editor-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default EditorPanel;
```

---

## Updated PreviewFrame.jsx

**File**: `src/components/setup/PreviewFrame.jsx`

```javascript
import React, { useEffect, useRef, useState } from 'react';
import { useSite } from '../../hooks/useSite';
import './PreviewFrame.css';

function PreviewFrame() {
  const { siteData } = useSite();
  const iframeRef = useRef(null);
  const [device, setDevice] = useState('desktop'); // desktop, tablet, mobile

  useEffect(() => {
    // Update preview when siteData changes
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // Send updated data to preview iframe
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_SITE_DATA',
        data: siteData
      }, '*');
    }
  }, [siteData]);

  const getIframeStyle = () => {
    switch (device) {
      case 'mobile':
        return { width: '375px', height: '667px' };
      case 'tablet':
        return { width: '768px', height: '1024px' };
      case 'desktop':
      default:
        return { width: '100%', height: '100%' };
    }
  };

  return (
    <div className="preview-frame-container">
      <div className="preview-toolbar">
        <button
          className={`device-toggle ${device === 'desktop' ? 'active' : ''}`}
          onClick={() => setDevice('desktop')}
          title="Desktop view"
        >
          🖥️
        </button>
        <button
          className={`device-toggle ${device === 'tablet' ? 'active' : ''}`}
          onClick={() => setDevice('tablet')}
          title="Tablet view"
        >
          📱
        </button>
        <button
          className={`device-toggle ${device === 'mobile' ? 'active' : ''}`}
          onClick={() => setDevice('mobile')}
          title="Mobile view"
        >
          📱
        </button>
      </div>
      
      <div className="preview-viewport" data-device={device}>
        <iframe
          ref={iframeRef}
          src="/preview.html"
          title="Site Preview"
          style={getIframeStyle()}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}

export default PreviewFrame;
```

---

## Preview System

### Option 1: Static Preview HTML (Simple)
Create `public/preview.html` that listens for postMessage and updates the DOM.

```html
<!-- public/preview.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <link rel="stylesheet" href="/app.css">
</head>
<body>
  <div id="preview-root"></div>
  
  <script src="/app.js"></script>
  <script>
    window.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_SITE_DATA') {
        const siteData = event.data.data;
        // Call existing render function with new data
        if (window.renderClassicSite) {
          window.renderClassicSite(siteData);
        }
      }
    });
  </script>
</body>
</html>
```

**Pros**: Uses existing rendering code, simple
**Cons**: Not as real-time, requires postMessage

---

### Option 2: Real-time Preview (Complex)
Generate HTML in React and inject into iframe.

**Pros**: True real-time preview
**Cons**: More complex, may have performance issues

**Recommended**: Start with Option 1

---

## Implementation Order

### Step 1: Basic Form Fields (1-2 days)
1. Create `BusinessInfoForm.jsx` with basic text inputs
2. Wire up to `useSite()` context
3. Test field updates work
4. Add validation

**Result**: Can edit business name, hero text

---

### Step 2: Image Upload (1 day)
1. Create `ImageUploader.jsx` component
2. Add to BusinessInfoForm
3. Create upload API endpoint (if not exists)
4. Test image upload and preview

**Result**: Can upload logo and hero image

---

### Step 3: Services Editor (1-2 days)
1. Create `ServicesEditor.jsx` component
2. Add service form (add/edit modal)
3. Wire up add/update/delete
4. Test with template services

**Result**: Can manage services list

---

### Step 4: Contact Form (1 day)
1. Create `ContactForm.jsx` component
2. Add all contact fields
3. Create `BusinessHoursEditor.jsx`
4. Wire up to context

**Result**: Can edit contact info

---

### Step 5: Color Picker (1 day)
1. Install `react-color` or create custom
2. Create `ColorPicker.jsx` wrapper
3. Add to BusinessInfoForm
4. Apply colors to preview

**Result**: Can customize theme colors

---

### Step 6: Live Preview (1-2 days)
1. Update `PreviewFrame.jsx` with device toggle
2. Set up postMessage communication
3. Test preview updates
4. Add loading state

**Result**: Live preview works

---

### Step 7: Polish (1 day)
1. Add loading states
2. Add validation messages
3. Improve UX (tooltips, help text)
4. Test mobile layout
5. Fix any bugs

**Result**: Production-ready editor

---

## Total Estimate: 8-10 days

---

## API Endpoints Needed

### Image Upload
```javascript
POST /api/uploads
Content-Type: multipart/form-data

Request:
{
  file: <File>,
  userId: string,
  siteId: string (optional)
}

Response:
{
  success: true,
  url: "/uploads/1234567890-image.jpg",
  filename: "image.jpg",
  size: 123456
}
```

### Draft Save (Already exists)
```javascript
POST /api/drafts
Authorization: Bearer <token>

Request:
{
  data: { ...siteData },
  template: "restaurant"
}

Response:
{
  success: true,
  draftId: "abc123"
}
```

---

## Testing Checklist

### Business Info Form
- [ ] Can type business name
- [ ] Can edit hero title/subtitle
- [ ] Can upload logo image
- [ ] Can upload hero image
- [ ] Can pick primary color
- [ ] Can pick secondary color
- [ ] Changes reflect in preview
- [ ] Changes are saved to draft

### Services Editor
- [ ] Can see existing services
- [ ] Can add new service
- [ ] Can edit service name/description/price
- [ ] Can delete service
- [ ] Changes reflect in preview
- [ ] Changes are saved to draft

### Contact Form
- [ ] Can edit email
- [ ] Can edit phone (with formatting)
- [ ] Can edit address
- [ ] Can edit business hours
- [ ] Can add social media links
- [ ] Changes reflect in preview
- [ ] Changes are saved to draft

### Preview
- [ ] Preview shows changes in real-time
- [ ] Desktop view works
- [ ] Tablet view works
- [ ] Mobile view works
- [ ] Preview updates when switching tabs

### Publishing
- [ ] Can publish with edited content
- [ ] Published site shows all changes
- [ ] Images are included
- [ ] Colors are applied
- [ ] Contact info is correct

---

## Next Steps

**This Week**:
1. Build BusinessInfoForm with text inputs
2. Add ImageUploader component
3. Test basic editing and preview

**Next Week**:
1. Build ServicesEditor
2. Build ContactForm
3. Add ColorPicker
4. Test full editing workflow

**Goal**: Complete, functional editor by end of Week 2

---

## Success Criteria

The Setup page is complete when:
- [ ] All form fields render
- [ ] Can edit all template data
- [ ] Can upload images
- [ ] Can customize colors
- [ ] Live preview updates in real-time
- [ ] Device preview toggle works
- [ ] Auto-save works
- [ ] Manual save works
- [ ] Publishing works end-to-end
- [ ] Mobile responsive
- [ ] No console errors
- [ ] User testing feedback positive

---

**Current Priority**: Build form components (BusinessInfoForm, ServicesEditor, ContactForm)
**Blocker**: None - all dependencies in place
**Risk**: Preview system may need iteration

