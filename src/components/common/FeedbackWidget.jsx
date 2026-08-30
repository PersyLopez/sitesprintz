import React, { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { PLATFORM_SUPPORT_EMAIL } from '../../config/pricing.config';
import './FeedbackWidget.css';

/**
 * FeedbackWidget - Modal feedback form; optional FAB when hideFab is false.
 */
function FeedbackWidget({ hideFab = false, open: controlledOpen, onClose }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const [feedbackType, setFeedbackType] = useState('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  const closeModal = () => {
    if (isControlled) {
      onClose?.();
    } else {
      setInternalOpen(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      showError('Please enter your feedback');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: feedbackType,
          message,
          email: email || undefined,
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });

      if (response.ok) {
        showSuccess('Thank you for your feedback!');
        setMessage('');
        setEmail('');
        closeModal();
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch {
      showError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {!hideFab && (
        <button
          className="feedback-button"
          onClick={() => setInternalOpen(true)}
          aria-label="Send feedback"
          title="Send feedback"
        >
          💬
        </button>
      )}

      {isOpen && (
        <div className="feedback-overlay" onClick={closeModal}>
          <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-header">
              <h3>Send Feedback</h3>
              <button
                className="feedback-close"
                onClick={closeModal}
                aria-label="Close feedback"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="feedback-form">
              <div className="feedback-type-selector">
                <label>
                  <input
                    type="radio"
                    value="bug"
                    checked={feedbackType === 'bug'}
                    onChange={(e) => setFeedbackType(e.target.value)}
                  />
                  🐛 Bug Report
                </label>
                <label>
                  <input
                    type="radio"
                    value="feature"
                    checked={feedbackType === 'feature'}
                    onChange={(e) => setFeedbackType(e.target.value)}
                  />
                  💡 Feature Request
                </label>
                <label>
                  <input
                    type="radio"
                    value="question"
                    checked={feedbackType === 'question'}
                    onChange={(e) => setFeedbackType(e.target.value)}
                  />
                  ❓ Question
                </label>
              </div>

              <div className="form-group">
                <label htmlFor="feedback-message">
                  {feedbackType === 'bug' && 'Describe the bug:'}
                  {feedbackType === 'feature' && 'Describe your feature idea:'}
                  {feedbackType === 'question' && 'What\'s your question?'}
                </label>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  required
                  placeholder="Tell us more..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="feedback-email">Email (optional)</label>
                <input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>

              <div className="feedback-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !message.trim()}
                  data-testid="feedback-submit"
                >
                  {submitting ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
              <p className="feedback-mailto">
                Or write{' '}
                <a href={`mailto:${PLATFORM_SUPPORT_EMAIL}`}>{PLATFORM_SUPPORT_EMAIL}</a>
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackWidget;
