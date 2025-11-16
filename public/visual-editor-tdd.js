/**
 * Visual Editor Client (Frontend)
 * 
 * TDD-based implementation with optimistic locking and conflict resolution
 * Provides seamless inline editing experience with race condition prevention
 */

export class VisualEditor {
  constructor(token, subdomain) {
    if (!token) throw new Error('Token is required');
    if (!subdomain) throw new Error('Subdomain is required');
    
    this.token = token;
    this.subdomain = subdomain;
    this.siteData = window.siteData || null;
    this.currentVersion = this.siteData?.version || 1;
    this.isInitialized = false;
    this.isEditing = false;
    
    // Change management
    this.changeStack = [];
    this.redoStack = [];
    this.originalValues = new Map();
    
    // Save management
    this.saveQueue = new Map();
    this.saveTimeout = null;
    this.saveDebouncems = 3000;
    this.isSaving = false;
    
    // Offline support
    this.offlineQueue = [];
    this.isOnline = navigator.onLine;
    
    // Conflict detection
    this.needsRefresh = false;
    
    if (!this.siteData) {
      throw new Error('Site data not loaded');
    }
    
    this.init();
  }
  
  init() {
    this.injectStyles();
    this.renderToolbar();
    this.setupKeyboardShortcuts();
    this.setupEditableElements();
    this.setupCardEditing();
    this.setupImageEditing();
    this.setupOnlineOfflineHandlers();
    this.setupCrossTabSync();
    
    this.isInitialized = true;
    console.log('✅ Visual Editor initialized');
  }
  
  /**
   * Find all editable text elements
   */
  findEditableElements() {
    return Array.from(document.querySelectorAll('[data-editable]'));
  }
  
  /**
   * Find all editable card elements
   */
  findEditableCards() {
    return Array.from(document.querySelectorAll('[data-editable-card]'));
  }
  
