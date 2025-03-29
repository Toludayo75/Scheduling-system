document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Initialize common UI elements (sidebar, user dropdown, logout)
    initCommonUI();
    
    // Load dashboard-specific user information
    loadDashboardUserInfo();
    
    // Load user's schedule
    loadSchedule();
    
    // Load notifications
    loadNotifications();

    // Initialize event listeners for shift request modal
    initShiftRequestModal();

    // Initialize calendar
    initCalendar();
    
    // Initialize sidebar navigation
    initSidebarNavigation();
});

// Check if user is authenticated and has the correct role
function checkAuth() {
    fetch('/api/user', {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) return response.json();
        throw new Error('Not authenticated');
    })
    .then(user => {
        if (user.role_id !== '2') { // Not a Physiotherapist
            // Redirect based on role
            if (user.role_id === '1') { // Admin
                window.location.href = '/views/admin.html';
            } else if (user.role_id === '3') { // System Admin
                window.location.href = '/views/system-admin.html';
            }
        }
    })
    .catch(() => {
        // Redirect to login
        window.location.href = '/views/auth.html';
    });
}

// Load dashboard-specific user information
function loadDashboardUserInfo() {
    api.get('/api/user')
        .then(user => {
            // Set contract type
            const contractTypeElement = document.getElementById('contract-type');
            if (contractTypeElement) {
                contractTypeElement.textContent = user.contract_type;
            }
            
            // Update welcome message
            const welcomeMessageElement = document.getElementById('welcome-message');
            if (welcomeMessageElement) {
                welcomeMessageElement.textContent = `Welcome, ${user.firstname}!`;
            }
        })
        .catch(error => {
            console.error('Failed to load dashboard user info:', error);
        });
}

// Load user's schedule
function loadSchedule() {
    const upcomingShiftsElement = document.getElementById('upcoming-shifts');
    const upcomingShiftsLoader = document.getElementById('upcoming-shifts-loader');
    
    if (upcomingShiftsElement && upcomingShiftsLoader) {
        upcomingShiftsLoader.style.display = 'block';
        
        fetch('/api/schedules/user', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(schedules => {
            upcomingShiftsLoader.style.display = 'none';
            
            if (schedules.length === 0) {
                upcomingShiftsElement.innerHTML = '<p>No upcoming shifts scheduled.</p>';
                return;
            }
            
            // Sort schedules by date and time
            schedules.sort((a, b) => {
                const dateA = new Date(`${a.shift_date}T${a.start_time}`);
                const dateB = new Date(`${b.shift_date}T${b.start_time}`);
                return dateA - dateB;
            });
            
            // Filter to show only upcoming shifts (today and future)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const upcomingSchedules = schedules.filter(schedule => {
                const shiftDate = new Date(schedule.shift_date);
                shiftDate.setHours(0, 0, 0, 0);
                return shiftDate >= today;
            });
            
            // Limit to next 5 shifts
            const nextShifts = upcomingSchedules.slice(0, 5);
            
            // Create HTML for shifts
            let shiftsHTML = '<div class="upcoming-shifts-list">';
            
            nextShifts.forEach(shift => {
                const shiftDate = new Date(shift.shift_date);
                const formattedDate = shiftDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                });
                
                const startTime = formatTime(shift.start_time);
                const endTime = formatTime(shift.end_time);
                
                shiftsHTML += `
                    <div class="shift-item">
                        <div class="shift-date">${formattedDate}</div>
                        <div class="shift-time">${startTime} - ${endTime}</div>
                        <div class="shift-status ${shift.status.toLowerCase()}">${shift.status}</div>
                        <button class="btn btn-outline btn-sm request-change" data-id="${shift.id}">Request Change</button>
                    </div>
                `;
            });
            
            shiftsHTML += '</div>';
            upcomingShiftsElement.innerHTML = shiftsHTML;
            
            // Add event listeners to "Request Change" buttons
            document.querySelectorAll('.request-change').forEach(button => {
                button.addEventListener('click', function() {
                    const scheduleId = this.getAttribute('data-id');
                    openShiftRequestModal(scheduleId);
                });
            });
        })
        .catch(error => {
            upcomingShiftsLoader.style.display = 'none';
            upcomingShiftsElement.innerHTML = '<p class="error">Failed to load schedule. Please try again later.</p>';
            console.error('Failed to load schedule:', error);
        });
    }

    // Update shift count in dashboard card
    updateShiftCount();
}

