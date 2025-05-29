const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createAuditLog } = require('../utils/audit');

/**
 * @desc    Get all guests with filtering
 * @route   GET /api/guests
 * @access  Private
 */
exports.getAllGuests = async (req, res) => {
  try {
    const { 
      hotelId, 
      isActive = true,
      limit = 50,
      offset = 0
    } = req.query;
    
    const where = {
      isActive: isActive === 'true' || isActive === true
    };
    
    // Apply filters
    if (hotelId) where.hotelId = parseInt(hotelId);
    
    // Zone-based access control
    if (req.user.role === 'REPARTIDOR') {
      // Repartidores can only see guests from hotels in their zone
      where.hotel = { zone: req.user.zone };
    }
    
    // Get total count for pagination
    const totalCount = await prisma.guest.count({ where });
    
    // Get guests with pagination
    const guests = await prisma.guest.findMany({
      where,
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true
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
      count: guests.length,
      total: totalCount,
      data: guests
    });
  } catch (error) {
    console.error('Error fetching guests:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los huéspedes',
      error: error.message
    });
  }
};

/**
 * @desc    Get a specific guest
 * @route   GET /api/guests/:id
 * @access  Private
 */
exports.getGuestById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const guest = await prisma.guest.findUnique({
      where: { id: parseInt(id) },
      include: {
        hotel: true
      }
    });
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Huésped no encontrado'
      });
    }
    
    // Check permission
    if (req.user.role === 'REPARTIDOR' && guest.hotel.zone !== req.user.zone) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver este huésped'
      });
    }
    
    // Get recent services for the guest
    const recentServices = await prisma.service.findMany({
      where: { 
        guestId: parseInt(id),
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    return res.status(200).json({
      success: true,
      data: {
        ...guest,
        recentServices
      }
    });
  } catch (error) {
    console.error('Error fetching guest:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el huésped',
      error: error.message
    });
  }
};

/**
 * @desc    Register a new guest
 * @route   POST /api/guests
 * @access  Private
 */
