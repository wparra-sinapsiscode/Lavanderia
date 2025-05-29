const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guest.controller');
const { protect } = require('../middleware/auth.middleware');

// @route   GET /api/guests
// @desc    Get all guests with filtering
// @access  Private
router.get('/', protect, guestController.getAllGuests);

// @route   GET /api/guests/:id
// @desc    Get a specific guest
// @access  Private
router.get('/:id', protect, guestController.getGuestById);

// @route   POST /api/guests
// @desc    Register a new guest
// @access  Private
router.post('/', protect, guestController.registerGuest);

// @route   PUT /api/guests/:id
// @desc    Update guest information
// @access  Private
router.put('/:id', protect, guestController.updateGuest);

// @route   DELETE /api/guests/:id
// @desc    Delete a guest (soft delete)
// @access  Private
router.delete('/:id', protect, guestController.deleteGuest);

// @route   GET /api/guests/:id/services
// @desc    Get service history for a guest
// @access  Private
router.get('/:id/services', protect, guestController.getGuestServices);

// @route   GET /api/guests/:id/checkout-report
// @desc    Get checkout report for a guest
// @access  Private
router.get('/:id/checkout-report', protect, guestController.getCheckoutReport);

// @route   GET /api/guests/by-hotel/:hotelId
// @desc    Get guests for a specific hotel
// @access  Private
router.get('/by-hotel/:hotelId', protect, guestController.getGuestsByHotel);

// @route   GET /api/guests/search
// @desc    Search guests by name, email, phone or ID
// @access  Private
router.get('/search', protect, guestController.searchGuests);

module.exports = router;