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
});
