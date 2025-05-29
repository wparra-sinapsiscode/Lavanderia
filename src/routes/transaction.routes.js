const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { protect, admin } = require('../middleware/auth.middleware');

// @route   GET /api/transactions
// @desc    Get all transactions with filtering
// @access  Private
router.get('/', protect, transactionController.getAllTransactions);

// @route   GET /api/transactions/:id
// @desc    Get a specific transaction
// @access  Private
router.get('/:id', protect, transactionController.getTransactionById);

// @route   POST /api/transactions
// @desc    Create a new transaction
// @access  Private
router.post('/', protect, transactionController.createTransaction);

// @route   GET /api/transactions/summary
// @desc    Get transaction summary data
// @access  Private (Admin)
router.get('/summary', protect, admin, transactionController.getTransactionSummary);

// @route   GET /api/transactions/by-hotel/:hotelId
// @desc    Get transactions for a specific hotel
// @access  Private
router.get('/by-hotel/:hotelId', protect, transactionController.getTransactionsByHotel);

// @route   GET /api/transactions/by-service/:serviceId
// @desc    Get transactions for a specific service
// @access  Private
router.get('/by-service/:serviceId', protect, transactionController.getTransactionsByService);

module.exports = router;