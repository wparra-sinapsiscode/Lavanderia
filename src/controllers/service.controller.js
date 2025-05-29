const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();
const { createAuditLog } = require('../utils/audit');
const { VALID_STATUS_TRANSITIONS, STATUS_REQUIREMENTS, SERVICE_PRIORITY } = require('../config/constants');

/**
 * @desc    Get all services with filtering
 * @route   GET /api/services
 * @access  Private
 */
exports.getAllServices = async (req, res) => {
  try {
    const { 
      status, 
      hotelId, 
      zone, 
      priority,
      limit = 50,
      offset = 0
    } = req.query;
    
    const where = {};
    
    // Apply filters
    if (status) where.status = status;
    if (hotelId) where.hotelId = parseInt(hotelId);
    if (priority) where.priority = priority;
    
    // Zone-based access control
    if (zone) {
      where.hotel = { zone };
    } else if (req.user.role === 'REPARTIDOR') {
      // Repartidores can only see services from hotels in their zone
      where.hotel = { zone: req.user.zone };
    }
    
    // Get total count for pagination
    const totalCount = await prisma.service.count({ where });
    
    // Get services with pagination
    const services = await prisma.service.findMany({
      where,
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            zone: true
          }
        },
        bagLabels: {
          select: {
            id: true,
            labelNumber: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: parseInt(offset),
      take: parseInt(limit)
    });
    
    return res.status(200).json({
      success: true,
      count: services.length,
      total: totalCount,
      data: services
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los servicios',
      error: error.message
    });
  }
};

/**
 * @desc    Get a specific service
 * @route   GET /api/services/:id
 * @access  Private
 */
exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await prisma.service.findUnique({
      where: { id: parseInt(id) },
      include: {
        hotel: true,
        bagLabels: true,
        transactions: true
      }
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
        message: 'No tienes permiso para ver este servicio'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener el servicio',
      error: error.message
    });
  }
};

/**
 * @desc    Create a new service
 * @route   POST /api/services
 * @access  Private
 */
exports.createService = async (req, res) => {
  try {
    const { 
      hotelId, 
      guestName, 
      roomNumber, 
      priority = SERVICE_PRIORITY.NORMAL,
      notes 
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
        message: 'No tienes permiso para crear servicios en este hotel'
      });
    }
    
    // Create service
    const service = await prisma.service.create({
      data: {
        hotelId: parseInt(hotelId),
        guestName,
        roomNumber,
        priority,
        status: 'PENDING',
        notes,
        createdById: req.user.id
      }
    });
    
    // Create audit log
    await createAuditLog(
      req.user.id,
      'SERVICE',
      service.id,
      'CREATE',
      null,
      service,
      `Servicio creado para ${guestName} en hotel ${hotel.name}`
    );
    
    return res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      data: service
    });
  } catch (error) {
    console.error('Error creating service:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear el servicio',
      error: error.message
    });
  }
};

/**
 * @desc    Register pickup for a service
 * @route   PUT /api/services/:id/pickup
 * @access  Private
 */
exports.registerPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      weight,
      bagIds,
      signature,
      notes
    } = req.body;
    
    // Find the service
    const service = await prisma.service.findUnique({
      where: { id: parseInt(id) },
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
        message: 'No tienes permiso para actualizar este servicio'
      });
    }
    
    // Validate status
    if (service.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `No se puede registrar recogida para un servicio en estado ${service.status}`
      });
    }
    
    // Validate required fields
    if (!weight || !signature || !bagIds || bagIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere peso, firma y al menos una bolsa para registrar la recogida'
      });
    }
    
    // Calculate estimated price based on weight and hotel price per kg
    const estimatedPrice = parseFloat(weight) * service.hotel.pricePerKg;
    
    // Update service
    const oldService = { ...service };
    const updatedService = await prisma.service.update({
      where: { id: parseInt(id) },
      data: {
        status: 'PICKED_UP',
        weight: parseFloat(weight),
        estimatedPrice,
        pickupSignature: signature,
        pickupNotes: notes,
        pickupDate: new Date(),
        updatedById: req.user.id,
        bagLabels: {
          connect: bagIds.map(bagId => ({ id: parseInt(bagId) }))
        }
      }
    });
    
    // Update hotel bag inventory
    await prisma.hotel.update({
      where: { id: service.hotelId },
      data: {
        bagInventory: {
          decrement: bagIds.length
        }
      }
    });
    
    // Create audit log
    await createAuditLog(
      req.user.id,
      'SERVICE',
      updatedService.id,
      'UPDATE',
      oldService,
      updatedService,
      `Recogida registrada para servicio ${id} con peso ${weight}kg`
    );
    
    return res.status(200).json({
      success: true,
      message: 'Recogida registrada exitosamente',
      data: updatedService
    });
  } catch (error) {
    console.error('Error registering pickup:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar la recogida',
      error: error.message
    });
  }
};

