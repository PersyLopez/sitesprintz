import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import './NotFound.css';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <Header />
      
      <main className="not-found-container">
        <div className="not-found-content">
          <div className="not-found-animation">
            <div className="number-404">
              <span className="digit">4</span>
              <span className="digit bounce">0</span>
              <span className="digit">4</span>
            </div>
          </div>
          
          <h1>Page Not Found</h1>
          <p>
            Oops! The page you're looking for seems to have wandered off.
            It might have been moved, deleted, or maybe it never existed.
          </p>
          
          <div className="not-found-actions">
            <button 
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
            >
              ← Go Back
            </button>
            <Link to="/" className="btn btn-primary">
              🏠 Go Home
            </Link>
            <Link to="/dashboard" className="btn btn-secondary">
              📊 Dashboard
            </Link>
          </div>
          
          <div className="helpful-links">
            <h3>Helpful Links</h3>
            <div className="links-grid">
              <Link to="/setup" className="helpful-link">
                <span className="link-icon">✨</span>
                <span className="link-text">Create New Site</span>
              </Link>
              <Link to="/orders" className="helpful-link">
                <span className="link-icon">📦</span>
                <span className="link-text">View Orders</span>
              </Link>
              <Link to="/analytics" className="helpful-link">
                <span className="link-icon">📊</span>
                <span className="link-text">Analytics</span>
              </Link>
              <Link to="/login" className="helpful-link">
                <span className="link-icon">🔐</span>
                <span className="link-text">Login</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default NotFound;
