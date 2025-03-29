/**
 * Admin Dashboard JavaScript for UITH Physiotherapy Scheduling System
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI elements using common UI function
    initCommonUI();
    
    // Load dashboard data
    loadDashboardData();
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Load dashboard data
 */
function loadDashboardData() {
    // Fetch current user data
    api.get('/api/user')
        .then(user => {
            if (user) {
                // Set avatar
                const initials = getInitials(user.firstname, user.lastname);
                document.getElementById('user-avatar').textContent = initials;
                
                // Set user name
                const fullName = `${user.firstname} ${user.lastname}`;
                document.getElementById('user-name').textContent = fullName;
                
                // Set welcome message
                document.getElementById('welcome-message').textContent = `Welcome, ${user.firstname}!`;
                
                console.log('User data:', user);
            }
        })
        .catch(error => {
            console.error('Failed to load user data:', error);
        });
    
    // Load dashboard statistics
    loadDashboardStats();
    
    // Load recent activity (placeholder for now)
    document.querySelector('.activity-list').innerHTML = `
        <div class="activity-item">
            <div class="activity-icon"><i data-feather="calendar"></i></div>
            <div class="activity-content">
                <div class="activity-title">Schedule Updated</div>
                <div class="activity-description">Admin updated the schedule for next week</div>
                <div class="activity-time">2 hours ago</div>
            </div>
        </div>
        <div class="activity-item">
            <div class="activity-icon"><i data-feather="user-plus"></i></div>
            <div class="activity-content">
                <div class="activity-title">New Staff Added</div>
                <div class="activity-description">Dr. James Wilson was added to the system</div>
                <div class="activity-time">Yesterday</div>
            </div>
        </div>
        <div class="activity-item">
            <div class="activity-icon"><i data-feather="check-circle"></i></div>
            <div class="activity-content">
                <div class="activity-title">Shift Request Approved</div>
                <div class="activity-description">Shift swap request from Sarah Johnson was approved</div>
                <div class="activity-time">2 days ago</div>
            </div>
        </div>
    `;
    
    // Initialize feather icons in the newly added content
    feather.replace();
}

/**
 * Load dashboard statistics
 */
function loadDashboardStats() {
    // Get staff count
    api.get('/api/users/physiotherapists/count')
        .then(response => {
            document.getElementById('staff-count').textContent = response.count;
        })
        .catch(error => {
            console.error('Failed to load staff count:', error);
            document.getElementById('staff-count').textContent = '0';
        });
    
    // Get pending requests count
    api.get('/api/shift-requests/pending/count')
        .then(response => {
            document.getElementById('requests-count').textContent = response.count;
        })
        .catch(error => {
            console.error('Failed to load requests count:', error);
            document.getElementById('requests-count').textContent = '0';
        });
    
    // Get active shifts count (this would typically be a server-side calculation)
    // For demo purposes, we'll set a fixed number
    document.getElementById('shifts-count').textContent = '24';
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Logout button
    const logoutButtons = document.querySelectorAll('#logout-button, #logout-button-dropdown');
    logoutButtons.forEach(button => {
        button.addEventListener('click', logout);
    });
    
    // Quick action buttons - already set up to redirect to appropriate pages
}

/**
 * Logout the user
 */
function logout() {
    api.post('/api/logout')
        .then(() => {
            window.location.href = '/index.html';
        })
        .catch(error => {
            console.error('Logout failed:', error);
            showToast('Failed to logout', 'error');
        });
}

/**
 * Get initials from first and last name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} - Initials
 */
function getInitials(firstName, lastName) {
    let initials = '';
    if (firstName) initials += firstName.charAt(0).toUpperCase();
    if (lastName) initials += lastName.charAt(0).toUpperCase();
    return initials || 'U';
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, info)
 */
function showToast(message, type = 'info') {
    // Check if toast container exists
    let toastContainer = document.querySelector('.toast-container');
    
    // Create toast container if it doesn't exist
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Remove toast after delay
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
}