// User Edit Modal Component - Extends CommonModal
class UserEditModal extends CommonModal {
    constructor() {
        super();
        this.onSave = null;
        this.isLoading = false;
    }

    getOverlayClass() {
        return 'user-edit-modal-overlay modal-overlay-base';
    }

    create(user, options = {}) {
        this.onSave = options.onSave || null;
        
        // Call parent create method
        return super.create({ ...user }, options); // Create a copy for editing
    }

    generateModalHTML(user) {
        return `
            <div class="user-edit-modal modal-base large" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                ${this.generateModalHeader('Edit User', 'fas fa-user-edit')}
                
                <div class="modal-body">
                    <form id="user-edit-form" class="user-edit-form">
                        <div class="user-profile-header">
                            ${this.generateUserAvatar(user)}
                            <div class="user-basic-info">
                                <div class="form-group">
                                    <label for="displayName">Display Name</label>
                                    <input 
                                        type="text" 
                                        id="displayName" 
                                        name="displayName" 
                                        class="form-input" 
                                        value="${user.displayName || user.username}"
                                        placeholder="Enter display name"
                                    >
                                </div>
                                <div class="form-group">
                                    <label for="username">Username</label>
                                    <input 
                                        type="text" 
                                        id="username" 
                                        name="username" 
                                        class="form-input username-input" 
                                        value="${user.username}"
                                        placeholder="Enter username"
                                        data-original-value="${user.username}"
                                    >
                                    <div class="username-warning" style="display: none;">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        <span>⚠️ Warning: Changing username will modify your profile URL (e.g., /profile/${user.username} → /profile/new_name)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-fields-grid">
                            <div class="form-group">
                                <label for="email">
                                    <i class="fas fa-envelope"></i>
                                    Email
                                </label>
                                <input 
                                    type="email" 
                                    id="email" 
                                    name="email" 
                                    class="form-input" 
                                    value="${user.email}"
                                    placeholder="Enter email address"
                                >
                            </div>
                            
                            <div class="form-group">
                                <label for="role">
                                    <i class="fas fa-user-tag"></i>
                                    Role
                                </label>
                                <select id="role" name="role" class="form-select">
                                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                    <option value="moderator" ${user.role === 'moderator' ? 'selected' : ''}>Moderator</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="status">
                                    <i class="fas fa-toggle-on"></i>
                                    Status
                                </label>
                                <select id="status" name="status" class="form-select">
                                    <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-info-section">
                            ${this.generateInfoItem('fas fa-id-card', 'User ID', user.id)}
                            ${this.generateInfoItem('fas fa-calendar-plus', 'Created Date', this.formatDate(user.createdAt))}
                            ${this.generateInfoItem('fas fa-clock', 'Last Login', user.lastLoginAt && user.lastLoginAt !== 'Never' ? this.formatDate(user.lastLoginAt) : 'Never')}
                        </div>
                    </form>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="modal-action-btn secondary modal-close-btn">
                        Cancel
                    </button>
                    <button type="submit" form="user-edit-form" class="modal-action-btn primary" id="save-btn">
                        <i class="fas fa-save"></i>
                        <span class="btn-text">Save Changes</span>
                        <span class="btn-loading" style="display: none;">
                            <i class="fas fa-spinner fa-spin"></i>
                            Saving...
                        </span>
                    </button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Call parent class event binding first
        super.bindEvents();

        // Form submit
        const form = this.modal.querySelector('#user-edit-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSave();
            });
        }

        // Username change warning
        this.bindUsernameWarning();

        // Real-time validation
        this.bindValidation();
    }

    // Override canClose to prevent closing while loading
    canClose() {
        return !this.isLoading;
    }

    bindUsernameWarning() {
        const usernameInput = this.modal.querySelector('#username');
        const warningElement = this.modal.querySelector('.username-warning');
        
        if (!usernameInput || !warningElement) return;

        const originalUsername = usernameInput.dataset.originalValue;

        usernameInput.addEventListener('input', () => {
            const currentValue = usernameInput.value.trim();
            
            if (currentValue !== originalUsername && currentValue !== '') {
                warningElement.style.display = 'flex';
                // Update the warning message with current values
                const warningSpan = warningElement.querySelector('span');
                if (warningSpan) {
                    warningSpan.textContent = `⚠️ Warning: Changing username will modify your profile URL (e.g., /profile/${originalUsername} → /profile/${currentValue})`;
                }
            } else {
                warningElement.style.display = 'none';
            }
        });
    }

    showUsernameChangeConfirmation(oldUsername, newUsername) {
        return new Promise((resolve) => {
            // Create confirmation modal overlay
            const confirmationOverlay = document.createElement('div');
            confirmationOverlay.className = 'username-confirmation-overlay modal-overlay-base';
            confirmationOverlay.style.zIndex = '20000'; // Higher than main modal
            
            confirmationOverlay.innerHTML = `
                <div class="username-confirmation-modal modal-base">
                    <div class="modal-header">
                        <h2 class="modal-title">
                            <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>
                            Confirm Username Change
                        </h2>
                    </div>
                    
                    <div class="modal-body">
                        <div class="confirmation-content">
                            <p><strong>Are you sure you want to change the username?</strong></p>
                            <p>This change will affect the following:</p>
                            
                            <ul class="impact-list">
                                <li><i class="fas fa-link"></i> <strong>Profile URL change:</strong> <code>/profile/${oldUsername}</code> → <code>/profile/${newUsername}</code></li>
                                <li><i class="fas fa-unlink"></i> Existing links may no longer work</li>
                                <li><i class="fas fa-search"></i> Other users may have difficulty finding you</li>
                                <li><i class="fas fa-share-alt"></i> Shared profile links will become invalid</li>
                            </ul>
                            
                            <div class="change-summary">
                                <div class="change-item">
                                    <span class="change-label">Current:</span>
                                    <span class="change-value old">${oldUsername}</span>
                                </div>
                                <div class="change-arrow">→</div>
                                <div class="change-item">
                                    <span class="change-label">New:</span>
                                    <span class="change-value new">${newUsername}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="modal-action-btn secondary cancel-btn">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                        <button type="button" class="modal-action-btn primary confirm-btn">
                            <i class="fas fa-check"></i>
                            Change Username
                        </button>
                    </div>
                </div>
            `;

            // Add to DOM
            document.body.appendChild(confirmationOverlay);

            // Show with animation
            requestAnimationFrame(() => {
                confirmationOverlay.classList.add('show');
            });

            // Event handlers
            const handleClose = (confirmed) => {
                confirmationOverlay.classList.remove('show');
                setTimeout(() => {
                    if (confirmationOverlay.parentNode) {
                        confirmationOverlay.remove();
                    }
                }, 300);
                resolve(confirmed);
            };

            confirmationOverlay.querySelector('.cancel-btn').addEventListener('click', () => handleClose(false));
            confirmationOverlay.querySelector('.confirm-btn').addEventListener('click', () => handleClose(true));
            
            // Close on overlay click
            confirmationOverlay.addEventListener('click', (e) => {
                if (e.target === confirmationOverlay) {
                    handleClose(false);
                }
            });

            // Close on ESC key
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', handleKeydown);
                    handleClose(false);
                }
            };
            document.addEventListener('keydown', handleKeydown);
        });
    }

    bindValidation() {
        const inputs = this.modal.querySelectorAll('.form-input, .form-select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.clearFieldError(input);
            });
            
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        switch (field.name) {
            case 'displayName':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Display name is required';
                } else if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'Display name must be at least 2 characters';
                }
                break;
            case 'username':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Username is required';
                } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Username can only contain letters, numbers, and underscores';
                } else if (value.length < 3) {
                    isValid = false;
                    errorMessage = 'Username must be at least 3 characters';
                }
                break;
            case 'email':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Email is required';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address';
                }
                break;
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        } else {
            this.clearFieldError(field);
        }

        return isValid;
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        
        field.classList.add('error');
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        
        field.parentNode.appendChild(errorElement);
    }

    clearFieldError(field) {
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    validateForm() {
        const fields = this.modal.querySelectorAll('.form-input[required], .form-input[name="displayName"], .form-input[name="username"], .form-input[name="email"]');
        let isValid = true;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    async handleSave() {
        if (this.isLoading) return;

        // Validate form
        if (!this.validateForm()) {
            return;
        }

        const formData = new FormData(this.modal.querySelector('#user-edit-form'));
        const updatedUser = {
            id: this.currentData.id,
            displayName: formData.get('displayName'),
            username: formData.get('username'),
            email: formData.get('email'),
            role: formData.get('role'),
            status: formData.get('status'),
        };

        // Check if username has changed and show confirmation modal
        const originalUsername = this.currentData.username;
        const newUsername = updatedUser.username;
        
        if (originalUsername !== newUsername) {
            const confirmed = await this.showUsernameChangeConfirmation(originalUsername, newUsername);
            if (!confirmed) {
                return; // User cancelled the change
            }
        }

        // Show loading state
        this.setLoading(true);

        try {
            if (this.onSave) {
                await this.onSave(updatedUser);
                this.close();
            }
        } catch (error) {
            console.error('Failed to save user:', error);
            this.showError('Failed to save user. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const saveBtn = this.modal.querySelector('#save-btn');
        const btnText = saveBtn.querySelector('.btn-text');
        const btnLoading = saveBtn.querySelector('.btn-loading');
        
        if (loading) {
            saveBtn.disabled = true;
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-flex';
        } else {
            saveBtn.disabled = false;
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

}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.UserEditModal = UserEditModal;
}