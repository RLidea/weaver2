// User Detail Modal Component - Extends CommonModal
class UserDetailModal extends CommonModal {
    constructor() {
        super();
    }

    getOverlayClass() {
        return 'user-detail-modal-overlay modal-overlay-base';
    }

    generateModalHTML(user) {
        const formattedCreatedAt = this.formatDate(user.createdAt);
        const formattedLastLogin = user.lastLoginAt && user.lastLoginAt !== 'Never' ? this.formatDate(user.lastLoginAt) : 'Never';
        
        return `
            <div class="user-detail-modal modal-base" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                ${this.generateModalHeader('User Details', 'fas fa-user')}
                
                <div class="modal-body">
                    <div class="user-profile-section">
                        ${this.generateUserAvatar(user)}
                        <div class="user-basic-info">
                            <h3 class="user-display-name">${user.displayName || user.username}</h3>
                            <p class="user-username">@${user.username}</p>
                            ${this.generateStatusBadges(user)}
                        </div>
                    </div>
                    
                    <div class="user-details-grid">
                        ${this.generateDetailItem('fas fa-envelope', 'Email', user.email)}
                        ${this.generateDetailItem('fas fa-calendar-plus', 'Created Date', formattedCreatedAt)}
                        ${this.generateDetailItem('fas fa-clock', 'Last Login', formattedLastLogin)}
                        ${this.generateDetailItem('fas fa-id-card', 'User ID', user.id)}
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
        // Call parent class event binding first
        super.bindEvents();

        // Add specific event binding for UserDetailModal
        const actionButtons = this.modal.querySelectorAll('.modal-action-btn[data-action]');
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
                if (window.handleEditUser && this.currentData) {
                    window.handleEditUser(this.currentData);
                    this.close();
                }
                break;
            default:
                console.log(`Unknown action: ${action}`);
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.UserDetailModal = UserDetailModal;
}