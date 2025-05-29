const express = require('express');
const router = express.Router();

// Import routes
const authRoutes = require('./auth.routes');
const hotelRoutes = require('./hotel.routes');
const serviceRoutes = require('./service.routes');
const bagLabelRoutes = require('./bagLabel.routes');
const transactionRoutes = require('./transaction.routes');
const dashboardRoutes = require('./dashboard.routes');
const guestRoutes = require('./guest.routes');

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// API Info route
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Fumy Limp API',
    version: '1.0.0',
    description: 'API for Fumy Limp laundry management system',
    endpoints: {
      auth: '/api/auth',
      hotels: '/api/hotels',
      services: '/api/services',
      bagLabels: '/api/bag-labels',
      transactions: '/api/transactions',
      dashboard: '/api/dashboard',
      guests: '/api/guests'
    }
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/hotels', hotelRoutes);
router.use('/services', serviceRoutes);
router.use('/bag-labels', bagLabelRoutes);
router.use('/transactions', transactionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/guests', guestRoutes);

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.originalUrl}`
  });
});

module.exports = router;