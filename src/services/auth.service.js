import api from './api';

/**
 * Authentication Service
 * Provides methods for authentication and user management
 */
class AuthService {
  /**
   * Login user and save tokens to sessionStorage
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User data and tokens
   */
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });
      
      if (response.data.success) {
        if (response.data.accessToken) {
          sessionStorage.setItem('accessToken', response.data.accessToken);
          console.log('Token guardado en sessionStorage:', response.data.accessToken);
        } else {
          console.warn('No se recibió accessToken del servidor');
        }
        
        if (response.data.refreshToken) {
          sessionStorage.setItem('refreshToken', response.data.refreshToken);
        }
        
        if (response.data.data) {
          sessionStorage.setItem('user', JSON.stringify(response.data.data));
          return { success: true, user: response.data.data };
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }
  
  /**
   * Refresh access token using refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshToken() {
    try {
      const refreshToken = sessionStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await api.post('/auth/refresh-token', {
        refreshToken
      });
      
      if (response.data.success) {
        if (response.data.accessToken) {
          sessionStorage.setItem('accessToken', response.data.accessToken);
        }
        
        if (response.data.refreshToken) {
          sessionStorage.setItem('refreshToken', response.data.refreshToken);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Refresh token error:', error);
      
      // If refresh token is expired, logout the user
      if (error.response && error.response.status === 401) {
        this.clearAuthData();
      }
      
      throw error;
    }
  }
  
  /**
   * Logout user and remove tokens from sessionStorage
   * @returns {Promise<Object>} Success message
   */
  async logout() {
    try {
      // Get the refresh token to invalidate just this session
      const refreshToken = sessionStorage.getItem('refreshToken');
      
      // Only remove the current token, not all sessions
      const response = await api.post('/auth/logout', {
        refresh_token: refreshToken
      });
      
      // Clear session storage
      this.clearAuthData();
      
      return response.data;
    } catch (error) {
      // Clear session storage even if API call fails
      this.clearAuthData();
      
      console.error('Logout error:', error);
      throw error;
    }
  }
  
  /**
   * Clear authentication data from sessionStorage
   */
  clearAuthData() {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
  }
  
  /**
   * Register a new user (admin only)
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async register(userData) {
    try {
      // Asegurarse que el rol esté en formato correcto (MAYÚSCULAS)
      if (userData.role) {
        userData.role = userData.role.toUpperCase();
      }
      
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }
  
  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile
   */
  async getProfile() {
    try {
      const response = await api.get('/auth/me');
      
      if (response.data.success && response.data.data) {
        // Update session storage with latest user data
        sessionStorage.setItem('user', JSON.stringify(response.data.data));
      }
      
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      
      // If token is expired, try to refresh it
      if (error.response && error.response.status === 401) {
        try {
          await this.refreshToken();
          // Retry the original request after token refresh
          return await this.getProfile();
        } catch (refreshError) {
          // If refresh fails, pass through the original error
          throw error;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Update current user profile
   * @param {Object} profileData - Updated profile data
   * @returns {Promise<Object>} Updated user profile
   */
  async updateProfile(profileData) {
    try {
      const response = await api.put('/auth/me', profileData);
      
      // Update session storage if profile was updated successfully
      if (response.data.success && response.data.data) {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        sessionStorage.setItem('user', JSON.stringify({
          ...user,
          ...response.data.data
        }));
      }
      
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      
      // If token is expired, try to refresh it
      if (error.response && error.response.status === 401) {
        try {
          await this.refreshToken();
          // Retry the original request after token refresh
          return await this.updateProfile(profileData);
        } catch (refreshError) {
          // If refresh fails, pass through the original error
          throw error;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Get all users (admin only)
   * @returns {Promise<Array>} List of users
   */
  async getAllUsers() {
    try {
      const response = await api.get('/auth/users');
      return response.data;
    } catch (error) {
      console.error('Get users error:', error);
      
      // If token is expired, try to refresh it
      if (error.response && error.response.status === 401) {
        try {
          await this.refreshToken();
          // Retry the original request after token refresh
          return await this.getAllUsers();
        } catch (refreshError) {
          // If refresh fails, pass through the original error
          throw error;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Get user by ID (admin only)
   * @param {string} id - User ID
   * @returns {Promise<Object>} User data
   */
  async getUserById(id) {
    try {
      const response = await api.get(`/auth/users/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get user error:', error);
      
      // If token is expired, try to refresh it
      if (error.response && error.response.status === 401) {
        try {
          await this.refreshToken();
          // Retry the original request after token refresh
          return await this.getUserById(id);
        } catch (refreshError) {
          // If refresh fails, pass through the original error
          throw error;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Update user (admin only)
   * @param {string} id - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(id, userData) {
    try {
      const response = await api.put(`/auth/users/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error('Update user error:', error);
      
      // If token is expired, try to refresh it
      if (error.response && error.response.status === 401) {
        try {
          await this.refreshToken();
          // Retry the original request after token refresh
          return await this.updateUser(id, userData);
        } catch (refreshError) {
          // If refresh fails, pass through the original error
          throw error;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Activate or deactivate user (admin only)
   * @param {string} id - User ID
   * @param {boolean} isActive - Active status
   * @returns {Promise<Object>} Updated user
   */
  async updateUserStatus(id, isActive) {
    try {
      const response = await api.put(`/auth/users/${id}/status`, {
        isActive
      });
      return response.data;
    } catch (error) {
      console.error('Update user status error:', error);
      
      // If token is expired, try to refresh it
      if (error.response && error.response.status === 401) {
        try {
          await this.refreshToken();
          // Retry the original request after token refresh
          return await this.updateUserStatus(id, isActive);
        } catch (refreshError) {
          // If refresh fails, pass through the original error
          throw error;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Check if user is logged in
   * @returns {boolean} Logged in status
   */
  isLoggedIn() {
    return !!sessionStorage.getItem('accessToken');
  }
  
  /**
   * Get current user from sessionStorage
   * @returns {Object|null} User data or null
   */
  getCurrentUser() {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
  
  /**
   * Check if current user has admin role
   * @returns {boolean} Is admin
   */
  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'ADMIN';
  }
  
  /**
   * Check if current user has repartidor role
   * @returns {boolean} Is repartidor
   */
  isRepartidor() {
    const user = this.getCurrentUser();
    return user && user.role === 'REPARTIDOR';
  }
  
  /**
   * Get user's zone
   * @returns {string|null} User's zone or null
   */
  getUserZone() {
    const user = this.getCurrentUser();
    return user ? user.zone : null;
  }
  
  /**
   * Get access token
   * @returns {string|null} Access token or null
   */
  getAccessToken() {
    return sessionStorage.getItem('accessToken');
  }
  
  /**
   * Get refresh token
   * @returns {string|null} Refresh token or null
   */
  getRefreshToken() {
    return sessionStorage.getItem('refreshToken');
  }
}

export default new AuthService();