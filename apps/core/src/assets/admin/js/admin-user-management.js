// User Management with Data Table Component

// Sample user data for testing
const sampleUsers = [
    {
        id: 1,
        name: 'John Doe',
        username: 'johndoe',
        email: 'john.doe@example.com',
        role: 'Admin',
        status: 'active',
        registrationDate: '2024-01-15',
        lastLogin: '2024-12-20'
    },
    {
        id: 2,
        name: 'Jane Smith',
        username: 'janesmith',
        email: 'jane.smith@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-02-20',
        lastLogin: '2024-12-19'
    },
    {
        id: 3,
        name: 'Mike Johnson',
        username: 'mikej',
        email: 'mike.johnson@example.com',
        role: 'Moderator',
        status: 'inactive',
        registrationDate: '2024-03-10',
        lastLogin: '2024-12-10'
    },
    {
        id: 4,
        name: 'Sarah Wilson',
        username: 'sarahw',
        email: 'sarah.wilson@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-04-05',
        lastLogin: '2024-12-21'
    },
    {
        id: 5,
        name: 'David Brown',
        username: 'davidb',
        email: 'david.brown@example.com',
        role: 'User',
        status: 'suspended',
        registrationDate: '2024-05-12',
        lastLogin: '2024-11-30'
    },
    {
        id: 6,
        name: 'Emily Davis',
        username: 'emilyd',
        email: 'emily.davis@example.com',
        role: 'Admin',
        status: 'active',
        registrationDate: '2024-06-18',
        lastLogin: '2024-12-21'
    },
    {
        id: 7,
        name: 'Tom Wilson',
        username: 'tomw',
        email: 'tom.wilson@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-07-22',
        lastLogin: '2024-12-18'
    },
    {
        id: 8,
        name: 'Lisa Anderson',
        username: 'lisaa',
        email: 'lisa.anderson@example.com',
        role: 'Moderator',
        status: 'active',
        registrationDate: '2024-08-14',
        lastLogin: '2024-12-20'
    },
    {
        id: 9,
        name: 'Chris Taylor',
        username: 'christ',
        email: 'chris.taylor@example.com',
        role: 'User',
        status: 'inactive',
        registrationDate: '2024-09-08',
        lastLogin: '2024-11-25'
    },
    {
        id: 10,
        name: 'Amanda Martinez',
        username: 'amandam',
        email: 'amanda.martinez@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-10-03',
        lastLogin: '2024-12-19'
    },
    // Add more sample data for pagination testing
    {
        id: 11,
        name: 'Robert Garcia',
        username: 'robertg',
        email: 'robert.garcia@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-10-15',
        lastLogin: '2024-12-17'
    },
    {
        id: 12,
        name: 'Jennifer Lopez',
        username: 'jenniferl',
        email: 'jennifer.lopez@example.com',
        role: 'Admin',
        status: 'active',
        registrationDate: '2024-10-20',
        lastLogin: '2024-12-21'
    },
    {
        id: 13,
        name: 'Mark Thompson',
        username: 'markt',
        email: 'mark.thompson@example.com',
        role: 'User',
        status: 'suspended',
        registrationDate: '2024-11-01',
        lastLogin: '2024-12-01'
    },
    {
        id: 14,
        name: 'Rachel Green',
        username: 'rachelg',
        email: 'rachel.green@example.com',
        role: 'Moderator',
        status: 'active',
        registrationDate: '2024-11-10',
        lastLogin: '2024-12-20'
    },
    {
        id: 15,
        name: 'Kevin White',
        username: 'kevinw',
        email: 'kevin.white@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-11-18',
        lastLogin: '2024-12-19'
    },
    {
        id: 16,
        name: 'Michelle Lee',
        username: 'michellel',
        email: 'michelle.lee@example.com',
        role: 'User',
        status: 'inactive',
        registrationDate: '2024-12-01',
        lastLogin: '2024-12-15'
    },
    {
        id: 17,
        name: 'Daniel Kim',
        username: 'danielk',
        email: 'daniel.kim@example.com',
        role: 'Admin',
        status: 'active',
        registrationDate: '2024-12-05',
        lastLogin: '2024-12-21'
    },
    {
        id: 18,
        name: 'Ashley Johnson',
        username: 'ashleyj',
        email: 'ashley.johnson@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-12-08',
        lastLogin: '2024-12-20'
    },
    {
        id: 19,
        name: 'Brian Miller',
        username: 'brianm',
        email: 'brian.miller@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-01-20',
        lastLogin: '2024-12-18'
    },
    {
        id: 20,
        name: 'Catherine Moore',
        username: 'cathm',
        email: 'catherine.moore@example.com',
        role: 'Moderator',
        status: 'active',
        registrationDate: '2024-02-14',
        lastLogin: '2024-12-21'
    },
    {
        id: 21,
        name: 'Derek Wilson',
        username: 'derekw',
        email: 'derek.wilson@example.com',
        role: 'User',
        status: 'inactive',
        registrationDate: '2024-03-05',
        lastLogin: '2024-11-15'
    },
    {
        id: 22,
        name: 'Eva Rodriguez',
        username: 'evar',
        email: 'eva.rodriguez@example.com',
        role: 'Admin',
        status: 'active',
        registrationDate: '2024-04-12',
        lastLogin: '2024-12-20'
    },
    {
        id: 23,
        name: 'Frank Turner',
        username: 'frankt',
        email: 'frank.turner@example.com',
        role: 'User',
        status: 'suspended',
        registrationDate: '2024-05-08',
        lastLogin: '2024-10-28'
    },
    {
        id: 24,
        name: 'Grace Chen',
        username: 'gracec',
        email: 'grace.chen@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-06-15',
        lastLogin: '2024-12-19'
    },
    {
        id: 25,
        name: 'Henry Adams',
        username: 'henrya',
        email: 'henry.adams@example.com',
        role: 'Moderator',
        status: 'active',
        registrationDate: '2024-07-01',
        lastLogin: '2024-12-21'
    },
    {
        id: 26,
        name: 'Isabel Clark',
        username: 'isabelc',
        email: 'isabel.clark@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-07-18',
        lastLogin: '2024-12-17'
    },
    {
        id: 27,
        name: 'James Lewis',
        username: 'jamesl',
        email: 'james.lewis@example.com',
        role: 'Admin',
        status: 'active',
        registrationDate: '2024-08-03',
        lastLogin: '2024-12-21'
    },
    {
        id: 28,
        name: 'Karen Hall',
        username: 'karenh',
        email: 'karen.hall@example.com',
        role: 'User',
        status: 'inactive',
        registrationDate: '2024-08-22',
        lastLogin: '2024-11-30'
    },
    {
        id: 29,
        name: 'Lucas Young',
        username: 'lucasy',
        email: 'lucas.young@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-09-10',
        lastLogin: '2024-12-20'
    },
    {
        id: 30,
        name: 'Maria Gonzalez',
        username: 'mariag',
        email: 'maria.gonzalez@example.com',
        role: 'Moderator',
        status: 'active',
        registrationDate: '2024-09-25',
        lastLogin: '2024-12-19'
    },
    {
        id: 31,
        name: 'Nathan Scott',
        username: 'nathans',
        email: 'nathan.scott@example.com',
        role: 'User',
        status: 'suspended',
        registrationDate: '2024-10-08',
        lastLogin: '2024-12-05'
    },
    {
        id: 32,
        name: 'Olivia Wright',
        username: 'oliviaw',
        email: 'olivia.wright@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-10-20',
        lastLogin: '2024-12-18'
    },
    {
        id: 33,
        name: 'Peter King',
        username: 'peterk',
        email: 'peter.king@example.com',
        role: 'Admin',
        status: 'active',
        registrationDate: '2024-11-02',
        lastLogin: '2024-12-21'
    },
    {
        id: 34,
        name: 'Quinn Baker',
        username: 'quinnb',
        email: 'quinn.baker@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-11-15',
        lastLogin: '2024-12-20'
    },
    {
        id: 35,
        name: 'Rebecca Green',
        username: 'rebeccag',
        email: 'rebecca.green@example.com',
        role: 'User',
        status: 'inactive',
        registrationDate: '2024-12-01',
        lastLogin: '2024-12-10'
    },
    {
        id: 36,
        name: 'Samuel Carter',
        username: 'samuelc',
        email: 'samuel.carter@example.com',
        role: 'Moderator',
        status: 'active',
        registrationDate: '2024-12-05',
        lastLogin: '2024-12-21'
    },
    {
        id: 37,
        name: 'Tina Mitchell',
        username: 'tinam',
        email: 'tina.mitchell@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-01-30',
        lastLogin: '2024-12-19'
    },
    {
        id: 38,
        name: 'Victor Phillips',
        username: 'victorp',
        email: 'victor.phillips@example.com',
        role: 'User',
        status: 'suspended',
        registrationDate: '2024-02-28',
        lastLogin: '2024-11-20'
    },
    {
        id: 39,
        name: 'Wendy Campbell',
        username: 'wendyc',
        email: 'wendy.campbell@example.com',
        role: 'Admin',
        status: 'active',
        registrationDate: '2024-03-15',
        lastLogin: '2024-12-20'
    },
    {
        id: 40,
        name: 'Xavier Evans',
        username: 'xaviere',
        email: 'xavier.evans@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-04-20',
        lastLogin: '2024-12-18'
    },
    {
        id: 41,
        name: 'Yolanda Torres',
        username: 'yolandat',
        email: 'yolanda.torres@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-05-25',
        lastLogin: '2024-12-21'
    },
    {
        id: 42,
        name: 'Zachary Parker',
        username: 'zacharyp',
        email: 'zachary.parker@example.com',
        role: 'Moderator',
        status: 'active',
        registrationDate: '2024-06-30',
        lastLogin: '2024-12-19'
    },
    {
        id: 43,
        name: 'Anna Collins',
        username: 'annac',
        email: 'anna.collins@example.com',
        role: 'User',
        status: 'inactive',
        registrationDate: '2024-07-12',
        lastLogin: '2024-11-28'
    },
    {
        id: 44,
        name: 'Benjamin Edwards',
        username: 'benjamine',
        email: 'benjamin.edwards@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-08-08',
        lastLogin: '2024-12-20'
    },
    {
        id: 45,
        name: 'Claire Stewart',
        username: 'claires',
        email: 'claire.stewart@example.com',
        role: 'Admin',
        status: 'active',
        registrationDate: '2024-09-05',
        lastLogin: '2024-12-21'
    },
    {
        id: 46,
        name: 'Diego Sanchez',
        username: 'diegos',
        email: 'diego.sanchez@example.com',
        role: 'User',
        status: 'suspended',
        registrationDate: '2024-09-20',
        lastLogin: '2024-12-01'
    },
    {
        id: 47,
        name: 'Ellie Morris',
        username: 'elliem',
        email: 'ellie.morris@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-10-12',
        lastLogin: '2024-12-18'
    },
    {
        id: 48,
        name: 'Felix Rogers',
        username: 'felixr',
        email: 'felix.rogers@example.com',
        role: 'Moderator',
        status: 'active',
        registrationDate: '2024-11-01',
        lastLogin: '2024-12-20'
    },
    {
        id: 49,
        name: 'Gabriela Reed',
        username: 'gabrielar',
        email: 'gabriela.reed@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-11-18',
        lastLogin: '2024-12-19'
    },
    {
        id: 50,
        name: 'Harrison Cook',
        username: 'harrisonc',
        email: 'harrison.cook@example.com',
        role: 'User',
        status: 'active',
        registrationDate: '2024-12-10',
        lastLogin: '2024-12-21'
    }
];

