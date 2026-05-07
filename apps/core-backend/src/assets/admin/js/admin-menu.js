// Wait for ApiClient to be available
function waitForApiClient() {
    return new Promise((resolve) => {
        if (typeof window.ApiClient !== 'undefined') {
            resolve();
        } else {
            console.log('ApiClient not ready, waiting...');
            const checkInterval = setInterval(() => {
                if (typeof window.ApiClient !== 'undefined') {
                    console.log('ApiClient is now available');
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const placeholder = document.getElementById('admin-menu-placeholder');
    if (placeholder) {
        placeholder.innerHTML = `
            <nav class="admin-nav">
                <div class="admin-nav-brand">
                    <i class="fas fa-shield-alt"></i>
                    <span id="admin-site-name">Admin</span>
                </div>
                <div class="admin-nav-actions">
                    <a href="#" id="logout-link" class="admin-nav-logout">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </nav>`;

        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', async (event) => {
                event.preventDefault();
                try {
                    const response = await fetch('/v1/auth/sign-out', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                    });
                    if (response.ok) {
                        window.location.href = '/admin/login';
                    } else {
                        alert('Logout failed. Please try again.');
                    }
                } catch (error) {
                    console.error('Error during logout:', error);
                    alert('An error occurred during logout.');
                }
            });
        }
    }

    updatePageTitle();
});

// Global function to update page title with site name
async function updatePageTitle(defaultPageTitle = '') {
    try {
        await waitForApiClient();
        
        const response = await window.ApiClient.get('/v1/admin/system-settings');
        if (response.ok) {
            const responseData = await response.json();
            
            // Extract site name from response
            let siteName = 'Weaver2'; // Default fallback
            if (responseData && responseData.data && responseData.data.siteName) {
                siteName = responseData.data.siteName;
            } else if (responseData && responseData.siteName) {
                siteName = responseData.siteName;
            }
            
            const currentTitle = document.title;
            const pageTitle = defaultPageTitle || currentTitle;
            if (pageTitle && !pageTitle.includes(siteName)) {
                document.title = `${siteName} - ${pageTitle.replace(/^.*? - /, '')}`;
            }

            const brandEl = document.getElementById('admin-site-name');
            if (brandEl) brandEl.textContent = siteName;
        }
    } catch (error) {
        console.error('Error updating page title:', error);
        // Keep original title on error
    }
}
