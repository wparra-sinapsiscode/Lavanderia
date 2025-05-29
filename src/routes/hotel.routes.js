const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotel.controller');
const { protect, admin } = require('../middleware/auth.middleware');

// @route   GET /api/hotels
// @desc    Get all hotels
// @access  Private
router.get('/', protect, hotelController.getAllHotels);

// @route   GET /api/hotels/:id
// @desc    Get a specific hotel
// @access  Private
router.get('/:id', protect, hotelController.getHotelById);

// @route   POST /api/hotels
// @desc    Create a new hotel
// @access  Private (Admin)
router.post('/', protect, admin, hotelController.createHotel);

// @route   PUT /api/hotels/:id
// @desc    Update a hotel
// @access  Private (Admin)
router.put('/:id', protect, admin, hotelController.updateHotel);

// @route   PUT /api/hotels/:id/inventory
// @desc    Update hotel bag inventory
// @access  Private
router.put('/:id/inventory', protect, hotelController.updateInventory);

// @route   GET /api/hotels/:id/services
// @desc    Get services for a specific hotel
// @access  Private
router.get('/:id/services', protect, hotelController.getHotelServices);

// @route   GET /api/hotels/by-zone/:zone
// @desc    Get hotels by zone
// @access  Private
router.get('/by-zone/:zone', protect, hotelController.getHotelsByZone);

module.exports = router;