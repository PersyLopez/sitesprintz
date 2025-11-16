// Re-export API client methods for convenience
import apiClient from '../services/api.js';

export const get = (endpoint, options) => apiClient.get(endpoint, options);
export const post = (endpoint, body, options) => apiClient.post(endpoint, body, options);
export const put = (endpoint, body, options) => apiClient.put(endpoint, body, options);
export const del = (endpoint, options) => apiClient.delete(endpoint, options);
export const upload = (endpoint, formData, options) => apiClient.upload(endpoint, formData, options);

export default apiClient;

