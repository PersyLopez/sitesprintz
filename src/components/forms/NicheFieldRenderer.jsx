/**
 * NicheFieldRenderer Component
 * 
 * Dynamically renders niche-specific form fields based on field definitions
 * from the template service.
 */

import React from 'react';

export default function NicheFieldRenderer({ fields, formData, updateField }) {
  if (!fields || fields.length === 0) {
    return null;
  }

  const renderField = (field) => {
    const fieldId = `niche-${field.name}`;
    const value = formData[field.name] || '';
    const isRequired = field.required !== false;

    switch (field.type) {
      case 'select':
        return (
          <div key={field.name} className="form-group">
            <label htmlFor={fieldId}>
              {field.label}
              {isRequired && <span className="required">*</span>}
            </label>
            <select
              id={fieldId}
              name={field.name}
              value={value}
              onChange={(e) => updateField(field.name, e.target.value)}
              required={isRequired}
            >
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.note && <small className="field-note">{field.note}</small>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="form-group">
            <label htmlFor={fieldId}>
              {field.label}
              {isRequired && <span className="required">*</span>}
            </label>
            <textarea
              id={fieldId}
              name={field.name}
              value={value}
              onChange={(e) => updateField(field.name, e.target.value)}
              required={isRequired}
              placeholder={field.placeholder}
              rows={field.rows || 4}
            />
            {field.note && <small className="field-note">{field.note}</small>}
          </div>
        );

      case 'number':
        return (
          <div key={field.name} className="form-group">
            <label htmlFor={fieldId}>
              {field.label}
              {isRequired && <span className="required">*</span>}
            </label>
            <input
              type="number"
              id={fieldId}
              name={field.name}
              value={value}
              onChange={(e) => updateField(field.name, e.target.value)}
              required={isRequired}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              step={field.step || 1}
            />
            {field.note && <small className="field-note">{field.note}</small>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                id={fieldId}
                name={field.name}
                checked={Boolean(value)}
                onChange={(e) => updateField(field.name, e.target.checked)}
              />
              <span>{field.label}</span>
            </label>
            {field.note && <small className="field-note">{field.note}</small>}
          </div>
        );

      case 'file':
        return (
          <div key={field.name} className="form-group">
            <label htmlFor={fieldId}>
              {field.label}
              {isRequired && <span className="required">*</span>}
            </label>
            <input
              type="file"
              id={fieldId}
              name={field.name}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  // For now, just store filename. In production, upload to storage first.
                  updateField(field.name, file.name);
                }
              }}
              accept={field.accept}
              required={isRequired}
            />
            {field.note && <small className="field-note">{field.note}</small>}
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.name} className="form-group">
            <label htmlFor={fieldId}>
              {field.label}
              {isRequired && <span className="required">*</span>}
            </label>
            <input
              type="text"
              id={fieldId}
              name={field.name}
              value={value}
              onChange={(e) => updateField(field.name, e.target.value)}
              required={isRequired}
              placeholder={field.placeholder}
            />
            {field.note && <small className="field-note">{field.note}</small>}
          </div>
        );
    }
  };

  return (
    <div className="niche-fields">
      {fields.map(renderField)}
    </div>
  );
}




