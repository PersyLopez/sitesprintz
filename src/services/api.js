// Base API client with automatic token injection and error handling

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function isAbortError(error) {
  if (!error) return false;
  if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') return true;
  if (error.originalError) return isAbortError(error.originalError);
  return false;
}

class APIClient {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
    this.csrfToken = null;
  }

  async initCsrf() {
    try {
      const response = await fetch(`${this.baseURL}/api/csrf-token`, {
        credentials: 'include'
      });
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
    const token = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
    // Sanitize token - ignore literal "null", "undefined", or empty strings
    if (!token || token === 'null' || token === 'undefined' || token === '[object Object]') {
      return null;
    }
    return token;
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
      // Stay on auth screens so login/register can show form errors.
      // A hard redirect here wipes toasts and controlled form state.
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const isAuthScreen =
        path === '/login' ||
        path === '/register' ||
        path === '/forgot-password' ||
        path.startsWith('/reset-password') ||
        path.startsWith('/verify-email') ||
        path.startsWith('/oauth');
      if (!isAuthScreen) {
        window.location.href = '/login';
      }
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
   * Build a structured API error from a non-OK response.
   */
  buildApiError(response, data) {
    const message = data?.message || data?.error || 'Request failed';
    const apiError = new Error(message);
    apiError.statusCode = response.status;
    apiError.payload = data;
    return apiError;
  }

  /**
   * Whether executeWithRetry should attempt another fetch for this failure.
   */
  isRetryableApiFailure(error, retriesLeft) {
    if (retriesLeft <= 0) return false;
    if (error.message === 'Unauthorized') return false;
    if (typeof error.statusCode === 'number') {
      if (error.statusCode === 429) return true;
      if (error.statusCode >= 500) return true;
      return false;
    }
    return true;
  }

  /**
   * Execute request with retry logic
   */
  async executeWithRetry(url, options, retries, delay = 1000) {
    let retriesLeft = retries;

    while (retriesLeft >= 0) {
      try {
        const response = await fetch(url, {
          ...options,
          credentials: 'include'
        });

        if (response.status === 401) {
          await this.handleAuthError(response);
        }

        const data = await this.parseResponse(response);

        if (!response.ok) {
          const apiError = this.buildApiError(response, data);
          if (!this.isRetryableApiFailure(apiError, retriesLeft)) {
            throw apiError;
          }
          console.warn(`API request failed, retrying (${retriesLeft} left)...`, apiError);
          retriesLeft--;
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        return data;
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        if (error.message === 'Unauthorized') {
          const authError = new Error(error.message || 'Unauthorized');
          authError.isAuthError = true;
          authError.originalError = error;
          throw authError;
        }

        if (typeof error.statusCode === 'number') {
          if (!this.isRetryableApiFailure(error, retriesLeft)) {
            throw error;
          }
          console.warn(`API request failed, retrying (${retriesLeft} left)...`, error);
          retriesLeft--;
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        if (retriesLeft === 0) {
          console.error('API request failed:', error);
          const enhancedError = new Error(error.message || 'Request failed');
          enhancedError.isNetworkError = error.message?.includes('fetch')
            || error.message?.includes('network')
            || error.message?.includes('Failed to fetch')
            || error.name === 'TypeError';
          enhancedError.isAuthError = error.message?.includes('Unauthorized')
            || error.message?.includes('401')
            || error.message?.includes('token');
          enhancedError.originalError = error;
          throw enhancedError;
        }

        console.warn(`API request failed, retrying (${retriesLeft} left)...`, error);
        retriesLeft--;
        await new Promise((resolve) => setTimeout(resolve, delay));
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

  patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
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
        credentials: 'include'
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

