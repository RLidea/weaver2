/**
 * Centralized API Client with automatic token refresh
 * Handles JWT access token renewal automatically on 401 errors
 */
class ApiClient {
  constructor() {
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  /**
   * Main request method that handles all API calls
   */
  async request(url, options = {}) {
    // Add access token to headers automatically
    const token = this.getAccessToken();
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    };

    try {
      let response = await fetch(url, config);
      
      // Handle 401 Unauthorized - token might be expired
      if (response.status === 401 && !this.isRefreshing) {
        return this.handleTokenRefresh(url, config);
      }
      
      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Handle token refresh when 401 error occurs
   */
  async handleTokenRefresh(originalUrl, originalConfig) {
    // If already refreshing, queue the request
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ 
          resolve, 
          reject, 
          url: originalUrl, 
          config: originalConfig 
        });
      });
    }

    this.isRefreshing = true;

    try {
      console.log('Access token expired, attempting to refresh...');
      
      // Get refresh token and call refresh endpoint
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const refreshResponse = await fetch('/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (refreshResponse.ok) {
        const result = await refreshResponse.json();
        const newAccessToken = result.data.accessToken;
        
        // Store new access token
        this.setAccessToken(newAccessToken);
        console.log('Token refreshed successfully');

        // Process queued requests with new token
        this.processQueue(null, newAccessToken);
        
        // Retry original request with new token
        const newConfig = {
          ...originalConfig,
          headers: {
            ...originalConfig.headers,
            'Authorization': `Bearer ${newAccessToken}`
          }
        };
        
        return fetch(originalUrl, newConfig);
      } else {
        // Refresh failed - redirect to login
        console.error('Token refresh failed:', refreshResponse.status);
        this.processQueue(new Error('Token refresh failed'));
        this.redirectToLogin();
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      this.processQueue(error);
      this.redirectToLogin();
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Process queued requests after token refresh
   */
  processQueue(error, newToken = null) {
    this.failedQueue.forEach(({ resolve, reject, url, config }) => {
      if (error) {
        reject(error);
      } else {
        // Update config with new token and retry
        const updatedConfig = {
          ...config,
          headers: {
            ...config.headers,
            'Authorization': `Bearer ${newToken}`
          }
        };
        resolve(fetch(url, updatedConfig));
      }
    });
    
    this.failedQueue = [];
  }

  /**
   * Redirect to login page
   */
  redirectToLogin() {
    // Clear tokens
    this.clearTokens();
    
    // Redirect based on current path
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/admin')) {
      window.location.href = '/admin/auth';
    } else {
      window.location.href = '/auth/login';
    }
  }

  /**
   * GET request helper
   */
  async get(url, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    return this.request(fullUrl, { method: 'GET' });
  }

  /**
   * POST request helper
   */
  async post(url, data = {}) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request helper
   */
  async put(url, data = {}) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request helper
   */
  async delete(url) {
    return this.request(url, { method: 'DELETE' });
  }

  // Token management methods
  getAccessToken() {
    // Only use cookies for token storage
    return this.getCookie('access_token');
  }

  setAccessToken(token) {
    // Store access token in cookie (will be set by backend in real scenario)
    // This is mainly for temporary storage during refresh
    document.cookie = `access_token=${token}; path=/; secure; samesite=strict`;
  }

  getRefreshToken() {
    // Refresh tokens should be stored in httpOnly cookies by backend
    return this.getCookie('refresh_token');
  }

  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  }

  clearTokens() {
    // Clear cookies only
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  }
}

// Create singleton instance
const apiClient = new ApiClient();

// Make it globally available
window.ApiClient = apiClient;

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = apiClient;
}