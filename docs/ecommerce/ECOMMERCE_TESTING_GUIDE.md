# E-Commerce System Testing Guide

## Overview
This guide covers testing the complete e-commerce flow including shopping cart, checkout, payments, and order management.

## Prerequisites
- ✅ Servers running (backend on 3000, frontend on 5173/localhost)
- ✅ ngrok tunnel active: `https://tenurial-subemarginate-fay.ngrok-free.dev`
- ✅ Google OAuth working
- ✅ Stripe test mode enabled
- ✅ Database connected

## Test Scenarios

### 1. Shopping Cart Functionality

#### 1.1 Add Items to Cart
- Navigate to a published site with products section
- Verify cart icon appears (🛒)
- Click "Add to Cart" on a product
- Verify cart badge shows count
- Verify item appears in cart sidebar

**Expected Result:** Cart updates in real-time with item count and total

#### 1.2 Update Item Quantities
- Open cart sidebar
- Increase/decrease quantity for an item
- Verify total updates automatically
- Verify cart badge count reflects new quantity

**Expected Result:** Quantity changes reflect immediately in UI and calculations

#### 1.3 Remove Items from Cart
- Click remove button on a cart item
- Verify item disappears from cart
- Verify total recalculates
- Verify cart count badge updates

**Expected Result:** Item removed and cart state updated

#### 1.4 Clear Entire Cart
- Add multiple items to cart
- Click "Clear Cart" button
- Verify all items removed
- Verify cart becomes empty
- Verify cart badge disappears

**Expected Result:** Cart completely cleared and resets to default state

---

### 2. Checkout Flow

#### 2.1 Access Checkout (Tier Gating)
- Sign in as **Trial** user
- Add items to cart and try to checkout
- Verify upgrade message appears: "Online payments require Pro plan"
- Verify "Upgrade to Pro" link appears

**Expected Result:** Trial users see tier gate and upgrade prompt

#### 2.2 Checkout as Pro User
- Sign in as **Pro/Growth** user
- Add products to cart
- Click "Proceed to Checkout"
- Verify Stripe checkout page loads
- Verify order details visible

**Expected Result:** Pro users can proceed to Stripe checkout

#### 2.3 Stripe Payment (Test Card)
Use Stripe test cards:
- **Successful**: `4242 4242 4242 4242`
- **Require auth**: `4000 0027 6000 3184`
- **Declined**: `4000 0000 0000 0002`

**Test with successful card:**
1. Enter card: `4242 4242 4242 4242`
2. Expiry: `12/25`
3. CVC: `123`
4. Verify payment processes
5. Verify success page appears

**Expected Result:** Payment completes, success page shown, order created

---

### 3. Order Management

#### 3.1 View Orders
- After checkout completes, navigate to Orders dashboard
- Verify order appears in list
- Verify order shows correct status (pending/paid)
- Verify total matches cart total

**Expected Result:** Order visible in dashboard with correct details

#### 3.2 Order Details
- Click on an order
- Verify modal opens with:
  - Order ID
  - Order date
  - Customer info
  - Items ordered with quantities
  - Total amount
  - Payment status
  - Order status

**Expected Result:** Complete order information displayed

#### 3.3 Order Status Updates
- View an order status (e.g., "Pending")
- Click to update status to "Processing"
- Verify status changes in database/UI
- Verify status persists on refresh

**Expected Result:** Order status updates and persists

#### 3.4 Order Filtering
- Navigate to Orders page
- Use status filter (All, Pending, Shipped, etc.)
- Verify only matching orders shown
- Verify filter persists on page

**Expected Result:** Filtering works correctly

---

### 4. Product Management

#### 4.1 Add Product
- Navigate to site settings/admin
- Go to Products section
- Click "Add Product"
- Fill in:
  - Name: "Test Product"
  - Price: 19.99
  - Description: "Test description"
  - Image (optional)
- Save product
- Verify product appears in products list

**Expected Result:** Product created and visible in admin

#### 4.2 Edit Product
- Click on a product to edit
- Change price to 29.99
- Change description
- Save
- Verify changes appear on site immediately

**Expected Result:** Product updates reflect on live site

#### 4.3 Delete Product
- Click delete on a product
- Confirm deletion
- Verify product disappears from list
- Verify product no longer appears on site

**Expected Result:** Product removed from system

---

### 5. Integration Tests

#### 5.1 Complete End-to-End Flow
1. Sign in with Google OAuth
2. Navigate to site with products
3. Add 2-3 items to cart
4. Verify cart total
5. Proceed to checkout
6. Complete payment with test card
7. Verify success page
8. Check Orders dashboard
9. Verify order details
10. Update order status
11. Verify status persists

**Expected Result:** Full flow completes without errors

#### 5.2 Multiple Site Ordering
- Create/publish 2 different sites
- Site A: Restaurant (with 2 products)
- Site B: Boutique (with 3 products)
- Add items from both sites to separate carts
- Complete checkout for each
- Verify orders appear in each site's dashboard separately

**Expected Result:** Multi-site ordering works independently

#### 5.3 Cart Persistence
- Add items to cart
- Refresh page
- Verify cart items persist
- Close browser and reopen
- Verify cart still has items (if localStorage enabled)

**Expected Result:** Cart state persists across sessions

---

### 6. Error Handling

#### 6.1 Empty Cart Checkout
- Leave cart empty
- Click checkout
- Verify error message: "Your cart is empty"

**Expected Result:** Appropriate error shown

