# 🚀 Implementation Plan: Critical Priority Items (P0)

## Date: January 2025
## Sprint: Week 1-2 (Critical Features)

---

## 📋 **OVERVIEW**

This document provides a detailed, step-by-step implementation plan for the 3 critical priority items:

1. **Backend API Integration for Pro Features** 🔴
2. **Live Preview Updates** 🟡  
3. **Editor Integration with Pro Features** 🟡

**Total Estimated Time:** 26-36 hours (1-2 weeks)  
**Goal:** Make Pro features fully functional and improve editor UX

---

## 🎯 **TASK 1: Backend API Integration for Pro Features**

**Priority:** P0 - CRITICAL BLOCKER  
**Estimated Time:** 12-16 hours  
**Status:** 🔴 NOT STARTED

### **Why This is Critical:**
- Pro e-commerce features are built but can't process payments
- Shopping cart exists but checkout doesn't work
- Products page needs backend CRUD operations
- Users can't actually sell anything yet

---

### **Subtask 1.1: Stripe Checkout Session Endpoint** ⭐ MOST CRITICAL
**Time:** 3-4 hours

**What to Build:**
Create endpoint to generate Stripe Checkout sessions for shopping cart payments.

**Implementation:**

```javascript
// server.js - Add this endpoint

// Stripe Checkout Session Creation
app.post('/api/checkout/create-session', authenticateToken, async (req, res) => {
  try {
    const { items, siteId, successUrl, cancelUrl } = req.body;

    // Validate inputs
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }

    if (!siteId) {
      return res.status(400).json({ message: 'Site ID is required' });
    }

    // Verify site belongs to user
    const site = await dbQuery(
      'SELECT * FROM sites WHERE id = $1 AND owner_id = $2',
      [siteId, req.user.id]
    );

    if (!site.rows || site.rows.length === 0) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // Get site's Stripe Connect account (if using Connect)
    const siteData = site.rows[0];
    const stripeAccountId = siteData.stripe_account_id;

    // Build line items for Stripe
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.description || '',
          images: item.image ? [item.image] : [],
          metadata: {
            product_id: item.id,
            options: JSON.stringify(item.options || {})
          }
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity || 1,
    }));

    // Create Stripe session
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: siteId,
      metadata: {
        site_id: siteId,
        user_id: req.user.id,
        order_items: JSON.stringify(items)
      },
      // Enable Stripe Connect if site has connected account
      ...(stripeAccountId && {
        payment_intent_data: {
          application_fee_amount: calculatePlatformFee(items), // Platform commission
          transfer_data: {
            destination: stripeAccountId,
          },
        },
      }),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Log the checkout session creation
    console.log('✅ Checkout session created:', session.id);

    res.json({
      id: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    res.status(500).json({ 
      message: 'Failed to create checkout session',
      error: error.message 
    });
  }
});

// Helper function to calculate platform fee (10% commission)
function calculatePlatformFee(items) {
  const total = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  return Math.round(total * 100 * 0.10); // 10% in cents
}
```

**Testing:**
```bash
# Test with curl
curl -X POST http://localhost:3000/api/checkout/create-session \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "id": "prod_123",
        "name": "Test Product",
        "price": 29.99,
        "quantity": 2
      }
    ],
    "siteId": "site-123",
    "successUrl": "http://localhost:5173/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    "cancelUrl": "http://localhost:5173/checkout/cancel"
  }'
```

---

### **Subtask 1.2: Stripe Webhook Handler** ⭐ CRITICAL
**Time:** 3-4 hours

**What to Build:**
Handle Stripe webhook events to create orders when payments succeed.

**Implementation:**

