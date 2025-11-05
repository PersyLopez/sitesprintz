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
    setSiteData(prev => ({
      ...prev,
      ...templateData,
      template: templateData.id || templateData.template,
    }));
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

