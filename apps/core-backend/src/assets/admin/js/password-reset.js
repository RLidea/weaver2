// Password Reset Page Script
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('reset-form');
    const passwordInput = document.getElementById('password');
    const passwordConfirmInput = document.getElementById('password-confirm');
    const messageContainer = document.getElementById('message-container');
    const submitButton = form.querySelector('button[type="submit"]');
    const loadingSpinner = submitButton.querySelector('.loading-spinner');

    // 비밀번호 표시/숨기기 토글
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            
            if (targetInput.type === 'password') {
                targetInput.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                targetInput.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });

    // 비밀번호 일치 확인
    passwordConfirmInput.addEventListener('input', function() {
        if (passwordInput.value && this.value) {
            if (passwordInput.value !== this.value) {
                this.setCustomValidity('Passwords do not match.');
            } else {
                this.setCustomValidity('');
            }
        }
    });

    // 비밀번호 입력 시 확인 필드 재검사
    passwordInput.addEventListener('input', function() {
        if (passwordConfirmInput.value) {
            passwordConfirmInput.dispatchEvent(new Event('input'));
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // 메시지 초기화
        messageContainer.innerHTML = '';
        
        // 비밀번호 일치 확인
        if (passwordInput.value !== passwordConfirmInput.value) {
            displayMessage('Passwords do not match.', 'error');
            return;
        }

        // URL에서 토큰 추출
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            displayMessage('Invalid or missing reset token.', 'error');
            return;
        }

        // 로딩 상태 시작
        setLoading(true);

        try {
            // ApiClient 가 CSRF 토큰을 싣는다 — 맨 fetch 면 403 이다
            const response = await window.ApiClient.post('/v1/auth/password/reset', {
                token: token,
                password: passwordInput.value,
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                // 오류 본문은 { error: { message } } 로 온다
                const message = (result.error && result.error.message) || result.message;
                throw new Error(message || 'An unknown error occurred.');
            }

            displayMessage('Password has been reset successfully!', 'success');
            form.style.display = 'none';
            
            // 3초 후 로그인 페이지로 리다이렉트
            setTimeout(() => {
                window.location.href = '/admin/login';
            }, 3000);

        } catch (error) {
            displayMessage(`Error: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        submitButton.disabled = isLoading;
        loadingSpinner.style.display = isLoading ? 'inline-block' : 'none';
        
        if (isLoading) {
            submitButton.classList.add('loading');
        } else {
            submitButton.classList.remove('loading');
        }
    }

    function displayMessage(message, type) {
        const messageDiv = document.createElement('div');
        // admin-login.css 의 .error-message 는 .show 가 있어야 보인다
        messageDiv.className = `${type}-message show`;
        
        // 메시지는 서버에서 온다 — innerHTML 이 아니라 텍스트 노드로 붙인다
        const icon = document.createElement('i');
        icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
        messageDiv.append(icon, ` ${message}`);
        
        messageContainer.appendChild(messageDiv);
        
        // 메시지를 부드럽게 나타나게 하기
        setTimeout(() => {
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        }, 100);
    }
});