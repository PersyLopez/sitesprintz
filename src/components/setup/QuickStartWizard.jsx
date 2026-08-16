import { useState } from 'react';
import { useSite } from '../../hooks/useSite';
import { templatesService } from '../../services/templates';
import { getIndustryDefaults, replacePlaceholder, INDUSTRY_TEMPLATES } from '../../utils/industryDefaults';
import { buildSiteDataFromWizard, REFINED_NICHE_IDS } from '../../utils/wizardSiteDataBuilder';
import { getRecommendedSiteThemes, colorsFromSiteTheme } from '../../config/siteThemes';
import { getLayoutForNiche } from '../../config/layouts';
import LevelSelector from './LevelSelector';
import './QuickStartWizard.css';

const WIZARD_STEPS = [
  { id: 'industry', title: 'What type of business?', icon: '🏢' },
  { id: 'basics', title: 'Business essentials', icon: '📝' },
  { id: 'level', title: 'Business size', icon: '📊' },
  { id: 'style', title: 'Choose your look', icon: '🎨' }
];

const INDUSTRIES = [
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️', description: 'Food & dining' },
  { id: 'salon', name: 'Salon & Spa', icon: '💇', description: 'Beauty & wellness' },
  { id: 'fitness', name: 'Fitness & Gym', icon: '💪', description: 'Health & fitness' },
  { id: 'consultant', name: 'Consultant', icon: '💼', description: 'Business consulting' },
  { id: 'freelancer', name: 'Freelancer', icon: '👔', description: 'Creative services' },
  { id: 'cleaning', name: 'Cleaning', icon: '🧹', description: 'Home services' },
  { id: 'electrician', name: 'Electrician', icon: '⚡', description: 'Electrical services' },
  { id: 'plumbing', name: 'Plumbing', icon: '🔧', description: 'Plumbing services' },
  { id: 'auto-repair', name: 'Auto Repair', icon: '🚗', description: 'Automotive' },
  { id: 'pet-care', name: 'Pet Care', icon: '🐾', description: 'Pet services' },
  { id: 'tech-repair', name: 'Tech Repair', icon: '💻', description: 'Technology repair' },
  { id: 'product-showcase', name: 'Product Store', icon: '🛍️', description: 'E-commerce' },
  { id: 'tow-truck', name: 'Tow Truck', icon: '🚛', description: 'Roadside & towing' },
  { id: 'product-ordering', name: 'Product Ordering', icon: '📦', description: 'Catalog & orders' }
];

// Industry ID → niche ID mapping (old INDUSTRIES use 'fitness', new system uses 'gym')
const INDUSTRY_TO_NICHE = {
  restaurant: 'restaurant',
  salon: 'salon',
  fitness: 'gym',
  consultant: 'consultant',
  freelancer: 'freelancer',
  cleaning: 'cleaning',
  electrician: 'electrician',
  plumbing: 'plumbing',
  'auto-repair': 'auto-repair',
  'pet-care': 'pet-care',
  'tech-repair': 'tech-repair',
  'product-showcase': 'product-showcase',
  'tow-truck': 'tow-truck',
  'product-ordering': 'product-ordering',
};

