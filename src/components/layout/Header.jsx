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
  const isDashboard = location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/');

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
          data-testid="header-logo"
        >
          <span className="logo-icon" aria-hidden="true">
            <svg className="logo-mark" viewBox="0 0 24 24" width="1em" height="1em" focusable="false">
              <path
                fill="#93c5fd"
                d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.8 5.6 21.2 8 14 2 9.2h7.6L12 2z"
              />
            </svg>
          </span>
          <span className="logo-text">SiteSprintz</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="nav-menu desktop-nav" aria-label="Main navigation" data-testid="desktop-nav">
          {isAuthenticated ? (
            <>
              <Link 
                to="/dashboard" 
                className={`nav-link ${isDashboard ? 'active' : ''}`}
                aria-current={isDashboard ? 'page' : undefined}
                data-testid="nav-dashboard"
              >
                Dashboard
              </Link>
              <Link 
                to="/setup" 
                className={`nav-link ${location.pathname === '/setup' ? 'active' : ''}`}
                aria-current={location.pathname === '/setup' ? 'page' : undefined}
                data-testid="nav-create-site"
              >
                Create Site
              </Link>
              <Link
                to="/showcase"
                className={`nav-link ${location.pathname === '/showcase' || location.pathname.startsWith('/showcase/') ? 'active' : ''}`}
                aria-current={location.pathname.startsWith('/showcase') ? 'page' : undefined}
                data-testid="nav-gallery"
              >
                Gallery
              </Link>
              {user?.name && (
                <span className="user-name" aria-label={`Logged in as ${user.name}`} data-testid="user-name">
                  {user.name}
                </span>
              )}
              <button 
                onClick={handleLogout} 
                className="btn btn-secondary"
                aria-label="Logout"
                data-testid="nav-logout-button"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/#templates"
                className="nav-link"
                data-testid="nav-templates"
              >
                Templates
              </Link>
              <Link
                to="/#how-it-works"
                className="nav-link"
                data-testid="nav-how-it-works"
              >
                How It Works
              </Link>
              <Link
                to="/showcase"
                className={`nav-link ${location.pathname === '/showcase' ? 'active' : ''}`}
                aria-current={location.pathname === '/showcase' ? 'page' : undefined}
                data-testid="nav-gallery"
              >
                Gallery
              </Link>
              <Link
                to="/#pricing"
                className="nav-link"
                data-testid="nav-pricing"
              >
                Pricing
              </Link>
              <Link 
                to="/login" 
                className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}
                aria-current={location.pathname === '/login' ? 'page' : undefined}
                data-testid="nav-login"
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="btn btn-primary"
                aria-label="Get Started - Create Account"
                data-testid="nav-get-started"
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
          data-testid="mobile-menu-toggle"
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
        data-testid="mobile-nav"
      >
        {isAuthenticated ? (
          <>
            {user?.name && (
              <div className="mobile-user-info" data-testid="mobile-user-info">
                <span className="user-name">{user.name}</span>
                {user?.email && (
                  <span className="user-email">{user.email}</span>
                )}
              </div>
            )}
            <Link 
              to="/dashboard" 
              className={`mobile-nav-link ${isDashboard ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={isDashboard ? 'page' : undefined}
              data-testid="mobile-nav-dashboard"
            >
              Dashboard
            </Link>
            <Link 
              to="/setup" 
              className={`mobile-nav-link ${location.pathname === '/setup' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={location.pathname === '/setup' ? 'page' : undefined}
              data-testid="mobile-nav-create-site"
            >
              Create Site
            </Link>
            <Link
              to="/showcase"
              className={`mobile-nav-link ${location.pathname.startsWith('/showcase') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={location.pathname.startsWith('/showcase') ? 'page' : undefined}
              data-testid="mobile-nav-gallery"
            >
              Gallery
            </Link>
            <button 
              onClick={handleLogout} 
              className="mobile-nav-link mobile-logout"
              aria-label="Logout"
              data-testid="mobile-nav-logout"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/#templates"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="mobile-nav-templates"
            >
              Templates
            </Link>
            <Link
              to="/#how-it-works"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="mobile-nav-how-it-works"
            >
              How It Works
            </Link>
            <Link
              to="/showcase"
              className={`mobile-nav-link ${location.pathname === '/showcase' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              data-testid="mobile-nav-gallery"
            >
              Gallery
            </Link>
            <Link
              to="/#pricing"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="mobile-nav-pricing"
            >
              Pricing
            </Link>
            <Link 
              to="/login" 
              className={`mobile-nav-link ${location.pathname === '/login' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={location.pathname === '/login' ? 'page' : undefined}
              data-testid="mobile-nav-login"
            >
              Login
            </Link>
            <Link 
              to="/register" 
              className="mobile-nav-link mobile-cta"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="mobile-nav-register"
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

