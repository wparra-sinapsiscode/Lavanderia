// Utilities for session-only storage
// Solo usa sessionStorage para datos temporales de la sesión actual
export const storage = {
  get: (key) => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting ${key} from sessionStorage:`, error);
      return null;
    }
  },

  set: (key, value) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting ${key} in sessionStorage:`, error);
      return false;
    }
  },

  remove: (key) => {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key} from sessionStorage:`, error);
      return false;
    }
  },

  clear: () => {
    try {
      sessionStorage.clear();
      console.log('🧹 Datos de sesión eliminados');
      return true;
    } catch (error) {
      console.error('Error clearing sessionStorage:', error);
      return false;
    }
  }
};

// Deprecated storage functions - replaced by API calls
// These functions are kept for backward compatibility but should not be used
// All data should be fetched from the API instead

export const userStorage = {
  getUser: () => {
    console.warn('userStorage.getUser is deprecated - use API instead');
    return null;
  },
  setUser: () => {
    console.warn('userStorage.setUser is deprecated - data persisted via API');
    return false;
  },
  removeUser: () => {
    console.warn('userStorage.removeUser is deprecated');
    return false;
  }
};

export const hotelStorage = {
  getHotels: () => {
    console.warn('hotelStorage.getHotels is deprecated - use API instead');
    return [];
  }
};

export const serviceStorage = {
  getServices: () => {
    console.warn('serviceStorage.getServices is deprecated - use API instead');
    return [];
  }
};

export const auditStorage = {
  getAuditLog: () => {
    console.warn('auditStorage.getAuditLog is deprecated - use API instead');
    return [];
  },
  addAuditEntry: () => {
    console.warn('auditStorage.addAuditEntry is deprecated - use API instead');
    return false;
  }
};

export const bagLabelStorage = {
  getBagLabels: () => {
    console.warn('bagLabelStorage.getBagLabels is deprecated - use API instead');
    return [];
  },
  getBagLabelsByService: (serviceId) => {
    console.warn('bagLabelStorage.getBagLabelsByService is deprecated - use API instead');
    return [];
  }
};

export const guestStorage = {
  getGuests: () => {
    console.warn('guestStorage.getGuests is deprecated - use API instead');
    return [];
  }
};

export const financeStorage = {
  getTransactions: () => {
    console.warn('financeStorage.getTransactions is deprecated - use API instead');
    return [];
  }
};