```javascript
// server.js - Add webhook endpoint

// Stripe Webhook Handler (must be BEFORE bodyParser.json())
app.post('/api/webhooks/stripe', 
  express.raw({ type: 'application/json' }), 
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('⚠️  Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('📥 Received Stripe webhook:', event.type);

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object);
          break;
        
        case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object);
          break;
        
        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('Webhook handler error:', error);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }
);

// Handle successful checkout
async function handleCheckoutSessionCompleted(session) {
  console.log('💰 Payment successful for session:', session.id);

  const { 
    client_reference_id: siteId,
    metadata,
    amount_total,
    customer_email,
    customer_details
  } = session;

  // Parse order items from metadata
  const orderItems = JSON.parse(metadata.order_items || '[]');

  // Create order in database
  const orderId = nodeRandomUUID();
  
  await dbQuery(`
    INSERT INTO orders (
      id, site_id, user_id, customer_email, customer_name,
      items, total_amount, stripe_session_id, status, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
  `, [
    orderId,
    siteId,
    metadata.user_id,
    customer_email,
    customer_details?.name || 'Guest',
    JSON.stringify(orderItems),
    amount_total / 100, // Convert from cents
    session.id,
    'completed'
  ]);

  console.log('✅ Order created:', orderId);

  // Send order confirmation email
  try {
    await sendEmail(EmailTypes.ORDER_CONFIRMATION, customer_email, {
      orderId,
      items: orderItems,
      total: (amount_total / 100).toFixed(2),
      customerName: customer_details?.name || 'Customer'
    });
  } catch (emailError) {
    console.error('Failed to send order confirmation:', emailError);
  }

  // Notify business owner
  try {
    const siteOwner = await dbQuery(
      'SELECT email FROM users WHERE id = $1',
      [metadata.user_id]
    );
    
    if (siteOwner.rows.length > 0) {
      await sendEmail(EmailTypes.NEW_ORDER, siteOwner.rows[0].email, {
        orderId,
        items: orderItems,
        total: (amount_total / 100).toFixed(2),
        customerEmail: customer_email
      });
    }
  } catch (error) {
    console.error('Failed to notify business owner:', error);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('✅ Payment intent succeeded:', paymentIntent.id);
  // Additional handling if needed
}

async function handlePaymentIntentFailed(paymentIntent) {
  console.error('❌ Payment intent failed:', paymentIntent.id);
  // Log failed payment, notify user
}
```

**Database Schema (if not exists):**
```sql
-- Add to database/schema.sql or run migration

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(255) PRIMARY KEY,
  site_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255),
  items JSONB NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  stripe_session_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_site_id ON orders(site_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
```

**Setup Webhook in Stripe:**
```bash
# 1. Install Stripe CLI
brew install stripe/stripe-cli/stripe

# 2. Login to Stripe
stripe login

# 3. Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 4. Get webhook signing secret (save to .env)
# STRIPE_WEBHOOK_SECRET=whsec_...
```

---

### **Subtask 1.3: Products CRUD Endpoints**
**Time:** 3-4 hours

**What to Build:**
Backend endpoints for Products page to manage products.

**Implementation:**

```javascript
// server.js - Products endpoints

// Get all products for a site
app.get('/api/sites/:siteId/products', authenticateToken, async (req, res) => {
  try {
    const { siteId } = req.params;

    // Verify site ownership
    const site = await dbQuery(
      'SELECT * FROM sites WHERE id = $1 AND owner_id = $2',
      [siteId, req.user.id]
    );

    if (!site.rows || site.rows.length === 0) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // Get products
    const products = await dbQuery(
      'SELECT * FROM products WHERE site_id = $1 ORDER BY created_at DESC',
      [siteId]
    );

    res.json(products.rows);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});

// Create product
app.post('/api/sites/:siteId/products', authenticateToken, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { name, description, price, category, image, stock, available } = req.body;

    // Verify site ownership
    const site = await dbQuery(
      'SELECT * FROM sites WHERE id = $1 AND owner_id = $2',
      [siteId, req.user.id]
    );

    if (!site.rows || site.rows.length === 0) {
      return res.status(404).json({ message: 'Site not found' });
    }

    const productId = nodeRandomUUID();

    await dbQuery(`
      INSERT INTO products (
        id, site_id, name, description, price, category, 
        image, stock, available, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      productId, siteId, name, description, price, category,
      image, stock || null, available !== false
    ]);

    res.status(201).json({ 
      id: productId,
      message: 'Product created successfully' 
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Failed to create product' });
  }
});

