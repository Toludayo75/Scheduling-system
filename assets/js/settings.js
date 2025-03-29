/**
 * Settings JavaScript for UITH Physiotherapy Scheduling System
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize common UI elements
    initCommonUI();
    
    // Load settings
    loadSettings();
    
    // Set up event listeners
    setupEventListeners();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Save settings button
    const saveSettingsButton = document.getElementById('save-settings-btn');
    
    if (saveSettingsButton) {
        saveSettingsButton.addEventListener('click', () => {
            saveSettings();
        });
    }
    
    // Theme selector
    const themeSelect = document.getElementById('theme-select');
    
    if (themeSelect) {
        themeSelect.addEventListener('change', () => {
            applyTheme(themeSelect.value);
        });
    }
}

/**
 * Load user settings
 */
function loadSettings() {
    // For this prototype, we'll just use localStorage to store settings
    // In a real application, these would come from the server
    
    // Theme
    const theme = localStorage.getItem('theme') || 'light';
    const themeSelect = document.getElementById('theme-select');
    
    if (themeSelect) {
        themeSelect.value = theme;
    }
    
    // Apply theme
    applyTheme(theme);
    
    // Date format
    const dateFormat = localStorage.getItem('dateFormat') || 'DD/MM/YYYY';
    const dateFormatSelect = document.getElementById('date-format-select');
    
    if (dateFormatSelect) {
        dateFormatSelect.value = dateFormat;
    }
    
    // Time format
    const timeFormat = localStorage.getItem('timeFormat') || '12h';
    const timeFormatSelect = document.getElementById('time-format-select');
    
    if (timeFormatSelect) {
        timeFormatSelect.value = timeFormat;
    }
    
    // Notification preferences
    const emailScheduleChanges = localStorage.getItem('emailScheduleChanges') === 'true';
    const emailShiftRequests = localStorage.getItem('emailShiftRequests') === 'true';
    const browserNotifications = localStorage.getItem('browserNotifications') === 'true';
    
    const emailScheduleChangesCheckbox = document.getElementById('email-schedule-changes');
    const emailShiftRequestsCheckbox = document.getElementById('email-shift-requests');
    const browserNotificationsCheckbox = document.getElementById('browser-notifications');
    
    if (emailScheduleChangesCheckbox) {
        emailScheduleChangesCheckbox.checked = emailScheduleChanges !== false;
    }
    
    if (emailShiftRequestsCheckbox) {
        emailShiftRequestsCheckbox.checked = emailShiftRequests !== false;
    }
    
    if (browserNotificationsCheckbox) {
        browserNotificationsCheckbox.checked = browserNotifications !== false;
    }
}

/**
 * Save user settings
 */
function saveSettings() {
    // Theme
    const theme = document.getElementById('theme-select').value;
    localStorage.setItem('theme', theme);
    
    // Date format
    const dateFormat = document.getElementById('date-format-select').value;
    localStorage.setItem('dateFormat', dateFormat);
    
    // Time format
    const timeFormat = document.getElementById('time-format-select').value;
    localStorage.setItem('timeFormat', timeFormat);
    
    // Notification preferences
    const emailScheduleChanges = document.getElementById('email-schedule-changes').checked;
    const emailShiftRequests = document.getElementById('email-shift-requests').checked;
    const browserNotifications = document.getElementById('browser-notifications').checked;
    
    localStorage.setItem('emailScheduleChanges', emailScheduleChanges);
    localStorage.setItem('emailShiftRequests', emailShiftRequests);
    localStorage.setItem('browserNotifications', browserNotifications);
    
    // Apply theme
    applyTheme(theme);
    
    // Show success message
    showToast('Settings saved successfully', 'success');
    
    // In a real application, we would also send these settings to the server
    // api.post('/api/user/settings', {
    //     theme,
    //     dateFormat,
    //     timeFormat,
    //     notifications: {
    //         emailScheduleChanges,
    //         emailShiftRequests,
    //         browserNotifications
    //     }
    // });
}

/**
 * Apply theme to the application
 * @param {string} theme - Theme name
 */
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}