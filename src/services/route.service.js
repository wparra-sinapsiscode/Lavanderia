import api from './api';

/**
 * Service for managing routes through API
 */
const routeService = {
  /**
   * Generate an optimized route based on pending services
   * @param {string} date - Date for the route (YYYY-MM-DD)
   * @param {Object} options - Additional options (repartidorId, zone, type)
   * @returns {Promise<Object>} - Generated route data
   */
  generateOptimizedRoute: async (date, options = {}) => {
    try {
      const params = { date, ...options };
      const response = await api.post('/routes/generate', params);
      
      // Verificar si los datos vienen de mock y rechazarlos
      if (response.data.fromMock === true) {
        console.warn('Rechazando datos simulados de la API (fromMock=true)');
        return [];
      }
      
      // Asegurar que siempre devolvemos un array, incluso si la respuesta es un objeto único
      const data = response.data.data || [];
      
      // Filtrar cualquier ruta que tenga IDs de repartidor simulados
      const filteredData = Array.isArray(data) 
        ? data.filter(route => !route.repartidorId?.includes('mock'))
        : Array.isArray([data]) 
          ? [data].filter(route => !route.repartidorId?.includes('mock'))
          : [];
          
      return filteredData;
    } catch (error) {
      console.error('Error generating optimized route:', error);
      // En caso de error, devolver array vacío para evitar errores en el frontend
      return [];
    }
  },

  /**
   * Get all routes based on filters
   * @param {Object} filters - Filter options (date, repartidorId, status)
   * @returns {Promise<Array>} - List of routes
   */
  getAllRoutes: async (filters = {}) => {
    try {
      const response = await api.get('/routes', { params: filters });
      
      // Verificar si los datos vienen de mock y rechazarlos
      if (response.data.fromMock === true) {
        console.warn('Rechazando datos simulados de la API (fromMock=true)');
        return [];
      }
      
      // Asegurar que siempre devolvemos un array
      const data = response.data.data || [];
      
      // Filtrar cualquier ruta que tenga IDs de repartidor simulados
      const filteredData = Array.isArray(data) 
        ? data.filter(route => !route.repartidorId?.includes('mock'))
        : [];
        
      return filteredData;
    } catch (error) {
      console.error('Error fetching routes:', error);
      // En caso de error, devolver array vacío para evitar errores en el frontend
      return [];
    }
  },

  /**
   * Get a specific route by ID
   * @param {string} routeId - Route ID
   * @returns {Promise<Object>} - Route details
   */
  getRouteById: async (routeId) => {
    try {
      const response = await api.get(`/routes/${routeId}`);
      return response.data.data; // Return the data property from the response
    } catch (error) {
      console.error(`Error fetching route ${routeId}:`, error);
      throw error;
    }
  },

  /**
   * Start a route
   * @param {string} routeId - Route ID
   * @returns {Promise<Object>} - Updated route
   */
  startRoute: async (routeId) => {
    try {
      const response = await api.patch(`/routes/${routeId}/start`);
      return response.data.data; // Return the data property from the response
    } catch (error) {
      console.error(`Error starting route ${routeId}:`, error);
      throw error;
    }
  },

  /**
   * Update a hotel stop in a route
   * @param {string} routeId - Route ID
   * @param {string} stopId - Stop ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated route
   */
  updateRouteStop: async (routeId, stopId, updateData) => {
    try {
      const response = await api.put(`/routes/${routeId}/stops/${stopId}`, updateData);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating stop in route ${routeId}:`, error);
      throw error;
    }
  },

  /**
   * Add a new stop to a route
   * @param {string} routeId - Route ID
   * @param {Object} stopData - Stop data
   * @returns {Promise<Object>} - Created stop
   */
  addRouteStop: async (routeId, stopData) => {
    try {
      const response = await api.post(`/routes/${routeId}/stops`, stopData);
      return response.data.data;
    } catch (error) {
      console.error(`Error adding stop to route ${routeId}:`, error);
      throw error;
    }
  },

  /**
   * Complete a route
   * @param {string} routeId - Route ID
   * @param {Object} completionData - Data for route completion (metrics, issues, etc.)
   * @returns {Promise<Object>} - Completed route
   */
  completeRoute: async (routeId, completionData = {}) => {
    try {
      const response = await api.patch(`/routes/${routeId}/complete`, completionData);
      return response.data.data; // Return the data property from the response
    } catch (error) {
      console.error(`Error completing route ${routeId}:`, error);
      throw error;
    }
  },

  /**
   * Delete routes for a specific date
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Object>} - Operation result
   */
  deleteRoutesByDate: async (date) => {
    try {
      const response = await api.delete('/routes', { params: { date } });
      return response.data; // Return the entire response which includes message and count
    } catch (error) {
      console.error(`Error deleting routes for date ${date}:`, error);
      throw error;
    }
  },

  /**
   * Optimize a route based on location coordinates
   * @param {string} routeId - Route ID
   * @param {Object} options - Options for optimization (startLatitude, startLongitude)
   * @returns {Promise<Object>} - Optimized route
   */
  optimizeRoute: async (routeId, options = {}) => {
    try {
      const response = await api.post(`/routes/${routeId}/optimize`, options);
      return response.data.data; // Return the data property from the response
    } catch (error) {
      console.error(`Error optimizing route ${routeId}:`, error);
      throw error;
    }
  },

  /**
   * Update a route's status
   * @param {string} routeId - Route ID
   * @param {string} status - New status (PLANNED, IN_PROGRESS, COMPLETED, CANCELLED)
   * @returns {Promise<Object>} - Updated route
   */
  updateRouteStatus: async (routeId, status) => {
    try {
      const response = await api.patch(`/routes/${routeId}/status`, { status });
      return response.data.data; // Return the data property from the response
    } catch (error) {
      console.error(`Error updating status of route ${routeId}:`, error);
      throw error;
    }
  }
};

export default routeService;