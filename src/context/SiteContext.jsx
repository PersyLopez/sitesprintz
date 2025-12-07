import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { draftsService } from '../services/drafts';
import { useToast } from '../hooks/useToast';
import { generateDemoContent } from '../utils/demoContent';

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
      services: [...prev.services, { id: Date.now() + Math.random().toString(36).substr(2, 9), ...service }],
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

    // Verify template is present before saving
    if (!siteData.template) {
      console.error('ERROR: saveDraft called but siteData.template is missing!', siteData);
    } else {
      console.log('saveDraft called with template:', siteData.template);
    }
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
    // For Pro/Premium templates with existing content, use template content FIRST
    // Only use demo content as fallback for missing fields
    const hasRichContent = templateData.menu || templateData.team || templateData.gallery || templateData.testimonials;

    const fullTemplateData = hasRichContent ? {
      // Use actual template data as primary source for Pro templates
      ...templateData,
      // Ensure core IDs are set
      template: templateData.id || templateData.template,
      templateId: templateData.id || templateData.template,
      id: templateData.id || templateData.template,
      // Map brand fields to expected format
      businessName: templateData.brand?.name || templateData.businessName,
      heroTitle: templateData.hero?.title || templateData.heroTitle,
      heroSubtitle: templateData.hero?.subtitle || templateData.heroSubtitle,
      heroImage: templateData.hero?.image || templateData.heroImage,
      tagline: templateData.brand?.tagline || templateData.tagline,
      // Map contact fields
      contactEmail: templateData.brand?.email || templateData.contact?.email || templateData.contactEmail,
      contactPhone: templateData.brand?.phone || templateData.contact?.phone || templateData.contactPhone,
      contactAddress: templateData.contact?.address || templateData.contactAddress,
      businessHours: templateData.contact?.hours || templateData.businessHours,
      // Map colors from themeVars
      colors: {
        primary: templateData.themeVars?.['color-primary'] || templateData.colors?.primary || '#06b6d4',
        accent: templateData.themeVars?.['color-accent'] || templateData.colors?.accent || '#14b8a6',
        secondary: templateData.themeVars?.['color-accent'] || templateData.colors?.secondary || '#14b8a6',
        background: templateData.colors?.background || '#0f172a'
      },
      // Keep all rich content from template
      menu: templateData.menu,
      team: templateData.team,
      gallery: templateData.gallery,
      testimonials: templateData.testimonials,
      stats: templateData.stats,
      credentials: templateData.credentials,
      faq: templateData.faq,
      about: templateData.about,
      chefSpecials: templateData.chefSpecials,
      privateEvents: templateData.privateEvents,
      contact: templateData.contact,
      social: templateData.social,
      features: templateData.features,
      // Keep nav and other features
      nav: templateData.nav
    } : {
      // For Starter templates without rich content, use demo content
      ...generateDemoContent(templateData.id || templateData.template),
      ...templateData,
      template: templateData.id || templateData.template,
      templateId: templateData.id || templateData.template,
      id: templateData.id || templateData.template
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

