const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { protect } = require('../middleware/auth.middleware');

// @route   GET /api/services
// @desc    Get all services with filtering
// @access  Private
router.get('/', protect, serviceController.getAllServices);

// @route   GET /api/services/:id
// @desc    Get a specific service
// @access  Private
router.get('/:id', protect, serviceController.getServiceById);

// @route   POST /api/services
// @desc    Create a new service
// @access  Private
router.post('/', protect, serviceController.createService);

// @route   PUT /api/services/:id/pickup
// @desc    Register pickup for a service
// @access  Private
router.put('/:id/pickup', protect, serviceController.registerPickup);

// @route   PUT /api/services/:id/status
// @desc    Change service status
// @access  Private
router.put('/:id/status', protect, serviceController.updateServiceStatus);

// @route   PUT /api/services/:id/partial-delivery
// @desc    Register partial delivery
// @access  Private
router.put('/:id/partial-delivery', protect, serviceController.registerPartialDelivery);

// @route   POST /api/services/:id/photos
// @desc    Upload photos for a service
// @access  Private
router.post('/:id/photos', protect, serviceController.uploadServicePhotos);

// @route   GET /api/services/pending
// @desc    Get pending services
// @access  Private
router.get('/pending', protect, serviceController.getPendingServices);

module.exports = router;