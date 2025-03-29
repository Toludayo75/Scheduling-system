/**
 * Common JavaScript functionality for UITH Physiotherapy Scheduling System
 * This file contains shared functions used across multiple pages
 */

/**
 * Initialize the sidebar toggle
 */
function initSidebar() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebar) {
        console.log('Initializing sidebar toggle buttons');
        
        // Function to toggle the sidebar
        const toggleSidebar = () => {
            console.log('Toggle sidebar called');
            if (sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
                console.log('Sidebar show class removed');
            } else {
                sidebar.classList.add('show');
                console.log('Sidebar show class added');
            }
            console.log('Sidebar classes after toggle:', sidebar.className);
            
            // For accessibility
            const isOpen = sidebar.classList.contains('show');
            if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', isOpen);
            if (mobileToggle) mobileToggle.setAttribute('aria-expanded', isOpen);
        };
        
        // Set up the sidebar toggle inside the sidebar
        if (sidebarToggle) {
            console.log('Adding event listener to sidebar toggle button');
            // We'll use the original element instead of cloning
            sidebarToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Sidebar toggle button clicked');
                toggleSidebar();
            });
        }
        
        // Set up the mobile toggle in the header
        if (mobileToggle) {
            console.log('Adding event listener to mobile toggle button');
            // We'll use the original element instead of cloning
            mobileToggle.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Mobile toggle button clicked');
                toggleSidebar();
                return false; // Prevent default and stop propagation
            });
        }
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                sidebar.classList.contains('show') && 
                !sidebar.contains(e.target) && 
                !sidebarToggle?.contains(e.target) && 
                !mobileToggle?.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
            }
        });
        
        // Handle resize events to show sidebar on larger screens
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('show'); // Reset to default state on desktop
            }
        });
    } else {
        console.warn('Sidebar element not found');
    }
}

/**
 * Initialize the user dropdown menu
 */
function initUserDropdown() {
    const userMenu = document.getElementById('user-menu');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userMenu && userDropdown) {
        // Remove any existing event listeners (in case this is called multiple times)
        const newUserMenu = userMenu.cloneNode(true);
        userMenu.parentNode.replaceChild(newUserMenu, userMenu);
        
        // Add the click event listener to the new element
        newUserMenu.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            userDropdown.classList.toggle('show');
            console.log('Dropdown toggled');
        });
        
        // Prevent the dropdown from closing when clicking inside it
        userDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Close the dropdown when clicking outside
        document.addEventListener('click', () => {
            if (userDropdown.classList.contains('show')) {
                userDropdown.classList.remove('show');
            }
        });
    } else {
        console.warn('User dropdown elements not found');
    }
}

/**
 * Set up logout functionality
 */
function setupLogout() {
    const logoutButtons = document.querySelectorAll('#logout-button, #logout-button-dropdown');
    
    logoutButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    });
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
 * Load user information into UI elements
 */
function loadUserInfo() {
    api.get('/api/user')
        .then(user => {
            if (user) {
                // Set avatar
                const initials = getInitials(user.firstname, user.lastname);
                const avatarElement = document.getElementById('user-avatar');
                if (avatarElement) {
                    avatarElement.textContent = initials;
                }
                
                // Set user name
                const fullName = `${user.firstname} ${user.lastname}`;
                const nameElement = document.getElementById('user-name');
                if (nameElement) {
                    nameElement.textContent = fullName;
                }
            }
        })
        .catch(error => {
            console.error('Failed to load user data:', error);
        });
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
 * Initialize all common UI elements and event listeners
 */
function initCommonUI() {
    console.log('Initializing common UI elements');
    try {
        initSidebar();
        initUserDropdown();
        setupLogout();
        loadUserInfo();
        
        // Add manual dropdown trigger for the user menu as a fallback
        document.querySelectorAll('.user-menu').forEach(menu => {
            console.log('Found a user menu, setting up manual dropdown trigger');
            const dropdown = document.getElementById('user-dropdown');
            if (menu && dropdown) {
                menu.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    dropdown.classList.toggle('show');
                    console.log('Manual dropdown toggle triggered');
                });
            }
        });
    } catch (error) {
        console.error('Error in initCommonUI:', error);
    }
}

// Initialize common UI when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired - initializing UI components');
    
    // Add a small delay to ensure all DOM elements are fully loaded
    setTimeout(() => {
        initCommonUI();
        
        // Add direct click handler for user-menu as a fallback
        const userMenu = document.getElementById('user-menu');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (userMenu && userDropdown) {
            console.log('Adding direct click handler for user menu');
            userMenu.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                userDropdown.classList.toggle('show');
                console.log('Direct dropdown toggle');
            };
        }
        
        // Extra direct handler for mobile toggle as failsafe
        const mobileToggle = document.getElementById('mobile-toggle');
        const sidebar = document.getElementById('sidebar');
        if (mobileToggle && sidebar) {
            console.log('Setting up extra direct handler for mobile toggle');
            mobileToggle.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (sidebar.classList.contains('show')) {
                    sidebar.classList.remove('show');
                    console.log('Sidebar show class removed via direct handler');
                } else {
                    sidebar.classList.add('show');
                    console.log('Sidebar show class added via direct handler');
                }
                console.log('Extra direct sidebar toggle via mobile button');
                return false;
            };
        }
    }, 100);
});