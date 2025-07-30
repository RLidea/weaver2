// Wait for ApiClient to be available
function waitForApiClient() {
    return new Promise((resolve) => {
        if (typeof window.ApiClient !== 'undefined') {
            resolve();
        } else {
            console.log('ApiClient not ready, waiting...');
            const checkInterval = setInterval(() => {
                if (typeof window.ApiClient !== 'undefined') {
                    console.log('ApiClient is now available');
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
        }
    });
}

// Global variables
let systemSettingsTabComponent = null;
let currentSystemSettings = null;

// System Settings management specific JavaScript
class SystemSettingsManagement {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadSystemSettings();
    }

    async loadSystemSettings() {
        try {
            await waitForApiClient();
            console.log('Attempting to load system settings from /v1/admin/system-settings');
            const response = await window.ApiClient.get('/v1/admin/system-settings');
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                console.error('HTTP Error:', response.status, response.statusText);
                alert(`HTTP Error ${response.status}: ${response.statusText}`);
                return;
            }
            
            const responseData = await response.json();
            console.log('Response data:', responseData);
            
            // Extract data from wrapped response
            if (responseData && responseData.data) {
                currentSystemSettings = responseData.data;
                console.log('Extracted system settings from response.data:', currentSystemSettings);
            } else {
                // Fallback for direct response
                currentSystemSettings = responseData;
                console.log('Using direct response as system settings:', currentSystemSettings);
            }
            console.log('System settings loaded successfully:', currentSystemSettings);
            
            // Refresh the current tab to show loaded data
            if (systemSettingsTabComponent) {
                const activeTab = systemSettingsTabComponent.getActiveTab();
                console.log('System settings loaded, now loading tab data for:', activeTab);
                loadTabData(activeTab);
            }
        } catch (error) {
            console.error('Error loading system settings:', error);
            alert('Error loading system settings: ' + error.message);
        }
    }

    async handleSiteInfoSubmit(event) {
        event.preventDefault();
        
        try {
            await waitForApiClient();
            
            const formData = new FormData(event.target);
            const data = {
                siteName: formData.get('siteName'),
                siteDescription: formData.get('siteDescription'),
                logoUrl: formData.get('logoUrl') || null
            };
            
            const response = await window.ApiClient.put('/v1/admin/system-settings', data);
            const responseData = await response.json();
            
            alert('Site information updated successfully!');
            
            // Extract data from wrapped response
            if (responseData && responseData.data) {
                currentSystemSettings = responseData.data;
                console.log('Updated system settings from response.data:', currentSystemSettings);
            } else {
                currentSystemSettings = responseData;
                console.log('Updated system settings from direct response:', currentSystemSettings);
            }
            
            // Update page title with new site name if available
            if (typeof updatePageTitle === 'function') {
                updatePageTitle('System Settings');
            }
            
            // Refresh current tab to show updated data
            const activeTab = systemSettingsTabComponent.getActiveTab();
            loadTabData(activeTab);
        } catch (error) {
            console.error('Error updating site information:', error);
            alert('Error updating site information');
        }
    }

    async handleFeatureTogglesSubmit(event) {
        event.preventDefault();
        
        try {
            await waitForApiClient();
            
            const formData = new FormData(event.target);
            const data = {
                isRegistrationOpen: formData.has('isRegistrationOpen')
            };
            
            const response = await window.ApiClient.put('/v1/admin/system-settings', data);
            const responseData = await response.json();
            
            alert('Feature settings updated successfully!');
            
            // Extract data from wrapped response
            if (responseData && responseData.data) {
                currentSystemSettings = responseData.data;
                console.log('Updated feature settings from response.data:', currentSystemSettings);
            } else {
                currentSystemSettings = responseData;
                console.log('Updated feature settings from direct response:', currentSystemSettings);
            }
            // Refresh current tab to show updated data
            const activeTab = systemSettingsTabComponent.getActiveTab();
            loadTabData(activeTab);
        } catch (error) {
            console.error('Error updating feature settings:', error);
            alert('Error updating feature settings');
        }
    }

    async handleAnnouncementSubmit(event) {
        event.preventDefault();
        
        try {
            await waitForApiClient();
            
            const formData = new FormData(event.target);
            const data = {
                isAnnouncementActive: formData.has('isAnnouncementActive'),
                announcementMessage: formData.get('announcementMessage') || null,
                announcementType: formData.get('announcementType') || 'info'
            };
            
            const response = await window.ApiClient.put('/v1/admin/system-settings', data);
            const responseData = await response.json();
            
            alert('Announcement settings updated successfully!');
            
            // Extract data from wrapped response
            if (responseData && responseData.data) {
                currentSystemSettings = responseData.data;
                console.log('Updated announcement settings from response.data:', currentSystemSettings);
            } else {
                currentSystemSettings = responseData;
                console.log('Updated announcement settings from direct response:', currentSystemSettings);
            }
            // Refresh current tab to show updated data
            const activeTab = systemSettingsTabComponent.getActiveTab();
            loadTabData(activeTab);
        } catch (error) {
            console.error('Error updating announcement settings:', error);
            alert('Error updating announcement settings');
        }
    }

    async handleResetSettings() {
        if (!confirm('Are you sure you want to reset all system settings to default values? This action cannot be undone.')) {
            return;
        }
        
        try {
            await waitForApiClient();
            
            const response = await window.ApiClient.post('/v1/admin/system-settings/reset');
            const responseData = await response.json();
            
            alert('System settings reset to defaults successfully!');
            
            // Extract data from wrapped response
            if (responseData && responseData.data) {
                currentSystemSettings = responseData.data;
                console.log('Reset system settings from response.data:', currentSystemSettings);
            } else {
                currentSystemSettings = responseData;
                console.log('Reset system settings from direct response:', currentSystemSettings);
            }
            // Reload the current tab to show updated data
            const activeTab = systemSettingsTabComponent.getActiveTab();
            loadTabData(activeTab);
        } catch (error) {
            console.error('Error resetting system settings:', error);
            alert('Error resetting system settings');
        }
    }
}

// Load data for specific tab
async function loadTabData(tabId) {
    try {
        switch (tabId) {
            case 'language-settings':
                await setupLanguageSettingsTab();
                break;
            case 'site-info':
                setupSiteInfoTab();
                break;
            case 'features':
                setupFeaturesTab();
                break;
            case 'announcements':
                setupAnnouncementsTab();
                break;
            case 'system-actions':
                setupSystemActionsTab();
                break;
            default:
                console.warn(`Unknown tab: ${tabId}`);
        }
    } catch (error) {
        console.error(`Failed to load ${tabId} data:`, error);
        alert(`Failed to load ${tabId} data. Please try again.`);
    }
}

// Language Settings Tab Setup
async function setupLanguageSettingsTab() {
    console.log('Setting up language settings tab');
    
    // Wait for LanguageSettingsManager to be available
    if (typeof window.LanguageSettingsManager === 'undefined') {
        console.error('LanguageSettingsManager not available');
        return;
    }
    
    // Create language settings manager instance
    const languageManager = new window.LanguageSettingsManager();
    
    // Get the tab content container
    const tabContent = document.getElementById('language-settings-tab');
    if (!tabContent) {
        console.error('Language settings tab content container not found');
        return;
    }
    
    // Populate the content
    tabContent.innerHTML = languageManager.createLanguageSettingsContent();
    
    // Setup event listeners
    languageManager.setupLanguageSettingsEvents();
    
    console.log('Language settings tab setup completed');
}

function setupSiteInfoTab() {
    console.log('setupSiteInfoTab called with currentSystemSettings:', currentSystemSettings);
    
    const siteNameInput = document.getElementById('site-name');
    const siteDescriptionInput = document.getElementById('site-description');
    const logoUrlInput = document.getElementById('logo-url');
    
    console.log('Found DOM elements:', {
        siteNameInput: !!siteNameInput,
        siteDescriptionInput: !!siteDescriptionInput,
        logoUrlInput: !!logoUrlInput
    });
    
    if (currentSystemSettings) {
        console.log('Populating form with system settings data:', {
            siteName: currentSystemSettings.siteName,
            siteDescription: currentSystemSettings.siteDescription,
            logoUrl: currentSystemSettings.logoUrl
        });
        
        if (siteNameInput) {
            siteNameInput.value = currentSystemSettings.siteName || '';
            console.log('Set siteName input to:', siteNameInput.value);
        }
        if (siteDescriptionInput) {
            siteDescriptionInput.value = currentSystemSettings.siteDescription || '';
            console.log('Set siteDescription input to:', siteDescriptionInput.value);
        }
        if (logoUrlInput) {
            logoUrlInput.value = currentSystemSettings.logoUrl || '';
            console.log('Set logoUrl input to:', logoUrlInput.value);
        }
    } else {
        console.log('System settings not loaded yet, showing empty form');
        // Set empty values for form fields
        if (siteNameInput) siteNameInput.value = '';
        if (siteDescriptionInput) siteDescriptionInput.value = '';
        if (logoUrlInput) logoUrlInput.value = '';
    }

    const form = document.getElementById('site-info-form');
    if (form && !form.hasAttribute('data-listener-attached')) {
        form.addEventListener('submit', (e) => window.systemSettingsManagement.handleSiteInfoSubmit(e));
        form.setAttribute('data-listener-attached', 'true');
    }
}

function setupFeaturesTab() {
    const registrationToggle = document.getElementById('registration-toggle');
    
    if (currentSystemSettings) {
        if (registrationToggle) registrationToggle.checked = currentSystemSettings.isRegistrationOpen || false;
    } else {
        console.log('System settings not loaded yet, showing default feature toggles');
        // Set default values
        if (registrationToggle) registrationToggle.checked = true; // Default to open
    }

    const form = document.getElementById('feature-toggles-form');
    if (form && !form.hasAttribute('data-listener-attached')) {
        form.addEventListener('submit', (e) => window.systemSettingsManagement.handleFeatureTogglesSubmit(e));
        form.setAttribute('data-listener-attached', 'true');
    }
}

function setupAnnouncementsTab() {
    const announcementToggle = document.getElementById('announcement-toggle');
    const announcementMessage = document.getElementById('announcement-message');
    const announcementType = document.getElementById('announcement-type');
    
    if (currentSystemSettings) {
        if (announcementToggle) announcementToggle.checked = currentSystemSettings.isAnnouncementActive || false;
        if (announcementMessage) announcementMessage.value = currentSystemSettings.announcementMessage || '';
        if (announcementType) announcementType.value = currentSystemSettings.announcementType || 'info';
    } else {
        console.log('System settings not loaded yet, showing default announcement settings');
        // Set default values
        if (announcementToggle) announcementToggle.checked = false;
        if (announcementMessage) announcementMessage.value = '';
        if (announcementType) announcementType.value = 'info';
    }

    const form = document.getElementById('announcement-form');
    if (form && !form.hasAttribute('data-listener-attached')) {
        form.addEventListener('submit', (e) => window.systemSettingsManagement.handleAnnouncementSubmit(e));
        form.setAttribute('data-listener-attached', 'true');
    }
}

function setupSystemActionsTab() {
    const resetButton = document.getElementById('reset-settings-btn');
    if (resetButton && !resetButton.hasAttribute('data-listener-attached')) {
        resetButton.addEventListener('click', () => window.systemSettingsManagement.handleResetSettings());
        resetButton.setAttribute('data-listener-attached', 'true');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Define tabs
    const tabs = [
        {
            id: 'site-info',
            label: 'Site Information',
            icon: 'fas fa-info-circle',
            content: `
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon icon icon-md">
                            <i class="fas fa-info-circle"></i>
                        </div>
                        <div>
                            <div class="card-title text-primary">Site Information</div>
                            <div class="card-description text-secondary">Basic site details and branding</div>
                        </div>
                    </div>
                    <div class="card-content">
                        <form id="site-info-form">
                            <div class="form-group">
                                <label for="site-name">Site Name</label>
                                <input type="text" id="site-name" name="siteName" class="form-control" placeholder="Enter site name">
                            </div>
                            <div class="form-group">
                                <label for="site-description">Site Description</label>
                                <textarea id="site-description" name="siteDescription" class="form-control" rows="3" placeholder="Enter site description"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="logo-url">Logo URL</label>
                                <input type="url" id="logo-url" name="logoUrl" class="form-control" placeholder="Enter logo URL">
                            </div>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Save Site Information
                            </button>
                        </form>
                    </div>
                </div>
            `
        },
        {
            id: 'language-settings',
            label: 'Language Settings',
            icon: 'fas fa-language',
            content: `
                <div class="loading-container">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading language settings...</p>
                </div>
            `
        },
        {
            id: 'features',
            label: 'Feature Toggles',
            icon: 'fas fa-toggle-on',
            content: `
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon icon icon-md">
                            <i class="fas fa-toggle-on"></i>
                        </div>
                        <div>
                            <div class="card-title text-primary">Feature Toggles</div>
                            <div class="card-description text-secondary">Control site features and access</div>
                        </div>
                    </div>
                    <div class="card-content">
                        <form id="feature-toggles-form">
                            <div class="form-group">
                                <div class="form-check">
                                    <input type="checkbox" id="registration-toggle" name="isRegistrationOpen" class="form-check-input">
                                    <label class="form-check-label" for="registration-toggle">Allow User Registration</label>
                                </div>
                                <small class="text-secondary">When disabled, new users cannot register accounts</small>
                            </div>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Save Feature Settings
                            </button>
                        </form>
                    </div>
                </div>
            `
        },
        {
            id: 'announcements',
            label: 'Announcements',
            icon: 'fas fa-bullhorn',
            content: `
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon icon icon-md">
                            <i class="fas fa-bullhorn"></i>
                        </div>
                        <div>
                            <div class="card-title text-primary">Announcement Banner</div>
                            <div class="card-description text-secondary">Site-wide announcement message</div>
                        </div>
                    </div>
                    <div class="card-content">
                        <form id="announcement-form">
                            <div class="form-group">
                                <div class="form-check">
                                    <input type="checkbox" id="announcement-toggle" name="isAnnouncementActive" class="form-check-input">
                                    <label class="form-check-label" for="announcement-toggle">Show Announcement Banner</label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="announcement-message">Announcement Message</label>
                                <textarea id="announcement-message" name="announcementMessage" class="form-control" rows="2" placeholder="Enter announcement message"></textarea>
                            </div>
                            <div class="form-group">
                                <label for="announcement-type">Announcement Type</label>
                                <select id="announcement-type" name="announcementType" class="form-control">
                                    <option value="info">Info (Blue)</option>
                                    <option value="warning">Warning (Yellow)</option>
                                    <option value="success">Success (Green)</option>
                                    <option value="error">Error (Red)</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Save Announcement
                            </button>
                        </form>
                    </div>
                </div>
            `
        },
        {
            id: 'system-actions',
            label: 'System Actions',
            icon: 'fas fa-tools',
            content: `
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon icon icon-md">
                            <i class="fas fa-tools"></i>
                        </div>
                        <div>
                            <div class="card-title text-primary">System Actions</div>
                            <div class="card-description text-secondary">System management actions</div>
                        </div>
                    </div>
                    <div class="card-content">
                        <button type="button" id="reset-settings-btn" class="btn btn-warning">
                            <i class="fas fa-undo"></i> Reset to Defaults
                        </button>
                        <small class="text-secondary d-block mt-2">This will reset all system settings to their default values</small>
                    </div>
                </div>
            `
        }
    ];
    
    // Create tab component
    systemSettingsTabComponent = TabComponent.create('system-settings-tabs-container', tabs, {
        activeTab: 'site-info',
        onTabChange: (tabId) => {
            console.log('System settings tab changed to:', tabId);
            loadTabData(tabId);
        },
        urlStateKey: 'tab',
        urlStateEnabled: true
    });
    
    // Initialize system settings management after tab component is created
    window.systemSettingsManagement = new SystemSettingsManagement();
    
    // Load system settings first, then load initial tab data
    console.log('Tab component created, now initializing system settings');
    // Initial tab will be loaded after system settings are fetched
});