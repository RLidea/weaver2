// Auto-login on page load
document.addEventListener('DOMContentLoaded', async () => {
    await attemptAutoLogin();
});

async function attemptAutoLogin() {
    try {
        // Refresh token이 있는지 확인 (쿠키에서)
        const refreshToken = getCookie('refresh_token');
        if (!refreshToken) return;

        const response = await fetch('/v1/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

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
    errorMessageDiv.textContent = '';

    try {
        const response = await fetch('/v1/auth/sign-in', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password, rememberMe }),
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
