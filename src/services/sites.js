// Site management API service
import api from './api.js';

export const sitesService = {
  // Get user's sites
  async getUserSites(userId) {
    return api.get(`/api/users/${userId}/sites`);
  },

  // Delete site
  async deleteSite(userId, siteId) {
    return api.delete(`/api/users/${userId}/sites/${siteId}`);
  },

  // Get site by ID or subdomain
  async getSite(siteId) {
    return api.get(`/api/sites/${siteId}`);
  },

  // Get site analytics
  async getSiteAnalytics(userId) {
    return api.get(`/api/users/${userId}/analytics`);
  },
  // Update site data
  async updateSite(siteId, siteData) {
    return api.put(`/api/sites/${siteId}`, { siteData });
  },

  // Update site via visual editor API (PATCH with version control)
  async patchSiteChanges(subdomain, version, changes) {
    return api.patch(`/api/sites/${subdomain}`, { version, changes });
  },
};

export default sitesService;

