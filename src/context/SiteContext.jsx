import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { draftsService } from '../services/drafts';
import { useToast } from '../hooks/useToast';

export const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const { showSuccess, showError } = useToast();
  
  const [siteData, setSiteData] = useState({
    businessName: '',
    template: '',
    heroTitle: '',
    heroSubtitle: '',
    heroImage: '',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    businessHours: '',
    websiteUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    googleMapsUrl: '',
    services: [],
    colors: {
      primary: '#06b6d4',
      secondary: '#14b8a6',
    },
  });
  
  const [draftId, setDraftId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [previewKey, setPreviewKey] = useState(0); // For triggering preview updates

  const previewTimerRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // Debounced preview update (300ms delay)
  const triggerPreviewUpdate = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }
    
    previewTimerRef.current = setTimeout(() => {
      setPreviewKey(prev => prev + 1);
      console.log('🔄 Preview updated');
    }, 300); // 300ms debounce
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!autoSaveEnabled || !siteData.template || !draftId) return;
    
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = setInterval(() => {
      saveDraft(true); // silent save
    }, 30000); // 30 seconds
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [siteData, autoSaveEnabled, draftId]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, []);

  const updateField = useCallback((field, value) => {
    setSiteData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Trigger preview update
    triggerPreviewUpdate();
  }, [triggerPreviewUpdate]);

  const updateNestedField = useCallback((path, value) => {
    setSiteData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    
    // Trigger preview update
    triggerPreviewUpdate();
  }, [triggerPreviewUpdate]);

  const addService = useCallback((service) => {
    setSiteData(prev => ({
      ...prev,
      services: [...prev.services, { id: Date.now(), ...service }],
    }));
    triggerPreviewUpdate();
  }, [triggerPreviewUpdate]);

  const updateService = useCallback((id, updates) => {
    setSiteData(prev => ({
      ...prev,
      services: prev.services.map(s => 
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
    triggerPreviewUpdate();
  }, [triggerPreviewUpdate]);

  const deleteService = useCallback((id) => {
    setSiteData(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id),
    }));
    triggerPreviewUpdate();
  }, [triggerPreviewUpdate]);

  const saveDraft = async (silent = false) => {
    if (!silent) setLoading(true);
    setIsSaving(true);
    
    try {
      const response = await draftsService.saveDraft({
        id: draftId,
        data: siteData,
      });
      
      if (response.draftId && !draftId) {
        setDraftId(response.draftId);
      }
      
      setLastSaved(new Date());
      
      if (!silent) {
        showSuccess('Draft saved successfully');
      }
      
      return response;
    } catch (error) {
      if (!silent) {
        showError('Failed to save draft');
      }
      throw error;
    } finally {
      if (!silent) setLoading(false);
      setIsSaving(false);
    }
  };

  const loadDraft = async (id) => {
    setLoading(true);
    
    try {
      const draft = await draftsService.getDraft(id);
      setSiteData(draft.data);
      setDraftId(id);
      showSuccess('Draft loaded');
    } catch (error) {
      showError('Failed to load draft');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = useCallback((templateData) => {
    // When loading a template, preserve ALL its demo content
    // This ensures sites show their full potential
    const fullTemplateData = {
      // Spread all template data first (includes demo content)
      ...templateData,
      // Then add/override with essentials
      template: templateData.id || templateData.template,
      businessName: templateData.brand?.name || templateData.businessName || '',
      // Preserve hero data from template
      heroTitle: templateData.hero?.title || '',
      heroSubtitle: templateData.hero?.subtitle || '',
      heroImage: templateData.hero?.image || '',
      // Preserve contact data
      contactEmail: templateData.brand?.email || templateData.contact?.email || '',
      contactPhone: templateData.brand?.phone || templateData.contact?.phone || '',
      contactAddress: templateData.contact?.address || '',
      businessHours: templateData.contact?.hours || '',
      // Preserve social links
      websiteUrl: templateData.social?.website || '',
      facebookUrl: templateData.social?.facebook || '',
      instagramUrl: templateData.social?.instagram || '',
      googleMapsUrl: templateData.social?.maps || '',
      // Preserve services/products from template
      services: templateData.services || templateData.products || [],
      // Preserve colors from template
      colors: {
        primary: templateData.themeVars?.['color-primary'] || templateData.colors?.primary || '#06b6d4',
        secondary: templateData.themeVars?.['color-accent'] || templateData.colors?.secondary || '#14b8a6',
      },
      // Preserve any custom data
      custom: templateData.custom || {},
    };
    
    setSiteData(fullTemplateData);
  }, []);

  const reset = useCallback(() => {
    setSiteData({
      businessName: '',
      template: '',
      heroTitle: '',
      heroSubtitle: '',
      heroImage: '',
      contactEmail: '',
      contactPhone: '',
      contactAddress: '',
      businessHours: '',
      websiteUrl: '',
      facebookUrl: '',
      instagramUrl: '',
      googleMapsUrl: '',
      services: [],
      colors: {
        primary: '#06b6d4',
        secondary: '#14b8a6',
      },
    });
    setDraftId(null);
    setLastSaved(null);
  }, []);

  const value = {
    siteData,
    draftId,
    loading,
    isSaving,
    lastSaved,
    autoSaveEnabled,
    previewKey, // For PreviewFrame to watch
    setAutoSaveEnabled,
    updateField,
    updateNestedField,
    addService,
    updateService,
    deleteService,
    saveDraft,
    loadDraft,
    loadTemplate,
    reset,
  };

  return (
    <SiteContext.Provider value={value}>
      {children}
    </SiteContext.Provider>
  );
}