  /**
   * Setup inline text editing
   */
  setupEditableElements() {
    const elements = this.findEditableElements();
    
    elements.forEach(element => {
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startEdit(element);
      });
    });
  }
  
  /**
   * Start editing an element
   */
  startEdit(element) {
    if (this.isEditing) return;
    
    const fieldPath = element.dataset.editable;
    this.isEditing = true;
    
    // Store original value
    this.originalValues.set(fieldPath, element.textContent);
    
    // Make editable
    element.contentEditable = 'true';
    element.focus();
    
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(element);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    
    // Handle blur (save)
    const onBlur = () => {
      this.endEdit(element, true);
      element.removeEventListener('blur', onBlur);
      element.removeEventListener('keydown', onKeydown);
    };
    
    // Handle Escape (cancel) and Enter (save)
    const onKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.endEdit(element, false);
        element.removeEventListener('blur', onBlur);
        element.removeEventListener('keydown', onKeydown);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        element.blur(); // Triggers save via onBlur
      }
    };
    
    element.addEventListener('blur', onBlur);
    element.addEventListener('keydown', onKeydown);
  }
  
  /**
   * End editing an element
   */
  endEdit(element, save) {
    const fieldPath = element.dataset.editable;
    element.contentEditable = 'false';
    this.isEditing = false;
    
    if (!save) {
      // Cancel - restore original value
      element.textContent = this.originalValues.get(fieldPath);
      this.originalValues.delete(fieldPath);
      return;
    }
    
    const newValue = element.textContent.trim();
    const oldValue = this.originalValues.get(fieldPath);
    
    if (newValue === oldValue) {
      // No change
      this.originalValues.delete(fieldPath);
      return;
    }
    
    // Add to change stack
    this.changeStack.push({
      field: fieldPath,
      oldValue,
      newValue,
      timestamp: Date.now()
    });
    
    // Clear redo stack (can't redo after new change)
    this.redoStack = [];
    
    // Update site data
    this.setFieldValue(this.siteData, fieldPath, newValue);
    
    // Queue for saving
    this.queueSave(fieldPath, newValue);
    
    this.originalValues.delete(fieldPath);
    this.updateUndoRedoButtons();
  }
  
  /**
   * Setup card editing
   */
  setupCardEditing() {
    const cards = this.findEditableCards();
    
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openCardEditor(card);
      });
    });
  }
  
  /**
   * Open card edit modal
   */
  openCardEditor(card) {
    const fieldPath = card.dataset.editableCard;
    const cardData = this.getFieldValue(this.siteData, fieldPath);
    
    const modal = this.createCardModal(fieldPath, cardData);
    document.body.appendChild(modal);
  }
  
  /**
   * Create card edit modal
   */
  createCardModal(fieldPath, cardData) {
    const modal = document.createElement('div');
    modal.className = 'card-edit-modal';
    
    modal.innerHTML = `
      <div class="card-edit-content">
        <div class="card-edit-header">
          <h3>Edit Card</h3>
          <button class="modal-close-btn">&times;</button>
        </div>
        <div class="card-edit-form">
          <label>
            Title
            <input type="text" id="card-title" value="${cardData.title || ''}" />
          </label>
          <label>
            Description
            <textarea id="card-description">${cardData.description || ''}</textarea>
          </label>
          <label>
            Price
            <input type="text" id="card-price" value="${cardData.price || ''}" />
          </label>
          <label>
            Image URL
            <input type="text" id="card-image" value="${cardData.image || ''}" />
          </label>
        </div>
        <div class="card-edit-actions">
          <button class="modal-cancel-btn">Cancel</button>
          <button class="modal-save-btn">Save Changes</button>
        </div>
      </div>
    `;
    
    // Close handlers
    const closeModal = () => modal.remove();
    modal.querySelector('.modal-close-btn').onclick = closeModal;
    modal.querySelector('.modal-cancel-btn').onclick = closeModal;
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };
    
    // Save handler
    modal.querySelector('.modal-save-btn').onclick = () => {
      const updates = {
        title: modal.querySelector('#card-title').value,
        description: modal.querySelector('#card-description').value,
        price: modal.querySelector('#card-price').value,
        image: modal.querySelector('#card-image').value
      };
      
      // Add each field to change stack
      Object.keys(updates).forEach(key => {
        const fullPath = `${fieldPath}.${key}`;
        const oldValue = cardData[key];
        const newValue = updates[key];
        
        if (oldValue !== newValue) {
          this.changeStack.push({
            field: fullPath,
            oldValue,
            newValue,
            timestamp: Date.now()
          });
          
          this.setFieldValue(this.siteData, fullPath, newValue);
          this.queueSave(fullPath, newValue);
        }
      });
      
      this.redoStack = [];
      this.updateUndoRedoButtons();
      closeModal();
    };
    
    return modal;
  }
  
  /**
   * Setup image editing
   */
  setupImageEditing() {
    // Image editing implementation
    // Can be extended in REFACTOR phase
  }
  
  /**
   * Queue changes for auto-save with debouncing
   */
  queueSave(field, value) {
    this.saveQueue.set(field, value);
    
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Set new timeout
    this.saveTimeout = setTimeout(() => {
      this.executeSave();
    }, this.saveDebounceMs);
    
    this.updateSaveIndicator('pending');
  }
  
  /**
   * Execute the save operation
   */
  async executeSave() {
    if (this.isSaving) return;
    if (this.saveQueue.size === 0) return;
    
    this.isSaving = true;
    this.updateSaveIndicator('saving');
    
    // Get all queued changes
    const changes = Array.from(this.saveQueue.entries()).map(([field, value]) => ({
      field,
      value
    }));
    
    // Clear the queue
    this.saveQueue.clear();
    
    try {
      const result = await this.save(changes);
      
      if (result.conflict) {
        // Version conflict detected!
        this.handleConflict(result);
      } else {
        // Success
        this.currentVersion = result.version;
        this.updateSaveIndicator('saved');
        
        // Update cross-tab storage
        localStorage.setItem(`site-version-${this.subdomain}`, result.version.toString());
      }
      
    } catch (error) {
      console.error('Save error:', error);
      
      if (!this.isOnline) {
        // Queue for offline
        changes.forEach(change => {
          this.offlineQueue.push(change);
        });
        this.updateSaveIndicator('offline', 'Changes queued for when back online');
      } else {
        // Network error - retry in 5 seconds
        this.updateSaveIndicator('error', 'Save failed - retrying...');
        setTimeout(() => {
          changes.forEach(change => {
            this.queueSave(change.field, change.value);
          });
        }, 5000);
      }
    } finally {
      this.isSaving = false;
    }
  }
  
  /**
   * Save changes to server with version check
   */
  async save(changes) {
    const response = await fetch(`/api/sites/${this.subdomain}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        version: this.currentVersion,
        changes
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 409) {
        // Conflict
        return {
          conflict: true,
          ...data
        };
      }
      throw new Error(data.error || 'Save failed');
    }
    
    return data;
  }
  
  /**
   * Handle version conflict
   */
  handleConflict(conflictData) {
    this.showConflictModal({
      localChanges: Array.from(this.saveQueue.entries()).map(([field, value]) => ({
        field,
        value
      })),
      serverData: conflictData.serverData
    });
  }
  
  /**
   * Show conflict resolution modal
   */
  showConflictModal(conflictData) {
    const modal = document.createElement('div');
    modal.className = 'conflict-modal';
    
    modal.innerHTML = `
      <div class="conflict-content">
        <h3>⚠️ Conflict Detected</h3>
        <p>This site was edited elsewhere. How would you like to proceed?</p>
        
        <div class="conflict-options">
          <button class="conflict-btn" data-action="keep-local">
            Keep My Changes
          </button>
          <button class="conflict-btn" data-action="use-server">
            Use Server Version
          </button>
          <button class="conflict-btn" data-action="review">
            Review Changes
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelectorAll('.conflict-btn').forEach(btn => {
      btn.onclick = () => {
        this.resolveConflict(btn.dataset.action, conflictData);
        modal.remove();
      };
    });
  }
  
  /**
   * Resolve conflict based on user choice
   */
  async resolveConflict(action, conflictData) {
    if (action === 'keep-local') {
      // Force save with current server version
      this.currentVersion = conflictData.currentVersion;
      await this.executeSave();
      
    } else if (action === 'use-server') {
      // Reload with server data
      this.siteData = conflictData.serverData;
      this.currentVersion = conflictData.serverData.version;
      window.location.reload();
      
    } else if (action === 'review') {
      // Show detailed comparison
      this.showDetailedConflictView(conflictData);
    }
  }
  
  /**
   * Undo last change
   */
  undo() {
    if (this.changeStack.length === 0) return;
    
    const change = this.changeStack.pop();
    
    // Revert in site data
    this.setFieldValue(this.siteData, change.field, change.oldValue);
    
    // Update DOM
    const element = document.querySelector(`[data-editable="${change.field}"]`);
    if (element) {
      element.textContent = change.oldValue;
    }
    
    // Add to redo stack
    this.redoStack.push(change);
    
    // Queue save
    this.queueSave(change.field, change.oldValue);
    
    this.updateUndoRedoButtons();
    this.showUndoToast(`Undid: ${change.field}`);
  }
  
  /**
   * Redo last undone change
   */
  redo() {
    if (this.redoStack.length === 0) return;
    
    const change = this.redoStack.pop();
    
    // Reapply in site data
    this.setFieldValue(this.siteData, change.field, change.newValue);
    
    // Update DOM
    const element = document.querySelector(`[data-editable="${change.field}"]`);
    if (element) {
      element.textContent = change.newValue;
    }
    
    // Add back to change stack
    this.changeStack.push(change);
    
    // Queue save
    this.queueSave(change.field, change.newValue);
    
    this.updateUndoRedoButtons();
  }
  
  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Undo: Cmd+Z or Ctrl+Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      
      // Redo: Cmd+Shift+Z or Ctrl+Shift+Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        this.redo();
      }
    });
  }
  
  /**
   * Setup online/offline handlers
   */
  setupOnlineOfflineHandlers() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushOfflineQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateSaveIndicator('offline', 'No internet connection');
    });
  }
  
  /**
   * Flush offline queue when back online
   */
  async flushOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    const changes = [...this.offlineQueue];
    this.offlineQueue = [];
    
    this.updateSaveIndicator('saving', 'Syncing offline changes...');
    
    try {
      await this.save(changes);
      this.updateSaveIndicator('saved', 'Offline changes synced!');
    } catch (error) {
      // Re-queue if still failing
      this.offlineQueue = changes;
      this.updateSaveIndicator('error', 'Sync failed - will retry');
    }
  }
  
  /**
   * Setup cross-tab synchronization
   */
  setupCrossTabSync() {
    window.addEventListener('storage', (e) => {
      if (e.key === `site-version-${this.subdomain}`) {
        const newVersion = parseInt(e.newValue);
        
        if (newVersion > this.currentVersion) {
          this.needsRefresh = true;
          this.checkForExternalChanges();
        }
      }
    });
  }
  
  /**
   * Check for external changes and show warning
   */
  checkForExternalChanges() {
    if (this.needsRefresh) {
      this.showRefreshBanner(
        'This site was edited in another tab. Refresh to see latest changes.'
      );
    }
  }
  
  /**
   * Show refresh banner
   */
  showRefreshBanner(message) {
    const banner = document.createElement('div');
    banner.className = 'refresh-banner';
    banner.innerHTML = `
      <span>${message}</span>
      <button onclick="window.location.reload()">Refresh Now</button>
    `;
    
    document.body.prepend(banner);
  }
  
  /**
   * Get field value using dot notation
   */
  getFieldValue(obj, fieldPath) {
    const parts = fieldPath.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = !isNaN(part) ? current[parseInt(part)] : current[part];
    }
    
    return current;
  }
  
  /**
   * Set field value using dot notation
   */
  setFieldValue(obj, fieldPath, value) {
    if (fieldPath.includes('..')) {
      throw new Error('Invalid field path');
    }
    
    const parts = fieldPath.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const next = !isNaN(part) ? current[parseInt(part)] : current[part];
      
      if (!next) {
        current[part] = {};
      }
      
      current = !isNaN(part) ? current[parseInt(part)] : current[part];
    }
    
    const lastPart = parts[parts.length - 1];
    current[!isNaN(lastPart) ? parseInt(lastPart) : lastPart] = value;
  }
  
  /**
   * Sanitize user input
   */
  sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }
  
  /**
   * Fetch version history
   */
  async fetchVersionHistory() {
    const response = await fetch(`/api/sites/${this.subdomain}/history`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    
    const data = await response.json();
    return data.history;
  }
  
  /**
   * Show history panel
   */
  async showHistoryPanel() {
    const history = await this.fetchVersionHistory();
    
    const panel = document.createElement('div');
    panel.className = 'history-panel';
    
    panel.innerHTML = `
      <div class="history-header">
        <h3>Version History</h3>
        <button class="history-close">&times;</button>
      </div>
      <div class="history-list">
        ${history.map(item => `
          <div class="history-item" data-version-id="${item.id}">
            <div class="history-time">${this.formatTimestamp(item.timestamp)}</div>
            <div class="history-desc">${item.description}</div>
          </div>
        `).join('')}
      </div>
      <div class="history-actions">
        <button class="history-restore-btn" disabled>Restore Selected</button>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Close handler
    panel.querySelector('.history-close').onclick = () => panel.remove();
    
    // Selection handler
    let selectedVersion = null;
    panel.querySelectorAll('.history-item').forEach(item => {
      item.onclick = () => {
        panel.querySelectorAll('.history-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedVersion = item.dataset.versionId;
        panel.querySelector('.history-restore-btn').disabled = false;
      };
    });
    
    // Restore handler
    panel.querySelector('.history-restore-btn').onclick = async () => {
      if (selectedVersion && confirm('Restore this version? This will create a backup of the current state.')) {
        await this.restoreVersion({ id: selectedVersion });
      }
    };
  }
  
  /**
   * Restore a specific version
   */
  async restoreVersion(version) {
    await this.createBackup('before-restore');
    
    const response = await fetch(`/api/sites/${this.subdomain}/restore/${version.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });
    
    if (response.ok) {
      window.location.reload();
    }
  }
  
  /**
   * Create manual backup
   */
  async createBackup(type) {
    // Backup creation handled by server
  }
  
  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
  
  /**
   * Update undo/redo button states
   */
  updateUndoRedoButtons() {
    const undoBtn = document.querySelector('.toolbar-undo-btn');
    const redoBtn = document.querySelector('.toolbar-redo-btn');
    
    if (undoBtn) undoBtn.disabled = this.changeStack.length === 0;
    if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
  }
  
  /**
   * Update save indicator
   */
  updateSaveIndicator(state, message = '') {
    const indicator = document.querySelector('.save-indicator');
    if (!indicator) return;
    
    indicator.className = `save-indicator ${state}`;
    
    const messages = {
      pending: '⏳ Pending...',
      saving: '💾 Saving...',
      saved: '✓ All changes saved',
      error: '❌ Save failed',
      offline: '📡 Offline'
    };
    
    indicator.textContent = message || messages[state] || '';
  }
  
  /**
   * Show undo toast notification
   */
  showUndoToast(message) {
    const toast = document.createElement('div');
    toast.className = 'undo-toast';
    toast.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">Dismiss</button>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 5000);
  }
  
  /**
   * Inject editor styles
   */
  injectStyles() {
    if (document.querySelector('#visual-editor-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'visual-editor-styles';
    style.textContent = `
      /* Visual Editor Styles */
      [data-editable]:hover {
        outline: 2px dashed rgba(59, 130, 246, 0.5);
        outline-offset: 2px;
        cursor: text;
      }
      
      [data-editable][contenteditable="true"] {
        outline: 2px solid #3b82f6 !important;
        outline-offset: 2px;
      }
      
      [data-editable-card]:hover {
        outline: 2px solid #3b82f6;
        cursor: pointer;
        transform: translateY(-2px);
        transition: all 0.2s;
      }
      
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
      }
      
      .seamless-toolbar button {
        background: #f3f4f6;
        border: none;
        padding: 10px 16px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .seamless-toolbar button:hover:not(:disabled) {
        background: #e5e7eb;
      }
      
      .seamless-toolbar button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      
      .save-indicator {
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
      }
      
      .save-indicator.saved {
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
      
      .card-edit-modal, .conflict-modal {
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
        padding: 20px;
      }
      
      .card-edit-content, .conflict-content {
        background: white;
        border-radius: 20px;
        padding: 32px;
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
      }
      
      .card-edit-form label {
        display: block;
        margin: 16px 0;
      }
      
      .card-edit-form input,
      .card-edit-form textarea {
        width: 100%;
        padding: 12px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        margin-top: 4px;
      }
      
      .card-edit-actions,
      .conflict-options {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 24px;
      }
      
      .modal-save-btn, .conflict-btn {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
      }
      
      .undo-toast {
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: #1f2937;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        z-index: 100001;
      }
      
      .refresh-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #fbbf24;
        color: #78350f;
        padding: 12px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 100003;
      }
      
      .history-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 400px;
        height: 100vh;
        background: white;
        box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
        z-index: 100001;
        display: flex;
        flex-direction: column;
      }
      
      .history-list {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
      
      .history-item {
        padding: 12px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
      }
      
      .history-item:hover {
        background: #f3f4f6;
      }
      
      .history-item.selected {
        border-color: #3b82f6;
        background: #eff6ff;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Render toolbar
   */
  renderToolbar() {
    const toolbar = document.createElement('div');
    toolbar.className = 'seamless-toolbar';
    
    toolbar.innerHTML = `
      <button class="toolbar-undo-btn" disabled>⏮️ Undo</button>
      <button class="toolbar-redo-btn" disabled>⏭️ Redo</button>
      <div class="toolbar-divider"></div>
      <button class="toolbar-history-btn">📜 History</button>
      <div class="toolbar-divider"></div>
      <div class="save-indicator saved">✓ All changes saved</div>
      <div class="toolbar-divider"></div>
      <a href="/dashboard.html" class="toolbar-back-btn">← Dashboard</a>
    `;
    
    document.body.appendChild(toolbar);
    
    // Attach handlers
    toolbar.querySelector('.toolbar-undo-btn').onclick = () => this.undo();
    toolbar.querySelector('.toolbar-redo-btn').onclick = () => this.redo();
    toolbar.querySelector('.toolbar-history-btn').onclick = () => this.showHistoryPanel();
  }
  
  /**
   * Detailed conflict view
   */
  showDetailedConflictView(conflictData) {
    // Can be implemented in REFACTOR phase
    alert('Detailed conflict view coming soon');
  }
  
  /**
   * Cleanup event listeners
   */
  destroy() {
    // Remove event listeners
    document.querySelectorAll('[data-editable]').forEach(el => {
      el.replaceWith(el.cloneNode(true));
    });
    
    // Remove toolbar
    const toolbar = document.querySelector('.seamless-toolbar');
    if (toolbar) toolbar.remove();
    
    // Remove styles
    const styles = document.querySelector('#visual-editor-styles');
    if (styles) styles.remove();
  }
}

// Auto-initialize if in edit mode
if (window.location.search.includes('edit=true')) {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const subdomain = window.location.pathname.split('/')[2];
  
  if (token && subdomain && window.siteData) {
    window.visualEditor = new VisualEditor(token, subdomain);
  }
}

