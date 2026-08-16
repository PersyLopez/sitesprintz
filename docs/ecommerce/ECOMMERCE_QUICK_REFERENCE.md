# E-Commerce System Quick Reference Card

## 🚀 System Status
```
✅ Backend: Running on port 3000
✅ Frontend: Running on port 5173 (Vite)
✅ ngrok: Active tunnel → https://tenurial-subemarginate-fay.ngrok-free.dev
✅ Google OAuth: Working and verified
✅ Database: Connected and healthy
✅ Stripe: Test mode enabled
```

---

## 🛒 Shopping Cart System

### How to Test
1. Navigate to: `https://tenurial-subemarginate-fay.ngrok-free.dev`
2. Sign in with Google (Google OAuth verified ✅)
3. Browse to a site with products
4. Click "Add to Cart" on any product
5. Cart badge updates (🛒 with number)
6. Click cart icon to open sidebar

### Cart Operations
| Operation | Expected Result |
|-----------|-----------------|
| Add item | Badge count increases |
| Remove item | Item disappears, count decreases |
| Update qty | Total recalculates immediately |
| Clear cart | All items removed, badge vanishes |
| Refresh page | Cart persists (LocalStorage) |

### Cart Hook
```javascript
import { useCart } from './hooks/useCart';

const {
  cartItems,        // Array of items
  isCartOpen,       // Boolean
  setIsCartOpen,    // Toggle function
  updateQuantity,   // (itemId, qty) => void
  removeFromCart,   // (itemId) => void
  clearCart,        // () => void
  getCartTotal,     // () => number
  getItemCount      // () => number
} = useCart();
```

---

## 💳 Checkout & Payment

### Access Checkout
**Pro/Growth Users** ✅
- Can proceed to Stripe checkout
- Process: Cart → Checkout → Stripe form → Success

**Trial Users** ❌
- Blocked from checkout
- See message: "Online payments require Pro plan"
- Upgrade link provided

### Test Stripe Payment

**Use These Test Cards:**
```
Successful Payment:
  Card: 4242 4242 4242 4242
  Exp: 12/25
  CVC: 123
  ZIP: 12345

Card Requires Auth:
  Card: 4000 0027 6000 3184
  (Same exp/CVC/ZIP)

Declined Card:
  Card: 4000 0000 0000 0002
  (Will fail, test error handling)
```

### Payment Flow
```
1. User clicks "Proceed to Checkout"
2. Frontend creates Stripe session via API
3. User redirected to Stripe checkout form
4. User enters card details
5. Stripe processes payment
6. Webhook confirms payment
7. Order created in database
8. User redirected to success page
9. Order appears in Orders dashboard
```

### Stripe Configuration
```
TEST API Keys (in .env):
STRIPE_PUBLISHABLE_KEY=pk_test_51SNKsx1toLbCZloXFXmPfC62j933CE9PoWMipTpAEORo4oPiG60gwssmhtdMS9416dc7IvRHJqzOYY3OCq2yFCQn00A4ZXWedy
STRIPE_SECRET_KEY=sk_test_51SNKsx1toLbCZloXr6NJ3aVTvs1enifJq8ZJ59lDigDWGIJpKqFigYrTBhvfH0Sxf38U4E6D7BBTfybaEaQpiGbi004BuFBBez
```

---

## 📦 Order Management

### Access Orders Dashboard
```
URL: https://tenurial-subemarginate-fay.ngrok-free.dev/orders?siteId={siteId}
Requirements:
  - Must be Pro/Growth+ tier
  - Must own the site
  - Must be authenticated
```

### Order Operations
| Operation | Result |
|-----------|--------|
| View all orders | List displays paginated |
| Filter by status | Shows only matching orders |
| Search by ID/name | Find specific orders |
| Click order | Details modal opens |
| Update status | Changes persist immediately |
| Bulk operations | Update multiple at once |

### Order Status Workflow
```
pending → processing → shipped → delivered → completed
   ↓
 cancelled (anytime)
```

### Order Details Shown
- Order ID (unique)
- Customer name (from user)
- Order date/time
- Status (current state)
- Items ordered (product + qty)
- Total amount charged
- Payment status
- Notes/comments

---

## 🌐 Multi-Site Support

### How It Works
- Each site has its own product catalog
- Cart can contain items from multiple sites
- **BUT**: Orders are segregated by site
- Each site has separate Orders dashboard

### Example
```
Site A (Restaurant):
  - Pizza: $15.99
  - Salad: $8.99

Site B (Shop):
  - Shirt: $24.99
  - Hat: $12.99

User adds to cart:
  [Pizza, Salad, Shirt, Hat]

Checkout processes entire cart ($62.96)

Orders Result:
  Site A Orders: [Pizza, Salad]
  Site B Orders: [Shirt, Hat]
```

---

## 🔒 Tier-Based Access

### Tier Permissions
```
TRIAL:
  ✅ View products
  ✅ Add to cart
  ❌ Checkout/payment
  ❌ View orders

STARTER/GROWTH:
  ✅ All TRIAL features
  ✅ Checkout/payment
  ✅ View own orders
  ✅ Basic order management

PRO/PREMIUM:
  ✅ All GROWTH features
  ✅ Advanced order management
  ✅ Product management
  ✅ Custom workflows
```

### Checking Tier in Code
```javascript
import { usePlan } from './hooks/usePlan';
import { hasFeature, FEATURES } from './utils/planFeatures';

function MyComponent() {
  const { plan } = usePlan();
  const canCheckout = hasFeature(plan, FEATURES.STRIPE_CHECKOUT);
  
  return canCheckout ? <CheckoutButton /> : <UpgradePrompt />;
}
```

