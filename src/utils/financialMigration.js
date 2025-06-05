// Utilidades para migración financiera - NO modifica código existente
// Solo agrega funcionalidad nueva

import { serviceStorage, hotelStorage } from './storage';
import transactionService from '../services/transaction.service';
import { calculateServicePrice } from './index';

// Configuración de precios por defecto
const PRICING_CONFIG = {
  // Precio promedio por bolsa cuando no hay peso
  AVERAGE_PRICE_PER_BAG: 25, // S/ 25 por bolsa
  // Precio mínimo por servicio
  MINIMUM_SERVICE_PRICE: 20, // S/ 20 mínimo
  // Precio por kg por defecto si hotel no tiene precio
  DEFAULT_PRICE_PER_KG: 10 // S/ 10 por kg
};

/**
 * Calcula el precio de un servicio basado en los datos disponibles
 * @param {Object} service - Servicio a calcular precio
 * @param {Object} hotel - Hotel del servicio
 * @returns {number} Precio calculado
 */
export const calculateMissingPrice = (service, hotel) => {
  // Si ya tiene precio válido, devolverlo
  if (service.price && service.price > 0) {
    return service.price;
  }

  // Opción 1: Si tiene peso y hotel con precio por kg
  if (service.weight && service.weight > 0 && hotel && hotel.pricePerKg) {
    return calculateServicePrice(service.weight, hotel.pricePerKg);
  }

  // Opción 2: Si tiene peso pero no precio del hotel, usar precio por defecto
  if (service.weight && service.weight > 0) {
    return calculateServicePrice(service.weight, PRICING_CONFIG.DEFAULT_PRICE_PER_KG);
  }

  // Opción 3: Calcular por cantidad de bolsas
  if (service.bagCount && service.bagCount > 0) {
    const calculatedPrice = service.bagCount * PRICING_CONFIG.AVERAGE_PRICE_PER_BAG;
    return Math.max(calculatedPrice, PRICING_CONFIG.MINIMUM_SERVICE_PRICE);
  }

  // Opción 4: Precio mínimo por defecto
  return PRICING_CONFIG.MINIMUM_SERVICE_PRICE;
};

/**
 * Verifica si un servicio ya tiene una transacción asociada
 * @param {string} serviceId - ID del servicio
 * @returns {boolean} true si ya existe transacción
 */
export const serviceHasTransaction = async (serviceId) => {
  try {
    // 🔧 CORRECCIÓN: Usar API en lugar de financeStorage
    const response = await transactionService.getAllTransactions();
    if (response.success && response.data) {
      return response.data.some(t => 
        (t.serviceId === serviceId || t.metadata?.serviceId === serviceId) && 
        (t.type === 'income' || t.type === 'INCOME')
      );
    }
    return false;
  } catch (error) {
    console.warn('Error verificando transacciones, asumiendo que no existe:', error);
    // En caso de error, asumir que no existe para permitir crear una nueva
    return false;
  }
};

/**
 * Crea una transacción para un servicio
 * @param {Object} service - Servicio
 * @param {Object} hotel - Hotel del servicio
 * @param {number} amount - Monto de la transacción
 * @param {string} source - Origen (PICKUP, MIGRATION, etc)
 */
export const createServiceTransaction = async (service, hotel, amount, source = 'MIGRATION') => {
  const transaction = {
    type: 'income', // Usar minúsculas para compatibilidad con API
    amount: amount,
    description: `Servicio de lavandería - ${service.guestName} - Hab. ${service.roomNumber}`,
    date: service.pickupDate || service.createdAt || new Date().toISOString(),
    paymentMethod: 'pending',
    category: 'servicio_lavanderia',
    serviceId: service.id,
    hotelId: service.hotelId || hotel?.id,
    hotelName: hotel?.name || service.hotel,
    source: source, // Para identificar origen
    notes: source === 'MIGRATION' ? 'Transacción creada por migración' : 'Transacción automática',
    metadata: {
      serviceId: service.id,
      guestName: service.guestName,
      roomNumber: service.roomNumber,
      source: source
    }
  };

  // ✅ Usar API para crear la transacción
  try {
    const response = await transactionService.createTransaction(transaction);
    if (response.success) {
      console.log('Transacción creada exitosamente:', response.data.id);
      return response.data;
    } else {
      throw new Error(response.message || 'Error al crear transacción');
    }
  } catch (error) {
    console.error('Error creando transacción:', error);
    throw error;
  }
};

/**
 * Migra servicios existentes sin precio y crea transacciones faltantes
 * @returns {Object} Resumen de la migración
 */
