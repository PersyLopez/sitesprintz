import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">
              <span className="logo-icon">🚀</span>
              <span className="logo-text">SiteSprintz</span>
            </div>
            <p className="footer-tagline">Create beautiful websites in minutes</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <Link to="/">Features</Link>
              <Link to="/">Pricing</Link>
              <Link to="/">Templates</Link>
            </div>
            
            <div className="footer-column">
              <h4>Company</h4>
              <Link to="/">About</Link>
              <Link to="/">Contact</Link>
              <Link to="/">Blog</Link>
            </div>
            
            <div className="footer-column">
              <h4>Legal</h4>
              <Link to="/">Privacy</Link>
              <Link to="/">Terms</Link>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {currentYear} SiteSprintz. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

