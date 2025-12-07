import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Header.css';

function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  return (
    <header className={`site-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        <Link 
          to="/" 
          className="logo"
          aria-label="SiteSprintz Home"
        >
          <span className="logo-icon" aria-hidden="true">🚀</span>
          <span className="logo-text">SiteSprintz</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="nav-menu desktop-nav" aria-label="Main navigation">
          {isAuthenticated ? (
            <>
              <Link 
                to="/dashboard" 
                className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
              >
                Dashboard
              </Link>
              <Link 
                to="/setup" 
                className={`nav-link ${location.pathname === '/setup' ? 'active' : ''}`}
                aria-current={location.pathname === '/setup' ? 'page' : undefined}
              >
                Create Site
              </Link>
              {user?.name && (
                <span className="user-name" aria-label={`Logged in as ${user.name}`}>
                  {user.name}
                </span>
              )}
              <button 
                onClick={handleLogout} 
                className="btn btn-secondary"
                aria-label="Logout"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}
                aria-current={location.pathname === '/login' ? 'page' : undefined}
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="btn btn-primary"
                aria-label="Get Started - Create Account"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className={`mobile-menu-toggle ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          onKeyDown={handleKeyDown}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile Navigation */}
      <nav
        ref={menuRef}
        id="mobile-menu"
        className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}
        aria-label="Mobile navigation"
        aria-hidden={!mobileMenuOpen}
      >
        {isAuthenticated ? (
          <>
            {user?.name && (
              <div className="mobile-user-info">
                <span className="user-name">{user.name}</span>
                {user?.email && (
                  <span className="user-email">{user.email}</span>
                )}
              </div>
            )}
            <Link 
              to="/dashboard" 
              className={`mobile-nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
            >
              Dashboard
            </Link>
            <Link 
              to="/setup" 
              className={`mobile-nav-link ${location.pathname === '/setup' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={location.pathname === '/setup' ? 'page' : undefined}
            >
              Create Site
            </Link>
            <button 
              onClick={handleLogout} 
              className="mobile-nav-link mobile-logout"
              aria-label="Logout"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link 
              to="/login" 
              className={`mobile-nav-link ${location.pathname === '/login' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={location.pathname === '/login' ? 'page' : undefined}
            >
              Login
            </Link>
            <Link 
              to="/register" 
              className="mobile-nav-link mobile-cta"
              onClick={() => setMobileMenuOpen(false)}
            >
              Get Started
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Header;

