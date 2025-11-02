# 🚀 Pro Features Implementation Plan

**Goal:** Integrate Stripe Connect + Dynamic Pricing + CSV Import/Export into Pro templates

**Timeline:** 2 weeks  
**Impact:** Makes Pro plan actually usable and profitable

---

## 📋 **Features to Implement**

### ✅ **Phase 1: Core Payment Infrastructure (Week 1)**

1. **Stripe Connect (OAuth)** - Easy payment setup
2. **Dynamic Pricing** - No pre-created products needed
3. **CSV Import/Export** - Bulk product management

### ✅ **Phase 2: User Interface (Week 2)**

4. **Product Management Dashboard** - Visual product editor
5. **Pro Template Integration** - Connect features to templates
6. **Testing & Documentation** - Make it bulletproof

---

## 🔧 **Phase 1, Task 1: Stripe Connect Setup**

### **1.1 Register Stripe Connect Application**

```bash
# Go to: https://dashboard.stripe.com/settings/applications
# Click "New application"
# Fill in:
# - Name: SiteSprintz
# - Type: Platform or marketplace
# - Description: Website builder for small businesses
# - Website: https://sitesprintz.com

# Save these values:
STRIPE_CLIENT_ID=ca_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx (or sk_test_xxxxx for testing)
```

**Add to `.env`:**
```bash
# Stripe Connect
STRIPE_CLIENT_ID=ca_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
SITE_URL=http://localhost:3000
```

### **1.2 Add Connect Button to Dashboard**

**File: `public/dashboard.html`**

Add after the sites list section:

```html
<!-- Payment Setup Section -->
<div class="payment-setup-section" id="paymentSetup" style="display: none;">
  <div class="section-header">
    <h2>💳 Payment Setup</h2>
    <p>Connect Stripe to accept payments on your Pro sites</p>
  </div>
  
  <!-- Not Connected -->
  <div id="stripeDisconnected" class="payment-status-card">
    <div class="status-icon">🔌</div>
    <h3>Payments Not Connected</h3>
    <p>Connect your Stripe account to start accepting payments</p>
    
    <div class="benefits-list">
      <div class="benefit">
        <span class="icon">⚡</span>
        <span>Setup in 30 seconds</span>
      </div>
      <div class="benefit">
        <span class="icon">🔒</span>
        <span>Bank-level security</span>
      </div>
      <div class="benefit">
        <span class="icon">💰</span>
        <span>2.9% + 30¢ per transaction</span>
      </div>
    </div>
    
    <button onclick="connectStripe()" class="btn-connect-stripe">
      <img src="/assets/stripe-logo.svg" alt="Stripe" width="60">
      <span>Connect with Stripe</span>
    </button>
    
    <p class="muted">
      Don't have Stripe? We'll help you create an account (2 minutes)
    </p>
  </div>
  
  <!-- Connected -->
  <div id="stripeConnected" class="payment-status-card connected" style="display: none;">
    <div class="status-icon">✅</div>
    <h3>Payments Connected!</h3>
    <p>Your sites can now accept payments</p>
    
    <div class="stripe-account-info">
      <div class="info-row">
        <span class="label">Status:</span>
        <span class="badge badge-success">Active</span>
      </div>
      <div class="info-row">
        <span class="label">Account ID:</span>
        <span id="stripeAccountId" class="value">acct_xxxxx</span>
      </div>
      <div class="info-row">
        <span class="label">Mode:</span>
        <span id="stripeMode" class="value">Test</span>
      </div>
    </div>
    
    <div class="action-buttons">
      <a href="https://dashboard.stripe.com" target="_blank" class="btn-secondary">
        📊 Open Stripe Dashboard
      </a>
      <button onclick="disconnectStripe()" class="btn-danger-outline">
        Disconnect
      </button>
    </div>
  </div>
</div>

<script>
  // Check if user has Pro plan and show payment setup
  function checkPaymentSetup() {
    if (currentUser.plan === 'pro' || currentUser.plan === 'premium') {
      document.getElementById('paymentSetup').style.display = 'block';
      
      // Check if Stripe is connected
      if (currentUser.stripe && currentUser.stripe.connected) {
        document.getElementById('stripeDisconnected').style.display = 'none';
        document.getElementById('stripeConnected').style.display = 'block';
        document.getElementById('stripeAccountId').textContent = 
          currentUser.stripe.accountId.substring(0, 15) + '...';
        document.getElementById('stripeMode').textContent = 
          currentUser.stripe.mode || 'Test';
      }
    }
  }
  
  // Connect Stripe
  function connectStripe() {
    const clientId = 'ca_YOUR_CLIENT_ID'; // From .env / config
    const redirectUri = encodeURIComponent(`${window.location.origin}/stripe/callback`);
    const state = generateSecureState();
    
    // Store state for verification
    localStorage.setItem('stripe_connect_state', state);
    
    // Build Stripe Connect URL
    const connectUrl = `https://connect.stripe.com/oauth/authorize?` +
      `response_type=code` +
      `&client_id=${clientId}` +
      `&scope=read_write` +
      `&redirect_uri=${redirectUri}` +
      `&state=${state}` +
      `&stripe_user[email]=${encodeURIComponent(currentUser.email)}`;
    
    // Redirect to Stripe
    window.location.href = connectUrl;
  }
  
  function generateSecureState() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  async function disconnectStripe() {
    if (!confirm('Disconnect Stripe? You won\'t be able to accept payments until you reconnect.')) {
      return;
    }
    
    const response = await fetch('/api/stripe/disconnect', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      alert('✅ Stripe disconnected');
      location.reload();
    }
  }
  
  // Call after user data loads
  document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...
    checkPaymentSetup();
  });
