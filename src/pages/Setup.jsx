import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSite } from '../hooks/useSite';
import { templatesService } from '../services/templates';
import { useToast } from '../hooks/useToast';
import { hasLayouts, getLayoutsForTemplate } from '../config/templateLayouts';
import Header from '../components/layout/Header';
import TemplateGrid from '../components/setup/TemplateGrid';
import EditorPanel from '../components/setup/EditorPanel';
import PreviewFrame from '../components/setup/PreviewFrame';
import PublishModal from '../components/setup/PublishModal';
import LayoutSelector from '../components/setup/LayoutSelector';
import './Setup.css';

function Setup() {
  const [searchParams] = useSearchParams();
  const { siteData, loadTemplate, saveDraft, lastSaved } = useSite();
  const { showError, showSuccess } = useToast();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [activeTab, setActiveTab] = useState('templates'); // templates, editor, preview
  const [selectedLayout, setSelectedLayout] = useState(null);
  const [baseTemplate, setBaseTemplate] = useState(null);

  // Calculate progress percentage
  const progressPercentage = () => {
    if (!siteData.template) return 0;
    if (!siteData.businessName) return 33;
    if (!siteData.tagline) return 66;
    return 100;
  };

  useEffect(() => {
    loadTemplates();

    // Load existing site if ID provided
    const siteId = searchParams.get('site');
    if (siteId) {
      // Load site data
    }
  }, []);

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
    const templateId = template.id || template.template;

    // Check if this template has layout variations
    if (hasLayouts(templateId)) {
      // Set base template and show layout selector
      setBaseTemplate(templateId);
      const layoutConfig = getLayoutsForTemplate(templateId);
      setSelectedLayout(layoutConfig.defaultLayout);

      // Load the default layout
      const fullTemplateId = `${templateId}-${layoutConfig.defaultLayout}`;
      const layoutTemplate = await templatesService.getTemplate(fullTemplateId);
      loadTemplate(layoutTemplate);
    } else {
      // No layouts, load template directly
      setBaseTemplate(null);
      setSelectedLayout(null);
      loadTemplate(template);
    }

    setActiveTab('editor');
    showSuccess(`✨ ${template.name || template.businessName} template selected!`);
  };

  const handleLayoutChange = async (layoutKey) => {
    if (!baseTemplate) return;

    setSelectedLayout(layoutKey);
    const fullTemplateId = `${baseTemplate}-${layoutKey}`;

    try {
      const layoutTemplate = await templatesService.getTemplate(fullTemplateId);
      loadTemplate(layoutTemplate);
      showSuccess(`Switched to ${layoutKey.replace('-', ' ')} layout`);
    } catch (error) {
      showError('Failed to load layout');
    }
  };

  const handlePublish = () => {
    if (!siteData.businessName || !siteData.template) {
      showError('Please select a template and add your business name');
      return;
    }
    setShowPublishModal(true);
  };

  return (
    <div className="setup-page">
      <Header />

      {/* Progress Bar */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progressPercentage()}%` }}
        />
      </div>

      <div className="setup-header">
        <div className="setup-title">
          <h1>{siteData.businessName || '✨ Create Your Amazing Website'}</h1>
          <p>{siteData.template ? `Template: ${siteData.template}` : 'Choose a stunning template to get started'}</p>
        </div>

        <div className="setup-actions">
          {lastSaved && (
            <span className="last-saved">
              💾 Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => saveDraft()}
            className="btn btn-secondary btn-glow"
          >
            💾 Save Draft
          </button>
          <button
            onClick={handlePublish}
            className="btn btn-primary btn-glow"
            disabled={!siteData.template}
          >
            🚀 Publish Site
          </button>
        </div>
      </div>

      <div className="setup-container">
        {/* Mobile tabs */}
        <div className="mobile-tabs">
          <button
            className={`mobile-tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            🎨 Templates
          </button>
          <button
            className={`mobile-tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
            disabled={!siteData.template}
          >
            ✏️ Editor
          </button>
          <button
            className={`mobile-tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
            disabled={!siteData.template}
          >
            👀 Preview
          </button>
        </div>

        {/* Desktop three-column layout */}
        <div className="setup-panels">
          {/* Templates Panel */}
          <div className={`setup-panel templates-panel ${activeTab === 'templates' ? 'active' : ''}`}>
            <div className="panel-header">
              <h2>🎨 Choose Your Template</h2>
            </div>
            <div className="panel-content">
              {loading ? (
                <div className="panel-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading amazing templates...</p>
                </div>
              ) : (
                <TemplateGrid
                  templates={templates}
                  selectedTemplate={siteData.template}
                  onSelect={handleTemplateSelect}
                />
              )}
            </div>
          </div>

          {/* Editor Panel */}
          <div className={`setup-panel editor-panel ${activeTab === 'editor' ? 'active' : ''}`}>
            <div className="panel-header">
              <h2>✏️ Customize Your Content</h2>
            </div>
            <div className="panel-content">
              {siteData.template ? (
                <>
                  {/* Show layout selector if template has layouts */}
                  {baseTemplate && hasLayouts(baseTemplate) && (
                    <LayoutSelector
                      baseTemplate={baseTemplate}
                      currentLayout={selectedLayout}
                      onLayoutChange={handleLayoutChange}
                    />
                  )}
                  <EditorPanel />
                </>
              ) : (
                <div className="panel-empty">
                  <div className="empty-icon">🎨</div>
                  <p>👈 Select a template from the left to start customizing your website</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className={`setup-panel preview-panel ${activeTab === 'preview' ? 'active' : ''}`}>
            <div className="panel-header">
              <h2>👀 Live Preview</h2>
            </div>
            <div className="panel-content">
              {siteData.template ? (
                <PreviewFrame siteData={siteData} />
              ) : (
                <div className="panel-empty">
                  <div className="empty-icon">🖼️</div>
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
