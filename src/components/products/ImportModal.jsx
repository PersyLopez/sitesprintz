import React, { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import './ImportModal.css';

function ImportModal({ currentProducts, onImport, onClose }) {
  const { showError, showSuccess } = useToast();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [importMode, setImportMode] = useState('replace');

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file) => {
    try {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File too large. Maximum size is 5MB.');
      }

      // Validate file type
      const validTypes = ['.csv'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!validTypes.includes(fileExt)) {
        throw new Error('Invalid file type. Please upload a CSV file.');
      }

      const products = await parseCSV(file);

      if (products.length === 0) {
        throw new Error('No valid products found in file');
      }

      setPreview(products);
      showSuccess(`Found ${products.length} products in file`);
    } catch (error) {
      showError(error.message);
    }
  };

  const parseCSV = async (file) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('File is empty or has no data rows');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
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
        product.category = product.category || 'General';
        product.description = product.description || '';
        product.image = product.image || '';
        product.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);

        if (product.price > 0) {
          products.push(product);
        }
      }
    }

    return products;
  };

  const parseCSVLine = (line) => {
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
  };

  const handleImport = async () => {
    if (!preview) {
      showError('No products to import');
      return;
    }

    setImporting(true);
    
    try {
      await onImport(preview, importMode);
      onClose();
    } catch (error) {
      showError('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `name,description,price,category,image,available
Margherita Pizza,Fresh mozzarella basil tomato sauce,12.99,Pizzas,margherita.jpg,true
Pepperoni Pizza,Classic pepperoni with mozzarella cheese,14.99,Pizzas,pepperoni.jpg,true
Caesar Salad,Romaine lettuce parmesan croutons,8.99,Salads,caesar.jpg,true`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product-template.csv';
    link.click();
    URL.revokeObjectURL(url);

    showSuccess('Template downloaded!');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📤 Import Products</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {!preview ? (
            <>
              <div className="import-instructions">
                <p>Upload a CSV file with your products</p>
                <p className="muted">Required columns: name, price</p>
                <p className="muted">Optional: description, category, image, available</p>
              </div>

              <label htmlFor="file-input" className="upload-area">
                <div className="upload-icon">📤</div>
                <div className="upload-text">
                  <strong>Click to upload</strong> or drag and drop
                </div>
                <div className="upload-hint">CSV file (max 5MB)</div>
              </label>
              <input
                type="file"
                id="file-input"
                accept=".csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              <button onClick={downloadTemplate} className="btn btn-secondary btn-full">
                📋 Download Template CSV
              </button>
            </>
          ) : (
            <>
              <div className="preview-header">
                <h3>Preview ({preview.length} products)</h3>
                <button onClick={() => setPreview(null)} className="btn-link">
                  ← Upload Different File
                </button>
              </div>

              <div className="preview-table-container">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 5).map((p, i) => (
                      <tr key={i}>
                        <td>{p.name}</td>
                        <td>${p.price.toFixed(2)}</td>
                        <td>{p.category}</td>
                      </tr>
                    ))}
                    {preview.length > 5 && (
                      <tr className="more-row">
                        <td colSpan="3">... and {preview.length - 5} more products</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="import-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={(e) => setImportMode(e.target.value)}
                  />
                  <span>Replace all existing products ({currentProducts.length} current)</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={(e) => setImportMode(e.target.value)}
                  />
                  <span>Add to existing products (total: {currentProducts.length + preview.length})</span>
                </label>
              </div>

              <div className="modal-footer">
                <button onClick={onClose} className="btn btn-secondary">
                  Cancel
                </button>
                <button onClick={handleImport} className="btn btn-primary" disabled={importing}>
                  {importing ? 'Importing...' : `Import ${preview.length} Products`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportModal;

