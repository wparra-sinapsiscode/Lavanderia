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