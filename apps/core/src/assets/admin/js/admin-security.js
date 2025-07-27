/**
 * Admin Security Page JavaScript
 * Manages security settings, policies, access control, audit logs, and system status
 */

let securityTabComponent;

// Security tab configuration
const securityTabs = [
    {
        id: 'policies',
        label: 'Security Policies',
        icon: 'fas fa-shield-alt',
        content: ''
    },
    {
        id: 'access-control',
        label: 'Access Control',
        icon: 'fas fa-key',
        content: ''
    },
    {
        id: 'audit-logs',
        label: 'Audit Logs',
        icon: 'fas fa-history',
        content: ''
    },
    {
        id: 'system-status',
        label: 'System Status',
        icon: 'fas fa-heartbeat',
        content: ''
    }
];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeSecurityTabs();
});

/**
 * Initialize security tabs component
 */
function initializeSecurityTabs() {
    securityTabComponent = TabComponent.create('security-tabs-container', securityTabs, {
        activeTab: 'policies',
        onTabChange: handleTabChange
    });
    
    // Load initial tab content
    loadTabContent('policies');
    
    // Add event listeners for security buttons
    setupEventListeners();
}

/**
 * Setup event listeners for security page
 */
function setupEventListeners() {
    // Use event delegation for dynamically created elements
    document.addEventListener('click', function(event) {
        const target = event.target;
        
        // Refresh status button
        if (target.id === 'refresh-status-btn' || target.closest('#refresh-status-btn')) {
            refreshSystemStatus();
        }
        
        // Run scan button
        if (target.id === 'run-scan-btn' || target.closest('#run-scan-btn')) {
            runSecurityScan(event);
        }
        
        // History toggle button
        if (target.id === 'history-toggle-btn' || target.closest('#history-toggle-btn')) {
            toggleAuditHistory();
        }
        
        // History report selection
        if (target.classList.contains('history-report-item')) {
            const reportId = target.dataset.reportId;
            loadAuditReport(reportId);
        }
        
        // Retry status button
        if (target.id === 'retry-status-btn' || target.closest('#retry-status-btn')) {
            loadSystemStatusData();
        }
        
        // Fix vulnerability button
        if (target.classList.contains('fix-vuln-btn')) {
            const vulnId = target.dataset.id;
            const recommendation = target.dataset.recommendation;
            showFixRecommendation(vulnId, recommendation);
        }
        
        // Handle recommendation button
        if (target.classList.contains('handle-rec-btn')) {
            const recId = target.dataset.id;
            handleRecommendation(recId);
        }
        
        // Copy recommendation button
        if (target.classList.contains('copy-rec-btn')) {
            const text = target.dataset.text.replace(/&quot;/g, '"');
            copyToClipboard(text);
            showNotification('Recommendation copied to clipboard', 'success');
        }
        
        // Close modal buttons
        if (target.dataset.action === 'close-modal') {
            const modal = target.closest('.fix-recommendation-modal');
            if (modal) modal.remove();
        }
    });
}

/**
 * Load System Status data when tab is activated
 */
function loadSystemStatusTab() {
    // Load system status data when the tab is first activated
    setTimeout(() => {
        if (securityTabComponent && securityTabComponent.getActiveTab() === 'system-status') {
            loadSystemStatusData();
        }
    }, 100);
}

/**
 * Handle tab change events
 * @param {string} tabId - The ID of the selected tab
 */
function handleTabChange(tabId) {
    loadTabContent(tabId);
    
    // Load API data for system-status tab
    if (tabId === 'system-status') {
        setTimeout(() => {
            loadSystemStatusData();
        }, 100);
    }
}

/**
 * Load content for specific tab
 * @param {string} tabId - The ID of the tab to load content for
 */
function loadTabContent(tabId) {
    let content = '';
    
    switch(tabId) {
        case 'policies':
            content = generatePoliciesContent();
            break;
        case 'access-control':
            content = generateAccessControlContent();
            break;
        case 'audit-logs':
            content = generateAuditLogsContent();
            break;
        case 'system-status':
            content = generateSystemStatusContent();
            break;
        default:
            content = '<div class="alert alert-warning">Tab content not found</div>';
    }
    
    securityTabComponent.updateTabContent(tabId, content);
}

