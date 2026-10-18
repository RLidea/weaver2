/**
 * Centralized API Client with automatic token refresh
 * Handles JWT access token renewal automatically on 401 errors
 */
class ApiClient {
  constructor() {
    this.isRefreshing = false;
    this.failedQueue = [];
    this.csrfToken = null;
  }

  /**
   * CSRF token (double-submit). The backend checks x-csrf-token on every non-GET request.
   * The token is bound to the refresh_token cookie, so it goes stale whenever that cookie
   * changes (sign-in, 2FA, refresh) — drop the cache then, and retry once on a 403.
   */
  async ensureCsrfToken() {
    if (this.csrfToken) return this.csrfToken;
    const response = await fetch('/v1/auth/csrf-token', {
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    const result = await response.json();
    this.csrfToken = result.data.csrfToken;
    return this.csrfToken;
  }

  /**
   * Send one request with cookies and, for non-GET methods, the CSRF header.
   * A stale token gets one fresh retry.
   */
  async send(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method);

    const buildConfig = async () => ({
      ...options,
      credentials: 'include', // Important: include cookies in requests
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(needsCsrf ? { 'x-csrf-token': await this.ensureCsrfToken() } : {}),
        ...options.headers
      }
    });

    const response = await fetch(url, await buildConfig());
    if (needsCsrf && response.status === 403) {
      const body = await response.clone().json().catch(() => null);
      if (body && body.message === 'Invalid CSRF token') {
        this.csrfToken = null;
        return fetch(url, await buildConfig());
      }
    }
    return response;
  }

  /**
   * Main request method that handles all API calls
   */
  async request(url, options = {}) {
    try {
      const response = await this.send(url, options);

      // Handle 401 Unauthorized - token might be expired
      // Skip token refresh for login/auth endpoints. The 2FA step runs on a pre_auth cookie
      // with no session — a 401 there is a wrong code or an expired step, not an old token.
      const isAuthEndpoint = url.includes('/auth/sign-in') || url.includes('/auth/sign-up') || url.includes('/auth/refresh')
        || url.includes('/auth/2fa/pending') || url.includes('/auth/2fa/authenticate') || url.includes('/auth/2fa/email/send');
      if (response.status === 401 && !this.isRefreshing && !isAuthEndpoint) {
        return this.handleTokenRefresh(url, options);
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
  async handleTokenRefresh(originalUrl, originalOptions) {
    // If already refreshing, queue the request
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ 
          resolve, 
          reject, 
          url: originalUrl, 
          options: originalOptions 
        });
      });
    }

    this.isRefreshing = true;

    try {
      console.log('Access token expired, attempting to refresh...');
      
      // With HttpOnly cookies, browser automatically sends refresh token
      console.log('Calling refresh endpoint with HttpOnly cookies...');
      const refreshResponse = await this.send('/v1/auth/refresh', { method: 'POST' });

      console.log('Refresh response status:', refreshResponse.status);
      
      if (refreshResponse.ok) {
        // The refresh_token cookie rotated — the cached CSRF token is bound to the old one
        this.csrfToken = null;
        console.log('Token refreshed successfully - new HttpOnly cookies set by backend');

        // Process queued requests (no token needed, cookies are automatic)
        this.processQueue(null);
        
        // Retry original request (cookies will be included automatically)
        return this.send(originalUrl, originalOptions);
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
    this.failedQueue.forEach(({ resolve, reject, url, options }) => {
      if (error) {
        reject(error);
      } else {
        // Retry request with HttpOnly cookies (no manual token needed)
        resolve(this.send(url, options));
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
      window.location.href = '/admin/login';
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