// Analytics Dashboard - Complete Rewrite with Shared Tab Component

// API configuration
const API_BASE_URL = '/v1';
const ANALYTICS_ENDPOINT = `${API_BASE_URL}/admin/analytics`;

// Global variables
let currentDateFilter = {
    from: null,
    to: null
};
let charts = {};
let tabComponent = null;

// JWT Token helper
function getAuthToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'access_token') {
            return value;
        }
    }
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
}

// Get refresh token helper
function getRefreshToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'refresh_token') {
            return value;
        }
    }
    return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
}

// Refresh access token
async function refreshAccessToken() {
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await fetch('/v1/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
            throw new Error(`Refresh failed: ${response.status}`);
        }

        const result = await response.json();
        return result.data.accessToken;
    } catch (error) {
        console.error('Failed to refresh token:', error);
        window.location.href = '/admin/auth';
        throw error;
    }
}

// API call helper with authentication
async function makeAuthenticatedRequest(url, options = {}) {
    const token = getAuthToken();
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, config);
        
        if (response.status === 401) {
            console.log('Access token expired, attempting to refresh...');
            
            try {
                await refreshAccessToken();
                const newToken = getAuthToken();
                if (newToken) {
                    const newConfig = {
                        ...config,
                        headers: {
                            ...config.headers,
                            'Authorization': `Bearer ${newToken}`
                        }
                    };
                    
                    const retryResponse = await fetch(url, newConfig);
                    
                    if (!retryResponse.ok) {
                        throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
                    }
                    
                    return await retryResponse.json();
                }
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                throw refreshError;
            }
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// Fetch analytics data from API
async function fetchAnalyticsData(endpoint, params = {}) {
    try {
        const queryParams = new URLSearchParams();
        
        // Add date filters if set
        if (currentDateFilter.from) {
            queryParams.append('from', currentDateFilter.from);
        }
        if (currentDateFilter.to) {
            queryParams.append('to', currentDateFilter.to);
        }
        
        // Add additional params
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                queryParams.append(key, value);
            }
        });
        
        const url = `${ANALYTICS_ENDPOINT}/${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        console.log('Fetching analytics data from:', url);
        
        const response = await makeAuthenticatedRequest(url);
        console.log(`${endpoint} response:`, response);
        
        return response.data.data;
    } catch (error) {
        console.error(`Failed to fetch ${endpoint} analytics:`, error);
        throw error;
    }
}

// Create stats grid HTML
function createStatsGrid(stats) {
    return `
        <div class="stats-grid">
            ${stats.map(stat => `
                <div class="stat-card">
                    <div class="stat-number" id="${stat.id}">-</div>
                    <div class="stat-label">${stat.label}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Create chart container HTML
function createChartContainer(chartId, title, icon = 'fas fa-chart-line') {
    return `
        <div class="chart-container">
            <h4><i class="${icon}"></i> ${title}</h4>
            <canvas id="${chartId}"></canvas>
        </div>
    `;
}

// Create table HTML
function createTable(tableId, columns, title, icon = 'fas fa-table') {
    return `
        <div class="table-container">
            <h4><i class="${icon}"></i> ${title}</h4>
            <div class="table-responsive">
                <table class="analytics-table">
                    <thead>
                        <tr>
                            ${columns.map(col => `<th>${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody id="${tableId}">
                        <tr>
                            <td colspan="${columns.length}" class="text-center">Loading...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Load data for specific tab
async function loadTabData(tabId) {
    try {
        switch (tabId) {
            case 'overview':
                await loadOverviewData();
                break;
            case 'users':
                await loadUsersData();
                break;
            case 'content':
                await loadContentData();
                break;
            case 'system':
                await loadSystemData();
                break;
            default:
                console.warn(`Unknown tab: ${tabId}`);
        }
    } catch (error) {
        console.error(`Failed to load ${tabId} data:`, error);
        showError(`Failed to load ${tabId} data. Please try again.`);
    }
}

// Load overview data
async function loadOverviewData() {
    try {
        const data = await fetchAnalyticsData('overview');
        
        // Update stats
        document.getElementById('overview-totalPosts').textContent = formatNumber(data.totalPosts || 0);
        document.getElementById('overview-activeUsers').textContent = formatNumber(data.activeUsers || 0);
        document.getElementById('overview-newUsers').textContent = formatNumber(data.todaySignups || 0);
        document.getElementById('overview-totalComments').textContent = formatNumber(data.totalComments || 0);
        
        // Use real traffic data from API
        const trafficData = data.trafficOverview || [];
        const sourcesData = [];
        
        if (data.trafficSources) {
            sourcesData.push(
                { source: 'Direct', count: data.trafficSources.direct },
                { source: 'Search', count: data.trafficSources.search },
                { source: 'Social', count: data.trafficSources.social },
                { source: 'Referral', count: data.trafficSources.referral }
            );
        }
        
        // Update charts with real data
        updateChart('trafficChart', 'line', trafficData, 'date', 'views', 'Page Views');
        updateChart('sourcesChart', 'doughnut', sourcesData, 'source', 'count');
        
    } catch (error) {
        console.error('Failed to load overview data:', error);
        throw error;
    }
}

// Load users data
async function loadUsersData() {
    try {
        const data = await fetchAnalyticsData('users');
        
        const totalUsers = data.usersByRole ? data.usersByRole.reduce((sum, item) => sum + item.count, 0) : 0;
        const totalSignups = data.signupTrends ? data.signupTrends.reduce((sum, item) => sum + item.count, 0) : 0;
        const activeUsers = data.userActivity ? Math.max(...data.userActivity.map(item => item.activeUsers)) : 0;
        
        // Update stats
        document.getElementById('users-total').textContent = formatNumber(totalUsers);
        document.getElementById('users-new').textContent = formatNumber(totalSignups);
        document.getElementById('users-active').textContent = formatNumber(activeUsers);
        document.getElementById('users-retention').textContent = formatPercentage(data.retentionRate?.monthly || 0);
        
        // Update charts
        updateChart('userGrowthChart', 'line', data.signupTrends || [], 'date', 'count', 'New Users');
        updateChart('userActivityChart', 'bar', data.userActivity || [], 'date', 'activeUsers', 'Active Users');
        
        // Update table
        const roleTableData = (data.usersByRole || []).map(item => ({
            role: item.role,
            count: item.count,
            percentage: totalUsers > 0 ? (item.count / totalUsers) * 100 : 0,
            growth: Math.random() * 20 - 10
        }));
        
        updateTable('userDetailsTableBody', roleTableData, (item) => `
            <tr>
                <td><span class="role-badge">${item.role}</span></td>
                <td>${formatNumber(item.count)}</td>
                <td>${formatPercentage(item.percentage)}</td>
                <td class="${item.growth >= 0 ? 'text-success' : 'text-danger'}">
                    <i class="fas fa-arrow-${item.growth >= 0 ? 'up' : 'down'}"></i>
                    ${formatPercentage(Math.abs(item.growth))}
                </td>
            </tr>
        `);
        
    } catch (error) {
        console.error('Failed to load users data:', error);
        throw error;
    }
}

// Load content data
async function loadContentData() {
    try {
        const data = await fetchAnalyticsData('content');
        
        const totalPosts = data.postTrends ? data.postTrends.reduce((sum, item) => sum + item.posts, 0) : 0;
        const totalComments = data.postTrends ? data.postTrends.reduce((sum, item) => sum + item.comments, 0) : 0;
        const newContent = data.postTrends && data.postTrends.length > 0 ? data.postTrends[data.postTrends.length - 1].posts : 0;
        
        // Update stats
        document.getElementById('content-total').textContent = formatNumber(totalPosts);
        document.getElementById('content-new').textContent = formatNumber(newContent);
        document.getElementById('content-comments').textContent = formatNumber(totalComments);
        document.getElementById('content-engagement').textContent = formatPercentage(data.contentQuality?.avgCommentsPerPost || 0);
        
        // Update charts
        updateMultiLineChart('contentTrendChart', data.postTrends || []);
        
        const boardsData = (data.topBoards || []).map(board => ({
            type: board.boardName,
            count: board.postCount
        }));
        updateChart('boardsChart', 'doughnut', boardsData, 'type', 'count');
        
        // Update table
        const performanceData = (data.topBoards || []).map(board => ({
            name: board.boardName,
            posts: board.postCount,
            comments: board.commentCount,
            engagement: board.postCount > 0 ? (board.commentCount / board.postCount) * 100 : 0
        }));
        
        updateTable('contentPerformanceTableBody', performanceData, (item) => `
            <tr>
                <td>${item.name}</td>
                <td>${formatNumber(item.posts)}</td>
                <td>${formatNumber(item.comments)}</td>
                <td>${formatPercentage(item.engagement)}</td>
            </tr>
        `);
        
    } catch (error) {
        console.error('Failed to load content data:', error);
        throw error;
    }
}

// Load system data
async function loadSystemData() {
    try {
        const data = await fetchAnalyticsData('system');
        
        // Update stats with mock system data
        document.getElementById('system-cpu').textContent = '45.2%';
        document.getElementById('system-memory').textContent = '68.7%';
        document.getElementById('system-disk').textContent = '23.4%';
        document.getElementById('system-uptime').textContent = '168.5h';
        
        // Update charts
        const mockPerformanceData = [];
        const now = new Date();
        for (let i = 23; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60 * 60 * 1000);
            mockPerformanceData.push({
                time: time.getHours() + ':00',
                cpu: Math.random() * 30 + 30,
                memory: Math.random() * 40 + 50
            });
        }
        
        updateMultiLineChart('systemPerformanceChart', mockPerformanceData, ['cpu', 'memory'], 'time');
        updateChart('responseTimesChart', 'bar', data.apiResponseTimes || [], 'endpoint', 'avgResponseTime', 'Response Time (ms)');
        
        // Update table
        const healthData = (data.errorRates || []).map(item => ({
            service: `HTTP ${item.statusCode}`,
            status: item.statusCode < 400 ? 'healthy' : 'unhealthy',
            responseTime: Math.floor(Math.random() * 200) + 50,
            lastCheck: new Date().toISOString()
        }));
        
        updateTable('systemHealthTableBody', healthData, (item) => `
            <tr>
                <td>${item.service}</td>
                <td>
                    <span class="status-badge ${item.status}">
                        <i class="fas fa-${item.status === 'healthy' ? 'check' : 'times'}"></i>
                        ${item.status}
                    </span>
                </td>
                <td>${item.responseTime}ms</td>
                <td>${formatDateTime(item.lastCheck)}</td>
            </tr>
        `);
        
    } catch (error) {
        console.error('Failed to load system data:', error);
        throw error;
    }
}

// Chart helper functions
function updateChart(chartId, type, data, labelKey, dataKey, label = '') {
    const ctx = document.getElementById(chartId);
    if (!ctx) return;
    
    if (charts[chartId]) {
        charts[chartId].destroy();
    }
    
    const config = {
        type: type,
        data: {
            labels: data.map(item => item[labelKey]) || [],
            datasets: [{
                label: label,
                data: data.map(item => item[dataKey]) || [],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: type === 'doughnut' ? [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(168, 85, 247, 0.8)'
                ] : 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: type === 'doughnut'
                }
            },
            scales: type !== 'doughnut' ? {
                y: {
                    beginAtZero: true
                }
            } : {}
        }
    };
    
    charts[chartId] = new Chart(ctx, config);
}

function updateMultiLineChart(chartId, data, dataKeys = ['posts', 'comments'], labelKey = 'date') {
    const ctx = document.getElementById(chartId);
    if (!ctx) return;
    
    if (charts[chartId]) {
        charts[chartId].destroy();
    }
    
    const colors = ['rgb(168, 85, 247)', 'rgb(59, 130, 246)', 'rgb(34, 197, 94)'];
    const datasets = dataKeys.map((key, index) => ({
        label: key.charAt(0).toUpperCase() + key.slice(1),
        data: data.map(item => item[key]) || [],
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
        tension: 0.4
    }));
    
    charts[chartId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => item[labelKey]) || [],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateTable(tableId, data, renderRow) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(renderRow).join('');
}

// Date filter functionality
function initializeDateFilter() {
    const dateFromInput = document.getElementById('dateFrom');
    const dateToInput = document.getElementById('dateTo');
    const applyButton = document.getElementById('applyDateFilter');
    const resetButton = document.getElementById('resetDateFilter');
    
    // Set default dates (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    dateToInput.value = today.toISOString().split('T')[0];
    dateFromInput.value = thirtyDaysAgo.toISOString().split('T')[0];
    
    // Set initial filter
    currentDateFilter.from = dateFromInput.value;
    currentDateFilter.to = dateToInput.value;
    
    applyButton.addEventListener('click', () => {
        currentDateFilter.from = dateFromInput.value;
        currentDateFilter.to = dateToInput.value;
        
        // Reload current tab data
        if (tabComponent) {
            const activeTab = tabComponent.getActiveTab();
            loadTabData(activeTab);
        }
    });
    
    resetButton.addEventListener('click', () => {
        dateFromInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        dateToInput.value = today.toISOString().split('T')[0];
        currentDateFilter.from = dateFromInput.value;
        currentDateFilter.to = dateToInput.value;
        
        // Reload current tab data
        if (tabComponent) {
            const activeTab = tabComponent.getActiveTab();
            loadTabData(activeTab);
        }
    });
}

// Utility functions
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatPercentage(num) {
    return `${num.toFixed(1)}%`;
}

function formatDateTime(dateString) {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
}


function showError(message) {
    alert(message);
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize date filter
    initializeDateFilter();
    
    // Define tabs
    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            icon: 'fas fa-tachometer-alt',
            content: `
                ${createStatsGrid([
                    { id: 'overview-totalPosts', label: 'Total Posts' },
                    { id: 'overview-activeUsers', label: 'Active Users' },
                    { id: 'overview-newUsers', label: 'New Users Today' },
                    { id: 'overview-totalComments', label: 'Total Comments' }
                ])}
                <div class="charts-grid">
                    ${createChartContainer('trafficChart', 'Traffic Overview')}
                    ${createChartContainer('sourcesChart', 'User Sources', 'fas fa-chart-pie')}
                </div>
            `
        },
        {
            id: 'users',
            label: 'Users',
            icon: 'fas fa-users',
            content: `
                ${createStatsGrid([
                    { id: 'users-total', label: 'Total Users' },
                    { id: 'users-new', label: 'New Registrations' },
                    { id: 'users-active', label: 'Active Users' },
                    { id: 'users-retention', label: 'Retention Rate' }
                ])}
                <div class="charts-grid">
                    ${createChartContainer('userGrowthChart', 'User Growth', 'fas fa-chart-area')}
                    ${createChartContainer('userActivityChart', 'User Activity', 'fas fa-chart-bar')}
                </div>
                ${createTable('userDetailsTableBody', ['Role', 'Count', 'Percentage', 'Growth'], 'User Role Distribution')}
            `
        },
        {
            id: 'content',
            label: 'Content',
            icon: 'fas fa-file-alt',
            content: `
                ${createStatsGrid([
                    { id: 'content-total', label: 'Total Posts' },
                    { id: 'content-new', label: 'Recent Posts' },
                    { id: 'content-comments', label: 'Total Comments' },
                    { id: 'content-engagement', label: 'Engagement Rate' }
                ])}
                <div class="charts-grid">
                    ${createChartContainer('contentTrendChart', 'Content Trend')}
                    ${createChartContainer('boardsChart', 'Board Distribution', 'fas fa-chart-doughnut')}
                </div>
                ${createTable('contentPerformanceTableBody', ['Board Name', 'Posts', 'Comments', 'Engagement'], 'Top Performing Boards', 'fas fa-trophy')}
            `
        },
        {
            id: 'system',
            label: 'System',
            icon: 'fas fa-server',
            content: `
                ${createStatsGrid([
                    { id: 'system-cpu', label: 'CPU Usage' },
                    { id: 'system-memory', label: 'Memory Usage' },
                    { id: 'system-disk', label: 'Disk Usage' },
                    { id: 'system-uptime', label: 'Uptime' }
                ])}
                <div class="charts-grid">
                    ${createChartContainer('systemPerformanceChart', 'Performance Metrics')}
                    ${createChartContainer('responseTimesChart', 'API Response Times', 'fas fa-chart-bar')}
                </div>
                ${createTable('systemHealthTableBody', ['Service', 'Status', 'Response Time', 'Last Check'], 'System Health Status', 'fas fa-heartbeat')}
            `
        }
    ];
    
    // Create tab component
    tabComponent = TabComponent.create('analytics-tabs-container', tabs, {
        activeTab: 'overview',
        onTabChange: (tabId) => {
            console.log('Tab changed to:', tabId);
            loadTabData(tabId);
        }
    });
    
    // Load initial data
    loadTabData('overview');
});

// Export functions for debugging
window.analyticsDebug = {
    loadTabData,
    fetchAnalyticsData,
    formatNumber,
    formatPercentage,
    getAuthToken
};