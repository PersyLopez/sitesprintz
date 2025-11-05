import React, { createContext, useState, useEffect, useCallback } from 'react';
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
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!autoSaveEnabled || !siteData.template) return;
    
    const interval = setInterval(() => {
      saveDraft(true); // silent save
    }, 30000);
    
    return () => clearInterval(interval);
  }, [siteData, autoSaveEnabled]);

  const updateField = useCallback((field, value) => {
    setSiteData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

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
  }, []);

  const addService = useCallback((service) => {
    setSiteData(prev => ({
      ...prev,
      services: [...prev.services, { id: Date.now(), ...service }],
    }));
  }, []);

  const updateService = useCallback((id, updates) => {
    setSiteData(prev => ({
      ...prev,
      services: prev.services.map(s => 
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  }, []);

  const deleteService = useCallback((id) => {
    setSiteData(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id),
    }));
  }, []);

  const saveDraft = async (silent = false) => {
    setLoading(true);
    
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
      setLoading(false);
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
    lastSaved,
    autoSaveEnabled,
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

