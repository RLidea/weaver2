/**
 * Email Log Detail Modal Component
 * Extends CommonModal for consistent behavior
 */

class EmailLogDetailModal extends CommonModal {
    constructor() {
        super();
        this.currentLogId = null;
    }

    getOverlayClass() {
        return 'email-log-detail-modal-overlay modal-overlay-base';
    }

    async generateModalHTML(logId) {
        try {
            // Load email log data
            const response = await fetch(`/v1/admin/notifications/email-logs/${logId}`);
            const result = await response.json();
            const log = result.data;
            
            const statusClass = log.status ? log.status.toLowerCase() : 'unknown';
            const createdDate = this.formatDate(log.createdAt);
            const sentDate = log.sentAt ? this.formatDate(log.sentAt) : 'Not sent';
            const failedDate = log.failedAt ? this.formatDate(log.failedAt) : null;
            
            return `
                <div class="email-log-detail-modal modal-base large" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                    ${this.generateModalHeader('Email Log Details', 'fas fa-envelope')}
                    
                    <div class="modal-body">
                        <div class="email-log-detail">
                            <div class="email-header">
                                <h3 class="email-subject">${this.escapeHtml(log.subject)}</h3>
                                
                                <div class="email-meta">
                                    ${this.generateDetailItem('fas fa-paper-plane', 'From', log.from)}
                                    ${this.generateDetailItem('fas fa-inbox', 'To', log.to)}
                                    ${this.generateDetailItem('fas fa-circle', 'Status', `<span class="status-badge ${statusClass}">${log.status}</span>`)}
                                    ${this.generateDetailItem('fas fa-template', 'Template', log.template?.name || 'Direct Email')}
                                    ${this.generateDetailItem('fas fa-user', 'User', log.user?.displayName || 'System')}
                                    ${this.generateDetailItem('fas fa-calendar-plus', 'Created', createdDate)}
                                    ${this.generateDetailItem('fas fa-clock', 'Sent At', sentDate)}
                                    ${failedDate ? this.generateDetailItem('fas fa-exclamation-triangle', 'Failed At', failedDate) : ''}
                                    ${log.errorMessage ? this.generateDetailItem('fas fa-bug', 'Error Message', `<code style="color: var(--status-error);">${this.escapeHtml(log.errorMessage)}</code>`) : ''}
                                    ${this.generateDetailItem('fas fa-id-card', 'Log ID', `<code>${log.id}</code>`)}
                                </div>
                            </div>
                            
                            ${log.htmlContent ? `
                                <div class="email-content">
                                    <div class="detail-item">
                                        <div class="detail-label">
                                            <i class="fas fa-code"></i>
                                            HTML Content
                                        </div>
                                        <div class="detail-value">
                                            <div class="email-content-preview">
                                                <iframe 
                                                    srcdoc="${this.escapeHtml(log.htmlContent)}" 
                                                    style="width: 100%; height: 400px; border: 1px solid var(--border-color); border-radius: 4px;"
                                                    sandbox="allow-same-origin">
                                                </iframe>
                                            </div>
                                            <details style="margin-top: 1rem;">
                                                <summary style="cursor: pointer; color: var(--primary-color);">View HTML Source</summary>
                                                <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; margin-top: 0.5rem;"><code>${this.escapeHtml(log.htmlContent)}</code></pre>
                                            </details>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${log.textContent ? `
                                <div class="email-text-content">
                                    <div class="detail-item">
                                        <div class="detail-label">
                                            <i class="fas fa-file-text"></i>
                                            Text Content
                                        </div>
                                        <div class="detail-value">
                                            <pre class="email-text-body">${this.escapeHtml(log.textContent)}</pre>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${log.metadata ? `
                                <div class="email-metadata">
                                    <div class="detail-item">
                                        <div class="detail-label">
                                            <i class="fas fa-info-circle"></i>
                                            Metadata
                                        </div>
                                        <div class="detail-value">
                                            <pre class="metadata-json">${JSON.stringify(log.metadata, null, 2)}</pre>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="modal-action-btn secondary modal-close-btn">
                            <i class="fas fa-times"></i>
                            Close
                        </button>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading email log details:', error);
            return `
                <div class="email-log-detail-modal modal-base large" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                    ${this.generateModalHeader('Email Log Details', 'fas fa-envelope')}
                    
                    <div class="modal-body">
                        <div class="modal-error">
                            <i class="fas fa-exclamation-triangle"></i>
                            Error loading email log details. Please try again.
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="modal-action-btn secondary modal-close-btn">
                            <i class="fas fa-times"></i>
                            Close
                        </button>
                    </div>
                </div>
            `;
        }
    }

    async create(logId, options = {}) {
        this.currentLogId = logId;
        this.onClose = options.onClose || null;
        
        const html = await this.generateModalHTML(logId);
        
        // Create the modal using parent's create method
        this.createModal(this.getOverlayClass());
        this.modal.innerHTML = html;
        this.bindEvents();
        this.showModal();
        
        return this.modal;
    }

    // Static show method that matches user-management pattern
    static async show(logId, options = {}) {
        const modal = new EmailLogDetailModal();
        return await modal.create(logId, options);
    }

    bindEvents() {
        // Call parent class event binding first
        super.bindEvents();
        // No additional events needed for email log detail modal
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EmailLogDetailModal = EmailLogDetailModal;
}