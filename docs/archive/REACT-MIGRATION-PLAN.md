# React Migration Plan

## Current Status

### ✅ Already Migrated to React
- [x] **Landing Page** (`/`) - Template showcase, hero, features
- [x] **Login** (`/login`) - Email/password + Google OAuth
- [x] **Register** (`/register`) - Account creation
- [x] **Forgot Password** (`/forgot-password`) - Password reset request
- [x] **Reset Password** (`/reset-password`) - Password reset completion
- [x] **Dashboard** (`/dashboard`) - User sites, stats, Stripe connect
- [x] **Setup** (`/setup`) - Template selection & editor (PARTIALLY WORKING)

### ❌ Still Using Old HTML System
- [ ] **Analytics** (`analytics.html`) - Site traffic & visitor analytics
- [ ] **Orders** (`orders.html`) - View & manage customer orders
- [ ] **Admin Panel** (`admin.html`) - Admin dashboard
- [ ] **Admin Analytics** (`admin-analytics.html`) - Platform-wide analytics
- [ ] **Admin Users** (`admin-users.html`) - User management
- [ ] **Products Management** (`products.html`) - Product catalog
- [ ] **Guest Editor** (`guest-editor.html`) - Public site editor
- [ ] **Quick Publish** (`quick-publish.html`) - Fast site creation
- [ ] **Auto Publish** (`auto-publish.html`) - Automated publishing
- [ ] **Stripe Connect** (`connect.html`) - Stripe account linking
- [ ] **Payment Success** (`payment-success.html`) - Payment confirmation
- [ ] **Payment Cancel** (`payment-cancel.html`) - Payment cancellation
- [ ] **Publish Success** (`publish-success.html`) - Site publish confirmation
- [ ] **Register Success** (`register-success.html`) - Registration confirmation

---

## Migration Strategy

### Phase 1: Core User Features (Priority: HIGH)
**Goal**: Migrate essential features users need daily

#### 1.1 Analytics Page
**File**: `analytics.html` → `src/pages/Analytics.jsx`

**Features to Migrate**:
- [ ] Page view tracking
- [ ] Visitor statistics (unique, returning)
- [ ] Geographic data (country/city breakdown)
- [ ] Traffic sources (direct, social, referral)
- [ ] Device breakdown (mobile, desktop, tablet)
- [ ] Real-time visitors
- [ ] Date range selector
- [ ] Charts/graphs (use `recharts` or `chart.js`)
- [ ] Export data as CSV

**New Components**:
- `AnalyticsChart.jsx` - Line/bar charts
- `VisitorMap.jsx` - Geographic heatmap
- `StatsCard.jsx` - Individual stat displays
- `DateRangePicker.jsx` - Date selection

**API Endpoints Needed**:
- `GET /api/analytics/:siteId` - Site analytics data
- `GET /api/analytics/:siteId/realtime` - Real-time data

**Complexity**: ⭐⭐⭐ (Medium-High - charts, real-time data)

---

#### 1.2 Orders Page
**File**: `orders.html` → `src/pages/Orders.jsx`

**Features to Migrate**:
- [ ] Order list (paginated)
- [ ] Order filtering (status, date, amount)
- [ ] Order search (by customer, order ID)
- [ ] Order details modal
- [ ] Order status updates (pending → processing → shipped → delivered)
- [ ] Refund handling
- [ ] Customer contact info
- [ ] Order export (CSV, PDF)
- [ ] Email customer functionality
- [ ] Stripe payment details link

**New Components**:
- `OrderTable.jsx` - Orders data table
- `OrderRow.jsx` - Individual order row
- `OrderDetailsModal.jsx` - Order details popup
- `OrderFilters.jsx` - Filter controls
- `OrderStatusBadge.jsx` - Status display
- `RefundModal.jsx` - Process refund

**API Endpoints Needed**:
- `GET /api/orders` - List all orders for user's sites
- `GET /api/orders/:orderId` - Single order details
- `PUT /api/orders/:orderId/status` - Update order status
- `POST /api/orders/:orderId/refund` - Process refund
- `GET /api/orders/export` - Export orders data

**Complexity**: ⭐⭐⭐⭐ (High - complex state, Stripe integration)

---

