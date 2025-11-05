import React, { useState } from 'react';
import './ColorPicker.css';

function ColorPicker({ label, value, onChange }) {
  const [showPicker, setShowPicker] = useState(false);

  const presetColors = [
    '#06b6d4', // Cyan
    '#0891b2', // Cyan dark
    '#22d3ee', // Cyan light
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#eab308', // Yellow
    '#84cc16', // Lime
    '#22c55e', // Green
    '#10b981', // Emerald
    '#14b8a6', // Teal
    '#6366f1', // Indigo
    '#a855f7', // Purple light
  ];

  const handlePresetClick = (color) => {
    onChange(color);
    setShowPicker(false);
  };

  return (
    <div className="color-picker">
      <label className="color-picker-label">{label}</label>
      
      <div className="color-picker-controls">
        <button
          type="button"
          className="color-preview"
          style={{ backgroundColor: value }}
          onClick={() => setShowPicker(!showPicker)}
          title={`Current color: ${value}`}
        >
          <span className="color-preview-text">{value}</span>
        </button>
        
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          pattern="^#[0-9A-Fa-f]{6}$"
          className="color-input"
        />
        
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="color-native"
          title="Pick a color"
        />
      </div>

      {showPicker && (
        <div className="color-picker-dropdown">
          <div className="color-presets">
            {presetColors.map((color) => (
              <button
                key={color}
                type="button"
                className={`color-preset ${value === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handlePresetClick(color)}
                title={color}
              >
                {value === color && <span className="check-mark">✓</span>}
              </button>
            ))}
          </div>
          
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-full"
            onClick={() => setShowPicker(false)}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

export default ColorPicker;

