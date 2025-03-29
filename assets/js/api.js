/**
 * API utility functions for UITH Physiotherapy Scheduling System
 */

// API utility object with methods for making requests
const api = {
    /**
     * Make a GET request
     * @param {string} url - API endpoint URL
     * @returns {Promise<any>} - Promise that resolves with response data
     */
    get: function(url) {
        return this.request('GET', url);
    },
    
    /**
     * Make a POST request
     * @param {string} url - API endpoint URL
     * @param {Object} data - Data to send in request body
     * @returns {Promise<any>} - Promise that resolves with response data
     */
    post: function(url, data = null) {
        return this.request('POST', url, data);
    },
    
    /**
     * Make a PUT request
     * @param {string} url - API endpoint URL
     * @param {Object} data - Data to send in request body
     * @returns {Promise<any>} - Promise that resolves with response data
     */
    put: function(url, data = null) {
        return this.request('PUT', url, data);
    },
    
    /**
     * Make a DELETE request
     * @param {string} url - API endpoint URL
     * @returns {Promise<any>} - Promise that resolves with response data
     */
    delete: function(url) {
        return this.request('DELETE', url);
    },
    
    /**
     * Make a generic HTTP request
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {string} url - API endpoint URL
     * @param {Object} data - Data to send in request body (for POST/PUT)
     * @returns {Promise<any>} - Promise that resolves with response data
     */
    request: function(method, url, data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include cookies for authentication
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        return fetch(url, options)
            .then(response => {
                if (!response.ok) {
                    // For 401 responses, redirect to login page
                    if (response.status === 401) {
                        window.location.href = '/views/auth.html';
                        return Promise.reject(new Error('Not authenticated'));
                    }
                    
                    // For other error responses, throw an error
                    return response.json().then(errData => {
                        throw new Error(errData.message || 'API request failed');
                    });
                }
                
                // If the response is no-content, return null
                if (response.status === 204) {
                    return null;
                }
                
                // Otherwise parse the JSON response
                return response.json();
            });
    },
    
    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>} - Promise that resolves with auth status
     */
    checkAuth: function() {
        return this.get('/api/user')
            .then(() => true)
            .catch(() => false);
    }
};