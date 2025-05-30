import api from './api';

/**
 * User Service
 * Provides methods for user management
 */
class UserService {
  /**
   * Get all users (admin only)
   * @param {Object} filters - Optional filters (role, zone, active)
   * @returns {Promise<Array>} List of users
   */
  async getUsers(filters = {}) {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (filters.role) queryParams.append('role', filters.role);
      if (filters.zone) queryParams.append('zone', filters.zone);
      if (filters.active !== undefined) queryParams.append('active', filters.active);
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.offset) queryParams.append('offset', filters.offset);
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `/users?${queryString}` : '/users';
      
      console.log('Solicitando usuarios al endpoint:', endpoint);
      console.log('Token usado:', sessionStorage.getItem('accessToken'));
      
      const response = await api.get(endpoint);
      console.log('Respuesta de usuarios:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }
  
  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object>} User data
   */
  async getUserById(id) {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }
  
  /**
   * Create a new user (admin only)
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    try {
      // Asegurar que el rol esté en formato correcto (MAYÚSCULAS)
      if (userData.role) {
        userData.role = userData.role.toUpperCase();
      }
      
      // Log de datos enviados para diagnóstico
      console.log('Datos enviados al registrar usuario:', userData);
      
      // Use the register endpoint from auth controller
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      // Mostrar detalles específicos del error
      if (error.response && error.response.data) {
        console.error('Detalles del error:', error.response.data);
      }
      throw error;
    }
  }
  
  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(id, userData) {
    try {
      // Asegurar que el rol esté en formato correcto (MAYÚSCULAS)
      if (userData.role) {
        userData.role = userData.role.toUpperCase();
      }
      
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
  
  /**
   * Delete user (soft delete)
   * @param {string} id - User ID
   * @returns {Promise<Object>} Result
   */
  async deleteUser(id) {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
  
  /**
   * Change user password
   * @param {string} id - User ID
   * @param {Object} passwordData - Password data
   * @returns {Promise<Object>} Result
   */
  async changePassword(id, passwordData) {
    try {
      const response = await api.put(`/users/${id}/password`, passwordData);
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
  
  /**
   * Get repartidores (delivery staff)
   * @param {Object} filters - Optional filters (zone, active)
   * @returns {Promise<Array>} List of repartidores
   */
  async getRepartidores(filters = {}) {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (filters.zone) queryParams.append('zone', filters.zone);
      if (filters.active !== undefined) queryParams.append('active', filters.active);
      
      const queryString = queryParams.toString();
      const endpoint = queryString ? `/users/repartidores?${queryString}` : '/users/repartidores';
      
      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching repartidores:', error);
      throw error;
    }
  }
  
  /**
   * Get users by zone
   * @param {string} zone - Zone code
   * @returns {Promise<Array>} List of users in the zone
   */
  async getUsersByZone(zone) {
    try {
      const response = await api.get(`/users/by-zone/${zone}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching users by zone:', error);
      throw error;
    }
  }
}

export default new UserService();