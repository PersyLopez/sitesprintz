import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSite } from '../../hooks/useSite';
import { usePlan } from '../../hooks/usePlan';
import { useToast } from '../../hooks/useToast';
import {
  getAllSections,
  getSectionsByCategory,
  getAllCategories,
  getSectionByType,
  canAccessSection,
  createSectionInstance,
} from '../../config/sectionRegistry.js';
import BusinessInfoForm from './forms/BusinessInfoForm';
import ServicesProductsEditor from './forms/ServicesProductsEditor';
import ContactBookingForm from './forms/ContactBookingForm';
import ThemePicker from './forms/ThemePicker';
import './PageBuilder.css';

export const LOOK_ID = '__look__';

export function inspectorKindForSection(type) {
  if (!type || type === LOOK_ID) return 'look';
  if (['services', 'catalog', 'menu'].includes(type)) return 'services';
  if (['contact', 'booking', 'hours', 'location', 'social', 'native-booking'].includes(type)) {
    return 'contact';
  }
  return 'essentials';
}

function PageBuilder() {
  const { siteData, updateField } = useSite();
  const { plan } = usePlan();
  const { showSuccess, showError } = useToast();

  const sections = Array.isArray(siteData?.sections) ? siteData.sections : [];
  const categories = getAllCategories();

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [draggedSection, setDraggedSection] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [pendingRemoveId, setPendingRemoveId] = useState(null);

  const addMenuRef = useRef(null);
  const addButtonRef = useRef(null);
  const effectiveSelectedId = selectedId ?? (sections[0]?.id || LOOK_ID);

  useEffect(() => {
    if (!selectedId || selectedId === LOOK_ID) return;
    if (!sections.some((section) => section.id === selectedId)) {
      setSelectedId(LOOK_ID);
      setPendingRemoveId(null);
    }
  }, [sections, selectedId]);

  useEffect(() => {
    if (!showAddMenu) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowAddMenu(false);
        addButtonRef.current?.focus();
      }
    };

    const onPointerDown = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)
          && !addButtonRef.current?.contains(event.target)) {
        setShowAddMenu(false);
        addButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [showAddMenu]);

  const persistSections = useCallback((next) => {
    updateField('sections', next.map((section, index) => ({ ...section, order: index })));
  }, [updateField]);

  const handleAddSection = (sectionType) => {
    const definition = getSectionByType(sectionType);
    if (!definition) {
      showError(`Unknown section: ${sectionType}`);
      return;
    }
    if (!canAccessSection(plan, sectionType)) {
      return;
    }
    if (!definition.repeatable && sections.some((section) => section.type === sectionType)) {
      return;
    }

    try {
      const created = createSectionInstance(sectionType, { order: sections.length });
      persistSections([...sections, created]);
      setSelectedId(created.id);
      setShowAddMenu(false);
      addButtonRef.current?.focus();
      showSuccess(`Added ${definition.name}`);
    } catch (error) {
      showError(error.message || 'Could not add section');
    }
  };

  const confirmRemove = () => {
    if (!pendingRemoveId) return;
    const removedId = pendingRemoveId;
    persistSections(sections.filter((section) => section.id !== removedId));
    if (selectedId === removedId) setSelectedId(LOOK_ID);
    setPendingRemoveId(null);
    showSuccess('Section removed');
  };

  const handleToggleSection = (sectionId) => {
    persistSections(sections.map((section) => (
      section.id === sectionId ? { ...section, enabled: !section.enabled } : section
    )));
  };

  const moveSection = (sectionId, delta) => {
    const from = sections.findIndex((section) => section.id === sectionId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    persistSections(next);
  };

  const handleDragStart = (event, section) => {
    event.stopPropagation();
    setDraggedSection(section);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedSection(null);
  };

  const handleDropAt = (targetIndex) => {
    if (!draggedSection) return;
    const from = sections.findIndex((section) => section.id === draggedSection.id);
    if (from < 0) {
      setDraggedSection(null);
      return;
    }

    const next = [...sections];
    const [item] = next.splice(from, 1);
    const insertAt = from < targetIndex ? targetIndex - 1 : targetIndex;
    if (insertAt === from) {
      setDraggedSection(null);
      return;
    }

    next.splice(insertAt, 0, item);
    persistSections(next);
    setDraggedSection(null);
  };

  const getAvailableSections = () => {
    const all = filterCategory === 'all'
      ? getAllSections()
      : getSectionsByCategory(filterCategory);

    return all.filter((definition) => {
      if (!canAccessSection(plan, definition.type)) return false;
      if (!definition.repeatable && sections.some((section) => section.type === definition.type)) {
        return false;
      }
      return true;
    });
  };

  const getLockedSections = () => {
    const all = filterCategory === 'all'
      ? getAllSections()
      : getSectionsByCategory(filterCategory);
    return all.filter((definition) => !canAccessSection(plan, definition.type));
  };

  const availableSections = getAvailableSections();
  const lockedSections = getLockedSections();
  const selectedSection = sections.find((section) => section.id === effectiveSelectedId);
  const inspectorKind = inspectorKindForSection(
    selectedSection?.type || (effectiveSelectedId === LOOK_ID ? LOOK_ID : null)
  );

  const renderInspector = () => {
    switch (inspectorKind) {
      case 'look':
        return (
          <>
            <h3 className="inspector-title">Look</h3>
            <ThemePicker templateId={siteData.template || siteData.templateId} />
          </>
        );
      case 'services':
        return (
          <>
            <h3 className="inspector-title">Services and products</h3>
            <ServicesProductsEditor />
          </>
        );
      case 'contact':
        return (
          <>
            <h3 className="inspector-title">Contact and booking</h3>
            <ContactBookingForm />
          </>
        );
      default:
        return (
          <>
            <h3 className="inspector-title">Essentials</h3>
            <BusinessInfoForm />
          </>
        );
    }
  };

  return (
    <div className="page-builder" data-testid="page-builder">
      <div className="builder-toolbar">
        <button
          type="button"
          className={`builder-look-btn ${effectiveSelectedId === LOOK_ID ? 'selected' : ''}`}
          data-testid="builder-look"
          aria-pressed={effectiveSelectedId === LOOK_ID}
          onClick={() => {
            setSelectedId(LOOK_ID);
            setPendingRemoveId(null);
          }}
        >
          Look
        </button>
        <button
          ref={addButtonRef}
          type="button"
          className="btn btn-primary btn-sm"
          data-testid="add-section-button"
          aria-expanded={showAddMenu}
          aria-controls="add-section-menu"
          onClick={() => setShowAddMenu((open) => !open)}
        >
          Add section
        </button>
      </div>

      <div className="sections-list">
        <h2 className="list-heading">Sections ({sections.length})</h2>
        {sections.length === 0 ? (
          <div className="empty-state" data-testid="builder-empty">
            <p>No sections yet. Add one to start.</p>
          </div>
        ) : (
          <ul className="sections-container" data-testid="section-list">
            {sections.map((section, index) => {
              const definition = getSectionByType(section.type);
              const label = definition?.name || section.type;
              const removable = definition?.removable !== false;
              const isSelected = effectiveSelectedId === section.id;

              return (
                <li key={section.id}>
                  <div
                    className={`section-item ${!section.enabled ? 'is-hidden' : ''} ${isSelected ? 'selected' : ''}`}
                    data-testid={`section-row-${section.id}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleDropAt(index);
                    }}
                  >
                    <button
                      type="button"
                      className="section-drag-handle"
                      data-testid={`section-drag-${section.id}`}
                      draggable
                      aria-label={`Drag ${label}`}
                      aria-grabbed={draggedSection?.id === section.id}
                      onDragStart={(event) => handleDragStart(event, section)}
                      onDragEnd={handleDragEnd}
                    >
                      Move
                    </button>
                    <button
                      type="button"
                      className="section-select"
                      data-testid={`section-type-${section.type}`}
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedId(section.id);
                        setPendingRemoveId(null);
                      }}
                    >
                      <span className="section-type">{label}</span>
                      <span className="section-order">#{index + 1}</span>
                    </button>
                    <div className="section-controls">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        data-testid={`section-move-up-${section.id}`}
                        aria-label={`Move ${label} up`}
                        disabled={index === 0}
                        onClick={() => moveSection(section.id, -1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        data-testid={`section-move-down-${section.id}`}
                        aria-label={`Move ${label} down`}
                        disabled={index === sections.length - 1}
                        onClick={() => moveSection(section.id, 1)}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        data-testid={`section-toggle-${section.id}`}
                        aria-pressed={section.enabled !== false}
                        aria-label={section.enabled !== false ? `Hide ${label}` : `Show ${label}`}
                        onClick={() => handleToggleSection(section.id)}
                      >
                        {section.enabled !== false ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        data-testid={`section-remove-${section.id}`}
                        aria-label={`Remove ${label}`}
                        disabled={!removable}
                        onClick={() => removable && setPendingRemoveId(section.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div
          className="section-drop-end"
          data-testid="section-drop-end"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleDropAt(sections.length);
          }}
        />
      </div>

      {pendingRemoveId && (
        <div className="remove-confirm" data-testid="remove-confirm" role="alertdialog" aria-labelledby="remove-confirm-title">
          <p id="remove-confirm-title">Remove this section from the page?</p>
          <div className="remove-confirm-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              data-testid="remove-cancel"
              onClick={() => setPendingRemoveId(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              data-testid="remove-confirm-button"
              onClick={confirmRemove}
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {showAddMenu && (
        <div
          ref={addMenuRef}
          id="add-section-menu"
          className="add-section-menu"
          data-testid="add-section-menu"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-section-title"
        >
          <div className="menu-header">
            <h3 id="add-section-title">Add a section</h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              data-testid="add-section-close"
              aria-label="Close add section"
              onClick={() => {
                setShowAddMenu(false);
                addButtonRef.current?.focus();
              }}
            >
              Close
            </button>
          </div>
          <div className="category-filter">
            <label htmlFor="section-category-filter">Filter by</label>
            <select
              id="section-category-filter"
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          {availableSections.length > 0 && (
            <div className="available-sections">
              <h4>Available</h4>
              <div className="sections-grid">
                {availableSections.map((definition) => (
                  <button
                    key={definition.type}
                    type="button"
                    className="section-card"
                    data-testid={`add-type-${definition.type}`}
                    onClick={() => handleAddSection(definition.type)}
                  >
                    <span className="section-name">{definition.name}</span>
                    <span className="section-tier">{definition.requiredTier}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {lockedSections.length > 0 && (
            <div className="locked-sections">
              <h4>Upgrade to unlock</h4>
              <div className="sections-grid locked">
                {lockedSections.map((definition) => (
                  <button
                    key={definition.type}
                    type="button"
                    className="section-card locked"
                    data-testid={`locked-type-${definition.type}`}
                    disabled
                    aria-disabled="true"
                    title={`Requires ${definition.requiredTier}`}
                  >
                    <span className="section-name">{definition.name}</span>
                    <span className="required-tier">{definition.requiredTier}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {availableSections.length === 0 && lockedSections.length === 0 && (
            <p className="no-sections">No sections in this category</p>
          )}
        </div>
      )}

      <div className="builder-inspector" data-testid="builder-inspector" data-inspector={inspectorKind}>
        {renderInspector()}
      </div>
    </div>
  );
}

export default PageBuilder;
