import { useState } from 'react';
import './CustomTemplateBuilder.css';

/**
 * CustomTemplateBuilder - Allows users to create a site from scratch
 * Provides a guided flow for selecting layout, colors, and basic content
 */
function CustomTemplateBuilder({ onComplete, onCancel }) {
  const [step, setStep] = useState('layout'); // 'layout', 'colors', 'content'
  const [selectedLayout, setSelectedLayout] = useState('landing');
  const [colors, setColors] = useState({
    primary: '#06b6d4',
    accent: '#0891b2',
    secondary: '#14b8a6',
  });
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    tagline: '',
    type: '',
  });

  const layouts = [
    {
      id: 'landing',
      name: 'Landing Page',
      description: 'Single page showcase with hero, features, and CTA',
      icon: '🎯',
      sections: ['hero', 'features', 'cta']
    },
    {
      id: 'portfolio',
      name: 'Portfolio',
      description: 'Showcase your work and services',
      icon: '🎨',
      sections: ['hero', 'portfolio', 'services', 'contact']
    },
    {
      id: 'blog',
      name: 'Blog/Magazine',
      description: 'Content-focused layout for articles and posts',
      icon: '📝',
      sections: ['hero', 'featured-posts', 'categories', 'newsletter']
    },
    {
      id: 'ecommerce',
      name: 'E-Commerce',
      description: 'Shop layout with products and cart',
      icon: '🛍️',
      sections: ['hero', 'products', 'featured', 'reviews']
    },
    {
      id: 'services',
      name: 'Services',
      description: 'Highlight your services and booking',
      icon: '💼',
      sections: ['hero', 'services', 'pricing', 'testimonials', 'contact']
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Clean and simple - focus on your content',
      icon: '⚪',
      sections: ['hero', 'about', 'contact']
    }
  ];

  const colorPresets = [
    { name: 'Cyan', primary: '#06b6d4', accent: '#0891b2', secondary: '#14b8a6' },
    { name: 'Indigo', primary: '#6366f1', accent: '#4f46e5', secondary: '#4338ca' },
    { name: 'Rose', primary: '#f43f5e', accent: '#e11d48', secondary: '#be185d' },
    { name: 'Emerald', primary: '#10b981', accent: '#059669', secondary: '#047857' },
    { name: 'Orange', primary: '#f97316', accent: '#ea580c', secondary: '#c2410c' },
    { name: 'Purple', primary: '#a855f7', accent: '#9333ea', secondary: '#7e22ce' },
  ];

  const handleLayoutSelect = (layoutId) => {
    setSelectedLayout(layoutId);
  };

  const handleColorSelect = (preset) => {
    setColors(preset);
  };

  const handleColorChange = (colorKey, value) => {
    setColors(prev => ({ ...prev, [colorKey]: value }));
  };

  const handleBusinessInfoChange = (field, value) => {
    setBusinessInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 'layout') {
      setStep('colors');
    } else if (step === 'colors') {
      setStep('content');
    }
  };

  const handleBack = () => {
    if (step === 'layout') {
      onCancel();
    } else if (step === 'colors') {
      setStep('layout');
    } else if (step === 'content') {
      setStep('colors');
    }
  };

  const handleComplete = () => {
    if (!businessInfo.name.trim()) {
      alert('Please enter your business name');
      return;
    }

    const customTemplate = {
      id: 'custom-' + Date.now(),
      template: 'custom-' + selectedLayout,
      name: businessInfo.name,
      businessName: businessInfo.name,
      description: businessInfo.tagline || 'Custom website',
      type: businessInfo.type || 'Custom',
      category: 'Custom',
      tier: 'Starter',
      isCustom: true,
      layout: selectedLayout,
      sections: layouts.find(l => l.id === selectedLayout)?.sections || [],
      colors: {
        themeId: 'custom',
        mode: 'dark',
        primary: colors.primary,
        accent: colors.accent,
        secondary: colors.secondary,
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f8fafc',
        textMuted: '#94a3b8',
      },
      brand: {
        name: businessInfo.name,
        tagline: businessInfo.tagline,
      },
      hero: {
        title: businessInfo.name,
        subtitle: businessInfo.tagline || 'Your custom website',
        image: null,
      },
      contact: {
        email: '',
        phone: '',
        address: '',
      },
      nav: {
        items: [
          { label: 'Home', href: '#' },
          { label: 'About', href: '#about' },
          { label: 'Services', href: '#services' },
          { label: 'Contact', href: '#contact' }
        ]
      },
      // Minimal structure - user will fill in content
      menu: [],
      team: [],
      gallery: [],
      testimonials: [],
      stats: [],
      credentials: [],
      faq: [],
      about: {
        title: 'About Us',
        description: 'Tell your story here',
        image: null,
      },
      services: [
        { name: 'Service 1', description: 'Add your services' },
        { name: 'Service 2', description: 'Add your services' },
      ],
      social: {
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: '',
      }
    };

    onComplete(customTemplate);
  };

  return (
    <div className="custom-builder">
      <div className="builder-header">
        <h2>✨ Build Your Custom Website</h2>
        <p>Create a unique website tailored to your needs</p>
      </div>

      <div className="builder-steps">
        <div className={`step-indicator ${step === 'layout' ? 'active' : ''}`}>
          <span className="step-number">1</span>
          <span className="step-label">Choose Layout</span>
        </div>
        <div className="step-divider"></div>
        <div className={`step-indicator ${step === 'colors' ? 'active' : ''}`}>
          <span className="step-number">2</span>
          <span className="step-label">Pick Colors</span>
        </div>
        <div className="step-divider"></div>
        <div className={`step-indicator ${step === 'content' ? 'active' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">Add Content</span>
        </div>
      </div>

      <div className="builder-content">
        {/* Step 1: Layout Selection */}
        {step === 'layout' && (
          <div className="step-content">
            <h3>📐 Choose Your Layout</h3>
            <p>Select a starting layout. You can customize everything later.</p>
            <div className="layout-grid">
              {layouts.map(layout => (
                <div
                  key={layout.id}
                  className={`layout-card ${selectedLayout === layout.id ? 'selected' : ''}`}
                  onClick={() => handleLayoutSelect(layout.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleLayoutSelect(layout.id);
                    }
                  }}
                >
                  <div className="layout-icon">{layout.icon}</div>
                  <h4>{layout.name}</h4>
                  <p>{layout.description}</p>
                  <div className="layout-sections">
                    {layout.sections.map(section => (
                      <span key={section} className="section-tag">
                        {section.replace('-', ' ')}
                      </span>
                    ))}
                  </div>
                  {selectedLayout === layout.id && (
                    <div className="selected-badge">✓ Selected</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Color Selection */}
        {step === 'colors' && (
          <div className="step-content">
            <h3>🎨 Choose Your Colors</h3>
            <p>Pick a color scheme or customize your own</p>
            
            <div className="color-presets">
              <h4>Quick Presets</h4>
              <div className="presets-grid">
                {colorPresets.map(preset => (
                  <button
                    key={preset.name}
                    className="color-preset"
                    onClick={() => handleColorSelect(preset)}
                    title={preset.name}
                  >
                    <div className="preset-colors">
                      <div className="color-dot" style={{ backgroundColor: preset.primary }} />
                      <div className="color-dot" style={{ backgroundColor: preset.accent }} />
                      <div className="color-dot" style={{ backgroundColor: preset.secondary }} />
                    </div>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="custom-colors">
              <h4>Custom Colors</h4>
              <div className="color-picker-group">
                <div className="color-picker-item">
                  <label>Primary Color</label>
                  <div className="color-input-wrapper">
                    <input
                      type="color"
                      value={colors.primary}
                      onChange={(e) => handleColorChange('primary', e.target.value)}
                      className="color-input"
                    />
                    <span className="color-value">{colors.primary}</span>
                  </div>
                </div>
                <div className="color-picker-item">
                  <label>Accent Color</label>
                  <div className="color-input-wrapper">
                    <input
                      type="color"
                      value={colors.accent}
                      onChange={(e) => handleColorChange('accent', e.target.value)}
                      className="color-input"
                    />
                    <span className="color-value">{colors.accent}</span>
                  </div>
                </div>
                <div className="color-picker-item">
                  <label>Secondary Color</label>
                  <div className="color-input-wrapper">
                    <input
                      type="color"
                      value={colors.secondary}
                      onChange={(e) => handleColorChange('secondary', e.target.value)}
                      className="color-input"
                    />
                    <span className="color-value">{colors.secondary}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="color-preview">
              <h4>Preview</h4>
              <div className="preview-box" style={{
                backgroundColor: colors.primary,
                color: '#fff',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '10px'
              }}>
                Primary Color - This is how your buttons will look
              </div>
              <div style={{
                backgroundColor: colors.accent,
                color: '#fff',
                padding: '20px',
                borderRadius: '8px'
              }}>
                Accent Color - Used for highlights and hovers
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Content */}
        {step === 'content' && (
          <div className="step-content">
            <h3>📝 Tell Us About Your Business</h3>
            <p>This information will populate your website</p>
            
            <div className="form-group">
              <label htmlFor="business-name">Business Name *</label>
              <input
                id="business-name"
                type="text"
                placeholder="Enter your business name"
                value={businessInfo.name}
                onChange={(e) => handleBusinessInfoChange('name', e.target.value)}
                maxLength="50"
              />
              <span className="char-count">{businessInfo.name.length}/50</span>
            </div>

            <div className="form-group">
              <label htmlFor="business-tagline">Tagline (Optional)</label>
              <input
                id="business-tagline"
                type="text"
                placeholder="e.g., Premium Coffee & Community"
                value={businessInfo.tagline}
                onChange={(e) => handleBusinessInfoChange('tagline', e.target.value)}
                maxLength="80"
              />
              <span className="char-count">{businessInfo.tagline.length}/80</span>
            </div>

            <div className="form-group">
              <label htmlFor="business-type">Business Type (Optional)</label>
              <input
                id="business-type"
                type="text"
                placeholder="e.g., Coffee Shop, Consulting, etc."
                value={businessInfo.type}
                onChange={(e) => handleBusinessInfoChange('type', e.target.value)}
                maxLength="30"
              />
              <span className="char-count">{businessInfo.type.length}/30</span>
            </div>

            <div className="form-note">
              💡 You can add more details like contact info, images, and services after creating your site.
            </div>
          </div>
        )}
      </div>

      <div className="builder-actions">
        <button
          className="btn btn-secondary"
          onClick={handleBack}
        >
          {step === 'layout' ? '✕ Cancel' : '← Back'}
        </button>
        
        {step !== 'content' && (
          <button
            className="btn btn-primary"
            onClick={handleNext}
          >
            Next →
          </button>
        )}
        
        {step === 'content' && (
          <button
            className="btn btn-primary"
            onClick={handleComplete}
          >
            ✨ Create My Website
          </button>
        )}
      </div>

      <div className="builder-help">
        <p>
          🎓 <strong>Need help?</strong> You can customize everything in the editor. Start simple and expand as needed!
        </p>
      </div>
    </div>
  );
}

export default CustomTemplateBuilder;

