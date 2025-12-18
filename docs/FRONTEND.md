# ⚛️ Frontend Documentation

**Last Updated:** December 2025  
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Routing](#routing)
4. [State Management](#state-management)
5. [Components](#components)
6. [Pages](#pages)
7. [Hooks](#hooks)
8. [Services](#services)
9. [Styling](#styling)
10. [Build & Deployment](#build--deployment)

---

## 🎯 Overview

The frontend is built with **React 19.x** and **Vite 7.x**, following modern React patterns:

- **Functional Components**: All components use hooks
- **Context API**: Global state management
- **Custom Hooks**: Reusable logic extraction
- **Service Layer**: API abstraction
- **Component Composition**: Reusable UI components

### Key Technologies

- **React 19.2**: UI library
- **React Router DOM 7.9**: Client-side routing
- **Vite 7.2**: Build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **Chart.js**: Data visualization
- **React Context**: State management

---

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   ├── analytics/      # Analytics components
│   ├── auth/           # Authentication components
│   ├── booking/        # Booking system components
│   ├── dashboard/      # Dashboard components
│   ├── ecommerce/      # E-commerce components
│   ├── layout/         # Layout components (Header, Footer)
│   ├── orders/         # Order management components
│   ├── pricing/        # Pricing display components
│   ├── products/       # Product management components
│   └── setup/          # Site setup/editor components
│
├── pages/              # Page components (routes)
│   ├── Landing.jsx     # Landing page
│   ├── Login.jsx       # Login page
│   ├── Register.jsx    # Registration page
│   ├── Dashboard.jsx   # User dashboard
│   ├── Setup.jsx       # Site setup/editor
│   └── ...
│
├── context/            # React Context providers
│   ├── AuthContext.jsx # Authentication state
│   ├── SiteContext.jsx # Site editing state
│   ├── CartContext.jsx # Shopping cart state
│   └── ToastContext.jsx # Toast notifications
│
├── hooks/              # Custom React hooks
│   ├── useAuth.js      # Auth hook
│   ├── useSite.js      # Site hook
│   ├── useCart.js      # Cart hook
│   └── useToast.js     # Toast hook
│
├── services/           # API client services
│   ├── api.js          # Base API client
│   ├── auth.js         # Auth API calls
│   ├── sites.js        # Sites API calls
│   └── templates.js    # Templates API calls
│
├── utils/              # Utility functions
│   ├── api.js          # API helpers
│   ├── demoContent.js  # Demo content generator
│   └── planFeatures.js # Plan feature definitions
│
├── styles/             # Global styles
│   └── global.css      # Global CSS
│
├── config/             # Configuration files
│   ├── pricing.config.js # Pricing configuration
│   └── templateLayouts.js # Template layouts
│
└── App.jsx             # Root component with routing
```

---

## 🛣 Routing

### Route Configuration (`App.jsx`)

**Public Routes:**
```javascript
/                    → Landing page
/login               → Login page
/register            → Registration page
/verify-email        → Email verification
/forgot-password     → Password reset request
/reset-password      → Password reset form
/oauth/callback      → OAuth callback handler
/showcase            → Public showcase gallery
/showcase/:subdomain → Showcase detail page
/payment-success     → Payment success page
/payment-cancel      → Payment cancellation page
/booking/user/:userId → Public booking page
/booking/appointment/:code → Appointment detail
```

**Protected Routes:**
```javascript
/dashboard           → User dashboard (requires auth)
/setup               → Site setup/editor (requires auth)
/orders              → Order management (requires auth)
/analytics           → Site analytics (requires auth)
/products            → Product management (requires auth)
/booking-dashboard   → Booking management (requires auth)
```

**Admin Routes:**
```javascript
/admin               → Admin dashboard (requires admin)
/admin/analytics     → Platform analytics (requires admin)
/admin/users         → User management (requires admin)
```

### Route Protection

**ProtectedRoute Component:**
```javascript
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

- Checks authentication status
- Redirects to `/login` if not authenticated
- Shows loading state during auth check

**AdminRoute Component:**
```javascript
<AdminRoute>
  <Admin />
</AdminRoute>
```

- Extends ProtectedRoute
- Additional check for admin role
- Redirects to `/dashboard` if not admin

---

## 🔄 State Management

### Context Providers

#### AuthContext (`context/AuthContext.jsx`)

**State:**
- `user`: Current user object
- `token`: JWT token
- `loading`: Auth check in progress
- `isAuthenticated`: Boolean auth status

**Methods:**
- `login(email, password)`: Authenticate user
- `register(email, password, captchaToken)`: Create account
- `logout()`: Clear auth state
- `checkAuth()`: Verify current token

**Usage:**
```javascript
import { useAuth } from '../hooks/useAuth';

function Component() {
  const { user, isAuthenticated, login, logout } = useAuth();
  // ...
}
```

#### SiteContext (`context/SiteContext.jsx`)

**State:**
- `currentSite`: Active site being edited
- `siteData`: Site JSON data
- `isDirty`: Unsaved changes flag

**Methods:**
- `loadSite(siteId)`: Load site data
- `updateSite(data)`: Update site data
- `saveDraft()`: Save as draft
- `publishSite()`: Publish site

#### CartContext (`context/CartContext.jsx`)

**State:**
- `items`: Cart items array
- `total`: Total price
- `itemCount`: Number of items

**Methods:**
- `addItem(product)`: Add to cart
- `removeItem(productId)`: Remove from cart
- `clearCart()`: Empty cart
- `updateQuantity(productId, quantity)`: Update quantity

#### ToastContext (`context/ToastContext.jsx`)

**Methods:**
- `showSuccess(message)`: Show success toast
- `showError(message)`: Show error toast
- `showInfo(message)`: Show info toast
- `showWarning(message)`: Show warning toast

**Usage:**
```javascript
import { useToast } from '../hooks/useToast';

function Component() {
  const { showSuccess, showError } = useToast();
  
  const handleSave = async () => {
    try {
      await saveData();
      showSuccess('Saved successfully!');
    } catch (error) {
      showError('Failed to save');
    }
  };
}
```

---

## 🧩 Components

### Component Organization

Components are organized by **feature/domain**:

#### Admin Components (`components/admin/`)

- **PricingManagement**: Manage subscription pricing
- **UserDetailsModal**: View/edit user details

#### Analytics Components (`components/analytics/`)

- **AnalyticsChart**: Chart visualization
- **SiteAnalyticsTable**: Site analytics table
- **StatsCard**: Statistics card display

#### Booking Components (`components/booking/`)

- **BookingWidget**: Public booking widget
- **AvailabilityScheduler**: Availability management
- **ServiceManager**: Service CRUD
- **AppointmentList**: Appointment listing

#### Dashboard Components (`components/dashboard/`)

- **SiteCard**: Site card display
- **StripeConnectSection**: Stripe connection UI
- **TrialBanner**: Trial expiration banner
- **WelcomeModal**: First-time user welcome

#### Setup Components (`components/setup/`)

- **TemplateGrid**: Template selection grid
- **PreviewFrame**: Live preview iframe
- **EditorPanel**: Site editor panel
- **LayoutSelector**: Layout variation selector
- **Forms**: Business info, products, reviews editors

### Component Patterns

**Functional Component:**
```javascript
import React, { useState, useEffect } from 'react';

function Component({ prop1, prop2 }) {
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // Side effects
  }, []);
  
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

export default Component;
```

**Component with Context:**
```javascript
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

function Component() {
  const { user } = useAuth();
  const { showSuccess } = useToast();
  // ...
}
```

---

## 📄 Pages

### Page Components (`pages/`)

#### Landing (`Landing.jsx`)

**Purpose:** Marketing landing page

**Features:**
- Hero section
- Feature showcase
- Pricing tiers
- Call-to-action buttons
- Public showcase preview

#### Login (`Login.jsx`)

**Purpose:** User authentication

**Features:**
- Email/password login
- Google OAuth button
- "Forgot password" link
- "Sign up" link
- CAPTCHA (if enabled)

#### Register (`Register.jsx`)

**Purpose:** New user registration

**Features:**
- Email/password registration
- Password strength indicator
- Terms acceptance
- CAPTCHA verification
- Email verification prompt

#### Dashboard (`Dashboard.jsx`)

**Purpose:** User's site management hub

**Features:**
- Site list with cards
- Create new site button
- Site actions (edit, duplicate, delete)
- Stripe connection status
- Trial expiration banner
- Welcome modal (first visit)

#### Setup (`Setup.jsx`)

**Purpose:** Site creation and editing

**Features:**
- Template selection
- Business info form
- Visual editor
- Live preview
- Publish functionality
- Draft saving

#### Orders (`Orders.jsx`)

**Purpose:** Order management

**Features:**
- Order list
- Order details modal
- Status filtering
- Order actions

#### Analytics (`Analytics.jsx`)

**Purpose:** Site analytics dashboard

**Features:**
- View statistics
- Traffic charts
- Engagement metrics
- Time range filters

#### Admin (`Admin.jsx`)

**Purpose:** Admin dashboard

**Features:**
- Platform statistics
- User management
- System health
- Growth metrics

---

## 🎣 Hooks

### Custom Hooks (`hooks/`)

#### useAuth (`useAuth.js`)

**Purpose:** Access authentication context

**Returns:**
```javascript
{
  user,              // User object
  token,             // JWT token
  loading,          // Loading state
  isAuthenticated,  // Boolean
  login,            // Login function
  register,         // Register function
  logout,           // Logout function
  checkAuth          // Re-check auth
}
```

**Usage:**
```javascript
const { user, isAuthenticated, login } = useAuth();
```

#### useSite (`useSite.js`)

**Purpose:** Access site editing context

**Returns:**
```javascript
{
  currentSite,      // Current site
  siteData,         // Site JSON
  loadSite,         // Load function
  updateSite,       // Update function
  saveDraft,        // Save draft
  publishSite       // Publish
}
```

#### useCart (`useCart.js`)

**Purpose:** Access shopping cart context

**Returns:**
```javascript
{
  items,            // Cart items
  total,            // Total price
  itemCount,        // Item count
  addItem,          // Add item
  removeItem,       // Remove item
  clearCart         // Clear cart
}
```

#### useToast (`useToast.js`)

**Purpose:** Show toast notifications

**Returns:**
```javascript
{
  showSuccess,      // Success toast
  showError,        // Error toast
  showInfo,         // Info toast
  showWarning       // Warning toast
}
```

#### usePlan (`usePlan.js`)

**Purpose:** Access subscription plan features

**Returns:**
```javascript
{
  plan,             // Current plan
  features,         // Plan features
  isPro,            // Is Pro plan
  isPremium,        // Is Premium plan
  canAccess         // Feature check function
}
```

---

## 🌐 Services

### API Client (`services/api.js`)

**Base API Client Class:**

**Features:**
- Automatic token injection
- CSRF token handling
- Retry logic (5 attempts with exponential backoff)
- Error handling
- 401 auto-redirect to login

**Methods:**
```javascript
api.get(endpoint, options)
api.post(endpoint, data, options)
api.put(endpoint, data, options)
api.delete(endpoint, options)
api.upload(endpoint, formData, options)
```

**Usage:**
```javascript
import api from '../services/api';

const data = await api.get('/api/sites');
await api.post('/api/sites', { name: 'My Site' });
```

### Auth Service (`services/auth.js`)

**Methods:**
- `login(email, password)`: Authenticate
- `register(email, password, captchaToken)`: Register
- `logout()`: Logout
- `getCurrentUser()`: Get current user
- `forgotPassword(email)`: Request password reset
- `resetPassword(token, password)`: Reset password
- `verifyEmail(token)`: Verify email

### Sites Service (`services/sites.js`)

**Methods:**
- `getUserSites(userId)`: Get user's sites
- `getSite(siteId)`: Get site data
- `createSite(data)`: Create new site
- `updateSite(siteId, data)`: Update site
- `deleteSite(userId, siteId)`: Delete site
- `publishSite(siteId)`: Publish site

### Templates Service (`services/templates.js`)

**Methods:**
- `getTemplates()`: Get all templates
- `getTemplate(templateId)`: Get template details
- `getTemplateLayouts(templateId)`: Get layout variations

---

## 🎨 Styling

### CSS Architecture

**Global Styles:**
- `src/styles/global.css`: Global CSS variables and base styles

**Component Styles:**
- Each component has its own CSS file
- Example: `Dashboard.css`, `SiteCard.css`

**TailwindCSS:**
- Utility-first classes
- Custom configuration in `tailwind.config.js`
- Responsive design utilities

### Styling Patterns

**Component CSS:**
```css
/* ComponentName.css */
.component-name {
  /* Styles */
}

.component-name__element {
  /* BEM naming */
}
```

**Tailwind Classes:**
```javascript
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  {/* Utility classes */}
</div>
```

**CSS Variables:**
```css
:root {
  --primary-color: #00bcd4;
  --secondary-color: #ff9800;
}
```

---

## 🏗 Build & Deployment

### Development

```bash
npm run dev          # Start Vite dev server (frontend only)
npm run dev:backend  # Start Express server (backend only)
npm run dev:all      # Start both frontend and backend
```

**Dev Server:**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Hot Module Replacement (HMR) enabled

### Production Build

```bash
npm run build        # Build for production
```

**Build Output:**
- `dist/`: Production-ready static files
- Optimized and minified
- Code splitting enabled

### Preview

```bash
npm run preview      # Preview production build locally
```

---

## 📱 Responsive Design

### Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Mobile-First Approach

- Components designed mobile-first
- Progressive enhancement for larger screens
- Touch-friendly interactions
- Responsive images and layouts

---

## 🔒 Security Considerations

### Client-Side Security

1. **Token Storage**: JWT stored in `localStorage`
2. **CSRF Protection**: CSRF tokens for state-changing operations
3. **Input Validation**: Client-side validation (server-side also required)
4. **XSS Prevention**: React's built-in escaping
5. **HTTPS**: Required in production

### Best Practices

- Never expose secrets in client code
- Validate all user inputs
- Sanitize data before rendering
- Use HTTPS for all API calls
- Implement proper error handling

---

## 📚 Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Backend Documentation](./BACKEND.md)
- [API Reference](./API-REFERENCE.md)
- [Security Guide](./security/SECURITY-ASSESSMENT.md)

---

**Last Updated:** December 2025  
**Maintained by:** SiteSprintz Development Team