// Update shift count in dashboard card
function updateShiftCount() {
    const shiftCountElement = document.getElementById('shift-count');
    
    if (shiftCountElement) {
        fetch('/api/schedules/user/count', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            shiftCountElement.textContent = data.count;
        })
        .catch(error => {
            console.error('Failed to load shift count:', error);
            shiftCountElement.textContent = '0';
        });
    }
}

// Load notifications
function loadNotifications() {
    const notificationsElement = document.getElementById('notifications');
    const notificationsLoader = document.getElementById('notifications-loader');
    const notificationBadge = document.getElementById('notification-badge');
    
    if (notificationsElement && notificationsLoader) {
        notificationsLoader.style.display = 'block';
        
        fetch('/api/notifications', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(notifications => {
            notificationsLoader.style.display = 'none';
            
            if (notifications.length === 0) {
                notificationsElement.innerHTML = '<p>No new notifications.</p>';
                if (notificationBadge) {
                    notificationBadge.style.display = 'none';
                }
                return;
            }
            
            // Count unread notifications
            const unreadCount = notifications.filter(n => !n.is_read).length;
            
            if (notificationBadge && unreadCount > 0) {
                notificationBadge.textContent = unreadCount;
                notificationBadge.style.display = 'block';
            } else if (notificationBadge) {
                notificationBadge.style.display = 'none';
            }
            
            // Sort notifications by date (newest first)
            notifications.sort((a, b) => {
                return new Date(b.created_at) - new Date(a.created_at);
            });
            
            // Create HTML for notifications
            let notificationsHTML = '<div class="notifications-list">';
            
            notifications.forEach(notification => {
                const createdAt = new Date(notification.created_at);
                const formattedDate = createdAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                notificationsHTML += `
                    <div class="notification-item ${!notification.is_read ? 'unread' : ''}">
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-time">${formattedDate}</div>
                        ${!notification.is_read ? `<button class="btn btn-sm mark-read" data-id="${notification.id}">Mark as Read</button>` : ''}
                    </div>
                `;
            });
            
            notificationsHTML += '</div>';
            notificationsElement.innerHTML = notificationsHTML;
            
            // Add event listeners to "Mark as Read" buttons
            document.querySelectorAll('.mark-read').forEach(button => {
                button.addEventListener('click', function() {
                    const notificationId = this.getAttribute('data-id');
                    markNotificationAsRead(notificationId, this.closest('.notification-item'));
                });
            });
        })
        .catch(error => {
            notificationsLoader.style.display = 'none';
            notificationsElement.innerHTML = '<p class="error">Failed to load notifications. Please try again later.</p>';
            console.error('Failed to load notifications:', error);
        });
    }
}

// Mark notification as read
function markNotificationAsRead(notificationId, notificationElement) {
    fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include'
    })
    .then(response => {
        if (response.ok) {
            // Remove unread class
            notificationElement.classList.remove('unread');
            
            // Remove mark as read button
            const markReadButton = notificationElement.querySelector('.mark-read');
            if (markReadButton) {
                markReadButton.remove();
            }
            
            // Update notification badge
            const notificationBadge = document.getElementById('notification-badge');
            if (notificationBadge) {
                const currentCount = parseInt(notificationBadge.textContent);
                if (currentCount > 1) {
                    notificationBadge.textContent = currentCount - 1;
                } else {
                    notificationBadge.style.display = 'none';
                }
            }
        }
    })
    .catch(error => {
        console.error('Failed to mark notification as read:', error);
        alert('Failed to mark notification as read. Please try again.');
    });
}

