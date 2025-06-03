import api from './api';
import { serviceStorage } from '../utils/storage';
import { SERVICE_STATUS } from '../types';

/**
 * Service Service
 * Provides methods for laundry service management
 */
class ServiceService {
  /**
   * Get all services with optional filtering
   * @param {Object} filters - Optional filter parameters
   * @param {string} filters.status - Filter by status
   * @param {number} filters.hotelId - Filter by hotel ID
   * @param {string} filters.zone - Filter by zone
   * @param {string} filters.priority - Filter by priority
   * @param {number} filters.limit - Limit number of results
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Object>} Services data
   */
  async getAllServices(filters = {}) {
    try {
      const response = await api.get('/services', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get services error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al obtener servicios',
        error
      };
    }
  }
  
  /**
   * Get a specific service by ID
   * @param {number} id - Service ID
   * @returns {Promise<Object>} Service data
   */
  async getServiceById(id) {
    try {
      const response = await api.get(`/services/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get service error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al obtener servicio',
        error
      };
    }
  }
  
  /**
   * Create a new service
   * @param {Object} serviceData - Service data
   * @returns {Promise<Object>} Created service
   */
  async createService(serviceData) {
    try {
      const response = await api.post('/services', serviceData);
      return response.data;
    } catch (error) {
      console.error('Create service error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al crear servicio',
        error
      };
    }
  }
  
  /**
   * Create a hotel service without specific guest information
   * @param {Object} serviceData - Service data
   * @param {string} serviceData.hotelId - Hotel ID
   * @param {string} serviceData.repartidorId - Repartidor ID (optional)
   * @param {number} serviceData.bagCount - Number of bags
   * @param {string} serviceData.priority - Priority (ALTA, NORMAL, BAJA)
   * @param {string} serviceData.specialInstructions - Special instructions
   * @param {boolean} serviceData.isHotelService - Flag indicating this is a hotel service
   * @returns {Promise<Object>} Created service
   */
  async createHotelService(serviceData) {
    try {
      // Endpoint específico para servicios de hotel sin huésped
      const response = await api.post('/services/hotel', serviceData);
      return response.data;
    } catch (error) {
      console.error('Create hotel service error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al crear servicio para hotel',
        error
      };
    }
  }
  
  /**
   * Register pickup for a service
   * @param {number} id - Service ID
   * @param {Object} pickupData - Pickup data
   * @returns {Promise<Object>} Updated service
   */
  async registerPickup(id, pickupData) {
    try {
      const response = await api.put(`/services/${id}/pickup`, pickupData);
      return response.data;
    } catch (error) {
      console.error('Register pickup error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al registrar recogida',
        error
      };
    }
  }

  /**
   * Upload photos for a service
   * @param {string} serviceId - Service ID
   * @param {File[]} photos - Array of photo files
   * @param {string} type - Type of photos (pickup, labeling, delivery)
   * @returns {Promise<Object>} Upload result
   */
  async uploadServicePhotos(serviceId, photos, type = 'pickup') {
    try {
      const formData = new FormData();
      photos.forEach(photo => {
        formData.append('photos', photo);
      });
      formData.append('type', type);

      const response = await api.post(`/services/${serviceId}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Upload photos error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al subir fotos',
        error
      };
    }
  }

  /**
   * Upload signature for a service
   * @param {string} serviceId - Service ID
   * @param {string|Blob} signature - Signature data (base64 or blob)
   * @param {string} type - Type of signature (pickup, delivery)
   * @returns {Promise<Object>} Upload result
   */
  async uploadSignature(serviceId, signature, type = 'pickup') {
    try {
      const formData = new FormData();
      
      // If signature is a blob, append it directly
      if (signature instanceof Blob) {
        formData.append('signature', signature, 'signature.png');
      } else if (typeof signature === 'string' && signature.startsWith('data:image')) {
        // If it's base64, convert to blob first
        const response = await fetch(signature);
        const blob = await response.blob();
        formData.append('signature', blob, 'signature.png');
      } else {
        throw new Error('Invalid signature format');
      }
      
      formData.append('type', type);

      const response = await api.post(`/services/${serviceId}/signature`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Upload signature error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al subir firma',
        error
      };
    }
  }
  
