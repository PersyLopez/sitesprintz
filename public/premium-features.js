/**
 * Premium Template Features
 * Quick Win implementations: Live Chat, Enhanced Profiles, Service Filters
 */

(function() {
  'use strict';

  // ============================================
  // FEATURE 1: LIVE CHAT WIDGET INTEGRATION
  // ============================================

  window.PremiumFeatures = window.PremiumFeatures || {};

  /**
   * Initialize live chat widget (Intercom, Drift, Tidio, or custom)
   * @param {Object} config - Chat configuration from template JSON
   */
  window.PremiumFeatures.initLiveChat = function(config) {
    if (!config || !config.enabled) return;

    const provider = config.provider?.toLowerCase();
    
    switch(provider) {
      case 'intercom':
        initIntercom(config);
        break;
      case 'drift':
        initDrift(config);
        break;
      case 'tidio':
        initTidio(config);
        break;
      case 'tawk':
        initTawk(config);
        break;
      case 'crisp':
        initCrisp(config);
        break;
      default:
        console.warn('Unknown chat provider:', provider);
    }
  };

  // Intercom Integration
  function initIntercom(config) {
    if (!config.appId) return;
    
    window.intercomSettings = {
      app_id: config.appId,
      custom_launcher_selector: config.buttonSelector || '#chat-launcher'
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://widget.intercom.io/widget/${config.appId}`;
    document.head.appendChild(script);

    console.log('✅ Intercom chat initialized');
  }

  // Drift Integration
  function initDrift(config) {
    if (!config.appId) return;

    (function() {
      var t = window.driftt = window.drift = window.driftt || [];
      if (!t.init) {
        if (t.invoked) return;
        t.invoked = true;
        t.methods = [ "identify", "config", "track", "reset", "debug", "show", "ping", "page", "hide", "off", "on" ];
        t.factory = function(e) {
          return function() {
            var n = Array.prototype.slice.call(arguments);
            n.unshift(e);
            t.push(n);
            return t;
          };
        };
        t.methods.forEach(function(e) {
          t[e] = t.factory(e);
        });
        t.load = function(t) {
          var e = 3e5;
          var n = Math.ceil(new Date() / e) * e;
          var o = document.createElement("script");
          o.type = "text/javascript";
          o.async = true;
          o.crossOrigin = "anonymous";
          o.src = "https://js.driftt.com/include/" + n + "/" + t + ".js";
          var i = document.getElementsByTagName("script")[0];
          i.parentNode.insertBefore(o, i);
        };
      }
    })();
    drift.SNIPPET_VERSION = '0.3.1';
    drift.load(config.appId);

    console.log('✅ Drift chat initialized');
  }

  // Tidio Integration
  function initTidio(config) {
    if (!config.appId) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `//code.tidio.co/${config.appId}.js`;
    document.head.appendChild(script);

    console.log('✅ Tidio chat initialized');
  }

  // Tawk.to Integration
  function initTawk(config) {
    if (!config.propertyId || !config.widgetId) return;

    var Tawk_API = Tawk_API || {};
    var Tawk_LoadStart = new Date();
    
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://embed.tawk.to/${config.propertyId}/${config.widgetId}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    document.head.appendChild(script);

    console.log('✅ Tawk.to chat initialized');
  }

  // Crisp Integration
  function initCrisp(config) {
    if (!config.websiteId) return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = config.websiteId;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://client.crisp.chat/l.js';
    document.head.appendChild(script);

    console.log('✅ Crisp chat initialized');
  }

  // ============================================
  // FEATURE 2: ENHANCED PROVIDER/STAFF PROFILES
  // ============================================

  /**
   * Render enhanced team member profile with all premium fields
   * @param {Object} member - Team member data
   * @returns {HTMLElement}
   */
  window.PremiumFeatures.renderEnhancedProfile = function(member) {
    const card = document.createElement('div');
    card.className = 'team-member-card enhanced';
    
    // Photo with video option
    const mediaSection = document.createElement('div');
    mediaSection.className = 'member-media';
    
    if (member.videoUrl) {
      const videoBtn = document.createElement('button');
      videoBtn.className = 'video-intro-btn';
      videoBtn.innerHTML = '▶️ Watch Video Introduction';
      videoBtn.onclick = () => openVideoModal(member.videoUrl, member.name);
      
      const photoContainer = document.createElement('div');
      photoContainer.className = 'photo-container has-video';
      if (member.photo) {
        const img = document.createElement('img');
        img.src = member.photo;
        img.alt = member.name;
        photoContainer.appendChild(img);
      }
      photoContainer.appendChild(videoBtn);
      mediaSection.appendChild(photoContainer);
    } else if (member.photo) {
      const img = document.createElement('img');
      img.src = member.photo;
      img.alt = member.name;
      img.className = 'member-photo';
      mediaSection.appendChild(img);
    }
    
    card.appendChild(mediaSection);
    
    // Info section
    const info = document.createElement('div');
    info.className = 'member-info';
    
    // Name and credentials
    const header = document.createElement('div');
    header.className = 'member-header';
    header.innerHTML = `
      <h3 class="member-name">${member.name}</h3>
      ${member.credentials ? `<p class="member-credentials">${member.credentials}</p>` : ''}
      ${member.specialty ? `<p class="member-specialty">${member.specialty}</p>` : ''}
    `;
    info.appendChild(header);
    
    // Languages (NEW - Premium feature)
    if (member.languages && member.languages.length > 0) {
      const langSection = document.createElement('div');
      langSection.className = 'member-languages';
      langSection.innerHTML = `
        <span class="label">Languages:</span>
        <span class="values">${member.languages.join(', ')}</span>
      `;
      info.appendChild(langSection);
    }
    
    // Experience
    if (member.experience) {
      const exp = document.createElement('p');
      exp.className = 'member-experience';
      exp.innerHTML = `<strong>Experience:</strong> ${member.experience}`;
      info.appendChild(exp);
    }
    
    // Education (Enhanced)
    if (member.education && member.education.length > 0) {
      const eduSection = document.createElement('div');
      eduSection.className = 'member-education';
      eduSection.innerHTML = `
        <strong>Education:</strong>
        <ul>${member.education.map(e => `<li>${e}</li>`).join('')}</ul>
      `;
      info.appendChild(eduSection);
    }
    
    // Certifications (Enhanced)
    if (member.certifications && member.certifications.length > 0) {
      const certSection = document.createElement('div');
      certSection.className = 'member-certifications';
      certSection.innerHTML = `
        <strong>Certifications:</strong>
        <ul>${member.certifications.map(c => `<li>✓ ${c}</li>`).join('')}</ul>
      `;
      info.appendChild(certSection);
    }
    
    // Specializations (NEW - Premium feature)
    if (member.specializations && member.specializations.length > 0) {
      const specSection = document.createElement('div');
      specSection.className = 'member-specializations';
      specSection.innerHTML = `
        <strong>Specializations:</strong>
        <div class="spec-tags">
          ${member.specializations.map(s => `<span class="spec-tag">${s}</span>`).join('')}
        </div>
      `;
      info.appendChild(specSection);
    }
    
    // Availability (NEW - Premium feature)
    if (member.availability) {
      const availSection = document.createElement('div');
      availSection.className = 'member-availability';
      availSection.innerHTML = `
        <strong>Availability:</strong>
        <span class="availability-schedule">${member.availability}</span>
      `;
      info.appendChild(availSection);
    }
    
    // Statement/Bio
    if (member.statement) {
      const statement = document.createElement('blockquote');
      statement.className = 'member-statement';
      statement.textContent = `"${member.statement}"`;
      info.appendChild(statement);
    }
    
    // Client Reviews (NEW - Premium feature)
    if (member.reviews && member.reviews.length > 0) {
      const reviewsSection = document.createElement('div');
      reviewsSection.className = 'member-reviews';
      reviewsSection.innerHTML = `
        <strong>Recent Reviews:</strong>
        ${member.reviews.slice(0, 2).map(r => `
          <div class="mini-review">
            <div class="stars">${'⭐'.repeat(r.rating)}</div>
            <p>"${r.quote}"</p>
            <span class="reviewer">- ${r.reviewer}</span>
          </div>
        `).join('')}
      `;
      info.appendChild(reviewsSection);
    }
    
    // CTA
    if (member.cta) {
      const cta = document.createElement('a');
      cta.href = member.cta.href;
      cta.className = 'btn btn-primary member-cta';
      cta.textContent = member.cta.label;
      info.appendChild(cta);
    }
    
    card.appendChild(info);
    return card;
  };

  // Video modal helper
  function openVideoModal(videoUrl, name) {
    const modal = document.createElement('div');
    modal.className = 'video-modal';
    modal.innerHTML = `
      <div class="video-modal-content">
        <button class="video-modal-close" onclick="this.parentElement.parentElement.remove()">✕</button>
        <h3>Meet ${name}</h3>
        <div class="video-container">
          <iframe src="${videoUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
      </div>
    `;
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
    document.body.appendChild(modal);
  }

  // ============================================
  // FEATURE 3: SERVICE/PRODUCT FILTERS
  // ============================================

  /**
   * Initialize service filters for a section
   * @param {string} containerId - ID of the container element
   * @param {Array} items - Array of service/product items
   * @param {Array} filters - Array of filter definitions
   */
  window.PremiumFeatures.initServiceFilters = function(containerId, items, filters) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Create filter buttons
    const filterBar = document.createElement('div');
    filterBar.className = 'service-filters';
    
    filters.forEach(filter => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.textContent = filter.label;
      btn.dataset.filter = filter.value;
      
      if (filter.value === 'all') {
        btn.classList.add('active');
      }
      
      btn.onclick = () => handleFilterClick(btn, containerId, items);
      filterBar.appendChild(btn);
    });
    
    // Insert filter bar before items
    const itemsContainer = container.querySelector('.services-grid, .products-grid, .items-grid');
    if (itemsContainer) {
      itemsContainer.parentNode.insertBefore(filterBar, itemsContainer);
    }
    
    console.log('✅ Service filters initialized');
  };

  function handleFilterClick(btn, containerId, items) {
    const container = document.getElementById(containerId);
    const allBtns = container.querySelectorAll('.filter-btn');
    
    // Update active state
    allBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const filterValue = btn.dataset.filter;
    const itemElements = container.querySelectorAll('.service-card, .product-card, .item-card');
    
    itemElements.forEach((el, idx) => {
      const item = items[idx];
      if (!item) return;
      
      if (filterValue === 'all') {
        el.style.display = '';
        setTimeout(() => el.classList.add('visible'), 10);
      } else {
        // Check if item matches filter
        const matches = item.category === filterValue || 
                       item.type === filterValue ||
                       (item.tags && item.tags.includes(filterValue));
        
        if (matches) {
          el.style.display = '';
          setTimeout(() => el.classList.add('visible'), 10);
        } else {
          el.classList.remove('visible');
          setTimeout(() => el.style.display = 'none', 300);
        }
      }
    });
    
    // Update count
    const visibleCount = Array.from(itemElements).filter(el => el.style.display !== 'none').length;
    updateFilterCount(container, visibleCount);
  }

  function updateFilterCount(container, count) {
    let countEl = container.querySelector('.filter-count');
    if (!countEl) {
      countEl = document.createElement('div');
      countEl.className = 'filter-count';
      const filterBar = container.querySelector('.service-filters');
      if (filterBar) {
        filterBar.appendChild(countEl);
      }
    }
    countEl.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
  }

  // ============================================
  // PREMIUM FEATURES STYLES
  // ============================================

  // Inject premium feature styles
  const premiumStyles = document.createElement('style');
  premiumStyles.textContent = `
    /* Enhanced Team Profiles */
    .team-member-card.enhanced {
      background: var(--premium-surface, #fff);
      border: 2px solid var(--premium-border, rgba(0,0,0,0.1));
      border-radius: var(--premium-radius, 18px);
      padding: 24px;
      transition: all 0.3s ease;
    }

    .team-member-card.enhanced:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.12);
    }

    .member-media {
      margin-bottom: 20px;
    }

    .photo-container {
      position: relative;
    }

    .photo-container.has-video::after {
      content: '▶️';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 3rem;
      opacity: 0.8;
      pointer-events: none;
    }

    .video-intro-btn {
      margin-top: 10px;
      padding: 8px 16px;
      background: var(--premium-primary, #0369a1);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      width: 100%;
    }

    .member-photo {
      width: 100%;
      border-radius: 12px;
      aspect-ratio: 1;
      object-fit: cover;
    }

    .member-languages,
    .member-availability {
      margin: 12px 0;
      padding: 10px;
      background: var(--premium-secondary, #f8fafc);
      border-radius: 8px;
      font-size: 0.9rem;
    }

    .member-languages .label,
    .member-availability strong {
      font-weight: 600;
      color: var(--premium-primary, #0369a1);
    }

    .member-specializations {
      margin: 12px 0;
    }

    .spec-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .spec-tag {
      padding: 4px 12px;
      background: var(--premium-primary, #0369a1);
      color: white;
      border-radius: 20px;
      font-size: 0.8rem;
    }

    .member-reviews {
      margin: 16px 0;
      padding: 16px;
      background: var(--premium-secondary, #f8fafc);
      border-radius: 12px;
    }

    .mini-review {
      margin: 12px 0;
      padding: 12px;
      background: white;
      border-radius: 8px;
    }

    .mini-review .stars {
      color: #f59e0b;
      margin-bottom: 8px;
    }

    .mini-review p {
      margin: 8px 0;
      font-style: italic;
      font-size: 0.9rem;
    }

    .mini-review .reviewer {
      font-size: 0.8rem;
      color: var(--premium-muted, #64748b);
    }

    /* Video Modal */
    .video-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    }

    .video-modal-content {
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 800px;
      width: 100%;
      position: relative;
    }

    .video-modal-close {
      position: absolute;
      top: 12px;
      right: 12px;
      background: none;
      border: none;
      font-size: 2rem;
      cursor: pointer;
      color: #64748b;
      line-height: 1;
    }

    .video-container {
      margin-top: 16px;
      position: relative;
      padding-bottom: 56.25%;
      height: 0;
      overflow: hidden;
    }

    .video-container iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 8px;
    }

    /* Service Filters */
    .service-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 32px;
      align-items: center;
    }

    .filter-btn {
      padding: 10px 20px;
      border: 2px solid var(--premium-border, rgba(0,0,0,0.1));
      background: white;
      border-radius: 25px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .filter-btn:hover {
      border-color: var(--premium-primary, #0369a1);
      transform: translateY(-2px);
    }

    .filter-btn.active {
      background: var(--premium-primary, #0369a1);
      color: white;
      border-color: var(--premium-primary, #0369a1);
    }

    .filter-count {
      margin-left: auto;
      padding: 8px 16px;
      background: var(--premium-secondary, #f8fafc);
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--premium-primary, #0369a1);
    }

    /* Filter animations */
    .service-card,
    .product-card,
    .item-card {
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    .service-card.visible,
    .product-card.visible,
    .item-card.visible {
      opacity: 1;
      transform: scale(1);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .service-filters {
        justify-content: center;
      }

      .filter-count {
        margin-left: 0;
        width: 100%;
        text-align: center;
      }
    }
  `;
  document.head.appendChild(premiumStyles);

  console.log('✅ Premium Features module loaded');

})();

