// Load site data from embedded window.siteData or fetch site.json
async function loadSite() {
  try {
    let data;
    if (window.siteData) {
      data = window.siteData;
      console.log('Using embedded site data');
    } else {
      console.log('Fetching site data...');
      const response = await fetch('./site.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      data = await response.json();
    }
    
    console.log('Data loaded:', data);
    
    // Inject CSS
    injectStyles(data);
    
    // Hide loading, show content
    document.getElementById('loading').style.display = 'none';
    const mainContent = document.getElementById('main-content');
    mainContent.style.display = 'block';
    
    // Render the site
    const isPro = data.features?.tabbedMenu || data.features?.bookingWidget || data.menu?.sections;
    
    mainContent.innerHTML = renderSite(data, isPro);
    
    // Setup Pro template interactive functions
    setupProFunctions();
    
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('loading').innerHTML = `
      <div style="padding: 60px; text-align: center; max-width: 500px;">
        <div style="font-size: 4rem; margin-bottom: 20px;">⚠️</div>
        <h2 style="background: linear-gradient(135deg, #ef4444, #dc2626); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 2rem; margin-bottom: 16px;">Unable to Load Site</h2>
        <p style="color: #94a3b8; line-height: 1.6;">${error.message}</p>
        <button onclick="location.reload()" style="margin-top: 24px; padding: 12px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 14px; font-weight: 700; cursor: pointer;">Try Again</button>
      </div>
    `;
  }
}

function injectStyles(data) {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --color-bg: #0a0a0f;
      --color-surface: rgba(255, 255, 255, 0.03);
      --color-card: rgba(255, 255, 255, 0.06);
      --color-text: #f8fafc;
      --color-muted: #94a3b8;
      --color-primary: ${data.themeVars?.['color-primary'] || '#6366f1'};
      --color-primary-light: #818cf8;
      --color-primary-dark: #4f46e5;
      --color-accent: ${data.themeVars?.['color-accent'] || '#8b5cf6'};
      --color-accent-light: #a78bfa;
      --color-success: ${data.themeVars?.['color-success'] || '#10b981'};
      --color-warning: ${data.themeVars?.['color-warning'] || '#f59e0b'};
      --radius: 20px;
      --radius-lg: 28px;
      --shadow-glow: 0 0 40px rgba(99, 102, 241, 0.3);
      --shadow-soft: 0 20px 60px rgba(0, 0, 0, 0.5);
      --shadow-subtle: 0 8px 32px rgba(0, 0, 0, 0.3);
      --spacing-xs: 6px;
      --spacing-sm: 12px;
      --spacing-md: 20px;
      --spacing-lg: 32px;
      --spacing-xl: 48px;
      --spacing-2xl: 72px;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes gradientShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0; 
      padding: 0; 
      background: linear-gradient(135deg, #0a0a0f 0%, #1a0f2e 50%, #0a0a0f 100%);
      background-size: 200% 200%;
      animation: gradientShift 15s ease infinite;
      color: var(--color-text);
      line-height: 1.6;
      font-size: 16px;
      position: relative;
      overflow-x: hidden;
    }
    
    body::before {
      content: '';
      position: fixed;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background-image: 
        radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 70%);
      animation: float 20s ease-in-out infinite;
      pointer-events: none;
      z-index: 0;
    }
    
    .container { 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: var(--spacing-lg);
      position: relative;
      z-index: 1;
    }
    
    .glass {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    
    .card { 
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius);
      padding: var(--spacing-lg);
      box-shadow: var(--shadow-subtle);
      margin: var(--spacing-lg) 0;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      animation: fadeInUp 0.6s ease-out;
    }
    
    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
      transition: left 0.6s;
    }
    
    .card:hover::before {
      left: 100%;
    }
    
    .card:hover { 
      transform: translateY(-8px) scale(1.02);
      box-shadow: 0 20px 60px rgba(99, 102, 241, 0.3),
                  0 0 0 1px rgba(99, 102, 241, 0.3);
      border-color: rgba(99, 102, 241, 0.5);
    }
    
    .btn { 
      display: inline-flex; 
      align-items: center; 
      gap: var(--spacing-sm); 
      padding: var(--spacing-md) var(--spacing-xl); 
      border-radius: 14px;
      text-decoration: none; 
      font-weight: 700; 
      border: 2px solid transparent; 
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-size: 1rem;
      position: relative;
      overflow: hidden;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 0.9rem;
      cursor: pointer;
    }
    
    .btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s;
    }
    
    .btn:hover::before {
      left: 100%;
    }
    
    .btn-primary { 
      background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
      color: white;
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
      border-color: rgba(255, 255, 255, 0.2);
    }
    
    .btn-primary:hover { 
      transform: translateY(-3px) scale(1.05);
      box-shadow: 0 16px 48px rgba(99, 102, 241, 0.6);
    }
    
    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: var(--color-text);
      border-color: rgba(255, 255, 255, 0.2);
    }
    
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-3px);
    }
    
    .hero {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-2xl);
      align-items: center;
      min-height: 80vh;
      padding: var(--spacing-2xl) 0;
    }
    
    .hero-content {
      animation: fadeInUp 0.8s ease-out;
    }
    
    .eyebrow {
      display: inline-block;
      padding: var(--spacing-sm) var(--spacing-md);
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 50px;
      color: var(--color-primary-light);
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: var(--spacing-lg);
      letter-spacing: 0.5px;
    }
    
    .hero h1 {
      font-size: 3.5rem;
      font-weight: 900;
      line-height: 1.1;
      margin-bottom: var(--spacing-lg);
      background: linear-gradient(135deg, var(--color-text) 0%, var(--color-primary-light) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .hero p {
      font-size: 1.2rem;
      color: var(--color-muted);
      margin-bottom: var(--spacing-xl);
      line-height: 1.8;
    }
    
    .hero-image-wrapper {
      position: relative;
      animation: fadeInUp 1s ease-out 0.2s both;
    }
    
    .hero-image-wrapper img {
      width: 100%;
      border-radius: var(--radius-lg);
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.5),
                  0 0 0 1px rgba(255, 255, 255, 0.1);
      transition: all 0.5s;
    }
    
    .hero-image-wrapper:hover img {
      transform: translateY(-10px) scale(1.02);
      box-shadow: 0 40px 110px rgba(99, 102, 241, 0.4);
    }
    
    .section-header {
      text-align: center;
      margin-bottom: var(--spacing-2xl);
    }
    
    .section-header h2 {
      font-size: 2.5rem;
      font-weight: 900;
      margin-bottom: var(--spacing-md);
      background: linear-gradient(135deg, var(--color-text), var(--color-primary-light));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--spacing-lg);
      margin: var(--spacing-xl) 0;
    }
    
    .product-card img {
      width: 100%;
      height: 250px;
      object-fit: cover;
      border-radius: var(--radius);
      margin-bottom: var(--spacing-md);
      transition: all 0.4s;
    }
    
    .product-card:hover img {
      transform: scale(1.1);
      box-shadow: 0 20px 60px rgba(99, 102, 241, 0.4);
    }
    
    .product-card h3 {
      font-size: 1.4rem;
      font-weight: 700;
      margin-bottom: var(--spacing-sm);
      color: var(--color-text);
    }
    
    .price-tag {
      display: inline-block;
      font-size: 1.8rem;
      font-weight: 900;
      background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: var(--spacing-sm) 0;
    }
    
    .muted { color: var(--color-muted); }
    .text-center { text-align: center; }
    
    header {
      position: sticky;
      top: 0;
      backdrop-filter: blur(20px);
      background: rgba(10, 10, 15, 0.8);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: var(--spacing-md) 0;
      z-index: 100;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
    }
    
    header h1 {
      font-size: 1.8rem;
      font-weight: 900;
      margin: 0;
      background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    nav a {
      color: var(--color-muted);
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s;
      padding: 8px 16px;
      border-radius: 8px;
    }
    
    nav a:hover {
      color: var(--color-primary-light);
      background: rgba(99, 102, 241, 0.1);
    }
    
    footer {
      text-align: center;
      padding: var(--spacing-2xl) 0;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: var(--spacing-2xl);
      background: linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.05) 100%);
    }
    
    /* Pro Template Styles */
    .pro-tabs {
      display: flex;
      gap: var(--spacing-sm);
      border-bottom: 2px solid rgba(255,255,255,0.1);
      margin-bottom: var(--spacing-xl);
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    .pro-tab {
      padding: var(--spacing-md) var(--spacing-lg);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      white-space: nowrap;
      font-weight: 600;
      color: var(--color-muted);
      border: none;
      background: none;
      font-size: 1.1rem;
    }
    
    .pro-tab:hover {
      color: var(--color-primary-light);
      background: rgba(99, 102, 241, 0.1);
      border-radius: 8px;
    }
    
    .pro-tab.active {
      color: var(--color-primary-light);
    }
    
    .pro-tab.active::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
      box-shadow: 0 0 20px var(--color-primary);
    }
    
    .pro-tab-content {
      display: none;
      animation: fadeInUp 0.4s ease-out;
    }
    
    .pro-tab-content.active {
      display: block;
    }
    
    .pro-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
      z-index: 1000;
      padding: var(--spacing-lg);
      overflow-y: auto;
    }
    
    .pro-modal.active {
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-out;
    }
    
    .pro-modal-content {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
      backdrop-filter: blur(30px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: var(--radius-lg);
      padding: var(--spacing-2xl);
      max-width: 800px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.5);
      position: relative;
      animation: slideUp 0.3s ease-out;
    }
    
    .pro-modal-close {
      position: absolute;
      top: var(--spacing-md);
      right: var(--spacing-md);
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1.5rem;
      color: var(--color-text);
      transition: all 0.3s;
    }
    
    .pro-modal-close:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: rotate(90deg);
    }
    
    .pro-section {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
      border-radius: var(--radius);
      padding: var(--spacing-xl);
      margin-bottom: var(--spacing-lg);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      transition: all 0.3s;
    }
    
    .pro-section:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(99, 102, 241, 0.2);
      border-color: rgba(99, 102, 241, 0.3);
    }
    
    .booking-widget {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
      border: 2px solid rgba(99, 102, 241, 0.3);
      border-radius: var(--radius-lg);
      padding: var(--spacing-xl);
      text-align: center;
      margin: var(--spacing-xl) 0;
    }
    
    .gallery-filters {
      display: flex;
      gap: var(--spacing-sm);
      margin-bottom: var(--spacing-lg);
      flex-wrap: wrap;
    }
    
    .gallery-filter {
      padding: var(--spacing-sm) var(--spacing-lg);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      color: var(--color-muted);
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 600;
    }
    
    .gallery-filter:hover,
    .gallery-filter.active {
      background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
      color: white;
      border-color: transparent;
      transform: translateY(-2px);
    }
    
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: var(--spacing-md);
    }
    
    .gallery-item {
      border-radius: var(--radius);
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .gallery-item:hover {
      transform: scale(1.05);
      box-shadow: 0 20px 60px rgba(99, 102, 241, 0.4);
    }
    
    .gallery-item img {
      width: 100%;
      height: 250px;
      object-fit: cover;
      display: block;
    }
    
    @media (max-width: 900px) {
      .hero { 
        grid-template-columns: 1fr;
        gap: var(--spacing-xl);
        min-height: auto;
      }
      .container { padding: var(--spacing-md); }
      .grid { grid-template-columns: 1fr; }
      .hero h1 { font-size: 2.5rem; }
    }
  `;
  document.head.appendChild(style);
}

function renderSite(data, isPro) {
  return `
    <!-- Header -->
    <header>
      <div class="container" style="display: flex; justify-content: space-between; align-items: center;">
        <h1>${data.brand?.name || 'Business Name'}</h1>
        <nav style="display: flex; gap: 8px;">
          ${data.nav?.map(item => `<a href="${item.href}">${item.label}</a>`).join('') || ''}
        </nav>
      </div>
    </header>
    
    <div class="container">
      <!-- Hero Section -->
      <section class="hero">
        <div class="hero-content">
          ${data.hero?.eyebrow ? `<span class="eyebrow">${data.hero.eyebrow}</span>` : ''}
          <h1>${data.hero?.title || 'Welcome to ' + (data.brand?.name || 'Our Business')}</h1>
          <p>${data.hero?.subtitle || 'Discover amazing products and services'}</p>
          <div style="display: flex; gap: var(--spacing-md); flex-wrap: wrap;">
            ${data.hero?.cta?.map(btn => `
              <a href="${btn.href}" class="btn ${btn.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}">
                ${btn.label}
              </a>
            `).join('') || ''}
          </div>
        </div>
        ${data.hero?.image ? `
          <div class="hero-image-wrapper">
            <img src="${data.hero.image}" alt="${data.hero.imageAlt || data.brand?.name || ''}" />
          </div>
        ` : ''}
      </section>
      
      <!-- Booking Widget (Pro) -->
      ${data.features?.bookingWidget?.enabled ? `
        <section id="booking" class="booking-widget">
          <h2 style="margin-bottom: var(--spacing-md);">📅 Reserve Your Table</h2>
          <p class="muted" style="margin-bottom: var(--spacing-lg);">Book your reservation online or call us</p>
          <a href="${data.features.bookingWidget.url}" target="_blank" class="btn btn-primary">
            Book Now
          </a>
        </section>
      ` : ''}
      
      <!-- Tabbed Menu Section (Pro) -->
      ${data.menu?.sections?.length ? `
        <section id="menu" style="margin-top: var(--spacing-2xl);">
          <div class="section-header">
            <h2>${data.menu.title || 'Our Menu'}</h2>
            <p>${data.menu.subtitle || 'Explore our offerings'}</p>
          </div>
          
          <div class="pro-tabs">
            ${data.menu.sections.map((section, index) => `
              <button class="pro-tab ${index === 0 ? 'active' : ''}" data-tab="${section.id}">
                ${section.name}
              </button>
            `).join('')}
          </div>
          
          ${data.menu.sections.map((section, index) => `
            <div class="pro-tab-content ${index === 0 ? 'active' : ''}" id="tab-${section.id}">
              ${section.description ? `<p class="muted text-center" style="margin-bottom: var(--spacing-xl);">${section.description}</p>` : ''}
              <div class="grid">
                ${section.items.map(item => `
                  <div class="card product-card">
                    ${item.image ? `<img src="${item.image}" alt="${item.imageAlt || item.name}" />` : ''}
                    <h3>${item.name}</h3>
                    ${item.price ? `<div class="price-tag">$${item.price}</div>` : ''}
                    <p class="muted">${item.description || ''}</p>
                    ${item.dietary?.length ? `<div style="margin-top: var(--spacing-sm);"><small class="muted">${item.dietary.join(' • ')}</small></div>` : ''}
                    ${item.chefRecommended ? `<div style="margin-top: var(--spacing-xs);"><span style="font-size: 0.85rem;">⭐ Chef Recommended</span></div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </section>
      ` : ''}
      
      <!-- Chef's Specials (Pro) -->
      ${data.chefSpecials?.items?.length ? `
        <section class="pro-section" style="margin-top: var(--spacing-2xl);">
          <div class="section-header">
            <h2>${data.chefSpecials.title || "Chef's Specials"}</h2>
            ${data.chefSpecials.subtitle ? `<p>${data.chefSpecials.subtitle}</p>` : ''}
          </div>
          <div class="grid">
            ${data.chefSpecials.items.map(item => `
              <div class="card">
                ${item.image ? `<img src="${item.image}" alt="${item.imageAlt || item.name}" style="border-radius: var(--radius); margin-bottom: var(--spacing-md); width: 100%; height: 250px; object-fit: cover;" />` : ''}
                <h3>${item.name}</h3>
                ${item.price ? `<div class="price-tag">$${item.price}</div>` : ''}
                <p class="muted">${item.description || ''}</p>
                ${item.availability ? `<div style="margin-top: var(--spacing-sm);"><span style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; padding: 4px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 600;">${item.availability}</span></div>` : ''}
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}
      
      <!-- Private Events/Dining (Pro) -->
      ${data.privateEvents?.rooms?.length ? `
        <section id="private" class="pro-section" style="margin-top: var(--spacing-2xl);">
          <div class="section-header">
            <h2>${data.privateEvents.title || 'Private Events'}</h2>
            ${data.privateEvents.subtitle ? `<p>${data.privateEvents.subtitle}</p>` : ''}
          </div>
          <div class="grid">
            ${data.privateEvents.rooms.map((room, index) => `
              <div class="card" style="cursor: pointer;" data-modal="${index}">
                ${room.image ? `<img src="${room.image}" alt="${room.imageAlt || room.name}" style="border-radius: var(--radius); margin-bottom: var(--spacing-md); width: 100%; height: 250px; object-fit: cover;" />` : ''}
                <h3>${room.name}</h3>
                <p class="muted"><strong>${room.capacity}</strong></p>
                <p class="muted">${room.description}</p>
                <button class="btn btn-secondary" style="margin-top: var(--spacing-md); width: 100%;">Learn More</button>
              </div>
            `).join('')}
          </div>
        </section>
        
        <!-- Private Event Modals -->
        ${data.privateEvents.rooms.map((room, index) => `
          <div class="pro-modal" id="private-modal-${index}">
            <div class="pro-modal-content">
              <button class="pro-modal-close" data-close="${index}">×</button>
              <h2 style="margin-bottom: var(--spacing-md);">${room.name}</h2>
              ${room.image ? `<img src="${room.image}" alt="${room.imageAlt || room.name}" style="width: 100%; border-radius: var(--radius); margin-bottom: var(--spacing-lg);" />` : ''}
              <p><strong>Capacity:</strong> ${room.capacity}</p>
              <p class="muted" style="margin: var(--spacing-md) 0;">${room.description}</p>
              <h3 style="margin: var(--spacing-lg) 0 var(--spacing-md) 0;">Features</h3>
              <ul style="list-style: none; padding: 0;">
                ${room.features?.map(feature => `<li style="padding: var(--spacing-sm) 0; border-bottom: 1px solid rgba(255,255,255,0.1);">✓ ${feature}</li>`).join('')}
              </ul>
              <a href="#contact" class="btn btn-primary" style="width: 100%; margin-top: var(--spacing-xl); justify-content: center;" data-close="${index}">
                Contact Us to Book
              </a>
            </div>
          </div>
        `).join('')}
      ` : ''}
      
      <!-- Gallery with Filters (Pro) -->
      ${data.gallery?.categories?.length ? `
        <section id="gallery" style="margin-top: var(--spacing-2xl);">
          <div class="section-header">
            <h2>${data.gallery.title || 'Gallery'}</h2>
          </div>
          
          <div class="gallery-filters">
            <button class="gallery-filter active" data-filter="all">All</button>
            ${data.gallery.categories.map(cat => `
              <button class="gallery-filter" data-filter="${cat.name.toLowerCase()}">${cat.name}</button>
            `).join('')}
          </div>
          
          <div class="gallery-grid">
            ${data.gallery.categories.flatMap(cat => 
              cat.images.map(img => `
                <div class="gallery-item" data-category="${cat.name.toLowerCase()}">
                  <img src="${img.url}" alt="${img.alt}" />
                </div>
              `)
            ).join('')}
          </div>
        </section>
      ` : ''}
      
      <!-- Team Section (Pro) -->
      ${data.team?.members?.length ? `
        <section style="margin-top: var(--spacing-2xl);">
          <div class="section-header">
            <h2>${data.team.title || 'Our Team'}</h2>
            ${data.team.subtitle ? `<p>${data.team.subtitle}</p>` : ''}
          </div>
          <div class="grid">
            ${data.team.members.map(member => `
              <div class="card pro-section">
                ${member.image ? `<img src="${member.image}" alt="${member.imageAlt || member.name}" style="width: 100%; height: 300px; object-fit: cover; border-radius: var(--radius); margin-bottom: var(--spacing-md);" />` : ''}
                <h3>${member.name}</h3>
                <p style="color: var(--color-primary-light); font-weight: 600; margin-bottom: var(--spacing-md);">${member.title}</p>
                <p class="muted">${member.bio}</p>
                ${member.credentials?.length ? `
                  <div style="margin-top: var(--spacing-md);">
                    ${member.credentials.map(cred => `<span style="display: inline-block; background: rgba(99, 102, 241, 0.2); color: var(--color-primary-light); padding: 4px 12px; border-radius: 8px; font-size: 0.85rem; margin: 4px;">${cred}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}
      
      <!-- Stats Section (Pro) -->
      ${data.stats?.items?.length ? `
        <section class="pro-section" style="margin-top: var(--spacing-2xl);">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-xl); text-align: center;">
            ${data.stats.items.map(stat => `
              <div>
                <div style="font-size: 3rem; font-weight: 900; background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: var(--spacing-sm);">${stat.number}</div>
                <div class="muted" style="font-weight: 600;">${stat.label}</div>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}
      
      <!-- Testimonials -->
      ${data.testimonials?.items?.length ? `
        <section style="margin-top: var(--spacing-2xl);">
          <div class="section-header">
            <h2>${data.testimonials.title || 'Testimonials'}</h2>
            ${data.testimonials.subtitle ? `<p>${data.testimonials.subtitle}</p>` : ''}
          </div>
          <div class="grid">
            ${data.testimonials.items.map(item => `
              <div class="card">
                <p style="font-size: 1.1rem; line-height: 1.8; margin-bottom: var(--spacing-md);">"${item.text}"</p>
                <div style="display: flex; align-items: center; gap: var(--spacing-md);">
                  ${item.image ? `<img src="${item.image}" alt="${item.imageAlt || item.author}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" />` : ''}
                  <div>
                    <div style="font-weight: 700;">${item.author}</div>
                    <div class="muted" style="font-size: 0.9rem;">${item.location || ''}</div>
                  </div>
                </div>
                ${item.rating ? `<div style="color: #fbbf24; margin-top: var(--spacing-sm);">${'★'.repeat(item.rating)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}
      
      <!-- Contact Section -->
      ${data.contact ? `
        <section id="contact" class="card glass" style="margin-top: var(--spacing-2xl);">
          <div class="section-header">
            <h2>${data.contact.title || 'Get In Touch'}</h2>
            ${data.contact.subtitle ? `<p>${data.contact.subtitle}</p>` : ''}
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--spacing-lg); text-align: center;">
            ${data.contact.phone ? `
              <div>
                <div style="font-size: 2rem; margin-bottom: var(--spacing-sm);">📞</div>
                <strong style="display: block; margin-bottom: var(--spacing-xs);">Phone</strong>
                <a href="tel:${data.contact.phone}" style="color: var(--color-primary-light); text-decoration: none; font-weight: 600;">${data.contact.phone}</a>
              </div>
            ` : ''}
            ${data.contact.email ? `
              <div>
                <div style="font-size: 2rem; margin-bottom: var(--spacing-sm);">✉️</div>
                <strong style="display: block; margin-bottom: var(--spacing-xs);">Email</strong>
                <a href="mailto:${data.contact.email}" style="color: var(--color-primary-light); text-decoration: none; font-weight: 600;">${data.contact.email}</a>
              </div>
            ` : ''}
            ${data.contact.address ? `
              <div>
                <div style="font-size: 2rem; margin-bottom: var(--spacing-sm);">📍</div>
                <strong style="display: block; margin-bottom: var(--spacing-xs);">Location</strong>
                <span style="color: var(--color-muted);">${data.contact.address}</span>
              </div>
            ` : ''}
          </div>
          ${data.contact.hours?.items?.length ? `
            <div style="margin-top: var(--spacing-xl); text-align: center;">
              <h3 style="margin-bottom: var(--spacing-md);">${data.contact.hours.title || 'Hours'}</h3>
              ${data.contact.hours.items.map(hour => `<p class="muted">${hour}</p>`).join('')}
              ${data.contact.hours.note ? `<p style="margin-top: var(--spacing-md); font-style: italic; color: var(--color-primary-light);">${data.contact.hours.note}</p>` : ''}
            </div>
          ` : ''}
        </section>
      ` : ''}
    </div>
    
    <!-- Footer -->
    <footer>
      <div class="container">
        <p class="muted">${data.footer?.text || '© ' + new Date().getFullYear() + ' ' + (data.brand?.name || 'Business Name') + '. All rights reserved.'}</p>
        ${data.footer?.awards?.length ? `
          <div style="margin-top: var(--spacing-md); display: flex; flex-wrap: wrap; gap: var(--spacing-md); justify-content: center;">
            ${data.footer.awards.map(award => `<span style="font-size: 0.9rem; color: var(--color-primary-light);">🏆 ${award}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    </footer>
  `;
}

function setupProFunctions() {
  // Tab switching
  document.querySelectorAll('.pro-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      
      document.querySelectorAll('.pro-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.pro-tab-content').forEach(c => c.classList.remove('active'));
      
      this.classList.add('active');
      document.getElementById('tab-' + tabId).classList.add('active');
    });
  });
  
  // Modal handling
  document.querySelectorAll('[data-modal]').forEach(trigger => {
    trigger.addEventListener('click', function() {
      const modalIndex = this.getAttribute('data-modal');
      document.getElementById('private-modal-' + modalIndex).classList.add('active');
    });
  });
  
  document.querySelectorAll('[data-close]').forEach(closer => {
    closer.addEventListener('click', function(e) {
      e.preventDefault();
      const modalIndex = this.getAttribute('data-close');
      document.getElementById('private-modal-' + modalIndex).classList.remove('active');
    });
  });
  
  // Gallery filtering
  document.querySelectorAll('.gallery-filter').forEach(filter => {
    filter.addEventListener('click', function() {
      const category = this.getAttribute('data-filter');
      
      document.querySelectorAll('.gallery-filter').forEach(f => f.classList.remove('active'));
      this.classList.add('active');
      
      document.querySelectorAll('.gallery-item').forEach(item => {
        if (category === 'all' || item.getAttribute('data-category') === category) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

// Start loading when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSite);
} else {
  loadSite();
}
