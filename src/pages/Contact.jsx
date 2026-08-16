import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import './ContentPage.css';

function Contact() {
  return (
    <div className="content-page story-public">
      <Header />
      <main className="page-content">
        <div className="content-container">
          <h1>Contact</h1>

          <section className="about-section">
            <h2>We’re here</h2>
            <p>
              Questions about your page, billing, or something that isn’t working —
              write us. We read every message.
            </p>
          </section>

          <section className="about-section">
            <h2>Email</h2>
            <div className="contact-methods">
              <div className="contact-item">
                <h3>General</h3>
                <a href="mailto:hello@sitesprintz.com" className="contact-link">
                  hello@sitesprintz.com
                </a>
              </div>
              <div className="contact-item">
                <h3>Support</h3>
                <a href="mailto:support@sitesprintz.com" className="contact-link">
                  support@sitesprintz.com
                </a>
              </div>
              <div className="contact-item">
                <h3>Partnerships</h3>
                <a href="mailto:partnerships@sitesprintz.com" className="contact-link">
                  partnerships@sitesprintz.com
                </a>
              </div>
            </div>
          </section>

          <section className="about-section">
            <h2>Common questions</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h3>How quickly will I get a response?</h3>
                <p>We typically respond within 24 hours on business days.</p>
              </div>
              <div className="faq-item">
                <h3>Do you offer phone support?</h3>
                <p>
                  Support is by email so we can give you a documented answer you can
                  keep.
                </p>
              </div>
              <div className="faq-item">
                <h3>What should I include?</h3>
                <p>
                  Your account email, site subdomain if you have one, and what you
                  were trying to do.
                </p>
              </div>
            </div>
          </section>

          <section className="cta-section">
            <h2>Need a page first?</h2>
            <p>Draft is free. Publish when you’re ready.</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn-primary-large">
                Get Your Page Free
              </Link>
              <Link to="/showcase" className="btn-secondary-large">
                View Examples
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
