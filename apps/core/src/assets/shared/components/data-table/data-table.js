
/**
 * Advanced Data Table Component
 * Reusable data table with search, sorting, pagination, and filtering
 */
window.WeaverDataTable = class {
  constructor(options = {}) {
    this.container = options.container;
    this.data = options.data || [];
    this.originalData = [...this.data];
    this.columns = options.columns || [];
    this.config = {
      title: options.title || 'Data List',
      searchable: options.searchable !== false,
      sortable: options.sortable !== false,
      filterable: options.filterable !== false,
      pagination: options.pagination !== false,
      perPageOptions: options.perPageOptions || [10, 25, 50, 100],
      defaultPerPage: options.defaultPerPage || 25,
      showStats: options.showStats || false,
      showAddButton: options.showAddButton || false,
      addButtonText: options.addButtonText || 'Add New',
      emptyMessage: options.emptyMessage || 'No data found',
      emptyDescription: options.emptyDescription || 'There are no items to display',
      ...options.config
    };
    
    this.state = {
      currentPage: 1,
      perPage: this.config.defaultPerPage,
      sortColumn: null,
      sortDirection: 'asc',
      searchQuery: '',
      filters: {},
      filteredData: [...this.data],
      loading: false
    };
    
    this.callbacks = {
      onAdd: options.onAdd || null,
      onEdit: options.onEdit || null,
      onDelete: options.onDelete || null,
      onView: options.onView || null,
      onSort: options.onSort || null,
      onFilter: options.onFilter || null,
      onSearch: options.onSearch || null
    };
    
    this.init();
  }
  
  async init() {
    if (!this.container) {
      throw new Error('Container element is required');
    }
    
    await this.loadTemplate();
    this.setupEventListeners();
    this.render();
  }
  
  async loadTemplate() {
    try {
      const response = await fetch('/shared/components/data-table/data-table.html');
      const template = await response.text();
      this.container.innerHTML = template;
      this.bindElements();
    } catch (error) {
      console.error('Failed to load data table template:', error);
      this.container.innerHTML = this.getFallbackTemplate();
      this.bindElements();
    }
  }
  
  getFallbackTemplate() {
    return `
      <div class="data-table-wrapper">
        <div class="card search-filters" id="data-table-filters">
          <div class="search-section">
            <h3 class="text-primary filter-title">Search</h3>
            <div class="search-input-group">
              <input type="text" class="form-input glass search-input" placeholder="Search..." id="data-table-search">
              <button class="btn btn-primary search-btn" id="data-table-search-btn">
                <i class="fas fa-search"></i>
              </button>
            </div>
          </div>
          <div class="filter-section" id="data-table-filter-section"></div>
        </div>
        <div class="card data-table-container" id="data-table-main">
          <div class="table-header">
            <h3 class="text-primary table-title">Data List</h3>
            <div class="table-controls">
              <div class="table-actions">
                <button class="btn btn-success add-btn" id="data-table-add-btn" style="display: none;">
                  <i class="fas fa-plus"></i> Add New
                </button>
              </div>
              <select class="form-input glass per-page-select" id="data-table-per-page">
                <option value="25" selected>25 per page</option>
              </select>
            </div>
          </div>
          <div class="table-responsive">
            <table class="data-table" id="data-table">
              <thead id="data-table-header"></thead>
              <tbody id="data-table-body"></tbody>
            </table>
            <div class="data-table-loading" id="data-table-loading" style="display: none;">
              <div class="data-table-loading-spinner"></div>
              <div>Loading...</div>
            </div>
            <div class="data-table-empty" id="data-table-empty" style="display: none;">
              <div class="data-table-empty-icon"><i class="fas fa-inbox"></i></div>
              <div class="data-table-empty-message">No data found</div>
              <div class="data-table-empty-description">There are no items to display</div>
            </div>
          </div>
          <div class="table-footer">
            <div class="table-info" id="data-table-info">Showing 0 of 0 items</div>
            <div class="pagination" id="data-table-pagination"></div>
          </div>
        </div>
      </div>
    `;
  }
  
  bindElements() {
    this.elements = {
      stats: this.container.querySelector('#data-table-stats'),
      filters: this.container.querySelector('#data-table-filters'),
      filterSection: this.container.querySelector('#data-table-filter-section'),
      search: this.container.querySelector('#data-table-search'),
      searchBtn: this.container.querySelector('#data-table-search-btn'),
      title: this.container.querySelector('.table-title'),
      addBtn: this.container.querySelector('#data-table-add-btn'),
      perPageSelect: this.container.querySelector('#data-table-per-page'),
      table: this.container.querySelector('#data-table'),
      header: this.container.querySelector('#data-table-header'),
      body: this.container.querySelector('#data-table-body'),
      loading: this.container.querySelector('#data-table-loading'),
      empty: this.container.querySelector('#data-table-empty'),
      info: this.container.querySelector('#data-table-info'),
      pagination: this.container.querySelector('#data-table-pagination')
    };
  }
  
  setupEventListeners() {
    // Search functionality
    if (this.elements.search && this.config.searchable) {
      this.elements.search.addEventListener('input', this.debounce((e) => {
        this.handleSearch(e.target.value);
      }, 300));
    }
    
    if (this.elements.searchBtn) {
      this.elements.searchBtn.addEventListener('click', () => {
        this.handleSearch(this.elements.search.value);
      });
    }
    
    // Per page selection
    if (this.elements.perPageSelect) {
      this.elements.perPageSelect.addEventListener('change', (e) => {
        this.handlePerPageChange(parseInt(e.target.value));
      });
    }
    
    // Add button
    if (this.elements.addBtn && this.callbacks.onAdd) {
      this.elements.addBtn.style.display = 'flex';
      this.elements.addBtn.addEventListener('click', () => {
        this.callbacks.onAdd();
      });
    }
  }
  
  handleSearch(query) {
    this.state.searchQuery = query.toLowerCase();
    this.state.currentPage = 1;
    
    // Only trigger server-side search callback if it exists
    // Don't use filterData() for API-based tables - let the server handle filtering
    if (this.callbacks.onSearch) {
      this.callbacks.onSearch(query);
    } else {
      // Fallback to client-side filtering for static data tables
      this.filterData();
      this.render();
    }
  }
  
  handleSort(column) {
    if (this.state.sortColumn === column) {
      this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.state.sortColumn = column;
      this.state.sortDirection = 'asc';
    }
    
    this.sortData();
    this.render();
    
    if (this.callbacks.onSort) {
      this.callbacks.onSort(column, this.state.sortDirection);
    }
  }
  
  handleFilter(filterKey, filterValue) {
    if (filterValue) {
      this.state.filters[filterKey] = filterValue;
    } else {
      delete this.state.filters[filterKey];
    }
    
    this.state.currentPage = 1;
    this.filterData();
    this.render();
    
    if (this.callbacks.onFilter) {
      this.callbacks.onFilter(this.state.filters);
    }
  }
  
  handlePerPageChange(perPage) {
    this.state.perPage = perPage;
    this.state.currentPage = 1;
    this.render();
  }
  
  handlePageChange(page) {
    this.state.currentPage = page;
    this.render();
  }
  
  filterData() {
    let filtered = [...this.originalData];
    
    // Apply search filter
    if (this.state.searchQuery) {
      filtered = filtered.filter(row => {
        return this.columns.some(column => {
          const value = this.getValueFromPath(row, column.key);
          return String(value).toLowerCase().includes(this.state.searchQuery);
        });
      });
    }
    
    // Apply column filters
    Object.entries(this.state.filters).forEach(([key, value]) => {
      filtered = filtered.filter(row => {
        const rowValue = this.getValueFromPath(row, key);
        return String(rowValue).toLowerCase().includes(String(value).toLowerCase());
      });
    });
    
    this.state.filteredData = filtered;
  }
  
  sortData() {
    if (!this.state.sortColumn) return;
    
    this.state.filteredData.sort((a, b) => {
      const aVal = this.getValueFromPath(a, this.state.sortColumn);
      const bVal = this.getValueFromPath(b, this.state.sortColumn);
      
      let comparison = 0;
      if (aVal > bVal) comparison = 1;
      if (aVal < bVal) comparison = -1;
      
      return this.state.sortDirection === 'desc' ? comparison * -1 : comparison;
    });
  }
  
  render() {
    // Only filter and sort data if this is a static data table (no API callbacks)
    if (!this.callbacks.onSearch && !this.callbacks.onSort) {
      this.filterData();
      this.sortData();
    } else {
      // For API-based tables, use the data as-is since filtering/sorting is handled server-side
      this.state.filteredData = [...this.data];
    }
    
    this.renderTitle();
    this.renderFilters();
    this.renderPerPageSelect();
    this.renderTable();
    this.renderPagination();
    this.renderInfo();
  }
  
  renderTitle() {
    if (this.elements.title) {
      this.elements.title.textContent = this.config.title;
    }
  }
  
  renderFilters() {
    if (!this.config.filterable || !this.elements.filterSection) return;
    
    // Create filter controls based on column configuration
    const filterHTML = this.columns
      .filter(column => column.filterable)
      .map(column => `
        <div class="filter-group">
          <label>${column.label}</label>
          <select class="form-input glass" data-filter="${column.key}">
            <option value="">All ${column.label}</option>
            ${this.getFilterOptions(column).map(value => 
              `<option value="${value}" ${this.state.filters[column.key] === value ? 'selected' : ''}>${value}</option>`
            ).join('')}
          </select>
        </div>
      `).join('');
    
    // Add reset button
    const resetHTML = filterHTML ? `
      <div class="filter-group">
        <label>&nbsp;</label>
        <button class="btn btn-secondary" id="reset-filters" style="height: 100%;">
          <i class="fas fa-undo"></i> Reset
        </button>
      </div>
    ` : '';
    
    this.elements.filterSection.innerHTML = filterHTML + resetHTML;
    
    // Add event listeners to filter controls
    this.elements.filterSection.querySelectorAll('select[data-filter]').forEach(select => {
      select.addEventListener('change', (e) => {
        this.handleFilter(e.target.dataset.filter, e.target.value);
      });
    });
    
    // Reset filters button
    const resetBtn = this.elements.filterSection.querySelector('#reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }
  }
  
  renderPerPageSelect() {
    if (!this.elements.perPageSelect) return;
    
    this.elements.perPageSelect.innerHTML = this.config.perPageOptions
      .map(option => `<option value="${option}" ${option === this.state.perPage ? 'selected' : ''}>${option} per page</option>`)
      .join('');
  }
  
  renderTable() {
    this.renderTableHeader();
    this.renderTableBody();
  }
  
  renderTableHeader() {
    if (!this.elements.header) return;
    
    const headerHTML = this.columns.map(column => {
      const sortClass = this.state.sortColumn === column.key 
        ? `sorted-${this.state.sortDirection}` 
        : (column.sortable !== false ? 'sortable' : '');
      
      return `<th class="${sortClass}" ${column.sortable !== false ? `data-sort="${column.key}"` : ''}>
        ${column.label}
      </th>`;
    }).join('');
    
    this.elements.header.innerHTML = headerHTML;
    
    // Add sort event listeners
    if (this.config.sortable) {
      this.elements.header.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          this.handleSort(th.dataset.sort);
        });
      });
    }
  }
  
  renderTableBody() {
    if (!this.elements.body) return;
    
    // Show/hide loading state
    if (this.state.loading) {
      this.elements.loading.style.display = 'block';
      this.elements.table.style.display = 'none';
      this.elements.empty.style.display = 'none';
      return;
    } else {
      this.elements.loading.style.display = 'none';
      this.elements.table.style.display = 'table';
    }
    
    const paginatedData = this.getPaginatedData();
    
    if (paginatedData.length === 0) {
      this.elements.empty.style.display = 'block';
      this.elements.table.style.display = 'none';
      this.elements.empty.querySelector('.data-table-empty-message').textContent = this.config.emptyMessage;
      this.elements.empty.querySelector('.data-table-empty-description').textContent = this.config.emptyDescription;
      return;
    } else {
      this.elements.empty.style.display = 'none';
      this.elements.table.style.display = 'table';
    }
    
    const bodyHTML = paginatedData.map(row => `
      <tr>
        ${this.columns.map(column => `<td>${this.renderCell(row, column)}</td>`).join('')}
      </tr>
    `).join('');
    
    this.elements.body.innerHTML = bodyHTML;
    
    // Add action event listeners
    this.elements.body.querySelectorAll('.action-btn-sm').forEach(btn => {
      const action = btn.dataset.action;
      const rowId = btn.dataset.id;
      
      btn.addEventListener('click', () => {
        const rowData = this.data.find(item => String(item.id) === String(rowId));
        
        switch (action) {
          case 'edit':
            if (this.callbacks.onEdit) this.callbacks.onEdit(rowData);
            break;
          case 'delete':
            if (this.callbacks.onDelete) this.callbacks.onDelete(rowData);
            break;
          case 'view':
            if (this.callbacks.onView) this.callbacks.onView(rowData);
            break;
        }
      });
    });
  }
  
  renderCell(row, column) {
    const value = this.getValueFromPath(row, column.key);
    
    if (column.render && typeof column.render === 'function') {
      return column.render(value, row);
    }
    
    // Default cell renderers based on column type
    switch (column.type) {
      case 'user':
        return this.renderUserCell(row);
      case 'status':
        return this.renderStatusBadge(value);
      case 'role':
        return this.renderRoleBadge(value);
      case 'date':
        return this.formatDate(value);
      case 'actions':
        return this.renderActionButtons(row);
      default:
        return this.escapeHtml(String(value || ''));
    }
  }
  
  renderUserCell(row) {
    const initials = (row.name || '').split(' ').map(n => n[0]).join('').toUpperCase();
    return `
      <div class="user-info">
        <div class="user-avatar">${initials}</div>
        <div class="user-details">
          <div class="user-name">${this.escapeHtml(row.name || '')}</div>
          <div class="user-username">@${this.escapeHtml(row.username || row.email || '')}</div>
        </div>
      </div>
    `;
  }
  
  renderStatusBadge(status) {
    const statusClass = String(status).toLowerCase();
    return `<span class="status-badge ${statusClass}">${this.escapeHtml(String(status))}</span>`;
  }
  
  renderRoleBadge(role) {
    return `<span class="role-badge">${this.escapeHtml(String(role))}</span>`;
  }
  
  renderActionButtons(row) {
    const buttons = [];
    
    if (this.callbacks.onView) {
      buttons.push(`<button class="action-btn-sm view" data-action="view" data-id="${row.id}"><i class="fas fa-eye"></i></button>`);
    }
    if (this.callbacks.onEdit) {
      buttons.push(`<button class="action-btn-sm edit" data-action="edit" data-id="${row.id}"><i class="fas fa-edit"></i></button>`);
    }
    if (this.callbacks.onDelete) {
      buttons.push(`<button class="action-btn-sm delete" data-action="delete" data-id="${row.id}"><i class="fas fa-trash"></i></button>`);
    }
    
    return `<div class="action-buttons">${buttons.join('')}</div>`;
  }
  
  renderPagination() {
    if (!this.config.pagination || !this.elements.pagination) return;
    
    const totalPages = Math.ceil(this.state.filteredData.length / this.state.perPage);
    if (totalPages <= 1) {
      this.elements.pagination.innerHTML = '';
      return;
    }
    
    const currentPage = this.state.currentPage;
    const buttons = [];
    
    // Previous button
    buttons.push(`
      <button class="btn ${currentPage === 1 ? 'disabled' : ''}" 
              ${currentPage === 1 ? 'disabled' : ''} 
              data-page="${currentPage - 1}">
        <i class="fas fa-chevron-left"></i>
      </button>
    `);
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
      buttons.push(`<button class="btn" data-page="1">1</button>`);
      if (startPage > 2) {
        buttons.push(`<span class="pagination-ellipsis">...</span>`);
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(`
        <button class="btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
          ${i}
        </button>
      `);
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(`<span class="pagination-ellipsis">...</span>`);
      }
      buttons.push(`<button class="btn" data-page="${totalPages}">${totalPages}</button>`);
    }
    
    // Next button
    buttons.push(`
      <button class="btn ${currentPage === totalPages ? 'disabled' : ''}" 
              ${currentPage === totalPages ? 'disabled' : ''} 
              data-page="${currentPage + 1}">
        <i class="fas fa-chevron-right"></i>
      </button>
    `);
    
    this.elements.pagination.innerHTML = buttons.join('');
    
    // Add click event listeners
    this.elements.pagination.querySelectorAll('button[data-page]:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handlePageChange(parseInt(btn.dataset.page));
      });
    });
  }
  
  renderInfo() {
    if (!this.elements.info) return;
    
    const start = (this.state.currentPage - 1) * this.state.perPage + 1;
    const end = Math.min(start + this.state.perPage - 1, this.state.filteredData.length);
    const total = this.state.filteredData.length;
    
    if (total === 0) {
      this.elements.info.textContent = 'Showing 0 of 0 items';
    } else {
      this.elements.info.textContent = `Showing ${start} to ${end} of ${total} items`;
    }
  }
  
  // Utility methods
  getPaginatedData() {
    const start = (this.state.currentPage - 1) * this.state.perPage;
    const end = start + this.state.perPage;
    return this.state.filteredData.slice(start, end);
  }
  
  getValueFromPath(obj, path) {
    return path.split('.').reduce((value, key) => value?.[key], obj);
  }
  
  getUniqueValues(key) {
    const values = this.originalData.map(row => this.getValueFromPath(row, key));
    return [...new Set(values)].filter(Boolean).sort();
  }
  
  getFilterOptions(column) {
    // If column has predefined filter options, use those instead of data-derived values
    if (column.filterOptions && Array.isArray(column.filterOptions)) {
      return column.filterOptions;
    }
    // Fallback to unique values from data
    return this.getUniqueValues(column.key);
  }
  
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
  
  resetFilters() {
    this.state.filters = {};
    this.state.searchQuery = '';
    this.state.currentPage = 1;
    
    if (this.elements.search) {
      this.elements.search.value = '';
    }
    
    this.elements.filterSection.querySelectorAll('select').forEach(select => {
      select.value = '';
    });
    
    this.render();
  }
  
  // Public API methods
  setData(data) {
    this.data = data || [];
    this.originalData = [...this.data];
    this.state.currentPage = 1;
    this.render();
  }
  
  getData() {
    return this.data;
  }
  
  getFilteredData() {
    return this.state.filteredData;
  }
  
  setLoading(loading) {
    this.state.loading = loading;
    this.renderTableBody();
  }
  
  refresh() {
    this.render();
  }
  
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
