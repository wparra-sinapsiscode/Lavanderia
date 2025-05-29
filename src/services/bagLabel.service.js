import api from './api';
import { bagLabelStorage, serviceStorage, hotelStorage } from '../utils/storage';

/**
 * Bag Label Service
 * Provides methods for bag label management
 */
class BagLabelService {
  /**
   * Get all bag labels with optional filtering
   * @param {Object} filters - Optional filter parameters
   * @param {string} filters.status - Filter by status
   * @param {number} filters.hotelId - Filter by hotel ID
   * @param {number} filters.serviceId - Filter by service ID
   * @param {string} filters.generatedAt - Filter by generation date
   * @param {number} filters.limit - Limit number of results
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Object>} Bag labels data
   */
  async getAllBagLabels(filters = {}) {
    try {
      const response = await api.get('/bag-labels', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get bag labels error:', error);
      
      // Fallback to local storage
      try {
        let labels = bagLabelStorage.getBagLabels() || [];
        
        // Apply filters
        if (filters.status) {
          labels = labels.filter(l => l.status === filters.status);
        }
        
        if (filters.hotelId) {
          labels = labels.filter(l => l.hotelId === filters.hotelId);
        }
        
        if (filters.serviceId) {
          labels = labels.filter(l => l.serviceId === filters.serviceId);
        }
        
        if (filters.generatedAt) {
          labels = labels.filter(l => l.generatedAt === filters.generatedAt);
        }
        
        // Apply pagination if needed
        if (filters.offset && filters.limit) {
          labels = labels.slice(filters.offset, filters.offset + filters.limit);
        } else if (filters.limit) {
          labels = labels.slice(0, filters.limit);
        }
        
        return {
          success: true,
          message: 'Bag labels retrieved from local storage',
          data: labels
        };
      } catch (localError) {
        console.error('Local storage get bag labels error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get a specific bag label by ID
   * @param {number} id - Bag label ID
   * @returns {Promise<Object>} Bag label data
   */
  async getBagLabelById(id) {
    try {
      const response = await api.get(`/bag-labels/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get bag label error:', error);
      
      // Fallback to local storage
      try {
        const labels = bagLabelStorage.getBagLabels() || [];
        const label = labels.find(l => l.id === id);
        
        if (!label) {
          throw new Error('Bag label not found in local storage');
        }
        
        return {
          success: true,
          message: 'Bag label retrieved from local storage',
          data: label
        };
      } catch (localError) {
        console.error('Local storage get bag label error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Create new bag labels (batch creation)
   * @param {Object} labelData - Label data
   * @param {number} labelData.hotelId - Hotel ID
   * @param {number} labelData.serviceId - Optional service ID
   * @param {number} labelData.quantity - Number of labels to create
   * @param {string} labelData.labelPrefix - Optional custom prefix
   * @returns {Promise<Object>} Created bag labels
   */
  async createBagLabels(labelData) {
    try {
      const response = await api.post('/bag-labels', labelData);
      return response.data;
    } catch (error) {
      console.error('Create bag labels error:', error);
      
      // Fallback to local storage
      try {
        const labels = bagLabelStorage.getBagLabels() || [];
        const createdLabels = [];
        
        // Get hotel name for label prefix
        let hotelName = 'HOT';
        if (labelData.hotelId) {
          const hotels = hotelStorage.getHotels() || [];
          const hotel = hotels.find(h => h.id === labelData.hotelId);
          if (hotel) {
            hotelName = hotel.name.substring(0, 3).toUpperCase();
          }
        }
        
        // Generate labels
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
        const prefix = labelData.labelPrefix || hotelName;
        
        for (let i = 0; i < labelData.quantity; i++) {
          const bagNumber = (i + 1).toString().padStart(2, '0');
          const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
          const labelCode = `${prefix}-${dateStr}-${timeStr}-${bagNumber}-${random}`;
          
          const newLabel = {
            id: Date.now() + i,
            label: labelCode,
            hotelId: labelData.hotelId,
            serviceId: labelData.serviceId || null,
            bagNumber: i + 1,
            registeredById: labelData.registeredById || 'system',
            status: 'AVAILABLE',
            generatedAt: labelData.generatedAt || 'LAVANDERIA',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          };
          
          labels.push(newLabel);
          createdLabels.push(newLabel);
        }
        
        bagLabelStorage.setBagLabels(labels);
        
        return {
          success: true,
          message: `${createdLabels.length} bag labels created in local storage`,
          data: createdLabels
        };
      } catch (localError) {
        console.error('Local storage create bag labels error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Update a bag label
   * @param {number} id - Bag label ID
   * @param {Object} updateData - Update data
   * @param {string} updateData.status - New status
   * @param {number} updateData.serviceId - Service ID to associate with label
   * @param {string} updateData.notes - Notes about the update
   * @returns {Promise<Object>} Updated bag label
   */
  async updateBagLabel(id, updateData) {
    try {
      const response = await api.put(`/bag-labels/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Update bag label error:', error);
      
      // Fallback to local storage
      try {
        const labels = bagLabelStorage.getBagLabels() || [];
        const labelIndex = labels.findIndex(l => l.id === id);
        
        if (labelIndex === -1) {
          throw new Error('Bag label not found in local storage');
        }
        
        const updatedLabel = {
          ...labels[labelIndex],
          ...updateData,
          updatedAt: new Date().toISOString(),
          updatedById: updateData.updatedById || 'system'
        };
        
        labels[labelIndex] = updatedLabel;
        bagLabelStorage.setBagLabels(labels);
        
        return {
          success: true,
          message: 'Bag label updated in local storage',
          data: updatedLabel
        };
      } catch (localError) {
        console.error('Local storage update bag label error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get available bag labels
   * @param {number} hotelId - Optional hotel ID filter
   * @returns {Promise<Object>} Available bag labels
   */
  async getAvailableBagLabels(hotelId) {
    try {
      const params = hotelId ? { hotelId } : {};
      const response = await api.get('/bag-labels/available', { params });
      return response.data;
    } catch (error) {
      console.error('Get available bag labels error:', error);
      
      // Fallback to local storage
      try {
        let labels = bagLabelStorage.getBagLabels() || [];
        
        // Filter for available labels
        labels = labels.filter(l => l.status === 'AVAILABLE');
        
        // Filter by hotel if specified
        if (hotelId) {
          labels = labels.filter(l => l.hotelId === hotelId);
        }
        
        return {
          success: true,
          message: 'Available bag labels retrieved from local storage',
          data: labels
        };
      } catch (localError) {
        console.error('Local storage get available bag labels error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get bag labels for a specific hotel
   * @param {number} hotelId - Hotel ID
   * @param {Object} filters - Optional filter parameters
   * @param {string} filters.status - Filter by status
   * @param {number} filters.limit - Limit number of results
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Object>} Hotel bag labels
   */
  async getBagLabelsByHotel(hotelId, filters = {}) {
    try {
      const response = await api.get(`/bag-labels/by-hotel/${hotelId}`, { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get hotel bag labels error:', error);
      
      // Fallback to local storage
      try {
        let labels = bagLabelStorage.getBagLabels() || [];
        
        // Filter by hotel
        labels = labels.filter(l => l.hotelId === hotelId);
        
        // Apply additional filters
        if (filters.status) {
          labels = labels.filter(l => l.status === filters.status);
        }
        
        // Apply pagination if needed
        if (filters.offset && filters.limit) {
          labels = labels.slice(filters.offset, filters.offset + filters.limit);
        } else if (filters.limit) {
          labels = labels.slice(0, filters.limit);
        }
        
        return {
          success: true,
          message: 'Hotel bag labels retrieved from local storage',
          data: labels
        };
      } catch (localError) {
        console.error('Local storage get hotel bag labels error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Upload photo for a bag label
   * @param {number} labelId - Bag label ID
   * @param {File} photo - Photo file
   * @returns {Promise<Object>} Photo upload result
   */
  async uploadLabelPhoto(labelId, photo) {
    try {
      const formData = new FormData();
      formData.append('photo', photo);
      
      const response = await api.post(`/bag-labels/${labelId}/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Upload label photo error:', error);
      
      // Fallback to local storage
      try {
        // Convert photo to base64 for local storage
        const reader = new FileReader();
        const photoPromise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(photo);
        });
        
        const photoBase64 = await photoPromise;
        
        const labels = bagLabelStorage.getBagLabels() || [];
        const labelIndex = labels.findIndex(l => l.id === labelId);
        
        if (labelIndex === -1) {
          throw new Error('Bag label not found in local storage');
        }
        
        // Update the label with the photo
        const updatedLabel = {
          ...labels[labelIndex],
          photo: photoBase64,
          updatedAt: new Date().toISOString()
        };
        
        labels[labelIndex] = updatedLabel;
        bagLabelStorage.setBagLabels(labels);
        
        return {
          success: true,
          message: 'Bag label photo uploaded to local storage',
          data: { photoUrl: photoBase64 }
        };
      } catch (localError) {
        console.error('Local storage upload label photo error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get bag labels for a specific service
   * @param {number} serviceId - Service ID
   * @returns {Promise<Object>} Service bag labels
   */
  async getBagLabelsByService(serviceId) {
    try {
      const response = await api.get(`/bag-labels/by-service/${serviceId}`);
      return response.data;
    } catch (error) {
      console.error('Get service bag labels error:', error);
      
      // Fallback to local storage
      try {
        const labels = bagLabelStorage.getBagLabels() || [];
        const serviceLabels = labels.filter(l => l.serviceId === serviceId);
        
        return {
          success: true,
          message: 'Service bag labels retrieved from local storage',
          data: serviceLabels
        };
      } catch (localError) {
        console.error('Local storage get service bag labels error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Assign bag labels to service
   * @param {number} serviceId - Service ID
   * @param {Array} labelIds - Array of bag label IDs
   * @returns {Promise<Object>} Assignment result
   */
  async assignLabelsToService(serviceId, labelIds) {
    try {
      const response = await api.post(`/services/${serviceId}/assign-labels`, {
        labelIds
      });
      return response.data;
    } catch (error) {
      console.error('Assign labels to service error:', error);
      
      // Fallback to local storage
      try {
        const labels = bagLabelStorage.getBagLabels() || [];
        const updatedLabels = [];
        
        // Find service
        const services = serviceStorage.getServices() || [];
        const service = services.find(s => s.id === serviceId);
        
        if (!service) {
          throw new Error('Service not found in local storage');
        }
        
        // Update each label
        labelIds.forEach(labelId => {
          const labelIndex = labels.findIndex(l => l.id === labelId);
          
          if (labelIndex !== -1) {
            const updatedLabel = {
              ...labels[labelIndex],
              serviceId,
              status: 'ASSIGNED',
              updatedAt: new Date().toISOString()
            };
            
            labels[labelIndex] = updatedLabel;
            updatedLabels.push(updatedLabel);
          }
        });
        
        // Save updates
        bagLabelStorage.setBagLabels(labels);
        
        return {
          success: true,
          message: `${updatedLabels.length} labels assigned to service in local storage`,
          data: updatedLabels
        };
      } catch (localError) {
        console.error('Local storage assign labels error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Create labels for a service
   * @param {string} serviceId - Service ID
   * @param {Array} labels - Array of label data
   * @returns {Promise<Object>} Created labels
   */
  async createLabels(serviceId, labels) {
    try {
      const response = await api.post(`/services/${serviceId}/labels`, { labels });
      return response.data;
    } catch (error) {
      console.error('Create labels error:', error);
      
      // Fallback to local storage
      try {
        const allLabels = bagLabelStorage.getBagLabels() || [];
        const createdLabels = [];
        
        // Find service
        const services = serviceStorage.getServices() || [];
        const service = services.find(s => s.id === serviceId);
        
        if (!service) {
          throw new Error('Service not found in local storage');
        }
        
        // Create each label
        for (const labelData of labels) {
          const newLabel = {
            id: Date.now() + Math.random(),
            serviceId,
            hotelId: service.hotelId,
            ...labelData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          allLabels.push(newLabel);
          createdLabels.push(newLabel);
        }
        
        // Save updates
        bagLabelStorage.setBagLabels(allLabels);
        
        return {
          success: true,
          message: `${createdLabels.length} labels created for service in local storage`,
          data: createdLabels
        };
      } catch (localError) {
        console.error('Local storage create labels error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get service labels
   * @param {string} serviceId - Service ID
   * @returns {Promise<Object>} Service labels
   */
  async getServiceLabels(serviceId) {
    try {
      const response = await api.get(`/services/${serviceId}/labels`);
      return response.data;
    } catch (error) {
      console.error('Get service labels error:', error);
      
      // Fallback to local storage
      try {
        const labels = bagLabelStorage.getBagLabels() || [];
        const serviceLabels = labels.filter(l => l.serviceId === serviceId);
        
        return {
          success: true,
          message: 'Service labels retrieved from local storage',
          data: serviceLabels
        };
      } catch (localError) {
        console.error('Local storage get service labels error:', localError);
        throw localError;
      }
    }
  }
  
  /**
   * Get status display info
   * @param {string} status - Bag label status
   * @returns {Object} Status display info with label and color
   */
  getStatusInfo(status) {
    switch (status) {
      case 'AVAILABLE':
        return {
          label: 'Disponible',
          color: 'green'
        };
      case 'ASSIGNED':
        return {
          label: 'Asignada',
          color: 'blue'
        };
      case 'IN_USE':
        return {
          label: 'En uso',
          color: 'orange'
        };
      case 'DELIVERED':
        return {
          label: 'Entregada',
          color: 'purple'
        };
      case 'DAMAGED':
        return {
          label: 'Dañada',
          color: 'red'
        };
      case 'LOST':
        return {
          label: 'Perdida',
          color: 'gray'
        };
      default:
        return {
          label: 'Desconocido',
          color: 'gray'
        };
    }
  }
  
  /**
   * Format label number for display
   * @param {string} labelNumber - Raw label number
   * @returns {string} Formatted label number
   */
  formatLabelNumber(labelNumber) {
    if (!labelNumber) return '';
    
    // Assuming format is PREFIX-TIMESTAMP-SEQUENCE
    const parts = labelNumber.split('-');
    if (parts.length < 3) return labelNumber;
    
    // If format is like HOT-20240601-1200-01-42, show HOT-01-42
    if (parts.length === 5) {
      return `${parts[0]}-${parts[3]}-${parts[4]}`;
    }
    
    return `${parts[0]}-${parts[parts.length - 1]}`;
  }
  
  /**
   * Generate QR code data for a bag label
   * @param {Object} label - Bag label object
   * @returns {string} QR code data
   */
  generateQRData(label) {
    if (!label) return '';
    
    // Create a data object with important label info
    const qrData = {
      id: label.id,
      label: label.label,
      hotelId: label.hotelId,
      serviceId: label.serviceId,
      status: label.status,
      createdAt: label.createdAt
    };
    
    // Return as JSON string
    return JSON.stringify(qrData);
  }
}

export default new BagLabelService();