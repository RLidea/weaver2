// User Delete Modal Component - Extends CommonModal
class UserDeleteModal extends CommonModal {
    constructor() {
        super();
        this.onConfirm = null;
        this.isDeleting = false;
    }

    getOverlayClass() {
        return 'user-delete-modal-overlay modal-overlay-base';
    }

    create(user, options = {}) {
        this.onConfirm = options.onConfirm || null;
        
        // Call parent create method
        return super.create(user, options);
    }

    generateModalHTML(user) {
        const displayName = user.displayName || user.username;
        
        return `
            <div class="user-delete-modal modal-base" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                ${this.generateModalHeader('Confirm User Deletion', 'fas fa-trash-alt')}
                
                <div class="modal-body">
                    <div class="delete-confirmation-content">
                        <div class="warning-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        
                        <div class="confirmation-text">
                            <h3 class="delete-title">Delete User Account</h3>
                            <p class="delete-message">
                                Are you sure you want to delete the user account for <strong>"${displayName}"</strong>?
                            </p>
                            
                            <div class="user-info-summary">
                                <div class="user-summary-item">
                                    <span class="summary-label">Username:</span>
                                    <span class="summary-value">@${user.username}</span>
                                </div>
                                <div class="user-summary-item">
                                    <span class="summary-label">Email:</span>
                                    <span class="summary-value">${user.email}</span>
                                </div>
                                <div class="user-summary-item">
                                    <span class="summary-label">Role:</span>
                                    <span class="summary-value">${user.role}</span>
                                </div>
                            </div>
                            
                            <div class="warning-consequences">
                                <h4 class="consequences-title">This action will:</h4>
                                <ul class="consequences-list">
                                    <li><i class="fas fa-user-slash"></i> Permanently delete the user account</li>
                                    <li><i class="fas fa-database"></i> Remove all associated user data</li>
                                    <li><i class="fas fa-link"></i> Invalidate all user sessions</li>
                                    <li><i class="fas fa-ban"></i> Make the username available for reuse</li>
                                </ul>
                                
                                <div class="irreversible-warning">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <strong>This action cannot be undone!</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="modal-action-btn secondary modal-close-btn">
                        <i class="fas fa-times"></i>
                        Cancel
                    </button>
                    <button type="button" class="modal-action-btn danger delete-confirm-btn" id="delete-btn">
                        <i class="fas fa-trash-alt"></i>
                        <span class="btn-text">Delete User</span>
                        <span class="btn-loading" style="display: none;">
                            <i class="fas fa-spinner fa-spin"></i>
                            Deleting...
                        </span>
                    </button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Call parent class event binding first
        super.bindEvents();

        // Delete confirmation button
        const deleteBtn = this.modal.querySelector('#delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.handleDelete();
            });
        }
    }

    // Override canClose to prevent closing while deleting
    canClose() {
        return !this.isDeleting;
    }

    async handleDelete() {
        if (this.isDeleting) return;

        // Show loading state
        this.setDeleting(true);

        try {
            if (this.onConfirm) {
                await this.onConfirm(this.currentData);
                this.close();
            }
        } catch (error) {
            console.error('Failed to delete user:', error);
            this.showError('Failed to delete user. Please try again.');
        } finally {
            this.setDeleting(false);
        }
    }

    setDeleting(deleting) {
        this.isDeleting = deleting;
        const deleteBtn = this.modal.querySelector('#delete-btn');
        const btnText = deleteBtn.querySelector('.btn-text');
        const btnLoading = deleteBtn.querySelector('.btn-loading');
        
        if (deleting) {
            deleteBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-flex';
        } else {
            deleteBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    showError(message) {
        // Remove existing error
        const existingError = this.modal.querySelector('.modal-error');
        if (existingError) {
            existingError.remove();
        }

        // Create error element
        const errorElement = document.createElement('div');
        errorElement.className = 'modal-error';
        errorElement.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            ${message}
        `;

        // Insert before footer
        const footer = this.modal.querySelector('.modal-footer');
        footer.parentNode.insertBefore(errorElement, footer);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.remove();
            }
        }, 5000);
    }

    static show(user, options = {}) {
        const modal = new UserDeleteModal();
        return modal.create(user, options);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.UserDeleteModal = UserDeleteModal;
}