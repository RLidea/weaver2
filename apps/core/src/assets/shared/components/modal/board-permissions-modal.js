/**
 * Board Permissions Modal Component
 * Extends CommonModal for consistent behavior
 */

class BoardPermissionsModal extends CommonModal {
    constructor() {
        super();
        this.currentBoardId = null;
    }

    getOverlayClass() {
        return 'board-permissions-modal-overlay modal-overlay-base';
    }

    async generateModalHTML(boardId) {
        try {
            // Load permissions data
            const response = await fetch(`/v1/admin/content/boards/${boardId}/permissions`);
            const permissions = await response.json();
            const permissionsData = permissions.data || [];
            
            return `
                <div class="board-permissions-modal modal-base large" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                    ${this.generateModalHeader('Board Permissions', 'fas fa-shield-alt')}
                    
                    <div class="modal-body">
                        <div class="permissions-container">
                            ${this.generatePermissionsHTML(permissionsData)}
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="modal-action-btn primary" data-action="save">
                            <i class="fas fa-save"></i>
                            Save Permissions
                        </button>
                        <button type="button" class="modal-action-btn secondary modal-close-btn">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading permissions:', error);
            return `
                <div class="board-permissions-modal modal-base large" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                    ${this.generateModalHeader('Board Permissions', 'fas fa-shield-alt')}
                    
                    <div class="modal-body">
                        <div class="modal-error">
                            <i class="fas fa-exclamation-triangle"></i>
                            Error loading board permissions. Please try again.
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

    generatePermissionsHTML(permissions) {
        const actionTypes = ['read', 'WRITE', 'EDIT_OWN', 'EDIT_ALL', 'DELETE_OWN', 'DELETE_ALL', 'COMMENT'];
        const roles = ['USER', 'MODERATOR', 'ADMIN'];
        
        let html = '<div class="permission-grid">';
        
        actionTypes.forEach(action => {
            const permission = permissions.find(p => p.action === action) || {
                action,
                allowAnonymous: false,
                allowedRoles: [],
                allowedUserIds: []
            };
            
            html += `
                <div class="permission-card">
                    <div class="permission-header">${action.replace('_', ' ')}</div>
                    <div class="permission-options">
                        <div class="permission-option">
                            <input type="checkbox" id="anon-${action}" ${permission.allowAnonymous ? 'checked' : ''}>
                            <label for="anon-${action}">Allow Anonymous Users</label>
                        </div>
            `;
            
            roles.forEach(role => {
                const checked = permission.allowedRoles.includes(role) ? 'checked' : '';
                html += `
                    <div class="permission-option">
                        <input type="checkbox" id="role-${action}-${role}" ${checked}>
                        <label for="role-${action}-${role}">Allow ${role}</label>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    async create(boardId, options = {}) {
        this.currentBoardId = boardId;
        this.onClose = options.onClose || null;
        
        const html = await this.generateModalHTML(boardId);
        
        // Create the modal using parent's create method
        this.createModal(this.getOverlayClass());
        this.modal.innerHTML = html;
        this.bindEvents();
        this.showModal();
        
        return this.modal;
    }

    // Static show method that matches user-management pattern
    static async show(boardId, options = {}) {
        const modal = new BoardPermissionsModal();
        return await modal.create(boardId, options);
    }

    bindEvents() {
        // Call parent class event binding first
        super.bindEvents();

        // Add specific event binding for BoardPermissionsModal
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
            case 'save':
                this.savePermissions();
                break;
            default:
                console.log(`Unknown action: ${action}`);
        }
    }

    async savePermissions() {
        try {
            const actionTypes = ['read', 'WRITE', 'EDIT_OWN', 'EDIT_ALL', 'DELETE_OWN', 'DELETE_ALL', 'COMMENT'];
            const roles = ['USER', 'MODERATOR', 'ADMIN'];
            
            const permissions = actionTypes.map(action => {
                const allowAnonymous = this.modal.querySelector(`#anon-${action}`).checked;
                const allowedRoles = roles.filter(role => 
                    this.modal.querySelector(`#role-${action}-${role}`).checked
                );
                
                return {
                    action,
                    allowAnonymous,
                    allowedRoles,
                    allowedUserIds: []
                };
            });
            
            const response = await fetch(`/v1/admin/content/boards/${this.currentBoardId}/permissions`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(permissions)
            });
            
            if (response.ok) {
                this.close();
                // Show success message
                this.showSuccessMessage('Permissions updated successfully!');
                
                // Trigger reload of boards table if it exists
                if (window.contentManagement && window.contentManagement.loadBoards) {
                    window.contentManagement.loadBoards();
                }
            } else {
                throw new Error('Failed to update permissions');
            }
            
        } catch (error) {
            console.error('Error saving permissions:', error);
            alert('Error saving permissions. Please try again.');
        }
    }

    showSuccessMessage(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
            padding: 1rem;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        
        document.body.appendChild(successDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.BoardPermissionsModal = BoardPermissionsModal;
}