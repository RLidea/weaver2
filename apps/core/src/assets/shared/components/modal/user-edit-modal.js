// User Edit Modal Component
class UserEditModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.currentUser = null;
        this.onSave = null;
        this.onClose = null;
        this.isLoading = false;
    }

    create(user, options = {}) {
        this.currentUser = { ...user }; // Create a copy for editing
        this.onSave = options.onSave || null;
        this.onClose = options.onClose || null;

        // Remove existing modal if any
        this.destroy();

        // Create modal overlay
        this.modal = document.createElement('div');
        this.modal.className = 'user-edit-modal-overlay';
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
        
        return `
            <div class="user-edit-modal" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                <div class="modal-header">
                    <h2 id="modal-title" class="modal-title">
                        <i class="fas fa-user-edit"></i>
                        Edit User
                    </h2>
                    <button class="modal-close-btn" type="button" aria-label="Close modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <form id="user-edit-form" class="user-edit-form">
                        <div class="user-profile-header">
                            <div class="user-avatar-large">${initials}</div>
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
                                        class="form-input" 
                                        value="${user.username}"
                                        placeholder="Enter username"
                                    >
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
                            <div class="info-item">
                                <span class="info-label">
                                    <i class="fas fa-id-card"></i>
                                    User ID
                                </span>
                                <span class="info-value">${user.id}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">
                                    <i class="fas fa-calendar-plus"></i>
                                    Created Date
                                </span>
                                <span class="info-value">${this.formatDate(user.createdAt)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">
                                    <i class="fas fa-clock"></i>
                                    Last Login
                                </span>
                                <span class="info-value">${user.lastLoginAt && user.lastLoginAt !== 'Never' ? this.formatDate(user.lastLoginAt) : 'Never'}</span>
                            </div>
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
            if (e.key === 'Escape' && this.isOpen && !this.isLoading) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.handleKeydown);

        // Form submit
        const form = this.modal.querySelector('#user-edit-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSave();
            });
        }

        // Real-time validation
        this.bindValidation();
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
            id: this.currentUser.id,
            displayName: formData.get('displayName'),
            username: formData.get('username'),
            email: formData.get('email'),
            role: formData.get('role'),
            status: formData.get('status'),
        };

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
        if (!this.modal || !this.isOpen || this.isLoading) return;

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
        const modal = new UserEditModal();
        return modal.create(user, options);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.UserEditModal = UserEditModal;
}