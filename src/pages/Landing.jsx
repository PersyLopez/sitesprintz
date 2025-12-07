import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import './Landing.css';

function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const showcaseRef = useRef(null);
  
  // Handle template/CTA clicks - redirect based on auth status
  const handleGetStarted = (e) => {
    if (isAuthenticated) {
      e.preventDefault();
      navigate('/setup');
    }
    // If not authenticated, Link component will handle navigation to /register
  };
  
  useEffect(() => {
    // Auto-rotate template showcase
    const track = showcaseRef.current;
    if (!track) return;
    
    let currentIndex = 0;
    const slides = track.querySelectorAll('.showcase-slide');
    const dots = track.querySelectorAll('.dot');
    const totalSlides = slides.length;
    
    const showSlide = (index) => {
      slides.forEach(slide => slide.classList.remove('active'));
      dots.forEach(dot => dot.classList.remove('active'));
      slides[index].classList.add('active');
      dots[index].classList.add('active');
    };
    
    const nextSlide = () => {
      currentIndex = (currentIndex + 1) % totalSlides;
      showSlide(currentIndex);
    };
    
    // Auto-advance every 5 seconds
    const interval = setInterval(nextSlide, 5000);
    
    // Manual control
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        currentIndex = index;
        showSlide(currentIndex);
        clearInterval(interval);
      });
    });
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="landing-page">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <Header />
      
      <main id="main-content">
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
              <Link 
                to={isAuthenticated ? "/setup" : "/register"} 
                className="btn-primary-large"
                onClick={handleGetStarted}
              >
                {isAuthenticated ? "Create Your Site →" : "Get Started Free →"}
              </Link>
              <a href="#templates" className="btn-secondary-large">
                View Templates
              </a>
            </div>
          </div>
        </section>

        {/* Template Showcase Carousel */}
        <section className="template-showcase-section" ref={showcaseRef}>
          <div className="showcase-container">
            <div className="showcase-track">
              <div className="showcase-slide active" data-site="restaurant">
                <div className="showcase-browser">
                  <div className="browser-bar">
                    <span className="browser-dots">
                      <i></i><i></i><i></i>
                    </span>
                    <span className="browser-url">🍽️ sitesprintz.com/bistro-delight</span>
                  </div>
                  <iframe src="/sites/bistro-delight-mheg6c3h/" loading="lazy" title="Restaurant template"></iframe>
                </div>
                <div className="showcase-label">
                  <strong>🍽️ Restaurant Template</strong>
                  <span>Fine dining • Casual • Fast casual layouts</span>
                </div>
              </div>
              
              <div className="showcase-slide" data-site="salon">
                <div className="showcase-browser">
                  <div className="browser-bar">
                    <span className="browser-dots">
                      <i></i><i></i><i></i>
                    </span>
                    <span className="browser-url">💇 sitesprintz.com/glow-studio</span>
                  </div>
                  <iframe src="/sites/glow-studio-mheg8mxo/" loading="lazy" title="Salon template"></iframe>
                </div>
                <div className="showcase-label">
                  <strong>💇 Salon & Spa Template</strong>
                  <span>Luxury spa • Modern studio • Neighborhood salon</span>
                </div>
              </div>
              
              <div className="showcase-slide" data-site="consultant">
                <div className="showcase-browser">
                  <div className="browser-bar">
                    <span className="browser-dots">
                      <i></i><i></i><i></i>
                    </span>
                    <span className="browser-url">💼 sitesprintz.com/strategic-solutions</span>
                  </div>
                  <iframe src="/sites/strategic-solutions-mheg7o4n/" loading="lazy" title="Consultant template"></iframe>
                </div>
                <div className="showcase-label">
                  <strong>💼 Consultant Template</strong>
                  <span>Strategic • Creative • Executive coaching</span>
                </div>
              </div>
              
              <div className="showcase-slide" data-site="gym">
                <div className="showcase-browser">
                  <div className="browser-bar">
                    <span className="browser-dots">
                      <i></i><i></i><i></i>
                    </span>
                    <span className="browser-url">💪 sitesprintz.com/powerhouse-gym</span>
                  </div>
                  <iframe src="/sites/powerhouse-gym-mheg7ywu/" loading="lazy" title="Gym template"></iframe>
                </div>
                <div className="showcase-label">
                  <strong>💪 Fitness Template</strong>
                  <span>CrossFit • Boutique • Personal training studios</span>
                </div>
              </div>
            </div>
            
            <div className="showcase-dots">
              <button className="dot active" data-index="0" aria-label="Restaurant template"></button>
              <button className="dot" data-index="1" aria-label="Salon template"></button>
              <button className="dot" data-index="2" aria-label="Consultant template"></button>
              <button className="dot" data-index="3" aria-label="Gym template"></button>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="trust-indicators">
          <div className="trust-grid">
            <div className="trust-item">
              <span>✓</span>
              <span>No credit card required</span>
            </div>
            <div className="trust-item">
              <span>✓</span>
              <span>Free to customize</span>
            </div>
            <div className="trust-item">
              <span>✓</span>
              <span>Launch in 10 minutes</span>
            </div>
            <div className="trust-item">
              <span>✓</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </section>

        {/* All Templates Section */}
        <section id="templates" className="all-templates-section">
          <div className="section-header-compact">
            <h2>Choose Your Template</h2>
            <p>All templates included - pick the perfect one for your business</p>
          </div>
          
          <div className="quick-templates">
            <Link to={isAuthenticated ? "/setup" : "/register"} className="quick-template-card" onClick={handleGetStarted}>
              <span className="template-emoji">🍽️</span>
              <h3>Restaurant</h3>
              <p>Menu, reservations, contact</p>
              <div className="template-tags">
                <span>Fine Dining</span>
                <span>Casual</span>
                <span>Fast Food</span>
              </div>
            </Link>
            
            <Link to={isAuthenticated ? "/setup" : "/register"} className="quick-template-card" onClick={handleGetStarted}>
              <span className="template-emoji">💇</span>
              <h3>Salon & Spa</h3>
              <p>Services, booking, gallery</p>
              <div className="template-tags">
                <span>Hair Salon</span>
                <span>Spa</span>
                <span>Nails</span>
              </div>
            </Link>
            
            <Link to={isAuthenticated ? "/setup" : "/register"} className="quick-template-card" onClick={handleGetStarted}>
              <span className="template-emoji">💪</span>
              <h3>Fitness & Gym</h3>
              <p>Classes, pricing, testimonials</p>
              <div className="template-tags">
                <span>CrossFit</span>
                <span>Yoga</span>
                <span>Personal Training</span>
              </div>
            </Link>
            
            <Link to={isAuthenticated ? "/setup" : "/register"} className="quick-template-card" onClick={handleGetStarted}>
              <span className="template-emoji">💼</span>
              <h3>Consultant</h3>
              <p>About, services, contact</p>
              <div className="template-tags">
                <span>Business</span>
                <span>Strategy</span>
                <span>Coaching</span>
              </div>
            </Link>
            
            <Link to={isAuthenticated ? "/setup" : "/register"} className="quick-template-card" onClick={handleGetStarted}>
              <span className="template-emoji">👔</span>
              <h3>Freelancer</h3>
              <p>Portfolio, services, booking</p>
              <div className="template-tags">
                <span>Designer</span>
                <span>Developer</span>
                <span>Writer</span>
              </div>
            </Link>
            
            <Link to={isAuthenticated ? "/setup" : "/register"} className="quick-template-card" onClick={handleGetStarted}>
              <span className="template-emoji">💻</span>
              <h3>Tech Repair</h3>
              <p>Services, pricing, booking</p>
              <div className="template-tags">
                <span>Phone Repair</span>
                <span>Computer</span>
                <span>Gaming</span>
              </div>
            </Link>
            
            <Link to={isAuthenticated ? "/setup" : "/register"} className="quick-template-card" onClick={handleGetStarted}>
              <span className="template-emoji">🧹</span>
              <h3>Cleaning Services</h3>
              <p>Services, pricing, booking</p>
              <div className="template-tags">
                <span>Residential</span>
                <span>Commercial</span>
                <span>Eco-Friendly</span>
              </div>
            </Link>
            
            <Link to={isAuthenticated ? "/setup" : "/register"} className="quick-template-card" onClick={handleGetStarted}>
              <span className="template-emoji">🐾</span>
              <h3>Pet Care</h3>
              <p>Services, gallery, booking</p>
              <div className="template-tags">
                <span>Dog Grooming</span>
                <span>Full Service</span>
                <span>Mobile</span>
              </div>
            </Link>
            
            <Link to={isAuthenticated ? "/setup" : "/register"} className="quick-template-card" onClick={handleGetStarted}>
              <span className="template-emoji">⚡</span>
              <h3>Electrician</h3>
              <p>Services, emergency, booking</p>
              <div className="template-tags">
                <span>Residential</span>
                <span>Commercial</span>
                <span>Industrial</span>
              </div>
            </Link>
            
            <Link to={isAuthenticated ? "/setup" : "/register"} className="quick-template-card" onClick={handleGetStarted}>
              <span className="template-emoji">🚗</span>
              <h3>Auto Repair</h3>
              <p>Services, booking, pricing</p>
              <div className="template-tags">
                <span>Quick Service</span>
                <span>Full Service</span>
                <span>Performance</span>
              </div>
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="compact-section how-it-works">
          <div className="section-header-compact">
            <h2>How It Works</h2>
            <p>Three simple steps to your perfect website</p>
          </div>
          
          <div className="steps-compact">
            <div className="step-compact">
              <span className="step-icon">🎨</span>
              <h3>Choose a Template</h3>
              <p>Select from 10+ professionally designed templates for your business type</p>
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
            <Link 
              to={isAuthenticated ? "/setup" : "/register"} 
              className="btn-primary-large"
              onClick={handleGetStarted}
            >
              {isAuthenticated ? "Create Your Site Now →" : "Create Your Website Now →"}
            </Link>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

export default Landing;
