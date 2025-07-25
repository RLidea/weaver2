// Common Modal Base Class
// Contains shared functionality for all modal types

class CommonModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.currentData = null;
        this.onClose = null;
        this.handleKeydown = null;
        
        // Animation settings
        this.animationDuration = 300;
    }

    // Common modal creation logic
    createModal(overlayClass) {
        // Remove existing modal if any
        this.destroy();

        // Create modal overlay
        this.modal = document.createElement('div');
        this.modal.className = overlayClass;

        // Add to DOM
        document.body.appendChild(this.modal);
        document.body.style.overflow = 'hidden';

        return this.modal;
    }

    // Common event binding
    bindCommonEvents() {
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
            if (e.key === 'Escape' && this.isOpen && this.canClose()) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.handleKeydown);
    }

    // Common modal display logic with animation
    showModal() {
        if (!this.modal) return;

        // Show modal with animation
        requestAnimationFrame(() => {
            this.modal.classList.add('show');
            this.isOpen = true;
        });
    }

    // Override in child classes if needed (e.g., when form is being saved)
    canClose() {
        return true;
    }

    // Common close logic
    close() {
        if (!this.modal || !this.isOpen || !this.canClose()) return;

        this.modal.classList.remove('show');
        this.isOpen = false;

        // Wait for animation to complete before removing
        setTimeout(() => {
            this.destroy();
        }, this.animationDuration);
    }

    // Common cleanup logic
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

    // Common utility methods
    formatDate(dateString) {
        if (!dateString || dateString === 'Never') return 'Never';
        
        try {
            const date = new Date(dateString);
            // Check if date is valid
            if (isNaN(date.getTime())) {
                return 'Never';
            }
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Never';
        }
    }

    // Generate user initials
    getUserInitials(user) {
        return (user.displayName || user.username || '')
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();
    }

    // Common modal header HTML
    generateModalHeader(title, iconClass = 'fas fa-window-maximize') {
        return `
            <div class="modal-header">
                <h2 id="modal-title" class="modal-title">
                    <i class="${iconClass}"></i>
                    ${title}
                </h2>
                <button class="modal-close-btn" type="button" aria-label="Close modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    // Common user avatar HTML
    generateUserAvatar(user, size = 'large') {
        const initials = this.getUserInitials(user);
        const sizeClass = size === 'large' ? 'user-avatar-large' : 'user-avatar';
        
        return `<div class="${sizeClass}">${initials}</div>`;
    }

    // Common status badges HTML
    generateStatusBadges(user) {
        const statusClass = user.status === 'active' ? 'success' : 
                           user.status === 'suspended' ? 'warning' : 'error';
        
        return `
            <div class="user-status-container">
                <span class="weaver-status-badge ${statusClass}">
                    ${user.status}
                </span>
                <span class="weaver-status-badge info">${user.role}</span>
            </div>
        `;
    }

    // Common detail item HTML
    generateDetailItem(icon, label, value) {
        return `
            <div class="detail-item">
                <div class="detail-label">
                    <i class="${icon}"></i>
                    ${label}
                </div>
                <div class="detail-value">${value}</div>
            </div>
        `;
    }

    // Common info item HTML (for forms)
    generateInfoItem(icon, label, value) {
        return `
            <div class="info-item">
                <span class="info-label">
                    <i class="${icon}"></i>
                    ${label}
                </span>
                <span class="info-value">${value}</span>
            </div>
        `;
    }

    // Abstract methods that child classes should implement
    generateModalHTML(data) {
        throw new Error('generateModalHTML must be implemented by child classes');
    }

    bindEvents() {
        this.bindCommonEvents();
        // Child classes can override this to add additional event binding
    }

    // Main create method that follows the template pattern
    create(data, options = {}) {
        this.currentData = data;
        this.onClose = options.onClose || null;

        // Create the modal structure
        const overlayClass = this.getOverlayClass();
        this.createModal(overlayClass);
        
        // Generate and set the HTML content
        this.modal.innerHTML = this.generateModalHTML(data);
        
        // Bind events
        this.bindEvents();
        
        // Show the modal
        this.showModal();

        return this.modal;
    }

    // Abstract method for overlay class name
    getOverlayClass() {
        throw new Error('getOverlayClass must be implemented by child classes');
    }

    // Static show method that can be overridden
    static show(data, options = {}) {
        const modal = new this();
        return modal.create(data, options);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.CommonModal = CommonModal;
}