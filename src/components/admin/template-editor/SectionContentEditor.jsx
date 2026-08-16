import { useState, useMemo } from 'react';
import './TemplateEditor.css';

function JsonPreview({ content }) {
  const json = useMemo(() => JSON.stringify(content, null, 2), [content]);
  return (
    <div className="editor-json-preview" data-testid="json-preview">
      {json}
    </div>
  );
}

function Field({ field, value, onChange, required }) {
  const isRequired = required || field.required;
  
  switch (field.type) {
    case 'textarea':
      return (
        <div className="editor-field">
          <label>
            {field.label}
            {isRequired && <span className="required"> *</span>}
          </label>
          <textarea
            className="editor-textarea"
            value={value || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      );
      
    case 'email':
      return (
        <div className="editor-field">
          <label>
            {field.label}
            {isRequired && <span className="required"> *</span>}
          </label>
          <input
            type="email"
            className="editor-input"
            value={value || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      );
      
    case 'number':
      return (
        <div className="editor-field">
          <label>
            {field.label}
            {isRequired && <span className="required"> *</span>}
          </label>
          <input
            type="number"
            className="editor-input"
            value={value || ''}
            onChange={(e) => onChange(field.key, e.target.value ? parseFloat(e.target.value) : '')}
            min={field.min}
            max={field.max}
            placeholder={field.placeholder}
          />
        </div>
      );
      
    case 'select':
      return (
        <div className="editor-field">
          <label>
            {field.label}
            {isRequired && <span className="required"> *</span>}
          </label>
          <select
            className="editor-select"
            value={value || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
          >
            <option value="">Select...</option>
            {field.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
      
    case 'boolean':
      return (
        <div className="editor-field">
          <label className="editor-checkbox-label">
            <input
              type="checkbox"
              className="editor-checkbox"
              checked={value === true}
              onChange={(e) => onChange(field.key, e.target.checked)}
            />
            {field.label}
          </label>
        </div>
      );
      
    default: // text
      return (
        <div className="editor-field">
          <label>
            {field.label}
            {isRequired && <span className="required"> *</span>}
          </label>
          <input
            type="text"
            className="editor-input"
            value={value || ''}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        </div>
      );
  }
}

function ArrayField({ field, value, onChange, sectionId: _sectionId }) {
  const items = value || [];
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="editor-field editor-field--array">
      <div className="editor-field-label">
        <label>{field.label} ({items.length})</label>
        <button 
          type="button"
          className="editor-btn editor-btn--small"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      <button
        type="button"
        className="editor-btn editor-btn--primary editor-btn--small"
        onClick={() => onChange(field.key, [...items, {}])}
        style={{ marginBottom: '12px' }}
      >
        + Add Item
      </button>
      
      {expanded && (
        <div className="editor-array-items">
          {items.map((item, index) => (
            <div key={index} className="editor-array-item">
              <div className="editor-array-item-header">
                <span>Item {index + 1}</span>
                <button
                  type="button"
                  className="editor-btn editor-btn--small editor-btn--danger"
                  onClick={() => {
                    const newItems = items.filter((_, i) => i !== index);
                    onChange(field.key, newItems);
                  }}
                >
                  Remove
                </button>
              </div>
              {field.itemFields.map(itemField => (
                <Field
                  key={`${index}-${itemField.key}`}
                  field={itemField}
                  value={item[itemField.key]}
                  onChange={(val) => {
                    const newItems = [...items];
                    if (!newItems[index]) newItems[index] = {};
                    newItems[index] = { ...newItems[index], [itemField.key]: val };
                    onChange(field.key, newItems);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SectionContentEditor({ section, onChange, sectionIcons, sectionLabels }) {
  const [showJson, setShowJson] = useState(false);
  
  if (!section) {
    return (
      <div className="editor-content-editor empty" data-testid="section-content-editor">
        <div className="editor-empty-state">
          <span className="editor-empty-icon">👈</span>
          <p>Select a section from the list to edit its content</p>
        </div>
      </div>
    );
  }

  const icon = sectionIcons[section.type] || '📄';
  const label = sectionLabels[section.type] || section.type;
  const content = section.content || {};
  
  // Get field definitions for this section type
  const fields = getFieldsForSectionType(section.type);

  const handleChange = (key, value) => {
    onChange(section.id, { ...content, [key]: value });
  };

  if (showJson || fields.length === 0) {
    return (
      <div className="editor-content-editor" data-testid="section-content-editor">
        <div className="editor-content-header">
          <div className="editor-content-title">
            <span className="editor-content-icon">{icon}</span>
            <span>{label}</span>
          </div>
          <div className="editor-content-actions">
            <button
              type="button"
              className="editor-btn editor-btn--small"
              onClick={() => setShowJson(!showJson)}
            >
              {showJson ? 'Form View' : 'JSON View'}
            </button>
          </div>
        </div>
        <div className="editor-json-hint">
          {showJson ? 'Editing raw JSON. Be careful!' : 'No form fields defined for this section type.'}
        </div>
        <JsonPreview content={content} />
      </div>
    );
  }

  return (
    <div className="editor-content-editor" data-testid="section-content-editor">
      <div className="editor-content-header">
        <div className="editor-content-title">
          <span className="editor-content-icon">{icon}</span>
          <span>{label}</span>
        </div>
        <div className="editor-content-actions">
          <button
            type="button"
            className="editor-btn editor-btn--small"
            onClick={() => setShowJson(true)}
          >
            JSON View
          </button>
        </div>
      </div>
      
      <div className="editor-fields">
        {fields.map(field => {
          if (field.type === 'array') {
            return (
              <ArrayField
                key={field.key}
                field={field}
                value={content[field.key]}
                onChange={handleChange}
                sectionId={section.id}
              />
            );
          }
          return (
            <Field
              key={field.key}
              field={field}
              value={content[field.key]}
              onChange={handleChange}
              required={field.required}
            />
          );
        })}
      </div>
    </div>
  );
}

// Section type field definitions
const SECTION_FIELD_DEFINITIONS = {
  hero: [
    { key: 'title', label: 'Headline', type: 'text', required: true },
    { key: 'subtitle', label: 'Subheadline', type: 'textarea' },
    { key: 'ctaText', label: 'CTA Text', type: 'text' },
    { key: 'ctaLink', label: 'CTA Link', type: 'text' },
    { key: 'eyebrow', label: 'Eyebrow Text', type: 'text' },
    { key: 'backgroundImage', label: 'Background Image URL', type: 'text' },
  ],
  features: [
    { key: 'items', label: 'Feature Items', type: 'array', itemFields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'icon', label: 'Icon (emoji)', type: 'text' },
    ]},
  ],
  menu: [
    { key: 'categories', label: 'Menu Categories', type: 'array', itemFields: [
      { key: 'name', label: 'Category Name', type: 'text', required: true },
      { key: 'items', label: 'Items', type: 'array', itemFields: [
        { key: 'name', label: 'Item Name', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'price', label: 'Price', type: 'text' },
      ]},
    ]},
  ],
  about: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'content', label: 'Content', type: 'textarea' },
    { key: 'image', label: 'Image URL', type: 'text' },
  ],
  testimonials: [
    { key: 'items', label: 'Testimonials', type: 'array', itemFields: [
      { key: 'quote', label: 'Quote', type: 'textarea', required: true },
      { key: 'author', label: 'Author', type: 'text' },
      { key: 'role', label: 'Role/Company', type: 'text' },
      { key: 'image', label: 'Image URL', type: 'text' },
    ]},
  ],
  team: [
    { key: 'members', label: 'Team Members', type: 'array', itemFields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'text' },
      { key: 'bio', label: 'Bio', type: 'textarea' },
      { key: 'image', label: 'Image URL', type: 'text' },
    ]},
  ],
  stats: [
    { key: 'items', label: 'Stat Items', type: 'array', itemFields: [
      { key: 'label', label: 'Label', type: 'text', required: true },
      { key: 'value', label: 'Value', type: 'text', required: true },
      { key: 'icon', label: 'Icon (emoji)', type: 'text' },
    ]},
  ],
  process: [
    { key: 'steps', label: 'Process Steps', type: 'array', itemFields: [
      { key: 'title', label: 'Step Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'icon', label: 'Icon (emoji)', type: 'text' },
    ]},
  ],
  contact: [
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'hours', label: 'Hours', type: 'textarea' },
  ],
  faq: [
    { key: 'items', label: 'FAQ Items', type: 'array', itemFields: [
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'textarea', required: true },
    ]},
  ],
  gallery: [
    { key: 'images', label: 'Images', type: 'array', itemFields: [
      { key: 'url', label: 'Image URL', type: 'text', required: true },
      { key: 'alt', label: 'Alt Text', type: 'text' },
      { key: 'caption', label: 'Caption', type: 'text' },
    ]},
  ],
  packages: [
    { key: 'items', label: 'Packages', type: 'array', itemFields: [
      { key: 'name', label: 'Package Name', type: 'text', required: true },
      { key: 'price', label: 'Price', type: 'text' },
      { key: 'features', label: 'Features', type: 'array', itemFields: [
        { key: 'text', label: 'Feature', type: 'text' },
      ]},
      { key: 'ctaText', label: 'CTA Text', type: 'text' },
      { key: 'ctaLink', label: 'CTA Link', type: 'text' },
      { key: 'popular', label: 'Popular?', type: 'boolean' },
    ]},
  ],
  beforeAfter: [
    { key: 'items', label: 'Before/After Items', type: 'array', itemFields: [
      { key: 'beforeImage', label: 'Before Image URL', type: 'text', required: true },
      { key: 'afterImage', label: 'After Image URL', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
    ]},
  ],
  serviceAreas: [
    { key: 'areas', label: 'Service Areas', type: 'array', itemFields: [
      { key: 'name', label: 'Area Name', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'text' },
    ]},
  ],
  catalog: [
    { key: 'items', label: 'Catalog Items', type: 'array', itemFields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'price', label: 'Price', type: 'text' },
      { key: 'image', label: 'Image URL', type: 'text' },
    ]},
  ],
  products: [
    { key: 'items', label: 'Products', type: 'array', itemFields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'price', label: 'Price', type: 'text' },
      { key: 'image', label: 'Image URL', type: 'text' },
    ]},
  ],
  hours: [
    { key: 'schedule', label: 'Weekly Schedule', type: 'array', itemFields: [
      { key: 'day', label: 'Day', type: 'text', required: true },
      { key: 'hours', label: 'Hours', type: 'text' },
      { key: 'closed', label: 'Closed?', type: 'boolean' },
    ]},
  ],
  booking: [
    { key: 'enabled', label: 'Booking Enabled', type: 'boolean' },
    { key: 'calendarUrl', label: 'Calendar URL', type: 'text' },
  ],
  'interactive-calculator': [
    { key: 'enabled', label: 'Enabled', type: 'boolean' },
    { key: 'fields', label: 'Calculator Fields', type: 'array', itemFields: [
      { key: 'name', label: 'Field Name', type: 'text', required: true },
      { key: 'label', label: 'Display Label', type: 'text' },
      { key: 'type', label: 'Field Type', type: 'select', options: ['number', 'select', 'checkbox'] },
    ]},
  ],
  'subscription-booking': [
    { key: 'enabled', label: 'Enabled', type: 'boolean' },
    { key: 'plans', label: 'Subscription Plans', type: 'array', itemFields: [
      { key: 'name', label: 'Plan Name', type: 'text', required: true },
      { key: 'price', label: 'Price', type: 'text' },
      { key: 'interval', label: 'Billing Interval', type: 'select', options: ['month', 'year'] },
      { key: 'features', label: 'Features', type: 'array', itemFields: [
        { key: 'text', label: 'Feature', type: 'text' },
      ]},
    ]},
  ],
  'class-scheduler': [
    { key: 'enabled', label: 'Enabled', type: 'boolean' },
    { key: 'classes', label: 'Classes', type: 'array', itemFields: [
      { key: 'title', label: 'Class Title', type: 'text', required: true },
      { key: 'instructor', label: 'Instructor', type: 'text' },
      { key: 'schedule', label: 'Schedule', type: 'text' },
      { key: 'capacity', label: 'Capacity', type: 'number' },
      { key: 'price', label: 'Price', type: 'text' },
    ]},
  ],
  contactForm: [
    { key: 'fields', label: 'Form Fields', type: 'array', itemFields: [
      { key: 'name', label: 'Field Name', type: 'text', required: true },
      { key: 'type', label: 'Field Type', type: 'select', options: ['text', 'email', 'tel', 'textarea', 'select'] },
      { key: 'required', label: 'Required', type: 'boolean' },
      { key: 'label', label: 'Display Label', type: 'text' },
    ]},
  ],
  social: [
    { key: 'links', label: 'Social Links', type: 'array', itemFields: [
      { key: 'platform', label: 'Platform', type: 'select', options: ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'] },
      { key: 'url', label: 'URL', type: 'text' },
    ]},
  ],
  'featured-services': [
    { key: 'items', label: 'Featured Services', type: 'array', itemFields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'icon', label: 'Icon (emoji)', type: 'text' },
      { key: 'link', label: 'Link', type: 'text' },
    ]},
  ],
  industries: [
    { key: 'items', label: 'Industries', type: 'array', itemFields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'icon', label: 'Icon (emoji)', type: 'text' },
    ]},
  ],
  'case-studies': [
    { key: 'items', label: 'Case Studies', type: 'array', itemFields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'results', label: 'Results', type: 'text' },
      { key: 'image', label: 'Image URL', type: 'text' },
    ]},
  ],
  'how-to-order': [
    { key: 'steps', label: 'Steps', type: 'array', itemFields: [
      { key: 'title', label: 'Step Title', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
    ]},
  ],
  reviews: [
    { key: 'items', label: 'Reviews', type: 'array', itemFields: [
      { key: 'rating', label: 'Rating (1-5)', type: 'number', min: 1, max: 5 },
      { key: 'comment', label: 'Comment', type: 'textarea' },
      { key: 'author', label: 'Author', type: 'text' },
    ]},
  ],
  credentials: [
    { key: 'items', label: 'Credentials', type: 'array', itemFields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'issuer', label: 'Issuer', type: 'text' },
      { key: 'year', label: 'Year', type: 'text' },
    ]},
  ],
  footer: [
    { key: 'copyright', label: 'Copyright Text', type: 'text' },
    { key: 'links', label: 'Footer Links', type: 'array', itemFields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'url', label: 'URL', type: 'text' },
    ]},
  ],
  nav: [
    { key: 'items', label: 'Navigation Items', type: 'array', itemFields: [
      { key: 'label', label: 'Label', type: 'text', required: true },
      { key: 'href', label: 'Href', type: 'text' },
    ]},
  ],
  brand: [
    { key: 'name', label: 'Brand Name', type: 'text', required: true },
    { key: 'tagline', label: 'Tagline', type: 'text' },
    { key: 'logo', label: 'Logo URL', type: 'text' },
  ],
};

function getFieldsForSectionType(type) {
  return SECTION_FIELD_DEFINITIONS[type] || [];
}