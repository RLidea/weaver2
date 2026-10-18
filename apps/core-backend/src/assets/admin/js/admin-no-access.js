// 권한 없음 화면 — 로그아웃이 유일한 출구다.
// 로그인 화면은 refresh 쿠키가 살아 있으면 다시 관리자 화면으로 보내므로, 쿠키를 지워야 돌아갈 수 있다.
document.getElementById('signOutButton').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const errorMessageDiv = document.getElementById('errorMessage');
    button.disabled = true;
    errorMessageDiv.classList.remove('show');

    try {
        const response = await window.ApiClient.post('/v1/auth/sign-out');
        if (response.ok) {
            window.location.href = '/admin/login';
            return;
        }
        errorMessageDiv.textContent = 'Sign out failed. Please try again.';
    } catch (error) {
        console.error('Sign out error:', error);
        errorMessageDiv.textContent = 'Connection error. Please try again.';
    }
    errorMessageDiv.classList.add('show');
    button.disabled = false;
});
