import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useLocale } from '../i18n/LocaleContext.jsx';
import './ContentPage.css';

function About() {
  const { t } = useLocale();
  return (
    <div className="content-page story-public">
      <Header />
      <main className="page-content">
        <div className="content-container">
          <h1>{t('about.title')}</h1>

          <section className="about-section">
            <h2>{t('about.h1')}</h2>
            <p>{t('about.p1')}</p>
            <p>{t('about.p2')}</p>
          </section>

          <section className="about-section">
            <h2>{t('about.who.h')}</h2>
            <p>{t('about.who.p')}</p>
            <ul>
              <li>{t('about.who.li1')}</li>
              <li>{t('about.who.li2')}</li>
              <li>{t('about.who.li3')}</li>
              <li>{t('about.who.li4')}</li>
            </ul>
          </section>

          <section className="about-section">
            <h2>{t('about.how.h')}</h2>
            <div className="features-grid">
              <div className="feature-item">
                <h3>{t('about.how.1.h')}</h3>
                <p>{t('about.how.1.p')}</p>
              </div>
              <div className="feature-item">
                <h3>{t('about.how.2.h')}</h3>
                <p>{t('about.how.2.p')}</p>
              </div>
              <div className="feature-item">
                <h3>{t('about.how.3.h')}</h3>
                <p>{t('about.how.3.p')}</p>
              </div>
              <div className="feature-item">
                <h3>{t('about.how.4.h')}</h3>
                <p>{t('about.how.4.p')}</p>
              </div>
            </div>
          </section>

          <section className="cta-section">
            <h2>{t('about.cta.h')}</h2>
            <p>{t('about.cta.p')}</p>
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

export default About;
