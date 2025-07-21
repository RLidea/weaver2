// User Detail Modal Component
class UserDetailModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.currentUser = null;
        this.onClose = null;
    }

    create(user, options = {}) {
        this.currentUser = user;
        this.onClose = options.onClose || null;

        // Remove existing modal if any
        this.destroy();

        // Create modal overlay
        this.modal = document.createElement('div');
        this.modal.className = 'user-detail-modal-overlay';
        this.modal.innerHTML = this.generateModalHTML(user);

        // Add to DOM
        document.body.appendChild(this.modal);
        document.body.style.overflow = 'hidden';

        // Bind events
        this.bindEvents();

        // Show modal with animation
        requestAnimationFrame(() => {
            this.modal.classList.add('show');
            this.isOpen = true;
        });

        return this.modal;
    }

    generateModalHTML(user) {
        const initials = (user.displayName || user.username || '').split(' ').map(n => n[0]).join('').toUpperCase();
        const formattedCreatedAt = this.formatDate(user.createdAt);
        const formattedLastLogin = user.lastLoginAt && user.lastLoginAt !== 'Never' ? this.formatDate(user.lastLoginAt) : 'Never';
        
        return `
            <div class="user-detail-modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                <div class="modal-header">
                    <h2 id="modal-title" class="modal-title">
                        <i class="fas fa-user"></i>
                        User Details
                    </h2>
                    <button class="modal-close-btn" type="button" aria-label="Close modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="user-profile-section">
                        <div class="user-avatar-large">${initials}</div>
                        <div class="user-basic-info">
                            <h3 class="user-display-name">${user.displayName || user.username}</h3>
                            <p class="user-username">@${user.username}</p>
                            <div class="user-status-container">
                                <span class="weaver-status-badge ${user.status === 'active' ? 'success' : 'error'}">
                                    ${user.status}
                                </span>
                                <span class="weaver-status-badge info">${user.role}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="user-details-grid">
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fas fa-envelope"></i>
                                Email
                            </div>
                            <div class="detail-value">${user.email}</div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fas fa-calendar-plus"></i>
                                Created Date
                            </div>
                            <div class="detail-value">${formattedCreatedAt}</div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fas fa-clock"></i>
                                Last Login
                            </div>
                            <div class="detail-value">${formattedLastLogin}</div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">
                                <i class="fas fa-id-card"></i>
                                User ID
                            </div>
                            <div class="detail-value">${user.id}</div>
                        </div>
                    </div>
                    
                    ${user.profileImageUrl ? `
                        <div class="profile-image-section">
                            <div class="detail-label">
                                <i class="fas fa-image"></i>
                                Profile Image
                            </div>
                            <img src="${user.profileImageUrl}" alt="Profile Image" class="profile-image-preview" />
                        </div>
                    ` : ''}
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="modal-action-btn secondary" data-action="edit">
                        <i class="fas fa-edit"></i>
                        Edit User
                    </button>
                    <button type="button" class="modal-action-btn primary modal-close-btn">
                        Close
                    </button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        if (!this.modal) return;

        // Close modal events
        const closeButtons = this.modal.querySelectorAll('.modal-close-btn');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });

        // Close on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Close on ESC key
        this.handleKeydown = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.handleKeydown);

        // Action buttons
        const actionButtons = this.modal.querySelectorAll('.modal-action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleAction(action);
            });
        });
    }

    handleAction(action) {
        switch (action) {
            case 'edit':
                if (window.handleEditUser && this.currentUser) {
                    window.handleEditUser(this.currentUser);
                    this.close();
                }
                break;
            default:
                console.log(`Unknown action: ${action}`);
        }
    }

    formatDate(dateString) {
        if (!dateString || dateString === 'Never') return 'Never';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString;
        }
    }

    close() {
        if (!this.modal || !this.isOpen) return;

        this.modal.classList.remove('show');
        this.isOpen = false;

        // Wait for animation to complete before removing
        setTimeout(() => {
            this.destroy();
        }, 300);
    }

    destroy() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        
        document.body.style.overflow = '';
        
        if (this.handleKeydown) {
            document.removeEventListener('keydown', this.handleKeydown);
            this.handleKeydown = null;
        }

        if (this.onClose) {
            this.onClose();
        }
    }

    static show(user, options = {}) {
        const modal = new UserDetailModal();
        return modal.create(user, options);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.UserDetailModal = UserDetailModal;
}