import React, { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import './FeedbackWidget.css';

/**
 * FeedbackWidget - Floating feedback button and modal
 */
function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('bug'); // 'bug', 'feature', 'question'
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      showError('Please enter your feedback');
      return;
    }

    setSubmitting(true);
    try {
      // In a real app, this would send to your backend
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
        setIsOpen(false);
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      showError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        className="feedback-button"
        onClick={() => setIsOpen(true)}
        aria-label="Send feedback"
        title="Send feedback"
      >
        💬
      </button>

      {isOpen && (
        <div className="feedback-overlay" onClick={() => setIsOpen(false)}>
          <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-header">
              <h3>Send Feedback</h3>
              <button
                className="feedback-close"
                onClick={() => setIsOpen(false)}
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
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !message.trim()}
                >
                  {submitting ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackWidget;



