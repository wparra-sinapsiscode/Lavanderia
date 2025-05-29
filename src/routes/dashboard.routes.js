const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { protect, admin } = require('../middleware/auth.middleware');

// @route   GET /api/dashboard/summary
// @desc    Get overall system stats and KPIs
// @access  Private
router.get('/summary', protect, dashboardController.getDashboardSummary);

// @route   GET /api/dashboard/services-stats
// @desc    Get service statistics and metrics
// @access  Private
router.get('/services-stats', protect, dashboardController.getServiceStats);

// @route   GET /api/dashboard/financial-stats
// @desc    Get financial KPIs
// @access  Private (Admin)
router.get('/financial-stats', protect, admin, dashboardController.getFinancialStats);

// @route   GET /api/dashboard/hotel-stats
// @desc    Get hotel performance metrics
// @access  Private
router.get('/hotel-stats', protect, dashboardController.getHotelStats);

// @route   GET /api/dashboard/repartidor-stats
// @desc    Get repartidor performance metrics
// @access  Private (Admin)
router.get('/repartidor-stats', protect, admin, dashboardController.getRepartidorStats);

// @route   GET /api/dashboard/metrics-by-zone
// @desc    Get metrics grouped by zone
// @access  Private
router.get('/metrics-by-zone', protect, dashboardController.getMetricsByZone);

module.exports = router;