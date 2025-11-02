# 🔌 Pro Template Integration Guide

## How to Add Payment Features to ANY Pro Template

This guide shows you how to integrate the modular payment system into your Pro templates in just **3 simple steps**.

---

## 📦 What's Included

All modules are located in `/public/modules/`:

1. **`pro-payments.js`** - Payment system (checkout, buy buttons)
2. **`pro-payments.css`** - Styles for payment UI
3. **`product-importer.js`** - CSV import/export functionality
4. **`product-importer.css`** - Styles for import UI

---

## ✨ Quick Integration (3 Steps)

### **Step 1: Add Scripts to Template HTML**

At the **bottom** of your template's HTML file (before `</body>`):

```html
<!-- Pro Payment Modules -->
<script src="/modules/pro-payments.js"></script>
<script src="/modules/product-importer.js"></script>
```

That's it! The modules auto-initialize if `siteData` exists.

### **Step 2: Define Products in site.json**

```json
{
  "businessName": "Bella Vista Restaurant",
  "ownerEmail": "owner@email.com",
  "products": [
    {
      "name": "Margherita Pizza",
      "description": "Fresh mozzarella, basil, tomato sauce",
      "price": 12.99,
      "category": "Pizzas",
      "image": "/uploads/margherita.jpg",
      "available": true
    },
    {
      "name": "Caesar Salad",
      "description": "Romaine, parmesan, croutons",
      "price": 8.99,
      "category": "Salads",
      "image": "/uploads/caesar.jpg",
      "available": true
    }
  ]
}
```

### **Step 3: Add Buy Buttons in HTML**

Use the **simple button syntax**:

```html
<!-- Simple buy button -->
<button onclick="ProPayments.checkout(0)">Buy Margherita Pizza</button>

<!-- Or render complete product cards -->
<div id="products-container"></div>
<script>
  ProPayments.renderProducts('products-container');
</script>
```

**Done!** Your template now accepts payments! 🎉

---

## 🎨 **Integration Examples by Template Type**

### **Restaurant Template (Product Ordering)**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Bella Vista Restaurant</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header>
    <h1>Bella Vista Restaurant</h1>
    <p>Authentic Italian Cuisine</p>
  </header>
  
  <main>
    <h2>Our Menu</h2>
    
    <!-- Method 1: Auto-render all products -->
    <div id="menu-products" class="products-grid"></div>
    
    <!-- Method 2: Manual HTML with buy buttons -->
    <div class="menu-item">
      <h3>Margherita Pizza</h3>
      <p>Fresh mozzarella, basil, tomato sauce</p>
      <span class="price">$12.99</span>
      <button onclick="ProPayments.checkout(0)" class="buy-button">Order Now</button>
    </div>
  </main>
  
  <!-- Load pro modules -->
  <script>
    // Define site data
    window.siteData = {
      siteId: 'bella-vista-mheko2l7',
      businessName: 'Bella Vista Restaurant',
      products: [
        { name: 'Margherita Pizza', description: '...', price: 12.99, category: 'Pizzas' },
        { name: 'Pepperoni Pizza', description: '...', price: 14.99, category: 'Pizzas' },
        { name: 'Caesar Salad', description: '...', price: 8.99, category: 'Salads' }
      ]
    };
  </script>
  <script src="/modules/pro-payments.js"></script>
  
  <script>
    // Auto-render products into container
    ProPayments.renderProducts('menu-products');
  </script>
</body>
</html>
```

### **Service Business (Single Services)**

```html
<!-- Medical Practice Services -->
<section class="services">
  <h2>Our Services</h2>
  
  <div class="service-card">
    <h3>General Consultation</h3>
    <p>30-minute consultation with our experienced physicians</p>
    <div class="service-footer">
      <span class="price">$75</span>
      <button onclick="ProPayments.checkout(0)" class="buy-button primary">
        Book Now
      </button>
    </div>
  </div>
  
  <div class="service-card">
    <h3>Physical Therapy Session</h3>
    <p>1-hour physical therapy session</p>
    <div class="service-footer">
      <span class="price">$95</span>
      <button onclick="ProPayments.checkout(1)" class="buy-button primary">
        Book Now
      </button>
    </div>
  </div>
