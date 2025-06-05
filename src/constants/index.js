// App configuration
export const APP_CONFIG = {
  APP_NAME: 'Fumy Limp',
  COMPANY_COLORS: {
    PRIMARY: '#2563eb',
    SECONDARY: '#ffffff'
  },
  DEFAULT_PARTIAL_DELIVERY: 80,
  STORAGE_KEYS: {
    USER: 'fumy_limp_user',
    HOTELS: 'fumy_limp_hotels',
    SERVICES: 'fumy_limp_services',
    USERS: 'fumy_limp_users',
    THEME: 'fumy_limp_theme',
    AUDIT_LOG: 'fumy_limp_audit',
    BAG_LABELS: 'fumy_limp_bag_labels',
    TRANSACTIONS: 'fumy_limp_transactions',
    GUESTS: 'fumy_limp_guests'
  }
};

// Peruvian zones for repartidores
export const ZONES = {
  NORTE: 'Norte',
  SUR: 'Sur', 
  CENTRO: 'Centro',
  ESTE: 'Este',
  OESTE: 'Oeste'
};

// Predefined locations for geolocation simulation
export const SIMULATION_LOCATIONS = {
  HOTEL_LOS_DELFINES: { lat: -12.1275, lng: -77.0314, name: 'Hotel Los Delfines' },
  HOTEL_COUNTRY_CLUB: { lat: -12.0983, lng: -77.0365, name: 'Hotel Country Club' },
  HOTEL_SHERATON: { lat: -12.1050, lng: -77.0294, name: 'Hotel Sheraton' },
  HOTEL_MARRIOTT: { lat: -12.1167, lng: -77.0278, name: 'Hotel Marriott' },
  HOTEL_HILTON: { lat: -12.1089, lng: -77.0353, name: 'Hotel Hilton' }
};

// Service status configuration with colors and translations
export const SERVICE_STATUS_CONFIG = {
  // Minúsculas (frontend)
  pendiente_recojo: {
    label: 'Pendiente de Recojo',
    action: 'Pendiente',
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-300',
    badgeClasses: 'bg-amber-100 text-amber-800 border border-amber-300'
  },
  asignado_ruta: {
    label: 'Ruta Asignada',
    action: 'Ruta Asignada',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
    badgeClasses: 'bg-blue-100 text-blue-800 border border-blue-300'
  },
  recogido: {
    label: 'Recogido',
    action: 'Recogido',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-300',
    badgeClasses: 'bg-purple-100 text-purple-800 border border-purple-300'
  },
  rotulado: {
    label: 'Rotulado',
    action: 'Rotulado',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300',
    badgeClasses: 'bg-orange-100 text-orange-800 border border-orange-300'
  },
  en_proceso: {
    label: 'En Proceso',
    action: 'Procesando',
    color: 'indigo',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-800',
    borderColor: 'border-indigo-300',
    badgeClasses: 'bg-indigo-100 text-indigo-800 border border-indigo-300'
  },
  entrega_parcial: {
    label: 'Entrega Parcial',
    action: 'Entrega Parcial',
    color: 'teal',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-800',
    borderColor: 'border-teal-300',
    badgeClasses: 'bg-teal-100 text-teal-800 border border-teal-300'
  },
  completado: {
    label: 'Completado',
    action: 'Completado',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
    badgeClasses: 'bg-green-100 text-green-800 border border-green-300'
  },
  cancelado: {
    label: 'Cancelado',
    action: 'Cancelado',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
    badgeClasses: 'bg-red-100 text-red-800 border border-red-300'
  },
  // Mayúsculas (backend)
  PENDING_PICKUP: {
    label: 'Pendiente de Recojo',
    action: 'Pendiente',
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-300',
    badgeClasses: 'bg-amber-100 text-amber-800 border border-amber-300'
  },
  ASSIGNED_TO_ROUTE: {
    label: 'Ruta Asignada',
    action: 'Ruta Asignada',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-300',
    badgeClasses: 'bg-blue-100 text-blue-800 border border-blue-300'
  },
  PICKED_UP: {
    label: 'Recogido',
    action: 'Recogido',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    borderColor: 'border-purple-300',
    badgeClasses: 'bg-purple-100 text-purple-800 border border-purple-300'
  },
  LABELED: {
    label: 'Rotulado',
    action: 'Rotulado',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-300',
    badgeClasses: 'bg-orange-100 text-orange-800 border border-orange-300'
  },
  IN_PROCESS: {
    label: 'En Proceso',
    action: 'Procesando',
    color: 'indigo',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-800',
    borderColor: 'border-indigo-300',
    badgeClasses: 'bg-indigo-100 text-indigo-800 border border-indigo-300'
  },
  PARTIAL_DELIVERY: {
    label: 'Entrega Parcial',
    action: 'Entrega Parcial',
    color: 'teal',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-800',
    borderColor: 'border-teal-300',
    badgeClasses: 'bg-teal-100 text-teal-800 border border-teal-300'
  },
  COMPLETED: {
    label: 'Completado',
    action: 'Completado',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-300',
    badgeClasses: 'bg-green-100 text-green-800 border border-green-300'
  },
  CANCELLED: {
    label: 'Cancelado',
    action: 'Cancelado',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    borderColor: 'border-red-300',
    badgeClasses: 'bg-red-100 text-red-800 border border-red-300'
  },
  READY_FOR_DELIVERY: {
    label: 'Esperando',
    action: 'Esperando',
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-300',
    badgeClasses: 'bg-amber-100 text-amber-800 border border-amber-300'
  },
  OUT_FOR_DELIVERY: {
    label: 'En Entrega',
    action: 'En Entrega',
    color: 'violet',
    bgColor: 'bg-violet-100',
    textColor: 'text-violet-800',
    borderColor: 'border-violet-300',
    badgeClasses: 'bg-violet-100 text-violet-800 border border-violet-300'
  },
  DELIVERED: {
    label: 'Entregado',
    action: 'Entregado',
    color: 'emerald',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-800',
    borderColor: 'border-emerald-300',
    badgeClasses: 'bg-emerald-100 text-emerald-800 border border-emerald-300'
  }
};

// Service status constants
export const SERVICE_STATUS = {
  PENDING_PICKUP: 'PENDING_PICKUP',
  ASSIGNED_TO_ROUTE: 'ASSIGNED_TO_ROUTE',
  PICKED_UP: 'PICKED_UP',
  LABELED: 'LABELED',
  IN_PROCESS: 'IN_PROCESS',
  PARTIAL_DELIVERY: 'PARTIAL_DELIVERY',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  READY_FOR_DELIVERY: 'READY_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED'
};