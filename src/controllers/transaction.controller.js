const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createAuditLog } = require('../utils/audit');
const { TRANSACTION_TYPES, PAYMENT_METHODS, TAX_RATE } = require('../config/constants');

/**
 * @desc    Get all transactions with filtering
 * @route   GET /api/transactions
 * @access  Private
 */
exports.getAllTransactions = async (req, res) => {
  try {
    const { 
      type, 
      status,
      hotelId, 
      serviceId,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;
    
    const where = {};
    
    // Apply filters
    if (type) where.type = type;
    if (status) where.status = status;
    if (hotelId) where.hotelId = parseInt(hotelId);
    if (serviceId) where.serviceId = parseInt(serviceId);
    
    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    
    // Zone-based access control
    if (req.user.role === 'REPARTIDOR') {
      // Repartidores can only see transactions from hotels in their zone
      where.hotel = { zone: req.user.zone };
    }
    
    // Get total count for pagination
    const totalCount = await prisma.transaction.count({ where });
    
    // Get transactions with pagination
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true
          }
        },
        service: {
          select: {
            id: true,
            guestName: true,
            roomNumber: true,
            status: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      skip: parseInt(offset),
      take: parseInt(limit)
    });
    
    return res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las transacciones',
      error: error.message
    });
  }
};

/**
 * @desc    Get a specific transaction
 * @route   GET /api/transactions/:id
 * @access  Private
 */
exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) },
      include: {
        hotel: true,
        service: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }
    
    // Check permission
    if (req.user.role === 'REPARTIDOR' && transaction.hotel.zone !== req.user.zone) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver esta transacción'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la transacción',
      error: error.message
    });
  }
};

/**
 * @desc    Create a new transaction
 * @route   POST /api/transactions
 * @access  Private
 */
exports.createTransaction = async (req, res) => {
  try {
    const { 
      type, 
      amount,
      hotelId,
      serviceId,
      paymentMethod,
      notes,
      receiptNumber
    } = req.body;
    
    // Validate required fields
    if (!type || !amount || !hotelId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren tipo, monto, hotel y método de pago'
      });
    }
    
    // Validate transaction type
    if (!Object.values(TRANSACTION_TYPES).includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de transacción inválido'
      });
    }
    
    // Validate payment method
    if (!Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Método de pago inválido'
      });
    }
    
    // Validate hotel exists
    const hotel = await prisma.hotel.findUnique({
      where: { id: parseInt(hotelId) }
    });
    
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel no encontrado'
      });
    }
    
    // Check zone permission for repartidor
    if (req.user.role === 'REPARTIDOR' && hotel.zone !== req.user.zone) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para crear transacciones para este hotel'
      });
    }
    
    // Validate service exists if serviceId is provided
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: parseInt(serviceId) }
      });
      
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }
      
      // Check if service belongs to the hotel
      if (service.hotelId !== parseInt(hotelId)) {
        return res.status(400).json({
          success: false,
          message: 'El servicio no pertenece al hotel especificado'
        });
      }
    }
    
    // Calculate transaction values
    const parsedAmount = parseFloat(amount);
    const subtotal = type === TRANSACTION_TYPES.EXPENSE ? parsedAmount : parsedAmount / (1 + TAX_RATE);
    const tax = type === TRANSACTION_TYPES.EXPENSE ? 0 : parsedAmount - subtotal;
    
    // Determine sign for hotel balance update
    let balanceChange = parsedAmount;
    if (type === TRANSACTION_TYPES.PAYMENT) {
      balanceChange = -parsedAmount; // Payment decreases hotel balance
    } else if (type === TRANSACTION_TYPES.REFUND) {
      balanceChange = parsedAmount; // Refund increases hotel balance
    } else if (type === TRANSACTION_TYPES.EXPENSE) {
      balanceChange = -parsedAmount; // Expense decreases hotel balance
    }
    
    // Create transaction
    const transaction = await prisma.$transaction(async (prisma) => {
      // Create the transaction
      const newTransaction = await prisma.transaction.create({
        data: {
          type,
          amount: parsedAmount,
          subtotal,
          tax,
          hotelId: parseInt(hotelId),
          serviceId: serviceId ? parseInt(serviceId) : null,
          paymentMethod,
          notes,
          receiptNumber,
          status: 'COMPLETED',
          createdById: req.user.id
        }
      });
      
      // Update hotel balance
      await prisma.hotel.update({
        where: { id: parseInt(hotelId) },
        data: {
          balance: {
            increment: balanceChange
          }
        }
      });
      
      return newTransaction;
    });
    
    // Create audit log
    await createAuditLog(
      req.user.id,
      'TRANSACTION',
      transaction.id,
      'CREATE',
      null,
      transaction,
      `Transacción ${type} creada por ${parseFloat(amount).toFixed(2)} para ${hotel.name}`
    );
    
    return res.status(201).json({
      success: true,
      message: 'Transacción creada exitosamente',
      data: transaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear la transacción',
      error: error.message
    });
  }
};

/**
 * @desc    Get transaction summary data
 * @route   GET /api/transactions/summary
 * @access  Private (Admin)
 */