// Update product
app.put('/api/sites/:siteId/products/:productId', authenticateToken, async (req, res) => {
  try {
    const { siteId, productId } = req.params;
    const updates = req.body;

    // Verify site ownership
    const site = await dbQuery(
      'SELECT * FROM sites WHERE id = $1 AND owner_id = $2',
      [siteId, req.user.id]
    );

    if (!site.rows || site.rows.length === 0) {
      return res.status(404).json({ message: 'Site not found' });
    }

    // Build update query dynamically
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (['name', 'description', 'price', 'category', 'image', 'stock', 'available'].includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    fields.push(`updated_at = NOW()`);
    values.push(productId, siteId);

    await dbQuery(
      `UPDATE products SET ${fields.join(', ')} 
       WHERE id = $${paramCount} AND site_id = $${paramCount + 1}`,
      values
    );

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Failed to update product' });
  }
});

// Delete product
app.delete('/api/sites/:siteId/products/:productId', authenticateToken, async (req, res) => {
  try {
    const { siteId, productId } = req.params;

    // Verify site ownership
    const site = await dbQuery(
      'SELECT * FROM sites WHERE id = $1 AND owner_id = $2',
      [siteId, req.user.id]
    );

    if (!site.rows || site.rows.length === 0) {
      return res.status(404).json({ message: 'Site not found' });
    }

    await dbQuery(
      'DELETE FROM products WHERE id = $1 AND site_id = $2',
      [productId, siteId]
    );

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Failed to delete product' });
  }
});
```

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(255) PRIMARY KEY,
  site_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),
  image TEXT,
  stock INTEGER,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_products_site_id ON products(site_id);
CREATE INDEX idx_products_available ON products(available);
```

---

### **Subtask 1.4: Connect Products Page to Backend**
**Time:** 2-3 hours

**What to Update:**
Update Products.jsx to use real API instead of mock data.

**Changes Needed:**

```javascript
// src/pages/Products.jsx - Update loadProducts function

const loadProducts = async () => {
  if (!siteId) {
    showError('No site selected');
    return;
  }

  setLoading(true);
  try {
    const response = await fetch(`/api/sites/${siteId}/products`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load products');
    }

    const data = await response.json();
    setProducts(data);
  } catch (error) {
    console.error('Load products error:', error);
    showError('Failed to load products');
  } finally {
    setLoading(false);
  }
};

// Update handleSaveProduct
const handleSaveProduct = async (productData) => {
  try {
    const endpoint = editingProduct
      ? `/api/sites/${siteId}/products/${editingProduct.id}`
      : `/api/sites/${siteId}/products`;
    
    const method = editingProduct ? 'PUT' : 'POST';

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      throw new Error('Failed to save product');
    }

    showSuccess(editingProduct ? 'Product updated' : 'Product created');
    await loadProducts();
    setShowProductModal(false);
  } catch (error) {
    console.error('Save product error:', error);
    showError('Failed to save product');
  }
};

// Update handleDeleteProduct
const handleDeleteProduct = async (product) => {
  if (!window.confirm(`Delete "${product.name}"?`)) return;

  try {
    const response = await fetch(
      `/api/sites/${siteId}/products/${product.id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete product');
    }

    showSuccess('Product deleted');
    await loadProducts();
  } catch (error) {
    console.error('Delete product error:', error);
    showError('Failed to delete product');
  }
};
```

---

### **Subtask 1.5: Testing & Validation**
**Time:** 1-2 hours

**Test Checklist:**

- [ ] Create Stripe checkout session successfully
- [ ] Webhook receives and processes checkout.session.completed
- [ ] Order is created in database
- [ ] Confirmation emails sent
- [ ] Products CRUD operations work
- [ ] Products page loads real data
- [ ] Shopping cart checkout flow works end-to-end
- [ ] Error handling works for failed payments
- [ ] Stripe Connect accounts work (if implemented)

**Test Commands:**
```bash
# Run server
npm run dev:backend

# In another terminal, run Stripe webhook listener
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Run frontend
npm run dev

# Test full flow:
# 1. Add products in Products page
# 2. Add to cart on storefront
# 3. Checkout
# 4. Complete payment with test card: 4242 4242 4242 4242
# 5. Verify order appears in Orders page
```

---

## 🎨 **TASK 2: Live Preview Updates**

**Priority:** P0 - CRITICAL  
**Estimated Time:** 6-8 hours  
**Status:** 🟡 PARTIAL

### **Why This is Critical:**
- Users expect real-time preview updates
- Current preview requires manual refresh
- Core selling point of the editor

---

### **Subtask 2.1: Implement Debounced Preview Updates**
**Time:** 3-4 hours

**What to Change:**
Update SiteContext to trigger preview updates automatically with debouncing.

**Implementation:**

```javascript
// src/context/SiteContext.jsx - Add debounced preview update

import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';

export const SiteContext = createContext();

