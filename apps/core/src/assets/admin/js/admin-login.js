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

// Auto-login on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await waitForApiClient();
        await attemptAutoLogin();
    } catch (error) {
        console.error('Failed to initialize ApiClient:', error);
    }
});

async function attemptAutoLogin() {
    try {
        // Refresh token이 있는지 확인 (쿠키에서)
        const refreshToken = getCookie('refresh_token');
        if (!refreshToken) return;

        const response = await window.ApiClient.post('/v1/auth/refresh', { refreshToken });

        if (response.ok) {
            window.location.href = '/admin/dashboard';
        }
    } catch (error) {
        console.log('Auto-login failed:', error);
        // 자동 로그인 실패 시 쿠키 삭제
        deleteCookie('refresh_token');
    }
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const errorMessageDiv = document.getElementById('errorMessage');
    const loginButton = document.querySelector('.login-button');
    
    // Clear previous error and show loading state
    hideError();
    setLoading(true);

    try {
        // Ensure ApiClient is available
        await waitForApiClient();
        const response = await window.ApiClient.post('/v1/auth/sign-in', { email, password, rememberMe });

        if (response.ok) {
            window.location.href = '/admin/dashboard';
        } else {
            const errorData = await response.json();
            let errorMessage = 'Login failed. Please check your credentials.';
            
            // Handle different error types
            if (errorData.error && errorData.error.message) {
                errorMessage = errorData.error.message;
            } else if (response.status === 401) {
                errorMessage = 'Invalid email or password. Please try again.';
            } else if (response.status === 429) {
                errorMessage = 'Too many login attempts. Please try again later.';
            } else if (response.status >= 500) {
                errorMessage = 'Server error. Please try again later.';
            }
            
            showError(errorMessage);
            setLoading(false);
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Connection error. Please check your internet connection and try again.');
        setLoading(false);
    }
});

// Helper functions
function showError(message) {
    const errorMessageDiv = document.getElementById('errorMessage');
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.add('show');
}

function hideError() {
    const errorMessageDiv = document.getElementById('errorMessage');
    errorMessageDiv.textContent = '';
    errorMessageDiv.classList.remove('show');
}

function setLoading(isLoading) {
    const loginButton = document.querySelector('.login-button');
    const buttonText = loginButton.querySelector('i');
    const spinner = loginButton.querySelector('.loading-spinner');
    
    if (isLoading) {
        loginButton.disabled = true;
        loginButton.classList.add('loading');
        buttonText.style.display = 'none';
        spinner.style.display = 'inline-block';
    } else {
        loginButton.disabled = false;
        loginButton.classList.remove('loading');
        buttonText.style.display = 'inline';
        spinner.style.display = 'none';
    }
}

// Utility functions for cookie management
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}
