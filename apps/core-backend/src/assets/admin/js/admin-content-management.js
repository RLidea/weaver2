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

// Global variables
let contentTabComponent = null;
let currentBoardId = null;

// Content management specific JavaScript
class ContentManagement {
    constructor() {
        this.currentBoardId = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupModals();
        await this.loadContentStats();
    }

    setupEventListeners() {
        // Event listeners for internal table filters will be handled by WeaverDataTable
    }

    setupModals() {
        // Modals are now handled by separate components
        // No need to setup events here
    }

    async loadContentStats() {
        try {
            await waitForApiClient();
            const response = await window.ApiClient.get('/v1/admin/content/stats');
            const data = await response.json();
            
            const statsContainer = document.getElementById('content-stats');
            const { overview } = data.data;
            
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-number">${overview.totalBoards}</div>
                    <div class="stat-label">Total Boards</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${overview.totalPosts}</div>
                    <div class="stat-label">Total Posts</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${overview.totalComments}</div>
                    <div class="stat-label">Total Comments</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${overview.recentPosts}</div>
                    <div class="stat-label">Recent Posts (7 days)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${overview.recentComments}</div>
                    <div class="stat-label">Recent Comments (7 days)</div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading content stats:', error);
        }
    }

    async loadBoards() {
        try {
            await waitForApiClient();
            const response = await window.ApiClient.get('/v1/admin/content/boards');
            const boards = await response.json();
            
            // WeaverDataTable will handle empty data automatically

            const tableData = boards.data ? boards.data.map(board => ({
                id: board.id,
                name: board.name,
                description: board.description || '-',
                posts: board.stats.totalPosts,
                comments: board.stats.totalComments,
                recentActivity: board.stats.recentPosts,
                created: new Date(board.createdAt).toLocaleDateString(),
                // Remove actions field - WeaverDataTable will handle this automatically
            })) : [];

            const boardColumns = [
                { key: 'name', label: 'Board Name', sortable: true },
                { key: 'description', label: 'Description' },
                { key: 'posts', label: 'Posts', sortable: true },
                { key: 'comments', label: 'Comments', sortable: true },
                { key: 'recentActivity', label: 'Recent (7d)', sortable: true },
                { key: 'created', label: 'Created', sortable: true },
                { key: 'actions', label: 'Actions', type: 'actions', sortable: false }
            ];

            if (!this.boardTable) {
                const container = document.getElementById('boards-table-container');
                this.boardTable = new WeaverDataTable({
                    container: container,
                    data: tableData,
                    columns: boardColumns,
                    title: 'Board Management',
                    searchable: true,
                    sortable: true,
                    pagination: true,
                    perPageOptions: [5, 10, 25],
                    defaultPerPage: 10,
                    emptyMessage: 'No boards found',
                    onEdit: (board) => this.openPermissions(board.id),
                    onDelete: (board) => this.deleteBoard(board.id),
                });
            } else {
                this.boardTable.updateData(tableData);
            }
            
        } catch (error) {
            console.error('Error loading boards:', error);
        }
    }

    async loadPosts() {
        try {
            // Get all data without filtering - WeaverDataTable will handle filtering
            await waitForApiClient();
            const response = await window.ApiClient.get('/v1/admin/content/posts', { page: 1, limit: 1000 });
            const data = await response.json();
            
            const tableData = data.data?.items ? data.data.items.map(post => ({
                id: post.id,
                title: post.title.length > 50 ? post.title.substring(0, 50) + '...' : post.title,
                board: post.board.name,
                author: post.author?.displayName || 'Anonymous',
                status: post.status,
                views: post.viewCount,
                comments: post._count.comments,
                created: new Date(post.createdAt).toLocaleDateString(),
                createdAt: post.createdAt, // For date filtering
            })) : [];

            // Get unique board names for filter options
            const boards = [...new Set(tableData.map(post => post.board))];

            const postColumns = [
                { key: 'title', label: 'Title', sortable: true },
                { 
                    key: 'board', 
                    label: 'Board', 
                    sortable: true, 
                    filterable: true,
                    filterOptions: boards
                },
                { key: 'author', label: 'Author', sortable: true },
                { 
                    key: 'status', 
                    label: 'Status', 
                    sortable: true, 
                    filterable: true,
                    filterOptions: ['PUBLISHED', 'DRAFT', 'ARCHIVED']
                },
                { key: 'views', label: 'Views', sortable: true },
                { key: 'comments', label: 'Comments', sortable: true },
                { 
                    key: 'createdAt', 
                    label: 'Created Date', 
                    sortable: true, 
                    filterable: true,
                    filterType: 'dateRange',
                    type: 'date'
                },
                { key: 'actions', label: 'Actions', type: 'actions', sortable: false }
            ];

            if (!this.postTable) {
                const container = document.getElementById('posts-table-container');
                this.postTable = new WeaverDataTable({
                    container: container,
                    data: tableData,
                    columns: postColumns,
                    title: 'Post Management',
                    searchable: true,
                    sortable: true,
                    filterable: true,
                    pagination: true,
                    perPageOptions: [5, 10, 25],
                    defaultPerPage: 10,
                    emptyMessage: 'No posts found',
                    onView: (post) => this.viewPost(post.id),
                    onDelete: (post) => this.deletePost(post.id),
                });
            } else {
                this.postTable.updateData(tableData);
            }
            
        } catch (error) {
            console.error('Error loading posts:', error);
        }
    }

