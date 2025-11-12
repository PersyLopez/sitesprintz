const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

async function fetchSite(){
  const res = await fetch('/api/site');
  if(!res.ok) throw new Error('Failed to load site');
  return res.json();
}

async function saveSite(site, token){
  const res = await fetch('/api/site', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(site)
  });
  if(!res.ok) throw new Error('Failed to save');
  return res.json();
}

async function fetchTemplatesIndex(){
  const res = await fetch('/data/templates/index.json', { cache: 'no-cache' });
  if(!res.ok) throw new Error('Failed to load templates');
  return res.json();
}

async function fetchTemplateById(id){
  const res = await fetch(`/data/templates/${encodeURIComponent(id)}.json`, { cache: 'no-cache' });
  if(!res.ok) throw new Error('Template not found');
  return res.json();
}

function renderTables(state){
  const pagesBody = $('#pages-table tbody');
  pagesBody.innerHTML = '';
  state.site.pages.forEach((p, idx) =>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.slug}</td><td>${p.title}</td><td><button data-idx="${idx}" class="edit-page btn btn-secondary">Edit</button> <button data-idx="${idx}" class="del-page btn btn-secondary">Delete</button></td>`;
    pagesBody.appendChild(tr);
  });

  const prodBody = $('#products-table tbody');
  prodBody.innerHTML = '';
  state.site.products.forEach((p, idx) =>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.name}</td><td>${p.price ?? ''}</td><td><button data-idx="${idx}" class="edit-prod btn btn-secondary">Edit</button> <button data-idx="${idx}" class="del-prod btn btn-secondary">Delete</button></td>`;
    prodBody.appendChild(tr);
  });
}

