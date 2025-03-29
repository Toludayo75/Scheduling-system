/**
 * Schedules Management JavaScript for UITH Physiotherapy Scheduling System
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI elements using common UI function
    initCommonUI();
    
    // Load schedules data
    loadSchedulesData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize modals
    initModals();
});

/**
 * Initialize modals and filters
 */
function initModals() {
    // Initialize modals
    const scheduleModal = document.getElementById('schedule-modal');
    const scheduleModalClose = document.getElementById('schedule-modal-close');
    const cancelScheduleBtn = document.getElementById('cancel-schedule-btn');
    
    if (scheduleModalClose) {
        scheduleModalClose.addEventListener('click', () => {
            scheduleModal.style.display = 'none';
        });
    }
    
    if (cancelScheduleBtn) {
        cancelScheduleBtn.addEventListener('click', () => {
            scheduleModal.style.display = 'none';
        });
    }
    
    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalClose = document.getElementById('confirm-modal-close');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    
    if (confirmModalClose) {
        confirmModalClose.addEventListener('click', () => {
            confirmModal.style.display = 'none';
        });
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            confirmModal.style.display = 'none';
        });
    }
    
    // Initialize month filter with current month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthFilter = document.getElementById('month-filter');
    if (monthFilter) {
        monthFilter.value = `${year}-${month}`;
    }
}

/**
 * Load schedules data
 */
function loadSchedulesData() {
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
    
    // Load staff members for filter
    api.get('/api/users/physiotherapists')
        .then(staff => {
            const staffFilter = document.getElementById('staff-filter');
            const scheduleStaff = document.getElementById('schedule-staff');
            
            if (staff && staff.length > 0) {
                staff.forEach(staffMember => {
                    const name = `${staffMember.firstname} ${staffMember.lastname}`;
                    
                    // Add to staff filter
                    const filterOption = document.createElement('option');
                    filterOption.value = staffMember.id;
                    filterOption.textContent = name;
                    staffFilter.appendChild(filterOption);
                    
                    // Add to schedule staff select
                    const scheduleOption = document.createElement('option');
                    scheduleOption.value = staffMember.id;
                    scheduleOption.textContent = name;
                    scheduleStaff.appendChild(scheduleOption);
                });
            }
        })
        .catch(error => {
            console.error('Failed to load staff data:', error);
        });
    
    // Load schedules based on current filters
    loadSchedulesList();
}

/**
 * Load schedules list based on filters
 */
function loadSchedulesList() {
    const staffId = document.getElementById('staff-filter').value;
    const monthFilter = document.getElementById('month-filter').value;
    
    let apiUrl = '/api/schedules';
    
    if (staffId) {
        apiUrl = `/api/users/${staffId}/schedules`;
    }
    
    if (monthFilter) {
        const [year, month] = monthFilter.split('-');
        apiUrl = `/api/schedules?year=${year}&month=${month}`;
        
        if (staffId) {
            apiUrl = `/api/users/${staffId}/schedules/${year}/${month}`;
        }
    }
    
    api.get(apiUrl)
        .then(schedules => {
            const tableBody = document.getElementById('schedules-table-body');
            tableBody.innerHTML = '';
            
            if (schedules && schedules.length > 0) {
                schedules.forEach(schedule => {
                    const row = document.createElement('tr');
                    
                    // Format date
                    const shiftDate = new Date(schedule.shift_date);
                    const formattedDate = shiftDate.toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    });
                    
                    // Determine shift type based on time
                    let shiftType = 'Regular';
                    const startHour = parseInt(schedule.start_time.split(':')[0]);
                    if (startHour < 12) {
                        shiftType = 'Morning';
                    } else if (startHour < 18) {
                        shiftType = 'Afternoon';
                    } else {
                        shiftType = 'Night';
                    }
                    
                    // Create staff name
                    const staffName = schedule.user ? 
                        `${schedule.user.firstname} ${schedule.user.lastname}` : 
                        'Unknown';
                    
                    // Format times
                    const startTime = formatTime(schedule.start_time);
                    const endTime = formatTime(schedule.end_time);
                    
                    // Create status badge
                    const statusClass = 'status-active';
                    const statusText = 'Active';
                    
                    row.innerHTML = `
                        <td>${staffName}</td>
                        <td>${formattedDate}</td>
                        <td><span class="badge ${shiftType.toLowerCase()}-shift">${shiftType}</span></td>
                        <td>${startTime}</td>
                        <td>${endTime}</td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td class="actions-cell">
                            <button class="btn-icon edit-schedule-btn" data-id="${schedule.id}">
                                <i data-feather="edit"></i>
                            </button>
                            <button class="btn-icon delete-schedule-btn" data-id="${schedule.id}">
                                <i data-feather="trash-2"></i>
                            </button>
                        </td>
                    `;
                    
                    tableBody.appendChild(row);
                });
                
                // Initialize Feather icons after adding rows
                feather.replace();
                
                // Add event listeners to buttons
                document.querySelectorAll('.edit-schedule-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const scheduleId = btn.getAttribute('data-id');
                        editSchedule(scheduleId);
                    });
                });
                
                document.querySelectorAll('.delete-schedule-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const scheduleId = btn.getAttribute('data-id');
                        confirmDeleteSchedule(scheduleId);
                    });
                });
            } else {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="empty-table-message">No schedules found for the selected criteria</td>
                    </tr>
                `;
            }
        })
        .catch(error => {
            console.error('Failed to load schedules data:', error);
            const tableBody = document.getElementById('schedules-table-body');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="error-message">Error loading schedules data</td>
                </tr>
            `;
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
    
    // Add schedule button
    const addScheduleBtn = document.getElementById('add-schedule-btn');
    addScheduleBtn.addEventListener('click', showAddScheduleForm);
    
    // Schedule form submission
    const scheduleForm = document.getElementById('schedule-form');
    scheduleForm.addEventListener('submit', handleScheduleFormSubmit);
    
    // Confirm delete button
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    confirmDeleteBtn.addEventListener('click', deleteSchedule);
    
    // Filter changes
    const staffFilter = document.getElementById('staff-filter');
    const monthFilter = document.getElementById('month-filter');
    
    staffFilter.addEventListener('change', loadSchedulesList);
    monthFilter.addEventListener('change', loadSchedulesList);
}

