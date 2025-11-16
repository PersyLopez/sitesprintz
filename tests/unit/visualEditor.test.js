/**
 * TDD Tests for Visual Editor
 * 
 * RED Phase: Comprehensive tests for all visual editor functionality
 * including improvements for race conditions and reliability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock localStorage for browser environment
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

describe('VisualEditor - Core Functionality', () => {
  let dom;
  let window;
  let document;
  let VisualEditor;
  
  beforeEach(async () => {
    // Setup DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="app">
            <h1 data-editable="hero.title">Original Title</h1>
            <p data-editable="hero.subtitle">Original Subtitle</p>
            <div data-editable-card="services.items.0">
              <h3>Service 1</h3>
              <p>Description</p>
            </div>
          </div>
        </body>
      </html>
    `, { 
      url: 'http://localhost',
      runScripts: 'dangerously',
      resources: 'usable'
    });
    
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.localStorage = localStorageMock;
    
    // Mock siteData
    window.siteData = {
      version: 1,
      hero: {
        title: 'Original Title',
        subtitle: 'Original Subtitle'
      },
      services: {
        items: [
          { title: 'Service 1', description: 'Description', price: '99' }
        ]
      }
    };
    
    // Mock fetch
    global.fetch = vi.fn();
    
    // Load the editor class
    const module = await import('../../public/visual-editor-tdd.js');
    VisualEditor = module.VisualEditor;
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    dom.window.close();
  });
  
  describe('Initialization', () => {
    it('should initialize with token and subdomain', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      
      expect(editor.token).toBe('test-token');
      expect(editor.subdomain).toBe('test-site');
      expect(editor.isInitialized).toBe(true);
    });
    
    it('should throw error if token is missing', () => {
      expect(() => new VisualEditor(null, 'test-site')).toThrow('Token is required');
    });
    
    it('should throw error if subdomain is missing', () => {
      expect(() => new VisualEditor('test-token', null)).toThrow('Subdomain is required');
    });
    
    it('should load siteData from window.siteData', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      
      expect(editor.siteData).toEqual(window.siteData);
      expect(editor.siteData.version).toBe(1);
    });
    
    it('should initialize with version number for optimistic locking', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      
      expect(editor.currentVersion).toBe(1);
    });
    
    it('should setup empty change stack', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      
      expect(editor.changeStack).toEqual([]);
      expect(editor.redoStack).toEqual([]);
    });
  });
  
  describe('Element Detection', () => {
    it('should find all editable text elements', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      const elements = editor.findEditableElements();
      
      expect(elements.length).toBeGreaterThanOrEqual(2);
      expect(elements[0].dataset.editable).toBe('hero.title');
      expect(elements[1].dataset.editable).toBe('hero.subtitle');
    });
    
    it('should find all editable card elements', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      const cards = editor.findEditableCards();
      
      expect(cards.length).toBeGreaterThanOrEqual(1);
      expect(cards[0].dataset.editableCard).toBe('services.items.0');
    });
    
    it('should attach click listeners to editable elements', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      editor.setupEditableElements();
      
      const element = document.querySelector('[data-editable="hero.title"]');
      expect(element.onclick).toBeDefined();
    });
  });
  
  describe('Inline Text Editing', () => {
    it('should make element contenteditable when clicked', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      editor.setupEditableElements();
      
      const element = document.querySelector('[data-editable="hero.title"]');
      element.click();
      
      expect(element.contentEditable).toBe('true');
      expect(editor.isEditing).toBe(true);
    });
    
    it('should store original value when editing starts', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      editor.setupEditableElements();
      
      const element = document.querySelector('[data-editable="hero.title"]');
      element.click();
      
      expect(editor.originalValues.get('hero.title')).toBe('Original Title');
    });
    
    it('should save changes when clicking away', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      editor.setupEditableElements();
      
      const element = document.querySelector('[data-editable="hero.title"]');
      element.click();
      element.textContent = 'New Title';
      
      // Simulate blur event
      const blurEvent = new window.Event('blur');
      element.dispatchEvent(blurEvent);
      
      expect(element.contentEditable).toBe('false');
      expect(editor.siteData.hero.title).toBe('New Title');
    });
    
    it('should cancel changes on Escape key', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      editor.setupEditableElements();
      
      const element = document.querySelector('[data-editable="hero.title"]');
      element.click();
      element.textContent = 'New Title';
      
      // Simulate Escape key
      const escEvent = new window.KeyboardEvent('keydown', { key: 'Escape' });
      element.dispatchEvent(escEvent);
      
      expect(element.textContent).toBe('Original Title');
      expect(element.contentEditable).toBe('false');
    });
    
    it('should add change to stack when saving', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      editor.setupEditableElements();
      
      const element = document.querySelector('[data-editable="hero.title"]');
      element.click();
      element.textContent = 'New Title';
      
      const blurEvent = new window.Event('blur');
      element.dispatchEvent(blurEvent);
      
      expect(editor.changeStack.length).toBe(1);
      expect(editor.changeStack[0]).toEqual({
        field: 'hero.title',
        oldValue: 'Original Title',
        newValue: 'New Title',
        timestamp: expect.any(Number)
      });
    });
    
    it('should clear redo stack when making new changes', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      editor.redoStack = [{ field: 'hero.title', oldValue: 'A', newValue: 'B' }];
      
      editor.setupEditableElements();
      const element = document.querySelector('[data-editable="hero.title"]');
      element.click();
      element.textContent = 'New Title';
      
      const blurEvent = new window.Event('blur');
      element.dispatchEvent(blurEvent);
      
      expect(editor.redoStack).toEqual([]);
    });
  });
  
  describe('Card Editing', () => {
    it('should open modal when card is clicked', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      editor.setupCardEditing();
      
      const card = document.querySelector('[data-editable-card]');
      card.click();
      
      const modal = document.querySelector('.card-edit-modal');
      expect(modal).toBeTruthy();
      expect(modal.style.display).not.toBe('none');
    });
    
    it('should populate modal with current card data', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      editor.setupCardEditing();
      
      const card = document.querySelector('[data-editable-card="services.items.0"]');
      card.click();
      
      const titleInput = document.querySelector('#card-title');
      expect(titleInput.value).toBe('Service 1');
    });
    
    it('should update card data when modal is saved', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      editor.setupCardEditing();
      
      const card = document.querySelector('[data-editable-card="services.items.0"]');
      card.click();
      
      const titleInput = document.querySelector('#card-title');
      titleInput.value = 'Updated Service';
      
      const saveButton = document.querySelector('.modal-save-btn');
      saveButton.click();
      
      expect(editor.siteData.services.items[0].title).toBe('Updated Service');
    });
    
    it('should close modal on cancel', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      editor.setupCardEditing();
      
      const card = document.querySelector('[data-editable-card]');
      card.click();
      
      const cancelButton = document.querySelector('.modal-cancel-btn');
      cancelButton.click();
      
      const modal = document.querySelector('.card-edit-modal');
      expect(modal).toBeFalsy();
    });
    
    it('should add card changes to change stack', () => {
      const editor = new VisualEditor('test-token', 'test-site');
      editor.setupCardEditing();
      
      const card = document.querySelector('[data-editable-card="services.items.0"]');
      card.click();
      
      const titleInput = document.querySelector('#card-title');
      titleInput.value = 'Updated Service';
      
      const saveButton = document.querySelector('.modal-save-btn');
      saveButton.click();
      
      expect(editor.changeStack.length).toBe(1);
      expect(editor.changeStack[0].field).toBe('services.items.0.title');
    });
  });
});

describe('VisualEditor - Auto-Save & Debouncing', () => {
  let editor;
  let mockFetch;
  
  beforeEach(() => {
    vi.useFakeTimers();
    
    const dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.navigator = { onLine: true };
    
    global.window.siteData = { version: 1, hero: { title: 'Test' } };
    global.window.location = { search: '', pathname: '/sites/test-site/', reload: vi.fn() };
    
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, version: 2 })
    });
    global.fetch = mockFetch;
  });
  
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });
  
  it('should debounce save calls for 3 seconds', async () => {
    editor = new VisualEditor('test-token', 'test-site');
    
    // Queue multiple changes rapidly
    editor.queueSave('hero.title', 'Change 1');
    editor.queueSave('hero.title', 'Change 2');
    editor.queueSave('hero.title', 'Change 3');
    
    // Should not save yet
    expect(mockFetch).not.toHaveBeenCalled();
    
    // Fast forward 2 seconds
    vi.advanceTimersByTime(2000);
    expect(mockFetch).not.toHaveBeenCalled();
    
    // Fast forward to 3 seconds
    vi.advanceTimersByTime(1000);
    await vi.runAllTimersAsync();
    
    // Should save now
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
  
  it('should batch multiple changes in one save request', async () => {
    editor = new VisualEditor('test-token', 'test-site');
    
    editor.queueSave('hero.title', 'New Title');
    editor.queueSave('hero.subtitle', 'New Subtitle');
    
    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost/api/sites/test-site',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('hero.title')
      })
    );
  });
  
  it('should reset debounce timer on new changes', async () => {
    const { VisualEditor } = await import('../../server/services/visualEditorService.js');
    editor = new VisualEditor('test-token', 'test-site');
    
    editor.queueSave('hero.title', 'Change 1');
    vi.advanceTimersByTime(2000); // 2 seconds
    
    editor.queueSave('hero.title', 'Change 2'); // Reset timer
    vi.advanceTimersByTime(2000); // Another 2 seconds (total 4)
    
    expect(mockFetch).not.toHaveBeenCalled(); // Still waiting
    
    vi.advanceTimersByTime(1000); // Total 5 seconds, 3 since last change
    await vi.runAllTimersAsync();
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
  
  it('should show saving indicator during save', async () => {
    const { VisualEditor } = await import('../../server/services/visualEditorService.js');
    editor = new VisualEditor('test-token', 'test-site');
    
    const updateIndicatorSpy = vi.spyOn(editor, 'updateSaveIndicator');
    
    editor.queueSave('hero.title', 'New Title');
    vi.advanceTimersByTime(3000);
    
    expect(updateIndicatorSpy).toHaveBeenCalledWith('saving');
    
    await vi.runAllTimersAsync();
    
    expect(updateIndicatorSpy).toHaveBeenCalledWith('saved');
  });
  
  it('should show error indicator on save failure', async () => {
    const { VisualEditor } = await import('../../server/services/visualEditorService.js');
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' })
    });
    
    editor = new VisualEditor('test-token', 'test-site');
    const updateIndicatorSpy = vi.spyOn(editor, 'updateSaveIndicator');
    
    editor.queueSave('hero.title', 'New Title');
    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();
    
    expect(updateIndicatorSpy).toHaveBeenCalledWith('error', expect.any(String));
  });
  
  it('should retry failed saves after 5 seconds', async () => {
    const { VisualEditor } = await import('../../server/services/visualEditorService.js');
    
    // Fail first, succeed second
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    
    editor = new VisualEditor('test-token', 'test-site');
    
    editor.queueSave('hero.title', 'New Title');
    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    // Wait for retry
    vi.advanceTimersByTime(5000);
    await vi.runAllTimersAsync();
    
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
  
  it('should queue changes when offline', async () => {
    const { VisualEditor } = await import('../../server/services/visualEditorService.js');
    
    mockFetch.mockRejectedValue(new Error('Network error'));
    
    editor = new VisualEditor('test-token', 'test-site');
    
    editor.queueSave('hero.title', 'New Title');
    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();
    
    expect(editor.offlineQueue).toHaveLength(1);
    expect(editor.offlineQueue[0].field).toBe('hero.title');
  });
  
  it('should flush offline queue when back online', async () => {
    const { VisualEditor } = await import('../../server/services/visualEditorService.js');
    
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });
    
    editor = new VisualEditor('test-token', 'test-site');
    
    // Go offline
    editor.queueSave('hero.title', 'New Title');
    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();
    
    expect(editor.offlineQueue).toHaveLength(1);
    
    // Come back online
    await editor.flushOfflineQueue();
    
    expect(editor.offlineQueue).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('VisualEditor - Undo/Redo System', () => {
  let editor;
  
  beforeEach(async () => {
    const dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.window.siteData = { version: 1, hero: { title: 'Original' } };
    
    const { VisualEditor } = await import('../../server/services/visualEditorService.js');
    editor = new VisualEditor('test-token', 'test-site');
  });
  
  it('should undo last change', () => {
    editor.changeStack = [
      { field: 'hero.title', oldValue: 'Original', newValue: 'Change 1' }
    ];
    editor.siteData.hero.title = 'Change 1';
    
    editor.undo();
    
    expect(editor.siteData.hero.title).toBe('Original');
    expect(editor.changeStack).toHaveLength(0);
    expect(editor.redoStack).toHaveLength(1);
  });
  
  it('should handle multiple undos', () => {
    editor.changeStack = [
      { field: 'hero.title', oldValue: 'Original', newValue: 'Change 1' },
      { field: 'hero.title', oldValue: 'Change 1', newValue: 'Change 2' }
    ];
    editor.siteData.hero.title = 'Change 2';
    
    editor.undo();
    expect(editor.siteData.hero.title).toBe('Change 1');
    
    editor.undo();
    expect(editor.siteData.hero.title).toBe('Original');
    
    expect(editor.changeStack).toHaveLength(0);
    expect(editor.redoStack).toHaveLength(2);
  });
  
  it('should redo undone change', () => {
    editor.redoStack = [
      { field: 'hero.title', oldValue: 'Original', newValue: 'Change 1' }
    ];
    editor.siteData.hero.title = 'Original';
    
    editor.redo();
    
    expect(editor.siteData.hero.title).toBe('Change 1');
    expect(editor.redoStack).toHaveLength(0);
    expect(editor.changeStack).toHaveLength(1);
  });
  
  it('should support keyboard shortcuts', () => {
    const undoSpy = vi.spyOn(editor, 'undo');
    const redoSpy = vi.spyOn(editor, 'redo');
    
    editor.setupKeyboardShortcuts();
    
    // Cmd+Z (Mac) or Ctrl+Z (Windows)
    const undoEvent = new window.KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true // Mac
    });
    document.dispatchEvent(undoEvent);
    
    expect(undoSpy).toHaveBeenCalled();
    
    // Cmd+Shift+Z (redo)
    const redoEvent = new window.KeyboardEvent('keydown', {
      key: 'z',
      metaKey: true,
      shiftKey: true
    });
    document.dispatchEvent(redoEvent);
    
    expect(redoSpy).toHaveBeenCalled();
  });
  
  it('should do nothing when undo stack is empty', () => {
    editor.changeStack = [];
    const originalData = { ...editor.siteData };
    
    editor.undo();
    
    expect(editor.siteData).toEqual(originalData);
  });
  
  it('should do nothing when redo stack is empty', () => {
    editor.redoStack = [];
    const originalData = { ...editor.siteData };
    
    editor.redo();
    
    expect(editor.siteData).toEqual(originalData);
  });
  
  it('should update UI to reflect undo/redo availability', () => {
    const updateButtonsSpy = vi.spyOn(editor, 'updateUndoRedoButtons');
    
    editor.undo();
    expect(updateButtonsSpy).toHaveBeenCalled();
    
    editor.redo();
    expect(updateButtonsSpy).toHaveBeenCalled();
  });
  
  it('should show toast notification on undo', () => {
    const showToastSpy = vi.spyOn(editor, 'showUndoToast');
    
    editor.changeStack = [
      { field: 'hero.title', oldValue: 'Original', newValue: 'Change 1' }
    ];
    
    editor.undo();
    
    expect(showToastSpy).toHaveBeenCalledWith('Undid: hero.title');
  });
});

describe('VisualEditor - Optimistic Locking (Race Condition Prevention)', () => {
  let editor;
  let mockFetch;
  
  beforeEach(async () => {
    const dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.window.siteData = { version: 1, hero: { title: 'Original' } };
    
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    
    const { VisualEditor } = await import('../../server/services/visualEditorService.js');
    editor = new VisualEditor('test-token', 'test-site');
  });
  
  it('should send version number with save requests', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, version: 2 })
    });
    
    await editor.save([{ field: 'hero.title', value: 'New Title' }]);
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"version":1')
      })
    );
  });
  
  it('should update version number on successful save', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, version: 2 })
    });
    
    expect(editor.currentVersion).toBe(1);
    
    await editor.save([{ field: 'hero.title', value: 'New Title' }]);
    
    expect(editor.currentVersion).toBe(2);
  });
  
  it('should detect version conflict on save', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409, // Conflict
      json: async () => ({ 
        error: 'Version conflict',
        currentVersion: 3,
        expectedVersion: 1
      })
    });
    
    const result = await editor.save([{ field: 'hero.title', value: 'New Title' }]);
    
    expect(result.conflict).toBe(true);
    expect(result.currentVersion).toBe(3);
  });
  
  it('should prompt user to resolve conflicts', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ 
        error: 'Version conflict',
        currentVersion: 2,
        serverData: { hero: { title: 'Server Title' } }
      })
    });
    
    const showConflictModalSpy = vi.spyOn(editor, 'showConflictModal');
    
    await editor.save([{ field: 'hero.title', value: 'My Title' }]);
    
    expect(showConflictModalSpy).toHaveBeenCalledWith({
      localChanges: expect.any(Array),
      serverData: expect.any(Object)
    });
  });
  
  it('should allow user to keep local changes', async () => {
    const conflictData = {
      localChanges: [{ field: 'hero.title', value: 'My Title' }],
      serverData: { version: 2, hero: { title: 'Server Title' } }
    };
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, version: 3 })
    });
    
    await editor.resolveConflict('keep-local', conflictData);
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('My Title')
      })
    );
  });
  
  it('should allow user to use server version', async () => {
    const conflictData = {
      localChanges: [{ field: 'hero.title', value: 'My Title' }],
      serverData: { version: 2, hero: { title: 'Server Title' } }
    };
    
    await editor.resolveConflict('use-server', conflictData);
    
    expect(editor.siteData).toEqual(conflictData.serverData);
    expect(editor.currentVersion).toBe(2);
  });
  
  it('should allow manual merge of changes', async () => {
    const conflictData = {
      localChanges: [
        { field: 'hero.title', value: 'My Title' },
        { field: 'hero.subtitle', value: 'My Subtitle' }
      ],
      serverData: { 
        version: 2, 
        hero: { 
          title: 'Server Title',
          subtitle: 'Server Subtitle',
          image: 'new-image.jpg' // New field from server
        } 
      }
    };
    
    // User manually merges
    const mergedData = {
      hero: {
        title: 'My Title', // Keep local
        subtitle: 'Server Subtitle', // Keep server
        image: 'new-image.jpg' // Keep server addition
      }
    };
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, version: 3 })
    });
    
    await editor.resolveConflict('manual-merge', { ...conflictData, mergedData });
    
    expect(editor.siteData.hero).toEqual(mergedData.hero);
  });
  
  it('should handle concurrent edits from multiple tabs', async () => {
    // Simulate another tab editing
    const originalVersion = editor.currentVersion;
    
    // Simulate storage event from another tab
    const storageEvent = new window.StorageEvent('storage', {
      key: 'site-version-test-site',
      newValue: '2',
      oldValue: '1'
    });
    
    window.dispatchEvent(storageEvent);
    
    // Editor should detect version change
    expect(editor.needsRefresh).toBe(true);
  });
  
  it('should show warning banner when site was edited elsewhere', () => {
    editor.needsRefresh = true;
    
    const showRefreshBannerSpy = vi.spyOn(editor, 'showRefreshBanner');
    editor.checkForExternalChanges();
    
    expect(showRefreshBannerSpy).toHaveBeenCalledWith(
      'This site was edited in another tab. Refresh to see latest changes.'
    );
  });
});

describe('VisualEditor - Version History', () => {
  let editor;
  let mockFetch;
  
  beforeEach(async () => {
    const dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.window.siteData = { version: 1, hero: { title: 'Current' } };
    
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    
    const { VisualEditor } = await import('../../server/services/visualEditorService.js');
    editor = new VisualEditor('test-token', 'test-site');
  });
  
  it('should fetch version history from server', async () => {
    const mockHistory = [
      {
        id: 'checkpoint-123',
        timestamp: Date.now(),
        description: 'Updated hero.title',
        version: 3
      },
      {
        id: 'checkpoint-122',
        timestamp: Date.now() - 60000,
        description: 'Updated hero.subtitle',
        version: 2
      }
    ];
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, history: mockHistory })
    });
    
    const history = await editor.fetchVersionHistory();
    
    expect(history).toEqual(mockHistory);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost/api/sites/test-site/history',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      })
    );
  });
  
  it('should display version history in panel', async () => {
    const mockHistory = [
      { id: 'v1', timestamp: Date.now(), description: 'Change 1', version: 1 }
    ];
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, history: mockHistory })
    });
    
    await editor.showHistoryPanel();
    
    const panel = document.querySelector('.history-panel');
    expect(panel).toBeTruthy();
    expect(panel.innerHTML).toContain('Change 1');
  });
  
  it('should allow restoring previous version', async () => {
    const versionToRestore = {
      id: 'checkpoint-122',
      data: { hero: { title: 'Old Title' } },
      version: 2
    };
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, restoredVersion: 2 })
    });
    
    await editor.restoreVersion(versionToRestore);
    
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost/api/sites/test-site/restore/checkpoint-122',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });
  
  it('should create backup before restoring', async () => {
    const createBackupSpy = vi.spyOn(editor, 'createBackup');
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    
    await editor.restoreVersion({ id: 'checkpoint-122' });
    
    expect(createBackupSpy).toHaveBeenCalledWith('before-restore');
  });
  
  it('should reload page after restore', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    
    const reloadSpy = vi.spyOn(window.location, 'reload');
    
    await editor.restoreVersion({ id: 'checkpoint-122' });
    
    expect(reloadSpy).toHaveBeenCalled();
  });
  
  it('should show confirmation before restoring', async () => {
    global.confirm = vi.fn().mockReturnValue(true);
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    
    await editor.restoreVersion({ id: 'checkpoint-122' });
    
    expect(global.confirm).toHaveBeenCalledWith(
      expect.stringContaining('restore')
    );
  });
  
  it('should cancel restore if user declines', async () => {
    global.confirm = vi.fn().mockReturnValue(false);
    
    await editor.restoreVersion({ id: 'checkpoint-122' });
    
    expect(mockFetch).not.toHaveBeenCalled();
  });
  
  it('should display formatted timestamps', () => {
    const timestamp = new Date('2025-11-13T14:30:00').getTime();
    
    const formatted = editor.formatTimestamp(timestamp);
    
    expect(formatted).toMatch(/Nov 13, 2025/);
    expect(formatted).toMatch(/2:30/);
  });
});

describe('VisualEditor - Error Handling & Edge Cases', () => {
  let editor;
  
  beforeEach(async () => {
    const dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.window.siteData = { version: 1, hero: { title: 'Test' } };
    
    const { VisualEditor } = await import('../../server/services/visualEditorService.js');
    editor = new VisualEditor('test-token', 'test-site');
  });
  
  it('should handle missing siteData gracefully', () => {
    global.window.siteData = null;
    
    expect(() => new VisualEditor('token', 'site')).toThrow('Site data not loaded');
  });
  
  it('should handle network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    const result = await editor.save([{ field: 'hero.title', value: 'New' }]);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });
  
  it('should handle invalid field paths', () => {
    expect(() => {
      editor.setFieldValue('invalid..path', 'value');
    }).toThrow('Invalid field path');
  });
  
  it('should handle deeply nested field paths', () => {
    editor.siteData.services = {
      categories: [
        { items: [{ title: 'Test' }] }
      ]
    };
    
    editor.setFieldValue('services.categories.0.items.0.title', 'Updated');
    
    expect(editor.siteData.services.categories[0].items[0].title).toBe('Updated');
  });
  
  it('should sanitize user input to prevent XSS', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    
    const sanitized = editor.sanitizeInput(maliciousInput);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toBe('alert("xss")');
  });
  
  it('should validate field types', () => {
    expect(() => {
      editor.setFieldValue('services.items.0.price', 'not-a-number');
    }).toThrow('Invalid type for price field');
  });
  
  it('should handle missing DOM elements', () => {
    expect(() => {
      editor.setupEditableElements();
    }).not.toThrow();
  });
  
  it('should clean up event listeners on destroy', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    
    editor.destroy();
    
    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});

describe('VisualEditor - Performance', () => {
  it('should debounce rapid changes efficiently', async () => {
    vi.useFakeTimers();
    
    const dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'http://localhost' });
    global.window = dom.window;
    global.window.siteData = { version: 1, hero: { title: 'Test' } };
    
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
    global.fetch = mockFetch;
    
    const { VisualEditor } = await import('../../server/services/visualEditorService.js');
    const editor = new VisualEditor('test-token', 'test-site');
    
    // Simulate typing (100 changes in rapid succession)
    for (let i = 0; i < 100; i++) {
      editor.queueSave('hero.title', `Title ${i}`);
    }
    
    // Should only trigger one save after debounce period
    vi.advanceTimersByTime(3000);
    await vi.runAllTimersAsync();
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    vi.useRealTimers();
  });
  
  it('should handle large site data efficiently', async () => {
    const largeSiteData = {
      version: 1,
      products: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        title: `Product ${i}`,
        description: 'A'.repeat(500),
        price: 99.99
      }))
    };
    
    global.window.siteData = largeSiteData;
    
    const startTime = Date.now();
    
    const { VisualEditor } = await import('../../server/services/visualEditorService.js');
    const editor = new VisualEditor('test-token', 'test-site');
    
    const endTime = Date.now();
    
    // Should initialize in less than 500ms even with large data
    expect(endTime - startTime).toBeLessThan(500);
  });
});