    async loadComments() {
        try {
            // Get all data without filtering - WeaverDataTable will handle filtering
            await waitForApiClient();
            const response = await window.ApiClient.get('/v1/admin/content/comments', { page: 1, limit: 1000 });
            const data = await response.json();
            
            const tableData = data.data?.items ? data.data.items.map(comment => ({
                id: comment.id,
                content: comment.content.length > 100 ? comment.content.substring(0, 100) + '...' : comment.content,
                post: comment.post.title.length > 30 ? comment.post.title.substring(0, 30) + '...' : comment.post.title,
                author: comment.author?.displayName || 'Anonymous',
                created: new Date(comment.createdAt).toLocaleDateString(),
                createdAt: comment.createdAt, // For date filtering
            })) : [];

            const commentColumns = [
                { key: 'content', label: 'Content', sortable: false },
                { key: 'post', label: 'Post', sortable: true },
                { key: 'author', label: 'Author', sortable: true },
                { 
                    key: 'createdAt', 
                    label: 'Created Date', 
                    sortable: true, 
                    filterable: true,
                    filterType: 'dateRange',
                    type: 'date'
                },
                { key: 'actions', label: 'Actions', type: 'actions', sortable: false }
            ];

            if (!this.commentTable) {
                const container = document.getElementById('comments-table-container');
                this.commentTable = new WeaverDataTable({
                    container: container,
                    data: tableData,
                    columns: commentColumns,
                    title: 'Comment Management',
                    searchable: true,
                    sortable: true,
                    filterable: true,
                    pagination: true,
                    perPageOptions: [5, 10, 25],
                    defaultPerPage: 10,
                    emptyMessage: 'No comments found',
                    onDelete: (comment) => this.deleteComment(comment.id),
                });
            } else {
                this.commentTable.updateData(tableData);
            }
            
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    async openPermissions(boardId) {
        if (window.BoardPermissionsModal) {
            window.BoardPermissionsModal.show(boardId, {
                onClose: () => {
                    console.log('Board permissions modal closed');
                }
            });
        } else {
            console.error('Board permissions modal not available');
        }
    }

    // This method is no longer needed as it's handled by the modal component

    async viewPost(postId) {
        if (window.PostDetailModal) {
            window.PostDetailModal.show(postId, {
                onClose: () => {
                    console.log('Post detail modal closed');
                }
            });
        } else {
            console.error('Post detail modal not available');
        }
    }

    async deleteBoard(boardId) {
        if (!confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
            return;
        }
        
        try {
            await waitForApiClient();
            const response = await window.ApiClient.delete(`/v1/admin/content/boards/${boardId}`);
            
            if (response.ok) {
                alert('Board deleted successfully!');
                await this.loadBoards();
                await this.loadContentStats();
            } else {
                alert('Error deleting board');
            }
        } catch (error) {
            console.error('Error deleting board:', error);
            alert('Error deleting board');
        }
    }

    async deletePost(postId) {
        if (!confirm('Are you sure you want to delete this post?')) {
            return;
        }
        
        try {
            await waitForApiClient();
            const response = await window.ApiClient.delete(`/v1/admin/content/posts/${postId}`);
            
            if (response.ok) {
                alert('Post deleted successfully!');
                await this.loadPosts();
                await this.loadContentStats();
            } else {
                alert('Error deleting post');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Error deleting post');
        }
    }

    async deleteComment(commentId) {
        if (!confirm('Are you sure you want to delete this comment?')) {
            return;
        }
        
        try {
            await waitForApiClient();
            const response = await window.ApiClient.delete(`/v1/admin/content/comments/${commentId}`);
            
            if (response.ok) {
                alert('Comment deleted successfully!');
                await this.loadComments();
                await this.loadContentStats();
            } else {
                alert('Error deleting comment');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('Error deleting comment');
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Load data for specific tab
async function loadTabData(tabId) {
    try {
        switch (tabId) {
            case 'boards':
                await window.contentManagement.loadBoards();
                break;
            case 'posts':
                await window.contentManagement.loadPosts();
                break;
            case 'comments':
                await window.contentManagement.loadComments();
                break;
            default:
                console.warn(`Unknown tab: ${tabId}`);
        }
    } catch (error) {
        console.error(`Failed to load ${tabId} data:`, error);
        alert(`Failed to load ${tabId} data. Please try again.`);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize content management
    window.contentManagement = new ContentManagement();
    
    // Define tabs
    const tabs = [
        {
            id: 'boards',
            label: 'Boards',
            icon: 'fas fa-clipboard-list',
            content: `<div id="boards-table-container"><!-- Boards table will be loaded here --></div>`
        },
        {
            id: 'posts',
            label: 'Posts',
            icon: 'fas fa-file-text',
            content: `<div id="posts-table-container"><!-- Posts table will be loaded here --></div>`
        },
        {
            id: 'comments',
            label: 'Comments',
            icon: 'fas fa-comments',
            content: `<div id="comments-table-container"><!-- Comments table will be loaded here --></div>`
        }
    ];
    
    // Create tab component
    contentTabComponent = TabComponent.create('content-tabs-container', tabs, {
        activeTab: 'boards',
        onTabChange: (tabId) => {
            console.log('Content tab changed to:', tabId);
            loadTabData(tabId);
        },
        urlStateKey: 'tab',
        urlStateEnabled: true
    });
    
    // Load initial data
    const initialTab = contentTabComponent.getActiveTab();
    console.log('Loading initial content tab:', initialTab);
    loadTabData(initialTab);
});