---

## 🧪 Quick Test Checklist (5 minutes)

- [ ] Open: `https://tenurial-subemarginate-fay.ngrok-free.dev`
- [ ] Sign in with Google
- [ ] Navigate to product page
- [ ] Click "Add to Cart"
- [ ] Verify: Cart badge shows "1"
- [ ] Click cart icon
- [ ] Verify: Item visible with price
- [ ] Increase quantity to 2
- [ ] Verify: Total updates to 2× price
- [ ] Click "Proceed to Checkout"
- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Complete payment
- [ ] Verify: Success page appears
- [ ] Check Orders: New order visible ✅

---

## 🐛 Debugging Commands

### Check Backend Health
```bash
curl http://localhost:3000/health | jq .
```

### Check ngrok Tunnel
```bash
curl https://tenurial-subemarginate-fay.ngrok-free.dev/health | jq .
```

### Monitor Logs
```bash
# Backend logs
tail -f /tmp/backend-*.log

# Browser console (F12)
# Look for any red errors or warnings
```

### Test Cart in Console
```javascript
// Check cart state
fetch('/api/cart')
  .then(r => r.json())
  .then(console.log)

// Check stored cart
console.log(localStorage.getItem('cart_items'))
```

### Test Orders API
```bash
# Get orders for a site
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/orders/{siteId}/orders | jq .

# Or from JavaScript
fetch('/api/orders/{siteId}/orders', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log)
```

---

## 📊 Database Queries

### View Orders
```sql
SELECT id, user_id, site_id, total, status, created_at 
FROM orders 
WHERE user_id = '{userId}' 
ORDER BY created_at DESC;
```

### View Order Items
```sql
SELECT * FROM order_items 
WHERE order_id = '{orderId}';
```

### Check Products
```sql
SELECT * FROM products 
WHERE site_id = '{siteId}';
```

---

## 🎯 Common Test Scenarios

### Scenario 1: Basic Purchase (2 min)
1. Sign in → Add item → Checkout → Pay → Success ✅

### Scenario 2: Error Handling (3 min)
1. Trial user → Try checkout → See error message ✅
2. Use declined card → See payment error ✅

### Scenario 3: Order Management (3 min)
1. Complete order → Navigate to Orders → Click order → View details → Update status ✅

### Scenario 4: Cart Persistence (2 min)
1. Add item → Refresh page → Item still there ✅

### Scenario 5: Multi-Site (5 min)
1. Add items from Site A → Add items from Site B → Checkout → Verify orders segregated ✅

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Cart not updating | Refresh page, clear cache (Cmd+Shift+R) |
| Can't checkout | Verify tier (must be Pro+), check cart has items |
| Payment fails | Use correct test card (4242...), check console |
| Orders not showing | Refresh, verify site ownership, check tier |
| ngrok not working | Verify URL is correct, check backend is running |
| Google OAuth fails | Check ngrok URL in Google Console |

---

## 📁 Key Files

**Frontend**:
- `src/components/ecommerce/ShoppingCart.jsx`
- `src/components/ecommerce/CheckoutButton.jsx`
- `src/pages/Orders.jsx`
- `src/context/CartContext.jsx`
- `src/hooks/useCart.jsx`

**Backend**:
- `server/routes/orders.routes.js`
- `server/routes/checkout.routes.js`
- `server/services/orderDashboardService.js`

**Config**:
- `.env` (Stripe keys, URLs)
- `src/config/tiers.js` (Tier definitions)
- `src/utils/planFeatures.js` (Feature gating)

---

## 📞 API Endpoints

**Cart Operations**:
```
POST   /api/cart/add
POST   /api/cart/remove
POST   /api/cart/update
GET    /api/cart
```

**Checkout**:
```
POST   /api/checkout/session
POST   /api/checkout/confirm
```

**Orders**:
```
GET    /api/orders/{siteId}/orders
GET    /api/orders/{siteId}/orders/{orderId}
PATCH  /api/orders/{siteId}/orders/{orderId}
DELETE /api/orders/{siteId}/orders/{orderId}
```

**Products**:
```
GET    /api/orders/{siteId}/products
POST   /api/orders/{siteId}/products
PATCH  /api/orders/{siteId}/products/{productId}
DELETE /api/orders/{siteId}/products/{productId}
```

---

## ✅ Test Success Criteria

After running all tests, you should have:
- ✅ Successfully added items to cart
- ✅ Successfully processed Stripe payment
- ✅ Successfully created order in database
- ✅ Successfully viewed orders in dashboard
- ✅ Successfully updated order status
- ✅ All operations completed without errors
- ✅ No console errors or warnings
- ✅ All API calls returned success (200/201)

---

**Last updated**: June 2026

---

## Related Documentation

| Topic | Doc |
|-------|-----|
| Full testing guide | [ECOMMERCE_TESTING_GUIDE.md](./ECOMMERCE_TESTING_GUIDE.md) |
| Smoke test checklist | [ECOMMERCE_QUICK_TEST.md](./ECOMMERCE_QUICK_TEST.md) |
| Tier gating (Growth+) | [ECOMMERCE_TIER_CONSOLIDATION.md](./ECOMMERCE_TIER_CONSOLIDATION.md) |
| E2E self-healing tests | [ECOMMERCE_SELFHEALING_TESTS.md](./ECOMMERCE_SELFHEALING_TESTS.md) |

**Doc index**: [../README.md](../README.md)  
**Maintaining docs**: Update this file — [../governance/AGENT_DOCUMENTATION_GUIDE.md](../governance/AGENT_DOCUMENTATION_GUIDE.md)

