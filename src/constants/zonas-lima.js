/**
 * Definición de distritos por zonas de Lima Metropolitana
 * 
 * Cada zona contiene un array de nombres de distritos que se usará para detectar
 * automáticamente la zona basándose en la dirección seleccionada.
 * 
 * También incluye variantes en la escritura, como "La Molina" y "Lamolina" para 
 * aumentar la probabilidad de detección correcta.
 */

export const DISTRITOS_POR_ZONA = {
  // Lima Norte
  NORTE: [
    'Ancón', 'Ancon',
    'Carabayllo',
    'Comas',
    'Independencia',
    'Los Olivos', 'Olivos',
    'Puente Piedra',
    'San Martín de Porres', 'San Martin de Porres',
    'Santa Rosa'
  ],
  
  // Lima Sur
  SUR: [
    'Chorrillos',
    'Lurín', 'Lurin',
    'Pachacámac', 'Pachacamac',
    'Pucusana',
    'Punta Hermosa',
    'Punta Negra',
    'San Bartolo',
    'San Juan de Miraflores',
    'Santa María del Mar', 'Santa Maria del Mar',
    'Villa El Salvador',
    'Villa María del Triunfo', 'Villa Maria del Triunfo'
  ],
  
  // Lima Este
  ESTE: [
    'Ate',
    'Chaclacayo',
    'Cieneguilla',
    'El Agustino',
    'La Molina', 'Lamolina',
    'Lurigancho', 'Chosica',
    'San Juan de Lurigancho',
    'Santa Anita'
  ],
  
  // Lima Centro
  CENTRO: [
    'Barranco',
    'Breña', 'Brena',
    'Jesús María', 'Jesus Maria',
    'La Victoria',
    'Lima', 'Cercado', 'Cercado de Lima',
    'Lince',
    'Magdalena', 'Magdalena del Mar',
    'Miraflores',
    'Pueblo Libre',
    'Rímac', 'Rimac',
    'San Borja',
    'San Isidro',
    'San Luis',
    'San Miguel',
    'Santiago de Surco', 'Surco',
    'Surquillo'
  ],
  
  // Lima Oeste (Callao)
  OESTE: [
    'Bellavista',
    'Callao', 'Provincia Constitucional del Callao',
    'Carmen de la Legua Reynoso',
    'La Perla',
    'La Punta',
    'Mi Perú', 'Mi Peru',
    'Ventanilla'
  ]
};

/**
 * Determina la zona de Lima basándose en la dirección proporcionada
 * 
 * @param {string} direccion - La dirección completa a analizar
 * @param {string} defaultZona - Zona por defecto si no se encuentra ninguna coincidencia
 * @returns {string} - El código de zona (NORTE, SUR, ESTE, OESTE, CENTRO)
 */
export function determinarZona(direccion, defaultZona = 'CENTRO') {
  if (!direccion) return defaultZona;
  
  // Convertir a minúsculas para facilitar la comparación
  const direccionLower = direccion.toLowerCase();
  
  // Buscar menciones de distritos en la dirección
  for (const [zona, distritos] of Object.entries(DISTRITOS_POR_ZONA)) {
    for (const distrito of distritos) {
      // Comprobar si el distrito aparece como palabra completa en la dirección
      // Usamos \b para asegurar que es una palabra completa
      const regex = new RegExp(`\\b${distrito.toLowerCase()}\\b`);
      if (regex.test(direccionLower)) {
        return zona;
      }
    }
  }
  
  // Si no se encontró ninguna coincidencia, devolver la zona por defecto
  return defaultZona;
}