exports.getTransactionSummary = async (req, res) => {
  try {
    const { 
      startDate,
      endDate,
      groupBy = 'day' // day, week, month
    } = req.query;
    
    // Validate admin access
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden ver el resumen de transacciones'
      });
    }
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.lte = end;
      }
    }
    
    // Get summary by transaction type
    const typeStats = await prisma.transaction.groupBy({
      by: ['type'],
      where: dateFilter,
      _sum: {
        amount: true,
        subtotal: true,
        tax: true
      },
      _count: true
    });
    
    // Get summary by payment method
    const methodStats = await prisma.transaction.groupBy({
      by: ['paymentMethod'],
      where: dateFilter,
      _sum: {
        amount: true
      },
      _count: true
    });
    
    // Get overall totals
    const totals = await prisma.transaction.aggregate({
      where: dateFilter,
      _sum: {
        amount: true,
        subtotal: true,
        tax: true
      },
      _count: true
    });
    
    // Get time-based trend data
    let timeGrouping;
    if (groupBy === 'week') {
      timeGrouping = 'week'; // This might need custom handling depending on your database
    } else if (groupBy === 'month') {
      timeGrouping = 'month';
    } else {
      timeGrouping = 'day';
    }
    
    // Note: This grouping might require raw SQL depending on your database
    // For Prisma, you might need to process dates in JavaScript
    // This is a simplified example
    const transactions = await prisma.transaction.findMany({
      where: dateFilter,
      select: {
        id: true,
        type: true,
        amount: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Process time-based data in JavaScript
    const trendData = {};
    transactions.forEach(tx => {
      let key;
      const date = new Date(tx.createdAt);
      
      if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        // Get the week number
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      } else {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
      
      if (!trendData[key]) {
        trendData[key] = {
          PAYMENT: 0,
          REFUND: 0,
          EXPENSE: 0,
          total: 0
        };
      }
      
      trendData[key][tx.type] += tx.amount;
      trendData[key].total += tx.type === 'PAYMENT' ? tx.amount : -tx.amount;
    });
    
    // Convert to array for easier consumption by frontend
    const trends = Object.entries(trendData).map(([date, data]) => ({
      date,
      ...data
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    return res.status(200).json({
      success: true,
      data: {
        byType: typeStats,
        byMethod: methodStats,
        totals: {
          count: totals._count,
          amount: totals._sum.amount || 0,
          subtotal: totals._sum.subtotal || 0,
          tax: totals._sum.tax || 0
        },
        trends
      }
    });
  } catch (error) {
    console.error('Error generating transaction summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar el resumen de transacciones',
      error: error.message
    });
  }
};

/**
 * @desc    Get transactions for a specific hotel
 * @route   GET /api/transactions/by-hotel/:hotelId
 * @access  Private
 */
exports.getTransactionsByHotel = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { 
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = req.query;
    
    // Validate hotel exists
    const hotel = await prisma.hotel.findUnique({
      where: { id: parseInt(hotelId) }
    });
    
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel no encontrado'
      });
    }
    
    // Check permission
    if (req.user.role === 'REPARTIDOR' && hotel.zone !== req.user.zone) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver transacciones de este hotel'
      });
    }
    
    // Prepare query
    const where = { 
      hotelId: parseInt(hotelId)
    };
    
    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    
    // Get total count for pagination
    const totalCount = await prisma.transaction.count({ where });
    
    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        service: {
          select: {
            id: true,
            guestName: true,
            roomNumber: true,
            status: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(offset),
      take: parseInt(limit)
    });
    
    // Get summary statistics
    const summary = await prisma.transaction.groupBy({
      by: ['type'],
      where,
      _sum: {
        amount: true
      },
      _count: true
    });
    
    // Process summary data
    const summaryData = {
      totalPayments: 0,
      totalRefunds: 0,
      totalExpenses: 0
    };
    
    summary.forEach(item => {
      if (item.type === 'PAYMENT') {
        summaryData.totalPayments = item._sum.amount || 0;
      } else if (item.type === 'REFUND') {
        summaryData.totalRefunds = item._sum.amount || 0;
      } else if (item.type === 'EXPENSE') {
        summaryData.totalExpenses = item._sum.amount || 0;
      }
    });
    
    return res.status(200).json({
      success: true,
      count: transactions.length,
      total: totalCount,
      hotel: {
        id: hotel.id,
        name: hotel.name,
        zone: hotel.zone,
        currentBalance: hotel.balance
      },
      summary: summaryData,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching hotel transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las transacciones del hotel',
      error: error.message
    });
  }
};

/**
 * @desc    Get transactions for a specific service
 * @route   GET /api/transactions/by-service/:serviceId
 * @access  Private
 */
exports.getTransactionsByService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    // Find the service
    const service = await prisma.service.findUnique({
      where: { id: parseInt(serviceId) },
      include: { hotel: true }
    });
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    // Check permission
    if (req.user.role === 'REPARTIDOR' && service.hotel.zone !== req.user.zone) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver transacciones de este servicio'
      });
    }
    
    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where: { serviceId: parseInt(serviceId) },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculate totals
    let totalPayments = 0;
    let totalRefunds = 0;
    
    transactions.forEach(tx => {
      if (tx.type === 'PAYMENT') {
        totalPayments += tx.amount;
      } else if (tx.type === 'REFUND') {
        totalRefunds += tx.amount;
      }
    });
    
    const netAmount = totalPayments - totalRefunds;
    
    return res.status(200).json({
      success: true,
      service: {
        id: service.id,
        guestName: service.guestName,
        roomNumber: service.roomNumber,
        status: service.status,
        estimatedPrice: service.estimatedPrice,
        finalPrice: service.finalPrice
      },
      summary: {
        totalPayments,
        totalRefunds,
        netAmount
      },
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching service transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las transacciones del servicio',
      error: error.message
    });
  }
};