/**
 * API Configuration for Fumy Limp Frontend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Get authorization header with JWT token
 * @returns {Object} Headers object with Authorization
 */
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * Handle API response
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} Parsed response data
 * @throws {Object} Error with message from API
 */
const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    // Extract error message
    const errorMessage = data.message || 'Ha ocurrido un error';
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
};

export { API_BASE_URL, getAuthHeader, handleResponse };