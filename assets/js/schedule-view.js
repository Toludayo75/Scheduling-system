/**
 * Schedule Calendar View JavaScript for UITH Physiotherapy Scheduling System
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI elements using common UI function
    initCommonUI();
    
    // Initialize modals
    initModals();
    
    // Load calendar data
    loadCalendarData();
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Initialize modals and calendar
 */
function initModals() {
    // Initialize modal
    const scheduleDetailsModal = document.getElementById('schedule-details-modal');
    const scheduleDetailsClose = document.getElementById('schedule-details-close');
    
    if (scheduleDetailsClose) {
        scheduleDetailsClose.addEventListener('click', () => {
            scheduleDetailsModal.style.display = 'none';
        });
    }
    
    // Set current month
    const now = new Date();
    currentMonth = now.getMonth();
    currentYear = now.getFullYear();
    
    updateMonthDisplay();
}

// Global variables for month navigation
let currentMonth;
let currentYear;
let calendarData = {};

/**
 * Update the month display
 */
function updateMonthDisplay() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('current-month').textContent = `${months[currentMonth]} ${currentYear}`;
}

/**
 * Load calendar data
 */
function loadCalendarData() {
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
            
            if (staff && staff.length > 0) {
                staff.forEach(staffMember => {
                    const name = `${staffMember.firstname} ${staffMember.lastname}`;
                    
                    // Add to staff filter
                    const filterOption = document.createElement('option');
                    filterOption.value = staffMember.id;
                    filterOption.textContent = name;
                    staffFilter.appendChild(filterOption);
                });
            }
        })
        .catch(error => {
            console.error('Failed to load staff data:', error);
        });
    
    // Generate calendar
    generateCalendar();
    
    // Load schedule data for the current month
    loadMonthSchedules();
}

/**
 * Generate calendar for the current month
 */
function generateCalendar() {
    const calendarBody = document.getElementById('calendar-body');
    calendarBody.innerHTML = '';
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // Start the grid from the first day of the week
    let startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // Create 6 weeks to ensure all days are covered
    for (let week = 0; week < 6; week++) {
        const weekRow = document.createElement('div');
        weekRow.className = 'calendar-row';
        
        for (let day = 0; day < 7; day++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + (week * 7) + day);
            
            const isCurrentMonth = currentDate.getMonth() === currentMonth;
            const dateString = formatDate(currentDate);
            
            const cell = document.createElement('div');
            cell.className = `calendar-cell ${isCurrentMonth ? 'current-month' : 'other-month'}`;
            cell.setAttribute('data-date', dateString);
            
            // Add date to cell
            const dateDiv = document.createElement('div');
            dateDiv.className = 'calendar-date';
            dateDiv.textContent = currentDate.getDate();
            cell.appendChild(dateDiv);
            
            // Add container for schedule indicators
            const scheduleContainer = document.createElement('div');
            scheduleContainer.className = 'calendar-schedule-container';
            cell.appendChild(scheduleContainer);
            
            // Add click handler to show schedules for this day
            cell.addEventListener('click', () => {
                showDaySchedules(dateString);
            });
            
            weekRow.appendChild(cell);
        }
        
        calendarBody.appendChild(weekRow);
    }
}

/**
 * Load schedules for the current month
 */
function loadMonthSchedules() {
    const staffId = document.getElementById('staff-filter').value;
    
    // Clear previous data
    calendarData = {};
    
    // Get the first and last day of the displayed calendar (including days from other months)
    const firstDisplayedDay = new Date(currentYear, currentMonth, 1);
    firstDisplayedDay.setDate(firstDisplayedDay.getDate() - firstDisplayedDay.getDay());
    
    const lastDisplayedDay = new Date(firstDisplayedDay);
    lastDisplayedDay.setDate(firstDisplayedDay.getDate() + (6 * 7) - 1);
    
    const startDate = formatDate(firstDisplayedDay);
    const endDate = formatDate(lastDisplayedDay);
    
    let apiUrl = `/api/schedules?start_date=${startDate}&end_date=${endDate}`;
    
    if (staffId) {
        apiUrl = `/api/users/${staffId}/schedules?start_date=${startDate}&end_date=${endDate}`;
    }
    
    api.get(apiUrl)
        .then(schedules => {
            if (schedules && schedules.length > 0) {
                // Group schedules by date
                schedules.forEach(schedule => {
                    const shiftDate = schedule.shift_date.split('T')[0];
                    
                    if (!calendarData[shiftDate]) {
                        calendarData[shiftDate] = [];
                    }
                    
                    calendarData[shiftDate].push(schedule);
                });
                
                // Update calendar with schedule indicators
                updateCalendarCells();
            } else {
                // Clear all indicators
                updateCalendarCells();
            }
        })
        .catch(error => {
            console.error('Failed to load schedules data:', error);
            showToast('Error loading schedules data', 'error');
        });
}

