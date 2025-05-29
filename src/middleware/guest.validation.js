const { body, param, query } = require('express-validator');
const { validate } = require('./validation.middleware');
const { prisma } = require('../config/database');

/**
 * Validate guest registration input
 */
exports.validateGuestRegistration = [
  body('name')
    .isString().withMessage('El nombre debe ser texto')
    .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  
  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Debe proporcionar un email válido'),
  
  body('phone')
    .optional({ nullable: true })
    .isString().withMessage('El teléfono debe ser texto')
    .isLength({ min: 5, max: 20 }).withMessage('El teléfono debe tener entre 5 y 20 caracteres'),
  
  body('identificationType')
    .isIn(['DNI', 'PASSPORT', 'FOREIGN_ID', 'OTHER'])
    .withMessage('Tipo de identificación inválido'),
  
  body('identificationNumber')
    .isString().withMessage('El número de identificación debe ser texto')
    .isLength({ min: 3, max: 20 }).withMessage('El número de identificación debe tener entre 3 y 20 caracteres'),
  
  body('nationality')
    .optional({ nullable: true })
    .isString().withMessage('La nacionalidad debe ser texto')
    .isLength({ min: 2, max: 50 }).withMessage('La nacionalidad debe tener entre 2 y 50 caracteres'),
  
  body('hotelId')
    .isUUID().withMessage('ID de hotel inválido')
    .custom(async (hotelId) => {
      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId }
      });
      
      if (!hotel) {
        throw new Error('Hotel no encontrado');
      }
      
      return true;
    }),
  
  body('roomNumber')
    .isString().withMessage('El número de habitación debe ser texto')
    .isLength({ min: 1, max: 10 }).withMessage('El número de habitación debe tener entre 1 y 10 caracteres'),
  
  body('checkInDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Fecha de check-in inválida'),
  
  body('checkOutDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Fecha de check-out inválida')
    .custom((checkOutDate, { req }) => {
      const { checkInDate } = req.body;
      if (checkInDate && checkOutDate && new Date(checkOutDate) <= new Date(checkInDate)) {
        throw new Error('La fecha de check-out debe ser posterior a la fecha de check-in');
      }
      return true;
    }),
  
  body('notes')
    .optional({ nullable: true })
    .isString().withMessage('Las notas deben ser texto'),
  
  validate
];

/**
 * Validate guest update input
 */
exports.validateGuestUpdate = [
  param('id')
    .isUUID().withMessage('ID de huésped inválido')
    .custom(async (id) => {
      const guest = await prisma.guest.findUnique({
        where: { id }
      });
      
      if (!guest) {
        throw new Error('Huésped no encontrado');
      }
      
      return true;
    }),
  
  body('name')
    .optional()
    .isString().withMessage('El nombre debe ser texto')
    .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  
  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Debe proporcionar un email válido'),
  
  body('phone')
    .optional({ nullable: true })
    .isString().withMessage('El teléfono debe ser texto')
    .isLength({ min: 5, max: 20 }).withMessage('El teléfono debe tener entre 5 y 20 caracteres'),
  
  body('identificationType')
    .optional()
    .isIn(['DNI', 'PASSPORT', 'FOREIGN_ID', 'OTHER'])
    .withMessage('Tipo de identificación inválido'),
  
  body('identificationNumber')
    .optional()
    .isString().withMessage('El número de identificación debe ser texto')
    .isLength({ min: 3, max: 20 }).withMessage('El número de identificación debe tener entre 3 y 20 caracteres'),
  
  body('nationality')
    .optional({ nullable: true })
    .isString().withMessage('La nacionalidad debe ser texto')
    .isLength({ min: 2, max: 50 }).withMessage('La nacionalidad debe tener entre 2 y 50 caracteres'),
  
  body('roomNumber')
    .optional()
    .isString().withMessage('El número de habitación debe ser texto')
    .isLength({ min: 1, max: 10 }).withMessage('El número de habitación debe tener entre 1 y 10 caracteres'),
  
  body('checkInDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Fecha de check-in inválida'),
  
  body('checkOutDate')
    .optional({ nullable: true })
    .isISO8601().withMessage('Fecha de check-out inválida')
    .custom((checkOutDate, { req }) => {
      const { checkInDate } = req.body;
      if (checkInDate && checkOutDate && new Date(checkOutDate) <= new Date(checkInDate)) {
        throw new Error('La fecha de check-out debe ser posterior a la fecha de check-in');
      }
      return true;
    }),
  
  body('notes')
    .optional({ nullable: true })
    .isString().withMessage('Las notas deben ser texto'),
  
  validate
];

/**
 * Validate guest search input
 */
exports.validateGuestSearch = [
  query('query')
    .isString().withMessage('El término de búsqueda debe ser texto')
    .isLength({ min: 3 }).withMessage('El término de búsqueda debe tener al menos 3 caracteres'),
  
  validate
];

/**
 * Validate guest deletion
 */
exports.validateGuestDeletion = [
  param('id')
    .isUUID().withMessage('ID de huésped inválido')
    .custom(async (id) => {
      const guest = await prisma.guest.findUnique({
        where: { id },
        include: { services: true }
      });
      
      if (!guest) {
        throw new Error('Huésped no encontrado');
      }
      
      if (guest.services && guest.services.length > 0) {
        throw new Error('No se puede eliminar un huésped con servicios asociados');
      }
      
      return true;
    }),
  
  validate
];

/**
 * Validate guest by hotel params
 */
exports.validateGuestsByHotel = [
  param('hotelId')
    .isUUID().withMessage('ID de hotel inválido')
    .custom(async (hotelId) => {
      const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId }
      });
      
      if (!hotel) {
        throw new Error('Hotel no encontrado');
      }
      
      return true;
    }),
  
  validate
];

module.exports = exports;