// Define table columns
const userColumns = [
    {
        key: 'user',
        label: 'User',
        type: 'user',
        sortable: true
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
        key: 'registrationDate',
        label: 'Registration Date',
        type: 'date',
        sortable: true
    },
    {
        key: 'lastLogin',
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

// Initialize data table when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('user-data-table-container');
    
    if (!container) {
        console.error('Data table container not found');
        return;
    }

    // Initialize the data table
    const userTable = new WeaverDataTable({
        container: container,
        data: sampleUsers,
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
        },
        onFilter: function(filters) {
            console.log('Filters:', filters);
        },
        onSort: function(column, direction) {
            console.log('Sort:', column, direction);
        }
    });

    // Store reference to the table for global access
    window.userTable = userTable;
});

// Action handlers
function handleAddUser() {
    alert('Add New User clicked! This would open a modal or navigate to add user page.');
    // Here you would typically:
    // - Open a modal with user creation form
    // - Navigate to a dedicated user creation page
    // - Show an inline form
}

function handleViewUser(user) {
    alert(`View User: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\nStatus: ${user.status}`);
    // Here you would typically:
    // - Open a modal with user details
    // - Navigate to user profile page
    // - Show user information in a sidebar
}

function handleEditUser(user) {
    alert(`Edit User: ${user.name}\nThis would open an edit form.`);
    // Here you would typically:
    // - Open a modal with edit form
    // - Navigate to user edit page
    // - Enable inline editing
}

function handleDeleteUser(user) {
    if (confirm(`Are you sure you want to delete user "${user.name}"?`)) {
        // Simulate deletion
        const currentData = window.userTable.getData();
        const updatedData = currentData.filter(u => u.id !== user.id);
        window.userTable.setData(updatedData);
        
        alert(`User "${user.name}" has been deleted.`);
        
        // In a real application, you would:
        // - Make an API call to delete the user
        // - Handle the response
        // - Update the table with fresh data
        // - Show appropriate success/error messages
    }
}

// Utility functions for demo purposes
function addSampleUser() {
    const newUser = {
        id: Date.now(), // Simple ID generation for demo
        name: 'New User',
        username: 'newuser' + Date.now(),
        email: 'newuser@example.com',
        role: 'User',
        status: 'active',
        registrationDate: new Date().toISOString().split('T')[0],
        lastLogin: new Date().toISOString().split('T')[0]
    };
    
    const currentData = window.userTable.getData();
    window.userTable.setData([...currentData, newUser]);
}

function simulateLoading() {
    window.userTable.setLoading(true);
    
    setTimeout(() => {
        window.userTable.setLoading(false);
    }, 2000);
}