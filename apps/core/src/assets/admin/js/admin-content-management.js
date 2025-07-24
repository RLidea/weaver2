// Content management specific JavaScript
class ContentManagement {
    constructor() {
        this.currentBoardId = null;
        this.currentTab = 'boards';
        this.init();
    }

    async init() {
        this.setupTabs();
        this.setupEventListeners();
        this.setupModals();
        await this.loadContentStats();
        await this.loadBoards();
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.content-tab');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                contents.forEach(c => c.classList.remove('active'));
                document.getElementById(`${tabId}-tab`).classList.add('active');
                
                this.currentTab = tabId;
                this.loadTabContent(tabId);
            });
        });
    }

    setupEventListeners() {
        // Filters
        document.getElementById('posts-board-filter')?.addEventListener('change', () => this.loadPosts());
        document.getElementById('posts-status-filter')?.addEventListener('change', () => this.loadPosts());
        document.getElementById('posts-search')?.addEventListener('input', this.debounce(() => this.loadPosts(), 500));
        document.getElementById('comments-search')?.addEventListener('input', this.debounce(() => this.loadComments(), 500));
    }

    setupModals() {
        // Modals are now handled by separate components
        // No need to setup events here
    }

    async loadTabContent(tabId) {
        switch(tabId) {
            case 'boards':
                await this.loadBoards();
                break;
            case 'posts':
                await this.loadPosts();
                break;
            case 'comments':
                await this.loadComments();
                break;
        }
    }

    async loadContentStats() {
        try {
            const response = await fetch('/v1/admin/content/stats');
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
            const response = await fetch('/v1/admin/content/boards');
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
            const boardFilter = document.getElementById('posts-board-filter')?.value || '';
            const statusFilter = document.getElementById('posts-status-filter')?.value || '';
            const search = document.getElementById('posts-search')?.value || '';
            
            const params = new URLSearchParams({
                page: '1',
                limit: '20'
            });
            
            if (boardFilter) params.append('boardId', boardFilter);
            if (statusFilter) params.append('status', statusFilter);
            if (search) params.append('search', search);

            const response = await fetch(`/v1/admin/content/posts?${params}`);
            const data = await response.json();
            
            // WeaverDataTable will handle empty data automatically

            const tableData = data.data?.items ? data.data.items.map(post => ({
                id: post.id,
                title: post.title.length > 50 ? post.title.substring(0, 50) + '...' : post.title,
                board: post.board.name,
                author: post.author?.displayName || 'Anonymous',
                status: `<span class="badge badge-${post.status.toLowerCase()}">${post.status}</span>`,
                views: post.viewCount,
                comments: post._count.comments,
                created: new Date(post.createdAt).toLocaleDateString(),
                // Remove actions field - WeaverDataTable will handle this automatically
            })) : [];

            const postColumns = [
                { key: 'title', label: 'Title', sortable: true },
                { key: 'board', label: 'Board', sortable: true },
                { key: 'author', label: 'Author', sortable: true },
                { key: 'status', label: 'Status', sortable: true },
                { key: 'views', label: 'Views', sortable: true },
                { key: 'comments', label: 'Comments', sortable: true },
                { key: 'created', label: 'Created', sortable: true },
                { key: 'actions', label: 'Actions', type: 'actions', sortable: false }
            ];

            if (!this.postTable) {
                const container = document.getElementById('posts-table-container');
                this.postTable = new WeaverDataTable({
                    container: container,
                    data: tableData,
                    columns: postColumns,
                    title: 'Post Management',
                    searchable: false, // Using external filters
                    sortable: true,
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
            const search = document.getElementById('comments-search')?.value || '';
            
            const params = new URLSearchParams({
                page: '1',
                limit: '20'
            });
            
            if (search) params.append('search', search);

            const response = await fetch(`/v1/admin/content/comments?${params}`);
            const data = await response.json();
            
            // WeaverDataTable will handle empty data automatically

            const tableData = data.data?.items ? data.data.items.map(comment => ({
                id: comment.id,
                content: comment.content.length > 100 ? comment.content.substring(0, 100) + '...' : comment.content,
                post: comment.post.title.length > 30 ? comment.post.title.substring(0, 30) + '...' : comment.post.title,
                author: comment.author?.displayName || 'Anonymous',
                created: new Date(comment.createdAt).toLocaleDateString(),
                // Remove actions field - WeaverDataTable will handle this automatically
            })) : [];

            const commentColumns = [
                { key: 'content', label: 'Content', sortable: false },
                { key: 'post', label: 'Post', sortable: true },
                { key: 'author', label: 'Author', sortable: true },
                { key: 'created', label: 'Created', sortable: true },
                { key: 'actions', label: 'Actions', type: 'actions', sortable: false }
            ];

            if (!this.commentTable) {
                const container = document.getElementById('comments-table-container');
                this.commentTable = new WeaverDataTable({
                    container: container,
                    data: tableData,
                    columns: commentColumns,
                    title: 'Comment Management',
                    searchable: false, // Using external filters
                    sortable: true,
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
            const response = await fetch(`/v1/admin/content/boards/${boardId}`, {
                method: 'DELETE'
            });
            
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
            const response = await fetch(`/v1/admin/content/posts/${postId}`, {
                method: 'DELETE'
            });
            
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
            const response = await fetch(`/v1/admin/content/comments/${commentId}`, {
                method: 'DELETE'
            });
            
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.contentManagement = new ContentManagement();
});