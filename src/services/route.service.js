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
    if (!date) {
      throw new Error('Date is required for route generation');
    }
    
    try {
      const params = { date, ...options };
      const response = await api.post('/routes/generate', params);
      
      // Improved validation for mock data - commented out to allow all data
      // if (response.data?.fromMock === true || response.data?.isMockData === true) {
      //   console.warn('Rechazando datos simulados de la API (mock data detected)');
      //   return { data: [], isMockData: true };
      // }
      
      // Normalize response data structure
      const routeData = response.data?.data || [];
      
      // Return data without filtering
      const dataArray = Array.isArray(routeData) ? routeData : [];
      return { data: dataArray, total: dataArray.length };
    } catch (error) {
      console.error('Error generating optimized route:', error);
      // Enhanced error handling with error information
      return { 
        data: [], 
        error: error.message || 'Error en la generación de ruta optimizada',
        status: error.response?.status || 500
      };
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
      
      // Improved validation for mock data - commented out to allow all data
      // if (response.data?.fromMock === true || response.data?.isMockData === true) {
      //   console.warn('Rechazando datos simulados de la API (mock data detected)');
      //   return { data: [], isMockData: true };
      // }
      
      // Normalize response data structure
      const routeData = response.data?.data || [];
      
      // Return data without filtering
      const dataArray = Array.isArray(routeData) ? routeData : [];
      return { data: dataArray, total: dataArray.length };
    } catch (error) {
      console.error('Error fetching routes:', error);
      // Enhanced error handling with error information
      return { 
        data: [], 
        error: error.message || 'Error al obtener rutas',
        status: error.response?.status || 500
      };
    }
  },

  /**
   * Get a specific route by ID
   * @param {string} routeId - Route ID
   * @returns {Promise<Object>} - Route details
   */
  getRouteById: async (routeId) => {
    if (!routeId) {
      throw new Error('Route ID is required');
    }
    
    try {
      const response = await api.get(`/routes/${routeId}`);
      
      // Check for mock data
      if (response.data?.fromMock === true || response.data?.isMockData === true ||
          response.data?.data?.isMock === true || 
          response.data?.data?.id?.toString().toLowerCase().includes('mock')) {
        throw new Error('Mock data detected - not using simulated data');
      }
      
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching route ${routeId}:`, error);
      // Add specific error handling
      const errorMessage = error.response?.data?.message || error.message || `Error al obtener ruta ${routeId}`;
      throw new Error(errorMessage);
    }
  },

  /**
   * Start a route
   * @param {string} routeId - Route ID
   * @returns {Promise<Object>} - Updated route
   */
  startRoute: async (routeId) => {
    if (!routeId) {
      throw new Error('Route ID is required');
    }
    
    try {
      const response = await api.patch(`/routes/${routeId}/start`);
      
      // Check for mock data
      if (response.data?.fromMock === true || response.data?.isMockData === true ||
          response.data?.data?.isMock === true) {
        throw new Error('Mock data detected - not using simulated data');
      }
      
      return response.data.data;
    } catch (error) {
      console.error(`Error starting route ${routeId}:`, error);
      const errorMessage = error.response?.data?.message || error.message || `Error al iniciar ruta ${routeId}`;
      throw new Error(errorMessage);
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
    if (!routeId || !stopId) {
      throw new Error('Route ID and Stop ID are required');
    }
    
    try {
      const response = await api.put(`/routes/${routeId}/stops/${stopId}`, updateData);
      
      // Check for mock data
      if (response.data?.fromMock === true || response.data?.isMockData === true) {
        throw new Error('Mock data detected - not using simulated data');
      }
      
      return response.data.data;
    } catch (error) {
      console.error(`Error updating stop in route ${routeId}:`, error);
      const errorMessage = error.response?.data?.message || error.message || `Error al actualizar parada en ruta ${routeId}`;
      throw new Error(errorMessage);
    }
  },

  /**
   * Add a new stop to a route
   * @param {string} routeId - Route ID
   * @param {Object} stopData - Stop data
   * @returns {Promise<Object>} - Created stop
   */
  addRouteStop: async (routeId, stopData) => {
    if (!routeId) {
      throw new Error('Route ID is required');
    }
    
    try {
      const response = await api.post(`/routes/${routeId}/stops`, stopData);
      
      // Check for mock data
      if (response.data?.fromMock === true || response.data?.isMockData === true) {
        throw new Error('Mock data detected - not using simulated data');
      }
      
      return response.data.data;
    } catch (error) {
      console.error(`Error adding stop to route ${routeId}:`, error);
      const errorMessage = error.response?.data?.message || error.message || `Error al añadir parada a ruta ${routeId}`;
      throw new Error(errorMessage);
    }
  },

  /**
   * Complete a route
   * @param {string} routeId - Route ID
   * @param {Object} completionData - Data for route completion (metrics, issues, etc.)
   * @returns {Promise<Object>} - Completed route
   */
  completeRoute: async (routeId, completionData = {}) => {
    if (!routeId) {
      throw new Error('Route ID is required');
    }
    
    try {
      const response = await api.patch(`/routes/${routeId}/complete`, completionData);
      
      // Check for mock data
      if (response.data?.fromMock === true || response.data?.isMockData === true) {
        throw new Error('Mock data detected - not using simulated data');
      }
      
      return response.data.data;
    } catch (error) {
      console.error(`Error completing route ${routeId}:`, error);
      const errorMessage = error.response?.data?.message || error.message || `Error al completar ruta ${routeId}`;
      throw new Error(errorMessage);
    }
  },

  /**
   * Delete routes for a specific date
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Object>} - Operation result
   */
  deleteRoutesByDate: async (date) => {
    if (!date) {
      throw new Error('Date is required to delete routes');
    }
    
    try {
      const response = await api.delete('/routes', { params: { date } });
      return response.data;
    } catch (error) {
      console.error(`Error deleting routes for date ${date}:`, error);
      const errorMessage = error.response?.data?.message || error.message || `Error al eliminar rutas para la fecha ${date}`;
      throw new Error(errorMessage);
    }
  },

  /**
   * Optimize a route based on location coordinates
   * @param {string} routeId - Route ID
   * @param {Object} options - Options for optimization (startLatitude, startLongitude)
   * @returns {Promise<Object>} - Optimized route
   */
  optimizeRoute: async (routeId, options = {}) => {
    if (!routeId) {
      throw new Error('Route ID is required');
    }
    
    try {
      const response = await api.post(`/routes/${routeId}/optimize`, options);
      
      // Check for mock data
      if (response.data?.fromMock === true || response.data?.isMockData === true) {
        throw new Error('Mock data detected - not using simulated data');
      }
      
      return response.data.data;
    } catch (error) {
      console.error(`Error optimizing route ${routeId}:`, error);
      const errorMessage = error.response?.data?.message || error.message || `Error al optimizar ruta ${routeId}`;
      throw new Error(errorMessage);
    }
  },

  /**
   * Update a route's status
   * @param {string} routeId - Route ID
   * @param {string} status - New status (PLANNED, IN_PROGRESS, COMPLETED, CANCELLED)
   * @returns {Promise<Object>} - Updated route
   */
  updateRouteStatus: async (routeId, status) => {
    if (!routeId) {
      throw new Error('Route ID is required');
    }
    
    if (!status || !['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      throw new Error('Valid status is required (PLANNED, IN_PROGRESS, COMPLETED, CANCELLED)');
    }
    
    try {
      const response = await api.patch(`/routes/${routeId}/status`, { status });
      
      // Check for mock data
      if (response.data?.fromMock === true || response.data?.isMockData === true) {
        throw new Error('Mock data detected - not using simulated data');
      }
      
      return response.data.data;
    } catch (error) {
      console.error(`Error updating status of route ${routeId}:`, error);
      const errorMessage = error.response?.data?.message || error.message || `Error al actualizar estado de ruta ${routeId}`;
      throw new Error(errorMessage);
    }
  },
  
  /**
   * Create a new route
   * @param {Object} routeData - Route data (date, repartidorId, zone, etc.)
   * @returns {Promise<Object>} - Created route
   */
  createRoute: async (routeData) => {
    if (!routeData || !routeData.date) {
      throw new Error('Route data with date is required');
    }
    
    try {
      const response = await api.post('/routes', routeData);
      
      // Check for mock data
      if (response.data?.fromMock === true || response.data?.isMockData === true) {
        throw new Error('Mock data detected - not using simulated data');
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error creating route:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al crear ruta';
      throw new Error(errorMessage);
    }
  },

  /**
   * Delete a specific route
   * @param {string} routeId - Route ID to delete
   * @returns {Promise<Object>} - Operation result
   */
  deleteRoute: async (routeId) => {
    if (!routeId) {
      throw new Error('Route ID is required');
    }
    
    try {
      const response = await api.delete(`/routes/${routeId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting route ${routeId}:`, error);
      const errorMessage = error.response?.data?.message || error.message || `Error al eliminar ruta ${routeId}`;
      throw new Error(errorMessage);
    }
  },

  /**
   * Generate automatic routes for pickup services
   * @param {Object} data - Route generation parameters
   * @param {string} data.date - Date for routes (YYYY-MM-DD)
   * @param {Array<string>} data.zones - Zones to generate routes for
   * @returns {Promise<Object>} - Generated routes
   */
  generateAutomaticRoutes: async (data) => {
    try {
      const response = await api.post('/routes/generate-automatic', data);
      
      // Check for mock data
      if (response.data?.fromMock === true || response.data?.isMockData === true) {
        throw new Error('Mock data detected - not using simulated data');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error generating automatic routes:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al generar rutas automáticas';
      throw new Error(errorMessage);
    }
  }
};

export default routeService;