const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { SERVICE_STATUSES, TRANSACTION_TYPES, ZONES } = require('../config/constants');

/**
 * Helper function to apply date filtering
 * @param {Object} where - The where clause object
 * @param {String} dateField - The date field to filter on
 * @param {String} timePeriod - The time period (day, week, month, year)
 */
const applyDateFilter = (where, dateField, timePeriod) => {
  const now = new Date();
  const startDate = new Date();
  
  switch (timePeriod) {
    case 'day':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      // Set to beginning of the current week (Sunday)
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'year':
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      // Default to last 30 days
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
  }
  
  where[dateField] = {
    gte: startDate
  };
  
  return { startDate };
};

/**
 * @desc    Get overall system stats and KPIs
 * @route   GET /api/dashboard/summary
 * @access  Private
 */
exports.getDashboardSummary = async (req, res) => {
  try {
    const { timePeriod = 'month' } = req.query;
    const where = {};
    const serviceWhere = {};
    const transactionWhere = {};
    
    // Apply date filter
    applyDateFilter(serviceWhere, 'createdAt', timePeriod);
    applyDateFilter(transactionWhere, 'createdAt', timePeriod);
    
    // Zone-based access control
    if (req.user.role === 'REPARTIDOR') {
      where.zone = req.user.zone;
      serviceWhere.hotel = { zone: req.user.zone };
      transactionWhere.hotel = { zone: req.user.zone };
    }
    
    // Get counts for services by status
    const serviceStats = await prisma.service.groupBy({
      by: ['status'],
      where: serviceWhere,
      _count: true
    });
    
    // Process service stats
    const servicesData = {
      PENDING: 0,
      PICKED_UP: 0,
      PROCESSING: 0,
      READY: 0,
      PARTIAL_DELIVERY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      total: 0
    };
    
    serviceStats.forEach(stat => {
      servicesData[stat.status] = stat._count;
      servicesData.total += stat._count;
    });
    
    // Get financial summary
    const financialStats = await prisma.transaction.groupBy({
      by: ['type'],
      where: transactionWhere,
      _sum: {
        amount: true,
        tax: true
      }
    });
    
    // Process financial stats
    const financialData = {
      PAYMENT: 0,
      REFUND: 0,
      EXPENSE: 0,
      taxes: 0,
      netIncome: 0
    };
    
    financialStats.forEach(stat => {
      financialData[stat.type] = stat._sum.amount || 0;
      if (stat.type === 'PAYMENT' || stat.type === 'REFUND') {
        financialData.taxes += stat._sum.tax || 0;
      }
    });
    
    financialData.netIncome = financialData.PAYMENT - financialData.REFUND - financialData.EXPENSE;
    
    // Get hotel stats
    const hotelCount = await prisma.hotel.count({
      where
    });
    
    // Get low inventory hotels
    const lowInventoryHotels = await prisma.hotel.findMany({
      where: {
        ...where,
        bagInventory: {
          lt: prisma.hotel.fields.inventoryThreshold
        }
      },
      select: {
        id: true,
        name: true,
        zone: true,
        bagInventory: true,
        inventoryThreshold: true
      },
      orderBy: {
        bagInventory: 'asc'
      }
    });
    
    // Get user stats
    const userCount = await prisma.user.count({
      where: req.user.role === 'REPARTIDOR' ? { zone: req.user.zone } : {}
    });
    
    // Get recent activity
    const recentServices = await prisma.service.findMany({
      where: serviceWhere,
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    const recentTransactions = await prisma.transaction.findMany({
      where: transactionWhere,
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    return res.status(200).json({
      success: true,
      data: {
        services: servicesData,
        financial: financialData,
        hotels: {
          total: hotelCount,
          lowInventory: lowInventoryHotels
        },
        users: {
          total: userCount
        },
        recentActivity: {
          services: recentServices,
          transactions: recentTransactions
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el resumen del dashboard',
      error: error.message
    });
  }
};

/**
 * @desc    Get service statistics and metrics
 * @route   GET /api/dashboard/services-stats
 * @access  Private
 */
exports.getServiceStats = async (req, res) => {
  try {
    const { timePeriod = 'month' } = req.query;
    const serviceWhere = {};
    
    // Apply date filter
    const { startDate } = applyDateFilter(serviceWhere, 'createdAt', timePeriod);
    
    // Zone-based access control
    if (req.user.role === 'REPARTIDOR') {
      serviceWhere.hotel = { zone: req.user.zone };
    }
    
    // Get services by status
    const statusStats = await prisma.service.groupBy({
      by: ['status'],
      where: serviceWhere,
      _count: true
    });
    
    // Get services by priority
    const priorityStats = await prisma.service.groupBy({
      by: ['priority'],
      where: serviceWhere,
      _count: true
    });
    
    // Get average processing time
    const completedServices = await prisma.service.findMany({
      where: {
        ...serviceWhere,
        status: 'DELIVERED',
        pickupDate: { not: null },
        deliveryDate: { not: null }
      },
      select: {
        id: true,
        pickupDate: true,
        processingDate: true,
        readyDate: true,
        deliveryDate: true
      }
    });
    
    // Calculate average times
    let totalPickupToProcessing = 0;
    let totalProcessingToReady = 0;
    let totalReadyToDelivery = 0;
    let totalPickupToDelivery = 0;
    let validPickupToProcessing = 0;
    let validProcessingToReady = 0;
    let validReadyToDelivery = 0;
    let validPickupToDelivery = 0;
    
    completedServices.forEach(service => {
      if (service.pickupDate && service.processingDate) {
        const diffHours = (service.processingDate - service.pickupDate) / (1000 * 60 * 60);
        totalPickupToProcessing += diffHours;
        validPickupToProcessing++;
      }
      
      if (service.processingDate && service.readyDate) {
        const diffHours = (service.readyDate - service.processingDate) / (1000 * 60 * 60);
        totalProcessingToReady += diffHours;
        validProcessingToReady++;
      }
      
      if (service.readyDate && service.deliveryDate) {
        const diffHours = (service.deliveryDate - service.readyDate) / (1000 * 60 * 60);
        totalReadyToDelivery += diffHours;
        validReadyToDelivery++;
      }
      
      if (service.pickupDate && service.deliveryDate) {
        const diffHours = (service.deliveryDate - service.pickupDate) / (1000 * 60 * 60);
        totalPickupToDelivery += diffHours;
        validPickupToDelivery++;
      }
    });
    
    const avgTimes = {
      pickupToProcessing: validPickupToProcessing ? totalPickupToProcessing / validPickupToProcessing : 0,
      processingToReady: validProcessingToReady ? totalProcessingToReady / validProcessingToReady : 0,
      readyToDelivery: validReadyToDelivery ? totalReadyToDelivery / validReadyToDelivery : 0,
      totalTurnAround: validPickupToDelivery ? totalPickupToDelivery / validPickupToDelivery : 0
    };
    
    // Get daily service counts for trend analysis
    const dailyCounts = [];
    const endDate = new Date();
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayCount = await prisma.service.count({
        where: {
          ...serviceWhere,
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      });
      
      dailyCounts.push({
        date: dayStart.toISOString().split('T')[0],
        count: dayCount
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Get hotel distribution
    const hotelDistribution = await prisma.service.groupBy({
      by: ['hotelId'],
      where: serviceWhere,
      _count: true
    });
    
    // Get hotel names for the distribution
    const hotelIds = hotelDistribution.map(item => item.hotelId);
    const hotels = await prisma.hotel.findMany({
      where: {
        id: {
          in: hotelIds
        }
      },
      select: {
        id: true,
        name: true,
        zone: true
      }
    });
    
    const hotelMap = {};
    hotels.forEach(hotel => {
      hotelMap[hotel.id] = hotel;
    });
    
    const serviceDistributionByHotel = hotelDistribution.map(item => ({
      hotelId: item.hotelId,
      hotelName: hotelMap[item.hotelId]?.name || 'Unknown',
      zone: hotelMap[item.hotelId]?.zone || 'Unknown',
      count: item._count
    }));
    
    return res.status(200).json({
      success: true,
      data: {
        byStatus: statusStats,
        byPriority: priorityStats,
        averageTimes: avgTimes,
        trend: dailyCounts,
        byHotel: serviceDistributionByHotel
      }
    });
  } catch (error) {
    console.error('Error fetching service stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas de servicios',
      error: error.message
    });
  }
};

/**
 * @desc    Get financial KPIs
 * @route   GET /api/dashboard/financial-stats
 * @access  Private (Admin)
 */
exports.getFinancialStats = async (req, res) => {
  try {
    const { timePeriod = 'month' } = req.query;
    
    // Validate admin access
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden ver las estadísticas financieras'
      });
    }
    
    const transactionWhere = {};
    
    // Apply date filter
    const { startDate } = applyDateFilter(transactionWhere, 'createdAt', timePeriod);
    
    // Get revenue by transaction type
    const typeStats = await prisma.transaction.groupBy({
      by: ['type'],
      where: transactionWhere,
      _sum: {
        amount: true,
        subtotal: true,
        tax: true
      },
      _count: true
    });
    
    // Get revenue by payment method
    const methodStats = await prisma.transaction.groupBy({
      by: ['paymentMethod'],
      where: transactionWhere,
      _sum: {
        amount: true
      },
      _count: true
    });
    
    // Get revenue by zone
    const zoneQuery = await prisma.transaction.findMany({
      where: transactionWhere,
      include: {
        hotel: {
          select: {
            zone: true
          }
        }
      }
    });
    
    // Process zone data manually (since prisma join in groupBy is not supported directly)
    const zoneData = {};
    ZONES.forEach(zone => {
      zoneData[zone] = {
        payments: 0,
        refunds: 0,
        expenses: 0,
        net: 0
      };
    });
    
    zoneQuery.forEach(tx => {
      const zone = tx.hotel?.zone || 'Unknown';
      if (!zoneData[zone]) {
        zoneData[zone] = {
          payments: 0,
          refunds: 0,
          expenses: 0,
          net: 0
        };
      }
      
      if (tx.type === 'PAYMENT') {
        zoneData[zone].payments += tx.amount;
        zoneData[zone].net += tx.amount;
      } else if (tx.type === 'REFUND') {
        zoneData[zone].refunds += tx.amount;
        zoneData[zone].net -= tx.amount;
      } else if (tx.type === 'EXPENSE') {
        zoneData[zone].expenses += tx.amount;
        zoneData[zone].net -= tx.amount;
      }
    });
    
    // Convert to array for easier consumption by frontend
    const revenueByZone = Object.entries(zoneData).map(([zone, data]) => ({
      zone,
      ...data
    }));
    
    // Get daily revenue for trend analysis
    const dailyRevenue = [];
    const endDate = new Date();
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayTransactions = await prisma.transaction.findMany({
        where: {
          ...transactionWhere,
          createdAt: {
            gte: dayStart,
            lte: dayEnd
          }
        }
      });
      
      let payments = 0;
      let refunds = 0;
      let expenses = 0;
      
      dayTransactions.forEach(tx => {
        if (tx.type === 'PAYMENT') {
          payments += tx.amount;
        } else if (tx.type === 'REFUND') {
          refunds += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          expenses += tx.amount;
        }
      });
      
      dailyRevenue.push({
        date: dayStart.toISOString().split('T')[0],
        payments,
        refunds,
        expenses,
        net: payments - refunds - expenses
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Calculate overall financial KPIs
    let totalRevenue = 0;
    let totalRefunds = 0;
    let totalExpenses = 0;
    let totalTax = 0;
    
    typeStats.forEach(stat => {
      if (stat.type === 'PAYMENT') {
        totalRevenue = stat._sum.amount || 0;
        totalTax += stat._sum.tax || 0;
      } else if (stat.type === 'REFUND') {
        totalRefunds = stat._sum.amount || 0;
        totalTax -= stat._sum.tax || 0;
      } else if (stat.type === 'EXPENSE') {
        totalExpenses = stat._sum.amount || 0;
      }
    });
    
    const netIncome = totalRevenue - totalRefunds - totalExpenses;
    
    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalRefunds,
          totalExpenses,
          totalTax,
          netIncome
        },
        byType: typeStats,
        byMethod: methodStats,
        byZone: revenueByZone,
        trend: dailyRevenue
      }
    });
  } catch (error) {
    console.error('Error fetching financial stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas financieras',
      error: error.message
    });
  }
};

/**
 * @desc    Get hotel performance metrics
 * @route   GET /api/dashboard/hotel-stats
 * @access  Private
 */
exports.getHotelStats = async (req, res) => {
  try {
    const { timePeriod = 'month', hotelId } = req.query;
    const hotelWhere = {};
    const serviceWhere = {};
    const transactionWhere = {};
    
    // Apply date filter
    applyDateFilter(serviceWhere, 'createdAt', timePeriod);
    applyDateFilter(transactionWhere, 'createdAt', timePeriod);
    
    // Zone-based access control
    if (req.user.role === 'REPARTIDOR') {
      hotelWhere.zone = req.user.zone;
      serviceWhere.hotel = { zone: req.user.zone };
      transactionWhere.hotel = { zone: req.user.zone };
    }
    
    // Filter by specific hotel if provided
    if (hotelId) {
      hotelWhere.id = parseInt(hotelId);
      serviceWhere.hotelId = parseInt(hotelId);
      transactionWhere.hotelId = parseInt(hotelId);
    }
    
    // Get hotels
    const hotels = await prisma.hotel.findMany({
      where: hotelWhere,
      orderBy: {
        name: 'asc'
      }
    });
    
    const hotelIds = hotels.map(hotel => hotel.id);
    
    // Get service counts by hotel
    const serviceCounts = await prisma.service.groupBy({
      by: ['hotelId'],
      where: {
        ...serviceWhere,
        hotelId: {
          in: hotelIds
        }
      },
      _count: true
    });
    
    // Get service revenue by hotel
    const serviceRevenue = await prisma.transaction.groupBy({
      by: ['hotelId'],
      where: {
        ...transactionWhere,
        hotelId: {
          in: hotelIds
        },
        type: 'PAYMENT'
      },
      _sum: {
        amount: true
      }
    });
    
    // Get current inventory status
    const inventoryStatus = await prisma.hotel.findMany({
      where: {
        id: {
          in: hotelIds
        }
      },
      select: {
        id: true,
        bagInventory: true,
        inventoryThreshold: true
      }
    });
    
    // Map results to hotels
    const hotelMap = {};
    hotels.forEach(hotel => {
      hotelMap[hotel.id] = {
        ...hotel,
        serviceCount: 0,
        revenue: 0,
        inventoryStatus: 'ok',
        inventoryLevel: 0
      };
    });
    
    serviceCounts.forEach(item => {
      if (hotelMap[item.hotelId]) {
        hotelMap[item.hotelId].serviceCount = item._count;
      }
    });
    
    serviceRevenue.forEach(item => {
      if (hotelMap[item.hotelId]) {
        hotelMap[item.hotelId].revenue = item._sum.amount || 0;
      }
    });
    
    inventoryStatus.forEach(item => {
      if (hotelMap[item.id]) {
        hotelMap[item.id].inventoryLevel = item.bagInventory;
        hotelMap[item.id].inventoryStatus = 
          item.bagInventory <= item.inventoryThreshold ? 'low' : 'ok';
      }
    });
    
    // Convert to array for response
    const hotelStats = Object.values(hotelMap);
    
    // Get top performing hotels
    const topHotels = [...hotelStats]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    
    // Get hotels needing attention (low inventory or high revenue with low inventory)
    const hotelsNeedingAttention = hotelStats.filter(
      hotel => hotel.inventoryStatus === 'low' || 
        (hotel.revenue > 0 && hotel.inventoryLevel < hotel.inventoryThreshold * 2)
    );
    
    return res.status(200).json({
      success: true,
      count: hotelStats.length,
      data: {
        hotels: hotelStats,
        topPerformers: topHotels,
        needAttention: hotelsNeedingAttention
      }
    });
  } catch (error) {
    console.error('Error fetching hotel stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas de hoteles',
      error: error.message
    });
  }
};

/**
 * @desc    Get repartidor performance metrics
 * @route   GET /api/dashboard/repartidor-stats
 * @access  Private (Admin)
 */
exports.getRepartidorStats = async (req, res) => {
  try {
    const { timePeriod = 'month', userId } = req.query;
    
    // Only admins can see all repartidor stats
    // Repartidores can only see their own stats
    if (req.user.role !== 'ADMIN' && (!userId || parseInt(userId) !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo puedes ver tus propias estadísticas'
      });
    }
    
    const userWhere = { role: 'REPARTIDOR' };
    const serviceWhere = {};
    const transactionWhere = {};
    
    // Apply date filter
    applyDateFilter(serviceWhere, 'createdAt', timePeriod);
    applyDateFilter(transactionWhere, 'createdAt', timePeriod);
    
    // Filter by specific user if provided
    if (userId) {
      userWhere.id = parseInt(userId);
      serviceWhere.createdById = parseInt(userId);
      transactionWhere.createdById = parseInt(userId);
    } else if (req.user.role === 'REPARTIDOR') {
      // Repartidores can only see their own stats
      userWhere.id = req.user.id;
      serviceWhere.createdById = req.user.id;
      transactionWhere.createdById = req.user.id;
    }
    
    // Get repartidores
    const repartidores = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        zone: true
      }
    });
    
    const repartidorIds = repartidores.map(user => user.id);
    
    // Get service counts by repartidor
    const serviceCounts = await prisma.service.groupBy({
      by: ['createdById'],
      where: {
        ...serviceWhere,
        createdById: {
          in: repartidorIds
        }
      },
      _count: true
    });
    
    // Get pickup counts
    const pickupCounts = await prisma.service.groupBy({
      by: ['updatedById'],
      where: {
        updatedById: {
          in: repartidorIds
        },
        pickupDate: { not: null }
      },
      _count: true
    });
    
    // Get delivery counts
    const deliveryCounts = await prisma.service.groupBy({
      by: ['updatedById'],
      where: {
        updatedById: {
          in: repartidorIds
        },
        deliveryDate: { not: null }
      },
      _count: true
    });
    
    // Get transaction counts
    const transactionCounts = await prisma.transaction.groupBy({
      by: ['createdById'],
      where: {
        ...transactionWhere,
        createdById: {
          in: repartidorIds
        }
      },
      _count: true,
      _sum: {
        amount: true
      }
    });
    
    // Map results to repartidores
    const repartidorMap = {};
    repartidores.forEach(user => {
      repartidorMap[user.id] = {
        ...user,
        services: {
          created: 0,
          pickups: 0,
          deliveries: 0
        },
        transactions: {
          count: 0,
          amount: 0
        }
      };
    });
    
    serviceCounts.forEach(item => {
      if (repartidorMap[item.createdById]) {
        repartidorMap[item.createdById].services.created = item._count;
      }
    });
    
    pickupCounts.forEach(item => {
      if (repartidorMap[item.updatedById]) {
        repartidorMap[item.updatedById].services.pickups = item._count;
      }
    });
    
    deliveryCounts.forEach(item => {
      if (repartidorMap[item.updatedById]) {
        repartidorMap[item.updatedById].services.deliveries = item._count;
      }
    });
    
    transactionCounts.forEach(item => {
      if (repartidorMap[item.createdById]) {
        repartidorMap[item.createdById].transactions.count = item._count;
        repartidorMap[item.createdById].transactions.amount = item._sum.amount || 0;
      }
    });
    
    // Convert to array for response
    const repartidorStats = Object.values(repartidorMap);
    
    // Get top performers
    const topPerformers = [...repartidorStats]
      .sort((a, b) => 
        (b.services.pickups + b.services.deliveries) - 
        (a.services.pickups + a.services.deliveries)
      )
      .slice(0, 5);
    
    return res.status(200).json({
      success: true,
      count: repartidorStats.length,
      data: {
        repartidores: repartidorStats,
        topPerformers
      }
    });
  } catch (error) {
    console.error('Error fetching repartidor stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas de repartidores',
      error: error.message
    });
  }
};

