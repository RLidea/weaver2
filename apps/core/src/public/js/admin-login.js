document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessageDiv = document.getElementById('errorMessage');
    errorMessageDiv.textContent = '';

    try {
        const response = await fetch('/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
            window.location.href = '/admin/dashboard';
        } else {
            const errorData = await response.json();
            errorMessageDiv.textContent = errorData.error.message || 'Login failed';
        }
    } catch (error) {
        errorMessageDiv.textContent = 'An error occurred. Please try again.';
    }
});
