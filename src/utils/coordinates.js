/**
 * Utilidades para manejo y validación de coordenadas geográficas
 */

/**
 * Verifica si las coordenadas proporcionadas son válidas
 * 
 * @param {number|string|null|undefined} lat - Latitud a validar
 * @param {number|string|null|undefined} lng - Longitud a validar
 * @returns {boolean} - true si las coordenadas son válidas, false en caso contrario
 */
export const areValidCoordinates = (lat, lng) => {
  // Si alguna coordenada es null, undefined o string vacío, no es válida
  if (lat === null || lat === undefined || lat === '' || 
      lng === null || lng === undefined || lng === '') {
    return false;
  }
  
  // Convertir a número si son strings
  const numLat = typeof lat === 'string' ? parseFloat(lat) : lat;
  const numLng = typeof lng === 'string' ? parseFloat(lng) : lng;
  
  // Verificar si son números válidos (no NaN)
  if (isNaN(numLat) || isNaN(numLng)) {
    return false;
  }
  
  // Verificar si están en rangos válidos para latitud (-90 a 90) y longitud (-180 a 180)
  if (numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) {
    return false;
  }
  
  // Para el caso específico de Perú, podemos agregar una validación aproximada
  // Lima está alrededor de -12.0464, -77.0428
  // Podemos verificar si las coordenadas están en Perú (aproximadamente)
  const isInPeru = numLat >= -18.4 && numLat <= -0.0 && 
                   numLng >= -81.4 && numLng <= -68.6;
  
  return isInPeru;
};

/**
 * Calcula la distancia en kilómetros entre dos coordenadas usando la fórmula de Haversine
 * 
 * @param {Object} point1 - Primer punto {lat, lng}
 * @param {Object} point2 - Segundo punto {lat, lng}
 * @returns {number} - Distancia en kilómetros
 */
export const calculateDistance = (point1, point2) => {
  if (!areValidCoordinates(point1.lat, point1.lng) || 
      !areValidCoordinates(point2.lat, point2.lng)) {
    return 0;
  }
  
  const R = 6371; // Radio de la Tierra en km
  
  // Convertir a radianes
  const lat1 = parseFloat(point1.lat) * Math.PI / 180;
  const lng1 = parseFloat(point1.lng) * Math.PI / 180;
  const lat2 = parseFloat(point2.lat) * Math.PI / 180;
  const lng2 = parseFloat(point2.lng) * Math.PI / 180;
  
  // Diferencias
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  
  // Fórmula de Haversine
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1) * Math.cos(lat2) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return parseFloat(distance.toFixed(2));
};

/**
 * Verifica si un hotel tiene coordenadas válidas
 * 
 * @param {Object} hotel - Objeto hotel a validar
 * @returns {boolean} - true si el hotel tiene coordenadas válidas, false en caso contrario
 */
export const hotelHasValidCoordinates = (hotel) => {
  if (!hotel) return false;
  
  // Verificar si el hotel tiene lat/lng directamente
  if (hotel.latitude !== undefined && hotel.longitude !== undefined) {
    return areValidCoordinates(hotel.latitude, hotel.longitude);
  }
  
  // Verificar si el hotel tiene coordenadas en formato anidado
  if (hotel.coordinates) {
    // Formato {lat, lng}
    if (hotel.coordinates.lat !== undefined && hotel.coordinates.lng !== undefined) {
      return areValidCoordinates(hotel.coordinates.lat, hotel.coordinates.lng);
    }
    
    // Formato {latitude, longitude}
    if (hotel.coordinates.latitude !== undefined && hotel.coordinates.longitude !== undefined) {
      return areValidCoordinates(hotel.coordinates.latitude, hotel.coordinates.longitude);
    }
  }
  
  // Verificar si el hotel tiene direccion con coordenadas
  if (hotel.direccion && hotel.direccion.coordenadas) {
    if (hotel.direccion.coordenadas.lat !== undefined && hotel.direccion.coordenadas.lng !== undefined) {
      return areValidCoordinates(hotel.direccion.coordenadas.lat, hotel.direccion.coordenadas.lng);
    }
  }
  
  return false;
};

/**
 * Extrae las coordenadas de un hotel independientemente del formato
 * 
 * @param {Object} hotel - Objeto hotel
 * @returns {Object|null} - Objeto con lat y lng o null si no hay coordenadas válidas
 */
export const extractHotelCoordinates = (hotel) => {
  if (!hotel) return null;
  
  // Verificar cada posible ubicación de las coordenadas
  
  // Formato directo
  if (hotel.latitude !== undefined && hotel.longitude !== undefined &&
      areValidCoordinates(hotel.latitude, hotel.longitude)) {
    return {
      lat: parseFloat(hotel.latitude),
      lng: parseFloat(hotel.longitude)
    };
  }
  
  // Formato anidado en coordinates
  if (hotel.coordinates) {
    // Formato {lat, lng}
    if (hotel.coordinates.lat !== undefined && hotel.coordinates.lng !== undefined &&
        areValidCoordinates(hotel.coordinates.lat, hotel.coordinates.lng)) {
      return {
        lat: parseFloat(hotel.coordinates.lat),
        lng: parseFloat(hotel.coordinates.lng)
      };
    }
    
    // Formato {latitude, longitude}
    if (hotel.coordinates.latitude !== undefined && hotel.coordinates.longitude !== undefined &&
        areValidCoordinates(hotel.coordinates.latitude, hotel.coordinates.longitude)) {
      return {
        lat: parseFloat(hotel.coordinates.latitude),
        lng: parseFloat(hotel.coordinates.longitude)
      };
    }
  }
  
  // Formato en direccion.coordenadas
  if (hotel.direccion && hotel.direccion.coordenadas) {
    if (hotel.direccion.coordenadas.lat !== undefined && hotel.direccion.coordenadas.lng !== undefined &&
        areValidCoordinates(hotel.direccion.coordenadas.lat, hotel.direccion.coordenadas.lng)) {
      return {
        lat: parseFloat(hotel.direccion.coordenadas.lat),
        lng: parseFloat(hotel.direccion.coordenadas.lng)
      };
    }
  }
  
  return null;
};