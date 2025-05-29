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
   * @param {number} hotelId - Hotel ID
   * @param {number} bagCount - Number of bags to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateInventory(hotelId, bagCount) {
    try {
      const response = await api.get('/guests/validate-inventory', {
        params: { hotelId, bagCount }
      });
      return response.data;
    } catch (error) {
      console.error('Validate inventory error:', error);
      
      // Fallback to local storage
      try {
        const hotels = hotelStorage.getHotels() || [];
        const hotel = hotels.find(h => h.id === hotelId);
        
        if (!hotel) {
          throw new Error('Hotel not found in local storage');
        }
        
        const isValid = hotel.bagInventory >= bagCount;
        
        return {
          success: true,
          message: isValid ? 
            'Inventory validated successfully (local storage)' : 
            'Not enough bags in inventory (local storage)',
          data: {
            isValid,
            available: hotel.bagInventory,
            required: bagCount
          }
        };
      } catch (localError) {
        console.error('Local storage validate inventory error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Register guest and create service in one step
   * @param {Object} guestData - Guest data
   * @returns {Promise<Object>} Created guest and service
   */
  async registerGuestWithService(guestData) {
    try {
      const response = await api.post('/guests/register-with-service', guestData);
      return response.data;
    } catch (error) {
      console.error('Register guest with service error:', error);
      
      // Fallback to local storage
      try {
        // First create guest
        const guestId = Date.now().toString();
        const newGuest = {
          id: guestId,
          name: guestData.guestName,
          roomNumber: guestData.roomNumber,
          hotelId: guestData.hotelId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const guests = guestStorage.getGuests() || [];
        guests.push(newGuest);
        guestStorage.setGuests(guests);
        
        // Then create service
        const serviceId = (Date.now() + 1).toString();
        const newService = {
          id: serviceId,
          guestId,
          guestName: guestData.guestName,
          roomNumber: guestData.roomNumber,
          hotelId: guestData.hotelId,
          bagCount: guestData.bagCount,
          observations: guestData.observations,
          specialInstructions: guestData.specialInstructions,
          estimatedPickupDate: guestData.estimatedPickupDate || new Date().toISOString(),
          status: 'PENDING_PICKUP',
          priority: guestData.priority || 'NORMAL',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const services = serviceStorage.getServices() || [];
        services.push(newService);
        serviceStorage.setServices(services);
        
        // Update hotel inventory
        const hotels = hotelStorage.getHotels() || [];
        const hotelIndex = hotels.findIndex(h => h.id === guestData.hotelId);
        
        if (hotelIndex !== -1) {
          hotels[hotelIndex] = {
            ...hotels[hotelIndex],
            bagInventory: hotels[hotelIndex].bagInventory - guestData.bagCount
          };
          hotelStorage.setHotels(hotels);
        }
        
        return {
          success: true,
          message: 'Guest and service registered successfully (local storage)',
          data: {
            guest: newGuest,
            service: newService
          }
        };
      } catch (localError) {
        console.error('Local storage guest+service registration error:', localError);
        throw localError;
      }
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