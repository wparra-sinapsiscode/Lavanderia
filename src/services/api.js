import axios from 'axios';
import authService from './auth.service';

// Load base URL from environment or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Flag to prevent multiple token refresh requests
let isRefreshing = false;
// Queue of requests to retry after token refresh
let failedQueue = [];

// Process the queue of failed requests
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    // Get token from local storage
    const token = localStorage.getItem('accessToken');
    
    // If token exists, add authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors and token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 and we haven't already tried to refresh
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // If already refreshing, add to queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken
        });
        
        if (response.data.success && response.data.accessToken) {
          // Store the new tokens
          localStorage.setItem('accessToken', response.data.accessToken);
          
          if (response.data.refreshToken) {
            localStorage.setItem('refreshToken', response.data.refreshToken);
          }
          
          // Update authorization header and retry the request
          originalRequest.headers['Authorization'] = `Bearer ${response.data.accessToken}`;
          
          // Process the queue with the new token
          processQueue(null, response.data.accessToken);
          
          return api(originalRequest);
        } else {
          // If refresh fails, log out and redirect
          authService.clearAuthData();
          processQueue(new Error('Failed to refresh token'), null);
          
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          
          throw new Error('Token refresh failed');
        }
      } catch (refreshError) {
        // Failed to refresh token, clear auth data and redirect
        authService.clearAuthData();
        processQueue(refreshError, null);
        
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Extract error message from response for easier access
    const errorMessage = error.response?.data?.message || 
      error.response?.data?.error || 
      error.message || 
      'Error de conexión con el servidor';
      
    // Return enhanced error
    return Promise.reject({
      ...error,
      message: errorMessage,
      originalError: error
    });
  }
);

export default api;