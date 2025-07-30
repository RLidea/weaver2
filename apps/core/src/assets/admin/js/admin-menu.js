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
    // Load admin menu
    fetch('/admin/partials/_admin-menu.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('admin-menu-placeholder').innerHTML = html;

            // Attach logout event listener after menu is loaded
            const logoutLink = document.getElementById('logout-link');
            if (logoutLink) {
                logoutLink.addEventListener('click', async (event) => {
                    event.preventDefault();
                    try {
                        const response = await fetch('/v1/auth/sign-out', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        });
                        if (response.ok) {
                            window.location.href = '/admin/login'; // Redirect to login page after logout
                        } else {
                            console.error('Logout failed');
                            alert('Logout failed. Please try again.');
                        }
                    } catch (error) {
                        console.error('Error during logout:', error);
                        alert('An error occurred during logout.');
                    }
                });
            }
        })
        .catch(error => console.error('Error loading admin menu:', error));
    
    // Update page title with site name from system settings
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
            
            // Get current page title or use provided default
            const currentTitle = document.title;
            const pageTitle = defaultPageTitle || currentTitle;
            
            // Update title format: "[SiteName] - [PageTitle]"
            if (pageTitle && !pageTitle.includes(siteName)) {
                document.title = `${siteName} - ${pageTitle.replace(/^.*? - /, '')}`;
            }
            
            console.log(`Page title updated to: ${document.title}`);
        }
    } catch (error) {
        console.error('Error updating page title:', error);
        // Keep original title on error
    }
}