#### 6.2 Invalid Payment Card
- Add items to cart
- Try checkout with declined card: `4000 0000 0000 0002`
- Verify Stripe error displayed
- Verify order NOT created in database

**Expected Result:** Failed payment handled gracefully

#### 6.3 Stripe Connection Error
- Simulate offline mode (in dev tools)
- Try to checkout
- Verify appropriate error message
- Verify cart NOT cleared

**Expected Result:** Error handled, cart preserved

#### 6.4 Network Timeout
- Add items to cart
- Slow down network (Dev Tools > Network > Slow 3G)
- Click checkout
- Verify proper loading state
- Verify timeout handling after reasonable wait

**Expected Result:** Loading shown, timeout handled

---

### 7. Data Validation

#### 7.1 Product Price Validation
- Add product with price 0.01
- Add to cart
- Verify correct total in checkout
- Complete order
- Verify amount charged correctly

**Expected Result:** Prices calculated accurately to cents

#### 7.2 Quantity Limits
- Try to add quantity > max (if limit set)
- Verify error or warning shown
- Verify quantity clamped to max

**Expected Result:** Quantity validation enforced

#### 7.3 Duplicate Orders
- Complete checkout successfully
- Try to submit same order again immediately
- Verify duplicate NOT created
- Verify idempotency handled

**Expected Result:** No duplicate orders created

---

## Test Environment Setup

### Local Testing Checklist
- [ ] Both servers running
- [ ] ngrok tunnel active
- [ ] `.env` has correct Stripe keys (test mode)
- [ ] Google OAuth credentials verified
- [ ] Database migrations up-to-date
- [ ] Browser console open for errors
- [ ] Network tab open for API calls

### Test Data Setup
```javascript
// Test user tiers:
// Trial: No paid features
// Starter: Limited features
// Growth: Order management enabled
// Pro: Full features
// Premium: All features + priority support
```

---

## Debugging Tips

### Cart Issues
- Check `CartContext` in React DevTools
- Verify LocalStorage: `cart_items`
- Check browser console for JS errors

### Checkout Issues
- Verify Stripe key loaded: `window.Stripe`
- Check network tab for `/api/checkout/session` calls
- Verify Stripe test mode enabled
- Check browser console for Stripe errors

### Order Issues
- Query database: `SELECT * FROM orders WHERE user_id = '...'`
- Check server logs for order creation errors
- Verify `/api/orders/:siteId/orders` returns data
- Check permissions on site ownership

### Payment Issues
- Verify Stripe test API keys in `.env`
- Check Stripe dashboard for webhook logs
- Verify webhook secret matches in server
- Check for payment intent issues in Stripe logs

---

## Stripe Test Cards Reference

| Card Type | Number | Result |
|-----------|--------|--------|
| Visa | 4242 4242 4242 4242 | Succeeds |
| Visa (auth required) | 4000 0027 6000 3184 | Requires auth |
| Visa (declined) | 4000 0000 0000 0002 | Declined |
| American Express | 3782 822463 10005 | Succeeds |
| MasterCard | 5555 5555 5555 4444 | Succeeds |
| Discover | 6011 1111 1111 1117 | Succeeds |

All test cards use:
- **Expiry**: Any future date (e.g., 12/25)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

---

## Success Criteria

After completing all tests, verify:
- ✅ Shopping cart adds/removes items correctly
- ✅ Cart totals calculate accurately
- ✅ Checkout is tier-gated properly
- ✅ Stripe payment processing works
- ✅ Orders created and stored in database
- ✅ Order dashboard shows all orders
- ✅ Order filtering/searching works
- ✅ Order status updates persist
- ✅ Multi-site ordering works independently
- ✅ Error handling is graceful
- ✅ All features work with ngrok + Google OAuth

---

## Known Limitations / Future Improvements

- [ ] Inventory tracking (stock management)
- [ ] Tax calculation (varies by location)
- [ ] Discount codes / coupons
- [ ] Subscription products
- [ ] Refund processing UI
- [ ] Order tracking for customers
- [ ] Email receipts

---

## Quick Test Command

To quickly test, run this script:
```bash
# 1. Ensure servers running
npm run dev &
npm run dev:backend &

# 2. Start ngrok
ngrok http http://localhost:3000 --url=your-url &

# 3. Test health endpoints
curl http://localhost:3000/health
curl https://your-url/health

# 4. Open in browser
open https://your-url/register.html
```

---

## Related Documentation

| Topic | Doc |
|-------|-----|
| Smoke test | [ECOMMERCE_QUICK_TEST.md](./ECOMMERCE_QUICK_TEST.md) |
| API reference | [ECOMMERCE_QUICK_REFERENCE.md](./ECOMMERCE_QUICK_REFERENCE.md) |
| Tier gating | [ECOMMERCE_TIER_CONSOLIDATION.md](./ECOMMERCE_TIER_CONSOLIDATION.md) |
| E2E tests | [ECOMMERCE_SELFHEALING_TESTS.md](./ECOMMERCE_SELFHEALING_TESTS.md) |
| OAuth setup | [../setup/GOOGLE-OAUTH-NGROK.md](../setup/GOOGLE-OAUTH-NGROK.md) |

**Doc index**: [../README.md](../README.md)  
**Maintaining docs**: Update this file when test flows change — [../governance/AGENT_DOCUMENTATION_GUIDE.md](../governance/AGENT_DOCUMENTATION_GUIDE.md)
