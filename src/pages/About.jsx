import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import './ContentPage.css';

function About() {
  return (
    <div className="content-page story-public">
      <Header />
      <main className="page-content">
        <div className="content-container">
          <h1>About SiteSprintz</h1>

          <section className="about-section">
            <h2>Leave a light on for tomorrow’s customer</h2>
            <p>
              Too many great businesses live only in the moment — a cart on the sidewalk,
              a chair in a garage, a kitchen that smells like home. When the day ends,
              the business disappears.
            </p>
            <p>
              We built SiteSprintz so the smallest shop can still be found after the
              awning comes down: a simple page with hours, what you sell, and how to
              reach you.
            </p>
          </section>

          <section className="about-section">
            <h2>Who we built this for</h2>
            <p>
              We didn’t start this for agencies. We started it for the person who already
              works too hard — and just needs a simple way to be found.
            </p>
            <ul>
              <li>A page shaped like your business, not a generic brochure</li>
              <li>Draft free, preview fast, publish when you’re ready</li>
              <li>Booking and checkout when you need them on Growth</li>
              <li>Starter at $10/month, Growth at $35/month</li>
            </ul>
          </section>

          <section className="about-section">
            <h2>How it works</h2>
            <div className="features-grid">
              <div className="feature-item">
                <h3>Tell us what you sell</h3>
                <p>Stall, shop, chair, or kitchen — we start a page that fits your world.</p>
              </div>
              <div className="feature-item">
                <h3>Show what customers need</h3>
                <p>Hours, menu, photos, how to find you. Add booking or checkout on Growth.</p>
              </div>
              <div className="feature-item">
                <h3>Leave the light on</h3>
                <p>Share your link on a sign, in a text, on WhatsApp.</p>
              </div>
              <div className="feature-item">
                <h3>Stay findable</h3>
                <p>Tomorrow’s customer can open your page on their phone tonight.</p>
              </div>
            </div>
          </section>

          <section className="cta-section">
            <h2>Ready for a page customers can find?</h2>
            <p>Draft is free. Publish when the page looks like you.</p>
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

export default About;