/**
 * @desc    Change service status
 * @route   PUT /api/services/:id/status
 * @access  Private
 */
exports.updateServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    // Find the service
    const service = await prisma.service.findUnique({
      where: { id: parseInt(id) },
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
        message: 'No tienes permiso para actualizar este servicio'
      });
    }
    
    // Validate status transition
    const validTransitions = VALID_STATUS_TRANSITIONS[service.status] || [];
    if (!validTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `No se puede cambiar el estado de ${service.status} a ${status}`
      });
    }
    
    // Check requirements for status
    const requirements = STATUS_REQUIREMENTS[status] || [];
    for (const field of requirements) {
      if (!service[field]) {
        return res.status(400).json({
          success: false,
          message: `Falta información requerida para el estado ${status}: ${field}`
        });
      }
    }
    
    // Prepare update data
    const updateData = {
      status,
      updatedById: req.user.id
    };
    
    // Add notes if provided
    if (notes) {
      updateData.statusNotes = notes;
    }
    
    // Add timestamps based on status
    if (status === 'PROCESSING') {
      updateData.processingDate = new Date();
    } else if (status === 'READY') {
      updateData.readyDate = new Date();
    } else if (status === 'DELIVERED') {
      updateData.deliveryDate = new Date();
      // Calculate final price
      updateData.finalPrice = service.estimatedPrice;
    }
    
    // Update service
    const oldService = { ...service };
    const updatedService = await prisma.service.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    
    // Create audit log
    await createAuditLog(
      req.user.id,
      'SERVICE',
      updatedService.id,
      'UPDATE',
      oldService,
      updatedService,
      `Estado de servicio actualizado: ${service.status} → ${status}`
    );
    
    return res.status(200).json({
      success: true,
      message: 'Estado de servicio actualizado exitosamente',
      data: updatedService
    });
  } catch (error) {
    console.error('Error updating service status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado del servicio',
      error: error.message
    });
  }
};

/**
 * @desc    Register partial delivery
 * @route   PUT /api/services/:id/partial-delivery
 * @access  Private
 */
exports.registerPartialDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      percentage,
      signature,
      notes
    } = req.body;
    
    // Validate percentage
    const deliveryPercentage = parseInt(percentage);
    if (isNaN(deliveryPercentage) || deliveryPercentage <= 0 || deliveryPercentage >= 100) {
      return res.status(400).json({
        success: false,
        message: 'El porcentaje de entrega parcial debe ser mayor a 0 y menor a 100'
      });
    }
    
    // Find the service
    const service = await prisma.service.findUnique({
      where: { id: parseInt(id) },
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
        message: 'No tienes permiso para actualizar este servicio'
      });
    }
    
    // Validate status
    if (service.status !== 'READY' && service.status !== 'PARTIAL_DELIVERY') {
      return res.status(400).json({
        success: false,
        message: `No se puede registrar entrega parcial para un servicio en estado ${service.status}`
      });
    }
    
    // Calculate delivered and pending percentages
    const previousDelivered = service.deliveredPercentage || 0;
    const newDeliveredTotal = previousDelivered + deliveryPercentage;
    
    if (newDeliveredTotal >= 100) {
      return res.status(400).json({
        success: false,
        message: 'La entrega parcial excede el 100%. Use entrega completa en su lugar.'
      });
    }
    
    // Update service
    const oldService = { ...service };
    const updatedService = await prisma.service.update({
      where: { id: parseInt(id) },
      data: {
        status: 'PARTIAL_DELIVERY',
        deliveredPercentage: newDeliveredTotal,
        partialDeliveryDate: new Date(),
        partialDeliverySignature: signature || service.partialDeliverySignature,
        partialDeliveryNotes: notes,
        updatedById: req.user.id
      }
    });
    
    // Create audit log
    await createAuditLog(
      req.user.id,
      'SERVICE',
      updatedService.id,
      'UPDATE',
      oldService,
      updatedService,
      `Entrega parcial (${deliveryPercentage}%) registrada para servicio ${id}`
    );
    
    return res.status(200).json({
      success: true,
      message: 'Entrega parcial registrada exitosamente',
      data: updatedService
    });
  } catch (error) {
    console.error('Error registering partial delivery:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al registrar la entrega parcial',
      error: error.message
    });
  }
};

