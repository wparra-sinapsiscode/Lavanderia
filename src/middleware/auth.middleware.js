const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Protect routes - Authentication middleware
 * @desc    Verifies the JWT token and adds the user to the request
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado, token no encontrado'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      const user = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'No autorizado, usuario no encontrado'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Usuario desactivado, contacte al administrador'
        });
      }

      // Add user to request
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado, token inválido',
        error: error.message
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error de autenticación',
      error: error.message
    });
  }
};

/**
 * Admin middleware
 * @desc    Checks if user is admin
 */
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'No autorizado, se requieren permisos de administrador'
    });
  }
};

/**
 * Authorize middleware
 * @desc    Checks if user has specified role
 * @param   {Array} roles - Allowed roles
 */
exports.authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `El rol ${req.user.role} no está autorizado para acceder a este recurso`
      });
    }
    next();
  };
};

/**
 * Zone access middleware
 * @desc    Checks if user has access to the specified zone
 * @param   {String} zoneParam - The parameter name that contains the zone
 */
exports.zoneAccess = (zoneParam) => {
  return (req, res, next) => {
    const zone = req.params[zoneParam];
    
    // Admins can access all zones
    if (req.user.role === 'ADMIN') {
      return next();
    }
    
    // Repartidores can only access their assigned zone
    if (req.user.role === 'REPARTIDOR' && req.user.zone !== zone) {
      return res.status(403).json({
        success: false,
        message: `No tienes permiso para acceder a la zona ${zone}`
      });
    }
    
    next();
  };
};