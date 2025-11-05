import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSite } from '../hooks/useSite';
import { templatesService } from '../services/templates';
import { useToast } from '../hooks/useToast';
import Header from '../components/layout/Header';
import TemplateGrid from '../components/setup/TemplateGrid';
import EditorPanel from '../components/setup/EditorPanel';
import PreviewFrame from '../components/setup/PreviewFrame';
import PublishModal from '../components/setup/PublishModal';
import './Setup.css';

function Setup() {
  const [searchParams] = useSearchParams();
  const { siteData, loadTemplate, saveDraft, lastSaved } = useSite();
  const { showError } = useToast();
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [activeTab, setActiveTab] = useState('templates'); // templates, editor, preview

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
      setTemplates(templateData);
    } catch (error) {
      showError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    loadTemplate(template);
    setActiveTab('editor');
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
      
      <div className="setup-header">
        <div className="setup-title">
          <h1>{siteData.businessName || 'Create Your Website'}</h1>
          <p>{siteData.template ? `Template: ${siteData.template}` : 'Select a template to get started'}</p>
        </div>
        
        <div className="setup-actions">
          {lastSaved && (
            <span className="last-saved">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button 
            onClick={() => saveDraft()}
            className="btn btn-secondary"
          >
            💾 Save Draft
          </button>
          <button 
            onClick={handlePublish}
            className="btn btn-primary"
            disabled={!siteData.template}
          >
            🚀 Publish
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
        <div className="setup-panels">
          {/* Templates Panel */}
          <div className={`setup-panel templates-panel ${activeTab === 'templates' ? 'active' : ''}`}>
            <div className="panel-header">
              <h2>Choose Template</h2>
            </div>
            <div className="panel-content">
              {loading ? (
                <div className="panel-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading templates...</p>
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
              <h2>Edit Content</h2>
            </div>
            <div className="panel-content">
              {siteData.template ? (
                <EditorPanel />
              ) : (
                <div className="panel-empty">
                  <p>👈 Select a template to start editing</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className={`setup-panel preview-panel ${activeTab === 'preview' ? 'active' : ''}`}>
            <div className="panel-header">
              <h2>Live Preview</h2>
            </div>
            <div className="panel-content">
              {siteData.template ? (
                <PreviewFrame siteData={siteData} />
              ) : (
                <div className="panel-empty">
                  <p>Preview will appear here</p>
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
