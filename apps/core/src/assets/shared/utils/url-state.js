/**
 * URL State Manager Utility
 * Manages query string parameters for maintaining UI state across page refreshes
 */

class URLStateManager {
    /**
     * Get query parameter value
     * @param {string} key - Parameter key
     * @param {string} defaultValue - Default value if parameter doesn't exist
     * @returns {string} Parameter value
     */
    static getParam(key, defaultValue = null) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(key) || defaultValue;
    }
    
    /**
     * Set query parameter value
     * @param {string} key - Parameter key
     * @param {string} value - Parameter value
     * @param {boolean} replace - Whether to replace current history entry (default: true)
     */
    static setParam(key, value, replace = true) {
        const url = new URL(window.location);
        const params = new URLSearchParams(url.search);
        
        if (value === null || value === undefined || value === '') {
            params.delete(key);
        } else {
            params.set(key, value);
        }
        
        url.search = params.toString();
        
        if (replace) {
            window.history.replaceState({}, '', url.toString());
        } else {
            window.history.pushState({}, '', url.toString());
        }
    }
    
    /**
     * Remove query parameter
     * @param {string} key - Parameter key
     * @param {boolean} replace - Whether to replace current history entry (default: true)
     */
    static removeParam(key, replace = true) {
        this.setParam(key, null, replace);
    }
    
    /**
     * Get multiple parameters as object
     * @param {string[]} keys - Array of parameter keys
     * @returns {Object} Object with key-value pairs
     */
    static getParams(keys) {
        const result = {};
        const urlParams = new URLSearchParams(window.location.search);
        
        keys.forEach(key => {
            result[key] = urlParams.get(key);
        });
        
        return result;
    }
    
    /**
     * Set multiple parameters at once
     * @param {Object} params - Object with key-value pairs
     * @param {boolean} replace - Whether to replace current history entry (default: true)
     */
    static setParams(params, replace = true) {
        const url = new URL(window.location);
        const urlParams = new URLSearchParams(url.search);
        
        Object.entries(params).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                urlParams.delete(key);
            } else {
                urlParams.set(key, value);
            }
        });
        
        url.search = urlParams.toString();
        
        if (replace) {
            window.history.replaceState({}, '', url.toString());
        } else {
            window.history.pushState({}, '', url.toString());
        }
    }
    
    /**
     * Clear all query parameters
     * @param {boolean} replace - Whether to replace current history entry (default: true)
     */
    static clearParams(replace = true) {
        const url = new URL(window.location);
        url.search = '';
        
        if (replace) {
            window.history.replaceState({}, '', url.toString());
        } else {
            window.history.pushState({}, '', url.toString());
        }
    }
    
    /**
     * Listen for popstate events (back/forward browser navigation)
     * @param {Function} callback - Callback function to execute on state change
     */
    static onStateChange(callback) {
        window.addEventListener('popstate', () => {
            if (typeof callback === 'function') {
                callback();
            }
        });
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = URLStateManager;
} else {
    window.URLStateManager = URLStateManager;
}