// Request Password Reset Page Script
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = window.location.origin;
    const form = document.getElementById('resetRequestForm');
    const emailInput = document.getElementById('email');
    const successContainer = document.getElementById('success-container');
    const submitButton = form.querySelector('button[type="submit"]');
    const loadingSpinner = submitButton.querySelector('.loading-spinner');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // 로딩 상태 시작
        setLoading(true);
        successContainer.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/v1/auth/password/request-reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: emailInput.value.trim()
                })
            });

            const result = await response.json();

            if (response.ok) {
                // 성공 메시지 표시
                successContainer.style.display = 'block';
                form.style.display = 'none';
                
                // 5초 후 로그인 페이지로 리다이렉트
                setTimeout(() => {
                    window.location.href = '/admin/login';
                }, 5000);
            } else {
                // 에러 처리 - 보안상 항상 성공 메시지 표시
                successContainer.style.display = 'block';
                form.style.display = 'none';
                
                setTimeout(() => {
                    window.location.href = '/admin/login';
                }, 5000);
            }
        } catch (error) {
            console.error('Password reset request failed:', error);
            
            // 네트워크 에러도 보안상 성공 메시지 표시
            successContainer.style.display = 'block';
            form.style.display = 'none';
            
            setTimeout(() => {
                window.location.href = '/admin/login';
            }, 5000);
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

    // 이메일 입력 시 실시간 유효성 검사
    emailInput.addEventListener('input', function() {
        const email = this.value.trim();
        const isValid = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        
        if (email && !isValid) {
            this.setCustomValidity('Please enter a valid email address.');
        } else {
            this.setCustomValidity('');
        }
    });
});