/**
 * Generate Security Policies tab content
 */
function generatePoliciesContent() {
    return `
        <div class="security-section">
            <div class="section-header">
                <h3><i class="fas fa-shield-alt"></i> Security Policies & Settings</h3>
                <p class="text-secondary">Configure system-wide security policies and requirements</p>
            </div>
            
            <div class="policy-grid">
                <div class="policy-card card">
                    <div class="card-header">
                        <h4><i class="fas fa-lock"></i> Password Policy</h4>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Minimum Length</label>
                            <input type="number" class="form-control" value="8" min="6" max="50">
                        </div>
                        <div class="form-group">
                            <label>Password Complexity</label>
                            <div class="checkbox-group">
                                <label><input type="checkbox" checked> Require uppercase letters</label>
                                <label><input type="checkbox" checked> Require lowercase letters</label>
                                <label><input type="checkbox" checked> Require numbers</label>
                                <label><input type="checkbox"> Require special characters</label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Password Expiration (days)</label>
                            <input type="number" class="form-control" value="90" min="0" max="365">
                        </div>
                        <button class="btn btn-primary">Save Password Policy</button>
                    </div>
                </div>
                
                <div class="policy-card card">
                    <div class="card-header">
                        <h4><i class="fas fa-user-shield"></i> Account Lockout Policy</h4>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Failed Login Attempts</label>
                            <input type="number" class="form-control" value="5" min="3" max="10">
                        </div>
                        <div class="form-group">
                            <label>Lockout Duration (minutes)</label>
                            <input type="number" class="form-control" value="30" min="5" max="1440">
                        </div>
                        <div class="form-group">
                            <label>Reset Counter After (minutes)</label>
                            <input type="number" class="form-control" value="15" min="5" max="60">
                        </div>
                        <button class="btn btn-primary">Save Lockout Policy</button>
                    </div>
                </div>
                
                <div class="policy-card card">
                    <div class="card-header">
                        <h4><i class="fas fa-clock"></i> Session Policy</h4>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Session Timeout (minutes)</label>
                            <input type="number" class="form-control" value="60" min="15" max="480">
                        </div>
                        <div class="form-group">
                            <label>Max Concurrent Sessions</label>
                            <input type="number" class="form-control" value="3" min="1" max="10">
                        </div>
                        <div class="form-group">
                            <label><input type="checkbox" checked> Force logout on password change</label>
                        </div>
                        <button class="btn btn-primary">Save Session Policy</button>
                    </div>
                </div>
                
                <div class="policy-card card">
                    <div class="card-header">
                        <h4><i class="fas fa-mobile-alt"></i> Two-Factor Authentication</h4>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label><input type="checkbox"> Require 2FA for all admin users</label>
                        </div>
                        <div class="form-group">
                            <label><input type="checkbox"> Require 2FA for privileged operations</label>
                        </div>
                        <div class="form-group">
                            <label>2FA Methods</label>
                            <div class="checkbox-group">
                                <label><input type="checkbox" checked> SMS</label>
                                <label><input type="checkbox" checked> Email</label>
                                <label><input type="checkbox"> Authenticator App</label>
                            </div>
                        </div>
                        <button class="btn btn-primary">Save 2FA Policy</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate Access Control tab content
 */
function generateAccessControlContent() {
    return `
        <div class="security-section">
            <div class="section-header">
                <h3><i class="fas fa-key"></i> Access Control & Restrictions</h3>
                <p class="text-secondary">Manage IP restrictions, API limits, and access controls</p>
            </div>
            
            <div class="access-control-grid">
                <div class="control-card card">
                    <div class="card-header">
                        <h4><i class="fas fa-globe"></i> IP Access Control</h4>
                    </div>
                    <div class="card-body">
                        <div class="tabs-mini">
                            <button class="tab-mini active" data-target="whitelist">Whitelist</button>
                            <button class="tab-mini" data-target="blacklist">Blacklist</button>
                        </div>
                        <div class="tab-content-mini active" id="whitelist">
                            <div class="ip-list">
                                <div class="ip-item">
                                    <span>192.168.1.0/24</span>
                                    <button class="btn btn-sm btn-danger">Remove</button>
                                </div>
                                <div class="ip-item">
                                    <span>10.0.0.0/8</span>
                                    <button class="btn btn-sm btn-danger">Remove</button>
                                </div>
                            </div>
                            <div class="add-ip">
                                <input type="text" class="form-control" placeholder="Add IP or CIDR range">
                                <button class="btn btn-primary">Add</button>
                            </div>
                        </div>
                        <div class="tab-content-mini" id="blacklist">
                            <div class="ip-list">
                                <div class="ip-item">
                                    <span>192.168.100.50</span>
                                    <button class="btn btn-sm btn-danger">Remove</button>
                                </div>
                            </div>
                            <div class="add-ip">
                                <input type="text" class="form-control" placeholder="Add IP or CIDR range">
                                <button class="btn btn-primary">Add</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="control-card card">
                    <div class="card-header">
                        <h4><i class="fas fa-tachometer-alt"></i> API Rate Limiting</h4>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label>Requests per minute (per IP)</label>
                            <input type="number" class="form-control" value="100" min="1" max="1000">
                        </div>
                        <div class="form-group">
                            <label>Requests per hour (per user)</label>
                            <input type="number" class="form-control" value="1000" min="10" max="10000">
                        </div>
                        <div class="form-group">
                            <label>Burst limit</label>
                            <input type="number" class="form-control" value="200" min="10" max="500">
                        </div>
                        <button class="btn btn-primary">Save Rate Limits</button>
                    </div>
                </div>
                
                <div class="control-card card">
                    <div class="card-header">
                        <h4><i class="fas fa-users-cog"></i> Role-based Access</h4>
                    </div>
                    <div class="card-body">
                        <div class="role-list">
                            <div class="role-item">
                                <div class="role-info">
                                    <strong>Super Admin</strong>
                                    <span class="role-description">Full system access</span>
                                </div>
                                <span class="role-users">2 users</span>
                            </div>
                            <div class="role-item">
                                <div class="role-info">
                                    <strong>Admin</strong>
                                    <span class="role-description">Limited admin access</span>
                                </div>
                                <span class="role-users">5 users</span>
                            </div>
                            <div class="role-item">
                                <div class="role-info">
                                    <strong>Moderator</strong>
                                    <span class="role-description">Content moderation</span>
                                </div>
                                <span class="role-users">12 users</span>
                            </div>
                        </div>
                        <button class="btn btn-secondary">Manage Roles</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate Audit Logs tab content
 */
function generateAuditLogsContent() {
    return `
        <div class="security-section">
            <div class="section-header">
                <h3><i class="fas fa-history"></i> Audit Logs & Monitoring</h3>
                <p class="text-secondary">Review system activity and security events</p>
            </div>
            
            <div class="audit-controls">
                <div class="filter-controls">
                    <div class="filter-group">
                        <label>Event Type</label>
                        <select class="form-control">
                            <option value="">All Events</option>
                            <option value="login">Login/Logout</option>
                            <option value="admin">Admin Actions</option>
                            <option value="security">Security Events</option>
                            <option value="failed">Failed Attempts</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Date Range</label>
                        <input type="date" class="form-control" id="date-from">
                        <input type="date" class="form-control" id="date-to">
                    </div>
                    <div class="filter-group">
                        <label>User</label>
                        <input type="text" class="form-control" placeholder="Search user...">
                    </div>
                    <button class="btn btn-primary">Filter</button>
                    <button class="btn btn-secondary">Export</button>
                </div>
            </div>
            
            <div class="audit-logs-table">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Event Type</th>
                            <th>User</th>
                            <th>IP Address</th>
                            <th>Description</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>2024-01-15 14:30:25</td>
                            <td><span class="badge badge-success">Login</span></td>
                            <td>admin@example.com</td>
                            <td>192.168.1.100</td>
                            <td>Successful admin login</td>
                            <td><i class="fas fa-check-circle text-success"></i></td>
                        </tr>
                        <tr>
                            <td>2024-01-15 14:25:12</td>
                            <td><span class="badge badge-warning">Admin</span></td>
                            <td>admin@example.com</td>
                            <td>192.168.1.100</td>
                            <td>User role modified: user123</td>
                            <td><i class="fas fa-check-circle text-success"></i></td>
                        </tr>
                        <tr>
                            <td>2024-01-15 14:20:45</td>
                            <td><span class="badge badge-danger">Failed</span></td>
                            <td>unknown@example.com</td>
                            <td>203.0.113.45</td>
                            <td>Failed login attempt</td>
                            <td><i class="fas fa-times-circle text-danger"></i></td>
                        </tr>
                        <tr>
                            <td>2024-01-15 14:15:33</td>
                            <td><span class="badge badge-info">Security</span></td>
                            <td>system</td>
                            <td>-</td>
                            <td>IP 203.0.113.45 added to blacklist</td>
                            <td><i class="fas fa-check-circle text-success"></i></td>
                        </tr>
                        <tr>
                            <td>2024-01-15 14:10:18</td>
                            <td><span class="badge badge-success">Logout</span></td>
                            <td>moderator@example.com</td>
                            <td>192.168.1.50</td>
                            <td>User logged out</td>
                            <td><i class="fas fa-check-circle text-success"></i></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="audit-stats">
                <div class="stats-row">
                    <div class="stat-item">
                        <div class="stat-value">1,247</div>
                        <div class="stat-label">Total Events Today</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">23</div>
                        <div class="stat-label">Failed Attempts</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">156</div>
                        <div class="stat-label">Admin Actions</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">89</div>
                        <div class="stat-label">Active Sessions</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate System Status tab content
 */
function generateSystemStatusContent() {
    return `
        <div class="security-section">
            <div class="section-header with-button">
                <div class="section-content">
                    <h3><i class="fas fa-heartbeat"></i> Security Audit Report</h3>
                    <p class="text-secondary">Comprehensive security analysis of project dependencies</p>
                </div>
                <div class="section-actions">
                    <button class="btn btn-secondary" id="history-toggle-btn">
                        <i class="fas fa-history"></i> History
                    </button>
                    <button class="btn btn-secondary" id="refresh-status-btn">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                    <button class="btn btn-primary" id="run-scan-btn">
                        <i class="fas fa-shield-alt"></i> Run New Scan
                    </button>
                </div>
            </div>
            
            <!-- Audit History Panel -->
            <div id="audit-history-panel" class="audit-history-panel" style="display: none;">
                <div class="history-header">
                    <h4><i class="fas fa-history"></i> Audit Report History</h4>
                    <input type="text" id="history-search" class="form-control" placeholder="Search reports...">
                </div>
                <div id="history-content" class="history-content">
                    <div class="loading-spinner-container">
                        <div class="weaver-loading-spinner"></div>
                        <p>Loading audit history...</p>
                    </div>
                </div>
            </div>
            
            <div id="system-status-content" class="status-overview">
                <div class="loading-spinner-container">
                    <div class="weaver-loading-spinner"></div>
                    <p>Loading security audit report...</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Load system status data from API
 */
async function loadSystemStatusData() {
    try {
        const response = await fetch('/api/admin/security/system-status');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('API Response:', data); // Debug logging
        
        // Handle the response structure { message: "success", data: {...} }
        if (data.data) {
            renderSystemStatusData(data.data);
        } else {
            // Fallback for direct data
            renderSystemStatusData(data);
        }
    } catch (error) {
        console.error('Error loading system status:', error);
        renderSystemStatusError();
    }
}

/**
 * Render system status data
 */
function renderSystemStatusData(data) {
    const container = document.getElementById('system-status-content');
    if (!container) return;

    console.log('renderSystemStatusData called with:', data);
    
    // Check if data has the required structure
    if (!data || !data.statusCards || !Array.isArray(data.statusCards)) {
        console.error('Invalid data structure - statusCards missing or not an array:', data);
        renderSystemStatusError();
        return;
    }

    // Check if this is scan info data or regular data
    const hasScanInfo = data.scanInfo;
    
    container.innerHTML = `
        ${hasScanInfo ? renderScanMetaInfo(data.scanInfo) : ''}
        
        <div class="status-cards">
            ${data.statusCards.map(card => `
                <div class="status-card card status-${card.status}">
                    <div class="status-icon">
                        <i class="${card.icon}"></i>
                    </div>
                    <div class="status-info-content">
                        <div class="status-title">${card.title}</div>
                        <div class="status-value">${card.value}</div>
                        <div class="status-description">${card.description}</div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="security-details">
            <div class="detail-section">
                <div class="section-title">
                    <h4><i class="fas fa-bug"></i> Security Vulnerabilities</h4>
                </div>
                ${renderVulnerabilityList(data.vulnerabilities)}
            </div>
            
            <div class="detail-section">
                <div class="section-title">
                    <h4><i class="fas fa-lightbulb"></i> Security Recommendations</h4>
                </div>
                ${renderRecommendationsList(data.recommendations)}
            </div>
            
            <div class="detail-section">
                <div class="section-title">
                    <h4><i class="fas fa-server"></i> System Health</h4>
                    <a href="/health/dashboard" class="btn btn-primary btn-sm" target="_blank">
                        <i class="fas fa-external-link-alt"></i> View Health Dashboard
                    </a>
                </div>
                <div class="health-redirect-info">
                    <div class="redirect-card">
                        <i class="fas fa-info-circle"></i>
                        <div class="redirect-text">
                            <h4>Detailed Health Metrics Available</h4>
                            <p>System health metrics including database connections, API response times, disk usage, and more are available in the dedicated Health Dashboard.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render simple scan meta info
 */
function renderScanMetaInfo(scanInfo) {
    const scanTime = new Date(scanInfo.scanTime).toLocaleString();
    
    return `
        <div class="scan-meta-info">
            <div class="scan-meta-item">
                <i class="fas fa-clock"></i>
                <span>Scanned: ${scanTime}</span>
            </div>
            <div class="scan-meta-item">
                <i class="fas fa-file-alt"></i>
                <span>Report ID: ${scanInfo.scanId.substring(0, 8)}...</span>
            </div>
        </div>
    `;
}

/**
 * Render vulnerability list
 */
function renderVulnerabilityList(vulnerabilities) {
    if (!vulnerabilities || vulnerabilities.length === 0) {
        return `
            <div class="no-vulnerabilities">
                <i class="fas fa-shield-alt"></i>
                <h4>No Vulnerabilities Found</h4>
                <p>Great! No security vulnerabilities were detected in your dependencies.</p>
            </div>
        `;
    }

    return `
        <div class="vulnerability-list">
            ${vulnerabilities.map(vuln => `
                <div class="vulnerability-item ${vuln.severity}">
                    <div class="vuln-severity">
                        <span class="severity-badge ${vuln.severity}">${vuln.severity.toUpperCase()}</span>
                    </div>
                    <div class="vuln-info">
                        <div class="vuln-title">${vuln.title}</div>
                        <div class="vuln-description">${vuln.description}</div>
                        ${vuln.module ? `<div class="vuln-module"><strong>Module:</strong> ${vuln.module}</div>` : ''}
                        ${vuln.cve ? `<div class="vuln-cve"><strong>CVE:</strong> ${vuln.cve}</div>` : ''}
                        ${vuln.cvss_score ? `<div class="vuln-cvss"><strong>CVSS Score:</strong> ${vuln.cvss_score}</div>` : ''}
                    </div>
                    <div class="vuln-actions">
                        ${vuln.url ? `<a href="${vuln.url}" target="_blank" class="btn btn-sm btn-secondary">Details</a>` : ''}
                        ${vuln.fixAvailable && vuln.recommendation ? `<button class="btn btn-sm btn-primary fix-vuln-btn" data-id="${vuln.id}" data-recommendation="${vuln.recommendation.replace(/"/g, '&quot;')}">Fix</button>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Render recommendations list
 */
function renderRecommendationsList(recommendations) {
    if (!recommendations || recommendations.length === 0) {
        return `
            <div class="no-recommendations">
                <i class="fas fa-check-circle"></i>
                <h4>No Specific Recommendations</h4>
                <p>Keep up the good work! Continue monitoring your dependencies regularly.</p>
            </div>
        `;
    }

    return `
        <div class="recommendations-list">
            ${recommendations.map(rec => `
                <div class="recommendation-item priority-${rec.priority}">
                    <i class="fas fa-lightbulb"></i>
                    <div class="recommendation-text">
                        <strong>${rec.title}</strong>
                        <p>${rec.description}</p>
                        ${rec.action ? `<div class="rec-action"><strong>Action:</strong> ${rec.action}</div>` : ''}
                    </div>
                    <div class="recommendation-priority">
                        <span class="priority-badge ${rec.priority}">${rec.priority.toUpperCase()}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Get score description
 */
function getScoreDescription(score) {
    if (score >= 90) return 'Excellent Security';
    if (score >= 80) return 'Good Security';
    if (score >= 70) return 'Fair Security';
    if (score >= 60) return 'Poor Security';
    return 'Critical Issues';
}

/**
 * Render system status error
 */
function renderSystemStatusError() {
    const container = document.getElementById('system-status-content');
    if (!container) return;

    container.innerHTML = `
        <div class="error-state">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Failed to load system status</h3>
            <p>Unable to retrieve system status data. Please try again.</p>
            <button class="btn btn-primary" id="retry-status-btn">Retry</button>
        </div>
    `;
}

/**
 * Refresh system status data
 */
async function refreshSystemStatus() {
    const container = document.getElementById('system-status-content');
    if (container) {
        container.innerHTML = `
            <div class="loading-spinner-container">
                <div class="weaver-loading-spinner"></div>
                <p>Refreshing system status...</p>
            </div>
        `;
    }
    await loadSystemStatusData();
}

/**
 * Run security scan (triggers fresh pnpm audit)
 */
async function runSecurityScan(event) {
    try {
        // Show loading state
        const button = event ? event.target : document.getElementById('run-scan-btn');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
        button.disabled = true;

        // Call the API to run fresh security scan
        const response = await fetch('/api/admin/security/run-scan', {
            method: 'POST',
        });
        
        if (!response.ok) {
            throw new Error(`Scan failed: ${response.status}`);
        }
        
        const scanResult = await response.json();
        console.log('Scan result:', scanResult); // Debug logging
        
        // Refresh data to show new results
        await loadSystemStatusData();
        
        // Reset button
        button.innerHTML = originalText;
        button.disabled = false;
        
        // Show success message
        showNotification('Security scan completed successfully', 'success');
    } catch (error) {
        console.error('Error running security scan:', error);
        
        // Reset button
        const button = event ? event.target : document.getElementById('run-scan-btn');
        button.innerHTML = 'Run Scan';
        button.disabled = false;
        
        showNotification('Failed to run security scan', 'error');
    }
}

/**
 * Show fix recommendation
 */
function showFixRecommendation(vulnId, recommendation) {
    // Create a simple modal-like notification with the fix recommendation
    const notification = document.createElement('div');
    notification.className = 'fix-recommendation-modal';
    notification.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Fix Recommendation</h3>
                    <button class="modal-close" data-action="close-modal">×</button>
                </div>
                <div class="modal-body">
                    <p><strong>Vulnerability ID:</strong> ${vulnId}</p>
                    <p><strong>Recommendation:</strong></p>
                    <p>${recommendation}</p>
                    <div class="modal-actions">
                        <button class="btn btn-primary copy-rec-btn" data-text="${recommendation.replace(/"/g, '&quot;')}">Copy Command</button>
                        <button class="btn btn-secondary" data-action="close-modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
}

/**
 * Fix vulnerability
 */
async function fixVulnerability(vulnId) {
    try {
        // Show loading state
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fixing...';
        button.disabled = true;

        // Simulate fix (in real implementation, call API)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Refresh data
        await loadSystemStatusData();
        
        showNotification('Vulnerability fix applied successfully', 'success');
    } catch (error) {
        console.error('Error fixing vulnerability:', error);
        showNotification('Failed to fix vulnerability', 'error');
    }
}

/**
 * Handle recommendation action
 */
function handleRecommendation(recId) {
    // In real implementation, navigate to appropriate configuration page
    console.log('Handling recommendation:', recId);
    showNotification('This would navigate to the relevant configuration page', 'info');
}

/**
 * Get status text
 */
function getStatusText(status) {
    switch (status) {
        case 'good': return 'Good';
        case 'warning': return 'Warning';
        case 'danger': return 'Critical';
        default: return 'Unknown';
    }
}

/**
 * Get recommendation action text
 */
function getRecommendationActionText(category) {
    switch (category) {
        case 'authentication': return 'Configure';
        case 'monitoring': return 'Schedule';
        case 'backup': return 'Review';
        default: return 'View';
    }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
        console.error('Failed to copy to clipboard:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    });
}

/**
 * Toggle audit history panel
 */
function toggleAuditHistory() {
    const panel = document.getElementById('audit-history-panel');
    const button = document.getElementById('history-toggle-btn');
    const icon = button.querySelector('i');
    
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        icon.className = 'fas fa-times';
        button.innerHTML = '<i class="fas fa-times"></i> Close';
        loadAuditHistory();
    } else {
        panel.style.display = 'none';
        icon.className = 'fas fa-history';
        button.innerHTML = '<i class="fas fa-history"></i> History';
    }
}

/**
 * Load audit history from API
 */
async function loadAuditHistory(offset = 0) {
    try {
        const response = await fetch(`/api/admin/security/audit-history?limit=10&offset=${offset}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('History API Response:', data); // Debug logging
        
        // Handle the response structure { message: "success", data: {...} }
        if (data.data) {
            renderAuditHistory(data.data);
        } else {
            renderAuditHistory(data);
        }
    } catch (error) {
        console.error('Error loading audit history:', error);
        renderAuditHistoryError();
    }
}

/**
 * Render audit history data
 */
function renderAuditHistory(data) {
    const container = document.getElementById('history-content');
    if (!container) return;

    if (!data.reports || data.reports.length === 0) {
        container.innerHTML = `
            <div class="no-history">
                <i class="fas fa-info-circle"></i>
                <p>No audit reports found</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="history-list">
            ${data.reports.map(report => {
                const scanTime = new Date(report.createdAt).toLocaleString();
                const scoreColor = report.securityScore >= 80 ? 'good' : report.securityScore >= 60 ? 'warning' : 'danger';
                const totalVulns = report.vulnerabilityCount.total;
                
                return `
                    <div class="history-report-item" data-report-id="${report.id}">
                        <div class="report-summary">
                            <div class="report-time">${scanTime}</div>
                            <div class="report-score status-${scoreColor}">
                                <span class="score">${report.securityScore}</span>/100
                            </div>
                        </div>
                        <div class="report-details">
                            <div class="vuln-summary">
                                <span class="vuln-count critical">${report.vulnerabilityCount.critical}C</span>
                                <span class="vuln-count high">${report.vulnerabilityCount.high}H</span>
                                <span class="vuln-count moderate">${report.vulnerabilityCount.moderate}M</span>
                                <span class="vuln-count low">${report.vulnerabilityCount.low}L</span>
                            </div>
                            <div class="report-meta">
                                <span class="total-vulns">${totalVulns} total issues</span>
                                ${report.scanDuration ? `<span class="scan-duration">${Math.round(report.scanDuration / 1000)}s</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        ${data.hasMore ? `
            <div class="history-pagination">
                <button class="btn btn-secondary btn-sm" onclick="loadAuditHistory(${data.reports.length})">
                    Load More
                </button>
            </div>
        ` : ''}
    `;
}

/**
 * Render audit history error
 */
function renderAuditHistoryError() {
    const container = document.getElementById('history-content');
    if (!container) return;
    
    container.innerHTML = `
        <div class="history-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Failed to load audit history</p>
            <button class="btn btn-sm btn-primary" onclick="loadAuditHistory()">Retry</button>
        </div>
    `;
}

/**
 * Load specific audit report by ID
 */
async function loadAuditReport(reportId) {
    try {
        // Show loading state
        const container = document.getElementById('system-status-content');
        container.innerHTML = `
            <div class="loading-spinner-container">
                <div class="weaver-loading-spinner"></div>
                <p>Loading audit report...</p>
            </div>
        `;
        
        // Highlight selected report
        document.querySelectorAll('.history-report-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-report-id="${reportId}"]`)?.classList.add('selected');
        
        // Load report data
        const response = await fetch(`/api/admin/security/audit-report/${reportId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Report API Response:', data); // Debug logging
        
        // Handle the response structure { message: "success", data: {...} }
        if (data.data) {
            renderSystemStatusData(data.data);
        } else {
            renderSystemStatusData(data);
        }
        
        showNotification('Audit report loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading audit report:', error);
        showNotification('Failed to load audit report', 'error');
        renderSystemStatusError();
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // Simple notification - in real implementation, use a proper notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}