#### 1.3 Fix Setup/Editor (Complete Migration)
**File**: `setup.html` → **ENHANCE** `src/pages/Setup.jsx`

**Current Issues**:
- Templates not loading with demo content ✅ FIXED
- Publishing not working ✅ FIXED
- Editor panel incomplete ❌ NEEDS WORK

**Features to Complete**:
- [ ] **Template Loading**: Full data preservation ✅ DONE
- [ ] **Business Info Tab**:
  - [ ] Business name input
  - [ ] Hero section (title, subtitle, image upload)
  - [ ] Logo upload
  - [ ] Color theme picker
- [ ] **Services/Products Tab**:
  - [ ] Add/edit/delete services
  - [ ] Service name, description, price
  - [ ] Service image upload
  - [ ] Reorder services (drag & drop)
- [ ] **Contact Tab**:
  - [ ] Email, phone, address inputs
  - [ ] Business hours editor
  - [ ] Social media links (Facebook, Instagram, etc.)
  - [ ] Google Maps integration
- [ ] **Advanced Tab** (Pro tier):
  - [ ] Custom CSS editor
  - [ ] SEO settings (meta tags, description)
  - [ ] Analytics tracking ID
  - [ ] Custom domain setup
- [ ] **Image Management**:
  - [ ] Upload images to `/uploads/`
  - [ ] Image cropping/resizing
  - [ ] Gallery management
- [ ] **Live Preview**:
  - [ ] Real-time preview updates
  - [ ] Mobile/tablet/desktop view toggle
  - [ ] Preview in new tab

**New Components**:
- `BusinessInfoForm.jsx` - Business details editor
- `ServicesEditor.jsx` - Services/products manager
- `ContactForm.jsx` - Contact info editor
- `ColorPicker.jsx` - Theme color selector
- `ImageUploader.jsx` - Image upload widget
- `PreviewFrame.jsx` - Live preview iframe (enhance existing)
- `MobilePreviewToggle.jsx` - Device preview switcher

**Complexity**: ⭐⭐⭐⭐⭐ (Very High - complex editor, real-time preview)

---

### Phase 2: Admin Features (Priority: MEDIUM)
**Goal**: Migrate admin-only features

#### 2.1 Admin Dashboard
**File**: `admin.html` → `src/pages/Admin.jsx`

**Features to Migrate**:
- [ ] Platform-wide statistics
  - Total users, sites, revenue
  - Growth metrics
  - Active subscriptions breakdown
- [ ] Recent activity feed
- [ ] System health monitoring
- [ ] User management link
- [ ] Analytics link
- [ ] Featured templates management
- [ ] Platform settings

**Complexity**: ⭐⭐ (Low-Medium - mostly data display)

---

#### 2.2 Admin Users
**File**: `admin-users.html` → `src/pages/AdminUsers.jsx`

**Features to Migrate**:
- [ ] User list (paginated, searchable)
- [ ] User filtering (plan, status, signup date)
- [ ] User details modal
- [ ] Edit user (email, name, plan)
- [ ] Ban/unban users
- [ ] Delete user accounts
- [ ] View user's sites
- [ ] Impersonate user (admin view as user)
- [ ] Manual subscription override

**Complexity**: ⭐⭐⭐ (Medium - user management, security)

---

#### 2.3 Admin Analytics
**File**: `admin-analytics.html` → `src/pages/AdminAnalytics.jsx`

**Features to Migrate**:
- [ ] Platform-wide analytics
- [ ] Revenue tracking
- [ ] User growth charts
- [ ] Popular templates
- [ ] Conversion funnel (signup → publish → paid)
- [ ] Churn analysis
- [ ] Geographic distribution

**Complexity**: ⭐⭐⭐ (Medium - charts, aggregated data)

---

### Phase 3: Secondary Features (Priority: LOW)
**Goal**: Migrate nice-to-have features

#### 3.1 Products Management
**File**: `products.html` → `src/pages/Products.jsx`

**Features**:
- [ ] Product catalog
- [ ] Add/edit/delete products
- [ ] Product categories
- [ ] Inventory tracking
- [ ] Stripe product sync

**Complexity**: ⭐⭐⭐ (Medium)

---

#### 3.2 Stripe Connect
**File**: `connect.html` → Integrate into **Dashboard** (already partially done)

