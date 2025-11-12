import React, { useEffect, useState } from 'react';
import './BookingWidget.css';

/**
 * BookingWidget Component - Pro Feature
 * Supports embedded booking from various providers
 */

const BOOKING_PROVIDERS = {
  calendly: {
    name: 'Calendly',
    icon: '📅',
    scriptUrl: 'https://assets.calendly.com/assets/external/widget.js',
    styleUrl: 'https://assets.calendly.com/assets/external/widget.css'
  },
  acuity: {
    name: 'Acuity Scheduling',
    icon: '🗓️',
    scriptUrl: 'https://embed.acuityscheduling.com/js/embed.js'
  },
  square: {
    name: 'Square Appointments',
    icon: '🔲',
    // Square uses iframe embed
  },
  calcom: {
    name: 'Cal.com',
    icon: '📆',
    // Cal.com uses iframe or custom embed
  }
};

function BookingWidget({ config }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!config || !config.provider || !config.url) {
      setError('Booking configuration is incomplete');
      setIsLoading(false);
      return;
    }

    const loadBookingScript = async () => {
      try {
        const provider = BOOKING_PROVIDERS[config.provider];
        
        if (!provider) {
          throw new Error('Unknown booking provider');
        }

        // Load provider script if needed
        if (provider.scriptUrl) {
          await loadScript(provider.scriptUrl);
        }

        // Load provider styles if needed
        if (provider.styleUrl) {
          await loadStyle(provider.styleUrl);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Booking widget load error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    loadBookingScript();
  }, [config]);

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  };

  const loadStyle = (href) => {
    return new Promise((resolve) => {
      // Check if already loaded
      if (document.querySelector(`link[href="${href}"]`)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      document.head.appendChild(link);
    });
  };

  const renderWidget = () => {
    const { provider, url, style = 'inline' } = config;

    switch (provider) {
      case 'calendly':
        return renderCalendly(url, style);
      
      case 'acuity':
        return renderAcuity(url, style);
      
      case 'square':
      case 'calcom':
        return renderIframe(url, style);
      
      default:
        return renderIframe(url, style);
    }
  };

  const renderCalendly = (url, style) => {
    if (style === 'inline') {
      return (
        <div
          className="calendly-inline-widget"
          data-url={url}
          style={{ minWidth: '320px', height: '700px' }}
        />
      );
    } else {
      // Popup button
      return (
        <div className="booking-popup-trigger">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              if (window.Calendly) {
                window.Calendly.initPopupWidget({ url });
              }
            }}
          >
            📅 Schedule Appointment
          </button>
        </div>
      );
    }
  };

  const renderAcuity = (url, style) => {
    if (style === 'inline') {
      return (
        <iframe
          src={url}
          width="100%"
          height="800"
          frameBorder="0"
          className="acuity-iframe"
        />
      );
    } else {
      return (
        <div className="booking-popup-trigger">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              // Acuity popup logic
              window.open(url, 'booking', 'width=800,height=800');
            }}
          >
            🗓️ Book Appointment
          </button>
        </div>
      );
    }
  };

  const renderIframe = (url, style) => {
    return (
      <iframe
        src={url}
        width="100%"
        height={style === 'inline' ? '800' : '600'}
        frameBorder="0"
        className="booking-iframe"
        title="Booking Widget"
      />
    );
  };

  if (error) {
    return (
      <div className="booking-widget-error">
        <div className="error-icon">⚠️</div>
        <h3>Booking Widget Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="booking-widget-loading">
        <div className="loading-spinner"></div>
        <p>Loading booking widget...</p>
      </div>
    );
  }

  return (
    <div className={`booking-widget booking-${config.provider}`}>
      {renderWidget()}
    </div>
  );
}

export default BookingWidget;

