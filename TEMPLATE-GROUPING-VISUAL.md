# Template Grouping - Visual Guide

## 🎨 New Template Selection Interface

```
┌─────────────────────────────────────────────────────────────────┐
│                      TEMPLATE SELECTION                         │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  🔍  [Search templates...]                            [×]  │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  Group by:  [📁 Category] [⭐ Plan] [📋 All]             │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  Filter:    [All] [Pro] [Checkout] [Starter]              │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │  Showing 72 of 72 templates                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  🍽️ Food & Dining                                          10  │
│  ┌─────────────┬─────────────┬─────────────┐                  │
│  │ [Pro]       │ [Checkout]  │ [Starter]   │                  │
│  │ Restaurant  │ Restaurant  │ Restaurant  │                  │
│  │ Pro         │ Ordering    │ Fine Dining │                  │
│  │ ✓ Selected  │             │             │                  │
│  └─────────────┴─────────────┴─────────────┘                  │
│                                                                 │
│  💇 Beauty & Wellness                                       6   │
│  ┌─────────────┬─────────────┬─────────────┐                  │
│  │ [Pro]       │ [Checkout]  │ [Starter]   │                  │
│  │ Salon Pro   │ Salon       │ Salon Hair  │                  │
│  └─────────────┴─────────────┴─────────────┘                  │
│                                                                 │
│  💪 Fitness & Health                                        5   │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Grouping Options

### Option 1: Group by Category (Default)

```
📁 Category View
├── 🍽️ Food & Dining (10)
│   ├── Restaurant Pro [Pro]
│   ├── Restaurant Ordering [Checkout]
│   ├── Restaurant Fine Dining [Starter]
│   └── ...
├── 💇 Beauty & Wellness (6)
│   ├── Salon Pro [Pro]
│   ├── Salon [Checkout]
│   ├── Salon Hair [Starter]
│   └── ...
├── 💪 Fitness & Health (5)
├── 💼 Professional Services (8)
└── ...12 more categories
```

### Option 2: Group by Plan

```
⭐ Plan View
├── Pro Templates (12)
│   ├── 🍽️ Restaurant Pro
│   ├── 💇 Salon Pro
│   ├── 💪 Gym Pro
│   └── ...
├── Checkout Templates (12)
│   ├── 🍽️ Restaurant Ordering
│   ├── 💇 Salon
│   ├── 💪 Gym
│   └── ...
└── Starter Templates (50+)
    ├── 🍽️ Restaurant Fine Dining
    ├── 🍽️ Restaurant Casual
    ├── 💇 Salon Hair
    └── ...
```

### Option 3: Show All

```
📋 All Templates (72)
├── 🍽️ Restaurant Pro [Pro]
├── 💇 Salon Pro [Pro]
├── 🍽️ Restaurant [Checkout]
├── 💇 Salon [Checkout]
├── 🍽️ Restaurant Fine Dining [Starter]
└── ...68 more templates
```

---

## 🎯 Filter Combinations

### Example: "Pro Templates" + "Group by Category"

```
Filter: [All] [Pro✓] [Checkout] [Starter]
Group by: [📁 Category✓] [⭐ Plan] [📋 All]

🍽️ Food & Dining (1)
├── Restaurant Pro [Pro]

💇 Beauty & Wellness (1)
├── Salon Pro [Pro]

💪 Fitness & Health (1)
├── Gym Pro [Pro]

... (showing 12 of 72 templates)
```

### Example: Search "restaurant" + "Show All"

```
Search: [restaurant            ×]
Group by: [📁 Category] [⭐ Plan] [📋 All✓]

📋 All Templates (8)
├── 🍽️ Restaurant Pro [Pro]
├── 🍽️ Restaurant Ordering [Checkout]
├── 🍽️ Restaurant Fine Dining [Starter]
├── 🍽️ Restaurant Casual [Starter]
├── 🍽️ Restaurant Fast Casual [Starter]
└── ...