**Features**:
- [ ] Connect Stripe account
- [ ] View connection status
- [ ] Disconnect account
- [ ] Earnings dashboard
- [ ] Payout schedule

**Complexity**: ⭐⭐ (Low - mostly done)

---

#### 3.3 Success/Confirmation Pages
**Files**: `payment-success.html`, `payment-cancel.html`, `publish-success.html`, `register-success.html`

**New React Pages**:
- `src/pages/PaymentSuccess.jsx`
- `src/pages/PaymentCancel.jsx`
- `src/pages/PublishSuccess.jsx`
- (Register success can redirect to dashboard)

**Features**:
- [ ] Success message
- [ ] Next steps guidance
- [ ] Return to dashboard button
- [ ] Share options (for publish success)

**Complexity**: ⭐ (Very Low - simple pages)

---

#### 3.4 Guest/Quick Publish
**Files**: `guest-editor.html`, `quick-publish.html`, `auto-publish.html`

**Decision**: Evaluate if these are still needed or can be merged into main Setup flow

**Options**:
1. Migrate as separate pages
2. Merge into Setup with URL params (`/setup?mode=guest`)
3. Deprecate if not used

**Complexity**: ⭐⭐ (Low - depends on decision)

---

## Technical Requirements

### New Services Needed
```javascript
// src/services/analytics.js
- getAnalytics(siteId, dateRange)
- getRealTimeVisitors(siteId)
- exportAnalytics(siteId, format)

// src/services/orders.js ✅ PARTIALLY EXISTS
- getOrders(filters)
- getOrder(orderId)
- updateOrderStatus(orderId, status)
- processRefund(orderId, amount)
- exportOrders(filters, format)

// src/services/admin.js
- getAdminStats()
- getUsers(filters)
- getUser(userId)
- updateUser(userId, data)
- deleteUser(userId)
- getPlatformAnalytics()

// src/services/products.js
- getProducts()
- createProduct(data)
- updateProduct(productId, data)
- deleteProduct(productId)
- syncWithStripe(productId)
```

### New Contexts Needed
```javascript
// src/context/AnalyticsContext.jsx
- Track page views
- Session management
- Event tracking

// src/context/OrdersContext.jsx
- Order state management
- Real-time order updates (webhooks)
- Order notifications
```

### New Hooks Needed
```javascript
// src/hooks/useAnalytics.js
- Fetch analytics data
- Subscribe to real-time updates

// src/hooks/useOrders.js
- Fetch orders
- Update order status
- Listen for new orders

// src/hooks/useAdmin.js
- Admin-only data fetching
- User management
- Platform stats
```

### UI Libraries to Add
```bash
npm install recharts              # Charts for analytics
npm install date-fns              # Date handling
npm install react-datepicker      # Date range picker
npm install react-table           # Data tables for orders/users
npm install react-beautiful-dnd   # Drag & drop for services
npm install react-color           # Color picker
npm install react-dropzone        # File uploads
```

---

## Implementation Priority

### Sprint 1 (Week 1): Fix Current Issues
1. ✅ Fix template demo content loading - **DONE**
2. ✅ Fix publishing flow - **DONE**
3. ❌ Complete editor panel (Business Info tab)
4. ❌ Add image upload functionality
5. ❌ Improve live preview

**Goal**: Make Setup page fully functional

---

### Sprint 2 (Week 2): Orders & Analytics
1. Create Orders page
2. Implement order management
3. Add order status updates
4. Create Analytics page
5. Implement basic charts

**Goal**: Users can manage orders and view analytics

---

### Sprint 3 (Week 3): Complete Editor
1. Add Services/Products editor
2. Add Contact info editor
3. Add Advanced settings tab
4. Add mobile preview toggle
5. Add auto-save improvements

**Goal**: Full editor functionality

---

### Sprint 4 (Week 4): Admin Features
1. Create Admin Dashboard
2. Create Admin Users page
3. Create Admin Analytics page
4. Add admin-only routes/permissions
5. Test admin workflows

**Goal**: Admin panel complete

---

### Sprint 5 (Week 5): Polish & Secondary Features
1. Add Products management
2. Create success pages
3. Improve Stripe Connect UI
4. Add export functionality
5. Fix any remaining bugs

