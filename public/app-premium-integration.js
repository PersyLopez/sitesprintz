/**
 * Premium Features Integration for app.js
 * Add this code to the end of app.js
 */

// Add to the end of app.js after loadConfig().then(renderSite).catch...

// ============================================
// PREMIUM FEATURES INITIALIZATION
// ============================================

function initPremiumFeatures(config) {
  if (!window.PremiumFeatures) {
    console.log('Premium features module not loaded');
    return;
  }

  // 1. Initialize Live Chat Widget
  if (config.chat) {
    window.PremiumFeatures.initLiveChat(config.chat);
  }

  // 2. Initialize Service Filters if present
  if (config.serviceFilters && config.serviceFilters.enabled) {
    setTimeout(() => {
      const containerId = config.serviceFilters.containerId || 'medical-services';
      const items = config.services || config.products || [];
      const filters = config.serviceFilters.filters || [
        { label: 'All', value: 'all' },
        { label: 'Primary Care', value: 'primary' },
        { label: 'Specialty', value: 'specialty' }
      ];
      window.PremiumFeatures.initServiceFilters(containerId, items, filters);
    }, 500);
  }

  // 3. Enhance team member profiles
  enhanceTeamProfiles(config);
}

function enhanceTeamProfiles(config) {
  // Find team showcase sections
  const teamSections = config.sections?.filter(s => 
    s.type === 'team-showcase' || s.type === 'healthcare-team' || s.type === 'team'
  );

  if (!teamSections || teamSections.length === 0) return;

  teamSections.forEach(section => {
    const providers = section.settings?.providers || section.settings?.team;
    if (!providers || providers.length === 0) return;

    // Check if any provider has enhanced fields (languages, specializations, etc.)
    const hasEnhancedFields = providers.some(p => 
      p.languages || p.specializations || p.videoUrl || p.reviews || p.availability
    );

    if (hasEnhancedFields) {
      // Mark this section for enhanced rendering
      section.enhanced = true;
      console.log('✅ Enhanced team profiles detected');
    }
  });
}

// Add this to the renderSite function after sections are rendered
// Insert after: contentRoot.appendChild(sec);

// Example integration point:
/*
function renderSite(cfg){
  clearTimers();
  cleanupPremiumHeader();
  contentRoot.innerHTML = '';
  footerRoot.innerHTML = '';
  
  setThemeFromConfig(cfg);
  setDocumentMeta(cfg);
  
  // ... existing rendering code ...
  
  // NEW: Initialize premium features after rendering
  initPremiumFeatures(cfg);
}
*/

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initPremiumFeatures };
}

