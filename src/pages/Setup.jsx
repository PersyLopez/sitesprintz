import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSite } from '../hooks/useSite';
import { templatesService } from '../services/templates';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import TemplateGrid from '../components/setup/TemplateGrid';
import PageBuilder from '../components/setup/PageBuilder';
import PublishModal from '../components/setup/PublishModal';
import QuickStartWizard from '../components/setup/QuickStartWizard';
import CustomTemplateBuilder from '../components/setup/CustomTemplateBuilder';
import LoadingFallback from '../components/common/LoadingFallback';
import SaveIndicator from '../components/common/SaveIndicator';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import './Setup.css';

// Lazy load PreviewFrame (heavy component with iframe)
const PreviewFrame = lazy(() => import('../components/setup/PreviewFrame'));

function Setup() {
  const [searchParams] = useSearchParams();
  const { siteData, loadTemplate, loadSite, saveDraft, lastSaved, isSaving } = useSite();
  const { showError, showSuccess } = useToast();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [activeTab, setActiveTab] = useState('templates'); // templates, editor, preview
  const [showWizard, setShowWizard] = useState(true);
  const [wizardCompleted, setWizardCompleted] = useState(false);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(true);

  const templatesPanelVisible = showTemplatePicker || !siteData.template;
  const twoColumnLayout = Boolean(siteData.template) && !showTemplatePicker;

  useEffect(() => {
    loadTemplates();

    // Load existing site if ID provided
    const siteId = searchParams.get('site');
    if (siteId) {
      loadSite(siteId).then(() => {
        setActiveTab('editor');
        setShowWizard(false); // Don't show wizard when editing existing site
        setWizardCompleted(true);
        setShowTemplatePicker(false);
      }).catch(err => {
        console.error('Failed to load site:', err);
      });
    } else if (siteData.template) {
      // If template already loaded, skip wizard
      setShowWizard(false);
      setWizardCompleted(true);
      setShowTemplatePicker(false);
    }
  }, [searchParams]);

  const loadTemplates = async () => {
    try {
      const templateData = await templatesService.getTemplates();
      // content is wrapped in { templates: [...] }
      setTemplates(templateData.templates || templateData || []);
    } catch (error) {
      showError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = async (template) => {
    // Load template directly (no layout variations)
    loadTemplate(template);
    setShowTemplatePicker(false);
    setActiveTab('editor');
    showSuccess(`✨ ${template.name || template.businessName} template selected!`);
  };

  const handlePublish = () => {
    if (!siteData.businessName || !siteData.template) {
      showError('Please select a template and add your business name');
      return;
    }
    setShowPublishModal(true);
  };

  const handleWizardComplete = (wizardData) => {
    setWizardCompleted(true);
    setShowWizard(false);
    setShowTemplatePicker(false);
    setActiveTab('editor');
    showSuccess('✨ Your website is ready! Customize it further or publish now.');
  };

  const handleWizardSkip = () => {
    setShowWizard(false);
    setWizardCompleted(true);
    setActiveTab('editor');
  };

  const handleCustomBuilderComplete = async (customTemplate) => {
    // Load the custom template like a regular template
    setShowCustomBuilder(false);
    await loadTemplate(customTemplate);
    setShowTemplatePicker(false);
    setActiveTab('editor');
    showSuccess(`✨ ${customTemplate.businessName} - Ready to customize!`);
  };

  const handleShowTemplatePicker = () => {
    setShowTemplatePicker(true);
    setActiveTab('templates');
  };

  const handleCustomBuilderCancel = () => {
    setShowCustomBuilder(false);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'Meta+s': (e) => {
      e.preventDefault();
      saveDraft();
    },
    'Ctrl+s': (e) => {
      e.preventDefault();
      saveDraft();
    },
    'Meta+p': (e) => {
      e.preventDefault();
      if (siteData.template) {
        setActiveTab('preview');
      }
    },
    'Ctrl+p': (e) => {
      e.preventDefault();
      if (siteData.template) {
        setActiveTab('preview');
      }
    },
    'Meta+Shift+p': (e) => {
      e.preventDefault();
      if (siteData.template && siteData.businessName) {
        handlePublish();
      }
    },
    'Ctrl+Shift+p': (e) => {
      e.preventDefault();
      if (siteData.template && siteData.businessName) {
        handlePublish();
      }
    }
  }, [siteData.template, siteData.businessName]);

  // Show wizard if not completed and no existing site
  if (showWizard && !wizardCompleted && !searchParams.get('site')) {
    return (
      <div className="setup-page setup-page-wizard">
        <Header />
        <QuickStartWizard
          onComplete={handleWizardComplete}
          onSkip={handleWizardSkip}
        />
      </div>
    );
  }

  return (
    <div className="setup-page">
      <a href="#setup-main" className="skip-to-content">
        Skip to main content
      </a>
      <Header />

      <div className="setup-header">
        <div className="setup-title">
          <h1>{siteData.businessName || 'New site'}</h1>
          <p>{siteData.template ? `Template: ${siteData.template}` : 'Pick a template to start'}</p>
        </div>

        <div className="setup-actions">
          <SaveIndicator lastSaved={lastSaved} isSaving={isSaving} />
          {siteData.template && !showTemplatePicker && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              data-testid="change-template-button"
              onClick={handleShowTemplatePicker}
            >
              Change template
            </button>
          )}
          <button
            type="button"
            onClick={() => saveDraft()}
            className="btn btn-secondary"
            data-testid="save-draft-button"
          >
            Save
          </button>
          <button
            type="button"
            onClick={handlePublish}
            className="btn btn-primary"
            disabled={!siteData.template}
            data-testid="publish-site-button"
          >
            Publish
          </button>
        </div>
      </div>

      <div id="setup-main" className="setup-container">
        {/* Mobile tabs */}
        <div className="mobile-tabs">
          <button
            className={`mobile-tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={handleShowTemplatePicker}
          >
            Templates
          </button>
          <button
            className={`mobile-tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
            disabled={!siteData.template}
          >
            Editor
          </button>
          <button
            className={`mobile-tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
            disabled={!siteData.template}
          >
            Preview
          </button>
        </div>

        {/* Desktop three-column layout */}
        <div className={`setup-panels ${twoColumnLayout ? 'setup-panels--two-col' : ''}`}>
          {/* Templates Panel */}
          <div
            className={`setup-panel templates-panel ${activeTab === 'templates' ? 'active' : ''} ${!templatesPanelVisible ? 'templates-panel--hidden' : ''}`}
          >
            <div className="panel-header">
              <h2>Templates</h2>
            </div>
            <div className="panel-content">
              {loading ? (
                <div className="template-skeleton-grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonLoader key={i} variant="card" width="100%" height="300px" />
                  ))}
                </div>
              ) : showCustomBuilder ? (
                <CustomTemplateBuilder
                  onComplete={handleCustomBuilderComplete}
                  onCancel={handleCustomBuilderCancel}
                />
              ) : (
                <TemplateGrid
                  templates={templates}
                  selectedTemplate={siteData.template}
                  onSelect={handleTemplateSelect}
                  onCustom={() => setShowCustomBuilder(true)}
                />
              )}
            </div>
          </div>

          <div
            className={`setup-panel editor-panel ${activeTab === 'editor' ? 'active' : ''}`}
            data-testid="customize-panel"
          >
            <div className="panel-content">
              {siteData.template ? (
                <PageBuilder key={siteData.template} />
              ) : (
                <div className="panel-empty">
                  <p>Select a template from the left to start customizing your website</p>
                </div>
              )}
            </div>
          </div>

          <div className={`setup-panel preview-panel ${activeTab === 'preview' ? 'active' : ''}`}>
            <div className="panel-content">
              {siteData.template ? (
                <Suspense fallback={<LoadingFallback message="Loading preview..." />}>
                  <PreviewFrame />
                </Suspense>
              ) : (
                <div className="panel-empty">
                  <p>Your live preview will appear here once you select a template</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPublishModal && (
        <PublishModal
          siteData={siteData}
          onClose={() => setShowPublishModal(false)}
        />
      )}
    </div>
  );
}

export default Setup;
