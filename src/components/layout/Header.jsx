import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../i18n/LocaleContext.jsx';
import LanguageSwitcher from '../i18n/LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import FeedbackWidget from '../common/FeedbackWidget';
import './Header.css';

function Header() {
  const { isAuthenticated, logout, user } = useAuth();
  const { t } = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuRef = useRef(null);
  const toggleRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isAccountDashboard =
    location.pathname === '/dashboard' ||
    (location.pathname.startsWith('/dashboard/') && !location.pathname.startsWith('/dashboard/sites/'));
  const isStaffRoute = location.pathname === '/staff' || location.pathname.startsWith('/staff/');
  const showOwnerNav = isAuthenticated && !isStaffRoute;

  // Close mobile menu on path change, not ?lang= (language switch would look broken)
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when clicking outside (exclude toggle to avoid mousedown/click race)
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedMenu = menuRef.current?.contains(event.target);
      const clickedToggle = toggleRef.current?.contains(event.target);
      if (!clickedMenu && !clickedToggle) {
        setMobileMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    const cleared = await logout();
    if (cleared) {
      navigate('/login');
    }
  };

  const openFeedback = () => {
    setMobileMenuOpen(false);
    setFeedbackOpen(true);
  };

  return (
    <>
    <header className={`site-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="header-container">
        <Link 
          to="/" 
          className="logo"
          aria-label={t('header.home')}
          data-testid="header-logo"
        >
          <span className="logo-icon" aria-hidden="true">
            <svg className="logo-mark" viewBox="0 0 24 24" width="1em" height="1em" focusable="false">
              <path
                fill="currentColor"
                d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.8 5.6 21.2 8 14 2 9.2h7.6L12 2z"
              />
            </svg>
          </span>
          <span className="logo-text">{t('brand.name')}</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="nav-menu desktop-nav" aria-label="Main navigation" data-testid="desktop-nav">
          {isAuthenticated ? (
            <>
              {showOwnerNav && (
                <>
                  <Link 
                    to="/dashboard" 
                    className={`nav-link ${isAccountDashboard ? 'active' : ''}`}
                    aria-current={isAccountDashboard ? 'page' : undefined}
                    data-testid="nav-dashboard"
                  >
                    {t('nav.dashboard')}
                  </Link>
                  <Link 
                    to="/setup" 
                    className={`nav-link ${location.pathname === '/setup' ? 'active' : ''}`}
                    aria-current={location.pathname === '/setup' ? 'page' : undefined}
                    data-testid="nav-create-site"
                  >
                    {t('nav.createSite')}
                  </Link>
                </>
              )}
              <Link
                to="/showcase"
                className={`nav-link ${location.pathname === '/showcase' || location.pathname.startsWith('/showcase/') ? 'active' : ''}`}
                aria-current={location.pathname.startsWith('/showcase') ? 'page' : undefined}
                data-testid="nav-gallery"
              >
                {t('nav.gallery')}
              </Link>
              <button
                type="button"
                className="nav-link nav-link-button"
                onClick={() => setFeedbackOpen(true)}
                data-testid="nav-feedback"
              >
                Send feedback
              </button>
              {user?.name && (
                <span className="user-name" aria-label={t('header.loggedInAs', { name: user.name })} data-testid="user-name">
                  {user.name}
                </span>
              )}
              <button 
                onClick={handleLogout} 
                className="btn btn-secondary"
                aria-label={t('nav.logout')}
                data-testid="nav-logout-button"
              >
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/#templates"
                className="nav-link"
                data-testid="nav-templates"
              >
                {t('nav.templates')}
              </Link>
              <Link
                to="/#how-it-works"
                className="nav-link"
                data-testid="nav-how-it-works"
              >
                {t('nav.howItWorks')}
              </Link>
              <Link
                to="/showcase"
                className={`nav-link ${location.pathname === '/showcase' ? 'active' : ''}`}
                aria-current={location.pathname === '/showcase' ? 'page' : undefined}
                data-testid="nav-gallery"
              >
                {t('nav.gallery')}
              </Link>
              <Link
                to="/#pricing"
                className="nav-link"
                data-testid="nav-pricing"
              >
                {t('nav.pricing')}
              </Link>
              <button
                type="button"
                className="nav-link nav-link-button"
                onClick={() => setFeedbackOpen(true)}
                data-testid="nav-feedback"
              >
                Send feedback
              </button>
              <Link 
                to="/login" 
                className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}
                aria-current={location.pathname === '/login' ? 'page' : undefined}
                data-testid="nav-login"
              >
                {t('nav.login')}
              </Link>
              <Link 
                to="/register" 
                className="btn btn-primary"
                aria-label={t('nav.getStarted')}
                data-testid="nav-get-started"
              >
                {t('nav.getStarted')}
              </Link>
            </>
          )}
        </nav>
        <LanguageSwitcher className="header-language-switcher header-language-switcher--desktop" />
        <ThemeSwitcher className="header-theme-switcher header-theme-switcher--desktop" />

        {/* Mobile Menu Button */}
        <button
          ref={toggleRef}
          type="button"
          className={`mobile-menu-toggle ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={t('nav.menu')}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          data-testid="mobile-menu-toggle"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
      <nav
        ref={menuRef}
        id="mobile-menu"
        className={`mobile-nav site-header-mobile-nav ${mobileMenuOpen ? 'open' : ''}`}
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
            <LanguageSwitcher className="header-language-switcher header-language-switcher--mobile" />
            <ThemeSwitcher className="header-theme-switcher header-theme-switcher--mobile" />
            {showOwnerNav && (
              <>
                <Link 
                  to="/dashboard" 
                  className={`mobile-nav-link ${isAccountDashboard ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isAccountDashboard ? 'page' : undefined}
                  data-testid="mobile-nav-dashboard"
                >
                  {t('nav.dashboard')}
                </Link>
                <Link 
                  to="/setup" 
                  className={`mobile-nav-link ${location.pathname === '/setup' ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={location.pathname === '/setup' ? 'page' : undefined}
                  data-testid="mobile-nav-create-site"
                >
                  {t('nav.createSite')}
                </Link>
              </>
            )}
            <Link
              to="/showcase"
              className={`mobile-nav-link ${location.pathname.startsWith('/showcase') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={location.pathname.startsWith('/showcase') ? 'page' : undefined}
              data-testid="mobile-nav-gallery"
            >
              {t('nav.gallery')}
            </Link>
            <button
              type="button"
              className="mobile-nav-link"
              onClick={openFeedback}
              data-testid="mobile-nav-feedback"
            >
              Send feedback
            </button>
            <button 
              onClick={handleLogout} 
              className="mobile-nav-link mobile-logout"
              aria-label={t('nav.logout')}
              data-testid="mobile-nav-logout"
            >
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <>
            <LanguageSwitcher className="header-language-switcher header-language-switcher--mobile" />
            <ThemeSwitcher className="header-theme-switcher header-theme-switcher--mobile" />
            <Link
              to="/#templates"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="mobile-nav-templates"
            >
              {t('nav.templates')}
            </Link>
            <Link
              to="/#how-it-works"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="mobile-nav-how-it-works"
            >
              {t('nav.howItWorks')}
            </Link>
            <Link
              to="/showcase"
              className={`mobile-nav-link ${location.pathname === '/showcase' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              data-testid="mobile-nav-gallery"
            >
              {t('nav.gallery')}
            </Link>
            <Link
              to="/#pricing"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="mobile-nav-pricing"
            >
              {t('nav.pricing')}
            </Link>
            <Link 
              to="/login" 
              className={`mobile-nav-link ${location.pathname === '/login' ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
              aria-current={location.pathname === '/login' ? 'page' : undefined}
              data-testid="mobile-nav-login"
            >
              {t('nav.login')}
            </Link>
            <button
              type="button"
              className="mobile-nav-link"
              onClick={openFeedback}
              data-testid="mobile-nav-feedback"
            >
              Send feedback
            </button>
            <Link 
              to="/register" 
              className="mobile-nav-link mobile-cta"
              onClick={() => setMobileMenuOpen(false)}
              data-testid="mobile-nav-register"
            >
              {t('nav.getStarted')}
            </Link>
          </>
        )}
      </nav>
      <FeedbackWidget hideFab open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}

export default Header;

