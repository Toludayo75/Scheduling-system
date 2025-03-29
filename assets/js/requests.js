/**
 * Shift Requests JavaScript for UITH Physiotherapy Scheduling System
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI elements using common UI function
    initCommonUI();
    
    // Initialize modals
    initModals();
    
    // Load requests data
    loadRequestsData();
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Initialize modals
 */
function initModals() {
    // Initialize modals
    const requestDetailsModal = document.getElementById('request-details-modal');
    const requestDetailsClose = document.getElementById('request-details-close');
    
    if (requestDetailsClose) {
        requestDetailsClose.addEventListener('click', () => {
            requestDetailsModal.classList.remove('active');
        });
    }
}

/**
 * Load requests data
 */
function loadRequestsData() {
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
            }
        })
        .catch(error => {
            console.error('Failed to load user data:', error);
        });
    
    // Load shift requests
    loadRequestsList();
}

/**
 * Load shift requests list based on filters
 */
function loadRequestsList() {
    const statusFilter = document.getElementById('status-filter').value;
    
    let apiUrl = '/api/shift-requests';
    
    if (statusFilter) {
        apiUrl = `/api/shift-requests?status=${statusFilter}`;
    }
    
    api.get(apiUrl)
        .then(requests => {
            const tableBody = document.getElementById('requests-table-body');
            tableBody.innerHTML = '';
            
            if (requests && requests.length > 0) {
                requests.forEach(request => {
                    const row = document.createElement('tr');
                    
                    // Format dates
                    const requestDate = new Date(request.created_at);
                    const formattedRequestDate = requestDate.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    });
                    
                    const shiftDate = new Date(request.shift_date);
                    const formattedShiftDate = shiftDate.toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    });
                    
                    // Create requester name
                    const requesterName = request.user ? 
                        `${request.user.firstname} ${request.user.lastname}` : 
                        'Unknown';
                    
                    // Create status badge
                    let statusClass = '';
                    switch (request.status) {
                        case 'Approved':
                            statusClass = 'status-approved';
                            break;
                        case 'Rejected':
                            statusClass = 'status-rejected';
                            break;
                        default:
                            statusClass = 'status-pending';
                    }
                    
                    row.innerHTML = `
                        <td>${requesterName}</td>
                        <td>${request.request_type}</td>
                        <td>${formattedRequestDate}</td>
                        <td>${formattedShiftDate}</td>
                        <td><span class="status-badge ${statusClass}">${request.status}</span></td>
                        <td class="actions-cell">
                            <button class="btn-icon view-request-btn" data-id="${request.id}">
                                <i data-feather="eye"></i>
                            </button>
                        </td>
                    `;
                    
                    tableBody.appendChild(row);
                });
                
                // Initialize Feather icons after adding rows
                feather.replace();
                
                // Add event listeners to buttons
                document.querySelectorAll('.view-request-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const requestId = btn.getAttribute('data-id');
                        viewRequestDetails(requestId);
                    });
                });
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-table-message">No shift requests found for the selected criteria</td>
                    </tr>
                `;
            }
        })
        .catch(error => {
            console.error('Failed to load shift requests data:', error);
            const tableBody = document.getElementById('requests-table-body');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="error-message">Error loading shift requests data</td>
                </tr>
            `;
        });
}

/**
 * View request details
 * @param {string} requestId - Request ID
 */
function viewRequestDetails(requestId) {
    // Fetch request data
    api.get(`/api/shift-requests/${requestId}`)
        .then(request => {
            if (request) {
                // Fill modal with request details
                document.getElementById('request-requester').textContent = request.user ? 
                    `${request.user.firstname} ${request.user.lastname}` : 'Unknown';
                
                document.getElementById('request-type').textContent = request.request_type;
                
                // Format dates and times
                const requestDate = new Date(request.created_at);
                document.getElementById('request-date').textContent = requestDate.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const shiftDate = new Date(request.shift_date);
                document.getElementById('request-shift-date').textContent = shiftDate.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                });
                
                // Create time range string
                const startTime = formatTime(request.start_time);
                const endTime = formatTime(request.end_time);
                document.getElementById('request-shift-time').textContent = `${startTime} - ${endTime}`;
                
                // Set status with appropriate class
                const statusSpan = document.getElementById('request-status');
                statusSpan.textContent = request.status;
                statusSpan.className = 'detail-value status-badge';
                
                let statusClass = '';
                switch (request.status) {
                    case 'Approved':
                        statusClass = 'status-approved';
                        break;
                    case 'Rejected':
                        statusClass = 'status-rejected';
                        break;
                    default:
                        statusClass = 'status-pending';
                }
                statusSpan.classList.add(statusClass);
                
                // Set reason
                document.getElementById('request-reason').textContent = request.reason || 'No reason provided';
                
                // Handle swap details
                const swapDetails = document.getElementById('swap-details');
                if (request.request_type === 'Swap' && request.swap_with) {
                    swapDetails.classList.remove('hidden');
                    
                    // Set swap details
                    document.getElementById('swap-with').textContent = request.swap_with.user ? 
                        `${request.swap_with.user.firstname} ${request.swap_with.user.lastname}` : 'Unknown';
                    
                    const swapDate = new Date(request.swap_with.shift_date);
                    document.getElementById('swap-date').textContent = swapDate.toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                    });
                    
                    const swapStart = formatTime(request.swap_with.start_time);
                    const swapEnd = formatTime(request.swap_with.end_time);
                    document.getElementById('swap-shift').textContent = `${swapStart} - ${swapEnd}`;
                } else {
                    swapDetails.classList.add('hidden');
                }
                
                // Show/hide pending actions
                const pendingActions = document.getElementById('pending-actions');
                if (request.status === 'Pending') {
                    pendingActions.classList.remove('hidden');
                    
                    // Set up approve/reject buttons
                    const approveBtn = document.getElementById('approve-request-btn');
                    const rejectBtn = document.getElementById('reject-request-btn');
                    
                    approveBtn.onclick = () => {
                        updateRequestStatus(requestId, 'Approved');
                    };
                    
                    rejectBtn.onclick = () => {
                        updateRequestStatus(requestId, 'Rejected');
                    };
                } else {
                    pendingActions.classList.add('hidden');
                }
                
                // Show modal
                document.getElementById('request-details-modal').classList.add('active');
            }
        })
        .catch(error => {
            console.error('Failed to load request details:', error);
            showToast('Error loading request details', 'error');
        });
}

/**
 * Update request status
 * @param {string} requestId - Request ID
 * @param {string} status - New status
 */
function updateRequestStatus(requestId, status) {
    api.put(`/api/shift-requests/${requestId}/status`, { status })
        .then(response => {
            document.getElementById('request-details-modal').classList.remove('active');
            showToast(`Request ${status.toLowerCase()}`, 'success');
            loadRequestsList(); // Reload requests list
        })
        .catch(error => {
            console.error(`Failed to ${status.toLowerCase()} request:`, error);
            showToast(`Error ${status.toLowerCase()}ing request`, 'error');
        });
}

/**
 * Format time string from 24-hour format to 12-hour format
 * @param {string} timeString - Time string in 24-hour format (HH:MM:SS)
 * @returns {string} - Formatted time string in 12-hour format
 */
function formatTime(timeString) {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
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
    
    // Status filter
    const statusFilter = document.getElementById('status-filter');
    statusFilter.addEventListener('change', loadRequestsList);
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