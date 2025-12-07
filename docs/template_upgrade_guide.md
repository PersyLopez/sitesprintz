# Template Upgrade Guide: Design 2.0

## Overview
This guide provides instructions for updating legacy SiteSprintz templates (`public/data/templates/*.json`) to the **Design 2.0** standard.
The goal is to move from "Basic/Plain" designs to "Premium" aesthetics using the new features in `site-template.html`.

## Key Features to Enable
1.  **Split Hero Layout**: Side-by-side text and image (vs. centered text).
2.  **Premium Color Palettes**: Sophisticated `themeVars` sets.
3.  **High-Res Imagery**: Ensuring `hero.image` is high quality and suitable for split layouts.

## Step-by-Step Instructions

### 1. Select a Template
Pick a `.json` file from `public/data/templates/` (e.g., `agency.json`, `gym.json`).

### 2. Update `themeVars`
Replace the existing `themeVars` object with one of the **Premium Presets** below. choose the one that best fits the industry.

#### Preset A: Midnight Luxury (Consulting, Finance, High-End Dining)
```json
"themeVars": {
  "color-primary": "#0f172a",
  "color-primary-light": "#334155",
  "color-accent": "#d4af37",
  "color-surface": "rgba(255, 255, 255, 0.03)",
  "color-card": "rgba(255, 255, 255, 0.06)",
  "color-text": "#f8fafc",
  "color-muted": "#94a3b8",
  "color-bg": "#020617"
}
```

#### Preset B: Neon Tech (SaaS, Gaming, Fitness, Nightlife)
```json
"themeVars": {
  "color-primary": "#3b82f6",
  "color-primary-light": "#60a5fa",
  "color-accent": "#ec4899", 
  "color-bg": "#0F172A",
  "color-surface": "rgba(30, 41, 59, 0.5)",
  "color-card": "rgba(30, 41, 59, 0.3)",
  "color-text": "#f1f5f9",
  "color-muted": "#94a3b8"
}
```

#### Preset C: Clean Scandinavian (Retail, Health, Salon, Home)
```json
"themeVars": {
  "color-primary": "#475569",
  "color-primary-light": "#94a3b8",
  "color-accent": "#e2e8f0",
  "color-bg": "#ffffff",
  "color-surface": "#f8fafc",
  "color-card": "#ffffff",
  "color-text": "#1e293b",
  "color-muted": "#64748b"
}
```

### 3. Upgrade Hero Section
Modify the `hero` object to enable split layout.

**Requirements:**
*   Add `"layout": "split"`
*   Ensure `image` URL is valid (Unsplash URLs preferred).
*   Ensure `imageAlt` is descriptive.

```json
  "hero": {
    "layout": "split",
    "eyebrow": "Welcome to [Brand Name]",
    "title": "[Compelling Headline]",
    "subtitle": "[Subheadline describing value prop]",
    "image": "https://images.unsplash.com/photo-...",
    "imageAlt": "Descriptive alt text",
    "cta": [...]
  }
```

### 4. Verify
*   Ensure JSON syntax is valid (no trailing commas).
*   Check that contrast ratios remain accessible with the new colors.

## Example Upgrade
**Before (Legacy):**
```json
"themeVars": { "color-primary": "blue" },
"hero": { "title": "Welcome", "image": "..." }
```

**After (Design 2.0):**
```json
"themeVars": {
  "color-primary": "#0f172a",
  "color-primary-light": "#334155",
  "color-bg": "#020617",
  ...
},
"hero": {
  "layout": "split",
  "title": "Welcome",
  "image": "..."
}
```
