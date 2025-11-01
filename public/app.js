/* Enhanced client-side renderer supporting premium templates */
(async function(){
  const state = { config:null, timers:[] };

  const qs = (sel, el=document) => el.querySelector(sel);
  const qsa = (sel, el=document) => Array.from(el.querySelectorAll(sel));
  const el = (tag, attrs={}, children=[]) => {
    const node = document.createElement(tag);
    for(const [k,v] of Object.entries(attrs)){
      if(k === 'class'){ node.className = v; }
      else if(k.startsWith('on') && typeof v === 'function'){ node.addEventListener(k.slice(2), v); }
      else if(v !== undefined && v !== null){ node.setAttribute(k, v); }
    }
    for(const child of [].concat(children)){
      if(child == null) continue;
      if(typeof child === 'string'){ node.appendChild(document.createTextNode(child)); }
      else node.appendChild(child);
    }
    return node;
  };

  const contentRoot = document.getElementById('content');
  const footerRoot = document.getElementById('footer-content');
  const brandNameEl = document.getElementById('brand-name');
  const brandLogoEl = document.getElementById('brand-logo');
  const navLinksEl = document.getElementById('nav-links');
  const navToggle = document.getElementById('nav-toggle');
  const siteNav = document.getElementById('site-nav');
  const headerInner = qs('.header-inner');

  const ICON_FALLBACK = '?';

  navToggle?.addEventListener('click', ()=>{
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    siteNav.classList.toggle('open');
  });

  function registerTimer(id){ state.timers.push(id); }
  function clearTimers(){ state.timers.forEach(id => clearInterval(id)); state.timers = []; }

  async function loadConfig(){
    const params = new URLSearchParams(window.location.search);
    const tpl = params.get('template');
    if(tpl){
      try{
        const resTpl = await fetch(`/data/templates/${encodeURIComponent(tpl)}.json`, { cache:'no-cache' });
        if(resTpl.ok) return resTpl.json();
      }catch(err){ console.warn('Template fetch failed, falling back to site.json', err); }
    }
    const res = await fetch('./data/site.json', { cache:'no-cache' });
    if(!res.ok) throw new Error('Failed to load data/site.json');
      return res.json();
  }

  function setThemeFromConfig(cfg){
    const root = document.documentElement;
    if(cfg.themeVars){
      for(const [k,v] of Object.entries(cfg.themeVars)){
        root.style.setProperty(`--${k}`, v);
      }
    }
    if(cfg.styles){
      const styles = cfg.styles;
      const map = {
        '--color-primary': styles.primaryColor,
        '--color-primary-600': styles.primaryColorDark || styles.primaryColor,
        '--color-accent': styles.accentColor,
        '--premium-primary': styles.primaryColor,
        '--premium-accent': styles.accentColor || styles.primaryColor,
        '--premium-secondary': styles.secondaryColor || styles.neutralColor,
        '--premium-text': styles.textColor || '#0f172a',
        '--premium-muted': styles.mutedColor || '#64748b',
        '--premium-surface': styles.surfaceColor || 'rgba(255,255,255,0.9)',
        '--premium-border': styles.borderColor || 'rgba(15,23,42,0.08)',
        '--premium-radius': styles.radius || '18px',
        '--premium-background': styles.backgroundColor || '#f8fafc'
      };
      for(const [cssVar,value] of Object.entries(map)){
        if(value) root.style.setProperty(cssVar, value);
      }
    }
  }

  function cleanupPremiumHeader(){
    qs('#premium-call-button')?.remove();
    qs('#premium-mobile-call')?.remove();
    headerInner?.classList.remove('premium-header');
    document.body.classList.remove('premium-template');
    footerRoot.classList.remove('premium-footer');
  }

  function setDocumentMeta(cfg){
    const title = cfg.meta?.pageTitle || cfg.brand?.name || cfg.meta?.businessName;
    if(title) document.title = title;
    if(cfg.meta?.metaDescription){
      let meta = qs('meta[name="description"]');
      if(!meta){
        meta = document.createElement('meta');
        meta.setAttribute('name','description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', cfg.meta.metaDescription);
    }
  }

  function renderSite(cfg){
    clearTimers();
    cleanupPremiumHeader();
    contentRoot.innerHTML = '';
    footerRoot.innerHTML = '';
    navLinksEl.innerHTML = '';
    setThemeFromConfig(cfg);
    setDocumentMeta(cfg);

    if(Array.isArray(cfg.sections) && cfg.sections.length){
      document.body.classList.add('premium-template');
      renderPremiumSite(cfg);
    }else{
      renderClassicSite(cfg);
    }
  }

  /* ----------------------- classic renderer ------------------------ */

  function sectionWrapper(id, classes='section'){
    const section = el('section', { id, class: classes });
    const container = el('div', { class:'container' });
    section.appendChild(container);
    return section;
  }

  function renderClassicHeader(cfg){
    if(cfg.brand?.name) brandNameEl.textContent = cfg.brand.name;
    if(cfg.brand?.logo){
      brandLogoEl.src = cfg.brand.logo;
      brandLogoEl.alt = cfg.brand.alt || cfg.brand.name || 'Logo';
    }
    navLinksEl.innerHTML = '';
    const items = [...(cfg.nav || [])];
    
    // Auto-add nav items for optional sections if they exist and aren't already in nav
    const existingHrefs = items.map(i => i.href);
    if(Array.isArray(cfg.pages) && cfg.pages.length && !existingHrefs.includes('#pages')) {
      items.push({ label:'Pages', href:'#pages' });
    }
    if(Array.isArray(cfg.products) && cfg.products.length && !existingHrefs.includes('#products')) {
      items.push({ label:'Products', href:'#products' });
    }
    
    items.forEach(item => {
      const li = el('li');
      li.appendChild(el('a', { href:item.href || '#' }, [item.label || '']));
      navLinksEl.appendChild(li);
    });
    
    // Mobile menu auto-close functionality
    navLinksEl.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if(window.innerWidth <= 720 && siteNav?.classList.contains('open')){
          siteNav.classList.remove('open');
          if(navToggle) navToggle.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  function renderClassicHero(cfg){
    if(!cfg.hero) return;
    const sec = sectionWrapper('hero');
    const container = sec.firstChild;
    const grid = el('div', { class:'hero' });
    const left = el('div', { class:'hero-card' }, [
      el('div', { class:'eyebrow' }, [cfg.hero.eyebrow || '']),
      el('h1', { class:'hero-title' }, [cfg.hero.title || '']),
      el('p', { class:'hero-subtitle' }, [cfg.hero.subtitle || '']),
      el('div', { class:'cta-row' }, (cfg.hero.cta || []).map(btn => el('a', {
        class: btn.variant === 'secondary' ? 'btn btn-secondary' : 'btn btn-primary',
        href: btn.href || '#'
      }, [btn.label || ''])))
    ]);
    grid.appendChild(left);
    if(cfg.hero.image){
      grid.appendChild(el('img', { src: cfg.hero.image, alt: cfg.hero.imageAlt || '' }));
    }
    container.appendChild(grid);
    contentRoot.appendChild(sec);
  }

  function renderClassicServices(cfg){
    if(!cfg.services) return;
    const sec = sectionWrapper('services');
    const container = sec.firstChild;
    container.appendChild(el('h2', { class:'section-title' }, [cfg.services.title || 'Services']));
    if(cfg.services.subtitle) container.appendChild(el('p', { class:'section-subtitle' }, [cfg.services.subtitle]));
    const grid = el('div', { class:'cards' }, (cfg.services.items || []).map(item => el('div', { class:'card' }, [
      el('h3', {}, [item.title || '']),
      el('p', {}, [item.description || ''])
    ])));
    container.appendChild(grid);
    contentRoot.appendChild(sec);
  }

  function renderClassicAbout(cfg){
    if(!cfg.about) return;
    const sec = sectionWrapper('about');
    const container = sec.firstChild;
    container.appendChild(el('h2', { class:'section-title' }, [cfg.about.title || 'About']));
    if(cfg.about.body) container.appendChild(el('p', {}, [cfg.about.body]));
    contentRoot.appendChild(sec);
  }

  function renderClassicTestimonials(cfg){
    if(!cfg.testimonials) return;
    const sec = sectionWrapper('reviews', 'section testimonials-section');
    const container = sec.firstChild;
    container.appendChild(el('h2', { class:'section-title' }, [cfg.testimonials.title || 'Testimonials']));
    if(cfg.testimonials.subtitle) container.appendChild(el('p', { class:'section-subtitle' }, [cfg.testimonials.subtitle]));
    
    const items = cfg.testimonials.items || [];
    // Check if using enhanced format (with rating, image, etc.) or simple format (with quote)
    const isEnhanced = items.length > 0 && (items[0].rating || items[0].text);
    
    if(isEnhanced){
      // Enhanced testimonials with ratings, photos, locations
      const grid = el('div', { class:'grid-3' }, items.map(item => {
        const card = el('div', { class:'testimonial-card card' });
        
        // Star rating
        if(item.rating){
          const stars = el('div', { class:'testimonial-stars' });
          for(let i = 0; i < 5; i++){
            stars.appendChild(el('span', { class: i < item.rating ? 'star-filled' : 'star-empty' }, ['★']));
          }
          card.appendChild(stars);
        }
        
        // Testimonial text
        card.appendChild(el('p', { class:'testimonial-text' }, [item.text || item.quote || '']));
        
        // Author section
        const author = el('div', { class:'testimonial-author' });
        if(item.image){
          author.appendChild(el('img', { src: item.image, alt: item.imageAlt || item.author, class:'testimonial-avatar' }));
        }
        const info = el('div', { class:'testimonial-info' }, [
          el('div', { class:'testimonial-name' }, [item.author || '']),
          item.location ? el('div', { class:'testimonial-location muted' }, [item.location]) : null
        ].filter(Boolean));
        author.appendChild(info);
        card.appendChild(author);
        
        return card;
      }));
      container.appendChild(grid);
    }else{
      // Simple testimonials (legacy format)
      const grid = el('div', { class:'grid-3' }, items.map(item => el('div', { class:'card' }, [
        el('p', {}, [`"${item.quote || ''}"`]),
        el('p', { class:'muted mt-2' }, ['— ' + (item.author || '')])
    ])));
    container.appendChild(grid);
  }

    contentRoot.appendChild(sec);
  }

  function renderClassicPricing(cfg){
    if(!cfg.pricing) return;
    const sec = sectionWrapper('pricing');
    const container = sec.firstChild;
    container.appendChild(el('h2', { class:'section-title' }, [cfg.pricing.title || 'Pricing']));
    const grid = el('div', { class:'grid-3' }, (cfg.pricing.plans || []).map(plan => el('div', { class:'card' }, [
      el('h3', {}, [plan.name || 'Plan']),
      el('p', { class:'mt-2' }, [plan.description || '']),
      el('p', { class:'mt-3' }, [plan.price != null ? `$${plan.price}` : '']),
      el('div', { class:'mt-3' }, [
        el('a', { class:'btn btn-primary', href:plan.cta?.href || '#' }, [plan.cta?.label || 'Choose plan'])
      ])
    ])));
    container.appendChild(grid);
    contentRoot.appendChild(sec);
  }

  function renderClassicContact(cfg){
    if(!cfg.contact) return;
    const sec = sectionWrapper('contact');
    const container = sec.firstChild;
    container.appendChild(el('h2', { class:'section-title' }, [cfg.contact.title || 'Contact']));
    if(cfg.contact.subtitle) container.appendChild(el('p', { class:'section-subtitle' }, [cfg.contact.subtitle]));
    const buttons = [];
    if(cfg.contact.email) buttons.push(el('a', { href:`mailto:${cfg.contact.email}`, class:'btn btn-secondary mt-3' }, ['Email us']));
    if(cfg.contact.phone) buttons.push(el('a', { href:`tel:${cfg.contact.phone}`, class:'btn btn-secondary mt-3' }, ['Call us']));
    container.appendChild(el('div', { class:'cta-row' }, buttons));
    contentRoot.appendChild(sec);
  }

  function renderClassicPages(cfg){
    if(!Array.isArray(cfg.pages) || !cfg.pages.length) return;
    const sec = sectionWrapper('pages');
    const container = sec.firstChild;
    container.appendChild(el('h2', { class:'section-title' }, ['Pages']));
    const grid = el('div', { class:'grid-2' }, cfg.pages.map(page => el('div', { class:'card' }, [
      el('h3', {}, [page.title || page.slug || 'Page']),
      renderMarkdown(page.body || '')
    ])));
    container.appendChild(grid);
    contentRoot.appendChild(sec);
  }

  function renderClassicProducts(cfg){
    if(!Array.isArray(cfg.products) || !cfg.products.length) return;
    const sec = sectionWrapper('products', 'section products-section');
    const container = sec.firstChild;
    
    // Title and subtitle
    const title = cfg.productsTitle || cfg.products.title || 'Products';
    const subtitle = cfg.productsSubtitle || cfg.products.subtitle;
    container.appendChild(el('h2', { class:'section-title' }, [title]));
    if(subtitle) container.appendChild(el('p', { class:'section-subtitle' }, [subtitle]));
    
    // Get unique categories from products
    const categories = [...new Set(cfg.products.map(p => p.category).filter(Boolean))];
    
    // Filter buttons (if categories exist)
    if(categories.length > 0){
      const filters = el('div', { class:'filter-buttons' }, [
        el('button', { type:'button', class:'filter-btn active', 'data-filter': 'all' }, ['All']),
        ...categories.map(cat => el('button', { type:'button', class:'filter-btn', 'data-filter': cat }, [cat]))
      ]);
      container.appendChild(filters);
    }
    
    // Enhanced product grid
    const grid = el('div', { class:'product-grid grid-3' }, cfg.products.map(prod => {
      const card = el('div', { class:'product-card card', 'data-category': prod.category || 'all' });
      
      // Image
      if(prod.image){
        card.appendChild(el('img', { src: prod.image, alt: prod.imageAlt || prod.name, class:'product-image' }));
      }
      
      // Badge (if popular or new)
      if(prod.popular){
        card.appendChild(el('span', { class:'badge badge-popular' }, ['Popular']));
      }
      
      // Content
      const content = el('div', { class:'card-content' }, [
        el('h3', {}, [prod.name || 'Product']),
        prod.price != null ? el('div', { class:'product-price' }, [`$${prod.price}`]) : null,
        prod.description ? el('p', { class:'product-description' }, [prod.description]) : null
      ].filter(Boolean));
      
      // Meta info (duration, category, etc.)
      const meta = [];
      if(prod.duration) meta.push(prod.duration);
      if(prod.category) meta.push(prod.category);
      if(meta.length > 0){
        content.appendChild(el('div', { class:'product-meta muted' }, [meta.join(' • ')]));
      }
      
      card.appendChild(content);
      
      // CTA button (if settings provided)
      if(cfg.settings && cfg.settings.productCta){
        const ctaHref = cfg.settings.productCtaHref || '#contact';
        card.appendChild(el('a', { 
          class:'btn btn-secondary btn-small', 
          href: ctaHref 
        }, [cfg.settings.productCta]));
      }
      
      return card;
    }));
    
    container.appendChild(grid);
    
    // Filter functionality
    if(categories.length > 0){
      const filterBtns = sec.querySelectorAll('.filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          // Update active button
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          // Filter products
          const filter = btn.getAttribute('data-filter');
          const productCards = grid.querySelectorAll('.product-card');
          productCards.forEach(card => {
            const category = card.getAttribute('data-category');
            if(filter === 'all' || category === filter){
              card.style.display = '';
            }else{
              card.style.display = 'none';
            }
          });
        });
      });
    }
    
    // Settings note (if provided)
    if(cfg.settings && cfg.settings.productNote){
      container.appendChild(el('p', { class:'muted text-center mt-3' }, [cfg.settings.productNote]));
    }
    
    contentRoot.appendChild(sec);
  }

  function renderClassicFooter(cfg){
    footerRoot.innerHTML = '';
    const year = new Date().getFullYear();
    footerRoot.appendChild(el('p', { class:'muted' }, [cfg.footer?.text || `? ${year} ${cfg.brand?.name || ''}. All rights reserved.`]));
  }

  function renderMarkdown(md){
    if(!md) return el('p', {}, ['']);
    const wrapper = el('div', { class:'mt-2' });
    wrapper.innerHTML = md
      .replace(/^###\s?(.*)$/gm, '<h4>$1</h4>')
      .replace(/^##\s?(.*)$/gm, '<h3>$1</h3>')
      .replace(/^#\s?(.*)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
    return wrapper;
  }

  // Optional: Stats section
  function renderClassicStats(cfg){
    if(!cfg.stats || !Array.isArray(cfg.stats.items) || !cfg.stats.items.length) return;
    const sec = sectionWrapper('stats', 'section stats-section');
    const container = sec.firstChild;
    const grid = el('div', { class:'stats-grid' }, cfg.stats.items.map(stat => 
      el('div', { class:'stat-item' }, [
        el('div', { class:'stat-number' }, [stat.number || '0']),
        el('div', { class:'stat-label' }, [stat.label || ''])
      ])
    ));
    container.appendChild(grid);
    contentRoot.appendChild(sec);
  }

  // Optional: Process timeline section
  function renderClassicProcess(cfg){
    if(!cfg.process || !Array.isArray(cfg.process.steps) || !cfg.process.steps.length) return;
    const sec = sectionWrapper('process', 'section process-section');
    const container = sec.firstChild;
    if(cfg.process.title) container.appendChild(el('h2', { class:'section-title' }, [cfg.process.title]));
    if(cfg.process.subtitle) container.appendChild(el('p', { class:'section-subtitle' }, [cfg.process.subtitle]));
    const timeline = el('div', { class:'process-timeline' }, cfg.process.steps.map((step, idx) =>
      el('div', { class:'process-step' }, [
        el('div', { class:'process-number' }, [String(idx + 1)]),
        el('div', { class:'process-content' }, [
          el('h3', {}, [step.title || '']),
          el('p', {}, [step.description || ''])
        ])
      ])
    ));
    container.appendChild(timeline);
    contentRoot.appendChild(sec);
  }

  // Optional: Credentials badges section
  function renderClassicCredentials(cfg){
    if(!cfg.credentials || !Array.isArray(cfg.credentials.items) || !cfg.credentials.items.length) return;
    const sec = sectionWrapper('credentials', 'section credentials-section');
    const container = sec.firstChild;
    if(cfg.credentials.title) container.appendChild(el('h2', { class:'section-title' }, [cfg.credentials.title]));
    if(cfg.credentials.subtitle) container.appendChild(el('p', { class:'section-subtitle' }, [cfg.credentials.subtitle]));
    const grid = el('div', { class:'credentials-grid' }, cfg.credentials.items.map(item =>
      el('div', { class:'credential-badge' }, [
        el('div', { class:'credential-icon' }, [item.icon || '✓']),
        el('div', { class:'credential-name' }, [item.name || '']),
        el('div', { class:'credential-desc' }, [item.description || ''])
      ])
    ));
    container.appendChild(grid);
    contentRoot.appendChild(sec);
  }

  // Optional: Team section
  function renderClassicTeam(cfg){
    if(!cfg.team || !Array.isArray(cfg.team.members) || !cfg.team.members.length) return;
    const sec = sectionWrapper('team', 'section team-section');
    const container = sec.firstChild;
    if(cfg.team.title) container.appendChild(el('h2', { class:'section-title' }, [cfg.team.title]));
    if(cfg.team.subtitle) container.appendChild(el('p', { class:'section-subtitle' }, [cfg.team.subtitle]));
    const grid = el('div', { class:'team-grid' }, cfg.team.members.map(member =>
      el('div', { class:'team-member' }, [
        member.image ? el('img', { src: member.image, alt: member.imageAlt || member.name, class:'team-photo' }) : null,
        el('h3', { class:'team-name' }, [member.name || '']),
        el('div', { class:'team-title' }, [member.title || '']),
        member.bio ? el('p', { class:'team-bio' }, [member.bio]) : null,
        Array.isArray(member.credentials) && member.credentials.length ? 
          el('div', { class:'team-credentials' }, member.credentials.map(cred => el('span', { class:'badge' }, [cred]))) : null
      ].filter(Boolean))
    ));
    container.appendChild(grid);
    contentRoot.appendChild(sec);
  }

  // Optional: FAQ accordion section
  function renderClassicFAQ(cfg){
    if(!cfg.faq || !Array.isArray(cfg.faq.items) || !cfg.faq.items.length) return;
    const sec = sectionWrapper('faq', 'section faq-section');
    const container = sec.firstChild;
    if(cfg.faq.title) container.appendChild(el('h2', { class:'section-title' }, [cfg.faq.title]));
    if(cfg.faq.subtitle) container.appendChild(el('p', { class:'section-subtitle' }, [cfg.faq.subtitle]));
    const accordion = el('div', { class:'accordion' }, cfg.faq.items.map((item, idx) => {
      const accordionItem = el('div', { class:'accordion-item' });
      const header = el('button', { 
        class:'accordion-header', 
        type:'button',
        'aria-expanded': 'false',
        'aria-controls': `faq-content-${idx}`
      }, [
        el('span', {}, [item.question || '']),
        el('span', { class:'accordion-icon' }, ['▼'])
      ]);
      const content = el('div', { 
        class:'accordion-content',
        id: `faq-content-${idx}`,
        'aria-hidden': 'true'
      }, [
        el('p', {}, [item.answer || ''])
      ]);
      
      header.addEventListener('click', () => {
        const isOpen = header.getAttribute('aria-expanded') === 'true';
        header.setAttribute('aria-expanded', String(!isOpen));
        content.setAttribute('aria-hidden', String(isOpen));
        accordionItem.classList.toggle('active', !isOpen);
      });
      
      accordionItem.appendChild(header);
      accordionItem.appendChild(content);
      return accordionItem;
    }));
    container.appendChild(accordion);
    contentRoot.appendChild(sec);
  }

  function renderClassicSite(cfg){
    renderClassicHeader(cfg);
    renderClassicHero(cfg);
    renderClassicStats(cfg);        // Optional: Stats section
    renderClassicServices(cfg);
    renderClassicAbout(cfg);
    renderClassicProcess(cfg);      // Optional: Process timeline
    renderClassicCredentials(cfg);  // Optional: Credentials badges
    renderClassicTeam(cfg);         // Optional: Team section
    renderClassicTestimonials(cfg);
    renderClassicPricing(cfg);
    renderClassicFAQ(cfg);          // Optional: FAQ accordion
    renderClassicContact(cfg);
    renderClassicPages(cfg);
    renderClassicProducts(cfg);
    renderClassicFooter(cfg);
  }

  /* ----------------------- premium helpers -------------------------- */

  function ensurePremiumHeader(cfg){
    headerInner?.classList.add('premium-header');
    if(cfg.meta?.businessName) brandNameEl.textContent = cfg.meta.businessName;
    if(cfg.meta?.logo){
      brandLogoEl.src = cfg.meta.logo;
      brandLogoEl.alt = cfg.meta.logoAlt || cfg.meta.businessName || 'Logo';
    }
    const items = cfg.navigation?.length ? cfg.navigation : [];
    navLinksEl.innerHTML = '';
    items.forEach(item => {
      const li = el('li');
      li.appendChild(el('a', { href:item.href || '#' }, [item.label || '']));
      navLinksEl.appendChild(li);
    });
    if(cfg.meta?.primaryPhone){
      let callBtn = qs('#premium-call-button');
      if(!callBtn){
        callBtn = el('a', { id:'premium-call-button', class:'btn btn-primary premium-call' });
        headerInner?.appendChild(callBtn);
      }
      callBtn.href = `tel:${cfg.meta.primaryPhone}`;
      callBtn.textContent = cfg.meta.primaryPhoneLabel || `Call ${cfg.meta.primaryPhone}`;

      let mobileCall = qs('#premium-mobile-call');
      if(!mobileCall){
        mobileCall = el('a', { id:'premium-mobile-call', class:'premium-mobile-call' });
        document.body.appendChild(mobileCall);
      }
      mobileCall.href = `tel:${cfg.meta.primaryPhone}`;
      mobileCall.textContent = cfg.meta.mobileCallLabel || 'Call Now';
    }
  }

  function createPremiumSection(section, classes='premium-section'){
    const sectionId = section?.id || section?.type || `section-${Math.random().toString(36).slice(2)}`;
    const sectionEl = el('section', { id:sectionId, class:`${classes}`.trim() });
    const container = el('div', { class:'container premium-container' });
    sectionEl.appendChild(container);
    return { sectionEl, container };
  }

  function renderHeroGeneric(section, variant){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section hero-block ${variant || section.type}`);
    const heroContent = el('div', { class:'hero-content' });
    if(settings.badge) heroContent.appendChild(el('span', { class:'hero-badge' }, [settings.badge]));
    heroContent.appendChild(el('h1', {}, [settings.headline || 'Premium Template Headline']));
    if(settings.subheadline) heroContent.appendChild(el('p', { class:'lead' }, [settings.subheadline]));
    if(Array.isArray(settings.trustIndicators) && settings.trustIndicators.length){
      heroContent.appendChild(el('div', { class:'trust-row' }, settings.trustIndicators.map(text => el('span', { class:'trust-item' }, [text]))));
    }
    const ctas = [];
    if(settings.primaryCta) ctas.push(el('a', { class:'btn btn-primary', href: settings.primaryCta.href || '#', target: settings.primaryCta.target || '_self' }, [settings.primaryCta.label || 'Primary CTA']));
    if(settings.secondaryCta) ctas.push(el('a', { class:'btn btn-secondary', href: settings.secondaryCta.href || '#', target: settings.secondaryCta.target || '_self' }, [settings.secondaryCta.label || 'Secondary CTA']));
    if(ctas.length) heroContent.appendChild(el('div', { class:'cta-row premium-cta-row' }, ctas));

    const heroVisual = el('div', { class:'hero-visual' });
    if(settings.image){
      heroVisual.appendChild(el('img', { src: settings.image, alt: settings.imageAlt || settings.headline || 'Hero image' }));
    }
    if(Array.isArray(settings.stats) && settings.stats.length){
      heroVisual.appendChild(el('div', { class:'hero-stats' }, settings.stats.map(stat => el('div', { class:'stat' }, [
        el('span', { class:'stat-value' }, [stat.value || '']),
        el('span', { class:'stat-label' }, [stat.label || ''])
      ]))));
    }

    container.appendChild(heroContent);
    container.appendChild(heroVisual);
    contentRoot.appendChild(sectionEl);
  }

  function renderServicesGrid(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section services-grid ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));
    const grid = el('div', { class:'premium-card-grid' }, (settings.services || []).map(service => {
      const card = el('article', { class:'service-card' });
      card.appendChild(el('span', { class:'service-icon' }, [service.icon || ICON_FALLBACK]));
      card.appendChild(el('h3', {}, [service.name || 'Service']));
      card.appendChild(el('p', {}, [service.description || '']));
      if(service.duration || service.category){
        card.appendChild(el('p', { class:'muted small' }, [service.duration || service.category]));
      }
      if(service.link){
        card.appendChild(el('a', { href: service.link.href || '#', class:'service-link', target: service.link.target || '_self' }, [service.link.label || 'Learn More']));
      }
      return card;
    }));
    container.appendChild(grid);
    if(settings.viewAll){
      container.appendChild(el('div', { class:'cta-row center' }, [ el('a', { class:'btn btn-secondary', href: settings.viewAll.href || '#', target: settings.viewAll.target || '_self' }, [settings.viewAll.label || 'View All']) ]));
    }
    contentRoot.appendChild(sectionEl);
  }

  async function submitPremiumForm(endpoint, payload){
    const res = await fetch(endpoint || '/api/contact-form', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => {
      console.error('Premium form network failure', err);
      return { ok:false };
    });
    if(!res || !res.ok){
      throw new Error('Form submission failed');
    }
    try{
      return await res.json();
    }catch(_){
      return { ok:true };
    }
  }

  function renderQuoteFormWizard(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, 'premium-section quote-wizard');
    sectionEl.id = section.id || 'quote-form-wizard';
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const form = el('form', { class:'premium-form wizard-form', novalidate:'true' });
    const steps = [];

    const stepService = el('div', { class:'wizard-step active', 'data-step':'0' }, [
      el('h3', {}, ['Which service do you need?']),
      el('div', { class:'option-grid' }, (settings.serviceOptions || []).map((option, idx) => {
        const id = `${sectionEl.id}-service-${idx}`;
        const input = el('input', { type:'radio', id, name:'serviceType', value: option.value || option.label || `service-${idx}`, required:true });
        const label = el('label', { class:'option-card', for:id }, [
          el('span', { class:'option-icon' }, [option.icon || ICON_FALLBACK]),
          el('span', { class:'option-title' }, [option.label || 'Service']),
          option.description ? el('span', { class:'option-desc' }, [option.description]) : null
        ].filter(Boolean));
        return el('div', { class:'option-wrapper' }, [input, label]);
      }))
    ]);
    steps.push(stepService);

    const detailId = `${sectionEl.id}-details`;
    const stepDetails = el('div', { class:'wizard-step', 'data-step':'1' }, [
      el('h3', {}, ['Tell us about the project']),
      el('label', { for: detailId }, ['Project details']),
      el('textarea', { id:detailId, name:'projectDetails', required:true, placeholder:'Share the work needed, timelines, access notes...' }),
      el('label', { class:'file-label' }, [
        'Attach photos (optional)',
        el('input', { type:'file', name:'projectPhotos', accept:'image/*', multiple:true })
      ]),
      el('p', { class:'muted small' }, ['Up to 3 images. Helps us prepare accurate estimates.'])
    ]);
    steps.push(stepDetails);

    const stepContact = el('div', { class:'wizard-step', 'data-step':'2' }, [
      el('h3', {}, ['How can we reach you?']),
      el('div', { class:'grid two-col' }, [
        el('label', {}, ['Full name', el('input', { type:'text', name:'fullName', required:true, placeholder:'Jane Doe' })]),
        el('label', {}, ['Phone number', el('input', { type:'tel', name:'phone', required:true, placeholder:'(555) 123-4567' })])
      ]),
      el('div', { class:'grid two-col' }, [
        el('label', {}, ['Email address', el('input', { type:'email', name:'email', required:true, placeholder:'you@example.com' })]),
        el('label', {}, ['Service address or ZIP', el('input', { type:'text', name:'address', required:true, placeholder:'123 Main St or 75001' })])
      ])
    ]);
    steps.push(stepContact);

    const stepPreferences = el('div', { class:'wizard-step', 'data-step':'3' }, [
      el('h3', {}, ['Preferences']),
      el('div', { class:'grid two-col' }, [
        el('label', {}, ['Preferred contact method', el('select', { name:'contactMethod', required:true }, (settings.contactMethods || ['Phone','Email','Text']).map(method => el('option', { value:method.toLowerCase() }, [method])) ) ]),
        el('label', {}, ['Urgency level', el('select', { name:'urgency', required:true }, (settings.urgencyLevels || ['Routine','Soon','Emergency']).map(level => el('option', { value:level.toLowerCase() }, [level])) ) ])
      ]),
      el('label', {}, ['Preferred time window', el('input', { type:'text', name:'preferredTime', placeholder:'Weekdays after 5pm' })])
    ]);
    steps.push(stepPreferences);

    steps.forEach(step => form.appendChild(step));

    const progress = el('ol', { class:'wizard-progress' }, steps.map((_, idx) => el('li', { 'data-step-index': idx }, [
      el('span', { class:'progress-index' }, [String(idx+1)]),
      el('span', { class:'progress-label' }, [settings.stepLabels?.[idx] || `Step ${idx+1}`])
    ])));

    const controls = el('div', { class:'wizard-controls' }, [
      el('button', { type:'button', class:'btn btn-secondary wizard-prev' }, ['Previous']),
      el('button', { type:'button', class:'btn btn-primary wizard-next' }, ['Next'])
    ]);

    container.appendChild(progress);
    container.appendChild(form);
    container.appendChild(controls);
    const statusEl = el('div', { class:'wizard-status' });
    container.appendChild(statusEl);
    contentRoot.appendChild(sectionEl);

    let current = 0;
    updateStep();

    controls.querySelector('.wizard-prev').addEventListener('click', ()=>{
      if(current > 0){ current -= 1; updateStep(); }
    });

    controls.querySelector('.wizard-next').addEventListener('click', async ()=>{
      if(current < steps.length - 1){
        if(!validateStep(current)) return;
        current += 1;
        updateStep();
      }else{
        if(!validateStep(current)) return;
        await submit();
      }
    });

    function updateStep(){
      steps.forEach((step, idx) => step.classList.toggle('active', idx === current));
      qsa('li', progress).forEach((item, idx) => {
        item.classList.toggle('active', idx === current);
        item.classList.toggle('complete', idx < current);
      });
      controls.querySelector('.wizard-prev').disabled = current === 0;
      controls.querySelector('.wizard-next').textContent = current === steps.length - 1 ? (settings.finalCtaLabel || 'Submit Quote Request') : 'Next';
    }

    function validateStep(index){
      const fields = qsa('[required]', steps[index]);
      let valid = true;
      fields.forEach(field => {
        if(field.type === 'radio'){
          const checked = qsa(`input[name="${field.name}"]`, form).some(input => input.checked);
          field.setCustomValidity(checked ? '' : 'Select an option');
          if(!checked) valid = false;
        }else if(!field.value){
          field.setCustomValidity('Required');
          valid = false;
        }else{
          field.setCustomValidity('');
        }
      });
      if(!valid){
        const firstInvalid = fields.find(field => !field.checkValidity());
        firstInvalid?.reportValidity();
      }
      return valid;
    }

    async function submit(){
      const submitBtn = controls.querySelector('.wizard-next');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting?';
      statusEl.innerHTML = '';
      try{
        const payload = await collectPayload();
        await submitPremiumForm(settings.submit?.endpoint || '/api/contact-form', payload);
        statusEl.appendChild(el('div', { class:'form-success' }, [settings.successMessage || "Quote request received! We'll contact you within 2 hours."]));
        form.reset();
        current = 0;
        updateStep();
      }catch(err){
        statusEl.appendChild(el('div', { class:'form-error' }, ['Something went wrong. Please try again or call us.']));
        console.error(err);
      }finally{
        submitBtn.disabled = false;
        submitBtn.textContent = settings.finalCtaLabel || 'Submit Quote Request';
      }
    }

    async function collectPayload(){
      const formData = new FormData(form);
      const payload = { type: settings.submit?.type || 'quote', submittedAt: new Date().toISOString() };
      formData.forEach((value, key) => {
        if(key === 'projectPhotos') return;
        payload[key] = value;
      });
      const fileInput = form.querySelector('input[name="projectPhotos"]');
      if(fileInput?.files?.length){
        payload.attachments = await Promise.all(Array.from(fileInput.files).slice(0,3).map(file => new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve({ name:file.name, type:file.type, size:file.size, dataUrl:reader.result });
          reader.onerror = () => resolve({ name:file.name, type:file.type, size:file.size });
          reader.readAsDataURL(file);
        })));
      }
      return payload;
    }
  }

  function renderTestimonialsCarousel(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section testimonials ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const carousel = el('div', { class:'testimonial-carousel', role:'region', 'aria-live':'polite' });
    const slides = (settings.testimonials || []).map((item, idx) => el('article', { class:`testimonial-slide ${idx === 0 ? 'active' : ''}` }, [
      el('div', { class:'rating' }, ['?????'.slice(0, item.rating || 5)]),
      el('p', { class:'quote' }, ['?' + (item.quote || '') + '?']),
      el('p', { class:'attribution' }, [item.name ? `${item.name}${item.location ? ' ? ' + item.location : ''}${item.service ? ' ? ' + item.service : ''}` : 'Satisfied Client'])
    ]));
    slides.forEach(slide => carousel.appendChild(slide));

    const controls = el('div', { class:'carousel-controls' }, [
      el('button', { type:'button', class:'carousel-prev', 'aria-label':'Previous testimonial' }, ['?']),
      el('button', { type:'button', class:'carousel-next', 'aria-label':'Next testimonial' }, ['?'])
    ]);

    container.appendChild(carousel);
    if(slides.length > 1) container.appendChild(controls);
    if(settings.disclaimer) container.appendChild(el('p', { class:'muted small mt-2' }, [settings.disclaimer]));
    if(settings.cta){
      container.appendChild(el('div', { class:'cta-row center mt' }, [ el('a', { class:'btn btn-secondary', href: settings.cta.href || '#', target: settings.cta.target || '_blank' }, [settings.cta.label || 'Read More Reviews']) ]));
    }
    contentRoot.appendChild(sectionEl);

    let current = 0;
    function showSlide(next){
      slides[current]?.classList.remove('active');
      current = (next + slides.length) % slides.length;
      slides[current]?.classList.add('active');
    }
    controls.querySelector('.carousel-prev')?.addEventListener('click', () => showSlide(current - 1));
    controls.querySelector('.carousel-next')?.addEventListener('click', () => showSlide(current + 1));
    if(slides.length > 1){
      const interval = setInterval(() => showSlide(current + 1), settings.intervalMs || 6000);
      registerTimer(interval);
    }
  }

  function renderFaq(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section faq ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));
    const accordion = el('div', { class:'faq-accordion' }, (settings.items || []).map((item, idx) => {
      const button = el('button', { class:'faq-question', type:'button', id:`${section.id || section.type}-faq-${idx}`, 'aria-expanded':'false' }, [item.question || 'Question']);
      const answer = el('div', { class:'faq-answer', role:'region', 'aria-labelledby': button.id }, [el('p', {}, [item.answer || ''])]);
      answer.hidden = true;
      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        answer.hidden = expanded;
      });
      return el('div', { class:'faq-item' }, [button, answer]);
    }));
    container.appendChild(accordion);
    contentRoot.appendChild(sectionEl);
  }

  function renderFinalCta(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section final-cta ${section.type}`);
    container.appendChild(el('h2', {}, [settings.heading || 'Ready to Get Started?']));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));
    const ctas = [];
    if(settings.primaryCta) ctas.push(el('a', { class:'btn btn-primary', href: settings.primaryCta.href || '#', target: settings.primaryCta.target || '_self' }, [settings.primaryCta.label || 'Primary CTA']));
    if(settings.secondaryCta) ctas.push(el('a', { class:'btn btn-secondary', href: settings.secondaryCta.href || '#', target: settings.secondaryCta.target || '_self' }, [settings.secondaryCta.label || 'Secondary CTA']));
    if(ctas.length) container.appendChild(el('div', { class:'cta-row' }, ctas));
    if(settings.trustBadges){
      container.appendChild(el('div', { class:'trust-badges' }, settings.trustBadges.map(text => el('span', { class:'trust-pill' }, [text]))));
    }
    contentRoot.appendChild(sectionEl);
  }

  function renderComprehensiveFooter(section, cfg){
    const settings = section.settings || {};
    footerRoot.innerHTML = '';
    footerRoot.classList.add('premium-footer');
    const columns = el('div', { class:'footer-columns' });

    if(settings.company){
      columns.appendChild(el('div', { class:'footer-column' }, [
        settings.company.logo ? el('img', { src: settings.company.logo, alt: settings.company.name || 'Company logo', class:'footer-logo' }) : null,
        el('h3', {}, [settings.company.name || cfg.meta?.businessName || 'Company']),
        settings.company.tagline ? el('p', {}, [settings.company.tagline]) : null,
        settings.company.license ? el('p', { class:'muted small' }, [settings.company.license]) : null
      ].filter(Boolean)));
    }

    if(settings.quickLinks){
      columns.appendChild(el('div', { class:'footer-column' }, [
        el('h4', {}, ['Quick Links']),
        el('ul', {}, settings.quickLinks.map(link => el('li', {}, [ el('a', { href: link.href || '#', target: link.target || '_self' }, [link.label || 'Link']) ])))
      ]));
    }

    if(settings.contact){
      columns.appendChild(el('div', { class:'footer-column' }, [
        el('h4', {}, ['Contact']),
        settings.contact.phone ? el('p', {}, [ el('a', { href:`tel:${settings.contact.phone}` }, [settings.contact.phone]) ]) : null,
        settings.contact.email ? el('p', {}, [ el('a', { href:`mailto:${settings.contact.email}` }, [settings.contact.email]) ]) : null,
        settings.contact.address ? el('p', {}, [settings.contact.address]) : null,
        settings.contact.hours ? el('p', { class:'muted small' }, [settings.contact.hours]) : null
      ].filter(Boolean)));
    }

    if(settings.social){
      columns.appendChild(el('div', { class:'footer-column' }, [
        el('h4', {}, ['Connect']),
        el('div', { class:'social-row' }, settings.social.map(link => el('a', { href: link.href || '#', target:'_blank', rel:'noreferrer noopener' }, [link.label || link.platform || 'Social'])) )
      ]));
    }

    footerRoot.appendChild(columns);

    if(settings.badges){
      footerRoot.appendChild(el('div', { class:'footer-badges' }, settings.badges.map(text => el('span', { class:'footer-badge' }, [text]))));
    }

    footerRoot.appendChild(el('div', { class:'footer-bottom' }, [
      el('span', {}, [settings.legal || `? ${new Date().getFullYear()} ${cfg.meta?.businessName || 'All rights reserved.'}`]),
      settings.policies ? el('div', { class:'footer-policies' }, settings.policies.map(link => el('a', { href: link.href || '#', target: link.target || '_self' }, [link.label || 'Policy']))) : null
    ].filter(Boolean)));
  }

  function renderTimelineSection(section, variant){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section timeline ${variant}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const list = el('ol', { class:'timeline-list' }, (settings.steps || []).map((step, idx) => {
      return el('li', { class:'timeline-step' }, [
        el('div', { class:'timeline-index' }, [String(idx + 1)]),
        el('div', { class:'timeline-content' }, [
          el('h3', {}, [step.title || `Step ${idx+1}`]),
          step.subtitle ? el('p', { class:'muted small' }, [step.subtitle]) : null,
          step.description ? el('p', {}, [step.description]) : null,
          step.items ? el('ul', {}, step.items.map(item => el('li', {}, [item]))) : null
        ].filter(Boolean))
      ]);
    }));

    container.appendChild(list);

    if(settings.download){
      container.appendChild(el('a', { class:'btn btn-secondary mt', href: settings.download.href || '#', target: settings.download.target || '_blank' }, [settings.download.label || 'Download Resources']));
    }
    if(settings.cta){
      container.appendChild(el('div', { class:'cta-row mt' }, [ el('a', { class:'btn btn-primary', href: settings.cta.href || '#', target: settings.cta.target || '_self' }, [settings.cta.label || 'Get Started']) ]));
    }

    contentRoot.appendChild(sectionEl);
  }

  /* Placeholder renderers for remaining premium sections (to be implemented) */
  function renderBookingAdvanced(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section appointment ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const form = el('form', { class:'premium-form appointment-form', novalidate:'true' });

    const rowOne = el('div', { class:'grid two-col' }, [
      el('label', {}, ['Appointment type', el('select', { name:'appointmentType', required:true }, (settings.appointmentTypes || ['New Patient','Follow-up','Consultation','Emergency']).map(type => el('option', { value:type.toLowerCase().replace(/\s+/g,'-') }, [type]))) ]),
      el('label', {}, ['Preferred provider', el('select', { name:'preferredProvider' }, [el('option', { value:'' }, ['Any available provider'])].concat((settings.providers || []).map(provider => el('option', { value:provider.value || provider.name }, [provider.label || provider.name])))) ])
    ]);

    const calendarRow = el('div', { class:'grid two-col align-end' }, [
      el('label', {}, ['Preferred date', el('input', { type:'date', name:'date', required:true })]),
      el('div', { class:'time-slot-group' }, [
        el('span', { class:'label' }, ['Preferred time']),
        el('div', { class:'option-grid compact' }, (settings.timeSlots || ['Morning','Afternoon','Evening']).map((slot, idx) => {
          const id = `${section.id || section.type}-time-${idx}`;
          return el('div', { class:'option-wrapper small' }, [
            el('input', { type:'radio', id, name:'timeSlot', value:slot.toLowerCase(), required: idx === 0 }),
            el('label', { class:'option-chip', for:id }, [slot])
          ]);
        }))
      ])
    ]);

    const patientRow = el('div', { class:'grid two-col' }, [
      el('label', {}, ['Full name', el('input', { type:'text', name:'fullName', required:true, placeholder:'Jane Doe' })]),
      el('label', {}, ['Date of birth', el('input', { type:'date', name:'dob', required:true })])
    ]);

    const contactRow = el('div', { class:'grid two-col' }, [
      el('label', {}, ['Phone number', el('input', { type:'tel', name:'phone', required:true, placeholder:'(555) 123-4567' })]),
      el('label', {}, ['Email address', el('input', { type:'email', name:'email', required:true, placeholder:'you@example.com' })])
    ]);

    const insuranceRow = el('div', { class:'grid two-col' }, [
      el('label', {}, ['Insurance provider', el('input', { type:'text', name:'insuranceProvider', placeholder:'Plan name (if applicable)' })]),
      el('label', {}, ['Member ID (optional)', el('input', { type:'text', name:'memberId', placeholder:'ID number' })])
    ]);

    const reasonField = el('label', {}, ['Reason for visit', el('textarea', { name:'reason', required:true, placeholder:'Describe symptoms or goals for your visit' })]);
    const newPatient = el('label', { class:'checkbox-row' }, [
      el('input', { type:'checkbox', name:'isNewPatient', value:'yes' }),
      el('span', {}, ['This is my first visit'])
    ]);

    form.appendChild(rowOne);
    form.appendChild(calendarRow);
    form.appendChild(patientRow);
    form.appendChild(contactRow);
    form.appendChild(insuranceRow);
    form.appendChild(reasonField);
    form.appendChild(newPatient);

    const submitBtn = el('button', { type:'submit', class:'btn btn-primary' }, [settings.submit?.label || 'Book Appointment']);
    form.appendChild(submitBtn);
    const statusEl = el('div', { class:'form-status' });

    form.addEventListener('submit', async evt => {
      evt.preventDefault();
      statusEl.innerHTML = '';
      if(!form.reportValidity()) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting?';
      const formData = new FormData(form);
      const payload = { type: settings.submit?.type || 'medical-appointment', submittedAt: new Date().toISOString() };
      formData.forEach((value, key) => {
        if(key === 'isNewPatient') payload[key] = true;
        else payload[key] = value;
      });
      try{
        await submitPremiumForm(settings.submit?.endpoint || '/api/appointment-request', payload);
        statusEl.appendChild(el('div', { class:'form-success' }, [settings.successMessage || 'Appointment request received! Our team will confirm within 1 hour.']));
        form.reset();
      }catch(err){
        console.error(err);
        statusEl.appendChild(el('div', { class:'form-error' }, ['We could not submit your request. Please call us to confirm.']));
      }finally{
        submitBtn.disabled = false;
        submitBtn.textContent = settings.submit?.label || 'Book Appointment';
      }
    });

    container.appendChild(form);
    container.appendChild(statusEl);
    contentRoot.appendChild(sectionEl);
  }
  function renderProviderProfiles(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section team ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const profiles = el('div', { class:'team-grid' }, (settings.providers || []).map(provider => {
      const card = el('article', { class:'team-card' });
      if(provider.photo){
        card.appendChild(el('img', { class:'team-photo', src: provider.photo, alt: provider.name ? `${provider.name} headshot` : 'Provider photo' }));
      }
      card.appendChild(el('h3', {}, [provider.name || 'Provider']));
      card.appendChild(el('p', { class:'muted small' }, [provider.credentials || provider.title || '']));
      if(provider.specialty) card.appendChild(el('p', {}, [provider.specialty]));
      if(Array.isArray(provider.education) && provider.education.length){
        card.appendChild(el('div', { class:'team-meta' }, [
          el('span', { class:'meta-label' }, ['Education']),
          el('ul', {}, provider.education.map(item => el('li', {}, [item])))
        ]));
      }
      if(Array.isArray(provider.certifications) && provider.certifications.length){
        card.appendChild(el('div', { class:'team-meta' }, [
          el('span', { class:'meta-label' }, ['Board certifications']),
          el('ul', {}, provider.certifications.map(item => el('li', {}, [item])))
        ]));
      }
      if(provider.experience){
        card.appendChild(el('p', { class:'muted small' }, [provider.experience]));
      }
      if(provider.statement){
        card.appendChild(el('p', { class:'team-statement' }, ['?' + provider.statement + '?']));
      }
      if(provider.cta){
        card.appendChild(el('a', { class:'btn btn-secondary', href: provider.cta.href || '#', target: provider.cta.target || '_self' }, [provider.cta.label || `Book with ${provider.name?.split(' ')[0] || 'Provider'}`]));
      }
      return card;
    }));

    container.appendChild(profiles);
    contentRoot.appendChild(sectionEl);
  }
  function renderInsuranceAccepted(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section insurance ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    if(Array.isArray(settings.insurers) && settings.insurers.length){
      container.appendChild(el('div', { class:'logo-grid' }, settings.insurers.map(insurer => el('div', { class:'logo-card' }, [
        insurer.logo ? el('img', { src: insurer.logo, alt: insurer.name || 'Insurance logo' }) : el('span', {}, [insurer.name || 'Insurance'])
      ]))));
    }

    if(settings.statement) container.appendChild(el('p', {}, [settings.statement]));

    if(settings.paymentOptions){
      container.appendChild(el('div', { class:'payment-options' }, [
        el('h3', {}, ['Payment options']),
        el('ul', {}, settings.paymentOptions.map(option => el('li', {}, [option])))
      ]));
    }

    if(settings.selfPay){
      container.appendChild(el('div', { class:'card notice' }, [
        el('h4', {}, ['No insurance?']),
        el('p', {}, [settings.selfPay])
      ]));
    }

    if(settings.cta){
      container.appendChild(el('div', { class:'cta-row center mt' }, [ el('a', { class:'btn btn-secondary', href: settings.cta.href || '#', target: settings.cta.target || '_self' }, [settings.cta.label || 'Verify Your Coverage']) ]));
    }

    contentRoot.appendChild(sectionEl);
  }
  function renderPatientJourney(section){ renderTimelineSection(section, section.type); }
  function renderLocationHours(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section location ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const layout = el('div', { class:'location-layout' });

    const info = el('div', { class:'location-info' }, [
      el('h3', {}, ['Office']),
      settings.address ? el('p', {}, [settings.address]) : null,
      settings.directions ? el('a', { href: settings.directions.href || '#', target:'_blank', rel:'noreferrer noopener', class:'btn btn-secondary' }, [settings.directions.label || 'Get Directions']) : null,
      settings.parking ? el('p', { class:'muted small' }, [settings.parking]) : null,
      settings.accessibility ? el('p', { class:'muted small' }, [settings.accessibility]) : null
    ].filter(Boolean));

    if(settings.phone){
      info.appendChild(el('p', { class:'contact-line' }, ['Phone: ', el('a', { href:`tel:${settings.phone}` }, [settings.phone]) ]));
    }

    if(Array.isArray(settings.hours) && settings.hours.length){
      info.appendChild(el('div', { class:'hours-block' }, [
        el('h4', {}, ['Hours']),
        el('ul', {}, settings.hours.map(entry => el('li', {}, [
          el('span', { class:'hours-day' }, [entry.day || 'Day']),
          el('span', { class:'hours-time' }, [entry.time || 'By appointment'])
        ])))
      ]));
    }

    const map = el('div', { class:'location-map' });
    if(settings.mapEmbed){
      const iframe = document.createElement('iframe');
      iframe.src = settings.mapEmbed;
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      iframe.setAttribute('aria-label', 'Office location map');
      map.appendChild(iframe);
    }else if(settings.mapImage){
      map.appendChild(el('img', { src: settings.mapImage, alt: 'Map showing office location' }));
    }else{
      map.appendChild(el('div', { class:'map-placeholder' }, ['Map preview coming soon']));
    }

    layout.appendChild(info);
    layout.appendChild(map);
    container.appendChild(layout);

    if(settings.supportCta){
      container.appendChild(el('div', { class:'cta-row mt' }, [ el('a', { class:'btn btn-primary', href: settings.supportCta.href || `tel:${settings.phone || ''}` }, [settings.supportCta.label || "We're here to help"]) ]));
    }

    contentRoot.appendChild(sectionEl);
  }
  function renderPracticeAreas(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section practice-areas ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const grid = el('div', { class:'premium-card-grid' }, (settings.areas || []).map(area => {
      const card = el('article', { class:'practice-card' });
      card.appendChild(el('span', { class:'service-icon' }, [area.icon || ICON_FALLBACK]));
      card.appendChild(el('h3', {}, [area.name || 'Practice Area']));
      if(area.description) card.appendChild(el('p', {}, [area.description]));
      if(Array.isArray(area.services) && area.services.length){
        card.appendChild(el('ul', { class:'muted small' }, area.services.map(item => el('li', {}, [item]))));
      }
      if(area.link){
        card.appendChild(el('a', { href: area.link.href || '#', class:'service-link', target: area.link.target || '_self' }, [area.link.label || 'Learn More ?']));
      }
      return card;
    }));

    container.appendChild(grid);
    contentRoot.appendChild(sectionEl);
  }
  function renderCaseEvaluationForm(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section consultation ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const form = el('form', { class:'premium-form consultation-form', novalidate:'true' });
    const nameField = el('label', {}, ['Full name', el('input', { type:'text', name:'fullName', required:true, placeholder:'Jane Doe' })]);
    const phoneField = el('label', {}, ['Phone number', el('input', { type:'tel', name:'phone', required:true, placeholder:'(555) 123-4567' })]);
    const emailField = el('label', {}, ['Email address', el('input', { type:'email', name:'email', required:true, placeholder:'you@example.com' })]);

    const caseType = el('label', {}, ['Case type', el('select', { name:'caseType', required:true }, (settings.caseTypes || ['Personal Injury','Family Law','Criminal Defense','Estate Planning','Business Law','Other']).map(type => el('option', { value:type.toLowerCase().replace(/\s+/g,'-') }, [type]))) ]);

    const descriptionId = `${section.id || section.type}-description`;
    const descriptionField = el('label', {}, ['Brief case description', el('textarea', { id:descriptionId, name:'description', required:true, maxlength: settings.maxLength || 1200, placeholder:'Share key details. Please avoid confidential information until we speak.' })]);
    const charCount = el('p', { class:'muted small', id:`${descriptionId}-counter` }, ['0 / ', String(settings.maxLength || 1200)]);

    const contactMethods = el('div', { class:'option-grid compact' }, (settings.contactMethods || ['Phone','Email','Text']).map((method, idx) => {
      const id = `${section.id || section.type}-contact-${idx}`;
      return el('div', { class:'option-wrapper small' }, [
        el('input', { type:'radio', id, name:'contactMethod', value:method.toLowerCase(), required: idx === 0 }),
        el('label', { class:'option-chip', for:id }, [method])
      ]);
    }));

    const bestTime = el('label', {}, ['Best time to reach you', el('input', { type:'text', name:'bestTime', placeholder:'e.g., Weekdays after 4pm' })]);
    const urgent = el('label', { class:'checkbox-row' }, [
      el('input', { type:'checkbox', name:'urgent', value:'yes' }),
      el('span', {}, ['This matter is urgent'])
    ]);

    form.appendChild(el('div', { class:'grid two-col' }, [nameField, phoneField]));
    form.appendChild(el('div', { class:'grid two-col' }, [emailField, caseType]));
    form.appendChild(descriptionField);
    form.appendChild(charCount);
    form.appendChild(el('div', { class:'form-group' }, [el('span', { class:'label' }, ['Preferred contact method']), contactMethods]));
    form.appendChild(bestTime);
    form.appendChild(urgent);

    const submitBtn = el('button', { type:'submit', class:'btn btn-primary' }, [settings.submit?.label || 'Request Free Consultation']);
    form.appendChild(submitBtn);
    const statusEl = el('div', { class:'form-status' });

    descriptionField.querySelector('textarea').addEventListener('input', e => {
      charCount.textContent = `${e.target.value.length} / ${settings.maxLength || 1200}`;
    });

    form.addEventListener('submit', async evt => {
      evt.preventDefault();
      statusEl.innerHTML = '';
      if(!form.reportValidity()) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting?';
      const formData = new FormData(form);
      const payload = { type: settings.submit?.type || 'legal-consultation', submittedAt: new Date().toISOString() };
      formData.forEach((value, key) => {
        payload[key] = key === 'urgent' ? true : value;
      });
      try{
        await submitPremiumForm(settings.submit?.endpoint || '/api/contact-form', payload);
        statusEl.appendChild(el('div', { class:'form-success' }, [settings.successMessage || 'Thank you. An attorney will review your case within 24 hours.']));
        form.reset();
        charCount.textContent = `0 / ${settings.maxLength || 1200}`;
      }catch(err){
        console.error(err);
        statusEl.appendChild(el('div', { class:'form-error' }, ['We could not send your request. Please call us for immediate assistance.']));
      }finally{
        submitBtn.disabled = false;
        submitBtn.textContent = settings.submit?.label || 'Request Free Consultation';
      }
    });

    container.appendChild(form);
    container.appendChild(statusEl);
    if(settings.privacy){
      container.appendChild(el('p', { class:'muted small mt-2' }, [settings.privacy]));
    }
    contentRoot.appendChild(sectionEl);
  }
  function renderCaseResults(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section case-results ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.disclaimer) container.appendChild(el('p', { class:'muted small' }, [settings.disclaimer]));

    const grid = el('div', { class:'premium-card-grid' }, (settings.results || []).map(result => {
      const card = el('article', { class:'case-card' });
      if(result.tag) card.appendChild(el('span', { class:'case-tag' }, [result.tag]));
      card.appendChild(el('h3', {}, [result.outcome || result.amount || 'Case Result']));
      if(result.description) card.appendChild(el('p', {}, [result.description]));
      if(result.year) card.appendChild(el('p', { class:'muted small' }, [`${result.year}`]));
      return card;
    }));

    container.appendChild(grid);
    if(settings.cta){
      container.appendChild(el('div', { class:'cta-row center mt' }, [ el('a', { class:'btn btn-secondary', href: settings.cta.href || '#', target: settings.cta.target || '_self' }, [settings.cta.label || 'See More Results']) ]));
    }
    contentRoot.appendChild(sectionEl);
  }
  function renderAttorneyTeam(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section team ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const grid = el('div', { class:'team-grid' }, (settings.attorneys || []).map(attorney => {
      const card = el('article', { class:'team-card' });
      if(attorney.photo){
        card.appendChild(el('img', { class:'team-photo', src: attorney.photo, alt: attorney.name ? `${attorney.name} headshot` : 'Attorney photo' }));
      }
      card.appendChild(el('h3', {}, [attorney.name || 'Attorney']));
      const subtitleParts = [attorney.title, attorney.credentials, attorney.barAdmissions?.join(', ')].filter(Boolean);
      if(subtitleParts.length) card.appendChild(el('p', { class:'muted small' }, [subtitleParts.join(' ? ')]));
      if(attorney.practiceAreas) card.appendChild(el('p', {}, [attorney.practiceAreas]));
      if(Array.isArray(attorney.education) && attorney.education.length){
        card.appendChild(el('div', { class:'team-meta' }, [
          el('span', { class:'meta-label' }, ['Education']),
          el('ul', {}, attorney.education.map(item => el('li', {}, [item])))
        ]));
      }
      if(Array.isArray(attorney.memberships) && attorney.memberships.length){
        card.appendChild(el('div', { class:'team-meta' }, [
          el('span', { class:'meta-label' }, ['Memberships']),
          el('ul', {}, attorney.memberships.map(item => el('li', {}, [item])))
        ]));
      }
      if(attorney.experience) card.appendChild(el('p', { class:'muted small' }, [attorney.experience]));
      if(attorney.bio) card.appendChild(el('p', { class:'team-statement' }, ['?' + attorney.bio + '?']));
      if(attorney.cta){
        card.appendChild(el('a', { class:'btn btn-secondary', href: attorney.cta.href || '#', target: attorney.cta.target || '_self' }, [attorney.cta.label || `Contact ${attorney.name?.split(' ')[0] || 'Attorney'}`]));
      }
      return card;
    }));

    container.appendChild(grid);
    contentRoot.appendChild(sectionEl);
  }
  function renderDifferentiators(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section differentiators ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const grid = el('div', { class:'premium-card-grid alt' }, (settings.items || []).map(item => {
      const card = el('article', { class:'diff-card' });
      card.appendChild(el('span', { class:'service-icon' }, [item.icon || ICON_FALLBACK]));
      card.appendChild(el('h3', {}, [item.title || 'Why choose us']));
      if(item.description) card.appendChild(el('p', {}, [item.description]));
      return card;
    }));

    container.appendChild(grid);
    contentRoot.appendChild(sectionEl);
  }
  function renderProcessSteps(section){ renderTimelineSection(section, section.type); }
  function renderLegalCredentials(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section credentials legal ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    if(settings.barAdmissions){
      container.appendChild(el('div', { class:'credential-block bar-admissions' }, [
        el('h3', {}, ['Bar Admissions']),
        el('ul', {}, settings.barAdmissions.map(item => el('li', {}, [item])))
      ]));
    }

    if(settings.associations){
      container.appendChild(el('div', { class:'credential-block associations' }, [
        el('h3', {}, ['Professional Associations']),
        el('div', { class:'logo-row' }, settings.associations.map(name => el('span', { class:'logo-pill' }, [name])))
      ]));
    }

    if(settings.awards){
      container.appendChild(el('div', { class:'credential-block awards' }, [
        el('h3', {}, ['Awards & Recognition']),
        el('div', { class:'logo-row' }, settings.awards.map(award => el('span', { class:'logo-pill' }, [award])))
      ]));
    }

    if(settings.publications){
      container.appendChild(el('div', { class:'credential-block publications' }, [
        el('h3', {}, ['Publications & Speaking']),
        el('ul', {}, settings.publications.map(item => el('li', {}, [item])))
      ]));
    }

    if(settings.community){
      container.appendChild(el('div', { class:'credential-block community' }, [
        el('h3', {}, ['Community Involvement']),
        el('p', {}, [settings.community])
      ]));
    }

    contentRoot.appendChild(sectionEl);
  }
  function renderPropertyShowcase(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section properties ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const filters = el('div', { class:'filter-row' }, (settings.filters || []).map((filter, idx) => el('button', {
      type:'button', class:`filter-btn ${idx === 0 ? 'active' : ''}`, 'data-filter': filter.value || 'all'
    }, [filter.label || 'Filter'])));

    const grid = el('div', { class:'property-grid' }, (settings.properties || []).map(property => {
      const card = el('article', { class:'property-card', 'data-status': property.status || 'active' });
      if(property.image){
        card.appendChild(el('img', { src: property.image, alt: property.address ? `${property.address} exterior` : 'Property photo' }));
      }
      const body = el('div', { class:'property-body' });
      if(property.status){
        body.appendChild(el('span', { class:`status-pill status-${(property.status || 'active').toLowerCase()}` }, [property.status]));
      }
      body.appendChild(el('h3', {}, [property.address || 'Property address']));
      if(property.city) body.appendChild(el('p', { class:'muted small' }, [property.city]));
      if(property.price) body.appendChild(el('p', { class:'price' }, [property.price]));
      const specs = [];
      if(property.beds != null) specs.push(`${property.beds} Beds`);
      if(property.baths != null) specs.push(`${property.baths} Baths`);
      if(property.sqft) specs.push(`${property.sqft} Sq Ft`);
      if(specs.length) body.appendChild(el('p', { class:'muted small' }, [specs.join(' ? ')]));
      if(property.description) body.appendChild(el('p', {}, [property.description]));
      if(property.link){
        body.appendChild(el('a', { class:'btn btn-secondary', href: property.link.href || '#', target: property.link.target || '_blank' }, [property.link.label || 'View Details']));
      }
      card.appendChild(body);
      return card;
    }));

    container.appendChild(filters);
    container.appendChild(grid);
    if(settings.cta){
      container.appendChild(el('div', { class:'cta-row center mt' }, [ el('a', { class:'btn btn-primary', href: settings.cta.href || '#', target: settings.cta.target || '_self' }, [settings.cta.label || 'See All Listings']) ]));
    }

    filters.addEventListener('click', e => {
      const btn = e.target.closest('button');
        if(!btn) return;
      qsa('.filter-btn', filters).forEach(button => button.classList.toggle('active', button === btn));
      const filter = btn.getAttribute('data-filter');
      qsa('.property-card', grid).forEach(card => {
        const status = (card.getAttribute('data-status') || '').toLowerCase();
        card.classList.toggle('hidden', filter !== 'all' && status !== filter);
      });
    });

    contentRoot.appendChild(sectionEl);
  }
  function renderValuationCalculator(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section valuation ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const form = el('form', { class:'premium-form valuation-form', novalidate:'true' });

    form.appendChild(el('label', {}, ['Street address', el('input', { type:'text', name:'address', required:true, placeholder:'123 Main St' })]));
    form.appendChild(el('div', { class:'grid three-col' }, [
      el('label', {}, ['City', el('input', { type:'text', name:'city', required:true, placeholder:'City' })]),
      el('label', {}, ['State', el('input', { type:'text', name:'state', required:true, maxlength:'2', placeholder:'ST' })]),
      el('label', {}, ['ZIP', el('input', { type:'text', name:'zip', required:true, placeholder:'90210' })])
    ]));

    form.appendChild(el('label', {}, ['Property type', el('select', { name:'propertyType', required:true }, (settings.propertyTypes || ['Single Family','Condo','Townhome','Multi-Family','Other']).map(type => el('option', { value:type.toLowerCase().replace(/\s+/g,'-') }, [type]))) ]));

    form.appendChild(el('div', { class:'grid three-col' }, [
      el('label', {}, ['Bedrooms', el('input', { type:'number', min:'0', name:'bedrooms', required:true })]),
      el('label', {}, ['Bathrooms', el('input', { type:'number', min:'0', step:'0.5', name:'bathrooms', required:true })]),
      el('label', {}, ['Square footage', el('input', { type:'number', min:'0', name:'squareFootage', required:true })])
    ]));

    form.appendChild(el('label', {}, ['Year built (optional)', el('input', { type:'number', name:'yearBuilt', min:'1800', max:new Date().getFullYear() })]));

    if(Array.isArray(settings.upgrades) && settings.upgrades.length){
      form.appendChild(el('div', { class:'form-group' }, [
        el('span', { class:'label' }, ['Recent updates?']),
        el('div', { class:'checkbox-grid' }, settings.upgrades.map((upgrade, idx) => {
          const id = `${section.id || section.type}-upgrade-${idx}`;
          return el('label', { class:'checkbox-row', for:id }, [
            el('input', { type:'checkbox', id, name:'upgrades', value:upgrade.toLowerCase().replace(/\s+/g,'-') }),
            el('span', {}, [upgrade])
          ]);
        }))
      ]));
    }

    form.appendChild(el('div', { class:'grid three-col' }, [
      el('label', {}, ['Your name', el('input', { type:'text', name:'fullName', required:true })]),
      el('label', {}, ['Email', el('input', { type:'email', name:'email', required:true })]),
      el('label', {}, ['Phone', el('input', { type:'tel', name:'phone', required:true })])
    ]));

    if(Array.isArray(settings.timelines) && settings.timelines.length){
      form.appendChild(el('div', { class:'form-group' }, [
        el('span', { class:'label' }, ['Are you planning to sell?']),
        el('div', { class:'option-grid compact' }, settings.timelines.map((option, idx) => {
          const id = `${section.id || section.type}-timeline-${idx}`;
          return el('div', { class:'option-wrapper small' }, [
            el('input', { type:'radio', id, name:'timeline', value:option.value || option.label, required: idx === 0 }),
            el('label', { class:'option-chip', for:id }, [option.label])
          ]);
        }))
      ]));
    }

    const submitBtn = el('button', { type:'submit', class:'btn btn-primary' }, [settings.submit?.label || 'Get My Free Home Valuation']);
    form.appendChild(submitBtn);
    const statusEl = el('div', { class:'form-status' });

    form.addEventListener('submit', async evt => {
      evt.preventDefault();
      statusEl.innerHTML = '';
      if(!form.reportValidity()) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting?';
      const formData = new FormData(form);
      const payload = { type: settings.submit?.type || 'home-valuation', submittedAt: new Date().toISOString() };
      formData.forEach((value, key) => {
        if(key === 'upgrades'){
          if(!payload.upgrades) payload.upgrades = [];
          payload.upgrades.push(value);
          }else{
          payload[key] = value;
          }
      });
      try{
        await submitPremiumForm(settings.submit?.endpoint || '/api/contact-form', payload);
        statusEl.appendChild(el('div', { class:'form-success' }, [settings.successMessage || "Thank you! We'll prepare your personalized market analysis within 24 hours."]));
        form.reset();
        }catch(err){
        console.error(err);
        statusEl.appendChild(el('div', { class:'form-error' }, ['Unable to submit valuation request. Please call or email us.']));
        }finally{
        submitBtn.disabled = false;
        submitBtn.textContent = settings.submit?.label || 'Get My Free Home Valuation';
      }
    });

    container.appendChild(form);
    container.appendChild(statusEl);
    contentRoot.appendChild(sectionEl);
  }
  function renderAgentBio(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section agent-bio ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));

    const layout = el('div', { class:'agent-layout' });
    const portrait = el('div', { class:'agent-portrait' });
    if(settings.photo){
      portrait.appendChild(el('img', { src: settings.photo, alt: settings.name ? `${settings.name} headshot` : 'Agent photo' }));
    }
    layout.appendChild(portrait);

    const body = el('div', { class:'agent-body' });
    if(settings.name) body.appendChild(el('h3', {}, [settings.name]));
    if(settings.credentials) body.appendChild(el('p', { class:'muted small' }, [settings.credentials]));
    if(Array.isArray(settings.paragraphs)){
      settings.paragraphs.forEach(paragraph => body.appendChild(el('p', {}, [paragraph])));
    }

    if(Array.isArray(settings.stats) && settings.stats.length){
      body.appendChild(el('div', { class:'agent-stats' }, settings.stats.map(stat => el('div', { class:'stat' }, [
        el('span', { class:'stat-value' }, [stat.value || '']),
        el('span', { class:'stat-label' }, [stat.label || ''])
      ]))));
    }

    if(Array.isArray(settings.credentialsList) && settings.credentialsList.length){
      body.appendChild(el('div', { class:'agent-meta' }, [
        el('h4', {}, ['Credentials & Designations']),
        el('ul', {}, settings.credentialsList.map(item => el('li', {}, [item])))
      ]));
    }

    if(settings.cta){
      body.appendChild(el('a', { class:'btn btn-primary mt', href: settings.cta.href || '#', target: settings.cta.target || '_self' }, [settings.cta.label || 'Work With Me']));
    }

    layout.appendChild(body);
    container.appendChild(layout);
    contentRoot.appendChild(sectionEl);
  }
  function renderMarketAreas(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section market-areas ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const grid = el('div', { class:'premium-card-grid' }, (settings.areas || []).map(area => {
      const card = el('article', { class:'market-card' });
      card.appendChild(el('h3', {}, [area.name || 'Neighborhood']));
      if(area.description) card.appendChild(el('p', {}, [area.description]));
      const statsList = [];
      if(area.medianPrice) statsList.push(`Median price: ${area.medianPrice}`);
      if(area.marketTrend) statsList.push(`Market: ${area.marketTrend}`);
      if(area.daysOnMarket) statsList.push(`Days on market: ${area.daysOnMarket}`);
      if(statsList.length) card.appendChild(el('ul', { class:'muted small' }, statsList.map(item => el('li', {}, [item]))));
      if(area.link){
        card.appendChild(el('a', { class:'service-link', href: area.link.href || '#', target: area.link.target || '_blank' }, [area.link.label || 'View report ?']));
      }
      return card;
    }));

    container.appendChild(grid);
    if(settings.cta){
      container.appendChild(el('div', { class:'cta-row center mt' }, [ el('a', { class:'btn btn-secondary', href: settings.cta.href || '#', target: settings.cta.target || '_self' }, [settings.cta.label || 'View Market Reports']) ]));
    }
    contentRoot.appendChild(sectionEl);
  }
  function renderTestimonialsRealtor(section){ renderTestimonialsCarousel(section); }
  function renderSellerJourney(section){ renderTimelineSection(section, section.type); }
  function renderBuyerJourney(section){ renderTimelineSection(section, section.type); }
  function renderMarketStats(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section market-stats ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const statsRow = el('div', { class:'stats-row' }, (settings.stats || []).map(stat => el('div', { class:'stat-card' }, [
      el('span', { class:'stat-value' }, [stat.value || '']),
      el('span', { class:'stat-label' }, [stat.label || ''])
    ])));
    container.appendChild(statsRow);

    if(settings.context) container.appendChild(el('p', { class:'muted small' }, [settings.context]));
    if(settings.cta){
      container.appendChild(el('div', { class:'cta-row mt' }, [ el('a', { class:'btn btn-secondary', href: settings.cta.href || '#', target: settings.cta.target || '_self' }, [settings.cta.label || 'Get Detailed Report']) ]));
    }
    contentRoot.appendChild(sectionEl);
  }
  function renderResources(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section resources ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));

    const grid = el('div', { class:'premium-card-grid resources-grid' }, (settings.items || []).map(item => {
      const card = el('article', { class:'resource-card' });
      card.appendChild(el('span', { class:'service-icon' }, [item.icon || ICON_FALLBACK]));
      card.appendChild(el('h3', {}, [item.title || 'Resource']));
      if(item.description) card.appendChild(el('p', {}, [item.description]));
      if(item.link){
        card.appendChild(el('a', { class:'service-link', href: item.link.href || '#', target: item.link.target || '_blank' }, [item.link.label || 'Open resource ?']));
      }
      return card;
    }));

    container.appendChild(grid);
    contentRoot.appendChild(sectionEl);
  }

  const premiumRenderers = {
    'emergency-hero': (section) => renderHeroGeneric(section, 'emergency-hero'),
    'healthcare-hero': (section) => renderHeroGeneric(section, 'healthcare-hero'),
    'legal-hero': (section) => renderHeroGeneric(section, 'legal-hero'),
    'realtor-hero': (section) => renderHeroGeneric(section, 'realtor-hero'),
    'services-advanced': renderServicesGrid,
    'medical-services': renderServicesGrid,
    'realtor-services': renderServicesGrid,
    'quote-form-wizard': renderQuoteFormWizard,
    'before-after-showcase': renderBeforeAfterShowcase,
    'credentials-showcase': renderCredentialsShowcase,
    'testimonials-advanced': renderTestimonialsCarousel,
    'testimonials-medical': renderTestimonialsCarousel,
    'testimonials-legal': renderTestimonialsCarousel,
    'testimonials-realtor': renderTestimonialsRealtor,
    'coverage-map': renderCoverageMap,
    'faq-section': renderFaq,
    'faq-medical': renderFaq,
    'faq-legal': renderFaq,
    'faq-realtor': renderFaq,
    'cta-conversion': renderFinalCta,
    'cta-appointment': renderFinalCta,
    'cta-urgent': renderFinalCta,
    'cta-contact': renderFinalCta,
    'footer-comprehensive': renderComprehensiveFooter,
    'footer-medical': renderComprehensiveFooter,
    'footer-legal': renderComprehensiveFooter,
    'footer-realtor': renderComprehensiveFooter,
    'booking-advanced': renderBookingAdvanced,
    'team-showcase': renderProviderProfiles,
    'insurance-accepted': renderInsuranceAccepted,
    'patient-journey': renderPatientJourney,
    'location-hours': renderLocationHours,
    'practice-areas-grid': renderPracticeAreas,
    'case-evaluation-form': renderCaseEvaluationForm,
    'results-showcase': renderCaseResults,
    'attorney-team': renderAttorneyTeam,
    'differentiators': renderDifferentiators,
    'process-steps': renderProcessSteps,
    'credentials-legal': renderLegalCredentials,
    'property-showcase': renderPropertyShowcase,
    'valuation-calculator': renderValuationCalculator,
    'agent-bio': renderAgentBio,
    'market-areas': renderMarketAreas,
    'seller-journey': renderSellerJourney,
    'buyer-journey': renderBuyerJourney,
    'market-stats': renderMarketStats,
    'buyer-seller-resources': renderResources
  };

  function renderPremiumSite(cfg){
    ensurePremiumHeader(cfg);
    (cfg.sections || []).forEach(section => {
      const renderer = premiumRenderers[section.type];
      if(renderer){
        renderer(section, cfg);
      }else{
        console.warn('No renderer defined for section type', section.type);
      }
    });
  }

  /* ---------------------------- coverage --------------------------- */

  function renderBeforeAfterShowcase(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section before-after ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));
    const filters = el('div', { class:'filter-row' }, (settings.filters || []).map((filter, idx) => el('button', {
      type:'button', class:`filter-btn ${idx === 0 ? 'active' : ''}`, 'data-filter': filter.value || 'all'
    }, [filter.label || 'Filter'])));
    const gallery = el('div', { class:'before-after-grid' }, (settings.projects || []).map(project => {
      const item = el('article', { class:'before-after-item', 'data-category': project.category || 'all' });
      const wrapper = el('div', { class:'image-wrapper' });
      const beforeImg = el('img', { src: project.beforeImage, alt: project.beforeAlt || `${project.title} before` });
      const overlay = el('div', { class:'after-overlay' }, [ el('img', { src: project.afterImage, alt: project.afterAlt || `${project.title} after` }) ]);
      const slider = el('input', { type:'range', min:'0', max:'100', value:'50', class:'slider-control', 'aria-label':'Reveal after result' });
      slider.addEventListener('input', e => overlay.style.width = `${e.target.value}%`);
      wrapper.appendChild(beforeImg);
      wrapper.appendChild(overlay);
      wrapper.appendChild(slider);
      const info = el('div', { class:'project-info' }, [
        project.tag ? el('span', { class:'project-tag' }, [project.tag]) : null,
        el('h3', {}, [project.title || 'Project']),
        project.description ? el('p', {}, [project.description]) : null
      ].filter(Boolean));
      wrapper.addEventListener('click', () => openLightbox(project));
      item.appendChild(wrapper);
      item.appendChild(info);
      return item;
    }));

    container.appendChild(filters);
    container.appendChild(gallery);
    if(settings.cta){
      container.appendChild(el('div', { class:'cta-row center mt' }, [ el('a', { class:'btn btn-primary', href: settings.cta.href || '#', target: settings.cta.target || '_self' }, [settings.cta.label || 'Get Started']) ]));
    }
    contentRoot.appendChild(sectionEl);

    filters.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if(!btn) return;
      qsa('.filter-btn', filters).forEach(button => button.classList.toggle('active', button === btn));
      const filter = btn.getAttribute('data-filter');
      qsa('.before-after-item', gallery).forEach(item => {
        const cat = item.getAttribute('data-category');
        item.classList.toggle('hidden', filter !== 'all' && cat !== filter);
      });
    });

    function openLightbox(project){
      let lightbox = qs('#premium-lightbox');
      if(!lightbox){
        lightbox = el('div', { id:'premium-lightbox', class:'premium-lightbox', role:'dialog', 'aria-modal':'true' }, [
          el('button', { type:'button', class:'lightbox-close', 'aria-label':'Close gallery' }, ['?']),
          el('img', { alt:'' }),
          el('div', { class:'lightbox-caption' })
        ]);
        document.body.appendChild(lightbox);
        lightbox.addEventListener('click', evt => {
          if(evt.target === lightbox || evt.target.classList.contains('lightbox-close')) lightbox.classList.remove('open');
        });
      }
      const img = lightbox.querySelector('img');
      const caption = lightbox.querySelector('.lightbox-caption');
      img.src = project.afterImage;
      img.alt = project.afterAlt || project.title || 'Project result';
      caption.textContent = project.description || project.title || '';
      lightbox.classList.add('open');
    }
  }

  function renderCredentialsShowcase(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section credentials ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));
    if(settings.license){
      container.appendChild(el('div', { class:'credential-block license' }, [
        el('h3', {}, ['Licensing & Coverage']),
        el('ul', {}, settings.license.map(item => el('li', {}, [item])))
      ]));
    }
    if(settings.insurance){
      container.appendChild(el('div', { class:'credential-block insurance' }, [
        el('h3', {}, ['Insurance Coverage']),
        el('ul', {}, settings.insurance.map(item => el('li', {}, [item])))
      ]));
    }
    if(settings.manufacturers){
      container.appendChild(el('div', { class:'credential-block manufacturers' }, [
        el('h3', {}, ['Manufacturer Certifications']),
        el('div', { class:'logo-row' }, settings.manufacturers.map(name => el('span', { class:'logo-pill' }, [name])))
      ]));
    }
    if(settings.financing){
      container.appendChild(el('div', { class:'credential-block financing' }, [
        el('h3', {}, ['Financing Options']),
        el('p', {}, [settings.financing.description || 'Flexible payment plans available.']),
        settings.financing.partners ? el('div', { class:'logo-row' }, settings.financing.partners.map(name => el('span', { class:'logo-pill' }, [name]))) : null
      ].filter(Boolean)));
    }
    if(settings.warranty){
      container.appendChild(el('div', { class:'credential-block warranty' }, [
        el('h3', {}, ['Warranty']),
        el('p', {}, [settings.warranty])
      ]));
    }
    if(settings.emergencyBadge){
      container.appendChild(el('div', { class:'credential-block emergency' }, [
        el('span', { class:'emergency-badge' }, [settings.emergencyBadge])
      ]));
    }
    contentRoot.appendChild(sectionEl);
  }

  function renderCoverageMap(section){
    const settings = section.settings || {};
    const { sectionEl, container } = createPremiumSection(section, `premium-section coverage ${section.type}`);
    if(settings.heading) container.appendChild(el('h2', {}, [settings.heading]));
    if(settings.subheading) container.appendChild(el('p', { class:'lead' }, [settings.subheading]));
    const lookupId = `${section.id || section.type}-zip`;
    const lookup = el('div', { class:'coverage-lookup' }, [
      el('label', { for: lookupId }, ['Enter your ZIP code']),
      el('div', { class:'lookup-controls' }, [
        el('input', { type:'text', id:lookupId, placeholder:'e.g., 75001', maxlength:'10' }),
        el('button', { type:'button', class:'btn btn-primary' }, ['Check Coverage'])
      ]),
      el('div', { class:'lookup-result', id:`${lookupId}-result` })
    ]);
    const areas = el('div', { class:'coverage-areas' }, [
      el('div', { class:'coverage-radius' }, [
        el('span', { class:'radius-value' }, [settings.radius || 'Serving a 50-mile radius']),
        settings.mapNote ? el('p', { class:'muted small' }, [settings.mapNote]) : null
      ].filter(Boolean)),
      el('ul', { class:'areas-list' }, (settings.areas || []).map(area => el('li', {}, [area])))
    ]);
    if(settings.cta){
      areas.appendChild(el('div', { class:'cta-row center mt' }, [ el('a', { class:'btn btn-secondary', href: settings.cta.href || '#', target: settings.cta.target || '_self' }, [settings.cta.label || 'Call Us']) ]));
    }

    lookup.querySelector('button').addEventListener('click', () => {
      const input = lookup.querySelector('input');
      const result = lookup.querySelector('.lookup-result');
      const value = input.value.trim();
      if(!value){
        result.textContent = 'Please enter a ZIP code.';
        result.classList.remove('success','error');
        return;
      }
      const match = (settings.zipCodes || []).some(zip => zip === value || (zip.endsWith('*') && value.startsWith(zip.slice(0, -1))));
      result.textContent = match ? (settings.successMessage || 'Yes, we serve your area!') : (settings.failureMessage || 'Please call us to confirm coverage.');
      result.classList.toggle('success', match);
      result.classList.toggle('error', !match);
    });

    container.appendChild(lookup);
    container.appendChild(areas);
    contentRoot.appendChild(sectionEl);
  }

  /* -------------------------- premium main ------------------------- */

  try{
    state.config = await loadConfig();
    renderSite(state.config);
  }catch(err){
    console.error(err);
    const fallback = el('div', { class:'container' }, [
      el('div', { class:'card' }, [
        el('h2', {}, ['Could not load site.json']),
        el('p', {}, ['Place a configuration file at ', el('code', {}, ['public/data/site.json']), ' or run a local server.'])
      ])
    ]);
    contentRoot.appendChild(fallback);
  }
})();
