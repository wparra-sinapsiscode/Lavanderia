import { APP_CONFIG } from '../constants';

/**
 * Limpia todos los datos de localStorage 
 * @returns {boolean} True si se eliminaron los datos correctamente
 */
export const cleanAllLocalData = () => {
  try {
    // Eliminar todas las claves de localStorage relacionadas con la aplicación
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USER);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.HOTELS);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.SERVICES);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.USERS);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.THEME);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.AUDIT_LOG);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.BAG_LABELS);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.GUESTS);
    
    // También eliminar los tokens de autenticación
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    
    console.log('🧹 Todos los datos locales han sido eliminados');
    return true;
  } catch (error) {
    console.error('Error al limpiar datos locales:', error);
    return false;
  }
};

/**
 * Limpia datos específicos de localStorage
 * @param {string[]} keys - Claves de datos a limpiar
 * @returns {boolean} True si se eliminaron los datos correctamente
 */
export const cleanSpecificData = (keys = []) => {
  try {
    keys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`🧹 Datos específicos eliminados: ${keys.join(', ')}`);
    return true;
  } catch (error) {
    console.error('Error al limpiar datos específicos:', error);
    return false;
  }
};

/**
 * Desactiva la inicialización automática de datos de demostración
 */
export const disableAutoDemoData = () => {
  localStorage.setItem('fumy_limp_disable_demo', 'true');
  console.log('🚫 La inicialización automática de datos de demostración ha sido desactivada');
  
  // Dispatch a custom event to notify other components
  window.dispatchEvent(new CustomEvent('demo_data_changed', { 
    detail: { enabled: false }
  }));
};

/**
 * Habilita la inicialización automática de datos de demostración
 */
export const enableAutoDemoData = () => {
  localStorage.removeItem('fumy_limp_disable_demo');
  console.log('✅ La inicialización automática de datos de demostración ha sido habilitada');
  
  // Dispatch a custom event to notify other components
  window.dispatchEvent(new CustomEvent('demo_data_changed', { 
    detail: { enabled: true }
  }));
};

export default {
  cleanAllLocalData,
  cleanSpecificData,
  disableAutoDemoData,
  enableAutoDemoData
};