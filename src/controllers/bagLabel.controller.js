const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { createAuditLog } = require('../utils/audit');
const { LABEL_STATUS_TRANSITIONS } = require('../config/constants');

/**
 * @desc    Get all bag labels with filtering
 * @route   GET /api/bag-labels
 * @access  Private
 */
exports.getAllBagLabels = async (req, res) => {
  try {
    const { 
      status, 
      hotelId, 
      serviceId,
      generatedAt,
      limit = 50,
      offset = 0
    } = req.query;
    
    const where = {};
    
    // Apply filters
    if (status) where.status = status;
    if (hotelId) where.hotelId = parseInt(hotelId);
    if (serviceId) where.serviceId = parseInt(serviceId);
    if (generatedAt) {
      const date = new Date(generatedAt);
      where.createdAt = {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999))
      };
    }
    
    // Zone-based access control
    if (req.user.role === 'REPARTIDOR') {
      // Repartidores can only see bag labels from hotels in their zone
      where.hotel = { zone: req.user.zone };
    }
    
    // Get total count for pagination
    const totalCount = await prisma.bagLabel.count({ where });
    
    // Get bag labels with pagination
    const bagLabels = await prisma.bagLabel.findMany({
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
      count: bagLabels.length,
      total: totalCount,
      data: bagLabels
    });
  } catch (error) {
    console.error('Error fetching bag labels:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las etiquetas de bolsas',
      error: error.message
    });
  }
};

/**
 * @desc    Get a specific bag label
 * @route   GET /api/bag-labels/:id
 * @access  Private
 */
exports.getBagLabelById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const bagLabel = await prisma.bagLabel.findUnique({
      where: { id: parseInt(id) },
      include: {
        hotel: true,
        service: true
      }
    });
    
    if (!bagLabel) {
      return res.status(404).json({
        success: false,
        message: 'Etiqueta de bolsa no encontrada'
      });
    }
    
    // Check permission
    if (req.user.role === 'REPARTIDOR' && bagLabel.hotel.zone !== req.user.zone) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver esta etiqueta de bolsa'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: bagLabel
    });
  } catch (error) {
    console.error('Error fetching bag label:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener la etiqueta de bolsa',
      error: error.message
    });
  }
};

/**
 * @desc    Create new bag labels (batch creation)
 * @route   POST /api/bag-labels
 * @access  Private
 */
exports.createBagLabels = async (req, res) => {
  try {
    const { 
      hotelId, 
      serviceId, 
      quantity, 
      labelPrefix 
    } = req.body;
    
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
        message: 'No tienes permiso para crear etiquetas para este hotel'
      });
    }
    
    // Check if quantity is valid
    const labelCount = parseInt(quantity);
    if (isNaN(labelCount) || labelCount <= 0 || labelCount > 20) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser un número entre 1 y 20'
      });
    }
    
    // Check if service exists if serviceId is provided
    let service = null;
    if (serviceId) {
      service = await prisma.service.findUnique({
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
    
    // Generate label numbers
    const prefix = labelPrefix || hotel.labelPrefix || hotel.name.substring(0, 3).toUpperCase();
    const timestamp = new Date().getTime();
    
    // Get the last label number for this hotel to ensure uniqueness
    const lastLabel = await prisma.bagLabel.findFirst({
      where: { hotelId: parseInt(hotelId) },
      orderBy: { labelNumber: 'desc' }
    });
    
    let startingNumber = 1;
    if (lastLabel && lastLabel.labelNumber) {
      const lastNumber = parseInt(lastLabel.labelNumber.replace(/^[A-Z]+-\d+-/, ''));
      if (!isNaN(lastNumber)) {
        startingNumber = lastNumber + 1;
      }
    }
    
    // Create bag labels
    const bagLabelData = [];
    for (let i = 0; i < labelCount; i++) {
      const labelNumber = `${prefix}-${timestamp}-${(startingNumber + i).toString().padStart(3, '0')}`;
      
      bagLabelData.push({
        hotelId: parseInt(hotelId),
        serviceId: serviceId ? parseInt(serviceId) : null,
        labelNumber,
        status: 'AVAILABLE',
        createdById: req.user.id
      });
    }
    
    // Insert bag labels in batch
    const createdLabels = await prisma.$transaction(
      bagLabelData.map(data => 
        prisma.bagLabel.create({ data })
      )
    );
    
    // Update service status if service is provided and status is PENDING
    if (service && service.status === 'PENDING') {
      await prisma.service.update({
        where: { id: parseInt(serviceId) },
        data: {
          status: 'LABELED',
          updatedById: req.user.id
        }
      });
    }
    
    // Create audit log for each created label
    for (const label of createdLabels) {
      await createAuditLog(
        req.user.id,
        'BAG_LABEL',
        label.id,
        'CREATE',
        null,
        label,
        `Etiqueta ${label.labelNumber} creada para hotel ${hotel.name}`
      );
    }
    
    return res.status(201).json({
      success: true,
      message: `${labelCount} etiquetas creadas exitosamente`,
      data: createdLabels
    });
  } catch (error) {
    console.error('Error creating bag labels:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear las etiquetas de bolsas',
      error: error.message
    });
  }
};