(async function(){
  const state = {
    site: { pages: [], products: [] },
    selectedPageIndex: null,
    selectedProdIndex: null
  };

  // Initialize templates selector
  try{
    const idx = await fetchTemplatesIndex();
    const sel = $('#templateSelect');
    if(sel){
      sel.innerHTML = ['<option value="">Select a template…</option>']
        .concat((idx.templates || []).map(t => `<option value="${t.id}">${t.name} — ${t.description}</option>`))
        .join('');
    }
  }catch(e){ /* ignore if template index missing */ }

  const previewBtn = $('#previewTemplate');
  if(previewBtn){
    previewBtn.addEventListener('click', () =>{
      const sel = $('#templateSelect');
      const id = sel && sel.value;
      if(!id) return alert('Select a template');
      window.open(`/?template=${encodeURIComponent(id)}`, '_blank');
    });
  }

  const applyBtn = $('#applyTemplate');
  if(applyBtn){
    applyBtn.addEventListener('click', async () =>{
      const sel = $('#templateSelect');
      const id = sel && sel.value;
      if(!id) return alert('Select a template');
      try{
        const tpl = await fetchTemplateById(id);
        state.site = { ...tpl, pages: tpl.pages || [], products: tpl.products || [] };
        renderTables(state);
        alert('Template applied. Customize content and press Save.');
      }catch(e){ alert(e.message); }
    });
  }

  $('#load').addEventListener('click', async ()=>{
    try{
      const site = await fetchSite();
      state.site = {
        ...site,
        pages: site.pages || [],
        products: site.products || []
      };
      renderTables(state);
    }catch(e){ alert(e.message); }
  });

  $('#save').addEventListener('click', async ()=>{
    const token = $('#token').value.trim();
    if(!token) return alert('Provide admin token');
    try{
      await saveSite(state.site, token);
      alert('Saved');
    }catch(e){ alert(e.message); }
  });

  $('#addPage').addEventListener('click', ()=>{
    const slug = $('#newPageSlug').value.trim();
    const title = $('#newPageTitle').value.trim();
    if(!slug || !title) return;
    if(state.site.pages.find(p => p.slug === slug)) return alert('Slug exists');
    state.site.pages.push({ slug, title, body: '' });
    $('#newPageSlug').value = '';
    $('#newPageTitle').value = '';
    renderTables(state);
  });

  $('#pages-table').addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const idx = Number(btn.dataset.idx);
    if(btn.classList.contains('edit-page')){
      state.selectedPageIndex = idx;
      $('#pageBody').value = state.site.pages[idx]?.body || '';
      $('#pageStatus').textContent = `Editing: ${state.site.pages[idx].title}`;
    }else if(btn.classList.contains('del-page')){
      state.site.pages.splice(idx,1);
      if(state.selectedPageIndex === idx) state.selectedPageIndex = null;
      renderTables(state);
    }
  });

  $('#updatePage').addEventListener('click', ()=>{
    const i = state.selectedPageIndex;
    if(i == null) return alert('Select a page to edit');
    state.site.pages[i].body = $('#pageBody').value;
    $('#pageStatus').textContent = 'Updated';
  });

  $('#addProd').addEventListener('click', ()=>{
    const name = $('#newProdName').value.trim();
    const price = Number($('#newProdPrice').value);
    if(!name) return;
    state.site.products.push({ name, price, description: ''});
    $('#newProdName').value = '';
    $('#newProdPrice').value = '';
    renderTables(state);
  });

  $('#products-table').addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const idx = Number(btn.dataset.idx);
    if(btn.classList.contains('edit-prod')){
      state.selectedProdIndex = idx;
      $('#prodDesc').value = state.site.products[idx]?.description || '';
      $('#prodStatus').textContent = `Editing: ${state.site.products[idx].name}`;
    }else if(btn.classList.contains('del-prod')){
      state.site.products.splice(idx,1);
      if(state.selectedProdIndex === idx) state.selectedProdIndex = null;
      renderTables(state);
    }
  });

  $('#updateProd').addEventListener('click', ()=>{
    const i = state.selectedProdIndex;
    if(i == null) return alert('Select a product to edit');
    state.site.products[i].description = $('#prodDesc').value;
    $('#prodStatus').textContent = 'Updated';
  });

  // Tab switching
  let currentTab = 'camera';
  const tabs = ['tabCamera', 'tabGallery', 'tabGoogle'];
  const tabPanels = ['cameraTab', 'galleryTab', 'googleTab'];
  
  tabs.forEach((tabId, idx) => {
    const tab = $(`#${tabId}`);
    if(tab) {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => {
          const btn = $(`#${t}`);
          if(btn) btn.style.borderBottom = 'none';
        });
        tabPanels.forEach((p) => {
          const panel = $(`#${p}`);
          if(panel) panel.style.display = 'none';
        });
        
        tab.style.borderBottom = '2px solid var(--color-primary)';
        const panel = $(`#${tabPanels[idx]}`);
        if(panel) panel.style.display = 'block';
        currentTab = tabPanels[idx].replace('Tab', '');
      });
    }
  });

  // Google image search (using Unsplash API)
  $('#searchGoogleBtn').addEventListener('click', async ()=>{
    const query = $('#googleSearch').value.trim();
    if(!query) return alert('Enter a search term');
    
    $('#googleResults').innerHTML = '<p class="muted">Searching...</p>';
    
    try {
      // Using Unsplash API (free and safe for commercial use)
      const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&client_id=YOUR_ACCESS_KEY`);
      
      // For demo, we'll use a placeholder approach
      // In production, you'd need an Unsplash API key
      $('#googleResults').innerHTML = `
        <div style="padding: 20px; background: #1e293b; border-radius: 8px; text-align: center;">
          <p>🔍 Google Image Search</p>
          <p class="muted" style="font-size: 12px; margin-top: 10px;">
            Search URL: <code>https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}</code>
          </p>
          <p class="muted" style="font-size: 12px; margin: 15px 0;">
            For copyright-free images, use Unsplash.com or Pexels.com
          </p>
          <button class="btn btn-secondary" onclick="window.open('https://unsplash.com/s/photos/${encodeURIComponent(query)}', '_blank')" style="margin: 5px;">Search Unsplash</button>
          <button class="btn btn-secondary" onclick="window.open('https://www.pexels.com/search/${encodeURIComponent(query)}/', '_blank')" style="margin: 5px;">Search Pexels</button>
        </div>
      `;
    } catch(err) {
      $('#googleResults').innerHTML = `<p style="color: #ef4444;">Search failed: ${err.message}</p>`;
    }
  });

  // Handle multiple file selection from gallery
  $('#galleryUpload').addEventListener('change', (e)=>{
    const files = e.target.files;
    if(files && files.length > 0) {
      let preview = $('#imagePreview');
      preview.innerHTML = '';
      
      Array.from(files).forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.innerHTML += `
            <div style="background: #1e293b; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
              <img src="${e.target.result}" style="max-width: 200px; max-height: 150px; border-radius: 8px;" />
              <p style="margin: 5px 0; color: #94a3b8; font-size: 12px;">${file.name}</p>
            </div>
          `;
        };
        reader.readAsDataURL(file);
      });
    }
  });

  // Image upload functionality
  $('#uploadBtn').addEventListener('click', async ()=>{
    let files = [];
    
    // Get file(s) from current tab
    if(currentTab === 'camera') {
      const file = $('#imageUpload').files[0];
      if(file) files = [file];
    } else if(currentTab === 'gallery') {
      files = Array.from($('#galleryUpload').files || []);
    }
    
    if(files.length === 0) return alert('Select an image first');
    
    const token = $('#token').value;
    let uploadResults = [];
    
    // Upload each file
    for(const file of files) {
      const formData = new FormData();
      formData.append('image', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if(!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        uploadResults.push(data);
      } catch(err) {
        alert('Upload failed: ' + err.message);
        return;
      }
    }
    
    // Show preview of uploaded files
    const preview = $('#imagePreview');
    let html = '';
    uploadResults.forEach(result => {
      html += `
        <div style="background: #1e293b; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
          <img src="${result.url}" style="max-width: 200px; max-height: 200px; border-radius: 8px; display: block; margin-bottom: 10px;" />
          <p style="margin: 5px 0; color: #94a3b8; font-size: 12px;">Uploaded: ${result.filename}</p>
          <input type="text" value="${result.url}" readonly style="width: 100%; padding: 8px; border-radius: 6px; background: #0f172a; border: 1px solid #334155; color: #e2e8f0; font-size: 11px; margin: 5px 0;" />
        </div>
      `;
    });
    html += `<p class="muted" style="font-size: 12px;">✅ Copied! Use these URLs in your site content.</p>`;
    preview.innerHTML = html;
    
    // Clear file inputs
    $('#imageUpload').value = '';
    $('#galleryUpload').value = '';
  });

  // Show camera preview
  $('#imageUpload').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        $('#imagePreview').innerHTML = `
          <div style="background: #1e293b; padding: 10px; border-radius: 8px;">
            <img src="${e.target.result}" style="max-width: 200px; max-height: 200px; border-radius: 8px;" />
            <p class="muted" style="margin: 10px 0; font-size: 12px;">📸 Ready to upload</p>
          </div>
        `;
      };
      reader.readAsDataURL(file);
    }
  });
})();