</script>

<style>
  .payment-setup-section {
    margin: 40px 0;
    padding: 30px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .payment-status-card {
    padding: 40px;
    text-align: center;
    background: #f8fafc;
    border-radius: 12px;
    border: 2px solid #e5e7eb;
  }
  
  .payment-status-card.connected {
    background: #d1fae5;
    border-color: #10b981;
  }
  
  .status-icon {
    font-size: 4rem;
    margin-bottom: 20px;
  }
  
  .benefits-list {
    display: flex;
    justify-content: center;
    gap: 30px;
    margin: 30px 0;
  }
  
  .benefit {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .btn-connect-stripe {
    display: flex;
    align-items: center;
    gap: 15px;
    justify-content: center;
    padding: 16px 32px;
    background: #635bff;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin: 20px auto;
  }
  
  .btn-connect-stripe:hover {
    background: #4f46e5;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 91, 255, 0.4);
  }
  
  .stripe-account-info {
    background: white;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
  }
  
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .info-row:last-child {
    border-bottom: none;
  }
  
  .badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 600;
  }
  
  .badge-success {
    background: #10b981;
    color: white;
  }
  
  .action-buttons {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 20px;
  }
</style>
```

### **1.3 Add OAuth Callback Endpoint**

**File: `server.js`**

Add after existing Stripe endpoints:

```javascript
// Stripe Connect OAuth callback
app.get('/stripe/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    // Verify state (CSRF protection)
    // In production, verify against stored state
    
    if (!code) {
      return res.redirect('/dashboard.html?stripe=error&reason=no_code');
    }
    
    // Exchange authorization code for access token
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code
    });
    
    // Extract user ID from JWT (you'll need to decode the state or use session)
    // For now, we'll redirect to a page that captures the account ID
    const stripeAccountId = response.stripe_user_id;
    
    // Store in user's record
    // We'll pass it to frontend to save via API
    res.redirect(`/dashboard.html?stripe=connected&account=${stripeAccountId}`);
    
  } catch (error) {
    console.error('Stripe Connect error:', error);
    res.redirect('/dashboard.html?stripe=error&reason=' + encodeURIComponent(error.message));
  }
});

// Save Stripe connection to user account
app.post('/api/stripe/connect', requireAuth, async (req, res) => {
  try {
    const { accountId } = req.body;
    const userEmail = req.user.email;
    
    // Load user data
    const userFile = `public/users/${userEmail.replace('@', '_').replace(/\./g, '_')}.json`;
    
    if (!fs.existsSync(userFile)) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = JSON.parse(fs.readFileSync(userFile, 'utf8'));
    
    // Verify account with Stripe API
    const account = await stripe.accounts.retrieve(accountId);
    
    // Store connection info
    userData.stripe = {
      connected: true,
      accountId: accountId,
      mode: accountId.startsWith('acct_test') ? 'test' : 'live',
      connectedAt: new Date().toISOString(),
      country: account.country,
      email: account.email
    };
    
    // Save
    fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
    
    res.json({ 
      success: true,
      message: 'Stripe connected successfully!'
    });
    
  } catch (error) {
    console.error('Save Stripe connection error:', error);
    res.status(500).json({ error: 'Failed to save connection' });
  }
});

