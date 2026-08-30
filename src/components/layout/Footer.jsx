import React from 'react';
import { Link } from 'react-router-dom';
import { PLATFORM_SUPPORT_EMAIL } from '../../config/pricing.config';
import { useLocale } from '../../i18n/LocaleContext.jsx';
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLocale();

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-brand">
            <Link to="/" className="logo" aria-label={t('header.home')}>
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
            <p className="footer-tagline">{t('footer.tagline')}</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-column">
              <p className="footer-heading">{t('footer.product')}</p>
              <Link to="/#templates">{t('footer.templates')}</Link>
              <Link to="/showcase">{t('footer.gallery')}</Link>
              <Link to="/#pricing">{t('footer.pricing')}</Link>
              <Link to="/#how-it-works">{t('footer.howItWorks')}</Link>
            </div>
            
            <div className="footer-column">
              <p className="footer-heading">{t('footer.company')}</p>
              <Link to="/about">{t('footer.about')}</Link>
              <Link to="/contact">{t('footer.contact')}</Link>
              <a href={`mailto:${PLATFORM_SUPPORT_EMAIL}`} data-testid="footer-support-email">
                {t('footer.supportEmail')}
              </a>
            </div>
            
            <div className="footer-column">
              <p className="footer-heading">{t('footer.account')}</p>
              <Link to="/register">{t('footer.register')}</Link>
              <Link to="/login">{t('footer.login')}</Link>
            </div>

            <div className="footer-column">
              <p className="footer-heading">{t('footer.legal')}</p>
              <a href="/legal/terms">{t('footer.terms')}</a>
              <a href="/legal/privacy">{t('footer.privacy')}</a>
              <a href="/legal/cookies">{t('footer.cookies')}</a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>{t('footer.rights', { year: currentYear })}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
