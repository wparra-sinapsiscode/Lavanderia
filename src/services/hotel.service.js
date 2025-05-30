import api from './api';

/**
 * Hotel Service
 * Provides methods for hotel management
 */
class HotelService {
  /**
   * Get all hotels with optional filtering
   * @param {Object} filters - Optional filter parameters
   * @param {string} filters.zone - Filter by zone
   * @returns {Promise<Object>} Hotels data
   */
  async getAllHotels(filters = {}) {
    try {
      const response = await api.get('/hotels', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get hotels error:', error);
      throw error;
    }
  }
  
  /**
   * Get a specific hotel by ID
   * @param {number} id - Hotel ID
   * @returns {Promise<Object>} Hotel data
   */
  async getHotelById(id) {
    try {
      const response = await api.get(`/hotels/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get hotel error:', error);
      throw error;
    }
  }
  
  /**
   * Check if a hotel can be deleted
   * @param {string} id - Hotel ID
   * @returns {Promise<Object>} Result with canDelete flag and dependencies
   */
  async checkHotelDependencies(id) {
    try {
      const response = await api.get(`/hotels/${id}/dependencies`);
      return response.data;
    } catch (error) {
      console.error('Check hotel dependencies error:', error);
      throw error;
    }
  }
  
  /**
   * Delete a hotel
   * @param {string} id - Hotel ID
   * @returns {Promise<Object>} Result of deletion
   */
  async deleteHotel(id) {
    try {
      const response = await api.delete(`/hotels/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete hotel error:', error);
      throw error;
    }
  }
  
  /**
   * Create a new hotel (admin only)
   * @param {Object} hotelData - Hotel data
   * @returns {Promise<Object>} Created hotel
   */
  async createHotel(hotelData) {
    try {
      const response = await api.post('/hotels', hotelData);
      return response.data;
    } catch (error) {
      console.error('Create hotel error:', error);
      throw error;
    }
  }
  
  /**
   * Update a hotel (admin only)
   * @param {number} id - Hotel ID
   * @param {Object} hotelData - Updated hotel data
   * @returns {Promise<Object>} Updated hotel
   */
  async updateHotel(id, hotelData) {
    try {
      console.log(`Enviando actualización de hotel a la API: Hotel ${id}, Datos:`, hotelData);
      
      // Asegurar que bagInventory sea un número si está presente
      const dataToSend = { ...hotelData };
      if (dataToSend.bagInventory !== undefined) {
        dataToSend.bagInventory = parseInt(dataToSend.bagInventory) || 0;
      }
      
      const response = await api.put(`/hotels/${id}`, dataToSend);
      return response.data;
    } catch (error) {
      console.error('Update hotel error:', error);
      throw error;
    }
  }
  
  /**
   * Update hotel bag inventory
   * @param {number} id - Hotel ID
   * @param {Object} inventoryData - Inventory data
   * @param {number} inventoryData.bagInventory - New total inventory amount
   * @param {string} inventoryData.notes - Notes about the inventory change (optional)
   * @returns {Promise<Object>} Updated inventory
   */
  async updateInventory(id, inventoryData) {
    try {
      console.log(`Enviando actualización de inventario a la API: Hotel ${id}, Datos:`, inventoryData);
      
      // Asegurar que bagInventory sea un número
      const dataToSend = {
        ...inventoryData,
        bagInventory: parseInt(inventoryData.bagInventory) || 0
      };
      
      const response = await api.put(`/hotels/${id}/inventory`, dataToSend);
      return response.data;
    } catch (error) {
      console.error('Update inventory error:', error);
      throw error;
    }
  }
  
  /**
   * Get services for a specific hotel
   * @param {number} id - Hotel ID
   * @param {Object} filters - Optional filter parameters
   * @param {string} filters.status - Filter by service status
   * @param {string} filters.startDate - Filter by start date
   * @param {string} filters.endDate - Filter by end date
   * @returns {Promise<Object>} Services data
   */
  async getHotelServices(id, filters = {}) {
    try {
      const response = await api.get(`/hotels/${id}/services`, { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get hotel services error:', error);
      throw error;
    }
  }
  
  /**
   * Get hotels by zone
   * @param {string} zone - Zone name
   * @returns {Promise<Object>} Hotels data
   */
  async getHotelsByZone(zone) {
    try {
      const response = await api.get(`/hotels/by-zone/${zone}`);
      return response.data;
    } catch (error) {
      console.error('Get hotels by zone error:', error);
      throw error;
    }
  }
  
  /**
   * Check if hotel has low inventory
   * @param {Object} hotel - Hotel object
   * @returns {boolean} Is inventory low
   */
  isLowInventory(hotel) {
    return hotel.bagInventory <= hotel.inventoryThreshold;
  }
  
  /**
   * Calculate inventory status message
   * @param {Object} hotel - Hotel object
   * @returns {Object} Status info with message and severity
   */
  getInventoryStatus(hotel) {
    if (!hotel) return { message: 'No hay información', severity: 'info' };
    
    if (hotel.bagInventory <= 0) {
      return {
        message: 'Inventario agotado',
        severity: 'error'
      };
    } else if (hotel.bagInventory <= hotel.inventoryThreshold / 2) {
      return {
        message: 'Inventario crítico',
        severity: 'error'
      };
    } else if (hotel.bagInventory <= hotel.inventoryThreshold) {
      return {
        message: 'Inventario bajo',
        severity: 'warning'
      };
    } else {
      return {
        message: 'Inventario disponible',
        severity: 'success'
      };
    }
  }
}

export default new HotelService();