/**
 * @desc    Update a bag label
 * @route   PUT /api/bag-labels/:id
 * @access  Private
 */
exports.updateBagLabel = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      serviceId,
      notes
    } = req.body;
    
    // Find the bag label
    const bagLabel = await prisma.bagLabel.findUnique({
      where: { id: parseInt(id) },
      include: { hotel: true }
    });
    
    if (!bagLabel) {
      return res.status(404).json({
        success: false,
        message: 'Etiqueta de bolsa no encontrada'
      });
    }
    
    // Check permission
    if (req.user.role === 'REPARTIDOR' && bagLabel.hotel.zone !== req.user.zone) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para actualizar esta etiqueta'
      });
    }
    
    // Validate status transition if status is provided
    if (status && status !== bagLabel.status) {
      const validTransitions = LABEL_STATUS_TRANSITIONS[bagLabel.status] || [];
      if (!validTransitions.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `No se puede cambiar el estado de ${bagLabel.status} a ${status}`
        });
      }
    }
    
    // Check if service exists if serviceId is provided
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
      
      // Check if service belongs to the same hotel
      if (service.hotelId !== bagLabel.hotelId) {
        return res.status(400).json({
          success: false,
          message: 'El servicio no pertenece al mismo hotel que la etiqueta'
        });
      }
    }
    
    // Prepare update data
    const updateData = {
      updatedById: req.user.id
    };
    
    if (status) updateData.status = status;
    if (serviceId) updateData.serviceId = parseInt(serviceId);
    if (notes) updateData.notes = notes;
    
    // Update bag label
    const oldBagLabel = { ...bagLabel };
    const updatedBagLabel = await prisma.bagLabel.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    
    // Create audit log
    await createAuditLog(
      req.user.id,
      'BAG_LABEL',
      updatedBagLabel.id,
      'UPDATE',
      oldBagLabel,
      updatedBagLabel,
      `Etiqueta ${bagLabel.labelNumber} actualizada`
    );
    
    return res.status(200).json({
      success: true,
      message: 'Etiqueta actualizada exitosamente',
      data: updatedBagLabel
    });
  } catch (error) {
    console.error('Error updating bag label:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar la etiqueta',
      error: error.message
    });
  }
};

/**
 * @desc    Get available bag labels
 * @route   GET /api/bag-labels/available
 * @access  Private
 */
exports.getAvailableBagLabels = async (req, res) => {
  try {
    const { hotelId } = req.query;
    
    const where = { 
      status: 'AVAILABLE'
    };
    
    // Filter by hotel if provided
    if (hotelId) {
      where.hotelId = parseInt(hotelId);
    }
    
    // Zone-based access control
    if (req.user.role === 'REPARTIDOR') {
      // Repartidores can only see bag labels from hotels in their zone
      where.hotel = { zone: req.user.zone };
    }
    
    const availableLabels = await prisma.bagLabel.findMany({
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
      orderBy: { createdAt: 'desc' }
    });
    
    return res.status(200).json({
      success: true,
      count: availableLabels.length,
      data: availableLabels
    });
  } catch (error) {
    console.error('Error fetching available bag labels:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las etiquetas disponibles',
      error: error.message
    });
  }
};

/**
 * @desc    Get bag labels for a specific hotel
 * @route   GET /api/bag-labels/by-hotel/:hotelId
 * @access  Private
 */
exports.getBagLabelsByHotel = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { 
      status,
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
        message: 'No tienes permiso para ver etiquetas de este hotel'
      });
    }
    
    // Prepare query
    const where = { 
      hotelId: parseInt(hotelId)
    };
    
    if (status) where.status = status;
    
    // Get total count for pagination
    const totalCount = await prisma.bagLabel.count({ where });
    
    // Get bag labels
    const bagLabels = await prisma.bagLabel.findMany({
      where,
      include: {
        service: {
          select: {
            id: true,
            guestName: true,
            roomNumber: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(offset),
      take: parseInt(limit)
    });
    
    // Get status counts
    const statusCounts = await prisma.bagLabel.groupBy({
      by: ['status'],
      where: { hotelId: parseInt(hotelId) },
      _count: true
    });
    
    const counts = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {});
    
    return res.status(200).json({
      success: true,
      count: bagLabels.length,
      total: totalCount,
      counts,
      data: bagLabels
    });
  } catch (error) {
    console.error('Error fetching hotel bag labels:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las etiquetas del hotel',
      error: error.message
    });
  }
};