// Utility functions
let idCounter = 0;
export const generateId = () => {
  // Combine timestamp, random string, and counter for uniqueness
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 9);
  const counter = (++idCounter).toString(36);
  return `${timestamp}${randomPart}${counter}`;
};

export const formatDate = (date) => {
  if (!date) return 'Sin fecha';
  
  try {
    const dateObj = new Date(date);
    // Verificar si la fecha es válida
    if (isNaN(dateObj.getTime())) return 'Fecha inválida';
    
    return dateObj.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return 'Fecha inválida';
  }
};

/**
 * Formats a date string from HTML date input (YYYY-MM-DD) to local date display
 * 
 * IMPORTANT: This function prevents the -1 day offset bug that occurs when using
 * new Date(YYYY-MM-DD).toLocaleDateString() in timezones behind UTC.
 * 
 * The bug occurs because:
 * 1. HTML date inputs return strings like "2025-06-04"
 * 2. new Date("2025-06-04") creates a Date object at UTC midnight
 * 3. In timezones like Lima (UTC-5), this becomes the previous day
 * 4. User selects 04/06/2025 but sees "Rutas del 3/6/2025"
 * 
 * This function fixes it by parsing date components manually to create a local date.
 * 
 * @param {string} dateString - Date string in YYYY-MM-DD format (from HTML date input)
 * @param {string} locale - Locale for formatting (default: 'es-PE')
 * @returns {string} Formatted date string showing the correct date user selected
 * 
 * @example
 * // User selects 04/06/2025 in date picker
 * const selectedDate = "2025-06-04"; // From HTML input
 * 
 * // ❌ Wrong way (shows 3/6/2025 in Lima timezone):
 * new Date(selectedDate).toLocaleDateString('es-PE')
 * 
 * // ✅ Correct way (shows 4/6/2025):
 * formatLocalDate(selectedDate)
 */
export const formatLocalDate = (dateString, locale = 'es-PE') => {
  if (!dateString) return 'Sin fecha';
  
  try {
    // Parse the date components manually to avoid UTC timezone issues
    const [year, month, day] = dateString.split('-');
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Verify the date is valid
    if (isNaN(localDate.getTime())) return 'Fecha inválida';
    
    return localDate.toLocaleDateString(locale);
  } catch (error) {
    console.error('Error al formatear fecha local:', error);
    return 'Fecha inválida';
  }
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN'
  }).format(amount);
};

export const calculateServicePrice = (weight, pricePerKg) => {
  return weight * pricePerKg;
};

