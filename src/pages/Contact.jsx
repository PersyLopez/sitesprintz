import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useLocale } from '../i18n/LocaleContext.jsx';
import { laborDisplayVars } from '../utils/laborInquiryMailto';
import { PLATFORM_SUPPORT_EMAIL } from '../config/pricing.config';
import './ContentPage.css';

function Contact() {
  const { t } = useLocale();
  const laborVars = laborDisplayVars();
  return (
    <div className="content-page story-public">
      <Header />
      <main className="page-content">
        <div className="content-container">
          <h1>{t('contact.title')}</h1>

          <section className="about-section">
            <h2>{t('contact.h')}</h2>
            <p>{t('contact.p')}</p>
          </section>

          <section className="about-section">
            <h2>{t('contact.email.h')}</h2>
            <div className="contact-methods">
              <div className="contact-item">
                <h3>{t('contact.support')}</h3>
                <a href={`mailto:${PLATFORM_SUPPORT_EMAIL}`} className="contact-link">
                  {PLATFORM_SUPPORT_EMAIL}
                </a>
              </div>
            </div>
          </section>

          <section className="about-section">
            <h2>{t('contact.faq.h')}</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h3>{t('contact.faq.1.q')}</h3>
                <p>{t('contact.faq.1.a')}</p>
              </div>
              <div className="faq-item">
                <h3>{t('contact.faq.2.q')}</h3>
                <p>{t('contact.faq.2.a')}</p>
              </div>
              <div className="faq-item">
                <h3>{t('contact.faq.3.q')}</h3>
                <p>{t('contact.faq.3.a')}</p>
              </div>
              {laborVars && (
                <div className="faq-item">
                  <h3>{t('contact.faq.4.q')}</h3>
                  <p>{t('contact.faq.4.a', laborVars)}</p>
                </div>
              )}
            </div>
          </section>

          <section className="cta-section">
            <h2>{t('contact.cta.h')}</h2>
            <p>{t('contact.cta.p')}</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn-primary-large">
                {t('landing.cta.guest')}
              </Link>
              <Link to="/showcase" className="btn-secondary-large">
                {t('about.cta.examples')}
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Contact;
