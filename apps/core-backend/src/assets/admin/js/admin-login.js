
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

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin login page loaded');
    // 서버사이드에서 인증 체크를 완료했으므로 클라이언트 로직 불필요
    
    // Update page title with site name
    updateLoginPageTitle();
});

// Update login page title with default site name (no API call needed for login page)
async function updateLoginPageTitle() {
    try {
        // Use default site name for login page since it's accessed without authentication
        const siteName = 'Weaver2'; // Default site name
        
        // Update title format: "[SiteName] - Admin Login - Secure Access"
        document.title = `${siteName} - Admin Login - Secure Access`;
        console.log(`Login page title updated to: ${document.title}`);
    } catch (error) {
        console.error('Error updating login page title:', error);
        // Keep original title on error
    }
}

// 로그인 뒤 들어가는 관리자 화면 (뷰 경로는 /admin 과 /admin/security 뿐이다)
const ADMIN_HOME = '/admin/security';

// 백엔드 오류 본문에서 사람이 읽을 메시지를 꺼낸다
async function readErrorMessage(response, fallback) {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.error && errorData.error.message) return errorData.error.message;
    if (errorData.message) return errorData.message;
    if (response.status === 429) return 'Too many attempts. Please try again later.';
    if (response.status >= 500) return 'Server error. Please try again later.';
    return fallback;
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const loginForm = event.currentTarget;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Clear previous error and show loading state
    hideError();
    setLoading(loginForm, true);

    try {
        // Ensure ApiClient is available
        await waitForApiClient();
        const response = await window.ApiClient.post('/v1/auth/sign-in', { email, password, rememberMe });

        if (response.ok) {
            // 2FA 를 켠 계정은 세션 대신 pre_auth 쿠키와 고를 수 있는 수단만 받는다
            const result = await response.json().catch(() => ({}));
            if (result.data && result.data.twoFactorRequired) {
                setLoading(loginForm, false);
                startTwoFactor(result.data.availableMethods);
                return;
            }
            window.location.href = ADMIN_HOME;
        } else {
            const fallback = response.status === 401
                ? 'Invalid email or password. Please try again.'
                : 'Login failed. Please check your credentials.';
            showError(await readErrorMessage(response, fallback));
            setLoading(loginForm, false);
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Connection error. Please check your internet connection and try again.');
        setLoading(loginForm, false);
    }
});

// ── 2FA step ─────────────────────────────────────────────

function selectedTwoFactorMethod() {
    const checked = document.querySelector('input[name="twoFactorMethod"]:checked');
    return checked ? checked.value : null;
}

function updateTwoFactorHint() {
    const isEmail = selectedTwoFactorMethod() === 'email';
    document.getElementById('twoFactorHint').textContent = isEmail
        ? 'Send a code to your email, then enter it below.'
        : 'Enter the 6-digit code from your authenticator app.';
    document.getElementById('sendEmailCode').hidden = !isEmail;
}

// availableMethods 는 { totp: boolean, email: boolean } 이다
function startTwoFactor(availableMethods) {
    const methods = ['totp', 'email'].filter((m) => availableMethods && availableMethods[m]);
    document.getElementById('loginForm').hidden = true;
    document.getElementById('twoFactorForm').hidden = false;

    // 쓸 수 있는 수단만 남기고, 둘 다면 고르게 한다 (TOTP 가 먼저)
    const radios = document.querySelectorAll('input[name="twoFactorMethod"]');
    radios.forEach((radio) => {
        radio.closest('label').hidden = !methods.includes(radio.value);
    });
    const first = Array.from(radios).find((radio) => methods.includes(radio.value));
    if (first) first.checked = true;
    document.getElementById('twoFactorMethods').hidden = methods.length < 2;

    updateTwoFactorHint();
    const codeInput = document.getElementById('twoFactorCode');
    codeInput.value = '';
    codeInput.focus();
}

function showSignInForm() {
    document.getElementById('twoFactorForm').hidden = true;
    document.getElementById('loginForm').hidden = false;
    document.getElementById('password').value = '';
    document.getElementById('password').focus();
}

document.querySelectorAll('input[name="twoFactorMethod"]').forEach((radio) => {
    radio.addEventListener('change', updateTwoFactorHint);
});

document.getElementById('sendEmailCode').addEventListener('click', async () => {
    hideError();
    try {
        const response = await window.ApiClient.post('/v1/auth/2fa/email/send');
        if (response.ok) {
            document.getElementById('twoFactorHint').textContent = 'A code was sent to your email. Enter it below.';
        } else {
            showError(await readErrorMessage(response, 'Could not send the code. Please try again.'));
        }
    } catch (error) {
        console.error('Send code error:', error);
        showError('Connection error. Please check your internet connection and try again.');
    }
});

document.getElementById('twoFactorForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const twoFactorForm = event.currentTarget;
    const method = selectedTwoFactorMethod();
    const code = document.getElementById('twoFactorCode').value.trim();

    hideError();
    setLoading(twoFactorForm, true);

    try {
        const response = await window.ApiClient.post('/v1/auth/2fa/authenticate', { method, code });
        if (response.ok) {
            window.location.href = ADMIN_HOME;
            return;
        }
        showError(await readErrorMessage(response, 'Verification failed. Please try again.'));
        setLoading(twoFactorForm, false);
    } catch (error) {
        console.error('2FA error:', error);
        showError('Connection error. Please check your internet connection and try again.');
        setLoading(twoFactorForm, false);
    }
});

// 2FA 단계를 그만둔다 — 세션이 없어 로그아웃 대신 pre_auth 쿠키를 지운다
document.getElementById('backToSignIn').addEventListener('click', async () => {
    hideError();
    try {
        await window.ApiClient.delete('/v1/auth/2fa/pending');
    } catch (error) {
        console.error('Abandon 2FA error:', error);
    }
    showSignInForm();
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

function setLoading(form, isLoading) {
    const button = form.querySelector('.login-button');
    const buttonIcon = button.querySelector('i');
    const spinner = button.querySelector('.loading-spinner');
    
    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
        buttonIcon.style.display = 'none';
        spinner.style.display = 'inline-block';
    } else {
        button.disabled = false;
        button.classList.remove('loading');
        buttonIcon.style.display = 'inline';
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
