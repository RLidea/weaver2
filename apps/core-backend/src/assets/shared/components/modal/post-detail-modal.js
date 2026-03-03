/**
 * Post Detail Modal Component
 * Extends CommonModal for consistent behavior
 */

class PostDetailModal extends CommonModal {
    constructor() {
        super();
        this.currentPostId = null;
    }

    getOverlayClass() {
        return 'post-detail-modal-overlay modal-overlay-base';
    }

    async generateModalHTML(postId) {
        try {
            // Load post data
            const response = await fetch(`/v1/admin/content/posts/${postId}`);
            const result = await response.json();
            const post = result.data;
            
            const statusClass = post.status ? post.status.toLowerCase() : 'unknown';
            const createdDate = this.formatDate(post.createdAt);
            const updatedDate = this.formatDate(post.updatedAt);
            
            return `
                <div class="post-detail-modal modal-base large" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                    ${this.generateModalHeader('Post Details', 'fas fa-file-text')}
                    
                    <div class="modal-body">
                        <div class="post-detail">
                            <div class="post-header">
                                <h3 class="post-title">${this.escapeHtml(post.title)}</h3>
                                
                                <div class="post-meta">
                                    ${this.generateDetailItem('fas fa-clipboard-list', 'Board', post.board?.name || 'Unknown')}
                                    ${this.generateDetailItem('fas fa-user', 'Author', post.author?.displayName || 'Anonymous')}
                                    ${this.generateDetailItem('fas fa-circle', 'Status', `<span class="status-badge ${statusClass}">${post.status}</span>`)}
                                    ${this.generateDetailItem('fas fa-eye', 'Views', post.viewCount || 0)}
                                    ${this.generateDetailItem('fas fa-lock', 'Secret Post', post.isSecret ? 'Yes' : 'No')}
                                    ${this.generateDetailItem('fas fa-calendar-plus', 'Created', createdDate)}
                                    ${this.generateDetailItem('fas fa-calendar-edit', 'Updated', updatedDate)}
                                    ${this.generateDetailItem('fas fa-id-card', 'Post ID', `<code>${post.id}</code>`)}
                                </div>
                            </div>
                            
                            <div class="post-content">
                                <div class="detail-item">
                                    <div class="detail-label">
                                        <i class="fas fa-file-text"></i>
                                        Content
                                    </div>
                                    <div class="detail-value post-content-body">${this.escapeHtml(post.content)}</div>
                                </div>
                            </div>
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
            console.error('Error loading post details:', error);
            return `
                <div class="post-detail-modal modal-base large" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                    ${this.generateModalHeader('Post Details', 'fas fa-file-text')}
                    
                    <div class="modal-body">
                        <div class="modal-error">
                            <i class="fas fa-exclamation-triangle"></i>
                            Error loading post details. Please try again.
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

    async create(postId, options = {}) {
        this.currentPostId = postId;
        this.onClose = options.onClose || null;
        
        const html = await this.generateModalHTML(postId);
        
        // Create the modal using parent's create method
        this.createModal(this.getOverlayClass());
        this.modal.innerHTML = html;
        this.bindEvents();
        this.showModal();
        
        return this.modal;
    }

    // Static show method that matches user-management pattern
    static async show(postId, options = {}) {
        const modal = new PostDetailModal();
        return await modal.create(postId, options);
    }

    bindEvents() {
        // Call parent class event binding first
        super.bindEvents();
        // No additional events needed for post detail modal
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
    window.PostDetailModal = PostDetailModal;
}