// Disconnect Stripe
app.post('/api/stripe/disconnect', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const userFile = `public/users/${userEmail.replace('@', '_').replace(/\./g, '_')}.json`;
    
    const userData = JSON.parse(fs.readFileSync(userFile, 'utf8'));
    
    // Remove Stripe connection
    delete userData.stripe;
    
    fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
    
    res.json({ success: true });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});
```

---

## 🔧 **Phase 1, Task 2: Dynamic Pricing Checkout**

### **2.1 Update Checkout Endpoint**

**File: `server.js`**

Replace or update the existing `/api/payments/checkout-sessions` endpoint:

```javascript
// Create checkout session with dynamic pricing
app.post('/api/payments/checkout-sessions', async (req, res) => {
  try {
    const { siteId, productIndex, quantity } = req.body;
    
    // Load site data
    const siteFile = `public/sites/${siteId}/site.json`;
    if (!fs.existsSync(siteFile)) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const siteData = JSON.parse(fs.readFileSync(siteFile, 'utf8'));
    const product = siteData.products?.[productIndex];
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get site owner's Stripe account
    const ownerEmail = siteData.ownerEmail || siteData.email;
    const ownerFile = `public/users/${ownerEmail.replace('@', '_').replace(/\./g, '_')}.json`;
    
    if (!fs.existsSync(ownerFile)) {
      return res.status(404).json({ error: 'Owner not found' });
    }
    
    const ownerData = JSON.parse(fs.readFileSync(ownerFile, 'utf8'));
    
    if (!ownerData.stripe?.connected) {
      return res.status(400).json({ 
        error: 'Payments not enabled',
        message: 'Site owner has not connected Stripe'
      });
    }
    
    const stripeAccountId = ownerData.stripe.accountId;
    
    // Create checkout session with DYNAMIC pricing
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description || '',
            images: product.image ? [product.image] : []
          },
          unit_amount: Math.round(product.price * 100) // Convert to cents
        },
        quantity: quantity || 1
      }],
      success_url: `${siteData.url || `${process.env.SITE_URL}/sites/${siteId}`}?order=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteData.url || `${process.env.SITE_URL}/sites/${siteId}`}?order=cancelled`,
      
      // Metadata for tracking
      metadata: {
        siteId: siteId,
        productIndex: productIndex,
        productName: product.name
      },
      
      // Optional: Platform fee (2%)
      // Uncomment if you want to take a platform fee
      /*
      payment_intent_data: {
        application_fee_amount: Math.floor(product.price * 100 * 0.02),
        transfer_data: {
          destination: stripeAccountId
        }
      }
      */
    }, {
      stripeAccount: stripeAccountId // Use owner's connected account
    });
    
    console.log(`Created checkout session for ${product.name} on site ${siteId}`);
    
    res.json({ 
      url: session.url,
      sessionId: session.id
    });
    
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message
    });
  }
});
```

---

## 🔧 **Phase 1, Task 3: CSV Import/Export**

### **3.1 Add Product Management UI to Dashboard**

Create new file: **`public/products.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Management - SiteSprintz</title>
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/theme.css">
</head>
<body>
  <div class="container">
    <div class="page-header">
      <h1>📦 Product Management</h1>
      <button onclick="window.location.href='/dashboard.html'" class="btn-secondary">
        ← Back to Dashboard
      </button>
    </div>
    
    <div class="product-toolbar">
      <div class="toolbar-left">
        <h3>Products (<span id="productCount">0</span>)</h3>
        <p class="muted">Site: <span id="siteName">Loading...</span></p>
      </div>
      
      <div class="toolbar-right">
        <button onclick="exportCSV()" class="btn-secondary" id="exportBtn">
          📤 Export CSV
        </button>
        
        <label class="btn-secondary">
          📥 Import CSV
          <input type="file" accept=".csv,.xlsx" onchange="importFile(event)" hidden>
        </label>
        
        <button onclick="downloadTemplate()" class="btn-secondary">
          📋 Template
        </button>
        
        <button onclick="addProduct()" class="btn-primary">
          ➕ Add Product
        </button>
      </div>
    </div>
    
    <!-- Products Grid -->
    <div class="products-grid" id="productsGrid">
      <!-- Products will be rendered here -->
    </div>
    
    <!-- Empty State -->
    <div class="empty-state" id="emptyState">
      <div class="empty-icon">📦</div>
      <h3>No Products Yet</h3>
      <p>Add your first product to start accepting payments</p>
      
      <div class="empty-actions">
        <button onclick="addProduct()" class="btn-primary">
          ➕ Add Product Manually
        </button>
        
        <p style="margin: 20px 0;">or</p>
        
        <label class="btn-secondary">
          📥 Import from CSV/Excel
          <input type="file" accept=".csv,.xlsx" onchange="importFile(event)" hidden>
        </label>
        
        <p style="margin-top: 15px;">
          <a href="#" onclick="downloadTemplate(); return false;">
            Download CSV template
          </a>
        </p>
      </div>
    </div>
  </div>
  
  <!-- Product Edit Modal -->
  <div id="productModal" class="modal" style="display: none;">
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="modalTitle">Add Product</h3>
        <button onclick="closeProductModal()" class="close-btn">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label>Product Name *</label>
          <input type="text" id="productName" class="form-input" placeholder="e.g., Margherita Pizza">
        </div>
        
        <div class="form-group">
          <label>Description</label>
          <textarea id="productDescription" class="form-input" rows="3" 
                    placeholder="e.g., Fresh mozzarella, basil, tomato sauce"></textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Price ($) *</label>
            <input type="number" id="productPrice" class="form-input" 
                   placeholder="12.99" step="0.01" min="0">
          </div>
          
          <div class="form-group">
            <label>Category</label>
            <input type="text" id="productCategory" class="form-input" 
                   placeholder="e.g., Pizzas">
          </div>
        </div>
        
        <div class="form-group">
          <label>Image URL</label>
          <input type="text" id="productImage" class="form-input" 
                 placeholder="/uploads/margherita.jpg">
        </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" id="productAvailable" checked>
            Available for purchase
          </label>
        </div>
      </div>
      
      <div class="modal-footer">
        <button onclick="closeProductModal()" class="btn-secondary">Cancel</button>
        <button onclick="saveProduct()" class="btn-primary">Save Product</button>
      </div>
    </div>
  </div>
  
  <script src="/products.js"></script>