export function SiteProvider({ children }) {
  const [siteData, setSiteData] = useState({});
  const [draftId, setDraftId] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [previewKey, setPreviewKey] = useState(0); // NEW: Force preview refresh
  
  const updateTimerRef = useRef(null);
  const previewTimerRef = useRef(null);

  // Debounced preview update (300ms delay)
  const triggerPreviewUpdate = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
    
    previewTimerRef.current = setTimeout(() => {
      setPreviewKey(prev => prev + 1);
      console.log('🔄 Preview updated');
    }, 300); // 300ms debounce
  }, []);

  // Update field with automatic preview trigger
  const updateField = useCallback((field, value) => {
    setSiteData(prev => {
      const newData = { ...prev };
      const keys = field.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    
    // Trigger preview update
    triggerPreviewUpdate();
  }, [triggerPreviewUpdate]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!draftId) return;
    
    const autoSaveInterval = setInterval(() => {
      saveDraft(true); // true = silent save
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [draftId, siteData]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, []);

  const value = {
    siteData,
    setSiteData,
    draftId,
    setDraftId,
    lastSaved,
    setLastSaved,
    previewKey, // NEW: Pass to PreviewFrame
    updateField,
    // ... other methods
  };

  return (
    <SiteContext.Provider value={value}>
      {children}
    </SiteContext.Provider>
  );
}
```

---

### **Subtask 2.2: Update PreviewFrame to React to Changes**
**Time:** 2-3 hours

**What to Change:**
Update PreviewFrame to watch for preview key changes and reload iframe.

**Implementation:**

```javascript
// src/components/setup/PreviewFrame.jsx

import React, { useEffect, useRef, useState } from 'react';
import { useSite } from '../../hooks/useSite';
import './PreviewFrame.css';

function PreviewFrame() {
  const { siteData, previewKey } = useSite();
  const iframeRef = useRef(null);
  const [deviceMode, setDeviceMode] = useState('desktop'); // desktop, tablet, mobile
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update preview when previewKey changes
  useEffect(() => {
    if (!iframeRef.current) return;
    
    setIsRefreshing(true);
    
    // Send updated data to iframe via postMessage
    try {
      iframeRef.current.contentWindow?.postMessage({
        type: 'UPDATE_SITE_DATA',
        data: siteData
      }, '*');
      
      setTimeout(() => setIsRefreshing(false), 300);
    } catch (error) {
      console.error('Preview update error:', error);
      setIsRefreshing(false);
    }
  }, [previewKey, siteData]);

  // Initial load
  useEffect(() => {
    // Load preview template based on siteData.template
  }, []);

  const getDeviceClass = () => {
    switch (deviceMode) {
      case 'tablet': return 'device-tablet';
      case 'mobile': return 'device-mobile';
      default: return 'device-desktop';
    }
  };

  return (
    <div className="preview-frame-container">
      {/* Device Toggle */}
      <div className="preview-toolbar">
        <div className="device-toggle">
          <button
            className={deviceMode === 'desktop' ? 'active' : ''}
            onClick={() => setDeviceMode('desktop')}
            title="Desktop View"
          >
            🖥️
          </button>
          <button
            className={deviceMode === 'tablet' ? 'active' : ''}
            onClick={() => setDeviceMode('tablet')}
            title="Tablet View"
          >
            📱
          </button>
          <button
            className={deviceMode === 'mobile' ? 'active' : ''}
            onClick={() => setDeviceMode('mobile')}
            title="Mobile View"
          >
            📱
          </button>
        </div>

        {/* Refresh Indicator */}
        {isRefreshing && (
          <div className="refresh-indicator">
            <span className="spinner"></span>
            Updating preview...
          </div>
        )}
      </div>

      {/* Preview Iframe */}
      <div className={`preview-wrapper ${getDeviceClass()}`}>
        <iframe
          ref={iframeRef}
          className="preview-iframe"
          title="Site Preview"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}

export default PreviewFrame;
```

**Add CSS for device modes:**

```css
/* src/components/setup/PreviewFrame.css */

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  background: var(--bg-elevated);
  border-bottom: 2px solid var(--border-dark);
}

.device-toggle {
  display: flex;
  gap: var(--spacing-xs);
}

.device-toggle button {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-card);
  border: 2px solid var(--border-dark);
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
}

.device-toggle button.active {
  background: rgba(6, 182, 212, 0.2);
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.refresh-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--primary-color);
  font-size: 0.9rem;
  font-weight: 600;
}

.refresh-indicator .spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-dark);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Device modes */
.preview-wrapper {
  width: 100%;
  height: calc(100% - 60px);
  background: var(--bg-darker);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  transition: all 0.3s ease;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: 2px solid var(--border-dark);
  border-radius: 12px;
  background: white;
  transition: all 0.3s ease;
}