/**
 * Update calendar cells with schedule indicators
 */
function updateCalendarCells() {
    // Remove previous indicators
    document.querySelectorAll('.calendar-schedule-indicator').forEach(indicator => {
        indicator.remove();
    });
    
    // Add indicators for each date with schedules
    for (const date in calendarData) {
        const cell = document.querySelector(`.calendar-cell[data-date="${date}"]`);
        if (cell) {
            const scheduleContainer = cell.querySelector('.calendar-schedule-container');
            scheduleContainer.innerHTML = '';
            
            // Group schedules by shift type
            const schedulesByType = {
                Morning: 0,
                Afternoon: 0,
                Night: 0
            };
            
            calendarData[date].forEach(schedule => {
                const startHour = parseInt(schedule.start_time.split(':')[0]);
                
                if (startHour < 12) {
                    schedulesByType.Morning++;
                } else if (startHour < 18) {
                    schedulesByType.Afternoon++;
                } else {
                    schedulesByType.Night++;
                }
            });
            
            // Create indicator for each type
            for (const type in schedulesByType) {
                if (schedulesByType[type] > 0) {
                    const indicator = document.createElement('div');
                    indicator.className = `calendar-schedule-indicator ${type.toLowerCase()}-shift`;
                    indicator.textContent = `${type}: ${schedulesByType[type]}`;
                    scheduleContainer.appendChild(indicator);
                }
            }
        }
    }
}

/**
 * Show schedules for a specific day
 * @param {string} dateString - Date string in YYYY-MM-DD format
 */
function showDaySchedules(dateString) {
    const daySchedules = calendarData[dateString] || [];
    
    // Format date for display
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    
    // Set modal title
    document.getElementById('schedule-details-title').textContent = `Schedules for ${formattedDate}`;
    
    // Fill modal with schedules
    const schedulesContainer = document.getElementById('day-schedules');
    
    if (daySchedules.length > 0) {
        let html = '<div class="schedule-list">';
        
        // Sort schedules by start time
        daySchedules.sort((a, b) => {
            return a.start_time.localeCompare(b.start_time);
        });
        
        daySchedules.forEach(schedule => {
            const staffName = schedule.user ? 
                `${schedule.user.firstname} ${schedule.user.lastname}` : 
                'Unknown';
            
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
            
            // Format times
            const startTime = formatTime(schedule.start_time);
            const endTime = formatTime(schedule.end_time);
            
            html += `
                <div class="schedule-item ${shiftType.toLowerCase()}-shift">
                    <div class="schedule-time">${startTime} - ${endTime}</div>
                    <div class="schedule-staff">${staffName}</div>
                    <div class="schedule-type-badge">${shiftType}</div>
                </div>
            `;
        });
        
        html += '</div>';
        schedulesContainer.innerHTML = html;
    } else {
        schedulesContainer.innerHTML = '<p class="empty-message">No schedules for this day</p>';
    }
    
    // Show modal
    document.getElementById('schedule-details-modal').style.display = 'flex';
}

/**
 * Format date to YYYY-MM-DD string
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    
    // Previous month button
    const prevMonthBtn = document.getElementById('prev-month');
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        updateMonthDisplay();
        generateCalendar();
        loadMonthSchedules();
    });
    
    // Next month button
    const nextMonthBtn = document.getElementById('next-month');
    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        updateMonthDisplay();
        generateCalendar();
        loadMonthSchedules();
    });
    
    // Staff filter
    const staffFilter = document.getElementById('staff-filter');
    staffFilter.addEventListener('change', loadMonthSchedules);
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