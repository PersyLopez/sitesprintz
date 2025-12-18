import React from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../common/Modal';
import './WelcomeModal.css';

function WelcomeModal({ onClose }) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Welcome to SiteSprintz!"
      className="welcome-modal"
      ariaDescribedBy="welcome-description"
    >
        <div className="welcome-icon" aria-hidden="true">🎉</div>
        
        <p id="welcome-description" className="welcome-subtitle">
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
          <Link 
            to="/setup" 
            className="btn btn-primary btn-large"
            onClick={onClose}
            aria-label="Go to setup page to create your first site"
          >
            Create Your First Site →
          </Link>
          <button 
            onClick={onClose} 
            className="btn btn-secondary"
            aria-label="Close welcome modal and do this later"
          >
            I'll do this later
          </button>
        </div>

        <p className="welcome-tip">
          <span aria-hidden="true">💡</span> <strong>Tip:</strong> Start with a template that matches your business type for the best results
        </p>
    </Modal>
  );
}

export default WelcomeModal;

