import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { draftsService } from '../services/drafts';
import { useToast } from '../hooks/useToast';
import { generateDemoContent } from '../utils/demoContent';
import { colorsFromSiteTheme, DEFAULT_SITE_THEME_ID, normalizeSiteThemeId } from '../config/siteThemes';
import { normalizeTemplateSections } from '../utils/sectionNormalizer';
import { getLayoutForNiche } from '../config/layouts';
import { applyEditableField } from '../utils/seamlessEditFields';

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
    social: {
      facebook: '',
      instagram: '',
      whatsapp: '',
      tiktok: '',
      maps: '',
      website: '',
      linkedin: '',
    },
    services: [],
    colors: colorsFromSiteTheme(DEFAULT_SITE_THEME_ID),
  });

  const [draftId, setDraftId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);
  const [previewKey, setPreviewKey] = useState(0); // For triggering preview updates
  const [history, setHistory] = useState([]); // Undo history
  const [historyIndex, setHistoryIndex] = useState(-1); // Current position in history
  const MAX_HISTORY = 50;

  const previewTimerRef = useRef(null);
  const autoSaveTimerRef = useRef(null);

  // Debounced preview update (300ms delay)
  const triggerPreviewUpdate = useCallback((immediate = false) => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    if (immediate) {
      setPreviewKey((prev) => prev + 1);
      return;
    }

    previewTimerRef.current = setTimeout(() => {
      setPreviewKey((prev) => prev + 1);
    }, 300);
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

  const addToHistory = useCallback((data) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(data))); // Deep clone
      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      } else {
        setHistoryIndex(newHistory.length - 1);
      }
      return newHistory;
    });
  }, [historyIndex]);

  const updateField = useCallback((field, value) => {
    setSiteData(prev => {
      const newData = {
        ...prev,
        [field]: value,
      };
      // Add to history before updating
      addToHistory(prev);
      return newData;
    });

    // Trigger preview update
    triggerPreviewUpdate();
  }, [triggerPreviewUpdate, addToHistory]);

  const updateNestedField = useCallback((path, value) => {
    setSiteData(prev => {
      addToHistory(prev);
      const keys = path.split('.');
      const newData = { ...prev };
      let current = newData;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        current[key] = current[key] ? { ...current[key] } : {};
        current = current[key];
      }

      current[keys[keys.length - 1]] = value;

      if (path === 'brand.name') {
        newData.businessName = value;
      }

      return newData;
    });

    // Trigger preview update
    triggerPreviewUpdate();
  }, [triggerPreviewUpdate, addToHistory]);

  const applyLiveField = useCallback((field, value) => {
    setSiteData((prev) => {
      addToHistory(prev);
      const next = JSON.parse(JSON.stringify(prev));
      applyEditableField(next, field, value);
      return next;
    });
    triggerPreviewUpdate();
  }, [triggerPreviewUpdate, addToHistory]);

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
      let response;
      // If draftId exists and doesn't start with 'draft-', it's an existing site
      if (draftId && !draftId.startsWith('draft-')) {
        console.log('[SiteContext] Updating existing site:', draftId);
        const { sitesService } = await import('../services/sites');
        response = await sitesService.updateSite(draftId, siteData);
      } else {
        console.log('[SiteContext] Saving as draft. Current draftId:', draftId);
        response = await draftsService.saveDraft({
          id: draftId,
          data: siteData,
        });
      }

      if (response && response.draftId && !draftId) {
        setDraftId(response.draftId);
      } else if (response && response.site?.id && !draftId) {
        setDraftId(response.site.id);
      }

      setLastSaved(new Date());

      if (!silent) {
        showSuccess('Changes saved successfully');
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

  const loadSite = async (id) => {
    setLoading(true);
    try {
      const { sitesService } = await import('../services/sites');
      const response = await sitesService.getSite(id);
      const site = response.site || response;

      // Map site data to internal format
      const mappedData = {
        ...site.data,
        template: site.templateId || site.data?.template,
        id: site.id
      };

      setSiteData(mappedData);
      setDraftId(site.id); // In the builder, draftId can also be the site ID
      showSuccess('Site loaded');
    } catch (error) {
      showError('Failed to load site');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = useCallback((templateData) => {
    // For Pro/Premium templates with existing content, use template content FIRST
    // Only use demo content as fallback for missing fields
    const templateKey = templateData.id || templateData.template || templateData._niche;
    const hasRichContent = templateData.menu || templateData.team || templateData.gallery || templateData.testimonials
      || (Array.isArray(templateData.sections) && templateData.sections.length > 0);

    const fullTemplateData = hasRichContent ? {
      // Use actual template data as primary source for Pro templates
      ...templateData,
      // Ensure core IDs are set
      template: templateKey,
      templateId: templateKey,
      id: templateKey,
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
      // Map colors from a curated theme id
      colors: colorsFromSiteTheme(normalizeSiteThemeId(
        templateData._themeId || templateData.colors?.themeId,
        templateData._niche || templateData.template
      )),
      _themeId: normalizeSiteThemeId(
        templateData._themeId || templateData.colors?.themeId,
        templateData._niche || templateData.template
      ),
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
      social: {
        facebook: templateData.social?.facebook || templateData.facebookUrl || '',
        instagram: templateData.social?.instagram || templateData.instagramUrl || '',
        whatsapp: templateData.social?.whatsapp || '',
        tiktok: templateData.social?.tiktok || '',
        maps: templateData.social?.maps || templateData.googleMapsUrl || templateData.social?.googleMapsUrl || '',
        website: templateData.social?.website || templateData.websiteUrl || '',
        linkedin: templateData.social?.linkedin || '',
        ...(templateData.social?.twitter ? { twitter: templateData.social.twitter } : {}),
        ...(templateData.social?.youtube ? { youtube: templateData.social.youtube } : {}),
      },
      features: templateData.features,
      // Keep nav and other features
      nav: templateData.nav
    } : {
      // For Starter templates without rich content, use demo content
      ...(templateKey ? generateDemoContent(templateKey) : {}),
      ...templateData,
      template: templateKey,
      templateId: templateKey,
      id: templateKey
    };

    const nicheId = fullTemplateData.template || fullTemplateData.id;
    const existingSections = Array.isArray(fullTemplateData.sections) ? fullTemplateData.sections : [];
    const hasPageHero = existingSections.some((section) => section?.type === 'hero');
    if (existingSections.length === 0 || !hasPageHero) {
      const pageSections = normalizeTemplateSections({
        ...fullTemplateData,
        sections: undefined,
      });
      fullTemplateData.sections = [...pageSections, ...existingSections];
    }
    if (!fullTemplateData._niche) fullTemplateData._niche = nicheId;
    if (!fullTemplateData._layout) fullTemplateData._layout = getLayoutForNiche(nicheId);

    setSiteData(fullTemplateData);
    triggerPreviewUpdate(true);
  }, [triggerPreviewUpdate]);

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
      social: {
        facebook: '',
        instagram: '',
        whatsapp: '',
        tiktok: '',
        maps: '',
        website: '',
        linkedin: '',
      },
      services: [],
      colors: colorsFromSiteTheme(DEFAULT_SITE_THEME_ID),
    });
    setDraftId(null);
    setLastSaved(null);
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setSiteData(JSON.parse(JSON.stringify(history[newIndex]))); // Deep clone
      triggerPreviewUpdate();
    }
  }, [history, historyIndex, triggerPreviewUpdate]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setSiteData(JSON.parse(JSON.stringify(history[newIndex]))); // Deep clone
      triggerPreviewUpdate();
    }
  }, [history, historyIndex, triggerPreviewUpdate]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

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
    applyLiveField,
    addService,
    updateService,
    deleteService,
    saveDraft,
    loadDraft,
    undo,
    redo,
    canUndo,
    canRedo,
    loadSite,
    loadTemplate,
    reset,
  };

  return (
    <SiteContext.Provider value={value}>
      {children}
    </SiteContext.Provider>
  );
}