// Initialize shift request modal
function initShiftRequestModal() {
    const modal = document.getElementById('shift-request-modal');
    const overlay = document.getElementById('modal-overlay');
    const closeButton = document.getElementById('modal-close');
    const shiftRequestForm = document.getElementById('shift-request-form');
    const requestTypeSelect = document.getElementById('request-type');
    const swapStaffContainer = document.getElementById('swap-staff-container');
    const swapStaffSelect = document.getElementById('swap-staff');
    const cancelButton = document.getElementById('modal-cancel');
    
    if (modal && overlay && closeButton && shiftRequestForm) {
        // Initialize physiotherapist dropdown for swap
        fetch('/api/users/physiotherapists', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(physiotherapists => {
            // Clear existing options except the default one
            while (swapStaffSelect.options.length > 1) {
                swapStaffSelect.remove(1);
            }
            
            // Add physiotherapists to dropdown
            physiotherapists.forEach(staff => {
                const option = document.createElement('option');
                option.value = staff.id;
                option.textContent = `${staff.first_name} ${staff.last_name}`;
                swapStaffSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Failed to load physiotherapists:', error);
        });
        
        // Handle request type change
        if (requestTypeSelect) {
            requestTypeSelect.addEventListener('change', function() {
                if (this.value === 'swap') {
                    swapStaffContainer.style.display = 'block';
                    swapStaffSelect.required = true;
                } else {
                    swapStaffContainer.style.display = 'none';
                    swapStaffSelect.required = false;
                }
            });
        }
        
        // Close modal when clicking close button
        closeButton.addEventListener('click', function() {
            overlay.classList.remove('show');
        });
        
        // Close modal when clicking cancel button
        cancelButton.addEventListener('click', function() {
            overlay.classList.remove('show');
        });
        
        // Close modal when clicking outside
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.classList.remove('show');
            }
        });
        
        // Handle form submission
        const submitButton = document.getElementById('submit-request');
        submitButton.addEventListener('click', function() {
            const scheduleId = document.getElementById('schedule-id').value;
            const reason = document.getElementById('request-reason').value;
            const requestType = document.getElementById('request-type').value;
            const swapStaffId = requestType === 'swap' ? document.getElementById('swap-staff').value : null;
            
            if (!reason) {
                alert('Please provide a reason for your request.');
                return;
            }
            
            if (requestType === 'swap' && !swapStaffId) {
                alert('Please select a staff member to swap with.');
                return;
            }
            
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
            
            const requestData = {
                schedule_id: scheduleId,
                reason: reason,
                request_type: requestType
            };
            
            if (requestType === 'swap') {
                requestData.swap_staff_id = swapStaffId;
            }
            
            fetch('/api/shift-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(requestData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to submit request');
                }
                return response.json();
            })
            .then(data => {
                // Close modal
                overlay.classList.remove('show');
                
                // Show success message
                alert(`Shift ${requestType === 'swap' ? 'swap' : 'cover'} request submitted successfully.`);
                
                // Update the UI to reflect the request
                const requestButton = document.querySelector(`.request-change[data-id="${scheduleId}"]`);
                if (requestButton) {
                    requestButton.textContent = 'Requested';
                    requestButton.disabled = true;
                    requestButton.classList.add('requested');
                }
            })
            .catch(error => {
                console.error('Failed to submit shift request:', error);
                alert('Failed to submit request. Please try again later.');
            })
            .finally(() => {
                // Reset button
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            });
        });
    }
}

