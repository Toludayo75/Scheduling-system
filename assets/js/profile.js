/**
 * Profile JavaScript for UITH Physiotherapy Scheduling System
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize common UI elements
    initCommonUI();
    
    // Load profile data
    loadProfileData();
    
    // Setup event listeners
    setupEventListeners();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Change password form
    const changePasswordForm = document.getElementById('change-password-form');
    
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            changePassword();
        });
    }
    
    // Edit profile button
    const editProfileButton = document.getElementById('edit-profile-btn');
    if (editProfileButton) {
        editProfileButton.addEventListener('click', () => {
            openEditProfileModal();
        });
    }
    
    // Cancel edit profile button
    const cancelEditButton = document.getElementById('cancel-profile-edit-btn');
    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', () => {
            closeEditProfileModal();
        });
    }
    
    // Close profile modal button
    const closeProfileModalButton = document.getElementById('edit-profile-modal-close');
    if (closeProfileModalButton) {
        closeProfileModalButton.addEventListener('click', () => {
            closeEditProfileModal();
        });
    }
    
    // Edit profile form
    const editProfileForm = document.getElementById('edit-profile-form');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveProfileChanges();
        });
    }
}

/**
 * Load profile data
 */
function loadProfileData() {
    api.get('/api/user')
        .then(user => {
            // Update profile information
            const nameElement = document.getElementById('profile-name');
            const emailElement = document.getElementById('profile-email');
            const roleElement = document.getElementById('profile-role');
            const contractElement = document.getElementById('profile-contract');
            const avatarElement = document.getElementById('profile-avatar');
            
            if (nameElement) {
                nameElement.textContent = `${user.firstname} ${user.lastname}`;
            }
            
            if (emailElement) {
                emailElement.textContent = user.email;
            }
            
            if (roleElement) {
                roleElement.textContent = user.role_name;
            }
            
            if (contractElement) {
                contractElement.textContent = user.contract_type;
            }
            
            if (avatarElement) {
                avatarElement.textContent = getInitials(user.firstname, user.lastname);
            }
        })
        .catch(error => {
            console.error('Failed to load profile data:', error);
            showToast('Failed to load profile data', 'error');
        });
}

/**
 * Change password
 */
function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    // Validate passwords
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Please fill in all password fields', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match', 'error');
        return;
    }
    
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
        showToast(passwordValidation.message, 'error');
        return;
    }
    
    // Change password
    api.post('/api/change-password', {
        currentPassword,
        newPassword
    })
    .then(() => {
        showToast('Password changed successfully', 'success');
        
        // Reset form
        document.getElementById('change-password-form').reset();
    })
    .catch(error => {
        console.error('Failed to change password:', error);
        showToast('Failed to change password. Please check your current password.', 'error');
    });
}

/**
 * Open edit profile modal
 */
function openEditProfileModal() {
    // Get current user data
    api.get('/api/user')
        .then(user => {
            // Populate form fields
            document.getElementById('edit-firstname').value = user.firstname;
            document.getElementById('edit-lastname').value = user.lastname;
            document.getElementById('edit-email').value = user.email;
            document.getElementById('edit-contract').value = user.contract_type;
            
            // Show modal
            const modal = document.getElementById('edit-profile-modal');
            modal.classList.add('active');
            modal.style.display = 'flex';
            
            console.log('Edit profile modal opened');
        })
        .catch(error => {
            console.error('Failed to load user data for editing:', error);
            showToast('Failed to load user data', 'error');
        });
}

/**
 * Close edit profile modal
 */
function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    modal.classList.remove('active');
    modal.style.display = 'none';
    console.log('Edit profile modal closed');
}

/**
 * Save profile changes
 */
function saveProfileChanges() {
    const firstname = document.getElementById('edit-firstname').value;
    const lastname = document.getElementById('edit-lastname').value;
    const email = document.getElementById('edit-email').value;
    const contractType = document.getElementById('edit-contract').value;
    
    // Validate form
    if (!firstname || !lastname || !email || !contractType) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    // Update user profile
    api.put('/api/users/profile', {
        firstname,
        lastname,
        email,
        contract_type: contractType
    })
    .then(() => {
        showToast('Profile updated successfully', 'success');
        
        // Close modal
        closeEditProfileModal();
        
        // Reload profile data
        loadProfileData();
    })
    .catch(error => {
        console.error('Failed to update profile:', error);
        showToast('Failed to update profile', 'error');
    });
}