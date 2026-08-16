import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import PublicPageLayout from '../../../components/layout/PublicPageLayout';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableSectionList from './SortableSectionList';
import SectionContentEditor from './SectionContentEditor';
import TemplatePreview from './TemplatePreview';
import './TemplateEditor.css';

const SECTION_ICONS = {
  hero: '🎯',
  features: '✨',
  menu: '📋',
  about: '📖',
  packages: '📦',
  beforeAfter: '🔄',
  serviceAreas: '🗺️',
  testimonials: '💬',
  team: '👥',
  stats: '📊',
  credentials: '🏆',
  faq: '❓',
  contact: '📞',
  footer: '🦶',
  nav: '🧭',
  brand: '🏷️',
  gallery: '🖼️',
  process: '⚙️',
  industries: '🏢',
  'case-studies': '📁',
  'how-to-order': '🛒',
  reviews: '⭐',
  'contact-form': '📝',
  social: '🔗',
  'featured-services': '⭐',
  catalog: '📚',
  products: '🛍️',
  hours: '🕐',
  booking: '📅',
  'interactive-calculator': '🧮',
  'subscription-booking': '🔁',
  'class-scheduler': '📚',
};

const SECTION_LABELS = {
  hero: 'Hero',
  features: 'Features',
  menu: 'Menu / Services',
  about: 'About',
  packages: 'Packages',
  beforeAfter: 'Before & After',
  serviceAreas: 'Service Areas',
  testimonials: 'Testimonials',
  team: 'Team',
  stats: 'Statistics',
  credentials: 'Credentials',
  faq: 'FAQ',
  contact: 'Contact',
  footer: 'Footer',
  nav: 'Navigation',
  brand: 'Brand',
  gallery: 'Gallery',
  process: 'Process',
  industries: 'Industries',
  'case-studies': 'Case Studies',
  'how-to-order': 'How to Order',
  reviews: 'Reviews',
  'contact-form': 'Contact Form',
  social: 'Social Links',
  'featured-services': 'Featured Services',
  catalog: 'Catalog',
  products: 'Products',
  hours: 'Hours',
  booking: 'Booking',
  'interactive-calculator': 'Interactive Calculator',
  'subscription-booking': 'Subscription Booking',
  'class-scheduler': 'Class Scheduler',
};

