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

  // Get site analytics
  async getSiteAnalytics(userId) {
    return api.get(`/api/users/${userId}/analytics`);
  },
};

export default sitesService;

