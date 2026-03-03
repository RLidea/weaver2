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
let notificationTabComponent = null;

// Notifications management specific JavaScript
class NotificationsManagement {
    constructor() {
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadNotificationStats();
    }

    setupEventListeners() {
        // Event listeners for internal table filters will be handled by WeaverDataTable
    }

    async loadNotificationStats() {
        try {
            await waitForApiClient();
            const response = await window.ApiClient.get('/v1/admin/notifications/stats');
            const data = await response.json();
            
            const statsContainer = document.getElementById('notification-stats');
            const { overview } = data.data;
            
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">${overview.totalEmails}</div>
                    <div class="stat-label">Total Emails</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${overview.sentEmails}</div>
                    <div class="stat-label">Sent Emails</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${overview.failedEmails}</div>
                    <div class="stat-label">Failed Emails</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${overview.pendingEmails}</div>
                    <div class="stat-label">Pending Emails</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${overview.recentEmails}</div>
                    <div class="stat-label">Recent (7 days)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${overview.successRate.toFixed(1)}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading notification stats:', error);
        }
    }

    async loadEmailLogs() {
        try {
            // Get all data without filtering - WeaverDataTable will handle filtering
            await waitForApiClient();
            const response = await window.ApiClient.get('/v1/admin/notifications/email-logs', { page: 1, limit: 1000 });
            const data = await response.json();
            
            const tableData = data.data?.items ? data.data.items.map(log => ({
                id: log.id,
                to: log.to,
                from: log.from,
                subject: log.subject.length > 50 ? log.subject.substring(0, 50) + '...' : log.subject,
                status: log.status,
                template: log.template?.name || 'Direct Email',
                user: log.user?.displayName || 'System',
                created: new Date(log.createdAt).toLocaleDateString(),
                createdAt: log.createdAt, // For date filtering
                sentAt: log.sentAt ? new Date(log.sentAt).toLocaleDateString() : '-',
            })) : [];

            // Get unique templates and users for filter options
            const templates = [...new Set(tableData.map(log => log.template))];
            const users = [...new Set(tableData.map(log => log.user))];

            const emailColumns = [
                { key: 'to', label: 'To', sortable: true },
                { key: 'subject', label: 'Subject', sortable: true },
                { 
                    key: 'status', 
                    label: 'Status', 
                    sortable: true, 
                    filterable: true,
                    filterOptions: ['SENT', 'PENDING', 'FAILED', 'BOUNCED']
                },
                { 
                    key: 'template', 
                    label: 'Template', 
                    sortable: true, 
                    filterable: true,
                    filterOptions: templates
                },
                { 
                    key: 'user', 
                    label: 'User', 
                    sortable: true, 
                    filterable: true,
                    filterOptions: users
                },
                { 
                    key: 'createdAt', 
                    label: 'Created Date', 
                    sortable: true, 
                    filterable: true,
                    filterType: 'dateRange',
                    type: 'date'
                },
                { key: 'sentAt', label: 'Sent At', sortable: true },
                { key: 'actions', label: 'Actions', type: 'actions', sortable: false }
            ];

            if (!this.emailTable) {
                const container = document.getElementById('email-logs-table-container');
                this.emailTable = new WeaverDataTable({
                    container: container,
                    data: tableData,
                    columns: emailColumns,
                    title: 'Email Logs',
                    searchable: true,
                    sortable: true,
                    filterable: true,
                    pagination: true,
                    perPageOptions: [10, 25, 50],
                    defaultPerPage: 20,
                    emptyMessage: 'No email logs found',
                    onView: (log) => this.viewEmailLog(log.id),
                    onDelete: (log) => this.deleteEmailLog(log.id),
                });
            } else {
                this.emailTable.updateData(tableData);
            }
            
        } catch (error) {
            console.error('Error loading email logs:', error);
        }
    }

    async viewEmailLog(logId) {
        if (window.EmailLogDetailModal) {
            window.EmailLogDetailModal.show(logId, {
                onClose: () => {
                    console.log('Email log detail modal closed');
                }
            });
        } else {
            console.error('Email log detail modal not available');
        }
    }

    async deleteEmailLog(logId) {
        if (!confirm('Are you sure you want to delete this email log?')) {
            return;
        }
        
        try {
            await waitForApiClient();
            const response = await window.ApiClient.delete(`/v1/admin/notifications/email-logs/${logId}`);
            
            if (response.ok) {
                alert('Email log deleted successfully!');
                await this.loadEmailLogs();
                await this.loadNotificationStats();
            } else {
                alert('Error deleting email log');
            }
        } catch (error) {
            console.error('Error deleting email log:', error);
            alert('Error deleting email log');
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Load data for specific tab
async function loadTabData(tabId) {
    try {
        switch (tabId) {
            case 'email-logs':
                await window.notificationsManagement.loadEmailLogs();
                break;
            case 'push-notifications':
            case 'sms-logs':
                // These are placeholder tabs - no data to load
                break;
            default:
                console.warn(`Unknown tab: ${tabId}`);
        }
    } catch (error) {
        console.error(`Failed to load ${tabId} data:`, error);
        alert(`Failed to load ${tabId} data. Please try again.`);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize notifications management
    window.notificationsManagement = new NotificationsManagement();
    
    // Define tabs
    const tabs = [
        {
            id: 'email-logs',
            label: 'Email Logs',
            icon: 'fas fa-envelope',
            content: `<div id="email-logs-table-container"><!-- Email logs table will be loaded here --></div>`
        },
        {
            id: 'push-notifications',
            label: 'Push Notifications',
            icon: 'fas fa-mobile-alt',
            content: `
                <div class="card" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-mobile-alt" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                    <h3>Push Notifications</h3>
                    <p class="text-secondary">Push notification management will be available soon.</p>
                </div>
            `,
            disabled: true
        },
        {
            id: 'sms-logs',
            label: 'SMS Logs',
            icon: 'fas fa-sms',
            content: `
                <div class="card" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-sms" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                    <h3>SMS Logs</h3>
                    <p class="text-secondary">SMS log management will be available soon.</p>
                </div>
            `,
            disabled: true
        }
    ];
    
    // Create tab component
    notificationTabComponent = TabComponent.create('notification-tabs-container', tabs, {
        activeTab: 'email-logs',
        onTabChange: (tabId) => {
            console.log('Notification tab changed to:', tabId);
            loadTabData(tabId);
        },
        urlStateKey: 'tab',
        urlStateEnabled: true
    });
    
    // Load initial data
    const initialTab = notificationTabComponent.getActiveTab();
    console.log('Loading initial notification tab:', initialTab);
    loadTabData(initialTab);
});