document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/admin/dashboard/summary');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        document.getElementById('totalUsers').textContent = data.totalUsers.toLocaleString();
        document.getElementById('todaySignups').textContent = data.todaySignups.toLocaleString();
        document.getElementById('totalPosts').textContent = data.totalPosts.toLocaleString();
        document.getElementById('todayPosts').textContent = data.todayPosts.toLocaleString();
        document.getElementById('totalComments').textContent = data.totalComments.toLocaleString();
        document.getElementById('todayComments').textContent = data.todayComments.toLocaleString();
        document.getElementById('activeUsers').textContent = data.activeUsers.toLocaleString();
        document.getElementById('bannedUsers').textContent = data.bannedUsers.toLocaleString();

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        // Optionally, display an error message on the dashboard
    }
});