export default function TemplateEditor() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { templateId } = useParams();
  const [template, setTemplate] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [deviceMode, setDeviceMode] = useState('desktop');
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadTemplate = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/templates/${templateId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load template');
      const data = await response.json();
      setTemplate(data);
      setSelectedSectionId(data.sections?.[0]?.id || null);
    } catch (err) {
      console.error(err);
      setSaveError(err.message);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setTemplate(prev => {
        if (!prev) return prev;
        const oldIndex = prev.sections.findIndex(s => s.id === active.id);
        const newIndex = prev.sections.findIndex(s => s.id === over.id);
        const newSections = arrayMove(prev.sections, oldIndex, newIndex);
        // Update order property
        newSections.forEach((s, i) => s.order = i);
        setUnsavedChanges(true);
        return { ...prev, sections: newSections };
      });
    }
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          version: template.version,
          name: template.name,
          slug: template.slug,
          industry: template.industry,
          description: template.description,
          layout_key: template.layout_key,
          character: template.character,
          sections: template.sections,
          metadata: template.metadata,
          status: template.status,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Save failed');
      }
      const updated = await response.json();
      setTemplate(updated);
      setUnsavedChanges(false);
      setPreviewKey(k => k + 1); // Force preview refresh
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSectionContentChange = (sectionId, newContent) => {
    setTemplate(prev => {
      if (!prev) return prev;
      const newSections = prev.sections.map(s => 
        s.id === sectionId ? { ...s, content: newContent } : s
      );
      setUnsavedChanges(true);
      return { ...prev, sections: newSections };
    });
  };

  const handleSectionToggle = (sectionId) => {
    setTemplate(prev => {
      if (!prev) return prev;
      const newSections = prev.sections.map(s => 
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      );
      setUnsavedChanges(true);
      return { ...prev, sections: newSections };
    });
  };

  const handleAddSection = (type) => {
    setTemplate(prev => {
      if (!prev) return prev;
      const newSection = {
        id: `${type}-${Date.now()}`,
        type,
        content: getDefaultContent(type),
        enabled: true,
        order: prev.sections.length,
      };
      setUnsavedChanges(true);
      return { ...prev, sections: [...prev.sections, newSection] };
    });
  };

  const handleRemoveSection = (sectionId) => {
    setTemplate(prev => {
      if (!prev) return prev;
      const newSections = prev.sections.filter(s => s.id !== sectionId).map((s, i) => ({ ...s, order: i }));
      setUnsavedChanges(true);
      return { ...prev, sections: newSections };
    });
  };

  const handleNameChange = (e) => {
    setTemplate(prev => {
      if (!prev) return prev;
      setUnsavedChanges(true);
      return { ...prev, name: e.target.value };
    });
  };

  const handleBack = () => {
    if (unsavedChanges && !window.confirm('You have unsaved changes. Leave anyway?')) return;
    navigate('/admin/templates');
  };

  if (!isAuthenticated) {
    return <PublicPageLayout>Access denied. Admin only.</PublicPageLayout>;
  }

  if (loading) {
    return (
      <PublicPageLayout className="template-editor-page">
        <div className="editor-loading">Loading template...</div>
      </PublicPageLayout>
    );
  }

  if (!template) {
    return (
      <PublicPageLayout className="template-editor-page">
        <div className="editor-error">Template not found</div>
      </PublicPageLayout>
    );
  }

  const selectedSection = template.sections?.find(s => s.id === selectedSectionId);

  return (
    <PublicPageLayout className="template-editor-page" data-testid="template-editor">
      <div className="editor-header">
        <button className="editor-back-btn" onClick={handleBack}>
          ← Back to Templates
        </button>
        <div className="editor-title-area">
          <input
            type="text"
            value={template.name}
            onChange={handleNameChange}
            className="editor-name-input"
            placeholder="Template name"
          />
          <span className="editor-version">v{template.version}</span>
          <span className={`editor-status-badge status-${template.status}`}>{template.status}</span>
        </div>
        <div className="editor-header-actions">
          <button className="editor-btn editor-btn--secondary" onClick={() => setPreviewKey(k => k + 1)}>
            Refresh Preview
          </button>
          <button 
            className="editor-btn editor-btn--primary"
            onClick={handleSave}
            disabled={saving || !unsavedChanges}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="editor-error-banner">{saveError}</div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={template.sections?.map(s => s.id) || []} strategy={verticalListSortingStrategy}>
          <div className="editor-layout">
            {/* Left Panel - Section List */}
            <aside className="editor-sidebar editor-sidebar--left">
              <div className="editor-sidebar-header">
                <h3>Sections ({template.sections?.length || 0})</h3>
                <button className="editor-add-section-btn" onClick={() => handleAddSection('features')}>
                  + Add Section
                </button>
              </div>
              <SortableSectionList
                sections={template.sections || []}
                selectedSectionId={selectedSectionId}
                onSelect={setSelectedSectionId}
                onToggle={handleSectionToggle}
                onRemove={handleRemoveSection}
                sectionIcons={SECTION_ICONS}
                sectionLabels={SECTION_LABELS}
              />
            </aside>

            {/* Center Panel - Preview */}
            <main className="editor-preview-area" style={{ '--device-mode': deviceMode }}>
              <div className="editor-preview-header">
                <h3>Live Preview</h3>
                <div className="editor-device-toggle">
                  <button 
                    className={deviceMode === 'desktop' ? 'active' : ''}
                    onClick={() => setDeviceMode('desktop')}
                    title="Desktop"
                  >🖥️</button>
                  <button 
                    className={deviceMode === 'tablet' ? 'active' : ''}
                    onClick={() => setDeviceMode('tablet')}
                    title="Tablet"
                  >📱</button>
                  <button 
                    className={deviceMode === 'mobile' ? 'active' : ''}
                    onClick={() => setDeviceMode('mobile')}
                    title="Mobile"
                  >📱</button>
                </div>
              </div>
              <TemplatePreview
                key={previewKey}
                template={template}
                selectedSectionId={selectedSectionId}
                deviceMode={deviceMode}
              />
            </main>

            {/* Right Panel - Content Editor */}
            <aside className="editor-sidebar editor-sidebar--right">
              <SectionContentEditor
                section={selectedSection}
                onChange={handleSectionContentChange}
                sectionIcons={SECTION_ICONS}
                sectionLabels={SECTION_LABELS}
              />
            </aside>
          </div>
        </SortableContext>
      </DndContext>
    </PublicPageLayout>
  );
}

function getDefaultContent(type) {
  const defaults = {
    hero: { title: 'Your Business', subtitle: 'Professional services', ctaText: 'Get Started', ctaLink: '#contact' },
    features: { items: [{ title: 'Feature 1', description: 'Description' }] },
    menu: { categories: [{ name: 'Services', items: [] }] },
    about: { title: 'About Us', content: 'Our story...' },
    testimonials: { items: [{ quote: 'Great!', author: 'Client' }] },
    team: { members: [{ name: 'Name', role: 'Role', bio: 'Bio' }] },
    stats: { items: [{ label: 'Clients', value: '100+' }] },
    process: { steps: [{ title: 'Step 1', description: 'Description' }] },
    contact: { phone: '', email: '', address: '' },
    faq: { items: [{ question: 'Q?', answer: 'A.' }] },
    gallery: { images: [] },
    'interactive-calculator': {},
    'subscription-booking': {},
    'class-scheduler': {},
  };
  return defaults[type] || {};
}