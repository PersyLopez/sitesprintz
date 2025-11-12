import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Header.css';

function Header() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="site-header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">🚀</span>
          <span className="logo-text">SiteSprintz</span>
        </Link>
        
        <nav className="nav-menu">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/setup" className="nav-link">Create Site</Link>
              <button onClick={logout} className="btn btn-secondary">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;