.device-tablet .preview-iframe {
  max-width: 768px;
}

.device-mobile .preview-iframe {
  max-width: 375px;
}
```

---

### **Subtask 2.3: Add Auto-Save Indicator**
**Time:** 1-2 hours

**What to Add:**
Visual feedback for auto-save status.

**Implementation:**

```javascript
// src/components/setup/EditorPanel.jsx - Add save indicator

function EditorPanel() {
  const { lastSaved, isSaving } = useSite();

  const getTimeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="editor-panel">
      {/* Save Status */}
      <div className="save-status">
        {isSaving ? (
          <span className="saving">
            <span className="spinner"></span>
            Saving...
          </span>
        ) : lastSaved ? (
          <span className="saved">
            ✓ Saved {getTimeAgo(lastSaved)}
          </span>
        ) : null}
      </div>

      {/* Rest of editor */}
      {/* ... */}
    </div>
  );
}
```

---

## 📝 **TASK 3: Editor Integration with Pro Features**

**Priority:** P0 - HIGH  
**Estimated Time:** 8-12 hours  
**Status:** 🔴 NOT STARTED

### **Why This is Critical:**
- Pro features exist but users can't configure them
- Need UI for products, booking, and payment settings
- Template-specific editor tabs needed

---

### **Subtask 3.1: Create ProductsEditor Tab**
**Time:** 4-5 hours

**What to Build:**
Editor tab for managing products within the site editor.

**Implementation:**

Create `/src/components/setup/forms/ProductsEditor.jsx`:

```javascript
import React, { useState } from 'react';
import { useSite } from '../../../hooks/useSite';
import ImageUploader from './ImageUploader';
import './ProductsEditor.css';

