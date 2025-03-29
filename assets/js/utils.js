/**
 * Utility functions for UITH Physiotherapy Scheduling System
 */

/**
 * Format a date object to a human-readable string
 * @param {Date|string} date - Date object or date string
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string
 */
function formatDate(date, options = {}) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const defaultOptions = { 
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    };
    
    const formatOptions = { ...defaultOptions, ...options };
    return dateObj.toLocaleDateString('en-US', formatOptions);
}

/**
 * Generate a random ID
 * @returns {string} - Random ID
 */
function generateId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
}

/**
 * Debounce a function to limit how often it can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait = 300) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Parse URL query parameters
 * @returns {Object} - Object containing query parameters
 */
function getQueryParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    
    if (queryString) {
        const pairs = queryString.split('&');
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
    }
    
    return params;
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, or empty object)
 * @param {*} value - Value to check
 * @returns {boolean} - True if empty, false otherwise
 */
function isEmpty(value) {
    if (value === null || value === undefined) {
        return true;
    }
    
    if (typeof value === 'string' && value.trim() === '') {
        return true;
    }
    
    if (Array.isArray(value) && value.length === 0) {
        return true;
    }
    
    if (typeof value === 'object' && Object.keys(value).length === 0) {
        return true;
    }
    
    return false;
}

/**
 * Create element with HTML content
 * @param {string} html - HTML content
 * @returns {HTMLElement} - Created element
 */
function createElementFromHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstChild;
}

/**
 * Format time for display (12-hour format)
 * @param {string} time - Time string in 24-hour format (HH:MM:SS)
 * @returns {string} - Formatted time string in 12-hour format
 */
function formatTimeDisplay(time) {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Get color based on status
 * @param {string} status - Status string
 * @returns {string} - Color code
 */
function getStatusColor(status) {
    const colors = {
        'Approved': '#28a745',
        'Pending': '#ffc107',
        'Rejected': '#dc3545',
        'Completed': '#007bff',
        'Canceled': '#6c757d'
    };
    
    return colors[status] || '#6c757d';
}

/**
 * Convert 12-hour time format to 24-hour format
 * @param {string} time12h - Time string in 12-hour format (hh:mm AM/PM)
 * @returns {string} - Time string in 24-hour format (HH:MM:00)
 */
function convertTo24Hour(time12h) {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
        hours = '00';
    }
    
    if (modifier === 'PM') {
        hours = parseInt(hours, 10) + 12;
    }
    
    return `${hours}:${minutes}:00`;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Object with validation result and message
 */
function validatePassword(password) {
    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    
    if (!(/[A-Z]/.test(password))) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!(/[a-z]/.test(password))) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    if (!(/[0-9]/.test(password))) {
        return { valid: false, message: 'Password must contain at least one number' };
    }
    
    if (!(/[!@#$%^&*(),.?":{}|<>]/.test(password))) {
        return { valid: false, message: 'Password must contain at least one special character' };
    }
    
    return { valid: true, message: 'Password is strong' };
}