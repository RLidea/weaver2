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
    // Use cookies for authentication (HttpOnly cookies)
    const config = {
      ...options,
      credentials: 'include', // Important: include cookies in requests
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
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
      
      // With HttpOnly cookies, browser automatically sends refresh token
      console.log('Calling refresh endpoint with HttpOnly cookies...');
      const refreshResponse = await fetch('/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Include HttpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Refresh response status:', refreshResponse.status);
      
      if (refreshResponse.ok) {
        const result = await refreshResponse.json();
        console.log('Refresh response data:', result);
        console.log('Token refreshed successfully - new HttpOnly cookies set by backend');

        // Process queued requests (no token needed, cookies are automatic)
        this.processQueue(null);
        
        // Retry original request (cookies will be included automatically)
        return fetch(originalUrl, originalConfig);
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
  processQueue(error) {
    this.failedQueue.forEach(({ resolve, reject, url, config }) => {
      if (error) {
        reject(error);
      } else {
        // Retry request with HttpOnly cookies (no manual token needed)
        resolve(fetch(url, config));
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

  // Token management methods (HttpOnly cookies)
  getAccessToken() {
    // HttpOnly cookies cannot be accessed via JavaScript
    // Return null since we rely on browser sending cookies automatically
    return null;
  }

  setAccessToken(token) {
    // HttpOnly cookies are set by backend, not JavaScript
    // This method is not needed with HttpOnly cookies
    console.log('Cannot set HttpOnly cookie from JavaScript');
  }

  getRefreshToken() {
    // HttpOnly cookies cannot be accessed via JavaScript
    // Return null since we rely on browser sending cookies automatically
    return null;
  }

  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop().split(';').shift();
      console.log(`Cookie ${name}:`, cookieValue ? `Found (${cookieValue.length} chars)` : 'Not found');
      return cookieValue;
    }
    console.log(`Cookie ${name}: Not found`);
    return null;
  }

  // Debug function to check current token state
  debugTokenState() {
    console.log('=== Token Debug Info (HttpOnly Mode) ===');
    console.log('Visible cookies:', document.cookie || 'None visible');
    console.log('Note: HttpOnly cookies (access_token, refresh_token) are not visible to JavaScript');
    console.log('Check Application/Storage tab in DevTools for actual cookies');
    console.log('=======================================');
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