  /**
   * Calculate service price based on weight and service options
   * @param {number} weight - Weight in kg
   * @param {Object} options - Service options
   * @param {number} options.hotelId - Hotel ID for base price
   * @param {boolean} options.isUrgent - Whether service is urgent
   * @param {boolean} options.hasStains - Whether service has stains
   * @param {string} options.serviceType - Service type
   * @returns {Promise<Object>} Price calculation result
   */
  async calculatePrice(weight, options = {}) {
    try {
      const response = await api.post('/services/calculate-price', {
        weight,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Calculate price error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al calcular precio',
        error
      };
    }
  }
  
  /**
   * Update service data
   * @param {number} id - Service ID
   * @param {Object} serviceData - Service data to update
   * @returns {Promise<Object>} Updated service
   */
  async updateService(id, serviceData) {
    try {
      const response = await api.put(`/services/${id}`, serviceData);
      return response.data;
    } catch (error) {
      console.error('Update service error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al actualizar servicio',
        error
      };
    }
  }

  /**
   * Update service status
   * @param {number} id - Service ID
   * @param {Object} statusData - Status data
   * @param {string} statusData.status - New status
   * @param {string} statusData.notes - Optional notes
   * @returns {Promise<Object>} Updated service
   */
  async updateServiceStatus(id, statusData) {
    try {
      const response = await api.put(`/services/${id}/status`, statusData);
      return response.data;
    } catch (error) {
      console.error('Update service status error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al actualizar estado del servicio',
        error
      };
    }
  }

  /**
   * Update service in route
   * @param {number} id - Service ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated service
   */
  async updateServiceInRoute(id, updateData) {
    return this.updateServiceStatus(id, updateData);
  }
  
  /**
   * Register partial delivery
   * @param {number} id - Service ID
   * @param {Object} deliveryData - Delivery data
   * @param {number} deliveryData.percentage - Delivery percentage
   * @param {string} deliveryData.signature - Customer signature
   * @param {string} deliveryData.notes - Optional notes
   * @returns {Promise<Object>} Updated service
   */
  async registerPartialDelivery(id, deliveryData) {
    try {
      const response = await api.put(`/services/${id}/partial-delivery`, deliveryData);
      return response.data;
    } catch (error) {
      console.error('Register partial delivery error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al registrar entrega parcial',
        error
      };
    }
  }
  
  /**
   * Upload photos for a service
   * @param {number} id - Service ID
   * @param {Array} photos - Array of photo files
   * @param {string} type - Photo type (pickup, process, delivery, damaged)
   * @returns {Promise<Object>} Photo upload result
   */
  async uploadServicePhotos(id, photos, type = 'pickup') {
    try {
      const formData = new FormData();
      formData.append('type', type);
      
      photos.forEach((photo, index) => {
        formData.append('photos', photo);
      });
      
      const response = await api.post(`/services/${id}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Upload service photos error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al subir fotos',
        error
      };
    }
  }
  
  
  /**
   * Get pending services
   * @param {Object} filters - Optional filter parameters
   * @param {string} filters.zone - Filter by zone
   * @returns {Promise<Object>} Pending services data
   */
  async getPendingServices(filters = {}) {
    try {
      const response = await api.get('/services/pending', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get pending services error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al obtener servicios pendientes',
        error
      };
    }
  }
  
  /**
   * Register complete delivery
   * @param {number} id - Service ID
   * @param {Object} deliveryData - Delivery data
   * @returns {Promise<Object>} Updated service
   */
  async registerDelivery(id, deliveryData) {
    try {
      const response = await api.put(`/services/${id}/delivery`, deliveryData);
      return response.data;
    } catch (error) {
      console.error('Register delivery error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al registrar entrega',
        error
      };
    }
  }
  
  /**
   * Update service status during a route
   * @param {number} id - Service ID
   * @param {string} routeId - Route ID
   * @param {number} hotelIndex - Hotel index in the route
   * @param {Object} updateData - Status update data
   * @returns {Promise<Object>} Updated service and route
   */
  async updateServiceInRoute(id, routeId, hotelIndex, updateData) {
    try {
      const response = await api.put(`/services/${id}/route-update`, {
        routeId,
        hotelIndex,
        updatedData: updateData
      });
      return response.data;
    } catch (error) {
      console.error('Update service in route error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al actualizar servicio en ruta',
        error
      };
    }
  }
  
  /**
   * Get services assigned to current user
   * @param {Object} filters - Optional filter parameters
   * @param {string} filters.status - Filter by status
   * @returns {Promise<Object>} Assigned services
   */
  async getMyServices(filters = {}) {
    try {
      // Controlar errores del backend marcando con una variable
      // Este valor lo usamos para evitar reintentos innecesarios
      // durante un período de tiempo
      if (this._backendError && Date.now() - this._lastErrorTime < 60000) {
        // Si tuvimos un error hace menos de 1 minuto, vamos directo al fallback local
        console.log('Omitiendo petición al backend por error reciente');
        throw new Error('Omitiendo backend (error reciente)');
      }
      
      // Para evitar el error 500, no enviamos el parámetro de zona al backend
      // ya que el backend ya filtra por el usuario autenticado
      const paramsToSend = { ...filters };
      delete paramsToSend.zone; // Eliminar zone para evitar errores
      
      try {
        // Primer intento con la ruta recomendada
        const response = await api.get('/services/repartidor', { params: paramsToSend });
        
        // Si llega aquí, todo bien
        this._backendError = false;
        return response.data;
      } catch (firstError) {
        // Si el error es 404, intentar con la ruta alternativa
        if (firstError.response && firstError.response.status === 404) {
          try {
            // Segundo intento con la ruta original
            const response = await api.get('/services/my-services', { params: paramsToSend });
            
            // Si llega aquí, todo bien con la ruta alternativa
            this._backendError = false;
            return response.data;
          } catch (secondError) {
            // Ambos intentos fallaron, registramos el error
            this._backendError = true;
            this._lastErrorTime = Date.now();
            console.error('Both API attempts failed:', secondError);
            throw secondError;
          }
        } else {
          // No fue 404, registrar error y continuar al fallback
          this._backendError = true;
          this._lastErrorTime = Date.now();
          throw firstError;
        }
      }
    } catch (error) {
      console.error('Get my services error:', error);
      
      // Usar almacenamiento local como fallback
      const { userStorage, serviceStorage } = await import('../utils/storage');
      const user = userStorage.getUser();
      
      if (user) {
        let filteredServices = [];
        
        if (user.role === 'REPARTIDOR') {
          // Con el nuevo enfoque basado en zona, el repartidor debe ver:
          // 1. Servicios específicamente asignados a él
          const assignedServices = serviceStorage.getServicesByRepartidor(user.id);
          
          // 2. Servicios de su zona que no tienen repartidor asignado y están pendientes de recojo
          const zoneServices = serviceStorage.getServicesByZone(user.zone);
          const unassignedZoneServices = zoneServices.filter(s => 
            !s.repartidorId && s.status === SERVICE_STATUS.PENDING_PICKUP
          );
          
          // Combinar ambos conjuntos sin duplicados
          const serviceMap = new Map();
          
          // Primero añadir los asignados específicamente
          assignedServices.forEach(service => {
            serviceMap.set(service.id, service);
          });
          
          // Luego añadir los no asignados de la zona
          unassignedZoneServices.forEach(service => {
            if (!serviceMap.has(service.id)) {
              serviceMap.set(service.id, service);
            }
          });
          
          // Convertir el mapa a array
          filteredServices = Array.from(serviceMap.values());
        } else {
          // Para administradores y otros roles, mostrar todos los servicios
          filteredServices = serviceStorage.getServices();
        }
        
        // Aplicar filtros adicionales si se proporcionan
        if (filters.status) {
          filteredServices = filteredServices.filter(s => s.status === filters.status);
        }
        
        console.log(`Fallback local: ${filteredServices.length} servicios encontrados para el usuario ${user.name} (zona: ${user.zone || 'N/A'})`);
        
        return {
          success: true,
          message: 'Datos obtenidos del almacenamiento local',
          data: filteredServices
        };
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Error al obtener mis servicios',
        error
      };
    }
  }
  
  /**
   * Get status display info
   * @param {string} status - Service status
   * @returns {Object} Status display info with label, color, and icon
   */
  getStatusInfo(status) {
    switch (status) {
      case 'PENDING_PICKUP':
        return {
          label: 'Pendiente Recogida',
          color: 'blue',
          icon: 'hourglass_empty'
        };
      case 'PICKED_UP':
        return {
          label: 'Recogido',
          color: 'purple',
          icon: 'shopping_bag'
        };
      case 'LABELED':
        return {
          label: 'Rotulado',
          color: 'indigo',
          icon: 'label'
        };
      case 'IN_PROCESS':
        return {
          label: 'En proceso',
          color: 'orange',
          icon: 'local_laundry_service'
        };
      case 'PARTIAL_DELIVERY':
        return {
          label: 'Entrega parcial',
          color: 'teal',
          icon: 'splitscreen'
        };
      case 'COMPLETED':
        return {
          label: 'Completado',
          color: 'green',
          icon: 'task_alt'
        };
      case 'CANCELLED':
        return {
          label: 'Cancelado',
          color: 'red',
          icon: 'cancel'
        };
      default:
        return {
          label: 'Desconocido',
          color: 'gray',
          icon: 'help'
        };
    }
  }
  
  /**
   * Get priority display info
   * @param {string} priority - Service priority
   * @returns {Object} Priority display info with label and color
   */
  getPriorityInfo(priority) {
    switch (priority) {
      case 'ALTA':
        return {
          label: 'Alta',
          color: 'red'
        };
      case 'MEDIA':
        return {
          label: 'Media',
          color: 'orange'
        };
      case 'NORMAL':
        return {
          label: 'Normal',
          color: 'blue'
        };
      default:
        return {
          label: 'Normal',
          color: 'blue'
        };
    }
  }
  
  /**
   * Format price for display
   * @param {number} price - Price value
   * @returns {string} Formatted price
   */
  formatPrice(price) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price || 0);
  }
}

export default new ServiceService();