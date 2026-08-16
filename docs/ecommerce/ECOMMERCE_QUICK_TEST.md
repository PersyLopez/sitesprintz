# E-Commerce Testing Checklist - Quick Reference

## Current System Status ✅
- **Backend**: Running on `localhost:3000`
- **Frontend**: Running on `localhost:5173`
- **ngrok Tunnel**: `https://tenurial-subemarginate-fay.ngrok-free.dev`
- **Google OAuth**: Configured and working ✅
- **Database**: Connected and healthy ✅
- **Stripe**: Test mode enabled

---

## Phase 1: Shopping Cart (Local Testing)

### Test on ngrok URL: `https://tenurial-subemarginate-fay.ngrok-free.dev`

- [ ] **Sign in with Google** - Should complete successfully
- [ ] **Add product to cart** - Cart badge updates with count
- [ ] **View cart sidebar** - Shows item, quantity, subtotal
- [ ] **Change quantity** - Updates total automatically
- [ ] **Remove item** - Item disappears, total recalculates
- [ ] **Clear cart** - All items removed, badge disappears
- [ ] **Refresh page** - Cart items persist

**Expected Result**: All cart operations work smoothly

---

## Phase 2: Checkout & Payment

### Prerequisites
1. Sign in as **Pro/Growth** tier user
2. Add 2-3 products to cart
3. Navigate to checkout

### Test Payment
- [ ] **Click "Proceed to Checkout"** - Stripe form loads
- [ ] **Test Card**: `4242 4242 4242 4242`
- [ ] **Expiry**: `12/25`
- [ ] **CVC**: `123`
- [ ] **Submit payment** - Process completes
- [ ] **Success page** - Shows order confirmation
- [ ] **Order ID visible** - Unique ID generated

**Expected Result**: Payment processes successfully

---

## Phase 3: Order Management

### After Successful Payment

- [ ] **Navigate to Orders** - New order appears in list
- [ ] **Order shows status** - "Pending" or "Processing"
- [ ] **Click order** - Details modal opens
  - [ ] Order ID visible
  - [ ] Items listed with quantities
  - [ ] Total matches payment amount
  - [ ] Date/time recorded
- [ ] **Update status** - Click to change to "Shipped"
- [ ] **Status persists** - Refresh page, status unchanged
- [ ] **Filter orders** - Use status filter, results update
- [ ] **Search orders** - Find by order ID or customer name

**Expected Result**: Complete order management workflow

---

## Phase 4: Error Handling

### Trial User Checkout
- [ ] Sign in as **Trial** user
- [ ] Add items to cart
- [ ] Click checkout
- [ ] **Verify error**: "Online payments require Pro plan"
- [ ] **Upgrade link** visible and clickable

### Invalid Payment
- [ ] Use card: `4000 0000 0000 0002` (declined)
- [ ] Submit payment
- [ ] **Verify error** displayed
- [ ] **Cart NOT cleared** - Items still there
- [ ] Can retry with correct card

### Empty Cart
- [ ] Clear cart completely
- [ ] Try checkout
- [ ] **Verify error**: "Your cart is empty"

**Expected Result**: All errors handled gracefully

---

## Phase 5: Multi-Site Testing

### Create Test Sites
Create 2 published sites with different products:

**Site A - "Test Restaurant"**
- Product 1: Pizza - $15.99
- Product 2: Salad - $8.99

**Site B - "Test Shop"**
- Product 1: Shirt - $24.99
- Product 2: Hat - $12.99

### Cross-Site Testing
- [ ] Add items from Site A to cart
- [ ] Navigate to Site B
- [ ] **Verify**: Cart persists from Site A
- [ ] **Add items from Site B** to same cart
- [ ] Proceed to checkout
- [ ] **Verify**: Both sets of items in Stripe form
- [ ] Complete payment
- [ ] **Check Orders for Site A** - Only Site A items appear
- [ ] **Check Orders for Site B** - Only Site B items appear

**Expected Result**: Cart is shared, orders are site-specific

---

## Phase 6: Data Integrity

### Price Accuracy
- [ ] Add item with price $9.99
- [ ] Add item with price $14.99
- [ ] **Verify subtotal**: $24.98
- [ ] Complete checkout
- [ ] **Verify Stripe charged**: Exact amount
- [ ] **Check database order**: Total matches

### Quantity Handling
- [ ] Add 1 item at $10
- [ ] Increase quantity to 5
- [ ] **Verify total**: $50 (before tax/fees)
- [ ] Complete order
- [ ] **Verify order shows**: qty=5, unit=$10, total=$50

### Customer Data
- [ ] Customer name in order: Matches logged-in user
- [ ] Customer email in order: Correct email
- [ ] Order date: Current timestamp
- [ ] Order status: "pending" initially

**Expected Result**: All data stored correctly

---

## Test Stripe Test Cards

| Card | Number | Use For |
|------|--------|---------|
| Standard | 4242 4242 4242 4242 | Success flow |
| Auth Required | 4000 0027 6000 3184 | 2FA testing |
| Declined | 4000 0000 0000 0002 | Error handling |

---

## Quick Test Flow (10 minutes)

1. **Open**: `https://tenurial-subemarginate-fay.ngrok-free.dev`
2. **Sign in** with Google ✅
3. **Add product** to cart
4. **Open cart**, verify it shows
5. **Increase quantity**, verify total updates
6. **Proceed to checkout** ✅
7. **Use test card**: `4242 4242 4242 4242`
8. **Submit payment** ✅
9. **Verify success page** ✅
10. **Check Orders** - New order appears ✅

**Success = 10 checkmarks** ✅

---

## Common Issues & Fixes

### Cart not updating
- ✅ Clear browser cache
- ✅ Check browser console for JS errors
- ✅ Verify CartContext mounted

### Checkout button disabled
- ✅ Verify user is Pro/Growth tier (not Trial)
- ✅ Check that cart has items
- ✅ Verify Stripe key loaded

### Payment fails silently
- ✅ Check Stripe test mode enabled
- ✅ Open browser dev tools (F12) → Console
- ✅ Look for Stripe errors
- ✅ Verify correct test card number

### Orders not appearing
- ✅ Refresh page
- ✅ Check correct site is selected
- ✅ Verify user owns the site
- ✅ Check database for orders

---

## Performance Expectations

| Operation | Expected Time |
|-----------|----------------|
| Add to cart | < 100ms |
| Update quantity | < 50ms |
| Load checkout | < 2s |
| Process payment | < 3-5s |
| Load orders list | < 1s |
| Update order status | < 500ms |

---

## After Testing

1. All tests pass → system is production-ready
2. Failures → fix code and tests; report in chat (do not create new report docs)
3. Flow changes → update [ECOMMERCE_TESTING_GUIDE.md](./ECOMMERCE_TESTING_GUIDE.md)

---

## Related Documentation

| Topic | Doc |
|-------|-----|
| Full testing guide | [ECOMMERCE_TESTING_GUIDE.md](./ECOMMERCE_TESTING_GUIDE.md) |
| API reference | [ECOMMERCE_QUICK_REFERENCE.md](./ECOMMERCE_QUICK_REFERENCE.md) |
| Tier gating | [ECOMMERCE_TIER_CONSOLIDATION.md](./ECOMMERCE_TIER_CONSOLIDATION.md) |

**Doc index**: [../README.md](../README.md) | **Maintaining docs**: [../governance/AGENT_DOCUMENTATION_GUIDE.md](../governance/AGENT_DOCUMENTATION_GUIDE.md)

**Last updated**: June 2026

