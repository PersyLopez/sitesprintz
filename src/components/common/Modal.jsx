/**
 * Accessible Modal Component with Focus Management
 * 
 * Features:
 * - WCAG 2.2 AA compliant
 * - Focus trapping
 * - Keyboard navigation (Escape to close)
 * - Focus restoration on close
 * - ARIA attributes
 * - Backdrop click to close
 */

import React, { useEffect, useRef } from 'react';
import './Modal.css';

export function Modal({ 
  isOpen, 
  onClose, 
  title,
  children,
  className = '',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  ariaLabelledBy,
  ariaDescribedBy
}) {
  const modalRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save currently focused element
    previouslyFocusedRef.current = document.activeElement;

    // Focus first interactive element in modal
    const firstFocusable = modalRef.current?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    // Small delay to ensure modal is rendered
    setTimeout(() => {
      firstFocusable?.focus();
    }, 100);

    // Handle Escape key
    const handleEscape = (e) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    };

    // Handle Tab key for focus trapping
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        lastElement?.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleEscape);
    modalRef.current?.addEventListener('keydown', handleKeyDown);

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    // Cleanup: Restore focus and remove listeners
    return () => {
      document.removeEventListener('keydown', handleEscape);
      modalRef.current?.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      
      // Restore focus to previously focused element
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  const modalId = ariaLabelledBy || (title ? `modal-title-${Date.now()}` : undefined);
  const describedById = ariaDescribedBy;

  return (
    <div 
      className="modal-overlay"
      onClick={closeOnBackdropClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalId}
      aria-describedby={describedById}
    >
      <div 
        ref={modalRef}
        className={`modal-content ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id={modalId} className="modal-title">
            {title}
          </h2>
        )}
        
        <button 
          className="modal-close"
          onClick={onClose}
          aria-label="Close dialog"
          type="button"
        >
          ×
        </button>
        
        {children}
      </div>
    </div>
  );
}

export default Modal;