function QuickStartWizard({ onComplete, onSkip }) {
  const { loadTemplate } = useSite();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('solo');
  const [formData, setFormData] = useState({
    businessName: '',
    phone: '',
    email: ''
  });
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [loading, setLoading] = useState(false);

  const defaults = selectedIndustry ? getIndustryDefaults(selectedIndustry) : null;

  const handleIndustrySelect = (industryId) => {
    setSelectedIndustry(industryId);
    setSelectedTheme(null);
    // Store industry preference for template recommendations
    localStorage.setItem('userIndustryPreference', industryId);
    setCurrentStep(1);
  };

  const handleBasicsChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBasicsNext = () => {
    // Validate: business name required, at least phone or email
    if (!formData.businessName.trim()) {
      alert('Please enter your business name');
      return;
    }
    if (!formData.phone.trim() && !formData.email.trim()) {
      alert('Please enter at least a phone number or email address');
      return;
    }
    // Go to level step (step 2)
    setCurrentStep(2);
  };

  const handleLevelNext = () => {
    const niche = INDUSTRY_TO_NICHE[selectedIndustry] || selectedIndustry;
    const recommended = getRecommendedSiteThemes(niche);
    if (!selectedTheme && recommended[0]) {
      setSelectedTheme(recommended[0]);
    }
    setCurrentStep(3);
  };

  const handleThemeSelect = (theme) => {
    setSelectedTheme(theme);
  };

  const handleComplete = async () => {
    if (!selectedIndustry || !selectedTheme) {
      alert('Please complete all steps');
      return;
    }

    setLoading(true);

    try {
      const nicheId = INDUSTRY_TO_NICHE[selectedIndustry];
      const contact = {};
      if (formData.phone.trim()) contact.phone = formData.phone.trim();
      if (formData.email.trim()) contact.email = formData.email.trim();

      // Try the new layout engine first for known niches
      if (nicheId && REFINED_NICHE_IDS.includes(nicheId)) {
        const siteData = buildSiteDataFromWizard({
          niche: nicheId,
          businessName: formData.businessName.trim(),
          level: selectedLevel,
          contact,
          themeId: selectedTheme.id,
        });
        await loadTemplate(siteData);
        onComplete(siteData);
        return;
      }

      // Fallback to old template flow for unknown niches
      const templateConfig = INDUSTRY_TEMPLATES[selectedIndustry];
      const templateId = templateConfig.template;
      const template = await templatesService.getTemplate(templateId);
      const siteData = {
        ...template,
        businessName: formData.businessName.trim(),
        brand: { name: formData.businessName.trim(), tagline: defaults?.hero?.subtitle || '' },
        hero: {
          title: replacePlaceholder(defaults?.hero?.title || '', formData.businessName.trim()),
          subtitle: defaults?.hero?.subtitle || '',
          image: template.hero?.image || template.heroImage || ''
        },
        contact: {
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined
        },
        contactEmail: formData.email.trim() || undefined,
        contactPhone: formData.phone.trim() || undefined,
        services: defaults?.services || [],
        themeVars: { 'color-primary': selectedTheme.tokens.accent, 'color-accent': selectedTheme.tokens.accent },
        colors: colorsFromSiteTheme(selectedTheme.id),
        _themeId: selectedTheme.id,
      };
      await loadTemplate(siteData);
      onComplete(siteData);
    } catch (error) {
      alert('Failed to load template. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="wizard-step industry-selection">
            <h2>What type of business are you creating a website for?</h2>
            <p className="step-description">Choose the category that best matches your business</p>
            <div className="industry-grid">
              {INDUSTRIES.map(industry => (
                <button
                  key={industry.id}
                  className={`industry-card ${selectedIndustry === industry.id ? 'selected' : ''}`}
                  onClick={() => handleIndustrySelect(industry.id)}
                >
                  <span className="industry-icon">{industry.icon}</span>
                  <h3>{industry.name}</h3>
                  <p>{industry.description}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="wizard-step basics-form">
            <h2>Tell us about your business</h2>
            <p className="step-description">We will use this to personalize your website</p>
            <div className="wizard-form">
              <div className="form-group">
                <label htmlFor="businessName">
                  Business Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="businessName"
                  data-testid="business-name-input"
                  value={formData.businessName}
                  onChange={(e) => handleBasicsChange('businessName', e.target.value)}
                  placeholder="e.g., Acme Restaurant"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  data-testid="contact-phone-input"
                  value={formData.phone}
                  onChange={(e) => handleBasicsChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  data-testid="contact-email-input"
                  value={formData.email}
                  onChange={(e) => handleBasicsChange('email', e.target.value)}
                  placeholder="contact@yourbusiness.com"
                />
              </div>

              <div className="form-help">
                <p>💡 At least one contact method (phone or email) is required</p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="wizard-step level-selection">
            <h2>What size is your business?</h2>
            <p className="step-description">This sets the page layout and how customers book with you or your team</p>
            <LevelSelector
              value={selectedLevel}
              onChange={setSelectedLevel}
              layout={getLayoutForNiche(INDUSTRY_TO_NICHE[selectedIndustry] || selectedIndustry)}
              niche={INDUSTRY_TO_NICHE[selectedIndustry] || selectedIndustry}
            />
          </div>
        );

      case 3:
        return (
          <div className="wizard-step style-selection">
            <h2>Choose a theme</h2>
            <p className="step-description">Six palettes with locked contrast. Recommended ones for your business come first.</p>
            <div className="theme-grid">
              {getRecommendedSiteThemes(INDUSTRY_TO_NICHE[selectedIndustry] || selectedIndustry).map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-card ${selectedTheme?.id === theme.id ? 'selected' : ''}`}
                  onClick={() => handleThemeSelect(theme)}
                  data-testid={`wizard-theme-${theme.id}`}
                >
                  <div className="theme-preview" style={{
                    background: theme.tokens.bg,
                    border: `1px solid ${theme.tokens.hairline}`,
                  }}>
                    <div className="theme-preview-content">
                      <div className="preview-text" style={{ color: theme.tokens.text }}>
                        {formData.businessName || 'Your Business'}
                      </div>
                      <span className="color-dot" style={{ backgroundColor: theme.tokens.accent }} />
                    </div>
                  </div>
                  <div className="theme-info">
                    <h3>{theme.name}</h3>
                    <p>{theme.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="quickstart-wizard">
      <div className="wizard-header">
        <h1>✨ Quick Start</h1>
        <p>Get your website ready in a few simple steps</p>
        <button className="wizard-skip" onClick={onSkip}>
          Skip to Full Editor →
        </button>
      </div>

      <div className="wizard-progress">
        {WIZARD_STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`progress-step ${index <= currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
          >
            <div className="step-number">
              {index < currentStep ? '✓' : index + 1}
            </div>
            <div className="step-label">{step.title}</div>
          </div>
        ))}
      </div>

      <div className="wizard-content">
        {renderStep()}
      </div>

      <div className="wizard-actions">
        {currentStep > 0 && (
          <button className="btn btn-secondary" onClick={handleBack}>
            ← Back
          </button>
        )}
        <div className="wizard-actions-right">
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={currentStep === 1 ? handleBasicsNext : currentStep === 2 ? handleLevelNext : () => setCurrentStep(currentStep + 1)}
            >
              Next →
            </button>
          ) : (
            <button
              className="btn btn-primary btn-large"
              onClick={handleComplete}
              disabled={loading || !selectedTheme}
            >
              {loading ? 'Creating...' : '✨ Create My Website'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickStartWizard;