export const getStatusColor = (status) => {
  const colors = {
    pendiente_recojo: 'bg-red-100 text-red-800',
    asignado_ruta: 'bg-blue-100 text-blue-800', // ✨ NUEVO
    recogido: 'bg-yellow-100 text-yellow-800',
    rotulado: 'bg-indigo-100 text-indigo-800',
    en_proceso: 'bg-blue-100 text-blue-800',
    lavado: 'bg-blue-100 text-blue-800',
    planchado: 'bg-purple-100 text-purple-800',
    listo: 'bg-green-100 text-green-800',
    listo_entrega: 'bg-green-100 text-green-800',
    entregado: 'bg-emerald-100 text-emerald-800',
    entrega_parcial: 'bg-orange-100 text-orange-800',
    entrega_total: 'bg-emerald-100 text-emerald-800',
    completado: 'bg-green-100 text-green-800',
    cancelado: 'bg-gray-100 text-gray-800',
    // Estados de entrega simplificados
    'READY_FOR_DELIVERY': 'bg-amber-100 text-amber-800',
    'ASSIGNED_TO_ROUTE': 'bg-blue-100 text-blue-800',
    'COMPLETED': 'bg-green-100 text-green-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getStatusText = (status) => {
  const texts = {
    pendiente_recojo: 'Pendiente Recojo',
    asignado_ruta: 'Repartidor en Camino', // ✨ NUEVO
    recogido: 'Recogido',
    rotulado: 'Rotulado',
    en_proceso: 'En Proceso',
    lavado: 'Lavado',
    planchado: 'Planchado',
    listo: 'Listo para Entrega',
    listo_entrega: 'Listo para Entrega',
    entregado: 'Entregado',
    entrega_parcial: 'Entrega Parcial',
    entrega_total: 'Entrega Total',
    completado: 'Completado',
    cancelado: 'Cancelado',
    // Estados de entrega simplificados
    'READY_FOR_DELIVERY': 'Esperando',
    'ASSIGNED_TO_ROUTE': 'Ruta Asignada',
    'COMPLETED': 'Completado'
  };
  return texts[status] || status;
};

export const getPriorityColor = (priority) => {
  const colors = {
    alta: 'bg-red-100 text-red-800 border-red-200',
    media: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    normal: 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[priority] || colors.normal;
};

export const getPriorityText = (priority) => {
  const texts = {
    alta: 'Alta Prioridad',
    media: 'Media Prioridad', 
    normal: 'Normal'
  };
  return texts[priority] || 'Normal';
};

export const sortServicesByPriority = (services) => {
  const priorityOrder = { alta: 3, media: 2, normal: 1 };
  return services.sort((a, b) => {
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

export const formatTimeSlot = (timeSlot) => {
  if (!timeSlot) return 'Sin horario asignado';
  return timeSlot;
};

export const isPickupUrgent = (service) => {
  if (!service.estimatedPickupDate) return false;
  const now = new Date();
  const pickupDate = new Date(service.estimatedPickupDate);
  const hoursDiff = (pickupDate - now) / (1000 * 60 * 60);
  return hoursDiff <= 2 && hoursDiff >= 0; // Within next 2 hours
};

export const isDeliveryUrgent = (service) => {
  // Mark as urgent if it's a delivery service with high priority
  if (service.priority === 'alta' && (
    service.status === 'entrega_parcial' || 
    service.status === 'completado' ||
    service.status === 'listo_entrega'
  )) {
    return true;
  }
  
  // Mark as urgent if delivery date is within next 2 hours
  if (service.estimatedDeliveryDate) {
    const now = new Date();
    const deliveryDate = new Date(service.estimatedDeliveryDate);
    const hoursDiff = (deliveryDate - now) / (1000 * 60 * 60);
    return hoursDiff <= 2 && hoursDiff >= 0;
  }
  
  return false;
};

export const getPickupStats = (services, repartidorId = null) => {
  // Asegurar que services siempre sea un array
  if (!services || !Array.isArray(services)) {
    console.warn('getPickupStats recibió un valor no válido para services:', services);
    return {
      total: 0,
      pending: 0,
      deliveries: 0,
      pickedUp: 0,
      inProcess: 0,
      readyForDelivery: 0,
      completed: 0,
      urgent: 0
    };
  }
  
  const filteredServices = repartidorId 
    ? services.filter(s => s.repartidorId === repartidorId || s.deliveryRepartidorId === repartidorId)
    : services;
    
  return {
    total: filteredServices.length,
    pending: filteredServices.filter(s => s.status === 'pendiente_recojo').length,
    deliveries: filteredServices.filter(s => 
      s.status === 'entrega_parcial' || 
      s.status === 'completado' ||
      s.status === 'listo_entrega'
    ).length,
    pickedUp: filteredServices.filter(s => s.status === 'recogido').length,
    inProcess: filteredServices.filter(s => s.status === 'en_proceso').length,
    readyForDelivery: filteredServices.filter(s => s.status === 'listo_entrega').length,
    completed: filteredServices.filter(s => s.status === 'completado').length,
    urgent: filteredServices.filter(s => isPickupUrgent(s) || isDeliveryUrgent(s)).length
  };
};

// Auto-assign repartidor based on hotel zone
export const assignRepartidorByZone = (hotel, users) => {
  if (!users || !Array.isArray(users)) {
    return null;
  }

  // Get all repartidores
  const repartidores = users.filter(user => user.role === 'repartidor');
  
  if (repartidores.length === 0) {
    return null;
  }

  // Get hotel zone
  let hotelZone = null;
  if (typeof hotel === 'object' && hotel?.zone) {
    hotelZone = hotel.zone;
  }

  // If we have a zone, try to find a matching repartidor
  if (hotelZone) {
    const assignedRepartidor = repartidores.find(rep => rep.zone === hotelZone);
    if (assignedRepartidor) {
      return assignedRepartidor;
    }
  }
  
  // If no exact match or no zone, assign the first available repartidor
  return repartidores[0];
};

// Get automatic priority based on observations
export const getAutomaticPriority = (observations) => {
  if (!observations) return 'NORMAL';
  
  const urgentKeywords = [
    'urgente', 'evento', 'prisa', 'importante', 'vip', 'emergencia', 
    'asap', 'inmediato', 'ya', 'hoy', 'rapido', 'rápido', 'express',
    'boda', 'matrimonio', 'conferencia', 'reunión', 'reunion', 'viaje',
    'checkout', 'check-out', 'salida', 'vuelo', 'aeropuerto'
  ];
  const highKeywords = [
    'delicada', 'especial', 'cuidado', 'fragil', 'frágil', 'costosa', 
    'exclusiva', 'premium', 'fina', 'seda', 'cashmere', 'lana'
  ];
  
  const lowerObs = observations.toLowerCase();
  
  if (urgentKeywords.some(keyword => lowerObs.includes(keyword))) {
    return 'ALTA';
  }
  
  if (highKeywords.some(keyword => lowerObs.includes(keyword))) {
    return 'MEDIA';
  }
  
  return 'NORMAL';
};

// Service type functions for mixed routes
export const isPickupService = (service) => {
  return service.status === 'pendiente_recojo';
};

export const isDeliveryService = (service) => {
  return service.status === 'listo_entrega';
};

export const getServiceTypeColor = (service) => {
  if (isPickupService(service)) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  } else if (isDeliveryService(service)) {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

export const getServiceTypeText = (service) => {
  if (isPickupService(service)) {
    return 'RECOJO';
  } else if (isDeliveryService(service)) {
    return 'ENTREGA';
  }
  return 'OTRO';
};

export const getServiceTypeIcon = (service) => {
  if (isPickupService(service)) {
    return 'pickup'; // Maps to Truck icon
  } else if (isDeliveryService(service)) {
    return 'delivery'; // Maps to Package icon
  }
  return 'default';
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^[0-9]{9}$/;
  return re.test(phone.replace(/\s/g, ''));
};

export const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};