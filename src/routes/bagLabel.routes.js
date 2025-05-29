const express = require('express');
const router = express.Router();
const bagLabelController = require('../controllers/bagLabel.controller');
const { protect } = require('../middleware/auth.middleware');

// @route   GET /api/bag-labels
// @desc    Get all bag labels with filtering
// @access  Private
router.get('/', protect, bagLabelController.getAllBagLabels);

// @route   GET /api/bag-labels/:id
// @desc    Get a specific bag label
// @access  Private
router.get('/:id', protect, bagLabelController.getBagLabelById);

// @route   POST /api/bag-labels
// @desc    Create new bag labels (batch creation)
// @access  Private
router.post('/', protect, bagLabelController.createBagLabels);

// @route   PUT /api/bag-labels/:id
// @desc    Update a bag label
// @access  Private
router.put('/:id', protect, bagLabelController.updateBagLabel);

// @route   GET /api/bag-labels/available
// @desc    Get available bag labels
// @access  Private
router.get('/available', protect, bagLabelController.getAvailableBagLabels);

// @route   GET /api/bag-labels/by-hotel/:hotelId
// @desc    Get bag labels for a specific hotel
// @access  Private
router.get('/by-hotel/:hotelId', protect, bagLabelController.getBagLabelsByHotel);

module.exports = router;