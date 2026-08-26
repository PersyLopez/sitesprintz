import React, { useState } from 'react';
import { useSite } from '../../hooks/useSite';
import BusinessInfoForm from './forms/BusinessInfoForm';
import ServicesProductsEditor from './forms/ServicesProductsEditor';
import ContactBookingForm from './forms/ContactBookingForm';
import ThemePicker from './forms/ThemePicker';
import './EditorPanel.css';

function EditorPanel() {
  const { siteData, undo, redo, canUndo, canRedo } = useSite();
  const [activeSection, setActiveSection] = useState('essentials');

  const sections = [
    { id: 'essentials', label: 'Essentials', icon: '📋' },
    { id: 'design', label: 'Design', icon: '🎨' },
    { id: 'services', label: 'Services & Products', icon: '✨' },
    { id: 'contact', label: 'Contact & Booking', icon: '📞' },
  ];

  const handleTabClick = (sectionId) => {
    setActiveSection(sectionId);
  };

  const handleTabKeyDown = (event) => {
    const currentIndex = sections.findIndex((section) => section.id === activeSection);
    if (currentIndex < 0) return;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setActiveSection(sections[(currentIndex + 1) % sections.length].id);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setActiveSection(sections[(currentIndex - 1 + sections.length) % sections.length].id);
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'essentials':
        return (
          <>
            <div className="section-header">
              <h2>Essentials</h2>
              <p className="section-description">Basic information about your business</p>
            </div>
            <BusinessInfoForm />
          </>
        );
      case 'design':
        return (
          <div className="editor-section">
            <div className="section-header">
              <h2>Look</h2>
              <p className="section-description">Pick one of six contrast-checked themes. Accents and text colors are locked together.</p>
            </div>
            <ThemePicker templateId={siteData.template || siteData.templateId} />
          </div>
        );
      case 'services':
        return (
          <>
            <div className="section-header">
              <h2>Services & Products</h2>
              <p className="section-description">Manage your services and product catalog</p>
            </div>
            <ServicesProductsEditor />
          </>
        );
      case 'contact':
        return (
          <>
            <div className="section-header">
              <h2>Contact & Booking</h2>
              <p className="section-description">Contact information and appointment booking</p>
            </div>
            <ContactBookingForm />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="editor-panel-container">
      <div className="editor-header-actions">
        <div className="undo-redo-buttons">
          <button
            className="btn btn-secondary btn-sm"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Cmd+Z)"
            aria-label="Undo last change"
          >
            Undo
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Cmd+Shift+Z)"
            aria-label="Redo last undone change"
          >
            Redo
          </button>
        </div>
      </div>

      <div
        className="editor-tabs"
        role="tablist"
        aria-label="Editor sections"
        onKeyDown={handleTabKeyDown}
      >
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            id={`editor-tab-${section.id}`}
            aria-selected={activeSection === section.id}
            aria-controls={`editor-panel-${section.id}`}
            tabIndex={activeSection === section.id ? 0 : -1}
            className={`editor-tab ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => handleTabClick(section.id)}
          >
            <span className="tab-icon" aria-hidden="true">{section.icon}</span>
            <span className="tab-label">{section.label}</span>
          </button>
        ))}
      </div>

      <div className="editor-content">
        <div
          role="tabpanel"
          id={`editor-panel-${activeSection}`}
          aria-labelledby={`editor-tab-${activeSection}`}
          data-section={activeSection}
        >
          {renderActiveSection()}
        </div>
      </div>
    </div>
  );
}

export default EditorPanel;