/**
 * Show add schedule form
 */
function showAddScheduleForm() {
    // Reset form
    document.getElementById('schedule-form').reset();
    document.getElementById('schedule-id').value = '';
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('schedule-date').value = today;
    
    // Set modal title
    document.getElementById('schedule-modal-title').textContent = 'Add New Schedule';
    
    // Show modal
    document.getElementById('schedule-modal').style.display = 'flex';
}

/**
 * Edit schedule
 * @param {string} scheduleId - Schedule ID
 */
function editSchedule(scheduleId) {
    // Fetch schedule data
    api.get(`/api/schedules/${scheduleId}`)
        .then(schedule => {
            if (schedule) {
                // Fill form fields
                document.getElementById('schedule-id').value = schedule.id;
                document.getElementById('schedule-staff').value = schedule.user_id;
                
                // Format date
                const shiftDate = new Date(schedule.shift_date);
                const formattedDate = shiftDate.toISOString().split('T')[0];
                document.getElementById('schedule-date').value = formattedDate;
                
                // Determine shift type
                const startHour = parseInt(schedule.start_time.split(':')[0]);
                let shiftType = 'Regular';
                if (startHour < 12) {
                    shiftType = 'Morning';
                } else if (startHour < 18) {
                    shiftType = 'Afternoon';
                } else {
                    shiftType = 'Night';
                }
                document.getElementById('schedule-type').value = shiftType;
                
                // Set times
                document.getElementById('schedule-start').value = schedule.start_time.substring(0, 5);
                document.getElementById('schedule-end').value = schedule.end_time.substring(0, 5);
                
                // Set notes
                document.getElementById('schedule-notes').value = schedule.notes || '';
                
                // Set modal title
                document.getElementById('schedule-modal-title').textContent = 'Edit Schedule';
                
                // Show modal
                document.getElementById('schedule-modal').style.display = 'flex';
            }
        })
        .catch(error => {
            console.error('Failed to load schedule data:', error);
            showToast('Error loading schedule data', 'error');
        });
}

/**
 * Handle schedule form submission
 * @param {Event} e - Form submit event
 */
function handleScheduleFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const scheduleId = document.getElementById('schedule-id').value;
    const userId = document.getElementById('schedule-staff').value;
    const shiftDate = document.getElementById('schedule-date').value;
    const shiftType = document.getElementById('schedule-type').value;
    const startTime = document.getElementById('schedule-start').value;
    const endTime = document.getElementById('schedule-end').value;
    const notes = document.getElementById('schedule-notes').value;
    
    // Create data object
    const scheduleData = {
        user_id: userId,
        shift_date: shiftDate,
        shift_type: shiftType,
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        notes: notes
    };
    
    // Send request to API
    if (scheduleId) {
        // Update existing schedule
        api.put(`/api/schedules/${scheduleId}`, scheduleData)
            .then(response => {
                document.getElementById('schedule-modal').style.display = 'none';
                showToast('Schedule updated successfully', 'success');
                loadSchedulesList(); // Reload schedules list
            })
            .catch(error => {
                console.error('Failed to update schedule:', error);
                showToast('Error updating schedule', 'error');
            });
    } else {
        // Create new schedule
        api.post('/api/schedules', scheduleData)
            .then(response => {
                document.getElementById('schedule-modal').style.display = 'none';
                showToast('Schedule added successfully', 'success');
                loadSchedulesList(); // Reload schedules list
            })
            .catch(error => {
                console.error('Failed to add schedule:', error);
                showToast('Error adding schedule', 'error');
            });
    }
}

/**
 * Confirm delete schedule
 * @param {string} scheduleId - Schedule ID
 */
function confirmDeleteSchedule(scheduleId) {
    document.getElementById('confirm-delete-id').value = scheduleId;
    document.getElementById('confirm-modal').style.display = 'flex';
}

/**
 * Delete schedule
 */
function deleteSchedule() {
    const scheduleId = document.getElementById('confirm-delete-id').value;
    
    if (scheduleId) {
        api.delete(`/api/schedules/${scheduleId}`)
            .then(response => {
                document.getElementById('confirm-modal').style.display = 'none';
                showToast('Schedule deleted successfully', 'success');
                loadSchedulesList(); // Reload schedules list
            })
            .catch(error => {
                console.error('Failed to delete schedule:', error);
                showToast('Error deleting schedule', 'error');
            });
    }
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