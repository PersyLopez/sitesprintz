import React from 'react';
import { Link } from 'react-router-dom';
import './WelcomeModal.css';

function WelcomeModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content welcome-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="welcome-icon">🎉</div>
        
        <h2>Welcome to SiteSprintz!</h2>
        <p className="welcome-subtitle">
          You're all set to create your first professional website
        </p>

        <div className="welcome-steps">
          <div className="welcome-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Choose a Template</h3>
              <p>Select from our collection of beautiful, responsive templates</p>
            </div>
          </div>

          <div className="welcome-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Customize Your Content</h3>
              <p>Add your business info, images, and customize colors</p>
            </div>
          </div>

          <div className="welcome-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Publish & Share</h3>
              <p>Launch your site and start reaching customers</p>
            </div>
          </div>
        </div>

        <div className="welcome-actions">
          <Link to="/setup" className="btn btn-primary btn-large">
            Create Your First Site →
          </Link>
          <button onClick={onClose} className="btn btn-secondary">
            I'll do this later
          </button>
        </div>

        <p className="welcome-tip">
          💡 <strong>Tip:</strong> Start with a template that matches your business type for the best results
        </p>
      </div>
    </div>
  );
}

export default WelcomeModal;

