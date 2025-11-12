import React from 'react';
import { useSite } from '../../../hooks/useSite';
import ImageUploader from './ImageUploader';
import ColorPicker from './ColorPicker';
import './BusinessInfoForm.css';

function BusinessInfoForm() {
  const { siteData, updateField, updateNestedField } = useSite();

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      updateNestedField(field, value);
    } else {
      updateField(field, value);
    }
  };

  return (
    <div className="business-info-form">
      <div className="form-section">
        <h3>Basic Information</h3>
        
        <div className="form-group">
          <label htmlFor="businessName">
            Business Name *
            <span className="field-hint">Your business or website name</span>
          </label>
          <input
            type="text"
            id="businessName"
            value={siteData.brand?.name || siteData.businessName || ''}
            onChange={(e) => handleChange('brand.name', e.target.value)}
            placeholder="e.g., Acme Restaurant"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="tagline">
            Tagline
            <span className="field-hint">A short description or slogan</span>
          </label>
          <input
            type="text"
            id="tagline"
            value={siteData.brand?.tagline || ''}
            onChange={(e) => handleChange('brand.tagline', e.target.value)}
            placeholder="e.g., Fresh food, fast service"
            maxLength={100}
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Hero Section</h3>
        
        <div className="form-group">
          <label htmlFor="heroTitle">
            Hero Title *
            <span className="field-hint">Main headline visitors see first</span>
          </label>
          <input
            type="text"
            id="heroTitle"
            value={siteData.hero?.title || ''}
            onChange={(e) => handleChange('hero.title', e.target.value)}
            placeholder="e.g., Welcome to Our Restaurant"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="heroSubtitle">
            Hero Subtitle
            <span className="field-hint">Supporting text below the title</span>
          </label>
          <textarea
            id="heroSubtitle"
            value={siteData.hero?.subtitle || ''}
            onChange={(e) => handleChange('hero.subtitle', e.target.value)}
            placeholder="e.g., Experience the finest dining in the city"
            rows={3}
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label>
            Hero Image
            <span className="field-hint">Main background or feature image (recommended: 1920x1080px)</span>
          </label>
          <ImageUploader
            value={siteData.hero?.image || ''}
            onChange={(url) => handleChange('hero.image', url)}
            aspectRatio="16:9"
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Branding</h3>
        
        <div className="form-group">
          <label>
            Logo
            <span className="field-hint">Your business logo (recommended: 200x200px, transparent PNG)</span>
          </label>
          <ImageUploader
            value={siteData.brand?.logo || ''}
            onChange={(url) => handleChange('brand.logo', url)}
            aspectRatio="1:1"
          />
        </div>

        <div className="form-group">
          <label>
            Theme Colors
            <span className="field-hint">Choose colors that match your brand</span>
          </label>
          
          <div className="color-picker-group">
            <ColorPicker
              label="Primary Color"
              value={siteData.themeVars?.['color-primary'] || siteData.colors?.primary || '#06b6d4'}
              onChange={(color) => handleChange('themeVars.color-primary', color)}
            />
            
            <ColorPicker
              label="Accent Color"
              value={siteData.themeVars?.['color-accent'] || siteData.colors?.accent || '#0891b2'}
              onChange={(color) => handleChange('themeVars.color-accent', color)}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Call-to-Action Buttons</h3>
        
        <div className="form-group">
          <label htmlFor="ctaPrimaryLabel">
            Primary Button Text
            <span className="field-hint">Main action button (e.g., "Book Now", "Get Started")</span>
          </label>
          <input
            type="text"
            id="ctaPrimaryLabel"
            value={siteData.hero?.cta?.[0]?.label || ''}
            onChange={(e) => {
              const cta = [...(siteData.hero?.cta || [{ label: '', href: '#contact' }])];
              cta[0] = { ...cta[0], label: e.target.value };
              handleChange('hero.cta', cta);
            }}
            placeholder="e.g., Book Now"
            maxLength={30}
          />
        </div>

        <div className="form-group">
          <label htmlFor="ctaPrimaryHref">
            Primary Button Link
            <span className="field-hint">Where the button goes (e.g., #contact, #booking, or external URL)</span>
          </label>
          <input
            type="text"
            id="ctaPrimaryHref"
            value={siteData.hero?.cta?.[0]?.href || ''}
            onChange={(e) => {
              const cta = [...(siteData.hero?.cta || [{ label: '', href: '' }])];
              cta[0] = { ...cta[0], href: e.target.value };
              handleChange('hero.cta', cta);
            }}
            placeholder="e.g., #contact or https://calendly.com/yourname"
          />
        </div>
      </div>

      <div className="form-help">
        <p>💡 <strong>Tip:</strong> Fill in all required fields (*) for the best results. Your changes are auto-saved every 30 seconds.</p>
      </div>
    </div>
  );
}

export default BusinessInfoForm;