</body>
</html>
```

### **3.2 Create Product Management JavaScript**

Create new file: **`public/products.js`**

```javascript
let siteId = null;
let products = [];
let editingIndex = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Get siteId from URL
  const params = new URLSearchParams(window.location.search);
  siteId = params.get('siteId');
  
  if (!siteId) {
    alert('No site selected');
    window.location.href = '/dashboard.html';
    return;
  }
  
  await loadProducts();
});

// Load products from site
async function loadProducts() {
  try {
    const response = await fetch(`/api/sites/${siteId}/products`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to load products');
    
    const data = await response.json();
    products = data.products || [];
    
    document.getElementById('siteName').textContent = data.siteName || siteId;
    document.getElementById('productCount').textContent = products.length;
    
    renderProducts();
    
  } catch (error) {
    console.error('Load products error:', error);
    alert('Failed to load products');
  }
}

// Render products grid
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (products.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = 'flex';
    document.getElementById('exportBtn').disabled = true;
    return;
  }
  
  grid.style.display = 'grid';
  emptyState.style.display = 'none';
  document.getElementById('exportBtn').disabled = false;
  
  grid.innerHTML = products.map((product, index) => `
    <div class="product-card">
      <div class="product-image">
        ${product.image ? 
          `<img src="${product.image}" alt="${product.name}">` :
          `<div class="placeholder-image">📦</div>`
        }
      </div>
      <div class="product-info">
        <h4>${product.name}</h4>
        <p class="product-description">${product.description || 'No description'}</p>
        <div class="product-meta">
          <span class="product-price">$${product.price.toFixed(2)}</span>
          <span class="product-category">${product.category || 'General'}</span>
        </div>
        ${product.available !== false ? 
          '<span class="badge badge-success">Available</span>' :
          '<span class="badge badge-secondary">Unavailable</span>'
        }
      </div>
      <div class="product-actions">
        <button onclick="editProduct(${index})" class="btn-icon" title="Edit">
          ✏️
        </button>
        <button onclick="duplicateProduct(${index})" class="btn-icon" title="Duplicate">
          📋
        </button>
        <button onclick="deleteProduct(${index})" class="btn-icon" title="Delete">
          🗑️
        </button>
      </div>
    </div>
  `).join('');
}

