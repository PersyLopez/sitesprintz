# 🧪 Quick Test Guide - Critical Features

**5-minute test to verify everything works!**

---

## 🚀 Quick Start

### **Prerequisites:**
- ✅ Server running (`npm start`)
- ✅ Stripe keys configured in `.env`
- ✅ Resend API key configured (for emails)
- ✅ User account created

---

## 📋 Test Checklist

### **1. Test Product Management** (2 minutes)

**Step 1: Create Test Site**
```
1. Login to dashboard
2. Create new site with "Pro" plan template
3. Publish site
```

**Step 2: Manage Products**
```
1. Click "🍽️ Products" button on site card
2. Click "➕ Add Product"
3. Add test product:
   - Name: "Test Pizza"
   - Price: 12.99
   - Description: "Delicious test pizza"
   - Upload any image (drag & drop)
4. Click "Save Product"
5. Verify product appears in grid
```

**Step 3: Quick Actions**
```
1. Click 👁️ icon - product toggles to unavailable
2. Click 👁️ again - product available again
3. Click ✏️ icon - edit modal opens
4. Click 📋 icon - product duplicated
5. Click 🗑️ on duplicate - product deleted
```

**✅ Expected Result:**
- Product created with optimized image
- Quick actions work instantly
- No page reloads needed

---

### **2. Test Image Upload** (1 minute)

**Step 1: Upload Image**
```
1. In Products dashboard, click "➕ Add Product"
2. Drag an image onto the upload area
   OR click area to browse
3. Watch image preview appear
4. Save product
```

**Step 2: Verify Optimization**
```
1. Check /public/uploads/ folder
2. Find file starting with "optimized-"
3. Verify file size reduced
4. Verify max dimensions 1200x1200
```

**✅ Expected Result:**
- Image uploads successfully
- Optimized version created
- Preview shows immediately

---

### **3. Test Order Flow** (2 minutes)

**Step 1: Place Test Order**
```
1. Visit your published Pro site
2. Click "Add to Cart" on a product
3. Click cart icon, then "Checkout"
4. Stripe checkout opens
5. Use test card: 4242 4242 4242 4242
6. Any future date, any CVC
7. Complete payment
```

**Step 2: Check Order Dashboard**
```
1. Return to main dashboard
2. Click "📦 Orders" on site card
3. Order should appear:
   - Order #ORD-XXXXXX
   - Customer details
   - Products ordered
   - Total amount
   - Status: "New"
```

**Step 3: Manage Order**
```
1. Click "✅ Mark Completed"
2. Status changes to "Completed"
3. Click filter: "Completed"
4. Order still visible
5. Click filter: "New"
6. Order not visible (correct!)
```

**✅ Expected Result:**
- Order captured from Stripe
- Appears in dashboard
- Status updates work
- Filters work correctly

---

### **4. Test Email Notifications** (Optional)

**If Resend configured:**
```
1. Place test order (see above)
2. Check customer email for:
   - Order confirmation
   - Order number
   - Items and total
3. Check business owner email for:
   - New order alert
   - Customer contact info
   - Link to dashboard
```

**✅ Expected Result:**
- Two emails sent instantly
- Professional formatting
- All order details included

---

### **5. Test CSV Import/Export** (1 minute)

**Export:**
```
1. Go to Products dashboard
2. Click "📥 Export CSV"
3. File downloads: products-{siteId}.csv
4. Open in Excel/Numbers
5. Verify all products listed
```

**Import:**
```
1. Edit CSV (add/modify products)
2. Click "📤 Import CSV"
3. Select edited CSV file
4. Products update instantly
```

**✅ Expected Result:**
- CSV exports with all data
- CSV imports and updates products
- No data loss

---

## 🎯 Success Criteria

### **All Tests Pass If:**

**Orders:**
- [x] Orders appear in dashboard after Stripe payment
- [x] Customer details visible (name, email, phone)
- [x] Order items and totals correct
- [x] Status can be updated (new → completed/cancelled)
- [x] Filters work (all, new, completed, cancelled)
- [x] Email/call buttons work

**Products:**
- [x] Can add products with all fields
- [x] Can edit existing products
- [x] Can delete products with confirmation
- [x] Can duplicate products
- [x] Can toggle availability instantly
- [x] CSV export works
- [x] CSV import works

**Images:**
- [x] Drag & drop uploads work
- [x] File browser uploads work
- [x] Images optimized automatically
- [x] Preview shows before save
- [x] Saved images display on site

**Dashboard:**
- [x] Pro sites show "📦 Orders" button
- [x] Pro sites show "🍽️ Products" button
- [x] Buttons link to correct pages with siteId
- [x] Authentication required
- [x] Only site owner can access

**Emails:**
- [x] Customer receives order confirmation
- [x] Owner receives new order alert
- [x] Emails include all order details
- [x] Links work correctly

---

## 🚨 Troubleshooting

### **Orders Not Appearing:**
```
1. Check Stripe webhook is configured
2. Check webhook endpoint: /api/webhooks/stripe
3. Check Stripe dashboard for webhook events
4. Check server logs for webhook errors
5. Verify STRIPE_WEBHOOK_SECRET in .env
```

### **Emails Not Sending:**
```
1. Check RESEND_API_KEY in .env
2. Check server logs for email errors
3. Verify FROM_EMAIL is configured
4. Test with: node -e "require('./email-service.js')"
```

### **Image Upload Fails:**
```
1. Check /public/uploads/ exists
2. Check folder is writable
3. Verify sharp is installed: npm list sharp
4. Check file size < 5MB
5. Check file type is image
```

### **Products Not Saving:**
```
1. Check site exists in /public/sites/{siteId}/
2. Check site.json is writable
3. Verify authentication token valid
4. Check server logs for errors
```

---

## 📊 Test Results

**After testing, you should see:**

### **Files Created:**
```
/public/data/orders/{siteId}/orders.json  # Order data
/public/uploads/optimized-*.jpg           # Optimized images
```

### **Database/Storage:**
```
Orders: Stored in JSON files per site
Products: Stored in site.json
Images: Stored in /public/uploads/
```

### **Logs:**
```
✅ Order ORD-XXXXXX saved for site {siteId}
✅ Order confirmation sent to customer: email@example.com
✅ Order alert sent to owner: owner@example.com
✅ Updated X products for site {siteId}
```

---

## 🎉 All Tests Pass?

**Congratulations! All critical Pro features are working!**

Your Pro templates can now:
- ✅ Accept payments
- ✅ Capture orders
- ✅ Send email notifications
- ✅ Manage products visually
- ✅ Upload and optimize images
- ✅ Handle order status updates
- ✅ Import/export product data

**Pro templates are ready for production use!** 🚀

---

## 📞 Support

**If any tests fail:**
1. Check server logs: `npm start` output
2. Check browser console: F12 → Console tab
3. Check Network tab: F12 → Network tab
4. Review error messages
5. Check file permissions
6. Verify environment variables

**Common Issues:**
- Authentication: Check JWT_SECRET in .env
- Stripe: Check STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
- Emails: Check RESEND_API_KEY
- Images: Check sharp installation
- Orders: Check webhook configuration

---

## ✅ Final Verification

**Run this quick check:**
```bash
# 1. Check dependencies
npm list multer sharp stripe resend

# 2. Check uploads directory
ls -la public/uploads/

# 3. Check orders directory
ls -la public/data/orders/

# 4. Start server
npm start

# 5. Check logs for startup messages
# Should see: "Listening on port 3000"
```

**Everything working?** → ✅ **SHIP IT!** 🚀