exports.registerGuest = async (req, res) => {
  try {
    const { 
      hotelId, 
      name, 
      email, 
      phone,
      roomNumber,
      checkInDate,
      checkOutDate,
      idType,
      idNumber,
      nationality,
      notes
    } = req.body;
    
    // Validate required fields
    if (!hotelId || !name || !roomNumber) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere hotel, nombre y número de habitación'
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
        message: 'No tienes permiso para registrar huéspedes en este hotel'
      });
    }
    
    // Check if guest with same room already exists
    const existingGuest = await prisma.guest.findFirst({
      where: {
        hotelId: parseInt(hotelId),
        roomNumber,
        isActive: true
      }
    });
    
    if (existingGuest) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un huésped activo (${existingGuest.name}) en la habitación ${roomNumber}`
      });
    }
    
    // Parse dates
    const parsedCheckInDate = checkInDate ? new Date(checkInDate) : new Date();
    const parsedCheckOutDate = checkOutDate ? new Date(checkOutDate) : null;
    
    // Create guest
    const guest = await prisma.guest.create({
      data: {
        hotelId: parseInt(hotelId),
        name,
        email,
        phone,
        roomNumber,
        checkInDate: parsedCheckInDate,
        checkOutDate: parsedCheckOutDate,
        idType,
        idNumber,
        nationality,
        notes,
        isActive: true,
        createdById: req.user.id
      }
    });
    
    // Create audit log
    await createAuditLog(
      req.user.id,
      'GUEST',
      guest.id,
      'CREATE',
      null,
      guest,
      `Huésped ${name} registrado en habitación ${roomNumber} del hotel ${hotel.name}`
    );
    
    return res.status(201).json({
      success: true,
      message: 'Huésped registrado exitosamente',
      data: guest
    });
  } catch (error) {
    console.error('Error registering guest:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar el huésped',
      error: error.message
    });
  }
};

/**
 * @desc    Get guests for a specific hotel
 * @route   GET /api/guests/by-hotel/:hotelId
 * @access  Private
 */
exports.getGuestsByHotel = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { 
      isActive = true,
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
        message: 'No tienes permiso para ver huéspedes de este hotel'
      });
    }
    
    // Prepare query
    const where = { 
      hotelId: parseInt(hotelId),
      isActive: isActive === 'true' || isActive === true
    };
    
    // Get total count for pagination
    const totalCount = await prisma.guest.count({ where });
    
    // Get guests
    const guests = await prisma.guest.findMany({
      where,
      orderBy: { roomNumber: 'asc' },
      skip: parseInt(offset),
      take: parseInt(limit)
    });
    
    // Get stats
    const activeCount = await prisma.guest.count({
      where: {
        hotelId: parseInt(hotelId),
        isActive: true
      }
    });
    
    const inactiveCount = await prisma.guest.count({
      where: {
        hotelId: parseInt(hotelId),
        isActive: false
      }
    });
    
    const pendingServicesCount = await prisma.service.count({
      where: {
        hotelId: parseInt(hotelId),
        status: {
          in: ['PENDING', 'PICKED_UP', 'PROCESSING', 'LABELED']
        }
      }
    });
    
    return res.status(200).json({
      success: true,
      count: guests.length,
      total: totalCount,
      stats: {
        activeGuests: activeCount,
        inactiveGuests: inactiveCount,
        pendingServices: pendingServicesCount
      },
      data: guests
    });
  } catch (error) {
    console.error('Error fetching hotel guests:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los huéspedes del hotel',
      error: error.message
    });
  }
};

/**
 * @desc    Search guests by name, email, phone or ID
 * @route   GET /api/guests/search
 * @access  Private
 */
exports.searchGuests = async (req, res) => {
  try {
    const { 
      query, 
      hotelId,
      isActive = true,
      limit = 20
    } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'La búsqueda debe tener al menos 2 caracteres'
      });
    }
    
    const where = {
      isActive: isActive === 'true' || isActive === true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { idNumber: { contains: query, mode: 'insensitive' } },
        { roomNumber: { contains: query, mode: 'insensitive' } }
      ]
    };
    
    // Filter by hotel if provided
    if (hotelId) {
      where.hotelId = parseInt(hotelId);
    }
    
    // Zone-based access control
    if (req.user.role === 'REPARTIDOR') {
      where.hotel = { zone: req.user.zone };
    }
    
    // Get guests
    const guests = await prisma.guest.findMany({
      where,
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });
    
    return res.status(200).json({
      success: true,
      count: guests.length,
      data: guests
    });
  } catch (error) {
    console.error('Error searching guests:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al buscar huéspedes',
      error: error.message
    });
  }
};

/**
 * @desc    Update guest information
 * @route   PUT /api/guests/:id
 * @access  Private
 */
exports.updateGuest = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      email, 
      phone,
      roomNumber,
      checkInDate,
      checkOutDate,
      idType,
      idNumber,
      nationality,
      notes,
      isActive
    } = req.body;
    
    // Find the guest
    const guest = await prisma.guest.findUnique({
      where: { id: parseInt(id) },
      include: { hotel: true }
    });
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Huésped no encontrado'
      });
    }
    
    // Check permission
    if (req.user.role === 'REPARTIDOR' && guest.hotel.zone !== req.user.zone) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar este huésped'
      });
    }
    
    // Check for room conflict if changing room number
    if (roomNumber && roomNumber !== guest.roomNumber) {
      const existingGuest = await prisma.guest.findFirst({
        where: {
          hotelId: guest.hotelId,
          roomNumber,
          isActive: true,
          id: { not: parseInt(id) }
        }
      });
      
      if (existingGuest) {
        return res.status(400).json({
          success: false,
          message: `Ya existe un huésped activo (${existingGuest.name}) en la habitación ${roomNumber}`
        });
      }
    }
    
    // Parse dates
    const parsedCheckInDate = checkInDate ? new Date(checkInDate) : undefined;
    const parsedCheckOutDate = checkOutDate ? new Date(checkOutDate) : undefined;
    
    // Prepare update data
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
    if (parsedCheckInDate !== undefined) updateData.checkInDate = parsedCheckInDate;
    if (parsedCheckOutDate !== undefined) updateData.checkOutDate = parsedCheckOutDate;
    if (idType !== undefined) updateData.idType = idType;
    if (idNumber !== undefined) updateData.idNumber = idNumber;
    if (nationality !== undefined) updateData.nationality = nationality;
    if (notes !== undefined) updateData.notes = notes;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    updateData.updatedById = req.user.id;
    
    // Update guest
    const oldGuest = { ...guest };
    const updatedGuest = await prisma.guest.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    
    // Create audit log
    await createAuditLog(
      req.user.id,
      'GUEST',
      updatedGuest.id,
      'UPDATE',
      oldGuest,
      updatedGuest,
      `Huésped ${updatedGuest.name} actualizado`
    );
    
    return res.status(200).json({
      success: true,
      message: 'Huésped actualizado exitosamente',
      data: updatedGuest
    });
  } catch (error) {
    console.error('Error updating guest:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el huésped',
      error: error.message
    });
  }
};

/**
 * @desc    Delete a guest (soft delete)
 * @route   DELETE /api/guests/:id
 * @access  Private
 */
exports.deleteGuest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the guest
    const guest = await prisma.guest.findUnique({
      where: { id: parseInt(id) },
      include: { hotel: true }
    });
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Huésped no encontrado'
      });
    }
    
    // Check permission
    if (req.user.role === 'REPARTIDOR' && guest.hotel.zone !== req.user.zone) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este huésped'
      });
    }
    
    // Check for active services
    const activeServices = await prisma.service.count({
      where: {
        guestId: parseInt(id),
        status: {
          in: ['PENDING', 'PICKED_UP', 'PROCESSING', 'LABELED', 'READY', 'PARTIAL_DELIVERY']
        }
      }
    });
    
    if (activeServices > 0) {
      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el huésped porque tiene ${activeServices} servicios activos`
      });
    }
    
    // Soft delete (mark as inactive)
    const updatedGuest = await prisma.guest.update({
      where: { id: parseInt(id) },
      data: {
        isActive: false,
        updatedById: req.user.id
      }
    });
    
    // Create audit log
    await createAuditLog(
      req.user.id,
      'GUEST',
      updatedGuest.id,
      'DELETE',
      guest,
      updatedGuest,
      `Huésped ${guest.name} eliminado (desactivado)`
    );
    
    return res.status(200).json({
      success: true,
      message: 'Huésped eliminado exitosamente',
      data: updatedGuest
    });
  } catch (error) {
    console.error('Error deleting guest:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar el huésped',
      error: error.message
    });
  }
};

