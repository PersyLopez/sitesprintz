/**
 * Product Importer Module
 * Handles CSV/Excel import and export for product management
 * 
 * Usage:
 *   <script src="/modules/product-importer.js"></script>
 *   ProductImporter.showImportDialog();
 */

const ProductImporter = {
  currentSiteId: null,
  currentProducts: [],
  
  /**
   * Initialize the importer
   * @param {string} siteId - Site identifier
   * @param {array} products - Current products array
   */
  init(siteId, products = []) {
    this.currentSiteId = siteId;
    this.currentProducts = products;
    
    // Add CSS if not already loaded
    if (!document.getElementById('product-importer-styles')) {
      const link = document.createElement('link');
      link.id = 'product-importer-styles';
      link.rel = 'stylesheet';
      link.href = '/modules/product-importer.css';
      document.head.appendChild(link);
    }
  },
  
  /**
   * Show import dialog
   */
  showImportDialog() {
    const modal = document.createElement('div');
    modal.id = 'import-modal';
    modal.className = 'import-modal';
    modal.innerHTML = `
      <div class="import-modal-content">
        <div class="import-modal-header">
          <h3>Import Products</h3>
          <button onclick="ProductImporter.closeImportDialog()" class="close-btn">&times;</button>
        </div>
        
        <div class="import-modal-body">
          <div class="import-instructions">
            <p>Upload a CSV or Excel file with your products</p>
            <p class="muted">Required columns: name, description, price</p>
          </div>
          
          <div class="import-upload-area">
            <label for="import-file-input" class="upload-label">
              <div class="upload-icon">📤</div>
              <div class="upload-text">
                <strong>Click to upload</strong> or drag and drop
              </div>
              <div class="upload-hint">CSV or Excel file (max 5MB)</div>
            </label>
            <input 
              type="file" 
              id="import-file-input" 
              accept=".csv,.xlsx,.xls" 
              onchange="ProductImporter.handleFileSelect(event)"
              style="display: none;">
          </div>
          
          <div class="import-actions">
            <button onclick="ProductImporter.downloadTemplate()" class="btn-secondary">
              📋 Download Template
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add drag and drop support
    this.setupDragDrop();
  },
  
  /**
   * Close import dialog
   */
  closeImportDialog() {
    const modal = document.getElementById('import-modal');
    if (modal) {
      modal.remove();
    }
  },
  
  /**
   * Setup drag and drop
   */
  setupDragDrop() {
    const uploadArea = document.querySelector('.import-upload-area');
    if (!uploadArea) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.add('drag-over');
      });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.remove('drag-over');
      });
    });
    
    uploadArea.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file) {
        this.processFile(file);
      }
    });
  },
  
  /**
   * Handle file selection
   */
  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
  },
  
  /**
   * Process uploaded file
   */
  async processFile(file) {
    try {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 5MB.');
      }
      
      // Validate file type
      const validTypes = ['.csv', '.xlsx', '.xls'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validTypes.includes(fileExt)) {
        throw new Error('Invalid file type. Please upload a CSV or Excel file.');
      }
      
      // Show loading
      this.showLoading('Processing file...');
      
      let products;
      if (fileExt === '.csv') {
        products = await this.parseCSV(file);
      } else {
        products = await this.parseExcel(file);
      }
      
      this.hideLoading();
      
      if (products.length === 0) {
        throw new Error('No valid products found in file');
      }
      
      // Show preview
      this.showPreview(products);
      
    } catch (error) {
      this.hideLoading();
      alert('Import failed: ' + error.message);
    }
  },
  
  /**
   * Parse CSV file
   */
  async parseCSV(file) {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('File is empty or has no data rows');
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length < 3) continue; // Need at least name, desc, price
      
      const product = {};
      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          product[header] = values[index].replace(/^"|"$/g, '').trim();
        }
      });
      
      // Validate required fields
      if (product.name && product.price) {
        product.price = parseFloat(product.price);
        product.available = product.available !== 'false' && product.available !== '0';
        product.category = product.category || 'General';
        product.description = product.description || '';
        product.image = product.image || '';
        
        if (product.price > 0) {
          products.push(product);
        }
      }
    }
    
    return products;
  },
  
  /**
   * Parse CSV line (handles quotes and commas in values)
   */
  parseCSVLine(line) {
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
  },
  
  /**
   * Parse Excel file (stub - requires library)
   */
  async parseExcel(file) {
    // For full Excel support, you'd need to include SheetJS (xlsx.js)
    // For now, show a message to use CSV
    throw new Error('Excel support coming soon. Please save as CSV and upload that instead.');
  },
  
  /**
   * Show preview of imported products
   */
  showPreview(products) {
    this.closeImportDialog();
    
    const modal = document.createElement('div');
    modal.id = 'preview-modal';
    modal.className = 'import-modal';
    modal.innerHTML = `
      <div class="import-modal-content large">
        <div class="import-modal-header">
          <h3>Import Preview (${products.length} products)</h3>
          <button onclick="ProductImporter.closePreview()" class="close-btn">&times;</button>
        </div>
        
        <div class="import-modal-body">
          <div class="preview-table-container">
            <table class="preview-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                ${products.slice(0, 10).map(p => `
                  <tr>
                    <td>${p.name}</td>
                    <td>${(p.description || '').substring(0, 50)}${p.description && p.description.length > 50 ? '...' : ''}</td>
                    <td>$${p.price.toFixed(2)}</td>
                    <td>${p.category}</td>
                  </tr>
                `).join('')}
                ${products.length > 10 ? `
                  <tr class="more-row">
                    <td colspan="4">... and ${products.length - 10} more products</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
          
          <div class="import-options">
            <label class="radio-option">
              <input type="radio" name="importMode" value="replace" checked>
              <span>Replace all existing products (${this.currentProducts.length} current)</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="importMode" value="append">
              <span>Add to existing products (total: ${this.currentProducts.length + products.length})</span>
            </label>
          </div>
          
          <div class="import-modal-footer">
            <button onclick="ProductImporter.closePreview()" class="btn-secondary">
              Cancel
            </button>
            <button onclick="ProductImporter.confirmImport()" class="btn-primary">
              Import ${products.length} Products
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Store products for confirmation
    this.pendingProducts = products;
  },
  
  /**
   * Close preview modal
   */
  closePreview() {
    const modal = document.getElementById('preview-modal');
    if (modal) {
      modal.remove();
    }
    this.pendingProducts = null;
  },
  
  /**
   * Confirm and execute import
   */
  async confirmImport() {
    try {
      const mode = document.querySelector('input[name="importMode"]:checked').value;
      
      let finalProducts;
      if (mode === 'replace') {
        finalProducts = this.pendingProducts;
      } else {
        finalProducts = [...this.currentProducts, ...this.pendingProducts];
      }
      
      // Save to server
      this.showLoading('Importing products...');
      
      const response = await fetch(`/api/sites/${this.currentSiteId}/products`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ products: finalProducts })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import products');
      }
      
      this.hideLoading();
      this.closePreview();
      
      alert(`✅ Successfully imported ${this.pendingProducts.length} products!`);
      
      // Reload page to show new products
      window.location.reload();
      
    } catch (error) {
      this.hideLoading();
      alert('Import failed: ' + error.message);
    }
  },
  
  /**
   * Export products to CSV
   */
  exportCSV(products = null) {
    const productsToExport = products || this.currentProducts;
    
    if (productsToExport.length === 0) {
      alert('No products to export');
      return;
    }
    
    // Create CSV
    let csv = 'name,description,price,category,image,available\n';
    
    productsToExport.forEach(p => {
      csv += `"${p.name}","${p.description || ''}",${p.price},"${p.category || 'General'}","${p.image || ''}",${p.available !== false}\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products-${this.currentSiteId}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    alert(`✅ Exported ${productsToExport.length} products to CSV`);
  },
  
  /**
   * Download template CSV
   */
  downloadTemplate() {
    const template = `name,description,price,category,image,available
Margherita Pizza,Fresh mozzarella basil tomato sauce,12.99,Pizzas,margherita.jpg,true
Pepperoni Pizza,Classic pepperoni with mozzarella cheese,14.99,Pizzas,pepperoni.jpg,true
Veggie Pizza,Bell peppers onions mushrooms olives,13.99,Pizzas,veggie.jpg,true
Caesar Salad,Romaine lettuce parmesan croutons Caesar dressing,8.99,Salads,caesar.jpg,true
Greek Salad,Tomatoes cucumbers olives feta cheese,9.99,Salads,greek.jpg,true
Coca Cola,Refreshing cola drink 12oz can,2.50,Drinks,coke.jpg,true
Iced Tea,Fresh brewed iced tea with lemon,2.99,Drinks,tea.jpg,true`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product-template.csv';
    link.click();
    URL.revokeObjectURL(url);
    
    alert('✅ Template downloaded! Fill it in and upload to import.');
  },
  
  // UI Helpers
  
  showLoading(message) {
    const loader = document.createElement('div');
    loader.id = 'import-loader';
    loader.className = 'import-loader';
    loader.innerHTML = `
      <div class="loader-content">
        <div class="loader-spinner"></div>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(loader);
  },
  
  hideLoading() {
    const loader = document.getElementById('import-loader');
    if (loader) {
      loader.remove();
    }
  }
};

// Make available globally
window.ProductImporter = ProductImporter;

