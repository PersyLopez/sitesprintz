// Draft management API service
import api from './api.js';

export const draftsService = {
  // Save draft
  async saveDraft(draftData) {
    return api.post('/api/drafts', draftData);
  },

  // Get draft by ID
  async getDraft(draftId) {
    return api.get(`/api/drafts/${draftId}`);
  },

  // Delete draft
  async deleteDraft(draftId) {
    return api.delete(`/api/drafts/${draftId}`);
  },

  // Publish draft
  async publishDraft(draftId, publishData) {
    return api.post(`/api/drafts/${draftId}/publish`, publishData);
  },
};

export default draftsService;

