// User Management with Data Table Component - Real API Integration

// API configuration
const API_BASE_URL = '/v1';
const USERS_ENDPOINT = `${API_BASE_URL}/users`;

// JWT Token helper
function getAuthToken() {
    // Try to get token from cookie first (for admin session)
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'access_token') {
            return value;
        }
    }
    
    // Try localStorage as fallback
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
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
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// Fetch users from API
async function fetchUsers(page = 1, limit = 10, sort = 'createdAt:desc', search = '') {
    try {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            sort: sort
        });
        
        if (search) {
            params.append('search', search);
        }
        
        const response = await makeAuthenticatedRequest(`${USERS_ENDPOINT}?${params}`);
        
        return {
            users: response.data.data || [],
            pagination: {
                total: response.data.total || 0,
                currentPage: response.data.currentPage || 1,
                lastPage: response.data.lastPage || 1,
                limit: response.data.limit || limit
            }
        };
    } catch (error) {
        console.error('Failed to fetch users:', error);
        throw error;
    }
}

// Transform API data to match our table structure
function transformUserData(apiUsers) {
    return apiUsers.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        email: user.email || user.username + '@example.com', // Fallback email
        role: user.role,
        status: user.deletedAt ? 'inactive' : 'active',
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt || 'Never',
        profileImageUrl: user.profileImageUrl
    }));
}

// Define table columns based on API response structure
const userColumns = [
    {
        key: 'user',
        label: 'User',
        type: 'user',
        sortable: true,
        render: (value, row) => {
            const initials = (row.displayName || row.username || '').split(' ').map(n => n[0]).join('').toUpperCase();
            return `
                <div class="user-info">
                    <div class="user-avatar">${initials}</div>
                    <div class="user-details">
                        <div class="user-name">${row.displayName || row.username}</div>
                        <div class="user-username">@${row.username}</div>
                    </div>
                </div>
            `;
        }
    },
    {
        key: 'email',
        label: 'Email',
        sortable: true
    },
    {
        key: 'role',
        label: 'Role',
        type: 'role',
        sortable: true,
        filterable: true
    },
    {
        key: 'status',
        label: 'Status',
        type: 'status',
        sortable: true,
        filterable: true
    },
    {
        key: 'createdAt',
        label: 'Created Date',
        type: 'date',
        sortable: true
    },
    {
        key: 'lastLoginAt',
        label: 'Last Login',
        type: 'date',
        sortable: true
    },
    {
        key: 'actions',
        label: 'Actions',
        type: 'actions',
        sortable: false
    }
];

// Global variable to store current table instance
let userTable;

// Initialize data table when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    const container = document.getElementById('user-data-table-container');
    
    if (!container) {
        console.error('Data table container not found');
        return;
    }

    // Initialize the data table with empty data first
    userTable = new WeaverDataTable({
        container: container,
        data: [],
        columns: userColumns,
        title: 'User Management',
        searchable: true,
        sortable: true,
        filterable: true,
        pagination: true,
        perPageOptions: [5, 10, 25, 50],
        defaultPerPage: 10,
        showAddButton: true,
        addButtonText: 'Add New User',
        emptyMessage: 'No users found',
        emptyDescription: 'There are no users to display',
        onAdd: function() {
            handleAddUser();
        },
        onEdit: function(user) {
            handleEditUser(user);
        },
        onDelete: function(user) {
            handleDeleteUser(user);
        },
        onView: function(user) {
            handleViewUser(user);
        },
        onSearch: function(query) {
            console.log('Search:', query);
            loadUsers(1, userTable.state.perPage, 'createdAt:desc', query);
        },
        onFilter: function(filters) {
            console.log('Filters:', filters);
            // Implement filtering logic if needed
        },
        onSort: function(column, direction) {
            console.log('Sort:', column, direction);
            const sortParam = `${column}:${direction}`;
            loadUsers(userTable.state.currentPage, userTable.state.perPage, sortParam);
        }
    });

    // Wait a bit for the table to initialize completely
    setTimeout(async () => {
        // Load initial data after table is ready
        await loadUsers();
    }, 100);
});

// Load users data from API
async function loadUsers(page = 1, limit = 10, sort = 'createdAt:desc', search = '') {
    try {
        // Check if table is ready before using it
        if (userTable && userTable.setLoading) {
            userTable.setLoading(true);
        }
        
        const { users, pagination } = await fetchUsers(page, limit, sort, search);
        const transformedUsers = transformUserData(users);
        
        console.log('Fetched users:', transformedUsers);
        console.log('Pagination info:', pagination);
        
        if (userTable && userTable.setData) {
            userTable.setData(transformedUsers);
        }
        
    } catch (error) {
        console.error('Failed to load users:', error);
        alert('Failed to load users. Please check your connection and try again.');
    } finally {
        if (userTable && userTable.setLoading) {
            userTable.setLoading(false);
        }
    }
}

// Action handlers
function handleAddUser() {
    alert('Add New User clicked! This would open a modal or navigate to add user page.');
    // Here you would typically:
    // - Open a modal with user creation form
    // - Navigate to a dedicated user creation page
    // - Show an inline form
}

function handleViewUser(user) {
    // Open user detail modal
    UserDetailModal.show(user, {
        onClose: () => {
            console.log('User detail modal closed');
        }
    });
}

function handleEditUser(user) {
    alert(`Edit User: ${user.displayName || user.username}\nThis would open an edit form.`);
    // Here you would typically:
    // - Open a modal with edit form
    // - Navigate to user edit page
    // - Enable inline editing
}

function handleDeleteUser(user) {
    if (confirm(`Are you sure you want to delete user "${user.displayName || user.username}"?`)) {
        // In a real application, you would:
        // - Make an API call to delete the user
        // - Handle the response
        // - Reload the table with fresh data
        alert(`User "${user.displayName || user.username}" deletion would be processed here.`);
        
        // Reload data after deletion
        loadUsers(userTable.state.currentPage, userTable.state.perPage, 'createdAt:desc');
    }
}

// Utility functions for demo purposes
function refreshUserList() {
    loadUsers(userTable.state.currentPage, userTable.state.perPage, 'createdAt:desc');
}

function simulateLoading() {
    userTable.setLoading(true);
    
    setTimeout(() => {
        userTable.setLoading(false);
    }, 2000);
}

// Export functions for console debugging and modal access
window.userManagement = {
    refreshUserList,
    simulateLoading,
    loadUsers,
    getAuthToken
};

// Make handleEditUser globally accessible for modal
window.handleEditUser = handleEditUser;