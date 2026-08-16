import React, { useState, useEffect } from 'react';
import { useTips } from '../../hooks/useTips';
import './ContextualTip.css';

/**
 * ContextualTip - Shows a tip when triggered
 * 
 * @param {string} tipId - Unique tip identifier
 * @param {string|ReactNode} content - Tip content
 * @param {string} position - Position: 'top', 'bottom', 'left', 'right'
 * @param {boolean} showOnMount - Show immediately on mount
 */
function ContextualTip({ 
  tipId, 
  content, 
  position = 'top',
  showOnMount = false,
  children 
}) {
  const { showTip, dismissTip, activeTips } = useTips();
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (showOnMount) {
      showTip(tipId, content, { position });
    }
  }, [showOnMount, tipId, content, position, showTip]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    showTip(tipId, content, { position, autoHide: false });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    dismissTip(tipId);
  };

  const tip = activeTips[tipId];

  return (
    <div 
      className="contextual-tip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {tip && (
        <div 
          className={`contextual-tip contextual-tip-${tip.position}`}
          role="tooltip"
        >
          <div className="tip-content">{tip.content}</div>
          <button
            className="tip-dismiss"
            onClick={() => dismissTip(tipId, true)}
            aria-label="Dismiss tip"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default ContextualTip;