(showing 8 of 72 templates)
```

---

## 📱 Template Card Anatomy

```
┌───────────────────────────────────────┐
│ [Pro]                    ✓ Selected   │ ← Tier Badge + Selected Indicator
│                                       │
│         [Hero Image]                  │ ← Template Preview
│                                       │
├───────────────────────────────────────┤
│ Restaurant Pro                        │ ← Template Name
│ Advanced restaurant with booking      │ ← Description
│ and interactive features             │
│ 🍽️ Food & Dining                     │ ← Category (if not grouped by category)
└───────────────────────────────────────┘
```

### Tier Badge Colors

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   Pro    │    │ Checkout │    │  Starter │    │ Premium  │
│   🥇     │    │    💳    │    │    🆓    │    │    👑    │
│  Gold    │    │   Cyan   │    │  Green   │    │  Purple  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## 🔍 Search Examples

### Search: "restaurant"
```
Matches:
✓ Name: "Restaurant Pro"
✓ Name: "Restaurant Ordering"
✓ Description: "...restaurant with booking..."
✓ Category: "Food & Dining" (contains restaurant templates)
✓ Type: "restaurant"
```

### Search: "pro"
```
Matches:
✓ Name: "Restaurant Pro"
✓ Name: "Salon Pro"
✓ Tier: "Pro"
✓ Description: "...professional..."
```

### Search: "booking"
```
Matches:
✓ Description: "...with booking widget..."
✓ Description: "...booking integration..."
```

---

## 🎨 Category Icons & Colors

```
🍽️  Food & Dining         #ef4444  (Red)
💇  Beauty & Wellness      #a855f7  (Purple)
💪  Fitness & Health       #dc2626  (Dark Red)
💼  Professional Services  #0ea5e9  (Blue)
🏠  Home Services          #0891b2  (Teal)
🐾  Pet Services           #7c3aed  (Violet)
💻  Technology             #059669  (Green)
🛍️  Retail                 #f97316  (Orange)
🚗  Automotive             #ef4444  (Red)
🏥  Healthcare             #0369a1  (Dark Blue)
⚖️  Legal                  #1e3a8a  (Navy)
🏘️  Real Estate            #2563eb  (Blue)
🌐  Basic                  #22c55e  (Green)
📄  Other                  #6b7280  (Gray)
```

---

## 🔄 User Flow Diagram

```
┌─────────────┐
│   Landing   │
│     on      │
│   Setup     │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────────────┐
│  Default: Templates Grouped by Category     │
│  🍽️ Food, 💇 Beauty, 💪 Fitness, etc.      │
└──────┬───────────────────┬──────────────────┘
       │                   │
       ↓                   ↓
   Know what          Want to browse
   they want?
       │                   │
       ↓                   ↓
┌─────────────┐      ┌──────────────┐
│   Search    │      │ Scroll thru  │
│  "salon"    │      │ categories   │
└──────┬──────┘      └──────┬───────┘
       │                    │
       ↓                    ↓
┌─────────────────────────────────┐
│    Filter Results Shown         │
│  - Matches highlighted          │
│  - Count updated                │
└──────┬──────────────────────────┘
       │
       ↓
┌─────────────┐      ┌──────────────┐
│   Budget    │  OR  │  View All    │
│   filter?   │      │   Options    │
└──────┬──────┘      └──────┬───────┘
       │                    │
       ↓                    ↓
┌─────────────────────────────────┐
│    Click Template Card           │
│  - Selected indicator appears   │
│  - Editor panel activates       │
└──────┬──────────────────────────┘
       │
       ↓
┌─────────────┐
│  Customize  │
│   Content   │
└─────────────┘
```

---

## 💡 Smart Features

### Auto-Clear Empty Results

```
No templates match:
┌─────────────────────────────┐
│          🔍                 │
│   No templates found        │
│                             │
│ Try adjusting your search   │
│      or filters             │
│                             │
│ [Clear All Filters]         │
└─────────────────────────────┘
```

### Results Counter

```
Normal:  Showing 72 of 72 templates
Filtered: Showing 12 of 72 templates  
Searched: Showing 3 of 72 templates
```

### Sticky Controls

```
┌─────────────────────┐ ← Scrolled Position
│  [Controls Panel]   │ ← Stays at top
├─────────────────────┤
│ ...scrollable...    │
│ template content    │
│ below here          │
└─────────────────────┘
```

---

## 📊 Comparison: Before vs After

### Before (Single Grouping)

```
Pro Templates (12)
  ├── Template 1
  ├── Template 2
  └── ...