/**
 * @desc    Get service history for a guest
 * @route   GET /api/guests/:id/services
 * @access  Private
 */
exports.getGuestServices = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the guest
    const guest = await prisma.guest.findUnique({
      where: { id: parseInt(id) },
      include: { hotel: true }
    });
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Huésped no encontrado'
      });
    }
    
    // Check permission
    if (req.user.role === 'REPARTIDOR' && guest.hotel.zone !== req.user.zone) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver servicios de este huésped'
      });
    }
    
    // Get services
    const services = await prisma.service.findMany({
      where: { guestId: parseInt(id) },
      include: {
        bagLabels: true,
        transactions: {
          where: {
            type: 'PAYMENT'
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Get service stats
    const stats = {
      total: services.length,
      active: 0,
      completed: 0,
      totalSpent: 0
    };
    
    services.forEach(service => {
      if (service.status === 'DELIVERED') {
        stats.completed++;
      } else if (service.status !== 'CANCELLED') {
        stats.active++;
      }
      
      // Sum up transactions
      service.transactions.forEach(tx => {
        stats.totalSpent += tx.amount;
      });
    });
    
    return res.status(200).json({
      success: true,
      count: services.length,
      stats,
      data: services
    });
  } catch (error) {
    console.error('Error fetching guest services:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los servicios del huésped',
      error: error.message
    });
  }
};

/**
 * @desc    Get checkout report for a guest
 * @route   GET /api/guests/:id/checkout-report
 * @access  Private
 */
exports.getCheckoutReport = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the guest
    const guest = await prisma.guest.findUnique({
      where: { id: parseInt(id) },
      include: { hotel: true }
    });
    
    if (!guest) {
      return res.status(404).json({
        success: false,
        message: 'Huésped no encontrado'
      });
    }
    
    // Check permission
    if (req.user.role === 'REPARTIDOR' && guest.hotel.zone !== req.user.zone) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver el reporte de este huésped'
      });
    }
    
    // Get all services
    const services = await prisma.service.findMany({
      where: { guestId: parseInt(id) },
      include: {
        transactions: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Get pending services
    const pendingServices = services.filter(
      service => ['PENDING', 'PICKED_UP', 'PROCESSING', 'LABELED', 'READY', 'PARTIAL_DELIVERY'].includes(service.status)
    );
    
    // Calculate financial summary
    let totalCharges = 0;
    let totalPayments = 0;
    let totalRefunds = 0;
    
    services.forEach(service => {
      if (service.status !== 'CANCELLED') {
        // Add service charges
        totalCharges += service.finalPrice || service.estimatedPrice || 0;
        
        // Process transactions
        service.transactions.forEach(tx => {
          if (tx.type === 'PAYMENT') {
            totalPayments += tx.amount;
          } else if (tx.type === 'REFUND') {
            totalRefunds += tx.amount;
          }
        });
      }
    });
    
    const balance = totalCharges - totalPayments + totalRefunds;
    
    // Update checkout date if not set
    if (!guest.checkOutDate) {
      await prisma.guest.update({
        where: { id: parseInt(id) },
        data: {
          checkOutDate: new Date(),
          updatedById: req.user.id
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        guest,
        financial: {
          totalCharges,
          totalPayments,
          totalRefunds,
          balance
        },
        pendingServices: {
          count: pendingServices.length,
          services: pendingServices
        },
        allServices: services
      }
    });
  } catch (error) {
    console.error('Error generating checkout report:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar el reporte de check-out',
      error: error.message
    });
  }
};