// Add product
function addProduct() {
  editingIndex = null;
  document.getElementById('modalTitle').textContent = 'Add Product';
  document.getElementById('productName').value = '';
  document.getElementById('productDescription').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productCategory').value = '';
  document.getElementById('productImage').value = '';
  document.getElementById('productAvailable').checked = true;
  document.getElementById('productModal').style.display = 'flex';
}

// Edit product
function editProduct(index) {
  editingIndex = index;
  const product = products[index];
  
  document.getElementById('modalTitle').textContent = 'Edit Product';
  document.getElementById('productName').value = product.name;
  document.getElementById('productDescription').value = product.description || '';
  document.getElementById('productPrice').value = product.price;
  document.getElementById('productCategory').value = product.category || '';
  document.getElementById('productImage').value = product.image || '';
  document.getElementById('productAvailable').checked = product.available !== false;
  document.getElementById('productModal').style.display = 'flex';
}

// Save product
async function saveProduct() {
  const name = document.getElementById('productName').value.trim();
  const description = document.getElementById('productDescription').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value);
  const category = document.getElementById('productCategory').value.trim();
  const image = document.getElementById('productImage').value.trim();
  const available = document.getElementById('productAvailable').checked;
  
  if (!name) {
    alert('Product name is required');
    return;
  }
  
  if (!price || price <= 0) {
    alert('Valid price is required');
    return;
  }
  
  const product = {
    name,
    description,
    price,
    category: category || 'General',
    image,
    available
  };
  
  if (editingIndex !== null) {
    products[editingIndex] = product;
  } else {
    products.push(product);
  }
  
  await saveAllProducts();
  closeProductModal();
}

// Duplicate product
function duplicateProduct(index) {
  const original = products[index];
  const copy = {
    ...original,
    name: original.name + ' (Copy)'
  };
  products.push(copy);
  saveAllProducts();
}

// Delete product
async function deleteProduct(index) {
  if (!confirm(`Delete "${products[index].name}"?`)) return;
  
  products.splice(index, 1);
  await saveAllProducts();
}

// Close modal
function closeProductModal() {
  document.getElementById('productModal').style.display = 'none';
  editingIndex = null;
}

// Save all products to server
async function saveAllProducts() {
  try {
    const response = await fetch(`/api/sites/${siteId}/products`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ products })
    });
    
    if (!response.ok) throw new Error('Failed to save');
    
    await loadProducts();
    showNotification('✅ Products saved successfully!');
    
  } catch (error) {
    console.error('Save error:', error);
    alert('Failed to save products');
  }
}