Checkout Templates (12)
  ├── Template 13
  ├── Template 14
  └── ...

Starter Templates (50)
  ├── Template 25
  ├── Template 26
  └── ...

❌ No search
❌ No category view
❌ No filtering
❌ Linear only
```

### After (Multiple Options)

```
📁 By Category          ⭐ By Plan           📋 All
├── 🍽️ Food (10)       ├── Pro (12)        ├── Template 1 [Pro]
├── 💇 Beauty (6)       ├── Checkout (12)   ├── Template 2 [Checkout]
├── 💪 Fitness (5)      └── Starter (50)    ├── Template 3 [Starter]
└── ...                                     └── ...

✅ Search
✅ Category grouping
✅ Plan filtering
✅ Flexible views
```

---

## 🎯 Real-World Scenarios

### Scenario 1: "I need a restaurant website"

```
Step 1: Opens Setup page
        ↓
        Default view shows categories
        ↓
Step 2: Scrolls to 🍽️ Food & Dining
        ↓
        Sees 10 restaurant templates
        ↓
Step 3: Sees tiers: Pro, Checkout, Starter
        ↓
        Clicks Restaurant Pro
        ↓
        ✅ Done in 30 seconds
```

### Scenario 2: "I only have $0 budget"

```
Step 1: Opens Setup page
        ↓
Step 2: Clicks "Starter" filter
        ↓
        Only free templates shown
        ↓
Step 3: Still grouped by category
        ↓
        Finds their business type
        ↓
Step 4: Selects appropriate starter template
        ↓
        ✅ Done in 45 seconds
```

### Scenario 3: "I want the 'Salon Pro' template"

```
Step 1: Opens Setup page
        ↓
Step 2: Types "salon pro" in search
        ↓
        One result appears
        ↓
Step 3: Clicks it
        ↓
        ✅ Done in 10 seconds
```

---

## 🎨 Responsive Views

### Desktop (>768px)
```
┌────────────────────────────────────────────┐
│ 🔍 Search                               │
│ Group by: [Category] [Plan] [All]         │
│ Filter: [All] [Pro] [Checkout] [Starter]  │
│ Showing X of Y templates                   │
├────────────────────────────────────────────┤
│ 🍽️ Category Name                      12  │
│ ┌──────┬──────┬──────┬──────┐            │
│ │  T1  │  T2  │  T3  │  T4  │ (Grid)     │
│ └──────┴──────┴──────┴──────┘            │
└────────────────────────────────────────────┘
```

### Mobile (<480px)
```
┌──────────────────┐
│ 🔍 Search   [×] │
├──────────────────┤
│ Group by:        │
│ [Category]       │
│ [Plan]           │
│ [All]            │
├──────────────────┤
│ Filter:          │
│ [All] [Pro]      │
│ [Checkout]       │
│ [Starter]        │
├──────────────────┤
│ 🍽️ Food (12)    │
│ ┌──────────────┐│
│ │  Template 1  ││ (Stack)
│ └──────────────┘│
│ ┌──────────────┐│
│ │  Template 2  ││
│ └──────────────┘│
└──────────────────┘
```

---

## ✨ Special Features Highlight

### 1. Live Results Counter
```
User types "res" in search:
  → "Showing 24 of 72 templates"

User continues "rest":
  → "Showing 18 of 72 templates"

User completes "restaurant":
  → "Showing 10 of 72 templates"
```

### 2. Smart Grouping Preservation
```
User filters by "Pro" plan:
  → Still shows groups (Food, Beauty, Fitness...)
  → But only Pro templates in each group
  → Empty groups hidden automatically
```

### 3. Combined Search + Filter
```
Search: "salon"
Filter: "Starter"
Group: "Category"

Result:
  💇 Beauty & Wellness (3)
    ├── Salon Hair [Starter]
    ├── Salon Nails [Starter]
    └── Salon Spa [Starter]
```

---

**Last Updated:** November 5, 2025  
**Visual Guide Version:** 1.0  
**For:** Template Grouping System 2.0

