// Notifications management specific JavaScript
class NotificationsManagement {
    constructor() {
        this.currentTab = 'email-logs';
        this.init();
    }

    async init() {
        this.setupTabs();
        this.setupEventListeners();
        await this.loadNotificationStats();
        await this.loadEmailLogs();
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.notification-tab');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            if (tab.disabled) return;
            
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                contents.forEach(c => c.classList.remove('active'));
                document.getElementById(`${tabId}-tab`).classList.add('active');
                
                this.currentTab = tabId;
                this.loadTabContent(tabId);
            });
        });
    }

    setupEventListeners() {
        // Event listeners for internal table filters will be handled by WeaverDataTable
    }

    async loadTabContent(tabId) {
        switch(tabId) {
            case 'email-logs':
                await this.loadEmailLogs();
                break;
            // Future tabs will be added here
        }
    }

    async loadNotificationStats() {
        try {
            const response = await fetch('/v1/admin/notifications/stats');
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
            const response = await fetch('/v1/admin/notifications/email-logs?page=1&limit=1000');
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
            const response = await fetch(`/v1/admin/notifications/email-logs/${logId}`, {
                method: 'DELETE'
            });
            
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notificationsManagement = new NotificationsManagement();
});