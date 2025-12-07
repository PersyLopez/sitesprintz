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

  async request(endpoint, options = {}) {
    let url = `${this.baseURL}${endpoint}`;

    // Handle query parameters
    if (options.params) {
      const queryString = new URLSearchParams(options.params).toString();
      url += `?${queryString}`;
    }

    // Get token from localStorage
    const token = localStorage.getItem('authToken');

    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add CSRF token if exists
    if (this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
    }

    let retries = 5;
    let delay = 1000;

    while (retries >= 0) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        // Handle 401 Unauthorized
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
          throw new Error('Unauthorized');
        }

        // Parse JSON response
        let data;
        const contentType = response.headers && response.headers.get ? response.headers.get('content-type') : null;
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else if (typeof response.text === 'function') {
          data = await response.text();
        } else if (typeof response.json === 'function') {
          // Fallback for mocks that only provide json() but no headers/text
          data = await response.json();
        } else {
          data = null;
        }

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Request failed');
        }

        return data;
      } catch (error) {
        // Don't retry on auth errors or if retries exhausted
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
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('authToken');

    const headers = {
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }

      const data = await response.json();

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

