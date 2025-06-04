// User types
export const USER_ROLES = {
  ADMIN: 'admin',
  REPARTIDOR: 'repartidor'
};

// Service status - Workflow actualizado
export const SERVICE_STATUS = {
  PENDING_PICKUP: 'PENDING_PICKUP',
  ASSIGNED_TO_ROUTE: 'ASSIGNED_TO_ROUTE', // ✨ NUEVO: Repartidor en camino
  PICKED_UP: 'PICKED_UP',
  LABELED: 'LABELED',
  IN_PROCESS: 'IN_PROCESS',
  DELIVERY: 'DELIVERY', // NUEVO: Estado de entrega (decisión)
  PARTIAL_DELIVERY: 'PARTIAL_DELIVERY',
  COMPLETED: 'COMPLETED',
  // Estados de entrega
  READY_FOR_DELIVERY: 'READY_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  // Estados obsoletos mantenidos para compatibilidad
  WASHED: 'WASHED', // DEPRECATED
  IRONED: 'IRONED', // DEPRECATED  
  READY: 'READY', // DEPRECATED
  TOTAL_DELIVERY: 'TOTAL_DELIVERY', // DEPRECATED
  CANCELLED: 'CANCELLED'
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