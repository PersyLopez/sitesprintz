// Image upload service
import api from './api.js';

export const uploadsService = {
  // Get admin token for uploads
  async getAdminToken() {
    return api.get('/api/admin-token');
  },

  // Upload image
  async uploadImage(file, adminToken) {
    const formData = new FormData();
    formData.append('image', file);
    
    if (adminToken) {
      formData.append('adminToken', adminToken);
    }
    
    return api.upload('/api/upload', formData);
  },

  // Delete image
  async deleteImage(filename) {
    return api.delete(`/api/uploads/${filename}`);
  },

  // Upload multiple images
  async uploadImages(files, adminToken) {
    const uploads = await Promise.all(
      files.map(file => this.uploadImage(file, adminToken))
    );
    return uploads;
  },
};

export default uploadsService;