// Open shift request modal
function openShiftRequestModal(scheduleId) {
    const modal = document.getElementById('shift-request-modal');
    const overlay = document.getElementById('modal-overlay');
    const scheduleIdInput = document.getElementById('schedule-id');
    const shiftDetailsElement = document.getElementById('shift-details');
    const requestType = document.getElementById('request-type');
    const swapStaffContainer = document.getElementById('swap-staff-container');
    
    if (modal && overlay && scheduleIdInput && shiftDetailsElement) {
        // Set schedule ID
        scheduleIdInput.value = scheduleId;
        
        // Clear form
        document.getElementById('request-reason').value = '';
        
        // Reset request type to default
        if (requestType) {
            requestType.value = 'swap';
            // Show swap staff dropdown for 'swap' option
            if (swapStaffContainer) {
                swapStaffContainer.style.display = 'block';
            }
        }
        
        // Get shift details
        fetch(`/api/schedules/${scheduleId}`, {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(shift => {
            const shiftDate = new Date(shift.shift_date);
            const formattedDate = shiftDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
            
            const startTime = formatTime(shift.start_time);
            const endTime = formatTime(shift.end_time);
            
            shiftDetailsElement.innerHTML = `
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
                <p><strong>Shift Type:</strong> ${shift.shift_type || 'Regular'}</p>
                <p><strong>Location:</strong> ${shift.location || 'Main Department'}</p>
            `;
            
            // Show modal
            overlay.classList.add('show');
        })
        .catch(error => {
            console.error('Failed to load shift details:', error);
            alert('Failed to load shift details. Please try again.');
        });
    }
}

// Initialize calendar
function initCalendar() {
    const calendar = document.getElementById('calendar');
    
    if (calendar) {
        // Get current date
        const currentDate = new Date();
        let currentMonth = currentDate.getMonth();
        let currentYear = currentDate.getFullYear();
        
        // Initialize calendar with current month
        renderCalendar(currentMonth, currentYear);
        
        // Add event listeners for navigation
        const prevMonthButton = document.getElementById('prev-month');
        const nextMonthButton = document.getElementById('next-month');
        const calendarTitle = document.getElementById('calendar-title');
        
        if (prevMonthButton && nextMonthButton && calendarTitle) {
            prevMonthButton.addEventListener('click', function() {
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
                renderCalendar(currentMonth, currentYear);
            });
            
            nextMonthButton.addEventListener('click', function() {
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                renderCalendar(currentMonth, currentYear);
            });
        }
    }
}

// Render calendar for a given month and year
function renderCalendar(month, year) {
    const calendarGrid = document.getElementById('calendar-grid');
    const calendarTitle = document.getElementById('calendar-title');
    
    if (!calendarGrid || !calendarTitle) return;
    
    // Set calendar title
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    calendarTitle.textContent = `${monthNames[month]} ${year}`;
    
    // Clear previous calendar
    calendarGrid.innerHTML = '';
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get previous month's days to fill in before first day
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    // Create day name headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesRow = document.createElement('div');
    dayNamesRow.className = 'calendar-day-names';
    
    dayNames.forEach(day => {
        const dayNameElement = document.createElement('div');
        dayNameElement.className = 'calendar-day-name';
        dayNameElement.textContent = day;
        dayNamesRow.appendChild(dayNameElement);
    });
    
    calendarGrid.appendChild(dayNamesRow);
    
    // Create calendar grid
    const daysGrid = document.createElement('div');
    daysGrid.className = 'calendar-grid';
    
    // Create days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day inactive';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        
        const dayNumber = document.createElement('span');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = prevMonthDays - i;
        
        dayHeader.appendChild(dayNumber);
        day.appendChild(dayHeader);
        daysGrid.appendChild(day);
    }
    
    // Create days for current month
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    const todayDate = today.getDate();
    
    // Load shifts for the current month
    fetch(`/api/schedules/user/month/${year}/${month + 1}`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(shifts => {
        // Create days for current month
        for (let i = 1; i <= daysInMonth; i++) {
            const day = document.createElement('div');
            day.className = 'calendar-day';
            
            // Check if day is today
            if (isCurrentMonth && i === todayDate) {
                day.classList.add('today');
            }
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            
            const dayNumber = document.createElement('span');
            dayNumber.className = 'calendar-day-number';
            dayNumber.textContent = i;
            
            dayHeader.appendChild(dayNumber);
            day.appendChild(dayHeader);
            
            // Add shifts for this day
            const dayShifts = shifts.filter(shift => {
                const shiftDate = new Date(shift.shift_date);
                return shiftDate.getDate() === i;
            });
            
            dayShifts.forEach(shift => {
                const shiftElement = document.createElement('div');
                shiftElement.className = 'calendar-event';
                
                // Add class based on shift type
                if (shift.shift_type) {
                    shiftElement.classList.add(`${shift.shift_type.toLowerCase()}-shift`);
                }
                
                const startTime = formatTime(shift.start_time);
                const endTime = formatTime(shift.end_time);
                
                shiftElement.textContent = `${shift.shift_type || ''} ${startTime} - ${endTime}`;
                
                // Add click event to show shift details
                shiftElement.addEventListener('click', function() {
                    openShiftRequestModal(shift.id);
                });
                
                day.appendChild(shiftElement);
            });
            
            daysGrid.appendChild(day);
        }
        
        // Calculate days from next month
        const totalDaysDisplayed = firstDay + daysInMonth;
        const daysFromNextMonth = 42 - totalDaysDisplayed; // 6 rows of 7 days
        
        // Create days from next month
        for (let i = 1; i <= daysFromNextMonth; i++) {
            const day = document.createElement('div');
            day.className = 'calendar-day inactive';
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            
            const dayNumber = document.createElement('span');
            dayNumber.className = 'calendar-day-number';
            dayNumber.textContent = i;
            
            dayHeader.appendChild(dayNumber);
            day.appendChild(dayHeader);
            daysGrid.appendChild(day);
        }
        
        calendarGrid.appendChild(daysGrid);
    })
    .catch(error => {
        console.error('Failed to load shifts for calendar:', error);
        
        // Create days for current month without shifts
        for (let i = 1; i <= daysInMonth; i++) {
            const day = document.createElement('div');
            day.className = 'calendar-day';
            
            // Check if day is today
            if (isCurrentMonth && i === todayDate) {
                day.classList.add('today');
            }
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            
            const dayNumber = document.createElement('span');
            dayNumber.className = 'calendar-day-number';
            dayNumber.textContent = i;
            
            dayHeader.appendChild(dayNumber);
            day.appendChild(dayHeader);
            daysGrid.appendChild(day);
        }
        
        // Calculate days from next month
        const totalDaysDisplayed = firstDay + daysInMonth;
        const daysFromNextMonth = 42 - totalDaysDisplayed; // 6 rows of 7 days
        
        // Create days from next month
        for (let i = 1; i <= daysFromNextMonth; i++) {
            const day = document.createElement('div');
            day.className = 'calendar-day inactive';
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            
            const dayNumber = document.createElement('span');
            dayNumber.className = 'calendar-day-number';
            dayNumber.textContent = i;
            
            dayHeader.appendChild(dayNumber);
            day.appendChild(dayHeader);
            daysGrid.appendChild(day);
        }
        
        calendarGrid.appendChild(daysGrid);
    });
}

// Helper function to format time
function formatTime(timeStr) {
    if (!timeStr) return '';
    
    const [hours, minutes] = timeStr.split(':');
    let hour = parseInt(hours);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    
    hour = hour % 12;
    hour = hour ? hour : 12; // Convert 0 to 12
    
    return `${hour}:${minutes} ${suffix}`;
}

// Initialize sidebar navigation links
function initSidebarNavigation() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const contentSections = document.querySelectorAll('.content-section');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Prevent default anchor behavior
            e.preventDefault();
            
            // Remove active class from all sidebar items
            sidebarItems.forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get the target section from href attribute (e.g., #dashboard)
            const target = this.getAttribute('href').substring(1);
            
            // Hide all content sections
            contentSections.forEach(section => {
                section.style.display = 'none';
            });
            
            // Show the target section
            const targetSection = document.getElementById(`${target}-section`);
            if (targetSection) {
                targetSection.style.display = 'block';
                
                // Load section-specific data if needed
                if (target === 'requests' && !document.querySelector('#shift-requests .shift-request-item')) {
                    loadShiftRequests();
                } else if (target === 'profile' && !document.querySelector('#profile-info .profile-details')) {
                    loadProfileInfo();
                }
            }
        });
    });
    
    // Default to showing dashboard section on page load
    document.querySelector('.sidebar-item.active').click();
}