</section>

<script>
  window.siteData = {
    siteId: 'wellness-clinic-abc123',
    products: [
      { name: 'General Consultation', price: 75, description: '30-min consultation' },
      { name: 'Physical Therapy', price: 95, description: '1-hour session' }
    ]
  };
</script>
<script src="/modules/pro-payments.js"></script>
```

### **E-commerce (Product Showcase)**

```html
<section class="products">
  <h2>Shop Our Collection</h2>
  
  <!-- Category filters (optional) -->
  <div class="filters">
    <button onclick="filterByCategory('all')">All</button>
    <button onclick="filterByCategory('Shirts')">Shirts</button>
    <button onclick="filterByCategory('Accessories')">Accessories</button>
  </div>
  
  <!-- Auto-rendered product grid -->
  <div id="product-grid" class="products-grid"></div>
</section>

<script>
  window.siteData = {
    siteId: 'boutique-shop-xyz789',
    products: [
      { name: 'Cotton T-Shirt', price: 29.99, category: 'Shirts', image: '/img/tshirt.jpg' },
      { name: 'Leather Wallet', price: 49.99, category: 'Accessories', image: '/img/wallet.jpg' },
      { name: 'Denim Jacket', price: 89.99, category: 'Jackets', image: '/img/jacket.jpg' }
    ]
  };
  
  function filterByCategory(category) {
    if (category === 'all') {
      ProPayments.renderProducts('product-grid');
    } else {
      // Filter and render
      const filtered = siteData.products.filter(p => p.category === category);
      // Custom rendering logic here
    }
  }
</script>
<script src="/modules/pro-payments.js"></script>
<script>
  ProPayments.renderProducts('product-grid');
</script>
```

---

## 🎨 **Customization Options**

### **Button Styles**

```html
<!-- Default blue button -->
<button onclick="ProPayments.checkout(0)" class="buy-button">
  Buy Now
</button>

<!-- Primary green button -->
<button onclick="ProPayments.checkout(0)" class="buy-button primary">
  Order Now
</button>

<!-- Secondary purple button -->
<button onclick="ProPayments.checkout(0)" class="buy-button secondary">
  Add to Cart
</button>

<!-- Large button -->
<button onclick="ProPayments.checkout(0)" class="buy-button large primary">
  Book Appointment
</button>
```

### **Product Card Layouts**

```html
<!-- Auto-rendered cards (uses default styling) -->
<div id="products" class="products-grid"></div>
<script>
  ProPayments.renderProducts('products');
</script>

<!-- Custom card layout -->
<div class="custom-product">
  <img src="/img/product.jpg" alt="Product">
  <h3>Product Name</h3>
  <p>$49.99</p>
  <?= ProPayments.renderBuyButton(0, 'Purchase', 'custom-btn') ?>
</div>
```

### **Success/Cancel Handling**

The module automatically detects `?order=success` or `?order=cancelled` in the URL:

```javascript
// Customize success message
ProPayments.handleOrderSuccess = function(sessionId) {
  // Custom logic here
  this.showSuccess('Thank you! Your order is confirmed.');
  
  // Optional: Track conversion
  if (window.gtag) {
    gtag('event', 'purchase', {
      transaction_id: sessionId
    });
  }
};

// Customize cancel message
ProPayments.handleOrderCancel = function() {
  this.showNotification('Order cancelled. Questions? Call us!', 'info');
};
```

---

## 📤 **CSV Import/Export Integration**

### **Add Import/Export Buttons to Dashboard**

In your site management/dashboard page:

```html
<div class="product-management">
  <h3>Manage Products</h3>
  
  <div class="actions">
    <button onclick="ProductImporter.showImportDialog()" class="btn-secondary">
      📥 Import CSV
    </button>
    
    <button onclick="ProductImporter.exportCSV()" class="btn-secondary">
      📤 Export CSV
    </button>
    
    <button onclick="ProductImporter.downloadTemplate()" class="btn-secondary">
      📋 Download Template
    </button>
  </div>
