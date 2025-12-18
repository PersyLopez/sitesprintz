// Base API client with automatic token injection and error handling

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.csrfToken = null;
  }

  async initCsrf() {
    try {
      const response = await fetch(`${this.baseURL}/api/csrf-token`);
      if (response.ok) {
        const data = await response.json();
        this.csrfToken = data.csrfToken;
        console.log('CSRF token initialized');
      }
    } catch (error) {
      console.error('Failed to initialize CSRF token:', error);
    }
  }

  /**
   * Get authentication token from localStorage
   */
  getAuthToken() {
    return localStorage.getItem('accessToken') || localStorage.getItem('authToken');
  }

  /**
   * Build request URL with query parameters
   */
  buildRequestUrl(endpoint, options) {
    let url = `${this.baseURL}${endpoint}`;
    if (options.params) {
      const queryString = new URLSearchParams(options.params).toString();
      url += `?${queryString}`;
    }
    return url;
  }

  /**
   * Build headers with authentication and CSRF tokens
   */
  buildHeaders(options, includeContentType = true) {
    const token = this.getAuthToken();
    const headers = {
      ...options.headers,
    };

    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }

    return headers;
  }

  /**
   * Handle 401 Unauthorized response
   */
  async handleAuthError(response) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
  }

  /**
   * Parse response data based on content type
   */
  async parseResponse(response) {
    const contentType = response.headers && response.headers.get ? response.headers.get('content-type') : null;
    
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else if (typeof response.text === 'function') {
      return await response.text();
    } else if (typeof response.json === 'function') {
      // Fallback for mocks that only provide json() but no headers/text
      return await response.json();
    }
    return null;
  }

  /**
   * Execute request with retry logic
   */
  async executeWithRetry(url, options, retries, delay = 1000) {
    while (retries >= 0) {
      try {
        const response = await fetch(url, options);

        if (response.status === 401) {
          await this.handleAuthError(response);
        }

        const data = await this.parseResponse(response);

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Request failed');
        }

        return data;
      } catch (error) {
        if (retries === 0 || error.message === 'Unauthorized') {
          console.error('API request failed:', error);
          throw error;
        }

        console.warn(`API request failed, retrying (${retries} left)...`, error);
        retries--;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }

  async request(endpoint, options = {}) {
    const url = this.buildRequestUrl(endpoint, options);
    const headers = this.buildHeaders(options);
    
    const retries = options.retries !== undefined
      ? options.retries
      : (import.meta.env.MODE === 'test' ? 0 : 3);

    return await this.executeWithRetry(url, { ...options, headers }, retries);
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  // For file uploads (multipart/form-data)
  async upload(endpoint, formData, options = {}) {
    const url = this.buildRequestUrl(endpoint, options);
    const headers = this.buildHeaders(options, false); // Don't include Content-Type for multipart

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.status === 401) {
        await this.handleAuthError(response);
      }

      const data = await this.parseResponse(response);

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Upload failed');
      }

      return data;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const api = new APIClient();

export default api;

