import { APP_CONFIG } from '../constants';

// Generic sessionStorage utilities
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
      return true;
    } catch (error) {
      console.error('Error clearing sessionStorage:', error);
      return false;
    }
  }
};

// Specific data access functions
export const userStorage = {
  getUser: () => storage.get(APP_CONFIG.STORAGE_KEYS.USER),
  setUser: (user) => storage.set(APP_CONFIG.STORAGE_KEYS.USER, user),
  removeUser: () => storage.remove(APP_CONFIG.STORAGE_KEYS.USER)
};

export const hotelStorage = {
  getHotels: () => storage.get(APP_CONFIG.STORAGE_KEYS.HOTELS) || [],
  setHotels: (hotels) => storage.set(APP_CONFIG.STORAGE_KEYS.HOTELS, hotels),
  addHotel: (hotel) => {
    const hotels = hotelStorage.getHotels();
    hotels.push(hotel);
    return hotelStorage.setHotels(hotels);
  },
  updateHotel: (hotelId, updatedData) => {
    const hotels = hotelStorage.getHotels();
    const index = hotels.findIndex(h => h.id === hotelId);
    if (index !== -1) {
      hotels[index] = { ...hotels[index], ...updatedData };
      return hotelStorage.setHotels(hotels);
    }
    return false;
  }
};

export const serviceStorage = {
  getServices: () => storage.get(APP_CONFIG.STORAGE_KEYS.SERVICES) || [],
  setServices: (services) => storage.set(APP_CONFIG.STORAGE_KEYS.SERVICES, services),
  addService: (service) => {
    const services = serviceStorage.getServices();
    services.push(service);
    return serviceStorage.setServices(services);
  },
  updateService: (serviceId, updatedData) => {
    const services = serviceStorage.getServices();
    const index = services.findIndex(s => s.id === serviceId);
    if (index !== -1) {
      services[index] = { ...services[index], ...updatedData };
      return serviceStorage.setServices(services);
    }
    return false;
  },
  getServicesByZone: (zone) => {
    const services = serviceStorage.getServices();
    return services.filter(s => {
      // Verificar si el hotel tiene la misma zona
      const hotelZone = s.hotel?.zone || 
                       (typeof s.hotel === 'string' ? s.hotelZone : null);
      return hotelZone === zone;
    });
  },
  getServicesByRepartidor: (repartidorId) => {
    const services = serviceStorage.getServices();
    return services.filter(s => s.repartidorId === repartidorId || s.deliveryRepartidorId === repartidorId);
  }
};

export const auditStorage = {
  getAuditLog: () => storage.get(APP_CONFIG.STORAGE_KEYS.AUDIT_LOG) || [],
  addAuditEntry: (entry) => {
    const log = auditStorage.getAuditLog();
    log.push({
      ...entry,
      timestamp: new Date().toISOString()
    });
    return storage.set(APP_CONFIG.STORAGE_KEYS.AUDIT_LOG, log);
  }
};

export const bagLabelStorage = {
  getBagLabels: () => storage.get(APP_CONFIG.STORAGE_KEYS.BAG_LABELS) || [],
  setBagLabels: (labels) => storage.set(APP_CONFIG.STORAGE_KEYS.BAG_LABELS, labels),
  addBagLabel: (label) => {
    const labels = bagLabelStorage.getBagLabels();
    labels.push(label);
    return bagLabelStorage.setBagLabels(labels);
  },
  updateBagLabel: (labelId, updatedData) => {
    const labels = bagLabelStorage.getBagLabels();
    const index = labels.findIndex(l => l.id === labelId);
    if (index !== -1) {
      labels[index] = { ...labels[index], ...updatedData };
      return bagLabelStorage.setBagLabels(labels);
    }
    return false;
  },
  deleteBagLabel: (labelId) => {
    const labels = bagLabelStorage.getBagLabels();
    const filteredLabels = labels.filter(l => l.id !== labelId);
    return bagLabelStorage.setBagLabels(filteredLabels);
  },
  getBagLabelsByService: (serviceId) => {
    const labels = bagLabelStorage.getBagLabels();
    return labels.filter(l => l.serviceId === serviceId);
  },
  getBagLabelsByHotel: (hotelId) => {
    const labels = bagLabelStorage.getBagLabels();
    return labels.filter(l => l.hotelId === hotelId);
  }
};

// Financial data storage
export const guestStorage = {
  getGuests: () => storage.get(APP_CONFIG.STORAGE_KEYS.GUESTS) || [],
  setGuests: (guests) => storage.set(APP_CONFIG.STORAGE_KEYS.GUESTS, guests),
  
  addGuest: (guest) => {
    const guests = guestStorage.getGuests();
    guests.push(guest);
    return guestStorage.setGuests(guests);
  },
  
  updateGuest: (guestId, updatedData) => {
    const guests = guestStorage.getGuests();
    const index = guests.findIndex(g => g.id === guestId);
    if (index !== -1) {
      guests[index] = { ...guests[index], ...updatedData };
      return guestStorage.setGuests(guests);
    }
    return false;
  },
  
  getGuestsByHotel: (hotelId) => {
    const guests = guestStorage.getGuests();
    return guests.filter(g => g.hotelId === hotelId);
  }
};

export const financeStorage = {
  getTransactions: () => storage.get(APP_CONFIG.STORAGE_KEYS.TRANSACTIONS) || [],
  setTransactions: (transactions) => storage.set(APP_CONFIG.STORAGE_KEYS.TRANSACTIONS, transactions),
  
  addTransaction: (transaction) => {
    const transactions = financeStorage.getTransactions();
    const newTransaction = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...transaction
    };
    transactions.push(newTransaction);
    return financeStorage.setTransactions(transactions);
  },
  
  updateTransaction: (transactionId, updatedData) => {
    const transactions = financeStorage.getTransactions();
    const updatedTransactions = transactions.map(t => 
      t.id === transactionId ? { ...t, ...updatedData } : t
    );
    return financeStorage.setTransactions(updatedTransactions);
  },
  
  deleteTransaction: (transactionId) => {
    const transactions = financeStorage.getTransactions();
    const filteredTransactions = transactions.filter(t => t.id !== transactionId);
    return financeStorage.setTransactions(filteredTransactions);
  },
  
  getIncomeTransactions: () => {
    const transactions = financeStorage.getTransactions();
    return transactions.filter(t => t.type === 'income');
  },
  
  getExpenseTransactions: () => {
    const transactions = financeStorage.getTransactions();
    return transactions.filter(t => t.type === 'expense');
  },
  
  getTransactionsByDateRange: (startDate, endDate) => {
    const transactions = financeStorage.getTransactions();
    return transactions.filter(t => {
      const transactionDate = new Date(t.timestamp);
      return transactionDate >= new Date(startDate) && transactionDate <= new Date(endDate);
    });
  },
  
  getTransactionsByCategory: (category) => {
    const transactions = financeStorage.getTransactions();
    return transactions.filter(t => t.category === category);
  }
};