document.getElementById('logout-link').addEventListener('click', async (event) => {
    event.preventDefault();
    try {
        const response = await fetch('/v1/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            window.location.href = '/admin/login'; // Redirect to login page after logout
        } else {
            alert('Logout failed. Please try again.');
        }
    } catch (error) {
        alert('An error occurred during logout.');
    }
});