function ProductsEditor() {
  const { siteData, updateField, addProduct, updateProduct, deleteProduct } = useSite();
  const [expandedProduct, setExpandedProduct] = useState(null);

  const products = siteData.products || [];

  const handleAddProduct = () => {
    const newProduct = {
      id: `product-${Date.now()}`,
      name: '',
      description: '',
      price: '',
      category: '',
      image: '',
      stock: null,
      available: true
    };
    addProduct(newProduct);
    setExpandedProduct(newProduct.id);
  };

  return (
    <div className="products-editor">
      <div className="editor-header">
        <h3>🛍️ Products</h3>
        <button onClick={handleAddProduct} className="btn btn-primary btn-sm">
          + Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <p>No products yet</p>
          <button onClick={handleAddProduct} className="btn btn-primary">
            Add Your First Product
          </button>
        </div>
      ) : (
        <div className="products-list">
          {products.map((product) => (
            <div 
              key={product.id} 
              className={`product-item ${expandedProduct === product.id ? 'expanded' : ''}`}
            >
              <div 
                className="product-header"
                onClick={() => setExpandedProduct(
                  expandedProduct === product.id ? null : product.id
                )}
              >
                <div className="product-preview">
                  {product.image ? (
                    <img src={product.image} alt={product.name} />
                  ) : (
                    <div className="no-image">📦</div>
                  )}
                  <div className="product-info">
                    <strong>{product.name || 'Untitled Product'}</strong>
                    <span className="product-price">${product.price || '0.00'}</span>
                  </div>
                </div>
                <button className="expand-icon">
                  {expandedProduct === product.id ? '▼' : '▶'}
                </button>
              </div>

              {expandedProduct === product.id && (
                <div className="product-form">
                  <div className="form-group">
                    <label>Product Image</label>
                    <ImageUploader
                      value={product.image}
                      onChange={(url) => updateProduct(product.id, { image: url })}
                      aspectRatio="1:1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Product Name *</label>
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                      placeholder="e.g., Premium Package"
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={product.description}
                      onChange={(e) => updateProduct(product.id, { description: e.target.value })}
                      placeholder="Describe your product..."
                      rows={3}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Price *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={product.price}
                        onChange={(e) => updateProduct(product.id, { price: e.target.value })}
                        placeholder="29.99"
                      />
                    </div>

                    <div className="form-group">
                      <label>Category</label>
                      <input
                        type="text"
                        value={product.category}
                        onChange={(e) => updateProduct(product.id, { category: e.target.value })}
                        placeholder="e.g., Services"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Stock (optional)</label>
                      <input
                        type="number"
                        value={product.stock || ''}
                        onChange={(e) => updateProduct(product.id, { stock: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Leave empty for unlimited"
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={product.available !== false}
                          onChange={(e) => updateProduct(product.id, { available: e.target.checked })}
                        />
                        Available for purchase
                      </label>
                    </div>
                  </div>

                  <div className="product-actions">
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="btn btn-danger btn-sm"
                    >
                      🗑️ Delete Product
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="editor-tip">
        💡 <strong>Tip:</strong> Products will appear on your site with "Add to Cart" buttons. 
        Make sure to configure your payment settings in the Payments tab.
      </div>
    </div>
  );
}

export default ProductsEditor;
```

---

### **Subtask 3.2: Create BookingEditor Tab**
**Time:** 2-3 hours

**What to Build:**
Editor tab for booking widget configuration.

**Implementation:**

Create `/src/components/setup/forms/BookingEditor.jsx`:

```javascript
import React from 'react';
import { useSite } from '../../../hooks/useSite';
import './BookingEditor.css';

function BookingEditor() {
  const { siteData, updateField } = useSite();
  
  const booking = siteData.booking || {
    enabled: false,
    provider: 'calendly',
    url: '',
    style: 'inline'
  };

  const providers = [
    { value: 'calendly', label: 'Calendly', icon: '📅' },
    { value: 'acuity', label: 'Acuity Scheduling', icon: '🗓️' },
    { value: 'square', label: 'Square Appointments', icon: '🔲' },
    { value: 'calcom', label: 'Cal.com', icon: '📆' }
  ];

  return (
    <div className="booking-editor">
      <div className="editor-header">
        <h3>📅 Booking Configuration</h3>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={booking.enabled}
            onChange={(e) => updateField('booking.enabled', e.target.checked)}
          />
          Enable booking widget
        </label>
      </div>

      {booking.enabled && (
        <>
          <div className="form-group">
            <label>Booking Provider</label>
            <div className="provider-grid">
              {providers.map((provider) => (
                <button
                  key={provider.value}
                  className={`provider-option ${booking.provider === provider.value ? 'selected' : ''}`}
                  onClick={() => updateField('booking.provider', provider.value)}
                >
                  <span className="provider-icon">{provider.icon}</span>
                  <span className="provider-label">{provider.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Booking URL</label>
            <input
              type="url"
              value={booking.url}
              onChange={(e) => updateField('booking.url', e.target.value)}
              placeholder={`e.g., https://calendly.com/yourbusiness/30min`}
            />
            <small className="form-help">
              Get your booking URL from your {booking.provider} account
            </small>
          </div>

          <div className="form-group">
            <label>Display Style</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="inline"
                  checked={booking.style === 'inline'}
                  onChange={(e) => updateField('booking.style', e.target.value)}
                />
                Inline (embedded on page)
              </label>
              <label>
                <input
                  type="radio"
                  value="popup"
                  checked={booking.style === 'popup'}
                  onChange={(e) => updateField('booking.style', e.target.value)}
                />
                Popup (opens in modal)
              </label>
            </div>
          </div>

          <div className="booking-preview">
            <h4>Preview</h4>
            <div className="preview-box">
              {booking.url ? (
                <div className="preview-content">
                  <span className="preview-icon">{providers.find(p => p.value === booking.provider)?.icon}</span>
                  <p>Booking widget will appear here</p>
                  <small>{booking.style === 'inline' ? 'Embedded inline' : 'Opens in popup'}</small>
                </div>
              ) : (
                <p className="preview-empty">Add booking URL to see preview</p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="editor-tip">
        💡 <strong>Pro Feature:</strong> Embedded booking widgets keep visitors on your site,
        improving conversion rates compared to external links.
      </div>
    </div>
  );
}

export default BookingEditor;
```

---

### **Subtask 3.3: Create PaymentSettings Tab**
**Time:** 2-3 hours

**What to Build:**
Editor tab for Stripe payment configuration.

**Implementation:**

Create `/src/components/setup/forms/PaymentSettings.jsx`:

```javascript
import React, { useState } from 'react';
import { useSite } from '../../../hooks/useSite';
import './PaymentSettings.css';

function PaymentSettings() {
  const { siteData, updateField } = useSite();
  const [showKeys, setShowKeys] = useState(false);
  
  const stripe = siteData.stripe || {
    enabled: false,
    publishableKey: '',
    secretKey: '', // Never sent to client in production
    testMode: true
  };

  const isConfigured = stripe.publishableKey && stripe.publishableKey.length > 0;

  return (
    <div className="payment-settings">
      <div className="editor-header">
        <h3>💳 Payment Settings</h3>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={stripe.enabled}
            onChange={(e) => updateField('stripe.enabled', e.target.checked)}
          />
          Enable online payments (Stripe)
        </label>
      </div>

      {stripe.enabled && (
        <>
          <div className="stripe-status">
            {isConfigured ? (
              <div className="status-badge status-success">
                ✓ Stripe Configured
              </div>
            ) : (
              <div className="status-badge status-warning">
                ⚠️ Stripe Not Configured
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Environment</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  checked={stripe.testMode}
                  onChange={() => updateField('stripe.testMode', true)}
                />
                Test Mode (recommended while testing)
              </label>
              <label>
                <input
                  type="radio"
                  checked={!stripe.testMode}
                  onChange={() => updateField('stripe.testMode', false)}
                />
                Live Mode (accepts real payments)
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>
              Stripe Publishable Key
              <button
                type="button"
                onClick={() => setShowKeys(!showKeys)}
                className="btn-icon"
              >
                {showKeys ? '👁️' : '🔒'}
              </button>
            </label>
            <input
              type={showKeys ? 'text' : 'password'}
              value={stripe.publishableKey}
              onChange={(e) => updateField('stripe.publishableKey', e.target.value)}
              placeholder={stripe.testMode ? 'pk_test_...' : 'pk_live_...'}
            />
            <small className="form-help">
              Starts with {stripe.testMode ? 'pk_test_' : 'pk_live_'}. 
              Find this in your <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
                Stripe Dashboard
              </a>.
            </small>
          </div>

          {!isConfigured && (
            <div className="setup-guide">
              <h4>🚀 Quick Setup Guide</h4>
              <ol>
                <li>
                  <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer">
                    Create a Stripe account
                  </a> (if you don't have one)
                </li>
                <li>
                  Go to <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
                    API Keys
                  </a> in your Stripe dashboard
                </li>
                <li>Copy your "Publishable key" (starts with pk_test_)</li>
                <li>Paste it above and save your site</li>
              </ol>
            </div>
          )}

          <div className="payment-info">
            <h4>What's Included:</h4>
            <ul>
              <li>✓ Secure credit card processing</li>
              <li>✓ Apple Pay & Google Pay support</li>
              <li>✓ Automatic receipts</li>
              <li>✓ PCI compliance</li>
              <li>✓ Fraud detection</li>
            </ul>
          </div>
        </>
      )}

      <div className="editor-tip">
        💡 <strong>Security Note:</strong> Your secret key is never sent to the browser.
        It's stored securely on the server.
      </div>
    </div>
  );
}

export default PaymentSettings;
```

---

### **Subtask 3.4: Update EditorPanel to Include Pro Tabs**
**Time:** 1-2 hours

**What to Update:**
Add conditional tabs based on template tier and type.

**Implementation:**

```javascript
// src/components/setup/EditorPanel.jsx - Update sections array

import ProductsEditor from './forms/ProductsEditor';
import BookingEditor from './forms/BookingEditor';
import PaymentSettings from './forms/PaymentSettings';

function EditorPanel() {
  const { siteData } = useSite();
  const [activeSection, setActiveSection] = useState('business');

  // Determine which tabs to show based on template/plan
  const isPro = siteData.plan === 'pro' || siteData.tier === 'Pro';
  const isEcommerce = siteData.type === 'ecommerce' || siteData.category === 'Retail';
  const hasBooking = siteData.type === 'service' || ['salon', 'fitness', 'spa'].includes(siteData.template);

  const sections = [
    { id: 'business', label: 'Business Info', icon: '🏢', always: true },
    { id: 'services', label: 'Services', icon: '✨', always: true },
    { id: 'contact', label: 'Contact', icon: '📞', always: true },
    { id: 'colors', label: 'Colors', icon: '🎨', always: true },
    // Pro tabs (conditional)
    ...(isPro && isEcommerce ? [{ id: 'products', label: 'Products', icon: '🛍️', pro: true }] : []),
    ...(isPro && hasBooking ? [{ id: 'booking', label: 'Booking', icon: '📅', pro: true }] : []),
    ...(isPro ? [{ id: 'payments', label: 'Payments', icon: '💳', pro: true }] : []),
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'business':
        return <BusinessInfoForm />;
      case 'services':
        return renderServices();
      case 'contact':
        return renderContact();
      case 'colors':
        return renderColors();
      case 'products':
        return <ProductsEditor />;
      case 'booking':
        return <BookingEditor />;
      case 'payments':
        return <PaymentSettings />;
      default:
        return <BusinessInfoForm />;
    }
  };

  return (
    <div className="editor-panel">
      {/* Tabs */}
      <div className="editor-tabs">
        {sections.map((section) => (
          <button
            key={section.id}
            className={`editor-tab ${activeSection === section.id ? 'active' : ''} ${section.pro ? 'pro-tab' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            <span className="tab-icon">{section.icon}</span>
            <span className="tab-label">{section.label}</span>
            {section.pro && <span className="pro-badge">PRO</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="editor-content">
        {renderSection()}
      </div>
    </div>
  );
}
```

**Add Pro badge styling:**

```css
/* src/components/setup/EditorPanel.css */

.pro-tab {
  position: relative;
}

.pro-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: white;
  font-size: 0.6rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

---

## ✅ **TESTING CHECKLIST**

### **Task 1: Backend API**
- [ ] Stripe checkout session creates successfully
- [ ] Webhook receives events from Stripe
- [ ] Orders created in database
- [ ] Emails sent on successful purchase
- [ ] Products CRUD operations work
- [ ] Products page loads real data
- [ ] End-to-end checkout flow works
- [ ] Error handling works properly

### **Task 2: Live Preview**
- [ ] Preview updates automatically when editing
- [ ] Debouncing works (no excessive updates)
- [ ] Device toggle works (desktop/tablet/mobile)
- [ ] Refresh indicator shows when updating
- [ ] Auto-save works every 30 seconds
- [ ] Save indicator shows correct status
- [ ] No performance issues

### **Task 3: Editor Pro Tabs**
- [ ] Products tab appears for Pro users
- [ ] Booking tab appears for service templates
- [ ] Payments tab appears for Pro users
- [ ] Products editor works (add/edit/delete)
- [ ] Booking configuration saves correctly
- [ ] Payment settings save correctly
- [ ] Pro badges display correctly
- [ ] Tabs are conditional based on plan/template

---

## 📊 **SUCCESS METRICS**

### **Functional:**
- ✅ Stripe checkout completes successfully
- ✅ Orders appear in database and dashboard
- ✅ Live preview updates in < 500ms
- ✅ Pro editor tabs render correctly
- ✅ All CRUD operations work

### **User Experience:**
- ✅ Checkout flow is smooth
- ✅ Preview feels real-time
- ✅ Editor is intuitive
- ✅ No confusing errors
- ✅ Clear feedback on all actions

### **Performance:**
- ✅ Preview updates < 300ms
- ✅ API responses < 1s
- ✅ No memory leaks
- ✅ Smooth animations
- ✅ No lag in editor

---

## 🚀 **IMPLEMENTATION ORDER**

### **Day 1-2: Backend API (Task 1)**
- Morning: Checkout session endpoint
- Afternoon: Webhook handler
- Evening: Products CRUD endpoints

### **Day 3: Backend API (Task 1 continued)**
- Morning: Connect Products page
- Afternoon: Testing & bug fixes
- Evening: Documentation

### **Day 4-5: Live Preview (Task 2)**
- Morning: Debounced updates in Context
- Afternoon: PreviewFrame improvements
- Evening: Auto-save & indicators

### **Day 6-7: Editor Pro Tabs (Task 3)**
- Morning: ProductsEditor component
- Afternoon: BookingEditor & PaymentSettings
- Evening: Integration & testing

### **Day 8: Final Testing & Polish**
- Morning: End-to-end testing
- Afternoon: Bug fixes
- Evening: Documentation & deployment

---

## 📝 **NEXT STEPS**

1. **Set up Stripe webhook locally:**
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

2. **Create database tables:**
   ```bash
   # Run migrations for orders and products tables
   ```

3. **Start implementing Task 1:**
   - Begin with checkout session endpoint
   - Test with Stripe test cards

4. **Deploy webhook endpoint:**
   - Configure webhook in Stripe Dashboard
   - Test with real Stripe events

5. **Continue with Tasks 2 & 3**

---

**Status:** Ready to implement  
**Priority:** Start immediately  
**Timeline:** 8-10 days  
**Impact:** Makes Pro features fully functional 🚀


