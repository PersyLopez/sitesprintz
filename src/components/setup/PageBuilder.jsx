import React, { useState, useCallback } from 'react';
import { useSite } from '../../hooks/useSite';
import { useAuth } from '../../hooks/useAuth';
import { usePlan } from '../../hooks/usePlan';
import { useToast } from '../../hooks/useToast';
import {
  getAllSections,
  getSectionsByCategory,
  getAllCategories,
  canAccessSection,
  createSectionInstance
} from '../../config/sectionRegistry.js';
import './PageBuilder.css';

function PageBuilder() {
  const { siteData, updateField } = useSite();
  const { user } = useAuth();
  const { plan } = usePlan();
  const { showSuccess, showError } = useToast();
  
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [draggedSection, setDraggedSection] = useState(null);
  const [saving, setSaving] = useState(false);

  const sections = siteData.sections || [];
  const categories = getAllCategories();
  
  // Add a new section
  const handleAddSection = (sectionType) => {
    try {
      const newSection = createSectionInstance(sectionType, {
        order: sections.length
      });
      
      const updated = [...sections, newSection];
      updateField('sections', updated);
      setShowAddMenu(false);
      showSuccess(`Added ${sectionType} section`);
    } catch (error) {
      showError(`Failed to add section: ${error.message}`);
    }
  };
  
  // Remove a section
  const handleRemoveSection = (sectionId) => {
    if (!window.confirm('Remove this section?')) return;
    
    const updated = sections.filter(s => s.id !== sectionId);
    updateField('sections', updated);
    showSuccess('Section removed');
  };
  
  // Toggle section visibility
  const handleToggleSection = (sectionId) => {
    const updated = sections.map(s => 
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    );
    updateField('sections', updated);
  };
  
  // Reorder sections (drag and drop)
  const handleDragStart = (section) => {
    setDraggedSection(section);
  };
  
  const handleDropZone = (targetIndex) => {
    if (!draggedSection) return;
    
    const currentIndex = sections.findIndex(s => s.id === draggedSection.id);
    if (currentIndex === targetIndex) {
      setDraggedSection(null);
      return;
    }
    
    const updated = [...sections];
    updated.splice(currentIndex, 1);
    updated.splice(targetIndex, 0, draggedSection);
    
    // Update order values
    const reordered = updated.map((s, i) => ({ ...s, order: i }));
    updateField('sections', reordered);
    setDraggedSection(null);
    showSuccess('Section reordered');
  };
  
  // Get sections available for this tier
  const getAvailableSections = () => {
    const all = filterCategory === 'all' 
      ? getAllSections() 
      : getSectionsByCategory(filterCategory);
    
    return all.filter(section => {
      const hasAccess = canAccessSection(plan, section.type);
      const alreadyAdded = sections.some(s => s.type === section.type && !section.repeatable);
      return hasAccess && !alreadyAdded;
    });
  };
  
  const getLockedSections = () => {
    const all = filterCategory === 'all' 
      ? getAllSections() 
      : getSectionsByCategory(filterCategory);
    
    return all.filter(section => {
      const hasAccess = canAccessSection(plan, section.type);
      return !hasAccess;
    });
  };
  
  const availableSections = getAvailableSections();
  const lockedSections = getLockedSections();

  return (
    <div className="page-builder">
      <div className="builder-header">
        <h3>📄 Page Builder</h3>
        <p className="subtitle">Add, remove, and reorder sections on your site</p>
      </div>

      {/* Current Sections List */}
      <div className="sections-list">
        <div className="list-header">
          <h4>Current Sections ({sections.length})</h4>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddMenu(!showAddMenu)}
          >
            + Add Section
          </button>
        </div>

        {sections.length === 0 ? (
          <div className="empty-state">
            <p>No sections added yet. Add one to get started!</p>
          </div>
        ) : (
          <div className="sections-container">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className={`section-item ${!section.enabled ? 'disabled' : ''}`}
                draggable
                onDragStart={() => handleDragStart(section)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropZone(index)}
              >
                <div className="section-drag-handle">≡</div>
                <div className="section-info">
                  <span className="section-type">{section.type}</span>
                  <span className="section-order">#{index + 1}</span>
                </div>
                <div className="section-controls">
                  <button
                    className={`toggle-btn ${section.enabled ? 'enabled' : 'disabled'}`}
                    onClick={() => handleToggleSection(section.id)}
                    title={section.enabled ? 'Hide section' : 'Show section'}
                  >
                    {section.enabled ? '👁️' : '🚫'}
                  </button>
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveSection(section.id)}
                    title="Remove section"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Section Menu */}
      {showAddMenu && (
        <div className="add-section-menu">
          <div className="menu-header">
            <h4>Add a Section</h4>
            <button
              className="close-btn"
              onClick={() => setShowAddMenu(false)}
            >
              ✕
            </button>
          </div>

          {/* Category Filter */}
          <div className="category-filter">
            <label>Filter by:</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Available Sections */}
          {availableSections.length > 0 && (
            <div className="available-sections">
              <h5>Available Sections</h5>
              <div className="sections-grid">
                {availableSections.map(section => (
                  <div
                    key={section.type}
                    className="section-card"
                    onClick={() => handleAddSection(section.type)}
                  >
                    <span className="section-icon">{section.icon}</span>
                    <span className="section-name">{section.name}</span>
                    <span className="section-tier">{section.requiredTier}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked Sections (Upgrade Required) */}
          {lockedSections.length > 0 && (
            <div className="locked-sections">
              <h5>Upgrade to Unlock</h5>
              <div className="sections-grid locked">
                {lockedSections.map(section => (
                  <div
                    key={section.type}
                    className="section-card locked"
                    title={`Requires ${section.requiredTier} tier`}
                  >
                    <span className="lock-icon">🔒</span>
                    <span className="section-name">{section.name}</span>
                    <span className="required-tier">{section.requiredTier}</span>
                  </div>
                ))}
              </div>
              <p className="upgrade-hint">
                Upgrade your plan to access more sections
              </p>
            </div>
          )}

          {availableSections.length === 0 && lockedSections.length === 0 && (
            <div className="no-sections">
              <p>No sections available in this category</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PageBuilder;
