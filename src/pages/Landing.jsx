import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import './Landing.css';

function Landing() {
  return (
    <div className="landing-page">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="landing-hero">
          <div className="hero-content">
            <span className="hero-badge">
              <span>✨</span>
              <span>Launch Your Business Online Today</span>
            </span>
            <h1>Create Your Professional Website in Minutes</h1>
            <p>
              Choose from beautiful templates, customize with our easy editor, 
              and launch your website instantly. No coding required.
            </p>
            <div className="cta-buttons">
              <Link to="/register" className="btn-primary-large">
                Get Started Free →
              </Link>
              <Link to="/login" className="btn-secondary-large">
                View Templates
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="compact-section">
          <div className="section-header-compact">
            <h2>How It Works</h2>
            <p>Three simple steps to your perfect website</p>
          </div>
          
          <div className="steps-compact">
            <div className="step-compact">
              <span className="step-icon">🎨</span>
              <h3>Choose a Template</h3>
              <p>Select from 13+ professionally designed templates for your business type</p>
            </div>
            
            <div className="step-compact">
              <span className="step-icon">✏️</span>
              <h3>Customize Content</h3>
              <p>Add your text, images, and branding with our intuitive editor</p>
            </div>
            
            <div className="step-compact">
              <span className="step-icon">🚀</span>
              <h3>Launch & Grow</h3>
              <p>Publish instantly and start attracting customers online</p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="compact-section features-section">
          <div className="section-header-compact">
            <h2>Everything You Need</h2>
            <p>Powerful features for modern websites</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Mobile Responsive</h3>
              <p>Perfect on all devices automatically</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💳</div>
              <h3>Payment Ready</h3>
              <p>Accept payments with Stripe integration</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast</h3>
              <p>Optimized for speed and SEO</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure & Reliable</h3>
              <p>HTTPS and daily backups included</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2>Ready to Get Started?</h2>
            <p>Join thousands of businesses already using SiteSprintz</p>
            <Link to="/register" className="btn-primary-large">
              Create Your Website Now →
            </Link>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

export default Landing;