export const migrateExistingServices = async () => {
  const services = serviceStorage.getServices();
  const hotels = hotelStorage.getHotels();
  
  const results = {
    totalProcessed: 0,
    pricesCalculated: 0,
    transactionsCreated: 0,
    errors: [],
    details: []
  };

  // Filtrar servicios que necesitan procesamiento
  const servicesToProcess = services.filter(service => {
    // Solo procesar servicios recogidos o superiores
    const validStatuses = ['PICKED_UP', 'LABELED', 'IN_PROCESS', 'PARTIAL_DELIVERY', 'COMPLETED'];
    const statusToCheck = service.status.toUpperCase().replace(/_/g, '_');
    
    return validStatuses.includes(statusToCheck) || 
           validStatuses.some(status => status.toLowerCase() === service.status.toLowerCase());
  });

  for (const service of servicesToProcess) {
    try {
      results.totalProcessed++;
      
      // Encontrar el hotel del servicio
      let hotel = null;
      if (service.hotelId) {
        hotel = hotels.find(h => h.id === service.hotelId);
      } else if (service.hotel) {
        hotel = hotels.find(h => h.name === service.hotel);
      }

      // Paso 1: Calcular precio si no existe
      const originalPrice = service.price;
      if (!service.price || service.price === 0) {
        const calculatedPrice = calculateMissingPrice(service, hotel);
        
        // Actualizar el servicio con el nuevo precio
        const updatedService = {
          ...service,
          price: calculatedPrice,
          priceCalculationMethod: service.weight ? 'WEIGHT' : 'BAG_COUNT',
          priceCalculatedAt: new Date().toISOString()
        };
        
        serviceStorage.updateService(service.id, updatedService);

        results.pricesCalculated++;
        results.details.push({
          serviceId: service.id,
          guest: service.guestName,
          action: 'PRICE_CALCULATED',
          oldPrice: originalPrice,
          newPrice: calculatedPrice,
          method: service.weight ? 'Por peso' : 'Por bolsas'
        });
      }

      // Paso 2: Crear transacción si no existe
      const finalPrice = service.price || calculateMissingPrice(service, hotel);
      const hasTransaction = await serviceHasTransaction(service.id);
      
      if (finalPrice > 0 && !hasTransaction) {
        const transaction = await createServiceTransaction(service, hotel, finalPrice, 'MIGRATION');
        
        results.transactionsCreated++;
        results.details.push({
          serviceId: service.id,
          guest: service.guestName,
          action: 'TRANSACTION_CREATED',
          transactionId: transaction.id,
          amount: finalPrice
        });
      }

    } catch (error) {
      results.errors.push({
        serviceId: service.id,
        guest: service.guestName,
        error: error.message
      });
    }
  }

  // Guardar resumen de migración
  const migrationSummary = {
    id: `migration-${Date.now()}`,
    date: new Date().toISOString(),
    results: results,
    executedBy: 'System Migration'
  };

  // Migration audit should be stored via API
  console.log('Migration completed:', migrationSummary);

  return results;
};

/**
 * Previsualiza lo que haría la migración sin ejecutarla
 * @returns {Object} Resumen de lo que se migraría
 */
export const previewMigration = async () => {
  const services = serviceStorage.getServices();
  const hotels = hotelStorage.getHotels();
  
  const preview = {
    servicesWithoutPrice: [],
    servicesWithoutTransaction: [],
    totalPotentialIncome: 0
  };

  const validStatuses = ['PICKED_UP', 'LABELED', 'IN_PROCESS', 'PARTIAL_DELIVERY', 'COMPLETED'];
  
  for (const service of services) {
    const statusToCheck = service.status.toUpperCase();
    if (!validStatuses.includes(statusToCheck) && 
        !validStatuses.some(status => status.toLowerCase() === service.status.toLowerCase())) {
      continue;
    }

    let hotel = null;
    if (service.hotelId) {
      hotel = hotels.find(h => h.id === service.hotelId);
    } else if (service.hotel) {
      hotel = hotels.find(h => h.name === service.hotel);
    }

    // Verificar servicios sin precio
    if (!service.price || service.price === 0) {
      const estimatedPrice = calculateMissingPrice(service, hotel);
      preview.servicesWithoutPrice.push({
        id: service.id,
        guest: service.guestName,
        room: service.roomNumber,
        hotel: hotel?.name || service.hotel,
        status: service.status,
        weight: service.weight,
        bags: service.bagCount,
        estimatedPrice: estimatedPrice,
        calculationMethod: service.weight ? 'Por peso' : 'Por bolsas'
      });
      preview.totalPotentialIncome += estimatedPrice;
    } else {
      // Verificar servicios con precio pero sin transacción
      const hasTransaction = await serviceHasTransaction(service.id);
      if (!hasTransaction) {
        preview.servicesWithoutTransaction.push({
          id: service.id,
          guest: service.guestName,
          room: service.roomNumber,
          hotel: hotel?.name || service.hotel,
          status: service.status,
          price: service.price
        });
        preview.totalPotentialIncome += service.price;
      }
    }
  }

  return preview;
};

// Función auxiliar para crear transacción desde PickupForm
export const createPickupTransaction = async (service, hotel, price) => {
  try {
    // Verificar que no exista ya una transacción
    const hasTransaction = await serviceHasTransaction(service.id);
    if (hasTransaction) {
      console.log('Ya existe transacción para este servicio');
      return null;
    }

    const transaction = await createServiceTransaction(service, hotel, price, 'PICKUP');
    console.log('Transacción de pickup creada exitosamente:', transaction.id);
    return transaction;
  } catch (error) {
    console.error('Error al crear transacción de pickup:', error);
    throw error;
  }
};