</div>

<script>
  // Initialize importer
  ProductImporter.init('{{ siteId }}', window.siteData.products);
</script>
<script src="/modules/product-importer.js"></script>
```

---

## 🔧 **API Reference**

### **ProPayments Methods**

```javascript
// Initialize (auto-called)
ProPayments.init(siteId, siteData);

// Checkout a product
ProPayments.checkout(productIndex, quantity);

// Quick buy with confirmation
ProPayments.quickBuy(productIndex);

// Render buy button HTML
ProPayments.renderBuyButton(productIndex, buttonText, className);

// Render product card HTML
ProPayments.renderProductCard(productIndex);

// Render all products into container
ProPayments.renderProducts(containerId, category);

// Handle order status
ProPayments.checkOrderStatus(); // Auto-called

// UI helpers
ProPayments.showLoading(message);
ProPayments.hideLoading();
ProPayments.showError(message);
ProPayments.showSuccess(message);
ProPayments.showNotification(message, type);
```

### **ProductImporter Methods**

```javascript
// Initialize
ProductImporter.init(siteId, products);

// Show import dialog
ProductImporter.showImportDialog();

// Export products to CSV
ProductImporter.exportCSV(products);

// Download CSV template
ProductImporter.downloadTemplate();
```

---

## ✅ **Checklist for New Templates**

When creating a new Pro template:

- [ ] Include `pro-payments.js` and `pro-payments.css`
- [ ] Define `window.siteData` with products array
- [ ] Add buy buttons with `onclick="ProPayments.checkout(index)"`
- [ ] Test checkout flow
- [ ] Add `ownerEmail` to site.json for Stripe Connect
- [ ] Test with Stripe test cards
- [ ] Add product management link for CSV import
- [ ] Test CSV import/export

---

## 🎯 **Example: Complete Restaurant Template**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ businessName }}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <header>
    <h1>{{ businessName }}</h1>
    <p>{{ tagline }}</p>
  </header>
  
  <main>
    <!-- Hero Section -->
    <section class="hero">
      <h2>Order Online</h2>
      <p>Fresh, delicious meals delivered to your door</p>
    </section>
    
    <!-- Menu Products -->
    <section class="menu">
      <h2>Our Menu</h2>
      <div id="menu-products" class="products-grid"></div>
    </section>
    
    <!-- Success Message Area -->
    <div id="order-status"></div>
  </main>
  
  <footer>
    <p>&copy; 2025 {{ businessName }}. All rights reserved.</p>
  </footer>
  
  <!-- Site Data -->
  <script>
    window.siteData = {
      siteId: '{{ siteId }}',
      businessName: '{{ businessName }}',
      products: {{ productsJSON }}
    };
  </script>
  
  <!-- Pro Payment Modules -->
  <script src="/modules/pro-payments.js"></script>
  
  <!-- Render Products -->
  <script>
    // Auto-render all products
    ProPayments.renderProducts('menu-products');
    
    // Check for order success/cancel
    ProPayments.checkOrderStatus();
  </script>
</body>
</html>
```

---

## 🚀 **Summary**

### **For Template Developers:**

1. **Include 2 files**: `pro-payments.js` and `product-importer.js`
2. **Define products** in `window.siteData`
3. **Add buy buttons** with `ProPayments.checkout(index)`
4. **Done!** Fully functional payments

### **For Users:**

1. **Connect Stripe** (30 seconds, one button)
2. **Import products** from CSV (or add manually)
3. **Start selling** immediately

### **Key Benefits:**

✅ **Modular** - Works with any Pro template  
✅ **No double entry** - Products defined once  
✅ **Dynamic pricing** - No Stripe product pre-creation  
✅ **Stripe Connect** - Easy payment setup  
✅ **CSV import** - Bulk product management  
✅ **Beautiful UI** - Pre-styled components  
✅ **Mobile-friendly** - Responsive design  

---

**That's it!** Pro templates now have professional payment capabilities with minimal integration effort. 🎉