// Load user's shift requests
function loadShiftRequests() {
    const shiftRequestsElement = document.getElementById('shift-requests');
    const shiftRequestsLoader = document.getElementById('shift-requests-loader');
    
    if (shiftRequestsElement && shiftRequestsLoader) {
        shiftRequestsLoader.style.display = 'block';
        
        fetch('/api/shift-requests/user', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(requests => {
            shiftRequestsLoader.style.display = 'none';
            
            if (requests.length === 0) {
                shiftRequestsElement.innerHTML = '<p>No pending shift change requests.</p>';
                return;
            }
            
            // Sort requests by date (newest first)
            requests.sort((a, b) => {
                return new Date(b.created_at) - new Date(a.created_at);
            });
            
            // Create HTML for requests
            let requestsHTML = '<div class="shift-requests-list">';
            
            requests.forEach(request => {
                const createdAt = new Date(request.created_at);
                const formattedDate = createdAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                
                const shiftDate = new Date(request.shift.shift_date);
                const formattedShiftDate = shiftDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                });
                
                const statusClass = request.status.toLowerCase();
                
                requestsHTML += `
                    <div class="shift-request-item">
                        <div class="shift-request-header">
                            <div class="shift-request-date">${formattedShiftDate}</div>
                            <div class="shift-request-status ${statusClass}">${request.status}</div>
                        </div>
                        <div class="shift-request-time">${formatTime(request.shift.start_time)} - ${formatTime(request.shift.end_time)}</div>
                        <div class="shift-request-type">${request.request_type === 'swap' ? 'Swap request' : 'Cover request'}</div>
                        <div class="shift-request-reason">${request.reason}</div>
                        <div class="shift-request-created">Requested on ${formattedDate}</div>
                        ${request.status === 'Pending' ? `<button class="btn btn-outline btn-sm cancel-request" data-id="${request.id}">Cancel Request</button>` : ''}
                    </div>
                `;
            });
            
            requestsHTML += '</div>';
            shiftRequestsElement.innerHTML = requestsHTML;
            
            // Add event listeners to "Cancel Request" buttons
            document.querySelectorAll('.cancel-request').forEach(button => {
                button.addEventListener('click', function() {
                    const requestId = this.getAttribute('data-id');
                    if (confirm('Are you sure you want to cancel this request?')) {
                        cancelShiftRequest(requestId, this.closest('.shift-request-item'));
                    }
                });
            });
        })
        .catch(error => {
            shiftRequestsLoader.style.display = 'none';
            shiftRequestsElement.innerHTML = '<p class="error">Failed to load shift requests. Please try again later.</p>';
            console.error('Failed to load shift requests:', error);
        });
    }
}

