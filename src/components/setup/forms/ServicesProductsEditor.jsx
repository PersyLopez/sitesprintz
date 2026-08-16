import React, { useState } from 'react';
import { useSite } from '../../../hooks/useSite';
import ProductsEditor from './ProductsEditor';
import './ServicesProductsEditor.css';

function ServicesProductsEditor() {
  const { siteData, updateField, addService, updateService, deleteService } = useSite();
  const [activeTab, setActiveTab] = useState('services');

  const renderServices = () => (
    <div className="services-products-tab-content">
      <div className="services-header">
        <h3>Your Services</h3>
        <button
          onClick={() => addService({
            name: '',
            description: '',
            price: '',
          })}
          className="btn btn-primary btn-sm"
        >
          + Add Service
        </button>
      </div>

      {siteData.services && siteData.services.length > 0 ? (
        <div className="services-list">
          {siteData.services.map((service) => (
            <div key={service.id} className="service-item">
              <div className="form-group">
                <input
                  type="text"
                  value={service.name || service.title || ''}
                  onChange={(e) => updateService(service.id, { name: e.target.value, title: e.target.value })}
                  placeholder="Service name"
                />
              </div>

              <div className="form-group">
                <textarea
                  value={service.description || ''}
                  onChange={(e) => updateService(service.id, { description: e.target.value })}
                  placeholder="Service description"
                  rows={2}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <input
                    type="text"
                    value={service.price || ''}
                    onChange={(e) => updateService(service.id, { price: e.target.value })}
                    placeholder="$99"
                  />
                </div>

                <button
                  onClick={() => deleteService(service.id)}
                  className="btn btn-danger btn-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-services">
          <p>No services added yet. Click "Add Service" to get started.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="services-products-editor">
      <div className="tab-group">
        <button
          className={`tab-button ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          <span className="tab-icon">✨</span>
          <span className="tab-label">Services</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <span className="tab-icon">🛍️</span>
          <span className="tab-label">Products</span>
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'services' ? renderServices() : <ProductsEditor />}
      </div>
    </div>
  );
}

export default ServicesProductsEditor;



