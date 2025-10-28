/* Minimal client-side renderer for site.json */
(async function(){
  const state = { config:null };

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
    
    // Check if we're on a published site (URL contains /sites/)
    const isPublishedSite = window.location.pathname.includes('/sites/');
    const configPath = isPublishedSite ? './site.json' : './data/site.json';
    
    const res = await fetch(configPath, { cache:'no-cache' });
    if(!res.ok){ throw new Error(`Failed to load ${configPath}`); }
    return res.json();
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

  function renderAll(cfg){
    renderHeader(cfg);
    renderHero(cfg);
    renderServices(cfg);
    renderAbout(cfg);
    renderTestimonials(cfg);
    renderPricing(cfg);
    renderContact(cfg);
    renderPages(cfg);
    renderProducts(cfg);
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
    const grid = el('div', { class:'grid-3' }, cfg.products.map(prod => el('div', { class:'card' }, [
      el('h3', {}, [prod.name || 'Product']),
      prod.price != null ? el('p', { class:'mt-2' }, [`$${prod.price}`]) : null,
      renderMarkdown(prod.description || '')
    ])));
    container.appendChild(grid);
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