/**
 * @desc    Upload photos for a service
 * @route   POST /api/services/:id/photos
 * @access  Private
 */
exports.uploadServicePhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const { photos, type } = req.body;
    
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron fotos'
      });
    }
    
    if (!['pickup', 'process', 'delivery', 'damaged'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de foto inválido'
      });
    }
    
    // Find the service
    const service = await prisma.service.findUnique({
      where: { id: parseInt(id) },
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
        message: 'No tienes permiso para actualizar este servicio'
      });
    }
    
    // Check photo count limit
    const MAX_PHOTOS = 5;
    if (photos.length > MAX_PHOTOS) {
      return res.status(400).json({
        success: false,
        message: `No se pueden subir más de ${MAX_PHOTOS} fotos a la vez`
      });
    }
    
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(__dirname, '../../uploads/services', id.toString(), type);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Process each photo
    const photoUrls = [];
    for (let i = 0; i < photos.length; i++) {
      const base64Data = photos[i].replace(/^data:image\/\w+;base64,/, '');
      const filename = `${Date.now()}-${i}.jpg`;
      const filePath = path.join(uploadDir, filename);
      
      fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
      photoUrls.push(`/uploads/services/${id}/${type}/${filename}`);
    }
    
    // Update service with photo URLs
    const oldService = { ...service };
    let updateData = {};
    
    if (type === 'pickup') {
      updateData.pickupPhotos = [...(service.pickupPhotos || []), ...photoUrls];
    } else if (type === 'process') {
      updateData.processPhotos = [...(service.processPhotos || []), ...photoUrls];
    } else if (type === 'delivery') {
      updateData.deliveryPhotos = [...(service.deliveryPhotos || []), ...photoUrls];
    } else if (type === 'damaged') {
      updateData.damagedItemPhotos = [...(service.damagedItemPhotos || []), ...photoUrls];
    }
    
    const updatedService = await prisma.service.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        updatedById: req.user.id
      }
    });
    
    // Create audit log
    await createAuditLog(
      req.user.id,
      'SERVICE',
      updatedService.id,
      'UPDATE',
      oldService,
      updatedService,
      `${photos.length} fotos de tipo ${type} subidas para servicio ${id}`
    );
    
    return res.status(200).json({
      success: true,
      message: 'Fotos subidas exitosamente',
      data: {
        photoUrls
      }
    });
  } catch (error) {
    console.error('Error uploading photos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al subir las fotos',
      error: error.message
    });
  }
};

/**
 * @desc    Get pending services
 * @route   GET /api/services/pending
 * @access  Private
 */
exports.getPendingServices = async (req, res) => {
  try {
    const where = {
      status: {
        in: ['PENDING', 'PICKED_UP', 'PROCESSING', 'READY', 'PARTIAL_DELIVERY']
      }
    };
    
    // Repartidores can only see services from hotels in their zone
    if (req.user.role === 'REPARTIDOR') {
      where.hotel = { zone: req.user.zone };
    }
    
    // Get services
    const services = await prisma.service.findMany({
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
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });
    
    // Group services by status
    const grouped = services.reduce((acc, service) => {
      if (!acc[service.status]) {
        acc[service.status] = [];
      }
      acc[service.status].push(service);
      return acc;
    }, {});
    
    // Get counts for dashboard
    const counts = {
      PENDING: grouped.PENDING?.length || 0,
      PICKED_UP: grouped.PICKED_UP?.length || 0,
      PROCESSING: grouped.PROCESSING?.length || 0,
      READY: grouped.READY?.length || 0,
      PARTIAL_DELIVERY: grouped.PARTIAL_DELIVERY?.length || 0,
      total: services.length
    };
    
    return res.status(200).json({
      success: true,
      counts,
      data: grouped
    });
  } catch (error) {
    console.error('Error fetching pending services:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener los servicios pendientes',
      error: error.message
    });
  }
};