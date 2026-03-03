/**
 * Shared Tab Component
 * Provides a reusable tab functionality for admin pages
 */

class TabComponent {
    constructor(options = {}) {
        this.container = options.container;
        this.tabs = options.tabs || [];
        this.onTabChange = options.onTabChange || null;
        this.urlStateKey = options.urlStateKey || null; // Key for URL state management
        this.urlStateEnabled = options.urlStateEnabled !== false; // Default to true
        
        // Initialize active tab with URL state if enabled
        this.activeTab = this.getInitialActiveTab(options.activeTab);
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            console.error('Tab container is required');
            return;
        }
        
        this.render();
        this.bindEvents();
        this.setupUrlStateListener();
    }
    
    /**
     * Get initial active tab considering URL state
     */
    getInitialActiveTab(defaultTab) {
        if (this.urlStateEnabled && this.urlStateKey && typeof URLStateManager !== 'undefined') {
            const urlTab = URLStateManager.getParam(this.urlStateKey);
            if (urlTab && this.tabs.some(tab => tab.id === urlTab)) {
                return urlTab;
            }
        }
        
        return defaultTab || (this.tabs.length > 0 ? this.tabs[0].id : null);
    }
    
    /**
     * Update URL state when tab changes
     */
    updateUrlState(tabId) {
        if (this.urlStateEnabled && this.urlStateKey && typeof URLStateManager !== 'undefined') {
            URLStateManager.setParam(this.urlStateKey, tabId);
        }
    }
    
    /**
     * Setup listener for browser back/forward navigation
     */
    setupUrlStateListener() {
        if (this.urlStateEnabled && this.urlStateKey && typeof URLStateManager !== 'undefined') {
            URLStateManager.onStateChange(() => {
                const urlTab = URLStateManager.getParam(this.urlStateKey);
                if (urlTab && urlTab !== this.activeTab && this.tabs.some(tab => tab.id === urlTab)) {
                    this.switchTab(urlTab, false); // Don't update URL again
                }
            });
        }
    }
    
    render() {
        const tabNavigationHTML = this.tabs.map(tab => `
            <button class="tab-button ${tab.id === this.activeTab ? 'active' : ''}" 
                    data-tab="${tab.id}">
                ${tab.icon ? `<i class="${tab.icon}"></i>` : ''}
                <span>${tab.label}</span>
            </button>
        `).join('');
        
        const tabContentsHTML = this.tabs.map(tab => `
            <div class="tab-content ${tab.id === this.activeTab ? 'active' : ''}" 
                 id="${tab.id}-tab">
                ${tab.content || ''}
            </div>
        `).join('');
        
        this.container.innerHTML = `
            <div class="tab-container">
                <div class="tab-navigation">
                    ${tabNavigationHTML}
                </div>
                ${tabContentsHTML}
            </div>
        `;
    }
    
    bindEvents() {
        const tabButtons = this.container.querySelectorAll('.tab-button');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
    }
    
    switchTab(tabId, updateUrl = true) {
        // Remove active class from all buttons and contents
        const allButtons = this.container.querySelectorAll('.tab-button');
        const allContents = this.container.querySelectorAll('.tab-content');
        
        allButtons.forEach(btn => btn.classList.remove('active'));
        allContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to selected button and content
        const activeButton = this.container.querySelector(`[data-tab="${tabId}"]`);
        const activeContent = this.container.querySelector(`#${tabId}-tab`);
        
        if (activeButton) activeButton.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
        
        // Update active tab
        this.activeTab = tabId;
        
        // Update URL state if enabled and requested
        if (updateUrl) {
            this.updateUrlState(tabId);
        }
        
        // Call callback if provided
        if (this.onTabChange && typeof this.onTabChange === 'function') {
            this.onTabChange(tabId);
        }
    }
    
    // Public methods
    getActiveTab() {
        return this.activeTab;
    }
    
    setActiveTab(tabId) {
        this.switchTab(tabId);
    }
    
    updateTabContent(tabId, content) {
        const tabContent = this.container.querySelector(`#${tabId}-tab`);
        if (tabContent) {
            tabContent.innerHTML = content;
        }
    }
    
    addTab(tab) {
        this.tabs.push(tab);
        this.render();
        this.bindEvents();
    }
    
    removeTab(tabId) {
        this.tabs = this.tabs.filter(tab => tab.id !== tabId);
        if (this.activeTab === tabId && this.tabs.length > 0) {
            this.activeTab = this.tabs[0].id;
        }
        this.render();
        this.bindEvents();
    }
    
    // Static method to create tabs easily
    static create(containerId, tabs, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with id '${containerId}' not found`);
            return null;
        }
        
        return new TabComponent({
            container,
            tabs,
            ...options
        });
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TabComponent;
} else {
    window.TabComponent = TabComponent;
}