/**
 * @desc    Get metrics grouped by zone
 * @route   GET /api/dashboard/metrics-by-zone
 * @access  Private
 */
exports.getMetricsByZone = async (req, res) => {
  try {
    const { timePeriod = 'month' } = req.query;
    const whereService = {};
    const whereTransaction = {};
    
    // Apply date filter
    applyDateFilter(whereService, 'createdAt', timePeriod);
    applyDateFilter(whereTransaction, 'createdAt', timePeriod);
    
    // Restrict to user's zone if repartidor
    if (req.user.role === 'REPARTIDOR') {
      whereService.hotel = { zone: req.user.zone };
      whereTransaction.hotel = { zone: req.user.zone };
    }
    
    // Get hotel counts by zone
    const hotelsByZone = await prisma.hotel.groupBy({
      by: ['zone'],
      _count: true
    });
    
    // Get services by zone
    const servicesByZone = await prisma.service.findMany({
      where: whereService,
      include: {
        hotel: {
          select: {
            zone: true
          }
        }
      }
    });
    
    // Get transactions by zone
    const transactionsByZone = await prisma.transaction.findMany({
      where: whereTransaction,
      include: {
        hotel: {
          select: {
            zone: true
          }
        }
      }
    });
    
    // Process metrics by zone
    const zoneMetrics = {};
    
    // Initialize with all zones
    ZONES.forEach(zone => {
      zoneMetrics[zone] = {
        zone,
        hotels: 0,
        services: {
          total: 0,
          PENDING: 0,
          PICKED_UP: 0,
          PROCESSING: 0,
          READY: 0,
          PARTIAL_DELIVERY: 0,
          DELIVERED: 0,
          CANCELLED: 0
        },
        transactions: {
          payments: 0,
          refunds: 0,
          expenses: 0,
          net: 0
        }
      };
    });
    
    // Fill in hotel counts
    hotelsByZone.forEach(item => {
      if (zoneMetrics[item.zone]) {
        zoneMetrics[item.zone].hotels = item._count;
      }
    });
    
    // Fill in service counts
    servicesByZone.forEach(service => {
      const zone = service.hotel?.zone || 'Unknown';
      if (!zoneMetrics[zone]) {
        zoneMetrics[zone] = {
          zone,
          hotels: 0,
          services: {
            total: 0,
            PENDING: 0,
            PICKED_UP: 0,
            PROCESSING: 0,
            READY: 0,
            PARTIAL_DELIVERY: 0,
            DELIVERED: 0,
            CANCELLED: 0
          },
          transactions: {
            payments: 0,
            refunds: 0,
            expenses: 0,
            net: 0
          }
        };
      }
      
      zoneMetrics[zone].services.total++;
      zoneMetrics[zone].services[service.status]++;
    });
    
    // Fill in transaction data
    transactionsByZone.forEach(tx => {
      const zone = tx.hotel?.zone || 'Unknown';
      if (!zoneMetrics[zone]) {
        zoneMetrics[zone] = {
          zone,
          hotels: 0,
          services: {
            total: 0,
            PENDING: 0,
            PICKED_UP: 0,
            PROCESSING: 0,
            READY: 0,
            PARTIAL_DELIVERY: 0,
            DELIVERED: 0,
            CANCELLED: 0
          },
          transactions: {
            payments: 0,
            refunds: 0,
            expenses: 0,
            net: 0
          }
        };
      }
      
      if (tx.type === 'PAYMENT') {
        zoneMetrics[zone].transactions.payments += tx.amount;
        zoneMetrics[zone].transactions.net += tx.amount;
      } else if (tx.type === 'REFUND') {
        zoneMetrics[zone].transactions.refunds += tx.amount;
        zoneMetrics[zone].transactions.net -= tx.amount;
      } else if (tx.type === 'EXPENSE') {
        zoneMetrics[zone].transactions.expenses += tx.amount;
        zoneMetrics[zone].transactions.net -= tx.amount;
      }
    });
    
    // Convert to array for response
    const metrics = Object.values(zoneMetrics);
    
    // Calculate comparison metrics
    const topServiceZones = [...metrics]
      .sort((a, b) => b.services.total - a.services.total);
    
    const topRevenueZones = [...metrics]
      .sort((a, b) => b.transactions.net - a.transactions.net);
    
    return res.status(200).json({
      success: true,
      data: {
        metrics,
        topServiceZones,
        topRevenueZones
      }
    });
  } catch (error) {
    console.error('Error fetching zone metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las métricas por zona',
      error: error.message
    });
  }
};