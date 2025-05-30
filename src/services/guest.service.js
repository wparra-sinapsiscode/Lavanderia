import api from './api';
import { serviceStorage, hotelStorage, guestStorage } from '../utils/storage';

/**
 * Guest Service
 * Provides methods for guest management
 */
class GuestService {
  /**
   * Get all guests with optional filtering
   * @param {Object} filters - Optional filter parameters
   * @param {number} filters.hotelId - Filter by hotel ID
   * @param {boolean} filters.isActive - Filter by active status
   * @param {number} filters.limit - Limit number of results
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Object>} Guests data
   */
  async getAllGuests(filters = {}) {
    try {
      const response = await api.get('/guests', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get guests error:', error);
      
      // Fallback to local storage
      try {
        let guests = guestStorage.getGuests() || [];
        
        // Apply filters
        if (filters.hotelId) {
          guests = guests.filter(g => g.hotelId === filters.hotelId);
        }
        
        if (filters.limit) {
          guests = guests.slice(0, filters.limit);
        }
        
        return {
          success: true,
          message: 'Guests retrieved from local storage',
          data: guests
        };
      } catch (localError) {
        console.error('Local storage get guests error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get a specific guest by ID
   * @param {number} id - Guest ID
   * @returns {Promise<Object>} Guest data
   */
  async getGuestById(id) {
    try {
      const response = await api.get(`/guests/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get guest error:', error);
      
      // Fallback to local storage
      try {
        const guests = guestStorage.getGuests() || [];
        const guest = guests.find(g => g.id === id);
        
        if (!guest) {
          throw new Error('Guest not found in local storage');
        }
        
        return {
          success: true,
          message: 'Guest retrieved from local storage',
          data: guest
        };
      } catch (localError) {
        console.error('Local storage get guest error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Register a new guest
   * @param {Object} guestData - Guest data
   * @returns {Promise<Object>} Created guest
   */
  async registerGuest(guestData) {
    try {
      const response = await api.post('/guests', guestData);
      return response.data;
    } catch (error) {
      console.error('Register guest error:', error);
      
      // Fallback to local storage
      try {
        const newGuest = {
          id: Date.now().toString(),
          ...guestData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const guests = guestStorage.getGuests() || [];
        guests.push(newGuest);
        guestStorage.setGuests(guests);
        
        return {
          success: true,
          message: 'Guest registered successfully (local storage)',
          data: newGuest
        };
      } catch (localError) {
        console.error('Local storage guest registration error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Update guest information
   * @param {number} id - Guest ID
   * @param {Object} guestData - Updated guest data
   * @returns {Promise<Object>} Updated guest
   */
  async updateGuest(id, guestData) {
    try {
      const response = await api.put(`/guests/${id}`, guestData);
      return response.data;
    } catch (error) {
      console.error('Update guest error:', error);
      
      // Fallback to local storage
      try {
        const guests = guestStorage.getGuests() || [];
        const guestIndex = guests.findIndex(g => g.id === id);
        
        if (guestIndex === -1) {
          throw new Error('Guest not found in local storage');
        }
        
        const updatedGuest = {
          ...guests[guestIndex],
          ...guestData,
          updatedAt: new Date().toISOString()
        };
        
        guests[guestIndex] = updatedGuest;
        guestStorage.setGuests(guests);
        
        return {
          success: true,
          message: 'Guest updated successfully (local storage)',
          data: updatedGuest
        };
      } catch (localError) {
        console.error('Local storage update guest error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Delete a guest (soft delete)
   * @param {number} id - Guest ID
   * @returns {Promise<Object>} Result message
   */
  async deleteGuest(id) {
    try {
      const response = await api.delete(`/guests/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete guest error:', error);
      
      // Fallback to local storage
      try {
        const guests = guestStorage.getGuests() || [];
        const guestIndex = guests.findIndex(g => g.id === id);
        
        if (guestIndex === -1) {
          throw new Error('Guest not found in local storage');
        }
        
        // Soft delete by marking as inactive
        guests[guestIndex] = {
          ...guests[guestIndex],
          isActive: false,
          updatedAt: new Date().toISOString()
        };
        
        guestStorage.setGuests(guests);
        
        return {
          success: true,
          message: 'Guest deleted successfully (local storage)',
          data: null
        };
      } catch (localError) {
        console.error('Local storage delete guest error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get service history for a guest
   * @param {number} id - Guest ID
   * @returns {Promise<Object>} Guest service history
   */
  async getGuestServices(id) {
    try {
      const response = await api.get(`/guests/${id}/services`);
      return response.data;
    } catch (error) {
      console.error('Get guest services error:', error);
      
      // Fallback to local storage
      try {
        const services = serviceStorage.getServices() || [];
        const guestServices = services.filter(s => s.guestId === id);
        
        return {
          success: true,
          message: 'Guest services retrieved from local storage',
          data: guestServices
        };
      } catch (localError) {
        console.error('Local storage get guest services error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get checkout report for a guest
   * @param {number} id - Guest ID
   * @returns {Promise<Object>} Guest checkout report
   */
  async getCheckoutReport(id) {
    try {
      const response = await api.get(`/guests/${id}/checkout-report`);
      return response.data;
    } catch (error) {
      console.error('Get checkout report error:', error);
      
      // Fallback to local storage - generate a simple report
      try {
        const services = serviceStorage.getServices() || [];
        const guestServices = services.filter(s => s.guestId === id);
        
        // Calculate totals
        const totalServices = guestServices.length;
        const completedServices = guestServices.filter(s => s.status === 'COMPLETED').length;
        const pendingServices = totalServices - completedServices;
        const totalAmount = guestServices.reduce((sum, s) => sum + (s.price || 0), 0);
        
        return {
          success: true,
          message: 'Checkout report generated from local storage',
          data: {
            totalServices,
            completedServices,
            pendingServices,
            totalAmount,
            services: guestServices
          }
        };
      } catch (localError) {
        console.error('Local storage get checkout report error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get guests for a specific hotel
   * @param {number} hotelId - Hotel ID
   * @param {Object} filters - Optional filter parameters
   * @param {boolean} filters.isActive - Filter by active status
   * @param {number} filters.limit - Limit number of results
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Object>} Hotel guests
   */
  async getGuestsByHotel(hotelId, filters = {}) {
    try {
      const response = await api.get(`/guests/by-hotel/${hotelId}`, { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get hotel guests error:', error);
      
      // Fallback to local storage
      try {
        let guests = guestStorage.getGuests() || [];
        guests = guests.filter(g => g.hotelId === hotelId);
        
        // Apply filters
        if (filters.isActive === true) {
          guests = guests.filter(g => g.isActive !== false);
        } else if (filters.isActive === false) {
          guests = guests.filter(g => g.isActive === false);
        }
        
        // Apply pagination
        if (filters.offset && filters.limit) {
          guests = guests.slice(filters.offset, filters.offset + filters.limit);
        } else if (filters.limit) {
          guests = guests.slice(0, filters.limit);
        }
        
        return {
          success: true,
          message: 'Hotel guests retrieved from local storage',
          data: guests
        };
      } catch (localError) {
        console.error('Local storage get hotel guests error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Search guests by name, email, phone or ID
   * @param {string} query - Search query
   * @param {Object} filters - Optional filter parameters
   * @param {number} filters.hotelId - Filter by hotel ID
   * @param {boolean} filters.isActive - Filter by active status
   * @param {number} filters.limit - Limit number of results
   * @returns {Promise<Object>} Search results
   */
  async searchGuests(query, filters = {}) {
    try {
      const params = {
        query,
        ...filters
      };
      
      const response = await api.get('/guests/search', { params });
      return response.data;
    } catch (error) {
      console.error('Search guests error:', error);
      
      // Fallback to local storage
      try {
        let guests = guestStorage.getGuests() || [];
        
        // Filter by hotel if specified
        if (filters.hotelId) {
          guests = guests.filter(g => g.hotelId === filters.hotelId);
        }
        
        // Filter by active status if specified
        if (filters.isActive === true) {
          guests = guests.filter(g => g.isActive !== false);
        } else if (filters.isActive === false) {
          guests = guests.filter(g => g.isActive === false);
        }
        
        // Search by name, email, phone or ID
        if (query) {
          const lowerQuery = query.toLowerCase();
          guests = guests.filter(g => 
            (g.name && g.name.toLowerCase().includes(lowerQuery)) || 
            (g.email && g.email.toLowerCase().includes(lowerQuery)) || 
            (g.phone && g.phone.includes(query)) || 
            (g.roomNumber && g.roomNumber.includes(query)) ||
            (g.id && g.id.includes(query))
          );
        }
        
        // Apply limit if specified
        if (filters.limit) {
          guests = guests.slice(0, filters.limit);
        }
        
        return {
          success: true,
          message: 'Search results from local storage',
          data: guests
        };
      } catch (localError) {
        console.error('Local storage search guests error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Validate hotel inventory for bag count
   * @param {string} hotelId - Hotel ID
   * @param {number} bagCount - Number of bags to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateInventory(hotelId, bagCount) {
    try {
      // Asegurar que el hotelId sea un string
      const hotelIdStr = String(hotelId).trim();
      
      // Asegurar que bagCount sea un número entero positivo
      const bagCountInt = parseInt(bagCount, 10);
      
      if (isNaN(bagCountInt) || bagCountInt <= 0) {
        throw new Error('La cantidad de bolsas debe ser un número entero positivo');
      }
      
      console.log('Validando inventario:', {
        hotelId: hotelIdStr,
        bagCount: bagCountInt
      });
      
      const response = await api.get('/guests/validate-inventory', {
        params: { 
          hotelId: hotelIdStr, 
          bagCount: bagCountInt 
        }
      });
      
      console.log('Respuesta de validación de inventario:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error de validación de inventario:', error);
      
      if (error.response && error.response.data) {
        console.error('Detalles del error:', error.response.data);
        return error.response.data;
      }
      
      // Crear una respuesta de error estándar
      return {
        success: false,
        message: error.message || 'Error al validar inventario',
        data: null
      };
    }
  }
  
  /**
   * Register guest and create service in one step
   * @param {Object} guestData - Guest data
   * @returns {Promise<Object>} Created guest and service
   */
  async registerGuestWithService(guestData) {
    try {
      // Normalizar y validar datos antes de enviar
      const normalizedData = {
        // Convertir string a mayúsculas si es necesario
        guestName: String(guestData.guestName || '').trim(),
        roomNumber: String(guestData.roomNumber || '').trim(),
        hotelId: String(guestData.hotelId || '').trim(),
        // Convertir a números
        bagCount: parseInt(guestData.bagCount, 10),
        // Otros campos
        observations: String(guestData.observations || '').trim(),
        specialInstructions: String(guestData.specialInstructions || '').trim(),
        estimatedPickupDate: guestData.estimatedPickupDate,
        // Asegurar que el repartidorId sea un string
        repartidorId: guestData.repartidorId ? String(guestData.repartidorId).trim() : null,
        // Convertir priority a mayúsculas para que coincida con las constantes del backend
        priority: String(guestData.priority || 'NORMAL').toUpperCase(),
        pickupTimeSlot: String(guestData.pickupTimeSlot || '').trim()
      };
      
      // Registro de diagnóstico
      console.log('Enviando datos normalizados al backend:', normalizedData);
      
      const response = await api.post('/guests/register', normalizedData);
      console.log('Respuesta de registro con servicio:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error al registrar huésped con servicio:', error);
      
      // Registrar detalles del error
      if (error.response && error.response.data) {
        console.error('Detalles del error del servidor:', error.response.data);
        return error.response.data;
      }
      
      // Crear una respuesta de error estándar
      return {
        success: false,
        message: error.message || 'Error al registrar huésped con servicio',
        error: error.toString(),
        data: null
      };
    }
  }
  
  /**
   * Format guest display name
   * @param {Object} guest - Guest object
   * @returns {string} Formatted display name
   */
  formatGuestName(guest) {
    if (!guest) return '';
    
    let name = guest.name;
    
    if (guest.roomNumber) {
      name += ` (${guest.roomNumber})`;
    }
    
    return name;
  }
  
  /**
   * Get ID type display info
   * @param {string} idType - ID type
   * @returns {string} Human readable ID type
   */
  formatIdType(idType) {
    switch (idType) {
      case 'PASSPORT':
        return 'Pasaporte';
      case 'NATIONAL_ID':
        return 'Identificación Nacional';
      case 'DRIVERS_LICENSE':
        return 'Licencia de conducir';
      case 'OTHER':
        return 'Otro';
      default:
        return idType || 'No especificado';
    }
  }
  
  /**
   * Format date for display
   * @param {string} date - Date string
   * @param {boolean} includeTime - Whether to include time
   * @returns {string} Formatted date
   */
  formatDate(date, includeTime = false) {
    if (!date) return '';
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
    };
    
    return new Date(date).toLocaleDateString('es-MX', options);
  }
  
  /**
   * Calculate stay duration
   * @param {Object} guest - Guest object
   * @returns {Object} Stay duration info
   */
  calculateStayDuration(guest) {
    if (!guest || !guest.checkInDate) return { days: 0, text: 'N/A' };
    
    const checkIn = new Date(guest.checkInDate);
    const checkOut = guest.checkOutDate ? new Date(guest.checkOutDate) : new Date();
    
    // Calculate difference in days
    const diffTime = Math.abs(checkOut - checkIn);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      days: diffDays,
      text: `${diffDays} día${diffDays !== 1 ? 's' : ''}`
    };
  }
}

export default new GuestService();