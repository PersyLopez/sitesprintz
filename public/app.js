/* Minimal client-side renderer for site.json */
(async function(){
  const IS_PUBLISHED_SITE = window.location.pathname.includes('/sites/');
  const state = { config:null, templates:null };

  const qs = (sel, el=document) => el.querySelector(sel);
  const qsa = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  async function loadConfig(){
    const params = new URLSearchParams(window.location.search);
    const tpl = params.get('template');
    if(tpl){
      try{
        const resTpl = await fetch(`/data/templates/${encodeURIComponent(tpl)}.json`, { cache:'no-cache' });
        if(resTpl.ok){ return resTpl.json(); }
      }catch(_){ /* fall back below */ }
    }
    
    if(IS_PUBLISHED_SITE){
      // For published sites, load from local site.json
      const res = await fetch('./site.json', { cache:'no-cache' });
      if(!res.ok){ throw new Error('Failed to load site.json'); }
      return res.json();
    } else {
      // For main site, try API endpoint first, then fallback to static file
      try {
        const resApi = await fetch('/api/site', { cache:'no-cache' });
        if(resApi.ok){ 
          return resApi.json(); 
        }
      }catch(_){ /* fall back to static file */ }
      
      // Fallback to static file
      const res = await fetch('./data/site.json', { cache:'no-cache' });
      if(!res.ok){ throw new Error('Failed to load data/site.json'); }
      return res.json();
    }
  }

  async function loadTemplatesIndex(){
    try{
      const res = await fetch('/data/templates/index.json', { cache:'no-cache' });
      if(!res.ok) return null;
      return res.json();
    }catch(_){
      return null;
    }
  }

  function updateOpenGraphMetaTags(cfg){
    // Update title and description
    const title = cfg.brand?.name || 'Small Business Website';
    const description = cfg.hero?.subtitle || cfg.about?.body || 'Professional business website';
    const image = cfg.hero?.image || '/assets/og-image.jpg';
    
    document.title = title;
    
    // Update or create meta tags
    function setMeta(name, property, content){
      let meta = document.querySelector(`meta[${property ? 'property' : 'name'}="${name}"]`);
      if(!meta){
        meta = document.createElement('meta');
        meta.setAttribute(property ? 'property' : 'name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    }
    
    // Basic meta tags
    setMeta('description', false, description);
    
    // Open Graph tags for Facebook, LinkedIn, etc.
    setMeta('og:title', true, title);
    setMeta('og:description', true, description);
    setMeta('og:image', true, new URL(image, window.location.origin).href);
    setMeta('og:url', true, window.location.href);
    setMeta('og:type', true, 'website');
    
    // Twitter Card tags
    setMeta('twitter:card', false, 'summary_large_image');
    setMeta('twitter:title', false, title);
    setMeta('twitter:description', false, description);
    setMeta('twitter:image', false, new URL(image, window.location.origin).href);
  }

  function setTheme(theme){
    if(!theme) return;
    const root = document.documentElement;
    for(const [k,v] of Object.entries(theme)){
      root.style.setProperty(`--${k}`, v);
    }
  }

  function renderHeader(cfg){
    const brandName = qs('#brand-name');
    const brandLogo = qs('#brand-logo');
    const navLinks = qs('#nav-links');

    if(cfg.brand?.name && brandName) brandName.textContent = cfg.brand.name;
    if(cfg.brand?.logo && brandLogo){ brandLogo.src = cfg.brand.logo; brandLogo.alt = cfg.brand.alt || cfg.brand.name || 'Logo'; }

    if(navLinks){
      navLinks.innerHTML = '';
      const dynamicNav = [...(cfg.nav || [])];
      if(Array.isArray(cfg.pages) && cfg.pages.length){
        dynamicNav.push({ label: 'Pages', href: '#pages' });
      }
      if(Array.isArray(cfg.products) && cfg.products.length){
        dynamicNav.push({ label: 'Products', href: '#products' });
      }
      dynamicNav.forEach(item =>{
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.href || '#';
        a.textContent = item.label || '';
        li.appendChild(a);
        navLinks.appendChild(li);
      });
    }

    const navToggle = qs('#nav-toggle');
    const siteNav = qs('#site-nav');
    navToggle?.addEventListener('click', ()=>{
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      siteNav.classList.toggle('open');
    });
    
    // Close mobile nav when clicking a link
    if(navLinks){
      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          if(window.innerWidth <= 720 && siteNav.classList.contains('open')){
            siteNav.classList.remove('open');
            if(navToggle) navToggle.setAttribute('aria-expanded', 'false');
          }
        });
      });
    }
  }

  function el(tag, attrs={}, children=[]){
    const node = document.createElement(tag);
    for(const [k,v] of Object.entries(attrs)){
      if(k === 'class') node.className = v;
      else if(k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if(v !== undefined && v !== null) node.setAttribute(k, v);
    }
    for(const child of children){
      if(child == null) continue;
      if(typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function sectionWrapper(id, classes='section'){
    return el('section', { id, class: classes }, [ el('div', { class:'container' }, []) ]);
  }

  function renderHero(cfg){
    if(!cfg.hero) return;
    const sec = sectionWrapper('hero');
    const container = sec.firstChild;

    const left = el('div', { class:'hero-card' }, [
      el('div', { class:'eyebrow' }, [cfg.hero.eyebrow || '']),
      el('h1', { class:'hero-title' }, [cfg.hero.title || '']),
      el('p', { class:'hero-subtitle' }, [cfg.hero.subtitle || '']),
      el('div', { class:'cta-row' }, (cfg.hero.cta || []).map(btn => el('a', { class: btn.variant === 'secondary' ? 'btn btn-secondary' : 'btn btn-primary', href: btn.href || '#' }, [btn.label || '']))),
    ]);

    const rightImg = cfg.hero.image ? el('img', { src: cfg.hero.image, alt: cfg.hero.imageAlt || '' }) : null;
    const grid = el('div', { class:'hero' }, [left, rightImg]);
    container.appendChild(grid);
    document.getElementById('content').appendChild(sec);
  }

  function renderServices(cfg){
    if(!cfg.services) return;
    const sec = sectionWrapper('services');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title' }, [cfg.services.title || 'Services']));
    if(cfg.services.subtitle) container.appendChild(el('p', { class:'section-subtitle' }, [cfg.services.subtitle]));

    const grid = el('div', { class:'cards' }, (cfg.services.items || []).map(svc => el('div', { class:'card' }, [
      el('h3', {}, [svc.title || '']),
      el('p', {}, [svc.description || ''])
    ])));
    container.appendChild(grid);
    document.getElementById('content').appendChild(sec);
  }

  function renderAbout(cfg){
    if(!cfg.about) return;
    const sec = sectionWrapper('about');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title' }, [cfg.about.title || 'About']));
    if(cfg.about.body){
      const p = el('p', {}, [cfg.about.body]);
      container.appendChild(p);
    }
    document.getElementById('content').appendChild(sec);
  }

  function renderTestimonials(cfg){
    if(!cfg.testimonials) return;
    const sec = sectionWrapper('testimonials');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title' }, [cfg.testimonials.title || 'Testimonials']));
    const grid = el('div', { class:'grid-3' }, (cfg.testimonials.items || []).map(t => el('div', { class:'card' }, [
      el('p', {}, ['"' + (t.quote || '') + '"']),
      el('p', { class:'muted mt-2' }, ['— ' + (t.author || '')])
    ])));
    container.appendChild(grid);
    document.getElementById('content').appendChild(sec);
  }

  function renderPricing(cfg){
    if(!cfg.pricing) return;
    const sec = sectionWrapper('pricing');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title' }, [cfg.pricing.title || 'Pricing']));
    const grid = el('div', { class:'grid-3' }, (cfg.pricing.plans || []).map(p => el('div', { class:'card' }, [
      el('h3', {}, [p.name || 'Plan']),
      el('p', { class:'mt-2' }, [p.description || '']),
      el('p', { class:'mt-3' }, [p.price ? `$${p.price}` : '']),
      el('div', { class:'mt-3' }, [ el('a', { class:'btn btn-primary', href:p.cta?.href || '#' }, [p.cta?.label || 'Choose plan']) ])
    ])));
    container.appendChild(grid);
    document.getElementById('content').appendChild(sec);
  }

  function renderContact(cfg){
    if(!cfg.contact) return;
    const sec = sectionWrapper('contact');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title' }, [cfg.contact.title || 'Contact']));
    if(cfg.contact.subtitle) container.appendChild(el('p', { class:'section-subtitle' }, [cfg.contact.subtitle]));

    const email = cfg.contact.email ? el('a', { href:`mailto:${cfg.contact.email}`, class:'btn btn-secondary mt-3' }, ['Email us']) : null;
    const phone = cfg.contact.phone ? el('a', { href:`tel:${cfg.contact.phone}`, class:'btn btn-secondary mt-3' }, ['Call us']) : null;
    const ctas = el('div', { class:'cta-row' }, [email, phone].filter(Boolean));
    container.appendChild(ctas);

    document.getElementById('content').appendChild(sec);
  }

  function renderTemplateShowcase(cfg){
    if(IS_PUBLISHED_SITE) return;
    
    // Don't show template showcase when previewing a specific template
    const params = new URLSearchParams(window.location.search);
    if(params.get('template')) return;
    
    const templateIndex = state.templates;
    if(!templateIndex || !Array.isArray(templateIndex.templates)) return;

    const tiers = [
      {
        plan: 'Starter',
        title: 'Starter Templates',
        description: 'Launch a catalog site fast. Perfect for restaurants, salons, consultants, and service businesses.'
      },
      {
        plan: 'Checkout',
        title: 'Checkout Ready',
        description: 'Accept secure payments with Stripe. Same editing experience, added commerce power.'
      },
      {
        plan: 'Premium',
        title: 'Premium Suite',
        description: 'Multi-page sites with blogs, scheduling, and CRM. Coming soon.'
      }
    ];

    const sec = sectionWrapper('templates', 'section templates-section');
    const container = sec.firstChild;
    container.appendChild(el('h2', { class:'section-title text-center' }, ['Templates by tier']));
    container.appendChild(el('p', { class:'section-subtitle text-center' }, ['Pick your starting point based on features you need. All templates are fully customizable.']));

    tiers.forEach(tier => {
      const tierTemplates = templateIndex.templates.filter(t => t.plan === tier.plan && tier.plan !== 'Premium');
      const tierBlock = el('div', { class:'tier-block-compact card' }, [
        el('div', { class:'tier-header-compact' }, [
          el('h3', {}, [tier.title]),
          el('p', { class:'muted' }, [tier.description])
        ])
      ]);

      if(tier.plan === 'Premium'){
        tierBlock.appendChild(el('div', { class:'premium-placeholder mt-2' }, [
          el('p', { class:'muted' }, ['Full-site templates in development. Join the waitlist for early access.'])
        ]));
      } else if(tierTemplates.length){
        const cards = tierTemplates.map(template => {
          const featureList = Array.isArray(template.features) && template.features.length
            ? el('ul', { class:'features-compact' }, template.features.slice(0, 3).map(f => el('li', {}, [f])))
            : null;

          return el('div', { class:'template-card-compact card' }, [
            el('span', { class:'template-badge-compact' }, [template.plan === 'Checkout' ? 'Checkout' : 'Starter']),
            el('h4', {}, [template.name]),
            el('p', { class:'muted template-desc-compact' }, [template.description || '']),
            featureList,
            el('a', {
              class:'btn btn-secondary btn-small mt-2',
              href:`/?template=${encodeURIComponent(template.id)}`,
              target:'_blank',
              rel:'noopener'
            }, ['Preview →'])
          ]);
        });

        tierBlock.appendChild(el('div', { class:'template-grid-compact' }, cards));
      }

      container.appendChild(tierBlock);
    });

    document.getElementById('content').appendChild(sec);
  }

  function renderFooter(cfg){
    const footer = qs('#footer-content');
    if(!footer) return; // Skip if footer element doesn't exist
    
    footer.innerHTML = '';
    const year = new Date().getFullYear();
    
    // Add share buttons section
    const shareButtons = [];
    
    // Show native share on mobile if available
    if (navigator.share) {
      shareButtons.push(el('button', { 
        class: 'share-btn',
        style: 'background: linear-gradient(135deg, #f97316, #ea580c); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 1rem;',
        onclick: 'nativeShare()'
      }, ['📤 Share']));
    }
    
    // Add individual share buttons
    shareButtons.push(
      el('button', { 
        class: 'share-btn',
        style: 'background: #1877F2; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onclick: 'shareToFacebook()'
      }, ['📘 Facebook']),
      el('button', { 
        class: 'share-btn',
        style: 'background: #1DA1F2; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onclick: 'shareToTwitter()'
      }, ['🐦 Twitter']),
      el('button', { 
        class: 'share-btn',
        style: 'background: #0077B5; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onclick: 'shareToLinkedIn()'
      }, ['💼 LinkedIn']),
      el('button', { 
        class: 'share-btn',
        style: 'background: #1f2937; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;',
        onclick: 'copyLinkToClipboard()'
      }, ['🔗 Copy Link'])
    );
    
    const shareSection = el('div', { style: 'text-align: center; margin-bottom: 30px;' }, [
      el('h3', { style: 'margin-bottom: 15px; font-size: 1.2rem;' }, ['Share This Page']),
      el('div', { style: 'display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;' }, shareButtons)
    ]);
    
    footer.appendChild(shareSection);
    footer.appendChild(el('p', { class:'muted' }, [cfg.footer?.text || `© ${year} ${cfg.brand?.name || ''}. All rights reserved.`]));
  }

  // Share functions (make global)
  window.shareToFacebook = function() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
  }

  window.shareToTwitter = function() {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${title}`, '_blank', 'width=600,height=400');
  }

  window.shareToLinkedIn = function() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=600,height=400');
  }

  window.copyLinkToClipboard = async function() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      
      // Show feedback
      const event = new CustomEvent('showNotification', { 
        detail: { message: '✅ Link copied to clipboard!', type: 'success' } 
      });
      document.dispatchEvent(event);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      alert('Link copied to clipboard!');
    }
  }

  // Native share on mobile devices
  window.nativeShare = async function() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          text: document.querySelector('meta[name="description"]')?.content || '',
          url: window.location.href,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      // Fallback to copy
      copyLinkToClipboard();
    }
  }

  // Notification system for copy feedback
  document.addEventListener('DOMContentLoaded', () => {
    const notification = document.createElement('div');
    notification.id = 'shareNotification';
    notification.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #10b981; color: white; padding: 15px 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); z-index: 10000; display: none; font-weight: 600;';
    document.body.appendChild(notification);

    document.addEventListener('showNotification', (e) => {
      notification.textContent = e.detail.message;
      notification.style.display = 'block';
      setTimeout(() => {
        notification.style.display = 'none';
      }, 3000);
    });
  });

  // Enhanced rendering functions
  function renderStats(cfg){
    if(!cfg.stats || !cfg.stats.items || !cfg.stats.items.length) return;
    const sec = sectionWrapper('stats');
    const container = sec.firstChild;

    if(cfg.stats.title) container.appendChild(el('h2', { class:'section-title text-center' }, [cfg.stats.title]));
    
    const grid = el('div', { class:'stats-grid' }, cfg.stats.items.map(stat => el('div', { class:'stat-item' }, [
      el('div', { class:'stat-number' }, [stat.number || '0']),
      el('div', { class:'stat-label' }, [stat.label || ''])
    ])));
    
    container.appendChild(grid);
    document.getElementById('content').appendChild(sec);
  }

  function renderFAQ(cfg){
    if(!cfg.faq || !cfg.faq.items || !cfg.faq.items.length) return;
    const sec = sectionWrapper('faq');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title' }, [cfg.faq.title || 'Frequently Asked Questions']));
    if(cfg.faq.subtitle) container.appendChild(el('p', { class:'section-subtitle' }, [cfg.faq.subtitle]));

    const accordion = el('div', { class:'accordion' }, cfg.faq.items.map((item, idx) => {
      const itemEl = el('div', { class:'accordion-item' }, [
        el('div', { 
          class:'accordion-header',
          role:'button',
          tabindex:'0',
          'aria-expanded':'false',
          onclick: (e) => toggleAccordion(e.currentTarget)
        }, [
          el('span', {}, [item.question || '']),
          el('span', { class:'accordion-icon' }, ['▼'])
        ]),
        el('div', { class:'accordion-content' }, [
          el('p', {}, [item.answer || ''])
        ])
      ]);
      return itemEl;
    }));
    
    container.appendChild(accordion);
    document.getElementById('content').appendChild(sec);
  }

  function toggleAccordion(header){
    const item = header.parentElement;
    const content = item.querySelector('.accordion-content');
    const icon = header.querySelector('.accordion-icon');
    const isOpen = content.classList.contains('open');
    
    // Close all accordions
    document.querySelectorAll('.accordion-content').forEach(c => c.classList.remove('open'));
    document.querySelectorAll('.accordion-icon').forEach(i => i.textContent = '▼');
    document.querySelectorAll('.accordion-header').forEach(h => h.setAttribute('aria-expanded', 'false'));
    
    // Open clicked one if it was closed
    if(!isOpen){
      content.classList.add('open');
      icon.textContent = '▲';
      header.setAttribute('aria-expanded', 'true');
    }
  }

  function renderCredentials(cfg){
    if(!cfg.credentials || !cfg.credentials.items || !cfg.credentials.items.length) return;
    const sec = sectionWrapper('credentials');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title text-center' }, [cfg.credentials.title || 'Credentials & Certifications']));
    if(cfg.credentials.subtitle) container.appendChild(el('p', { class:'section-subtitle text-center' }, [cfg.credentials.subtitle]));

    const grid = el('div', { class:'credentials-grid' }, cfg.credentials.items.map(cred => el('div', { class:'credential-badge' }, [
      el('div', { class:'credential-icon' }, [cred.icon || '✓']),
      el('h3', { class:'credential-name' }, [cred.name || '']),
      cred.description ? el('p', { class:'credential-desc muted' }, [cred.description]) : null
    ].filter(Boolean))));
    
    container.appendChild(grid);
    document.getElementById('content').appendChild(sec);
  }

  function renderProcess(cfg){
    if(!cfg.process || !cfg.process.steps || !cfg.process.steps.length) return;
    const sec = sectionWrapper('process');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title' }, [cfg.process.title || 'How It Works']));
    if(cfg.process.subtitle) container.appendChild(el('p', { class:'section-subtitle' }, [cfg.process.subtitle]));

    const timeline = el('div', { class:'process-timeline' }, cfg.process.steps.map((step, idx) => el('div', { class:'process-step' }, [
      el('div', { class:'process-number' }, [String(idx + 1)]),
      el('div', { class:'process-content' }, [
        el('h3', {}, [step.title || '']),
        el('p', { class:'muted' }, [step.description || ''])
      ])
    ])));
    
    container.appendChild(timeline);
    document.getElementById('content').appendChild(sec);
  }

  function renderTeam(cfg){
    if(!cfg.team || !cfg.team.members || !cfg.team.members.length) return;
    const sec = sectionWrapper('team');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title text-center' }, [cfg.team.title || 'Meet Our Team']));
    if(cfg.team.subtitle) container.appendChild(el('p', { class:'section-subtitle text-center' }, [cfg.team.subtitle]));

    const grid = el('div', { class:'team-grid' }, cfg.team.members.map(member => {
      const credentials = member.credentials && member.credentials.length 
        ? el('ul', { class:'team-credentials muted' }, member.credentials.map(c => el('li', {}, [c])))
        : null;

      return el('div', { class:'team-member' }, [
        member.image ? el('img', { src:member.image, alt:member.name || '', class:'team-photo' }) : null,
        el('h3', { class:'team-name' }, [member.name || '']),
        el('p', { class:'team-title' }, [member.title || '']),
        el('p', { class:'team-bio' }, [member.bio || '']),
        credentials
      ].filter(Boolean));
    }));
    
    container.appendChild(grid);
    document.getElementById('content').appendChild(sec);
  }

  function renderTestimonialsAdvanced(cfg){
    if(!cfg.testimonials || !cfg.testimonials.items || !cfg.testimonials.items.length) return;
    const sec = sectionWrapper('reviews');
    const container = sec.firstChild;

    container.appendChild(el('h2', { class:'section-title text-center' }, [cfg.testimonials.title || 'What Our Customers Say']));
    if(cfg.testimonials.subtitle) container.appendChild(el('p', { class:'section-subtitle text-center' }, [cfg.testimonials.subtitle]));

    // Show stats if available
    if(cfg.testimonials.stats){
      const stats = cfg.testimonials.stats;
      const statsRow = el('div', { class:'testimonial-stats' }, [
        el('div', { class:'stat-item' }, [
          el('div', { class:'stat-number' }, [String(stats.averageRating || '0')]),
          el('div', { class:'stat-label' }, ['Average Rating'])
        ]),
        el('div', { class:'stat-item' }, [
          el('div', { class:'stat-number' }, [String(stats.totalReviews || '0')]),
          el('div', { class:'stat-label' }, ['Total Reviews'])
        ])
      ]);
      container.appendChild(statsRow);
    }

    const grid = el('div', { class:'cards' }, cfg.testimonials.items.map(t => {
      const rating = t.rating || 5;
      const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      
      return el('div', { class:'testimonial-card' }, [
        el('div', { class:'testimonial-stars' }, [stars]),
        el('p', { class:'testimonial-text' }, ['"' + (t.text || t.quote || '') + '"']),
        el('div', { class:'testimonial-author' }, [
          t.image ? el('img', { src:t.image, alt:t.author || '', class:'testimonial-avatar' }) : null,
          el('div', { class:'testimonial-info' }, [
            el('p', { class:'testimonial-name' }, [t.author || '']),
            el('p', { class:'testimonial-location' }, [t.location || ''])
          ])
        ].filter(Boolean))
      ]);
    }));
    
    container.appendChild(grid);
    document.getElementById('content').appendChild(sec);
  }

  function renderProductsEnhanced(cfg){
    if(!Array.isArray(cfg.products) || cfg.products.length === 0) return;
    const sec = sectionWrapper('products');
    const container = sec.firstChild;
    
    container.appendChild(el('h2', { class:'section-title' }, [cfg.productsTitle || 'Our Services']));
    if(cfg.productsSubtitle) container.appendChild(el('p', { class:'section-subtitle' }, [cfg.productsSubtitle]));

    // Get unique categories
    const categories = ['All', ...new Set(cfg.products.map(p => p.category).filter(Boolean))];
    
    // Filter buttons
    if(categories.length > 1){
      const filterContainer = el('div', { class:'filter-buttons' }, 
        categories.map((cat, idx) => 
          el('button', {
            class: `filter-btn ${idx === 0 ? 'active' : ''}`,
            'data-category': cat,
            onclick: (e) => filterProducts(e, cat)
          }, [cat])
        )
      );
      container.appendChild(filterContainer);
    }

    const allowCheckout = cfg.settings?.allowCheckout !== false;
    const productCtaLabel = cfg.settings?.productCta || 'Book Now';
    const productCtaHref = cfg.settings?.productCtaHref || '#contact';
    const productNote = cfg.settings?.productNote;

    const grid = el('div', { class:'cards product-grid', id:'products-grid' }, cfg.products.map((prod, i) => {
      const badges = [];
      if(prod.popular) badges.push(el('span', { class:'badge badge-popular' }, ['Popular']));
      if(prod.new) badges.push(el('span', { class:'badge badge-new' }, ['New']));

      const actionNode = allowCheckout
        ? el('button', { class:'btn btn-primary mt-2', 'data-product-index': String(i) }, ['Buy'])
        : el('a', { class:'btn btn-secondary mt-2', href: productCtaHref }, [productCtaLabel]);

      return el('div', { 
        class:'card product-card',
        'data-category': prod.category || ''
      }, [
        badges.length ? el('div', { class:'badge-container' }, badges) : null,
        prod.image ? el('img', { src:prod.image, alt:prod.imageAlt || prod.name, class:'product-image' }) : null,
        el('h3', {}, [prod.name || 'Product']),
        prod.price != null ? el('p', { class:'product-price mt-2' }, [`$${prod.price}`]) : null,
        prod.duration ? el('p', { class:'product-meta muted' }, [`⏱️ ${prod.duration}`]) : null,
        renderMarkdown(prod.description || ''),
        actionNode
      ].filter(Boolean));
    }));
    
    container.appendChild(grid);

    if(!allowCheckout && productNote){
      container.appendChild(el('p', { class:'muted mt-3' }, [productNote]));
    }

    if(allowCheckout){
      grid.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-product-index]');
        if(!btn) return;
        e.preventDefault();
        const idx = Number(btn.getAttribute('data-product-index'));
        if(Number.isNaN(idx)) return;
        const prevText = btn.textContent;
        btn.disabled = true; btn.textContent = 'Redirecting…';
        try{
          const idemKey = (self.crypto && typeof self.crypto.randomUUID === 'function') ? self.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
          const res = await fetch('/api/payments/checkout-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey },
            body: JSON.stringify({ productIndex: idx, quantity: 1, currency: 'usd', siteId: cfg.brand?.name || '' })
          });
          const data = await res.json().catch(()=>({}));
          if(res.ok && data.url){
            window.location.href = data.url;
          }else{
            alert(data?.error || 'Payment is unavailable.');
          }
        }catch(err){
          alert('Failed to start checkout.');
        }finally{
          btn.disabled = false; btn.textContent = prevText;
        }
      });
    }

    document.getElementById('content').appendChild(sec);
  }

  function filterProducts(event, category){
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const products = document.querySelectorAll('.product-card');
    products.forEach(card => {
      if(category === 'All' || card.dataset.category === category){
        card.style.display = 'block';
      }else{
        card.style.display = 'none';
      }
    });
  }

  function renderAll(cfg){
    renderHeader(cfg);
    renderHero(cfg);
    renderTemplateShowcase(cfg);
    renderStats(cfg);
    renderServices(cfg);
    renderAbout(cfg);
    renderProcess(cfg);
    renderCredentials(cfg);
    renderTeam(cfg);
    renderTestimonialsAdvanced(cfg);
    renderPricing(cfg);
    renderFAQ(cfg);
    renderContact(cfg);
    renderPages(cfg);
    renderProductsEnhanced(cfg);
    renderFooter(cfg);
  }

  function renderPages(cfg){
    if(!Array.isArray(cfg.pages) || cfg.pages.length === 0) return;
    const sec = sectionWrapper('pages');
    const container = sec.firstChild;
    container.appendChild(el('h2', { class:'section-title' }, ['Pages']));
    const grid = el('div', { class:'grid-2' }, cfg.pages.map(p => el('div', { class:'card' }, [
      el('h3', {}, [p.title || p.slug || 'Page']),
      renderMarkdown(p.body || '')
    ])));
    container.appendChild(grid);
    document.getElementById('content').appendChild(sec);
  }

  function renderProducts(cfg){
    if(!Array.isArray(cfg.products) || cfg.products.length === 0) return;
    const sec = sectionWrapper('products');
    const container = sec.firstChild;
    container.appendChild(el('h2', { class:'section-title' }, ['Products']));

    const allowCheckout = cfg.settings?.allowCheckout !== false;
    const productCtaLabel = cfg.settings?.productCta || 'Contact us to order';
    const productCtaHref = cfg.settings?.productCtaHref || '#contact';
    const productNote = cfg.settings?.productNote;

    const grid = el('div', { class:'grid-3' }, cfg.products.map((prod, i) => {
      const actionNode = allowCheckout
        ? el('button', { class:'btn btn-primary mt-2', 'data-product-index': String(i) }, ['Buy'])
        : el('a', { class:'btn btn-secondary mt-2', href: productCtaHref }, [productCtaLabel]);

      return el('div', { class:'card' }, [
        el('h3', {}, [prod.name || 'Product']),
        prod.price != null ? el('p', { class:'mt-2' }, [`$${prod.price}`]) : null,
        renderMarkdown(prod.description || ''),
        actionNode
      ]);
    }));
    container.appendChild(grid);

    if(!allowCheckout && productNote){
      container.appendChild(el('p', { class:'muted mt-3' }, [productNote]));
    }

    if(allowCheckout){
      // Attach delegated click handler for checkout only when enabled
      grid.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-product-index]');
        if(!btn) return;
        e.preventDefault();
        const idx = Number(btn.getAttribute('data-product-index'));
        if(Number.isNaN(idx)) return;
        const prevText = btn.textContent;
        btn.disabled = true; btn.textContent = 'Redirecting…';
        try{
          const idemKey = (self.crypto && typeof self.crypto.randomUUID === 'function') ? self.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
          const res = await fetch('/api/payments/checkout-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey },
            body: JSON.stringify({ productIndex: idx, quantity: 1, currency: 'usd', siteId: cfg.brand?.name || '' })
          });
          const data = await res.json().catch(()=>({}));
          if(res.ok && data.url){
            window.location.href = data.url;
          }else{
            alert(data?.error || 'Payment is unavailable.');
          }
        }catch(err){
          alert('Failed to start checkout.');
        }finally{
          btn.disabled = false; btn.textContent = prevText;
        }
      });
    }

    document.getElementById('content').appendChild(sec);
  }

  function renderMarkdown(md){
    // extremely small markdown subset: headings (#, ##), bold (**), italics (_), line breaks
    if(!md) return el('p', {}, ['']);
    let html = md
      .replace(/^###\s?(.*)$/gm, '<h4>$1</h4>')
      .replace(/^##\s?(.*)$/gm, '<h3>$1</h3>')
      .replace(/^#\s?(.*)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
    const wrapper = el('div', { class:'mt-2' });
    wrapper.innerHTML = html;
    return wrapper;
  }

  try{
    state.config = await loadConfig();
    if(!IS_PUBLISHED_SITE){
      state.templates = await loadTemplatesIndex();
    }
    updateOpenGraphMetaTags(state.config);
    setTheme(state.config.themeVars);
    renderAll(state.config);
    
    // Clear the loading text from #app div
    const appDiv = document.getElementById('app');
    if(appDiv) {
      appDiv.innerHTML = '';
    }
  }catch(err){
    console.error('App error:', err);
    const main = document.getElementById('app') || document.getElementById('content');
    if(main){
      main.innerHTML = `
        <div class="container" style="max-width: 800px; margin: 50px auto; padding: 20px;">
          <div class="card" style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #ef4444; margin-bottom: 15px;">⚠️ Could not load site data</h2>
            <p style="color: #6b7280; margin-bottom: 20px;">There was an error loading the site configuration.</p>
            <p style="color: #9ca3af; font-size: 0.9rem;">Error: ${err.message}</p>
          </div>
        </div>
      `;
    }
  }
})();
