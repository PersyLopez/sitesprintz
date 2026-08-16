import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './TemplateEditor.css';

function SectionItem({ 
  section, 
  isSelected, 
  onSelect, 
  onToggle, 
  onRemove,
  sectionIcons,
  sectionLabels,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const icon = sectionIcons[section.type] || '📄';
  const label = sectionLabels[section.type] || section.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`editor-section-item ${isSelected ? 'selected' : ''} ${!section.enabled ? 'disabled' : ''} ${isDragging ? 'dragging' : ''}`}
      data-testid={`section-item-${section.id}`}
    >
      <div className="section-item-drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>
      
      <div className="section-item-info" onClick={() => onSelect(section.id)}>
        <span className="section-item-icon">{icon}</span>
        <span className="section-item-label">{label}</span>
        {section.type.startsWith('interactive-') || section.type.startsWith('subscription-') || section.type.startsWith('class-') ? (
          <span className="section-item-badge">Booking</span>
        ) : null}
      </div>
      
      <div className="section-item-actions">
        <button
          className="section-item-toggle"
          onClick={(e) => { e.stopPropagation(); onToggle(section.id); }}
          title={section.enabled ? 'Disable section' : 'Enable section'}
          data-testid={`toggle-${section.id}`}
        >
          {section.enabled ? '👁️' : '🙈'}
        </button>
        <button
          className="section-item-remove"
          onClick={(e) => { e.stopPropagation(); onRemove(section.id); }}
          title="Remove section"
          data-testid={`remove-${section.id}`}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

export default function SortableSectionList({ 
  sections, 
  selectedSectionId, 
  onSelect, 
  onToggle, 
  onRemove,
  sectionIcons,
  sectionLabels,
}) {
  return (
    <div className="editor-section-list" data-testid="sortable-section-list">
      {sections.length === 0 ? (
        <div className="editor-empty-sections">
          No sections yet. Click &ldquo;Add Section&rdquo; to start building.
        </div>
      ) : (
        sections.map((section) => (
          <SectionItem
            key={section.id}
            section={section}
            isSelected={selectedSectionId === section.id}
            onSelect={onSelect}
            onToggle={onToggle}
            onRemove={onRemove}
            sectionIcons={sectionIcons}
            sectionLabels={sectionLabels}
          />
        ))
      )}
    </div>
  );
}