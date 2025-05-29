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
      
      // Fallback to local storage
      try {
        let services = serviceStorage.getServices() || [];
        
        // Apply filters
        if (filters.status) {
          services = services.filter(s => s.status === filters.status);
        }
        
        if (filters.hotelId) {
          services = services.filter(s => s.hotelId === filters.hotelId);
        }
        
        if (filters.zone) {
          services = services.filter(s => s.zone === filters.zone);
        }
        
        if (filters.priority) {
          services = services.filter(s => s.priority === filters.priority);
        }
        
        // Sort by most recent first
        services.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Apply pagination if requested
        let paginatedServices = services;
        if (filters.limit) {
          const offset = filters.offset || 0;
          paginatedServices = services.slice(offset, offset + filters.limit);
        }
        
        return {
          success: true,
          message: 'Services retrieved from local storage',
          data: paginatedServices,
          meta: {
            total: services.length,
            filtered: paginatedServices.length
          }
        };
      } catch (localError) {
        console.error('Local storage get services error:', localError);
        throw error; // Throw original error
      }
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
      
      // Fallback to local storage
      try {
        const services = serviceStorage.getServices() || [];
        const service = services.find(s => s.id === id);
        
        if (!service) {
          throw new Error('Service not found in local storage');
        }
        
        return {
          success: true,
          message: 'Service retrieved from local storage',
          data: service
        };
      } catch (localError) {
        console.error('Local storage get service error:', localError);
        throw error; // Throw original error
      }
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
      
      // Fallback to local storage
      try {
        const newService = {
          ...serviceData,
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          status: SERVICE_STATUS.PENDING_PICKUP
        };
        
        const result = serviceStorage.addService(newService);
        
        if (!result) {
          throw new Error('Failed to add service to local storage');
        }
        
        return {
          success: true,
          message: 'Service created in local storage',
          data: newService
        };
      } catch (localError) {
        console.error('Local storage create service error:', localError);
        throw error; // Throw original error
      }
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
      
      // Fallback to local storage
      try {
        const services = serviceStorage.getServices() || [];
        const serviceIndex = services.findIndex(s => s.id === id);
        
        if (serviceIndex === -1) {
          throw new Error('Service not found in local storage');
        }
        
        const updatedService = {
          ...services[serviceIndex],
          ...pickupData,
          status: SERVICE_STATUS.PICKED_UP,
          pickupDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const result = serviceStorage.updateService(id, updatedService);
        
        if (!result) {
          throw new Error('Failed to update service in local storage');
        }
        
        return {
          success: true,
          message: 'Pickup registered in local storage',
          data: updatedService
        };
      } catch (localError) {
        console.error('Local storage register pickup error:', localError);
        throw error; // Throw original error
      }
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
      
      // Simple fallback calculation - basic algorithm for local use
      try {
        // Default values
        const baseRate = 5.0; // Base rate per kg
        const urgentFee = 1.5; // 50% extra for urgent
        const stainsFee = 1.2; // 20% extra for stains
        
        // Calculate basic price
        let price = weight * baseRate;
        
        // Apply modifiers
        if (options.isUrgent) {
          price *= urgentFee;
        }
        
        if (options.hasStains) {
          price *= stainsFee;
        }
        
        // Round to 2 decimal places
        price = Math.round(price * 100) / 100;
        
        return {
          success: true,
          message: 'Price calculated locally (simplified)',
          data: {
            price,
            breakdown: {
              basePrice: weight * baseRate,
              urgentFee: options.isUrgent ? `${(urgentFee - 1) * 100}%` : '0%',
              stainsFee: options.hasStains ? `${(stainsFee - 1) * 100}%` : '0%',
              weight
            }
          }
        };
      } catch (localError) {
        console.error('Local storage calculate price error:', localError);
        throw error; // Throw original error
      }
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
      
      // Fallback to local storage
      try {
        const services = serviceStorage.getServices() || [];
        const serviceIndex = services.findIndex(s => s.id === id);
        
        if (serviceIndex === -1) {
          throw new Error('Service not found in local storage');
        }
        
        // Validate status is allowed
        const validStatuses = Object.values(SERVICE_STATUS);
        if (statusData.status && !validStatuses.includes(statusData.status)) {
          throw new Error(`Invalid status: ${statusData.status}`);
        }
        
        const updatedService = {
          ...services[serviceIndex],
          ...statusData,
          updatedAt: new Date().toISOString()
        };
        
        const result = serviceStorage.updateService(id, updatedService);
        
        if (!result) {
          throw new Error('Failed to update service status in local storage');
        }
        
        return {
          success: true,
          message: 'Service status updated in local storage',
          data: updatedService
        };
      } catch (localError) {
        console.error('Local storage update service status error:', localError);
        throw error; // Throw original error
      }
    }
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
      
      // Fallback to local storage
      try {
        const services = serviceStorage.getServices() || [];
        const serviceIndex = services.findIndex(s => s.id === id);
        
        if (serviceIndex === -1) {
          throw new Error('Service not found in local storage');
        }
        
        // Validate delivery percentage
        if (!deliveryData.percentage || deliveryData.percentage <= 0 || deliveryData.percentage > 100) {
          throw new Error('Invalid delivery percentage');
        }
        
        const updatedService = {
          ...services[serviceIndex],
          ...deliveryData,
          status: SERVICE_STATUS.PARTIAL_DELIVERY,
          partialDeliveryPercentage: deliveryData.percentage,
          partialDeliveryDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const result = serviceStorage.updateService(id, updatedService);
        
        if (!result) {
          throw new Error('Failed to register partial delivery in local storage');
        }
        
        return {
          success: true,
          message: 'Partial delivery registered in local storage',
          data: updatedService
        };
      } catch (localError) {
        console.error('Local storage register partial delivery error:', localError);
        throw error; // Throw original error
      }
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
      
      // Fallback to local storage
      try {
        const services = serviceStorage.getServices() || [];
        const serviceIndex = services.findIndex(s => s.id === id);
        
        if (serviceIndex === -1) {
          throw new Error('Service not found in local storage');
        }
        
        // Process photo files to base64 strings for local storage
        const photoPromises = Array.from(photos).map(photo => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(photo);
          });
        });
        
        const photoBase64Array = await Promise.all(photoPromises);
        
        // Update service with photos
        const service = services[serviceIndex];
        const updatedPhotos = service.photos || {};
        updatedPhotos[type] = [...(updatedPhotos[type] || []), ...photoBase64Array];
        
        const updatedService = {
          ...service,
          photos: updatedPhotos,
          updatedAt: new Date().toISOString()
        };
        
        const result = serviceStorage.updateService(id, updatedService);
        
        if (!result) {
          throw new Error('Failed to upload photos in local storage');
        }
        
        return {
          success: true,
          message: 'Photos uploaded to local storage',
          data: {
            photoUrls: photoBase64Array
          }
        };
      } catch (localError) {
        console.error('Local storage upload photos error:', localError);
        throw error; // Throw original error
      }
    }
  }
  
  /**
   * Upload signature for a service
   * @param {number} id - Service ID
   * @param {Blob} signatureBlob - Signature blob from SignatureCanvas
   * @param {string} type - Signature type (pickup or delivery)
   * @returns {Promise<Object>} Signature upload result
   */
  async uploadSignature(id, signatureBlob, type = 'pickup') {
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('signature', signatureBlob, 'signature.png');
      
      const response = await api.post(`/services/${id}/signature`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Upload signature error:', error);
      
      // Fallback to local storage
      try {
        const services = serviceStorage.getServices() || [];
        const serviceIndex = services.findIndex(s => s.id === id);
        
        if (serviceIndex === -1) {
          throw new Error('Service not found in local storage');
        }
        
        // Convert signature blob to base64 for storage
        const signatureBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(signatureBlob);
        });
        
        // Update service with signature
        const service = services[serviceIndex];
        const updatedSignatures = service.signatures || {};
        updatedSignatures[type] = signatureBase64;
        
        const updatedService = {
          ...service,
          signatures: updatedSignatures,
          updatedAt: new Date().toISOString()
        };
        
        const result = serviceStorage.updateService(id, updatedService);
        
        if (!result) {
          throw new Error('Failed to upload signature in local storage');
        }
        
        return {
          success: true,
          message: 'Signature uploaded to local storage',
          data: {
            signatureUrl: signatureBase64
          }
        };
      } catch (localError) {
        console.error('Local storage upload signature error:', localError);
        throw error; // Throw original error
      }
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
      
      // Fallback to local storage
      try {
        const services = serviceStorage.getServices() || [];
        
        // Filter pending services
        let pendingServices = services.filter(s => 
          s.status === SERVICE_STATUS.PENDING_PICKUP || 
          s.status === SERVICE_STATUS.PICKED_UP
        );
        
        // Apply zone filter if provided
        if (filters.zone) {
          pendingServices = pendingServices.filter(s => s.zone === filters.zone);
        }
        
        // Sort by priority and creation date
        pendingServices.sort((a, b) => {
          // First sort by priority
          const priorityOrder = { 'ALTA': 0, 'MEDIA': 1, 'NORMAL': 2 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          
          // Then sort by creation date (oldest first)
          return new Date(a.timestamp) - new Date(b.timestamp);
        });
        
        return {
          success: true,
          message: 'Pending services retrieved from local storage',
          data: pendingServices
        };
      } catch (localError) {
        console.error('Local storage get pending services error:', localError);
        throw error; // Throw original error
      }
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
      
      // Fallback to local storage
      try {
        const services = serviceStorage.getServices() || [];
        const serviceIndex = services.findIndex(s => s.id === id);
        
        if (serviceIndex === -1) {
          throw new Error('Service not found in local storage');
        }
        
        const updatedService = {
          ...services[serviceIndex],
          ...deliveryData,
          status: SERVICE_STATUS.COMPLETED,
          deliveryDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const result = serviceStorage.updateService(id, updatedService);
        
        if (!result) {
          throw new Error('Failed to register delivery in local storage');
        }
        
        return {
          success: true,
          message: 'Delivery registered in local storage',
          data: updatedService
        };
      } catch (localError) {
        console.error('Local storage register delivery error:', localError);
        throw error; // Throw original error
      }
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
      const response = await api.get('/services/my-services', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get my services error:', error);
      
      // Fallback to local storage
      try {
        // Get current user from localStorage
        const currentUser = JSON.parse(localStorage.getItem('fumy_limp_user'));
        
        if (!currentUser || !currentUser.id) {
          throw new Error('User not logged in');
        }
        
        const services = serviceStorage.getServices() || [];
        
        // Filter services assigned to current user
        let myServices = services.filter(s => s.repartidorId === currentUser.id);
        
        // Apply status filter if provided
        if (filters.status) {
          myServices = myServices.filter(s => s.status === filters.status);
        }
        
        // Sort by most recent first
        myServices.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return {
          success: true,
          message: 'My services retrieved from local storage',
          data: myServices
        };
      } catch (localError) {
        console.error('Local storage get my services error:', localError);
        throw error; // Throw original error
      }
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