// User types
export const USER_ROLES = {
  ADMIN: 'admin',
  REPARTIDOR: 'repartidor'
};

// Service status - Workflow actualizado
export const SERVICE_STATUS = {
  PENDING_PICKUP: 'pendiente_recojo',
  PICKED_UP: 'recogido',
  LABELED: 'rotulado',
  IN_PROCESS: 'en_proceso',
  PARTIAL_DELIVERY: 'entrega_parcial',
  COMPLETED: 'completado',
  // Estados obsoletos mantenidos para compatibilidad
  WASHED: 'lavado', // DEPRECATED
  IRONED: 'planchado', // DEPRECATED  
  READY: 'listo', // DEPRECATED
  READY_FOR_DELIVERY: 'listo_entrega', // DEPRECATED
  DELIVERED: 'entregado', // DEPRECATED
  TOTAL_DELIVERY: 'entrega_total', // DEPRECATED
  CANCELLED: 'cancelado'
};

// Service types structure (for reference)
export const SERVICE_STRUCTURE = {
  id: '',
  guestName: '',
  roomNumber: '',
  hotel: '',
  hotelId: '',
  bagCount: 0,
  weight: 0,
  observations: '',
  specialInstructions: '',
  priority: 'normal', // 'alta', 'media', 'normal'
  pickupDate: '',
  estimatedPickupDate: '',
  deliveryDate: '',
  estimatedDeliveryDate: '',
  status: '',
  photos: [],
  signature: '',
  collectorName: '', // Nombre del que recoge
  geolocation: { lat: 0, lng: 0 },
  repartidor: '',
  repartidorId: '',
  partialDeliveryPercentage: null,
  price: 0,
  pickupTimeSlot: '',
  customerNotes: '',
  internalNotes: '',
  timestamp: ''
};

// Hotel structure
export const HOTEL_STRUCTURE = {
  id: '',
  name: '',
  address: '',
  zone: '', // Geographic zone for automatic assignment
  contactPerson: '',
  phone: '',
  email: '',
  bagInventory: 0,
  pricePerKg: 0
};

// User structure
export const USER_STRUCTURE = {
  id: '',
  name: '',
  email: '',
  role: '',
  zone: '',
  phone: ''
};