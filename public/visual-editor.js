/**
 * Seamless Visual Editor for SiteSprintz
 * Provides inline editing, auto-save, undo/redo, and version history
 */

class SeamlessEditor {
  constructor(token, subdomain) {
    this.token = token;
    this.subdomain = subdomain;
    this.siteData = window.siteData || {};
    this.changeStack = [];
    this.redoStack = [];
    this.saveQueue = new Map();
    this.saveTimeout = null;
    this.isEditing = false;
    this.originalValues = new Map();
    
    this.init();
  }
  
  async init() {
    console.log('🎨 Seamless Editor initializing...');
    
    // Add editor styles
    this.injectStyles();
    
    // Render toolbar
    this.renderToolbar();
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Make elements editable
    this.setupEditableElements();
    
    // Setup card editing
    this.setupCardEditing();
    
    console.log('✅ Seamless Editor ready!');
  }
  
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Seamless Editor Styles */
      
      /* Edit hints on hover */
      [data-editable]:hover {
        outline: 2px dashed #3b82f6;
        outline-offset: 4px;
        cursor: text;
        position: relative;
        transition: outline 0.2s ease;
      }
      
      [data-editable]:hover::after {
        content: '✏️ Click to edit';
        position: absolute;
        top: -30px;
        left: 0;
        background: #3b82f6;
        color: white;
        padding: 4px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        pointer-events: none;
        opacity: 0.95;
        white-space: nowrap;
        z-index: 1000;
        animation: fadeIn 0.2s ease;
      }
      
