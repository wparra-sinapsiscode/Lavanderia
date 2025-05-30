import { API_BASE_URL } from './api.config';

/**
 * Servicio para manejar operaciones de geocodificación
 */
class GeocodeService {
  /**
   * Busca direcciones usando el servicio de geocodificación
   * @param {string} query - Texto a buscar
   * @param {number} limit - Número máximo de resultados
   * @returns {Promise<Array>} Lista de direcciones encontradas
   */
  async searchAddresses(query, limit = 5) {
    try {
      // Agregamos "Lima, Perú" al texto de búsqueda para enfocar resultados en Lima Metropolitana
      const searchText = `${query}, Lima, Perú`;
      
      const response = await fetch(
        `${API_BASE_URL}/geocode/search?q=${encodeURIComponent(searchText)}&limit=${limit}`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Error al buscar direcciones');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error en búsqueda de direcciones:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene una dirección a partir de coordenadas GPS
   * @param {number} lat - Latitud
   * @param {number} lng - Longitud
   * @returns {Promise<Object>} Datos de la dirección
   */
  async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/geocode/reverse?lat=${lat}&lon=${lng}&zoom=18`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener dirección desde coordenadas');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error en geocodificación inversa:', error);
      throw error;
    }
  }
  
  /**
   * Determina la zona de Lima basada en la dirección
   * @param {string} direccion - Dirección completa
   * @returns {string} Código de zona (NORTE, SUR, ESTE, OESTE, CENTRO)
   */
  determinarZona(direccion) {
    // Lista de distritos por zona
    const zonas = {
      NORTE: ['ancón', 'carabayllo', 'comas', 'independencia', 'los olivos', 'puente piedra', 'san martín de porres', 'santa rosa'],
      SUR: ['chorrillos', 'lurín', 'pachacámac', 'pucusana', 'punta hermosa', 'punta negra', 'san bartolo', 'san juan de miraflores', 'santa maría del mar', 'villa el salvador', 'villa maría del triunfo'],
      ESTE: ['ate', 'chaclacayo', 'cieneguilla', 'el agustino', 'la molina', 'lurigancho', 'chosica', 'san juan de lurigancho', 'santa anita'],
      CENTRO: ['barranco', 'breña', 'jesús maría', 'la victoria', 'lima', 'cercado', 'lince', 'magdalena', 'miraflores', 'pueblo libre', 'rímac', 'san borja', 'san isidro', 'san luis', 'san miguel', 'santiago de surco', 'surco', 'surquillo'],
      OESTE: ['bellavista', 'callao', 'carmen de la legua', 'la perla', 'la punta', 'mi perú', 'ventanilla']
    };
    
    if (!direccion) return 'SUR'; // Valor por defecto
    
    const direccionLower = direccion.toLowerCase();
    
    // Buscar zona basada en distritos mencionados en la dirección
    for (const [zona, distritos] of Object.entries(zonas)) {
      for (const distrito of distritos) {
        if (direccionLower.includes(distrito)) {
          return zona;
        }
      }
    }
    
    // Si no se encuentra ninguna coincidencia, devolver SUR como valor predeterminado
    return 'SUR';
  }
}

export default new GeocodeService();