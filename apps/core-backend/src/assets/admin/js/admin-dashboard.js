document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/v1/admin/dashboard/summary');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        document.getElementById('totalUsers').textContent = (data.data.totalUsers ?? 0).toLocaleString();
        document.getElementById('todaySignups').textContent = (data.data.todaySignups ?? 0).toLocaleString();
        document.getElementById('totalPosts').textContent = (data.data.totalPosts ?? 0).toLocaleString();
        document.getElementById('todayPosts').textContent = (data.data.todayPosts ?? 0).toLocaleString();
        document.getElementById('totalComments').textContent = (data.data.totalComments ?? 0).toLocaleString();
        document.getElementById('todayComments').textContent = (data.data.todayComments ?? 0).toLocaleString();
        document.getElementById('activeUsers').textContent = (data.data.activeUsers ?? 0).toLocaleString();

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        // Optionally, display an error message on the dashboard
    }
});