      [data-editable-card]:hover {
        outline: 2px solid #3b82f6;
        outline-offset: 4px;
        cursor: pointer;
        transform: translateY(-2px);
        transition: all 0.2s ease;
        box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3) !important;
      }
      
      [data-editable-card]:hover::before {
        content: '✏️ Click to edit card';
        position: absolute;
        top: 12px;
        right: 12px;
        background: #3b82f6;
        color: white;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        z-index: 10;
        animation: fadeIn 0.2s ease;
      }
      
      /* Active editing state */
      [data-editable][contenteditable="true"] {
        outline: 3px solid #10b981 !important;
        outline-offset: 4px;
        background: rgba(16, 185, 129, 0.05);
      }
      
      [data-editable][contenteditable="true"]::after {
        content: '✓ Editing - Click away to save';
        background: #10b981;
      }
      
      /* Floating Toolbar */
      .seamless-toolbar {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 12px 20px;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        display: flex;
        gap: 12px;
        align-items: center;
        z-index: 100000;
        font-family: 'Inter', sans-serif;
        animation: slideDown 0.3s ease;
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .toolbar-section {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .toolbar-divider {
        width: 1px;
        height: 32px;
        background: #e5e7eb;
      }
      
      .seamless-toolbar button {
        background: #f3f4f6;
        border: none;
        padding: 10px 16px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        color: #374151;
      }
      
      .seamless-toolbar button:hover:not(:disabled) {
        background: #e5e7eb;
        transform: translateY(-1px);
      }
      
      .seamless-toolbar button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      
      .seamless-toolbar button.btn-primary {
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
      }
      
      .seamless-toolbar button.btn-primary:hover {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
      }
      
      .seamless-toolbar button.btn-secondary {
        background: #6b7280;
        color: white;
      }
      
      .save-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #10b981;
        background: rgba(16, 185, 129, 0.1);
      }
      
      .save-indicator.saving {
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.1);
      }
      
      .save-indicator.error {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
      }
      
      /* Undo Toast */
      .undo-toast {
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: #1f2937;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 100001;
        animation: slideIn 0.3s ease;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      .undo-toast button {
        background: #3b82f6;
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .undo-toast button:hover {
        background: #2563eb;
      }
      
      /* Card Edit Modal */
      .card-edit-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100002;
        animation: fadeIn 0.2s ease;
        padding: 20px;
      }
      
      .card-edit-content {
        background: white;
        border-radius: 20px;
        padding: 32px;
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
      }
      
      .card-edit-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      
      .card-edit-header h3 {
        font-size: 24px;
        font-weight: 800;
        margin: 0;
        color: #1f2937;
      }
      
      .card-edit-close {
        background: #f3f4f6;
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      
      .card-edit-close:hover {
        background: #e5e7eb;
      }
      
      .card-edit-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      .card-edit-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .card-edit-field label {
        font-weight: 600;
        color: #374151;
        font-size: 14px;
      }
      
      .card-edit-field input,
      .card-edit-field textarea {
        padding: 12px 16px;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        font-size: 15px;
        font-family: inherit;
        transition: border-color 0.2s;
      }
      
      .card-edit-field input:focus,
      .card-edit-field textarea:focus {
        outline: none;
        border-color: #3b82f6;
      }
      
      .card-edit-field textarea {
        resize: vertical;
        min-height: 100px;
      }
      
      .card-edit-actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
      }
      
      .card-edit-actions button {
        flex: 1;
        padding: 14px;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .card-edit-save {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
      }
      
      .card-edit-save:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      }
      
      .card-edit-cancel {
        background: #f3f4f6;
        color: #374151;
      }
      
      .card-edit-cancel:hover {
        background: #e5e7eb;
      }
      
      /* History Panel */
      .history-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 400px;
        background: white;
        box-shadow: -4px 0 24px rgba(0, 0, 0, 0.2);
        z-index: 100003;
        animation: slideInRight 0.3s ease;
        display: flex;
        flex-direction: column;
      }
      
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      .history-header {
        padding: 24px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .history-header h3 {
        font-size: 20px;
        font-weight: 800;
        margin: 0;
      }
      
      .history-list {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
      
      .history-item {
        padding: 16px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .history-item:hover {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.05);
      }
      
      .history-item.selected {
        border-color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
      }
      
      .history-time {
        font-size: 12px;
        color: #6b7280;
        font-weight: 600;
        margin-bottom: 4px;
      }
      
      .history-desc {
        font-size: 14px;
        color: #1f2937;
      }
      
      .history-actions {
        padding: 20px 24px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 12px;
      }
      
      .history-actions button {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .history-restore {
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
      }
      
      .history-restore:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }
      
      .history-restore:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
      }
    `;
    document.head.appendChild(style);
  }
  
  renderToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'seamless-toolbar';
    toolbar.innerHTML = `
      <div class="toolbar-section">
        <button id="undoBtn" title="Undo (Cmd+Z)" disabled>
          <span>↶</span>
        </button>
        <button id="redoBtn" title="Redo (Cmd+Shift+Z)" disabled>
          <span>↷</span>
        </button>
      </div>
      
      <div class="toolbar-divider"></div>
      
      <div class="toolbar-section">
        <button id="historyBtn" title="Version History">
          <span>📜</span> History
        </button>
      </div>
      
      <div class="toolbar-divider"></div>
      
      <div class="toolbar-section">
        <div id="saveIndicator" class="save-indicator">
          <span>✓</span> All changes saved
        </div>
      </div>
      
      <div class="toolbar-divider"></div>
      
      <div class="toolbar-section">
        <button id="backToDashboardBtn" class="btn-secondary">
          ← Dashboard
        </button>
      </div>
    `;
    
    document.body.appendChild(toolbar);
    
    // Attach event listeners
    document.getElementById('undoBtn').addEventListener('click', () => this.undo());
    document.getElementById('redoBtn').addEventListener('click', () => this.redo());
    document.getElementById('historyBtn').addEventListener('click', () => this.showHistory());
    document.getElementById('backToDashboardBtn').addEventListener('click', () => {
      window.location.href = '/dashboard.html';
    });
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Cmd+Z or Ctrl+Z for undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      
      // Cmd+Shift+Z or Ctrl+Shift+Z for redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        this.redo();
      }
      
      // Escape to cancel editing
      if (e.key === 'Escape' && this.isEditing) {
        const activeElement = document.activeElement;
        if (activeElement.hasAttribute('data-editable')) {
          activeElement.blur();
        }
      }
    });
  }
  
  setupEditableElements() {
    const editables = document.querySelectorAll('[data-editable]');
    
    editables.forEach(element => {
      // Store original value
      this.originalValues.set(element, element.textContent);
      
      element.addEventListener('click', (e) => {
        if (!this.isEditing) {
          e.preventDefault();
          e.stopPropagation();
          this.startEdit(element);
        }
      });
    });
  }
  
  startEdit(element) {
    this.isEditing = true;
    const originalValue = element.textContent;
    
    element.contentEditable = 'true';
    element.focus();
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    const finishEdit = () => {
      element.contentEditable = 'false';
      this.isEditing = false;
      
      const newValue = element.textContent;
      
      if (newValue !== originalValue) {
        const field = element.dataset.editable;
        this.recordChange(field, originalValue, newValue);
        this.queueAutoSave(field, newValue);
      }
    };
    
    element.addEventListener('blur', finishEdit, { once: true });
    
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        element.blur();
      }
    }, { once: true });
  }
  
  setupCardEditing() {
    const cards = document.querySelectorAll('[data-editable-card]');
    
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (!this.isEditing) {
          e.preventDefault();
          e.stopPropagation();
          this.openCardEditor(card);
        }
      });
    });
  }
  
  openCardEditor(card) {
    const cardPath = card.dataset.editableCard;
    const index = parseInt(cardPath.split('.').pop());
    const items = this.siteData.services?.items || this.siteData.products || [];
    const data = items[index];
    
    if (!data) {
      console.error('Card data not found:', cardPath);
      return;
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'card-edit-modal';
    modal.innerHTML = `
      <div class="card-edit-content">
        <div class="card-edit-header">
          <h3>Edit Item</h3>
          <button class="card-edit-close">✕</button>
        </div>
        <div class="card-edit-form">
          <div class="card-edit-field">
            <label>Title/Name</label>
            <input type="text" id="cardTitle" value="${data.title || data.name || ''}" />
          </div>
          <div class="card-edit-field">
            <label>Description</label>
            <textarea id="cardDescription">${data.description || ''}</textarea>
          </div>
          <div class="card-edit-field">
            <label>Price</label>
            <input type="text" id="cardPrice" value="${data.price || ''}" placeholder="e.g., 29.99" />
          </div>
          <div class="card-edit-field">
            <label>Image URL (optional)</label>
            <input type="text" id="cardImage" value="${data.image || ''}" placeholder="https://..." />
          </div>
        </div>
        <div class="card-edit-actions">
          <button class="card-edit-cancel">Cancel</button>
          <button class="card-edit-save">Save Changes</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close handlers
    const close = () => modal.remove();
    modal.querySelector('.card-edit-close').addEventListener('click', close);
    modal.querySelector('.card-edit-cancel').addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
    
    // Save handler
    modal.querySelector('.card-edit-save').addEventListener('click', () => {
      const updatedData = {
        title: document.getElementById('cardTitle').value,
        description: document.getElementById('cardDescription').value,
        price: document.getElementById('cardPrice').value,
        image: document.getElementById('cardImage').value
      };
      
      // Update UI immediately
      const titleEl = card.querySelector(`[data-editable="${cardPath}.title"]`);
      const descEl = card.querySelector(`[data-editable="${cardPath}.description"]`);
      const priceEl = card.querySelector(`[data-editable="${cardPath}.price"]`);
      
      if (titleEl) titleEl.textContent = updatedData.title;
      if (descEl) descEl.textContent = updatedData.description;
      if (priceEl) priceEl.textContent = updatedData.price ? `$${updatedData.price}` : '';
      
      // Record changes
      Object.keys(updatedData).forEach(key => {
        const field = `${cardPath}.${key}`;
        const oldValue = data[key] || '';
        const newValue = updatedData[key];
        
        if (newValue !== oldValue) {
          this.recordChange(field, oldValue, newValue);
          this.queueAutoSave(field, newValue);
        }
      });
      
      close();
    });
  }
  
  recordChange(field, oldValue, newValue) {
    this.changeStack.push({ field, oldValue, newValue, timestamp: Date.now() });
    this.redoStack = []; // Clear redo stack on new change
    this.updateUndoRedoButtons();
  }
  
  updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    undoBtn.disabled = this.changeStack.length === 0;
    redoBtn.disabled = this.redoStack.length === 0;
  }
  
  undo() {
    if (this.changeStack.length === 0) return;
    
    const change = this.changeStack.pop();
    this.redoStack.push(change);
    
    // Apply the old value
    this.applyChange(change.field, change.oldValue);
    this.queueAutoSave(change.field, change.oldValue);
    
    this.updateUndoRedoButtons();
    this.showUndoToast(`Undid: ${change.field.split('.').pop()}`);
  }
  
  redo() {
    if (this.redoStack.length === 0) return;
    
    const change = this.redoStack.pop();
    this.changeStack.push(change);
    
    // Reapply the new value
    this.applyChange(change.field, change.newValue);
    this.queueAutoSave(change.field, change.newValue);
    
    this.updateUndoRedoButtons();
    this.showUndoToast(`Redid: ${change.field.split('.').pop()}`);
  }
  
  applyChange(field, value) {
    const element = document.querySelector(`[data-editable="${field}"]`);
    if (element) {
      element.textContent = value;
    }
  }
  
  showUndoToast(message) {
    const toast = document.createElement('div');
    toast.className = 'undo-toast';
    toast.innerHTML = `
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  queueAutoSave(field, value) {
    this.saveQueue.set(field, value);
    
    // Update indicator
    const indicator = document.getElementById('saveIndicator');
    indicator.className = 'save-indicator saving';
    indicator.innerHTML = '<span>⏳</span> Saving...';
    
    // Debounce: wait 3 seconds of inactivity
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.executeSave();
    }, 3000);
  }
  
  async executeSave() {
    if (this.saveQueue.size === 0) return;
    
    const changes = Array.from(this.saveQueue.entries()).map(([field, value]) => ({ field, value }));
    this.saveQueue.clear();
    
    const indicator = document.getElementById('saveIndicator');
    
    try {
      const response = await fetch(`/api/sites/${this.subdomain}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ changes })
      });
      
      const result = await response.json();
      
      if (result.success) {
        indicator.className = 'save-indicator';
        indicator.innerHTML = '<span>✓</span> All changes saved';
      } else {
        throw new Error(result.error || 'Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      indicator.className = 'save-indicator error';
      indicator.innerHTML = '<span>⚠️</span> Save failed - will retry';
      
      // Re-queue changes
      changes.forEach(({ field, value }) => this.saveQueue.set(field, value));
      
      // Retry after 5 seconds
      setTimeout(() => this.executeSave(), 5000);
    }
  }
  
  async showHistory() {
    const panel = document.createElement('div');
    panel.className = 'history-panel';
    panel.innerHTML = `
      <div class="history-header">
        <h3>Version History</h3>
        <button class="card-edit-close" id="closeHistory">✕</button>
      </div>
      <div class="history-list" id="historyList">
        <div style="text-align: center; padding: 40px; color: #9ca3af;">
          Loading history...
        </div>
      </div>
      <div class="history-actions">
        <button class="history-restore" id="restoreBtn" disabled>
          Restore Selected Version
        </button>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Close handler
    document.getElementById('closeHistory').addEventListener('click', () => panel.remove());
    
    // Load history
    try {
      const response = await fetch(`/api/sites/${this.subdomain}/history`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      
      const result = await response.json();
      
      if (result.success && result.history.length > 0) {
        this.renderHistory(result.history, panel);
      } else {
        document.getElementById('historyList').innerHTML = `
          <div style="text-align: center; padding: 40px; color: #9ca3af;">
            No version history available yet
          </div>
        `;
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      document.getElementById('historyList').innerHTML = `
        <div style="text-align: center; padding: 40px; color: #ef4444;">
          Failed to load history
        </div>
      `;
    }
  }
  
  renderHistory(history, panel) {
    const list = document.getElementById('historyList');
    let selectedVersion = null;
    
    list.innerHTML = history.map((item, index) => `
      <div class="history-item" data-version="${item.id}">
        <div class="history-time">${item.date}</div>
        <div class="history-desc">${item.description}</div>
      </div>
    `).join('');
    
    // Selection handler
    list.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        list.querySelectorAll('.history-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedVersion = item.dataset.version;
        document.getElementById('restoreBtn').disabled = false;
      });
    });
    
    // Restore handler
    document.getElementById('restoreBtn').addEventListener('click', async () => {
      if (!selectedVersion) return;
      
      if (confirm('Restore this version? Your current unsaved changes will be lost.')) {
        try {
          const response = await fetch(`/api/sites/${this.subdomain}/restore/${selectedVersion}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.token}` }
          });
          
          const result = await response.json();
          
          if (result.success) {
            alert('✅ Version restored! Reloading page...');
            window.location.reload();
          } else {
            alert('❌ Failed to restore: ' + result.error);
          }
        } catch (error) {
          console.error('Restore error:', error);
          alert('❌ Failed to restore version');
        }
      }
    });
  }
}

// Initialize editor
(function() {
  const script = document.currentScript;
  const token = script.dataset.token;
  const subdomain = script.dataset.subdomain;
  
  if (token && subdomain) {
    window.seamlessEditor = new SeamlessEditor(token, subdomain);
  } else {
    console.error('Visual editor: Missing required data (token or subdomain)');
  }
})();

