document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
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
        console.log("User data:", user);
        // Redirect based on user role
        if (user.role_name === 'Admin') {
            window.location.href = '/views/admin.html';
        } else if (user.role_name === 'Physiotherapist') {
            window.location.href = '/views/dashboard.html';
        } else if (user.role_name === 'System Admin') {
            window.location.href = '/views/system-admin.html';
        }
    })
    .catch(error => {
        console.log('User not authenticated:', error);
        // Continue showing the login page
    });

    // Login form is always active
    const loginForm = document.getElementById('login-form');

    // Login form submission
    const loginFormElement = document.getElementById('login-form-element');
    loginFormElement.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const loginError = document.getElementById('login-error');

        // Basic validation
        if (!email || !password) {
            loginError.textContent = 'Please enter both email and password.';
            loginError.style.display = 'block';
            return;
        }

        // Clear previous error
        loginError.style.display = 'none';

        // Show loading state
        const loginButton = document.getElementById('login-button');
        const originalText = loginButton.textContent;
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';

        // Send login request
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Login failed. Please check your credentials.');
            }
            return response.json();
        })
        .then(data => {
            console.log("Login response:", data);
            // Redirect based on user role
            if (data.role_name === 'Admin') {
                window.location.href = '/views/admin.html';
            } else if (data.role_name === 'Physiotherapist') {
                window.location.href = '/views/dashboard.html';
            } else if (data.role_name === 'System Admin') {
                window.location.href = '/views/system-admin.html';
            } else {
                // Default fallback
                window.location.href = '/views/dashboard.html';
            }
        })
        .catch(error => {
            loginError.textContent = error.message;
            loginError.style.display = 'block';
            // Reset button
            loginButton.disabled = false;
            loginButton.textContent = originalText;
        });
    });

    // Registration has been disabled - only admins can create new users
});
