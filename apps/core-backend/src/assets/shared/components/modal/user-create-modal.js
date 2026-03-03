/**
 * User Create Modal Component
 * Extends CommonModal for creating new users
 */

class UserCreateModal extends CommonModal {
    constructor() {
        super();
        this.onSave = null;
        this.isLoading = false;
    }

    getOverlayClass() {
        return 'user-create-modal-overlay modal-overlay-base';
    }

    create(options = {}) {
        this.onSave = options.onSave || null;
        
        // Call parent create method with empty data for new user
        return super.create({}, options);
    }

    // Use CommonModal's default static show method

    generateModalHTML(data = {}) {
        return `
            <div class="user-create-modal modal-base large" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                ${this.generateModalHeader('Create New User', 'fas fa-user-plus')}
            
            <div class="modal-body">
                <form class="user-form" id="user-create-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="create-username">Username <span class="required">*</span></label>
                            <input 
                                type="text" 
                                id="create-username"
                                name="username"
                                class="form-input glass"
                                placeholder="Enter username"
                                required
                                autocomplete="off"
                            >
                            <div class="form-error" id="create-username-error"></div>
                            <div class="form-help">Username will be used for login and profile URL</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="create-displayName">Display Name <span class="required">*</span></label>
                            <input 
                                type="text" 
                                id="create-displayName"
                                name="displayName"
                                class="form-input glass"
                                placeholder="Enter display name"
                                required
                            >
                            <div class="form-error" id="create-displayName-error"></div>
                        </div>
                        
                        <div class="form-group">
                            <label for="create-email">Email <span class="required">*</span></label>
                            <input 
                                type="email" 
                                id="create-email"
                                name="email"
                                class="form-input glass"
                                placeholder="Enter email address"
                                required
                            >
                            <div class="form-error" id="create-email-error"></div>
                        </div>
                        
                        <div class="form-group">
                            <label for="create-role">Role <span class="required">*</span></label>
                            <select 
                                id="create-role"
                                name="role"
                                class="form-input glass"
                                required
                            >
                                <option value="USER">User</option>
                                <option value="MODERATOR">Moderator</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                            <div class="form-error" id="create-role-error"></div>
                        </div>
                        
                        <div class="form-group full-width">
                            <div class="info-box">
                                <div class="info-icon">
                                    <i class="fas fa-info-circle"></i>
                                </div>
                                <div class="info-content">
                                    <p><strong>Account Setup:</strong></p>
                                    <ul>
                                        <li>User will receive a welcome email with account setup instructions</li>
                                        <li>Initial password will be auto-generated and sent via email</li>
                                        <li>User must verify their email address before first login</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="modal-action-btn secondary modal-close-btn">
                    Cancel
                </button>
                <button type="button" class="modal-action-btn primary" id="create-save-btn">
                    <i class="fas fa-user-plus"></i>
                    Create User
                </button>
            </div>
            </div>
        `;
    }

    bindEvents() {
        // Call parent bindEvents first to get common functionality (close buttons, ESC key)
        super.bindEvents();
        
        // Form validation
        this.bindFormValidation();
        
        // Save button
        const saveBtn = this.modal.querySelector('#create-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSave();
            });
        }
        
        // Form submission
        const form = this.modal.querySelector('#user-create-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSave();
            });
        }
    }

    bindFormValidation() {
        const fields = ['username', 'displayName', 'email'];
        
        fields.forEach(fieldName => {
            const field = this.modal.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.addEventListener('input', () => {
                    this.validateField(fieldName, field.value);
                    this.updateSaveButtonState();
                });
                
                field.addEventListener('blur', () => {
                    this.validateField(fieldName, field.value);
                });
            }
        });
    }

    validateField(fieldName, value) {
        const errorElement = this.modal.querySelector(`#create-${fieldName}-error`);
        const field = this.modal.querySelector(`[name="${fieldName}"]`);
        
        if (!errorElement || !field) return true;
        
        let isValid = true;
        let errorMessage = '';
        
        // Required field validation
        if (!value || value.trim() === '') {
            isValid = false;
            errorMessage = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
        }
        // Username specific validation
        else if (fieldName === 'username') {
            if (value.length < 3) {
                isValid = false;
                errorMessage = 'Username must be at least 3 characters long';
            } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                isValid = false;
                errorMessage = 'Username can only contain letters, numbers, and underscores';
            }
        }
        // Email validation
        else if (fieldName === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
        }
        // Display name validation
        else if (fieldName === 'displayName') {
            if (value.length < 2) {
                isValid = false;
                errorMessage = 'Display name must be at least 2 characters long';
            } else if (value.length > 50) {
                isValid = false;
                errorMessage = 'Display name cannot exceed 50 characters';
            }
        }
        
        // Update UI
        if (isValid) {
            field.classList.remove('error');
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        } else {
            field.classList.add('error');
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
        }
        
        return isValid;
    }

    validateForm() {
        const fields = ['username', 'displayName', 'email'];
        let isFormValid = true;
        
        fields.forEach(fieldName => {
            const field = this.modal.querySelector(`[name="${fieldName}"]`);
            if (field) {
                const fieldValid = this.validateField(fieldName, field.value);
                if (!fieldValid) {
                    isFormValid = false;
                }
            }
        });
        
        return isFormValid;
    }

    updateSaveButtonState() {
        const saveBtn = this.modal.querySelector('#create-save-btn');
        const form = this.modal.querySelector('#user-create-form');
        
        if (saveBtn && form) {
            const isValid = this.validateForm();
            const hasRequiredFields = this.hasRequiredFields();
            
            if (isValid && hasRequiredFields) {
                saveBtn.disabled = false;
                saveBtn.classList.remove('disabled');
            } else {
                saveBtn.disabled = true;
                saveBtn.classList.add('disabled');
            }
        }
    }

    hasRequiredFields() {
        const requiredFields = ['username', 'displayName', 'email'];
        return requiredFields.every(fieldName => {
            const field = this.modal.querySelector(`[name="${fieldName}"]`);
            return field && field.value.trim() !== '';
        });
    }

    getFormData() {
        const form = this.modal.querySelector('#user-create-form');
        if (!form) return null;
        
        const formData = new FormData(form);
        return {
            username: formData.get('username')?.trim(),
            displayName: formData.get('displayName')?.trim(),
            email: formData.get('email')?.trim(),
            role: formData.get('role')
        };
    }

    async handleSave() {
        if (!this.validateForm()) {
            this.showFieldErrors();
            return;
        }
        
        const formData = this.getFormData();
        const saveBtn = this.modal.querySelector('#create-save-btn');
        
        try {
            // Show loading state
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating User...';
            }
            
            if (this.onSave) {
                await this.onSave(formData);
            }
            
            this.close();
            
        } catch (error) {
            console.error('Failed to create user:', error);
            
            // Show error message
            this.showError('Failed to create user. Please try again.');
            
            // Reset button state
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create User';
            }
        }
    }

    showFieldErrors() {
        // Find first invalid field and focus it
        const errorField = this.modal.querySelector('.form-input.error');
        if (errorField) {
            errorField.focus();
            errorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    showError(message) {
        // Create or update error message display
        let errorDiv = this.modal.querySelector('.modal-error');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'modal-error';
            const modalBody = this.modal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.insertBefore(errorDiv, modalBody.firstChild);
            }
        }
        
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <span>${message}</span>
            </div>
        `;
        errorDiv.style.display = 'block';
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
        }, 5000);
    }

    close() {
        if (this.onClose) {
            this.onClose();
        }
        super.close();
    }
}

// Export for global access
window.UserCreateModal = UserCreateModal;