// Cancel a shift request
function cancelShiftRequest(requestId, requestElement) {
    fetch(`/api/shift-requests/${requestId}`, {
        method: 'DELETE',
        credentials: 'include'
    })
    .then(response => {
        if (response.ok) {
            // Remove the request element from the DOM
            requestElement.remove();
            
            // Check if there are no more requests
            const requestsList = document.querySelector('.shift-requests-list');
            if (!requestsList || requestsList.children.length === 0) {
                document.getElementById('shift-requests').innerHTML = '<p>No pending shift change requests.</p>';
            }
            
            // Show success message
            alert('Shift request canceled successfully');
        } else {
            throw new Error('Failed to cancel request');
        }
    })
    .catch(error => {
        console.error('Error canceling shift request:', error);
        alert('Failed to cancel shift request. Please try again.');
    });
}

// Load user profile information
function loadProfileInfo() {
    const profileInfoElement = document.getElementById('profile-info');
    const profileLoader = document.getElementById('profile-loader');
    
    if (profileInfoElement && profileLoader) {
        profileLoader.style.display = 'block';
        
        fetch('/api/user', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(user => {
            profileLoader.style.display = 'none';
            
            const profileHTML = `
                <div class="profile-details">
                    <div class="profile-avatar">${user.firstname.charAt(0)}${user.lastname.charAt(0)}</div>
                    <div class="profile-info-item">
                        <div class="profile-label">Full Name</div>
                        <div class="profile-value">${user.firstname} ${user.lastname}</div>
                    </div>
                    <div class="profile-info-item">
                        <div class="profile-label">Email</div>
                        <div class="profile-value">${user.email}</div>
                    </div>
                    <div class="profile-info-item">
                        <div class="profile-label">Contract Type</div>
                        <div class="profile-value">${user.contract_type}</div>
                    </div>
                    <div class="profile-info-item">
                        <div class="profile-label">Role</div>
                        <div class="profile-value">Physiotherapist</div>
                    </div>
                    <div class="profile-buttons">
                        <button class="btn btn-primary" id="edit-profile-button">Edit Profile</button>
                        <button class="btn btn-outline" id="change-password-button">Change Password</button>
                    </div>
                </div>
            `;
            
            profileInfoElement.innerHTML = profileHTML;
            
            // Add event listeners for profile buttons
            document.getElementById('edit-profile-button').addEventListener('click', function() {
                alert('Edit profile functionality will be implemented in the future.');
            });
            
            document.getElementById('change-password-button').addEventListener('click', function() {
                alert('Change password functionality will be implemented in the future.');
            });
        })
        .catch(error => {
            profileLoader.style.display = 'none';
            profileInfoElement.innerHTML = '<p class="error">Failed to load profile information. Please try again later.</p>';
            console.error('Failed to load profile information:', error);
        });
    }
}