**Goal**: All features migrated

---

## Migration Checklist

### Per Page Migration:
- [ ] Create React component
- [ ] Extract HTML structure
- [ ] Convert inline styles to CSS modules
- [ ] Migrate JavaScript logic to React hooks
- [ ] Connect to API endpoints
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add form validation (if applicable)
- [ ] Test mobile responsiveness
- [ ] Test with real data
- [ ] Update App.jsx routes
- [ ] Update navigation links
- [ ] Deprecate old HTML file (move to `/public/old/`)

### Testing Checklist:
- [ ] Functionality works same as old page
- [ ] All buttons/links work
- [ ] Forms submit correctly
- [ ] Loading states appear
- [ ] Error messages display
- [ ] Mobile layout works
- [ ] Tablet layout works
- [ ] Authentication works
- [ ] Permissions enforced (admin pages)
- [ ] No console errors

---

## Route Updates Needed

### App.jsx Routes to Add:
```javascript
// Analytics
<Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />

// Orders
<Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />

// Products
<Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />

// Admin Routes (with admin check)
<Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
<Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
<Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />

// Success Pages
<Route path="/payment-success" element={<PaymentSuccess />} />
<Route path="/payment-cancel" element={<PaymentCancel />} />
<Route path="/publish-success" element={<PublishSuccess />} />
```

---

## Estimated Timeline

| Phase | Pages | Complexity | Time Estimate |
|-------|-------|------------|---------------|
| **Sprint 1** | Fix Setup | ⭐⭐⭐⭐⭐ | 1 week |
| **Sprint 2** | Orders + Analytics | ⭐⭐⭐⭐ | 1 week |
| **Sprint 3** | Complete Editor | ⭐⭐⭐⭐ | 1 week |
| **Sprint 4** | Admin Features | ⭐⭐⭐ | 1 week |
| **Sprint 5** | Polish & Secondary | ⭐⭐ | 1 week |
| **Total** | 15+ pages | - | **5 weeks** |

---

## Benefits of Full Migration

### For Users:
✅ Faster page loads (SPA, no full page refreshes)
✅ Better mobile experience
✅ Smoother navigation
✅ Real-time updates
✅ Better error handling
✅ Consistent UI/UX across all pages

### For Developers:
✅ Single codebase (no HTML + React split)
✅ Reusable components
✅ Easier to maintain
✅ Better state management
✅ Modern development tools
✅ TypeScript ready (future)

### For Business:
✅ Faster feature development
✅ Better SEO (with SSR in future)
✅ Lower maintenance costs
✅ Easier to scale
✅ Better testing infrastructure

---

## Next Steps

### Immediate (This Week):
1. ✅ Fix template demo content - **DONE**
2. ✅ Fix publishing - **DONE**
3. ❌ Complete Business Info editor form
4. ❌ Add image upload widget
5. ❌ Test publishing with full data

### This Month:
1. Migrate Orders page
2. Migrate Analytics page
3. Complete editor (all tabs)
4. Test end-to-end workflows

### Next Month:
1. Migrate admin features
2. Add secondary pages
3. Deprecate all old HTML files
4. Full QA testing
5. Launch React-only version 🚀

---

## Questions to Answer

1. **Guest Editor**: Do we still need this? Or merge into main Setup?
2. **Quick/Auto Publish**: Are these being used? Analytics?
3. **Products Page**: Is this separate from Setup's products editor?
4. **Chart Library**: Recharts vs Chart.js vs Victory?
5. **Table Library**: React-Table vs TanStack Table vs custom?
6. **Real-time**: Do we need WebSockets for orders/analytics?

---

## Success Criteria

The migration is complete when:
- [ ] All 20 HTML pages migrated to React
- [ ] Zero references to `/public/*.html` in codebase
- [ ] All old HTML files moved to `/public/old/`
- [ ] All features work in React version
- [ ] Mobile responsiveness on all pages
- [ ] No console errors in production
- [ ] All tests passing
- [ ] User feedback is positive
- [ ] Performance metrics improved
- [ ] Documentation updated

---

**Status**: 🟡 In Progress (35% complete)
**Last Updated**: Sprint 1 - Publishing & Demo Content Fixed
**Next Sprint**: Complete Editor Panel (Business Info, Images, Services)

