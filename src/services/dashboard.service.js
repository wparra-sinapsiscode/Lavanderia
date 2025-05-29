import api from './api';

/**
 * Dashboard Service
 * Provides methods for dashboard data and metrics
 */
class DashboardService {
  /**
   * Get overall dashboard summary
   * @param {string} timePeriod - Time period (day, week, month, year)
   * @returns {Promise<Object>} Dashboard summary data
   */
  async getDashboardSummary(timePeriod = 'month') {
    try {
      const response = await api.get('/dashboard/summary', {
        params: { timePeriod }
      });
      return response.data;
    } catch (error) {
      console.error('Get dashboard summary error:', error);
      throw error;
    }
  }
  
  /**
   * Get service statistics and metrics
   * @param {string} timePeriod - Time period (day, week, month, year)
   * @returns {Promise<Object>} Service statistics
   */
  async getServiceStats(timePeriod = 'month') {
    try {
      const response = await api.get('/dashboard/services-stats', {
        params: { timePeriod }
      });
      return response.data;
    } catch (error) {
      console.error('Get service stats error:', error);
      throw error;
    }
  }
  
  /**
   * Get financial KPIs (admin only)
   * @param {string} timePeriod - Time period (day, week, month, year)
   * @returns {Promise<Object>} Financial statistics
   */
  async getFinancialStats(timePeriod = 'month') {
    try {
      const response = await api.get('/dashboard/financial-stats', {
        params: { timePeriod }
      });
      return response.data;
    } catch (error) {
      console.error('Get financial stats error:', error);
      throw error;
    }
  }
  
  /**
   * Get hotel performance metrics
   * @param {string} timePeriod - Time period (day, week, month, year)
   * @param {number} hotelId - Optional specific hotel ID
   * @returns {Promise<Object>} Hotel performance data
   */
  async getHotelStats(timePeriod = 'month', hotelId = null) {
    try {
      const params = { timePeriod };
      if (hotelId) params.hotelId = hotelId;
      
      const response = await api.get('/dashboard/hotel-stats', { params });
      return response.data;
    } catch (error) {
      console.error('Get hotel stats error:', error);
      throw error;
    }
  }
  
  /**
   * Get repartidor performance metrics (admin only)
   * @param {string} timePeriod - Time period (day, week, month, year)
   * @param {number} userId - Optional specific user ID
   * @returns {Promise<Object>} Repartidor performance data
   */
  async getRepartidorStats(timePeriod = 'month', userId = null) {
    try {
      const params = { timePeriod };
      if (userId) params.userId = userId;
      
      const response = await api.get('/dashboard/repartidor-stats', { params });
      return response.data;
    } catch (error) {
      console.error('Get repartidor stats error:', error);
      throw error;
    }
  }
  
  /**
   * Get metrics grouped by zone
   * @param {string} timePeriod - Time period (day, week, month, year)
   * @returns {Promise<Object>} Zone metrics
   */
  async getMetricsByZone(timePeriod = 'month') {
    try {
      const response = await api.get('/dashboard/zone-performance', {
        params: { timePeriod }
      });
      return response.data;
    } catch (error) {
      console.error('Get zone metrics error:', error);
      throw error;
    }
  }
  
  /**
   * Get audit logs for the dashboard
   * @param {number} limit - Maximum number of logs to retrieve
   * @returns {Promise<Object>} Audit logs
   */
  async getAuditLogs(limit = 10) {
    try {
      const response = await api.get('/dashboard/audit-logs', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Get audit logs error:', error);
      throw error;
    }
  }
  
  /**
   * Get time period options for filters
   * @returns {Array} Time period options
   */
  getTimePeriodOptions() {
    return [
      { value: 'day', label: 'Hoy' },
      { value: 'week', label: 'Esta semana' },
      { value: 'month', label: 'Este mes' },
      { value: 'year', label: 'Este año' }
    ];
  }
  
  /**
   * Format numerical metric with proper suffix
   * @param {number} value - Numerical value
   * @param {string} type - Metric type (count, currency, percentage, time)
   * @returns {string} Formatted metric
   */
  formatMetric(value, type = 'count') {
    if (value === undefined || value === null) return 'N/A';
    if (value === undefined || value === null) return 'N/A';
    
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN'
        }).format(value);
        
      case 'percentage':
        return `${value.toFixed(1)}%`;
        
      case 'time':
        // Format as hours and minutes
        const hours = Math.floor(value);
        const minutes = Math.round((value - hours) * 60);
        return `${hours}h ${minutes}m`;
        
      default: // count
        return new Intl.NumberFormat('es-MX').format(value);
    }
  }
  
  /**
   * Get chart colors for different data series
   * @returns {Object} Chart colors
   */
  getChartColors() {
    return {
      services: {
        PENDING_PICKUP: '#3498db',
        PICKED_UP: '#9b59b6',
        LABELED: '#e67e22',
        IN_PROCESS: '#f59e0b',
        READY_FOR_DELIVERY: '#2ecc71',
        PARTIAL_DELIVERY: '#1abc9c',
        COMPLETED: '#27ae60',
        CANCELLED: '#e74c3c'
      },
      transactions: {
        PAYMENT: '#2ecc71',
        REFUND: '#e67e22',
        EXPENSE: '#e74c3c',
        total: '#3498db'
      },
      zones: {
        NORTE: '#3498db',
        SUR: '#2ecc71',
        ESTE: '#e67e22',
        OESTE: '#9b59b6',
        CENTRO: '#1abc9c'
      }
    };
  }
}

export default new DashboardService();