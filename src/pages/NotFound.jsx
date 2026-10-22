import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import './NotFound.css';

function NotFound() {
  const navigate = useNavigate();
  // useAuth throws outside a provider; a missing context means logged out.
  const auth = useContext(AuthContext);
  const isAuthenticated = Boolean(auth?.isAuthenticated);

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
              Go Back
            </button>
            <Link to="/" className="btn btn-primary">
              Go Home
            </Link>
            <Link to="/showcase" className="btn btn-secondary">
              Gallery
            </Link>
          </div>

          <div className="helpful-links">
            <h2>Helpful Links</h2>
            <div className="links-grid">
              <Link to="/showcase" className="helpful-link">
                <span className="link-text">Gallery</span>
              </Link>
              {isAuthenticated && (
                <Link to="/dashboard" className="helpful-link">
                  <span className="link-text">Dashboard</span>
                </Link>
              )}
              {isAuthenticated && (
                <Link to="/setup" className="helpful-link">
                  <span className="link-text">Create New Site</span>
                </Link>
              )}
              {isAuthenticated && (
                <Link to="/orders" className="helpful-link">
                  <span className="link-text">View Orders</span>
                </Link>
              )}
              {isAuthenticated && (
                <Link to="/analytics" className="helpful-link">
                  <span className="link-text">Analytics</span>
                </Link>
              )}
              <Link to="/login" className="helpful-link">
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
