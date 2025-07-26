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
}

/**
 * Handle tab change events
 * @param {string} tabId - The ID of the selected tab
 */
function handleTabChange(tabId) {
    loadTabContent(tabId);
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
            <div class="section-header">
                <h3><i class="fas fa-heartbeat"></i> System Security Status</h3>
                <p class="text-secondary">Monitor system security health and vulnerabilities</p>
            </div>
            
            <div class="status-overview">
                <div class="status-cards">
                    <div class="status-card card status-good">
                        <div class="status-icon">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <div class="status-info-content">
                            <div class="status-title">Security Score</div>
                            <div class="status-value">98/100</div>
                            <div class="status-description">Excellent</div>
                        </div>
                    </div>
                    
                    <div class="status-card card status-warning">
                        <div class="status-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="status-info-content">
                            <div class="status-title">Vulnerabilities</div>
                            <div class="status-value">2</div>
                            <div class="status-description">Low Priority</div>
                        </div>
                    </div>
                    
                    <div class="status-card card status-good">
                        <div class="status-icon">
                            <i class="fas fa-certificate"></i>
                        </div>
                        <div class="status-info-content">
                            <div class="status-title">SSL Certificate</div>
                            <div class="status-value">Valid</div>
                            <div class="status-description">Expires in 89 days</div>
                        </div>
                    </div>
                    
                    <div class="status-card card status-good">
                        <div class="status-icon">
                            <i class="fas fa-sync-alt"></i>
                        </div>
                        <div class="status-info-content">
                            <div class="status-title">Last Scan</div>
                            <div class="status-value">2h ago</div>
                            <div class="status-description">No issues found</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="security-details">
                <div class="detail-section">
                    <div class="section-title">
                        <h4><i class="fas fa-bug"></i> Security Vulnerabilities</h4>
                        <button class="btn btn-primary btn-sm">Run Scan</button>
                    </div>
                    <div class="vulnerability-list">
                        <div class="vulnerability-item low">
                            <div class="vuln-severity">
                                <span class="severity-badge low">LOW</span>
                            </div>
                            <div class="vuln-info">
                                <div class="vuln-title">Outdated jQuery version</div>
                                <div class="vuln-description">Consider updating to latest version for security patches</div>
                            </div>
                            <div class="vuln-actions">
                                <button class="btn btn-sm btn-secondary">Details</button>
                                <button class="btn btn-sm btn-primary">Fix</button>
                            </div>
                        </div>
                        
                        <div class="vulnerability-item low">
                            <div class="vuln-severity">
                                <span class="severity-badge low">LOW</span>
                            </div>
                            <div class="vuln-info">
                                <div class="vuln-title">Missing security headers</div>
                                <div class="vuln-description">Some HTTP security headers are not configured</div>
                            </div>
                            <div class="vuln-actions">
                                <button class="btn btn-sm btn-secondary">Details</button>
                                <button class="btn btn-sm btn-primary">Fix</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <div class="section-title">
                        <h4><i class="fas fa-server"></i> System Health</h4>
                    </div>
                    <div class="health-metrics">
                        <div class="metric-item">
                            <div class="metric-label">Database Connections</div>
                            <div class="metric-value">23/100</div>
                            <div class="metric-status good">Normal</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Failed Login Rate</div>
                            <div class="metric-value">0.3%</div>
                            <div class="metric-status good">Low</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">API Response Time</div>
                            <div class="metric-value">145ms</div>
                            <div class="metric-status good">Good</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-label">Disk Usage</div>
                            <div class="metric-value">67%</div>
                            <div class="metric-status warning">Monitor</div>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <div class="section-title">
                        <h4><i class="fas fa-recommendations"></i> Security Recommendations</h4>
                    </div>
                    <div class="recommendations-list">
                        <div class="recommendation-item">
                            <i class="fas fa-lightbulb"></i>
                            <div class="recommendation-text">
                                <strong>Enable 2FA for all admin accounts</strong>
                                <p>Add an extra layer of security to prevent unauthorized access</p>
                            </div>
                            <button class="btn btn-sm btn-primary">Configure</button>
                        </div>
                        <div class="recommendation-item">
                            <i class="fas fa-lightbulb"></i>
                            <div class="recommendation-text">
                                <strong>Regular security audits</strong>
                                <p>Schedule monthly security reviews and vulnerability assessments</p>
                            </div>
                            <button class="btn btn-sm btn-primary">Schedule</button>
                        </div>
                        <div class="recommendation-item">
                            <i class="fas fa-lightbulb"></i>
                            <div class="recommendation-text">
                                <strong>Update backup strategy</strong>
                                <p>Ensure regular backups and test restoration procedures</p>
                            </div>
                            <button class="btn btn-sm btn-primary">Review</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}