/**
 * Staff Management JavaScript for UITH Physiotherapy Scheduling System
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI elements
    initCommonUI();
    
    // Load staff list
    loadStaffList();
    
    // Setup event listeners
    setupEventListeners();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Add new staff button
    const addStaffButton = document.getElementById('add-staff-btn');
    if (addStaffButton) {
        addStaffButton.addEventListener('click', () => {
            openStaffModal();
        });
    }
    
    // Staff form submission
    const staffForm = document.getElementById('staff-form');
    if (staffForm) {
        staffForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveStaff();
        });
    }
    
    // Cancel staff button
    const cancelStaffButton = document.getElementById('cancel-staff-btn');
    if (cancelStaffButton) {
        cancelStaffButton.addEventListener('click', () => {
            closeStaffModal();
        });
    }
    
    // Staff modal close button
    const staffModalClose = document.getElementById('staff-modal-close');
    if (staffModalClose) {
        staffModalClose.addEventListener('click', () => {
            closeStaffModal();
        });
    }
    
    // Confirm delete button
    const confirmDeleteButton = document.getElementById('confirm-delete-btn');
    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener('click', () => {
            deleteStaff();
        });
    }
    
    // Cancel delete button
    const cancelDeleteButton = document.getElementById('cancel-delete-btn');
    if (cancelDeleteButton) {
        cancelDeleteButton.addEventListener('click', () => {
            closeConfirmModal();
        });
    }
    
    // Confirm modal close button
    const confirmModalClose = document.getElementById('confirm-modal-close');
    if (confirmModalClose) {
        confirmModalClose.addEventListener('click', () => {
            closeConfirmModal();
        });
    }
}

/**
 * Load staff list
 */
function loadStaffList() {
    const staffTableBody = document.getElementById('staff-table-body');
    
    // Show loading state
    staffTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading staff list...</td></tr>';
    
    // Fetch staff data
    api.get('/api/users/physiotherapists')
        .then(staff => {
            if (staff.length === 0) {
                staffTableBody.innerHTML = '<tr><td colspan="5" class="text-center">No staff members found</td></tr>';
                return;
            }
            
            // Populate table with staff data
            let html = '';
            
            staff.forEach(member => {
                html += `
                    <tr>
                        <td>${member.firstname} ${member.lastname}</td>
                        <td>${member.email}</td>
                        <td>${member.contract_type}</td>
                        <td>
                            <span class="badge badge-${member.active ? 'success' : 'secondary'}">
                                ${member.active ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>
                            <div class="btn-group">
                                <button class="btn btn-primary btn-sm" onclick="viewStaffSchedule('${member.id}')">
                                    <i data-feather="calendar"></i>
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="editStaff('${member.id}')">
                                    <i data-feather="edit"></i>
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="confirmDeleteStaff('${member.id}')">
                                    <i data-feather="trash-2"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            staffTableBody.innerHTML = html;
            
            // Initialize feather icons in the newly added content
            feather.replace();
        })
        .catch(error => {
            console.error('Failed to load staff list:', error);
            staffTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load staff list</td></tr>';
        });
}

/**
 * Open staff modal for adding a new staff member
 */
function openStaffModal(staffId = null) {
    const staffForm = document.getElementById('staff-form');
    const staffModalTitle = document.getElementById('staff-modal-title');
    const passwordFieldGroup = document.getElementById('password-field-group');
    const staffIdField = document.getElementById('staff-id');
    
    // Reset form
    staffForm.reset();
    
    if (staffId) {
        // Edit existing staff member
        staffModalTitle.textContent = 'Edit Staff Member';
        passwordFieldGroup.style.display = 'none'; // Hide password field when editing
        staffIdField.value = staffId;
        
        // Load staff data
        api.get(`/api/users/${staffId}`)
            .then(staff => {
                document.getElementById('staff-firstname').value = staff.firstname;
                document.getElementById('staff-lastname').value = staff.lastname;
                document.getElementById('staff-email').value = staff.email;
                document.getElementById('staff-contract').value = staff.contract_type;
            })
            .catch(error => {
                console.error('Failed to load staff data:', error);
                showToast('Failed to load staff data', 'error');
                closeStaffModal();
            });
    } else {
        // Add new staff member
        staffModalTitle.textContent = 'Add New Staff';
        passwordFieldGroup.style.display = 'block'; // Show password field when adding
        staffIdField.value = '';
    }
    
    // Show modal
    document.getElementById('staff-modal').classList.add('active');
}

/**
 * Close staff modal
 */
function closeStaffModal() {
    document.getElementById('staff-modal').classList.remove('active');
}

/**
 * Save staff member
 */
function saveStaff() {
    const staffId = document.getElementById('staff-id').value;
    const firstname = document.getElementById('staff-firstname').value;
    const lastname = document.getElementById('staff-lastname').value;
    const email = document.getElementById('staff-email').value;
    const contractType = document.getElementById('staff-contract').value;
    
    // Validate form
    if (!firstname || !lastname || !email || !contractType) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    const staffData = {
        firstname,
        lastname,
        email,
        contract_type: contractType,
        role_id: 2 // Physiotherapist role
    };
    
    if (!staffId) {
        // Add new staff
        const password = document.getElementById('staff-password').value;
        
        if (!password) {
            showToast('Please enter a password', 'error');
            return;
        }
        
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            showToast(passwordValidation.message, 'error');
            return;
        }
        
        staffData.password = password;
        
        api.post('/api/users', staffData)
            .then(() => {
                showToast('Staff member added successfully', 'success');
                closeStaffModal();
                loadStaffList();
            })
            .catch(error => {
                console.error('Failed to add staff member:', error);
                showToast('Failed to add staff member', 'error');
            });
    } else {
        // Update existing staff
        api.put(`/api/users/${staffId}`, staffData)
            .then(() => {
                showToast('Staff member updated successfully', 'success');
                closeStaffModal();
                loadStaffList();
            })
            .catch(error => {
                console.error('Failed to update staff member:', error);
                showToast('Failed to update staff member', 'error');
            });
    }
}

/**
 * Edit staff member
 * @param {string} staffId - Staff ID
 */
function editStaff(staffId) {
    openStaffModal(staffId);
}

/**
 * Confirm delete staff member
 * @param {string} staffId - Staff ID
 */
function confirmDeleteStaff(staffId) {
    document.getElementById('confirm-delete-id').value = staffId;
    document.getElementById('confirm-modal').classList.add('active');
}

/**
 * Close confirm modal
 */
function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.remove('active');
}

/**
 * Delete staff member
 */
function deleteStaff() {
    const staffId = document.getElementById('confirm-delete-id').value;
    
    api.delete(`/api/users/${staffId}`)
        .then(() => {
            showToast('Staff member deleted successfully', 'success');
            closeConfirmModal();
            loadStaffList();
        })
        .catch(error => {
            console.error('Failed to delete staff member:', error);
            showToast('Failed to delete staff member', 'error');
        });
}

/**
 * View staff schedule
 * @param {string} staffId - Staff ID
 */
function viewStaffSchedule(staffId) {
    window.location.href = `/views/schedule-view.html?staff=${staffId}`;
}