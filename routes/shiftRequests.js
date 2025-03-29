/**
 * Shift Request Routes for UITH Physiotherapy Scheduling System
 */
const express = require('express');
const router = express.Router();
const shiftRequestController = require('../controllers/shiftRequestController');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin, isOwnResource } = require('../middleware/roleCheck');

/**
 * @route   GET /api/shift-requests
 * @desc    Get all shift requests
 * @access  Private (Admin only)
 */
router.get('/', isAuthenticated, isAdmin, shiftRequestController.getAllShiftRequests);

/**
 * @route   GET /api/shift-requests/pending/count
 * @desc    Get count of pending shift requests
 * @access  Private (Admin only)
 */
router.get('/pending/count', isAuthenticated, isAdmin, shiftRequestController.getPendingShiftRequestsCount);

/**
 * @route   GET /api/shift-requests/user
 * @desc    Get shift requests for current user
 * @access  Private
 */
router.get('/user', isAuthenticated, shiftRequestController.getCurrentUserShiftRequests);

/**
 * @route   GET /api/shift-requests/:id
 * @desc    Get shift request by ID
 * @access  Private
 */
router.get('/:id', isAuthenticated, isOwnResource(async (req) => {
    const request = await require('../models/shiftRequestModel').getById(req.params.id);
    return request ? request.physiotherapist_id : null;
}), shiftRequestController.getShiftRequestById);

/**
 * @route   POST /api/shift-requests
 * @desc    Create a new shift request
 * @access  Private
 */
router.post('/', isAuthenticated, shiftRequestController.createShiftRequest);

/**
 * @route   PUT /api/shift-requests/:id/status
 * @desc    Update shift request status
 * @access  Private (Admin only)
 */
router.put('/:id/status', isAuthenticated, isAdmin, shiftRequestController.updateShiftRequestStatus);

/**
 * @route   DELETE /api/shift-requests/:id
 * @desc    Delete a shift request
 * @access  Private
 */
router.delete('/:id', isAuthenticated, isOwnResource(async (req) => {
    const request = await require('../models/shiftRequestModel').getById(req.params.id);
    return request ? request.physiotherapist_id : null;
}), shiftRequestController.deleteShiftRequest);

module.exports = router;
