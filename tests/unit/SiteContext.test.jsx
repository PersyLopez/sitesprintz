import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SiteProvider, SiteContext } from '../../src/context/SiteContext';
import { useContext } from 'react';
import { draftsService } from '../../src/services/drafts';

// Mock drafts service
vi.mock('../../src/services/drafts', () => ({
  draftsService: {
    saveDraft: vi.fn(),
    getDraft: vi.fn(),
  },
}));

// Mock toast hook
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

describe('SiteContext', () => {
  const renderSiteHook = () => {
    return renderHook(() => useContext(SiteContext), {
      wrapper: SiteProvider,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should provide site context', () => {
      const { result } = renderSiteHook();

      expect(result.current).toBeDefined();
      expect(result.current.siteData).toBeDefined();
      expect(result.current.siteData.businessName).toBe('');
      expect(result.current.loading).toBe(false);
    });

    it('should have default site data structure', () => {
      const { result } = renderSiteHook();

      expect(result.current.siteData).toMatchObject({
        businessName: '',
        template: '',
        heroTitle: '',
        heroSubtitle: '',
        services: [],
        colors: {
          primary: '#06b6d4',
          secondary: '#14b8a6',
        },
      });
    });

    it('should have all required methods', () => {
      const { result } = renderSiteHook();

      expect(typeof result.current.updateField).toBe('function');
      expect(typeof result.current.updateNestedField).toBe('function');
      expect(typeof result.current.addService).toBe('function');
      expect(typeof result.current.updateService).toBe('function');
      expect(typeof result.current.deleteService).toBe('function');
      expect(typeof result.current.saveDraft).toBe('function');
      expect(typeof result.current.loadDraft).toBe('function');
      expect(typeof result.current.loadTemplate).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('should initialize with auto-save enabled', () => {
      const { result } = renderSiteHook();

      expect(result.current.autoSaveEnabled).toBe(true);
    });
  });

  describe('Update Field', () => {
    it('should update simple field', () => {
      const { result } = renderSiteHook();

      act(() => {
        result.current.updateField('businessName', 'My Business');
      });

      expect(result.current.siteData.businessName).toBe('My Business');
    });

    it('should update multiple fields independently', () => {
      const { result } = renderSiteHook();

      act(() => {
        result.current.updateField('businessName', 'Business Name');
        result.current.updateField('heroTitle', 'Hero Title');
        result.current.updateField('contactEmail', 'test@example.com');
      });

      expect(result.current.siteData.businessName).toBe('Business Name');
      expect(result.current.siteData.heroTitle).toBe('Hero Title');
      expect(result.current.siteData.contactEmail).toBe('test@example.com');
    });

    it('should trigger preview update when field changes', () => {
      const { result } = renderSiteHook();
      const initialKey = result.current.previewKey;

      act(() => {
        result.current.updateField('businessName', 'Test');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.previewKey).toBe(initialKey + 1);
    });

    it('should debounce preview updates', () => {
      const { result } = renderSiteHook();
      const initialKey = result.current.previewKey;

      act(() => {
        result.current.updateField('businessName', 'Test1');
        result.current.updateField('businessName', 'Test2');
        result.current.updateField('businessName', 'Test3');
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should only trigger one preview update despite 3 field updates
      expect(result.current.previewKey).toBe(initialKey + 1);
    });
  });

  describe('Update Nested Field', () => {
    it('should update nested color fields', () => {
      const { result } = renderSiteHook();

      act(() => {
        result.current.updateNestedField('colors.primary', '#ff0000');
      });

      expect(result.current.siteData.colors.primary).toBe('#ff0000');
    });

    it('should update deeply nested fields', () => {
      const { result } = renderSiteHook();

      act(() => {
        result.current.updateNestedField('custom.nested.value', 'test');
      });

      expect(result.current.siteData.custom.nested.value).toBe('test');
    });

    it('should create nested structure if not exists', () => {
      const { result } = renderSiteHook();

      act(() => {
        result.current.updateNestedField('newField.subField', 'value');
      });

      expect(result.current.siteData.newField.subField).toBe('value');
    });
  });

  describe('Service Management', () => {
    it('should add new service', () => {
      const { result } = renderSiteHook();
      const service = { name: 'Service 1', price: 100 };

      act(() => {
        result.current.addService(service);
      });

      expect(result.current.siteData.services).toHaveLength(1);
      expect(result.current.siteData.services[0]).toMatchObject(service);
      expect(result.current.siteData.services[0].id).toBeDefined();
    });

    it('should add multiple services', () => {
      const { result } = renderSiteHook();

      act(() => {
        result.current.addService({ name: 'Service 1', price: 100 });
        result.current.addService({ name: 'Service 2', price: 200 });
      });

      expect(result.current.siteData.services).toHaveLength(2);
    });

    it('should update service by id', () => {
      const { result } = renderSiteHook();

      act(() => {
        result.current.addService({ name: 'Service 1', price: 100 });
      });

      const serviceId = result.current.siteData.services[0].id;

      act(() => {
        result.current.updateService(serviceId, { name: 'Updated Service', price: 150 });
      });

      expect(result.current.siteData.services[0].name).toBe('Updated Service');
      expect(result.current.siteData.services[0].price).toBe(150);
    });
  });

  describe('Draft Management', () => {
    it('should save draft successfully', async () => {
      draftsService.saveDraft.mockResolvedValue({ draftId: 'draft-123' });
      const { result } = renderSiteHook();

      act(() => {
        result.current.updateField('businessName', 'Test Business');
      });

      await act(async () => {
        await result.current.saveDraft();
      });

      expect(draftsService.saveDraft).toHaveBeenCalledWith({
        id: null,
        data: expect.objectContaining({
          businessName: 'Test Business',
        }),
      });
      expect(mockShowSuccess).toHaveBeenCalledWith('Draft saved successfully');
    });

    it('should set draft ID after first save', async () => {
      draftsService.saveDraft.mockResolvedValue({ draftId: 'draft-123' });
      const { result } = renderSiteHook();

      await act(async () => {
        await result.current.saveDraft();
      });

      expect(result.current.draftId).toBe('draft-123');
    });

    it('should handle save errors', async () => {
      draftsService.saveDraft.mockRejectedValue(new Error('Save failed'));
      const { result } = renderSiteHook();

      await act(async () => {
        try {
          await result.current.saveDraft();
        } catch (error) {
          // Expected error
        }
      });

      expect(mockShowError).toHaveBeenCalledWith('Failed to save draft');
    });

    it('should save silently when auto-saving', async () => {
      draftsService.saveDraft.mockResolvedValue({ draftId: 'draft-123' });
      const { result } = renderSiteHook();

      await act(async () => {
        await result.current.saveDraft(true);
      });

      expect(mockShowSuccess).not.toHaveBeenCalled();
      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });

    it('should load draft successfully', async () => {
      const mockDraft = {
        data: {
          businessName: 'Loaded Business',
          template: 'restaurant',
          services: [{ id: 1, name: 'Service' }],
        },
      };
      draftsService.getDraft.mockResolvedValue(mockDraft);
      const { result } = renderSiteHook();

      await act(async () => {
        await result.current.loadDraft('draft-123');
      });

      expect(result.current.siteData.businessName).toBe('Loaded Business');
      expect(result.current.draftId).toBe('draft-123');
      expect(mockShowSuccess).toHaveBeenCalledWith('Draft loaded');
    });

    it('should handle load errors', async () => {
      draftsService.getDraft.mockRejectedValue(new Error('Load failed'));
      const { result } = renderSiteHook();

      await act(async () => {
        try {
          await result.current.loadDraft('draft-123');
        } catch (error) {
          // Expected error
        }
      });

      expect(mockShowError).toHaveBeenCalledWith('Failed to load draft');
    });
  });

  describe('Template Loading', () => {
    it('should load template data', () => {
      const { result } = renderSiteHook();
      const templateData = {
        id: 'restaurant',
        brand: {
          name: 'Restaurant Name',
          email: 'info@restaurant.com',
        },
        hero: {
          title: 'Welcome',
          subtitle: 'To our restaurant',
          image: '/hero.jpg',
        },
        services: [{ name: 'Service 1' }],
        colors: {
          primary: '#ff0000',
          secondary: '#00ff00',
        },
      };

      act(() => {
        result.current.loadTemplate(templateData);
      });

      expect(result.current.siteData.template).toBe('restaurant');
      expect(result.current.siteData.businessName).toBe('Restaurant Name');
      expect(result.current.siteData.heroTitle).toBe('Welcome');
      expect(result.current.siteData.services).toHaveLength(1);
      expect(result.current.siteData.colors.primary).toBe('#ff0000');
    });

    it('should preserve template demo content', () => {
      const { result } = renderSiteHook();
      const templateData = {
        id: 'salon',
        custom: { feature: 'value' },
        services: [{ name: 'Haircut' }, { name: 'Coloring' }],
      };

      act(() => {
        result.current.loadTemplate(templateData);
      });

      expect(result.current.siteData.custom.feature).toBe('value');
      expect(result.current.siteData.services).toHaveLength(2);
    });

    it('should handle template with alternate field names', () => {
      const { result } = renderSiteHook();
      const templateData = {
        template: 'gym',
        businessName: 'Gym Name',
        products: [{ name: 'Membership' }],
      };

      act(() => {
        result.current.loadTemplate(templateData);
      });

      expect(result.current.siteData.template).toBe('gym');
      expect(result.current.siteData.services).toHaveLength(1);
    });
  });

  describe('Auto-save', () => {
    it('should auto-save after interval', async () => {
      draftsService.saveDraft.mockResolvedValue({ draftId: 'draft-123' });
      const { result } = renderSiteHook();

      act(() => {
        result.current.updateField('template', 'restaurant');
        result.current.updateField('businessName', 'Test');
      });

      // Wait for first save to set draftId
      await act(async () => {
        await result.current.saveDraft(true);
      });

      vi.clearAllMocks();

      // Advance time by 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Wait for async operations
      await vi.runOnlyPendingTimersAsync();

      expect(draftsService.saveDraft).toHaveBeenCalled();
    }, 10000);

    it('should not auto-save when disabled', async () => {
      draftsService.saveDraft.mockResolvedValue({ draftId: 'draft-123' });
      const { result } = renderSiteHook();

      act(() => {
        result.current.setAutoSaveEnabled(false);
        result.current.updateField('template', 'restaurant');
      });

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(draftsService.saveDraft).not.toHaveBeenCalled();
    });

    it('should not auto-save without draftId', async () => {
      const { result } = renderSiteHook();

      act(() => {
        result.current.updateField('businessName', 'Test');
      });

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(draftsService.saveDraft).not.toHaveBeenCalled();
    });
  });

  describe('Reset', () => {
    it('should reset all site data', () => {
      const { result } = renderSiteHook();

      act(() => {
        result.current.updateField('businessName', 'Test Business');
        result.current.updateField('heroTitle', 'Test Hero');
        result.current.addService({ name: 'Service' });
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.siteData.businessName).toBe('');
      expect(result.current.siteData.heroTitle).toBe('');
      expect(result.current.siteData.services).toHaveLength(0);
      expect(result.current.draftId).toBeNull();
    });

    it('should reset to default colors', () => {
      const { result } = renderSiteHook();

      act(() => {
        result.current.updateNestedField('colors.primary', '#ff0000');
        result.current.reset();
      });

      expect(result.current.siteData.colors.primary).toBe('#06b6d4');
      expect(result.current.siteData.colors.secondary).toBe('#14b8a6');
    });
  });

  describe('Loading States', () => {
    it('should set loading state during operations', async () => {
      let resolvePromise;
      draftsService.saveDraft.mockImplementation(() => 
        new Promise(resolve => {
          resolvePromise = () => resolve({ draftId: 'draft-123' });
        })
      );
      const { result } = renderSiteHook();

      // Start save without waiting
      let savePromise;
      act(() => {
        savePromise = result.current.saveDraft();
      });

      // Loading should be true immediately
      expect(result.current.loading).toBe(true);
      
      // Resolve the promise
      act(() => {
        resolvePromise();
      });
      
      await act(async () => {
        await savePromise;
      });
      
      expect(result.current.loading).toBe(false);
    });

    it('should track saving state', async () => {
      draftsService.saveDraft.mockResolvedValue({ draftId: 'draft-123' });
      const { result } = renderSiteHook();

      let savePromise;
      act(() => {
        savePromise = result.current.saveDraft();
      });

      expect(result.current.isSaving).toBe(true);

      await act(async () => {
        await savePromise;
      });

      expect(result.current.isSaving).toBe(false);
    });
  });
});

