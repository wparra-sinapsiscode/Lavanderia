const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect, admin } = require('../middleware/auth.middleware');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Private (Admin)
router.post('/register', protect, admin, authController.register);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authController.login);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, authController.getProfile);

// @route   PUT /api/auth/me
// @desc    Update user profile
// @access  Private
router.put('/me', protect, authController.updateProfile);

// @route   POST /api/auth/logout
// @desc    Logout user / clear token
// @access  Private
router.post('/logout', protect, authController.logout);

// @route   GET /api/auth/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/users', protect, admin, authController.getAllUsers);

// @route   GET /api/auth/users/:id
// @desc    Get user by id
// @access  Private (Admin)
router.get('/users/:id', protect, admin, authController.getUserById);

// @route   PUT /api/auth/users/:id
// @desc    Update user
// @access  Private (Admin)
router.put('/users/:id', protect, admin, authController.updateUser);

// @route   PUT /api/auth/users/:id/status
// @desc    Activate or deactivate user
// @access  Private (Admin)
router.put('/users/:id/status', protect, admin, authController.updateUserStatus);

module.exports = router;