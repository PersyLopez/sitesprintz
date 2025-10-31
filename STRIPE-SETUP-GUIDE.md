# 🔵 Stripe Setup Guide - SiteSprintz

**Last Updated:** October 31, 2025  
**Purpose:** Step-by-step guide to configure Stripe products and prices

---

## 📋 **What You Need to Create in Stripe**

You need to create **4 products** with **4 recurring prices** (for now):

### **Base Subscriptions:**
1. ✅ **Starter Plan** - $10/month
2. ✅ **Pro Plan** - $25/month

### **Add-On Subscriptions:**
3. ✅ **Starter Add-On Site** - $5/month
4. ✅ **Pro Add-On Site** - $12.50/month

*(Premium tier can wait until booking/POS features are built)*

---

## 🚀 **Step-by-Step Instructions**

### **Step 1: Go to Stripe Dashboard**

1. Visit: https://dashboard.stripe.com/test/products
2. Make sure you're in **TEST MODE** (toggle in top right)
3. Click **"+ Add product"**

---

### **Product 1: Starter Plan**

#### **Product Information:**
- **Name:** `Starter Plan`
- **Description:** `1 display-only website with custom branding, contact forms, and all templates`
- **Statement descriptor:** `SITESPRINTZ-START` (appears on customer's credit card)
- **Unit label:** Leave blank

#### **Pricing:**
- **Pricing model:** Standard pricing
- **Price:** `10.00`
- **Billing period:** Monthly (Recurring)
- **Currency:** USD
- **Price description:** `Starter Plan - 1 Display-Only Site`

#### **After Creating:**
- Copy the **Price ID** (starts with `price_...`)
- Example: `price_1AB2cd3EF4gh5IJ6kL7mN8oP`
- Save this as: `STRIPE_PRICE_STARTER`

---

### **Product 2: Pro Plan**

#### **Product Information:**
- **Name:** `Pro Plan`
- **Description:** `1 e-commerce website with online payments, shopping cart, and order management`
- **Statement descriptor:** `SITESPRINTZ-PRO`
- **Unit label:** Leave blank

#### **Pricing:**
- **Pricing model:** Standard pricing
- **Price:** `25.00`
- **Billing period:** Monthly (Recurring)
- **Currency:** USD
- **Price description:** `Pro Plan - 1 E-Commerce Site`

#### **After Creating:**
- Copy the **Price ID** (starts with `price_...`)
- Example: `price_2AB3cd4EF5gh6IJ7kL8mN9oP`
- Save this as: `STRIPE_PRICE_PRO`

---

### **Product 3: Starter Add-On Site**

#### **Product Information:**
- **Name:** `Starter Add-On Site`
- **Description:** `Additional display-only website (requires active Starter subscription)`
- **Statement descriptor:** `SITESPRINTZ-ADD`
- **Unit label:** `site` (optional, shows as "per site")

#### **Pricing:**
- **Pricing model:** Standard pricing
- **Price:** `5.00`
- **Billing period:** Monthly (Recurring)
- **Currency:** USD
- **Price description:** `Starter Add-On - Additional Site (50% off)`

#### **After Creating:**
- Copy the **Price ID**
- Example: `price_3AB4cd5EF6gh7IJ8kL9mN0oP`
- Save this as: `STRIPE_PRICE_STARTER_ADDON`

---

### **Product 4: Pro Add-On Site**

#### **Product Information:**
- **Name:** `Pro Add-On Site`
- **Description:** `Additional e-commerce website (requires active Pro subscription)`
- **Statement descriptor:** `SITESPRINTZ-ADD`
- **Unit label:** `site`

#### **Pricing:**
- **Pricing model:** Standard pricing
- **Price:** `12.50`
- **Billing period:** Monthly (Recurring)
- **Currency:** USD
- **Price description:** `Pro Add-On - Additional Site (50% off)`

#### **After Creating:**
- Copy the **Price ID**
- Example: `price_4AB5cd6EF7gh8IJ9kL0mN1oP`
- Save this as: `STRIPE_PRICE_PRO_ADDON`

---

## 🔑 **Step 2: Get Your API Keys**

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy these values:

### **Publishable Key:**
- Starts with `pk_test_...`
- Example: `pk_test_51ABcd...`
- Save as: `STRIPE_PUBLISHABLE_KEY`

### **Secret Key:**
- Click "Reveal test key"
- Starts with `sk_test_...`
- Example: `sk_test_51ABcd...`
- ⚠️ **Keep this secret!**
- Save as: `STRIPE_SECRET_KEY`

---

## 🔔 **Step 3: Set Up Webhooks**

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"+ Add endpoint"**
3. **Endpoint URL:** `http://localhost:3000/webhook/stripe`
   - (Change to your production URL later: `https://yourdomain.com/webhook/stripe`)
4. **Description:** `SiteSprintz subscription events`
5. **Events to send:**
   - Select these specific events:
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `invoice.payment_succeeded`
     - ✅ `invoice.payment_failed`
6. Click **"Add endpoint"**
7. Copy the **Signing secret** (starts with `whsec_...`)
8. Save as: `STRIPE_WEBHOOK_SECRET`

---

## 📝 **Step 4: Update Your .env File**

Open `/Users/admin/active-directory-website/.env` and add:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Stripe Price IDs - Base Plans
STRIPE_PRICE_STARTER=price_YOUR_STARTER_PRICE_ID
STRIPE_PRICE_PRO=price_YOUR_PRO_PRICE_ID

# Stripe Price IDs - Add-Ons
STRIPE_PRICE_STARTER_ADDON=price_YOUR_STARTER_ADDON_ID
STRIPE_PRICE_PRO_ADDON=price_YOUR_PRO_ADDON_ID

# Premium (coming later)
# STRIPE_PRICE_PREMIUM=
# STRIPE_PRICE_PREMIUM_ADDON=
```

---

## ✅ **Verification Checklist**

After setup, verify you have:

- [ ] 4 products created in Stripe
- [ ] 4 price IDs copied
- [ ] Secret key copied (starts with `sk_test_`)
- [ ] Publishable key copied (starts with `pk_test_`)
- [ ] Webhook endpoint created
- [ ] Webhook secret copied (starts with `whsec_`)
- [ ] All values added to `.env` file
- [ ] Server restarted

---

## 🧪 **Step 5: Test the Setup**

### **Test Cards (provided by Stripe):**

✅ **Successful Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

❌ **Declined Payment:**
- Card: `4000 0000 0000 0002`

🔄 **Requires Authentication (3D Secure):**
- Card: `4000 0025 0000 3155`

💳 **Other Test Scenarios:**
- Insufficient funds: `4000 0000 0000 9995`
- Expired card: `4000 0000 0000 0069`
- Incorrect CVC: `4000 0000 0000 0127`

Full list: https://stripe.com/docs/testing#cards

---

## 🔄 **How Add-Ons Work in Stripe**

### **Scenario: User adds a 2nd Starter site**

**Initial Subscription:**
```json
{
  "customer": "cus_ABC123",
  "items": [
    {
      "price": "price_starter",     // $10/month
      "quantity": 1
    }
  ]
}
```

**After Adding Add-On:**
```json
{
  "customer": "cus_ABC123",
  "items": [
    {
      "price": "price_starter",        // $10/month
      "quantity": 1
    },
    {
      "price": "price_starter_addon",  // $5/month
      "quantity": 1                     // First add-on
    }
  ]
}
```

**After Adding 2nd Add-On:**
```json
{
  "customer": "cus_ABC123",
  "items": [
    {
      "price": "price_starter",        // $10/month
      "quantity": 1
    },
    {
      "price": "price_starter_addon",  // $5/month
      "quantity": 2                     // 2 add-ons = $10
    }
  ]
}
```

**Total:** $10 + ($5 × 2) = **$20/month**

---

## 💡 **Invoice Example**

Customer will see:
```
SiteSprintz - Monthly Subscription

Starter Plan (1 site)                      $10.00
Starter Add-On Site (2 sites × $5.00)      $10.00
                                          --------
Subtotal                                   $20.00
Tax                                         $0.00
                                          --------
Total                                      $20.00 USD

Charged monthly on the 15th
```

---

## 🚨 **Important Notes**

### **Test vs Production:**
- Start in **TEST MODE** (all price IDs start with `price_test_...`)
- When ready for production:
  1. Switch to **LIVE MODE**
  2. Create the SAME 4 products again
  3. Copy NEW price IDs (will start with `price_live_...`)
  4. Update `.env` with live keys
  5. Update webhook URL to production domain

### **Webhook Endpoint:**
- Local testing: `http://localhost:3000/webhook/stripe`
- Production: `https://sitesprintz.com/webhook/stripe`
- Stripe requires HTTPS in production!

### **Statement Descriptors:**
- Appears on customer's credit card statement
- Keep under 22 characters
- Use: `SITESPRINTZ-START`, `SITESPRINTZ-PRO`, `SITESPRINTZ-ADD`

---

## 🎯 **Quick Reference**

### **Price Summary:**
| Product | Price | Price ID Variable |
|---------|-------|-------------------|
| Starter Plan | $10/mo | `STRIPE_PRICE_STARTER` |
| Pro Plan | $25/mo | `STRIPE_PRICE_PRO` |
| Starter Add-On | $5/mo | `STRIPE_PRICE_STARTER_ADDON` |
| Pro Add-On | $12.50/mo | `STRIPE_PRICE_PRO_ADDON` |

### **Customer Scenarios:**
| Sites | Plan Type | Monthly Cost |
|-------|-----------|--------------|
| 1 Starter | Base only | $10 |
| 2 Starter | Base + 1 add-on | $15 |
| 3 Starter | Base + 2 add-ons | $20 |
| 1 Pro | Base only | $25 |
| 2 Pro | Base + 1 add-on | $37.50 |
| 3 Pro | Base + 2 add-ons | $50 |

---

## 📞 **Need Help?**

**Stripe Documentation:**
- Products & Prices: https://stripe.com/docs/products-prices/overview
- Subscriptions: https://stripe.com/docs/billing/subscriptions/overview
- Webhooks: https://stripe.com/docs/webhooks
- Testing: https://stripe.com/docs/testing

**Stripe Support:**
- Dashboard: https://dashboard.stripe.com/support
- Email: support@stripe.com
- Docs: https://stripe.com/docs

---

## ✅ **You're Ready When:**

- [ ] All 4 products created in Stripe
- [ ] All 4 price IDs in `.env`
- [ ] API keys in `.env`
- [ ] Webhook configured
- [ ] Webhook secret in `.env`
- [ ] Server restarted
- [ ] Test purchase completed successfully

---

**Next Step:** Test the entire flow with test cards! 🚀

**Documentation:** This guide + `PRICING-WITH-ADDONS.md`