// Export CSV
function exportCSV() {
  if (products.length === 0) {
    alert('No products to export');
    return;
  }
  
  let csv = 'name,description,price,category,image,available\n';
  
  products.forEach(p => {
    csv += `"${p.name}","${p.description || ''}",${p.price},"${p.category || ''}","${p.image || ''}",${p.available !== false}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `products-${siteId}.csv`;
  link.click();
  
  showNotification(`✅ Exported ${products.length} products to CSV`);
}

// Import CSV/Excel
async function importFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    let parsedProducts;
    
    if (file.name.endsWith('.csv')) {
      parsedProducts = await parseCSV(file);
    } else if (file.name.endsWith('.xlsx')) {
      parsedProducts = await parseExcel(file);
    } else {
      alert('Please upload a CSV or Excel file');
      return;
    }
    
    if (parsedProducts.length === 0) {
      alert('No valid products found in file');
      return;
    }
    
    showImportPreview(parsedProducts);
    
  } catch (error) {
    console.error('Import error:', error);
    alert('Failed to import file: ' + error.message);
  }
}

// Parse CSV
async function parseCSV(file) {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const products = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 3) continue;
    
    const product = {};
    headers.forEach((header, index) => {
      if (values[index] !== undefined) {
        product[header] = values[index].replace(/^"|"$/g, '').trim();
      }
    });
    
    if (product.name && product.price) {
      product.price = parseFloat(product.price);
      product.available = product.available !== 'false' && product.available !== '0';
      products.push(product);
    }
  }
  
  return products;
}

// Parse CSV line (handles quotes)
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  
  return values;
}

// Parse Excel (requires library)
async function parseExcel(file) {
  // For Excel support, you'll need to include SheetJS library
  // For now, just show message
  alert('Excel support coming soon! Please export to CSV and upload that instead.');
  return [];
}

// Show import preview
function showImportPreview(newProducts) {
  const message = `Found ${newProducts.length} products in file.\n\nHow would you like to import them?`;
  const mode = confirm(message + '\n\nOK = Replace all existing products\nCancel = Add to existing products');
  
  if (mode) {
    // Replace
    products = newProducts;
  } else {
    // Append
    products = [...products, ...newProducts];
  }
  
  saveAllProducts();
}

// Download template
function downloadTemplate() {
  const template = `name,description,price,category,image,available
Margherita Pizza,Fresh mozzarella basil tomato sauce,12.99,Pizzas,margherita.jpg,true
Pepperoni Pizza,Classic pepperoni with mozzarella cheese,14.99,Pizzas,pepperoni.jpg,true
Veggie Pizza,Bell peppers onions mushrooms olives,13.99,Pizzas,veggie.jpg,true
Caesar Salad,Romaine lettuce parmesan croutons,8.99,Salads,caesar.jpg,true
Greek Salad,Tomatoes cucumbers olives feta,9.99,Salads,greek.jpg,true`;

  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'product-template.csv';
  link.click();
  
  showNotification('✅ Template downloaded!');
}

// Show notification
function showNotification(message) {
  // Simple notification (you can make this fancier)
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 3000);
}
```

### **3.3 Add Server API Endpoints**

**File: `server.js`**

```javascript
// Get products for a site
app.get('/api/sites/:siteId/products', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const siteFile = `public/sites/${siteId}/site.json`;
    
    if (!fs.existsSync(siteFile)) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const siteData = JSON.parse(fs.readFileSync(siteFile, 'utf8'));
    
    res.json({
      products: siteData.products || [],
      siteName: siteData.businessName || siteId
    });
    
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// Update products for a site
app.put('/api/sites/:siteId/products', requireAuth, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { products } = req.body;
    
    const siteFile = `public/sites/${siteId}/site.json`;
    
    if (!fs.existsSync(siteFile)) {
      return res.status(404).json({ error: 'Site not found' });
    }
    
    const siteData = JSON.parse(fs.readFileSync(siteFile, 'utf8'));
    
    // Validate products array
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Products must be an array' });
    }
    
    // Update products
    siteData.products = products.map((p, index) => ({
      id: index,
      name: String(p.name || '').trim(),
      description: String(p.description || '').trim(),
      price: parseFloat(p.price) || 0,
      category: String(p.category || 'General').trim(),
      image: String(p.image || '').trim(),
      available: p.available !== false
    }));
    
    // Save
    fs.writeFileSync(siteFile, JSON.stringify(siteData, null, 2));
    
    // Regenerate site HTML
    // You may have a function for this already
    // await regenerateSiteHTML(siteId);
    
    res.json({
      success: true,
      count: siteData.products.length,
      message: `Updated ${siteData.products.length} products`
    });
    
  } catch (error) {
    console.error('Update products error:', error);
    res.status(500).json({ error: 'Failed to update products' });
  }
});
```

---

## 📝 **Complete Implementation Checklist**

### **Week 1: Core Features**

- [ ] Set up Stripe Connect application
- [ ] Add Connect button to dashboard
- [ ] Implement OAuth callback
- [ ] Test connection flow
- [ ] Update checkout to use dynamic pricing
- [ ] Test checkout with connected account
- [ ] Create products.html UI
- [ ] Implement CSV import
- [ ] Implement CSV export
- [ ] Test import/export flow

### **Week 2: Integration & Polish**

- [ ] Add product management link to dashboard
- [ ] Update Pro templates with checkout buttons
- [ ] Add success/cancel pages for orders
- [ ] Create user documentation
- [ ] Record video tutorial
- [ ] Test complete user flow (end-to-end)
- [ ] Add error handling
- [ ] Create email onboarding sequence

---

## 🎯 **Summary**

**What we're building:**

1. ✅ **Stripe Connect** - One-click payment setup (30 seconds)
2. ✅ **Dynamic Pricing** - No pre-created products needed
3. ✅ **CSV Import** - Bulk add 50+ products in seconds
4. ✅ **CSV Export** - Download, edit in Excel, re-import
5. ✅ **Product Manager** - Visual UI for managing products

**Result:**
- Setup time: 30+ minutes → **3 minutes**
- Pro plan becomes actually usable
- Restaurants can accept payments easily
- No double data entry
- No technical knowledge required

**This makes Pro viable and profitable!** 🚀


