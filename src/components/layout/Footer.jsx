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
            <Link to="/" className="logo" aria-label="SiteSprintz Home">
              <span className="logo-icon" aria-hidden="true">
                <svg className="logo-mark" viewBox="0 0 24 24" width="1em" height="1em" focusable="false">
                  <path
                    fill="currentColor"
                    d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.8 5.6 21.2 8 14 2 9.2h7.6L12 2z"
                  />
                </svg>
              </span>
              <span className="logo-text">SiteSprintz</span>
            </Link>
            <p className="footer-tagline">A simple page so tomorrow’s customer can find you</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-column">
              <p className="footer-heading">Product</p>
              <Link to="/#templates">Templates</Link>
              <Link to="/showcase">Gallery</Link>
              <Link to="/#pricing">Pricing</Link>
              <Link to="/#how-it-works">How It Works</Link>
            </div>
            
            <div className="footer-column">
              <p className="footer-heading">Company</p>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
            </div>
            
            <div className="footer-column">
              <p className="footer-heading">Account</p>
              <Link to="/register">Create Account</Link>
              <Link to="/login">Login</Link>
            </div>

            <div className="footer-column">
              <p className="footer-heading">Legal</p>
              <a href="/legal/terms">Terms of Service</a>
              <a href="/legal/privacy">Privacy Policy</a>
              <a href="/legal/cookies">Cookie Policy</a>
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
