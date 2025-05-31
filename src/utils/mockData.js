import { serviceStorage } from './storage';

/**
 * Carga datos de prueba en el almacenamiento local para pruebas sin conexión
 */
export const loadMockServices = () => {
  const mockServices = [
    {
      "id": "8445ab3c-d6d6-41d3-94ca-e2e60cf5ef2f",
      "guestName": "thtahtaeth",
      "roomNumber": "304",
      "hotelId": "57b95f4e-abfc-4a31-a6db-bdb6bfee4f39",
      "bagCount": 1,
      "weight": null,
      "observations": "5<rgg",
      "specialInstructions": "",
      "priority": "MEDIA",
      "pickupDate": null,
      "estimatedPickupDate": "2025-05-31T01:15:23.908Z",
      "labeledDate": null,
      "deliveryDate": null,
      "estimatedDeliveryDate": "2025-06-01T23:15:23.908Z",
      "status": "PENDING_PICKUP",
      "photos": [],
      "signature": null,
      "collectorName": null,
      "geolocation": null,
      "repartidorId": null, // Ya no asignamos repartidor específico
      "deliveryRepartidorId": null,
      "partialDeliveryPercentage": null,
      "price": null,
      "pickupTimeSlot": "9:00 - 11:00",
      "customerNotes": null,
      "internalNotes": null,
      "labelingPhotos": [],
      "deliveryPhotos": [],
      "deliveredBagCount": null,
      "remainingBags": null,
      "createdAt": "2025-05-30T23:15:23.909Z",
      "updatedAt": "2025-05-30T23:15:23.909Z",
      "hotel": {
        "name": "jstrjsjstj",
        "zone": "ESTE"
      },
      "repartidor": null // Ya no incluimos un repartidor
    },
    {
      "id": "a9b2d867-29b3-49de-af3d-2fe461f9982f",
      "guestName": "thtahtaeth",
      "roomNumber": "304",
      "hotelId": "57b95f4e-abfc-4a31-a6db-bdb6bfee4f39",
      "bagCount": 1,
      "weight": null,
      "observations": "eg<g<g",
      "specialInstructions": "",
      "priority": "MEDIA",
      "pickupDate": null,
      "estimatedPickupDate": "2025-05-31T01:15:06.106Z",
      "labeledDate": null,
      "deliveryDate": null,
      "estimatedDeliveryDate": "2025-06-01T23:15:06.106Z",
      "status": "PENDING_PICKUP",
      "photos": [],
      "signature": null,
      "collectorName": null,
      "geolocation": null,
      "repartidorId": "1dadd5b3-006c-4776-9dfb-ca687698e6a5",
      "deliveryRepartidorId": null,
      "partialDeliveryPercentage": null,
      "price": null,
      "pickupTimeSlot": "9:00 - 11:00",
      "customerNotes": null,
      "internalNotes": null,
      "labelingPhotos": [],
      "deliveryPhotos": [],
      "deliveredBagCount": null,
      "remainingBags": null,
      "createdAt": "2025-05-30T23:15:06.108Z",
      "updatedAt": "2025-05-30T23:15:06.108Z",
      "hotel": {
        "name": "jstrjsjstj",
        "zone": "ESTE"
      },
      "repartidor": {
        "name": "Repartidor ESTE"
      }
    },
    {
      "id": "6538c6a2-6e27-4e0f-a0a7-fd1b67060595",
      "guestName": "thtahtaeth",
      "roomNumber": "101",
      "hotelId": "57b95f4e-abfc-4a31-a6db-bdb6bfee4f39",
      "bagCount": 1,
      "weight": null,
      "observations": "<geg<g",
      "specialInstructions": "",
      "priority": "ALTA",
      "pickupDate": null,
      "estimatedPickupDate": "2025-05-31T01:14:57.420Z",
      "labeledDate": null,
      "deliveryDate": null,
      "estimatedDeliveryDate": "2025-05-31T23:14:57.420Z",
      "status": "PENDING_PICKUP",
      "photos": [],
      "signature": null,
      "collectorName": null,
      "geolocation": null,
      "repartidorId": "1dadd5b3-006c-4776-9dfb-ca687698e6a5",
      "deliveryRepartidorId": null,
      "partialDeliveryPercentage": null,
      "price": null,
      "pickupTimeSlot": "9:00 - 11:00",
      "customerNotes": null,
      "internalNotes": null,
      "labelingPhotos": [],
      "deliveryPhotos": [],
      "deliveredBagCount": null,
      "remainingBags": null,
      "createdAt": "2025-05-30T23:14:57.422Z",
      "updatedAt": "2025-05-30T23:14:57.422Z",
      "hotel": {
        "name": "jstrjsjstj",
        "zone": "ESTE"
      },
      "repartidor": {
        "name": "Repartidor ESTE"
      }
    },
    {
      "id": "65cb8164-cbb5-41ff-8e86-d0ef240ce16c",
      "guestName": "williams parra",
      "roomNumber": "454",
      "hotelId": "1905e98d-e42e-4f35-8ee7-fbe14516e210",
      "bagCount": 1,
      "weight": null,
      "observations": "<eg<g",
      "specialInstructions": "",
      "priority": "NORMAL",
      "pickupDate": null,
      "estimatedPickupDate": "2025-05-31T01:14:31.314Z",
      "labeledDate": null,
      "deliveryDate": null,
      "estimatedDeliveryDate": "2025-06-01T23:14:31.314Z",
      "status": "PENDING_PICKUP",
      "photos": [],
      "signature": null,
      "collectorName": null,
      "geolocation": null,
      "repartidorId": "d5e3aa5d-b418-416c-b802-1a1f65363573",
      "deliveryRepartidorId": null,
      "partialDeliveryPercentage": null,
      "price": null,
      "pickupTimeSlot": "9:00 - 11:00",
      "customerNotes": null,
      "internalNotes": null,
      "labelingPhotos": [],
      "deliveryPhotos": [],
      "deliveredBagCount": null,
      "remainingBags": null,
      "createdAt": "2025-05-30T23:14:31.316Z",
      "updatedAt": "2025-05-30T23:14:31.316Z",
      "hotel": {
        "name": "williams parra",
        "zone": "CENTRO"
      },
      "repartidor": {
        "name": "Repartidor CENTRO"
      }
    },
    {
      "id": "a5eba81a-0d54-4ea8-8026-a31afbfdba42",
      "guestName": "williams parra",
      "roomNumber": "434",
      "hotelId": "1905e98d-e42e-4f35-8ee7-fbe14516e210",
      "bagCount": 1,
      "weight": null,
      "observations": "<eg<g",
      "specialInstructions": "",
      "priority": "NORMAL",
      "pickupDate": null,
      "estimatedPickupDate": "2025-05-31T01:14:15.940Z",
      "labeledDate": null,
      "deliveryDate": null,
      "estimatedDeliveryDate": "2025-06-01T23:14:15.940Z",
      "status": "PENDING_PICKUP",
      "photos": [],
      "signature": null,
      "collectorName": null,
      "geolocation": null,
      "repartidorId": "d5e3aa5d-b418-416c-b802-1a1f65363573",
      "deliveryRepartidorId": null,
      "partialDeliveryPercentage": null,
      "price": null,
      "pickupTimeSlot": "9:00 - 11:00",
      "customerNotes": null,
      "internalNotes": null,
      "labelingPhotos": [],
      "deliveryPhotos": [],
      "deliveredBagCount": null,
      "remainingBags": null,
      "createdAt": "2025-05-30T23:14:15.942Z",
      "updatedAt": "2025-05-30T23:14:15.942Z",
      "hotel": {
        "name": "williams parra",
        "zone": "CENTRO"
      },
      "repartidor": {
        "name": "Repartidor CENTRO"
      }
    },
    {
      "id": "ec334e5d-911b-4715-8307-6dab4c2a4acd",
      "guestName": "williams parra3",
      "roomNumber": "213",
      "hotelId": "0634d6be-3394-4de8-882a-69c7307bfa57",
      "bagCount": 1,
      "weight": null,
      "observations": "<<ge",
      "specialInstructions": "",
      "priority": "MEDIA",
      "pickupDate": null,
      "estimatedPickupDate": "2025-05-31T01:14:05.652Z",
      "labeledDate": null,
      "deliveryDate": null,
      "estimatedDeliveryDate": "2025-06-01T23:14:05.652Z",
      "status": "PENDING_PICKUP",
      "photos": [],
      "signature": null,
      "collectorName": null,
      "geolocation": null,
      "repartidorId": "9c386191-79cb-4494-8de7-0cf828394d7e",
      "deliveryRepartidorId": null,
      "partialDeliveryPercentage": null,
      "price": null,
      "pickupTimeSlot": "9:00 - 11:00",
      "customerNotes": null,
      "internalNotes": null,
      "labelingPhotos": [],
      "deliveryPhotos": [],
      "deliveredBagCount": null,
      "remainingBags": null,
      "createdAt": "2025-05-30T23:14:05.653Z",
      "updatedAt": "2025-05-30T23:14:05.653Z",
      "hotel": {
        "name": "efefefefef",
        "zone": "NORTE"
      },
      "repartidor": {
        "name": "Repartidor NORTE"
      }
    },
    {
      "id": "cc086922-93e7-43bf-aaa5-2886017f6b32",
      "guestName": "williams parra3",
      "roomNumber": "101",
      "hotelId": "0634d6be-3394-4de8-882a-69c7307bfa57",
      "bagCount": 1,
      "weight": null,
      "observations": "<eg<ge",
      "specialInstructions": "",
      "priority": "ALTA",
      "pickupDate": null,
      "estimatedPickupDate": "2025-05-31T01:13:49.387Z",
      "labeledDate": null,
      "deliveryDate": null,
      "estimatedDeliveryDate": "2025-05-31T23:13:49.387Z",
      "status": "PENDING_PICKUP",
      "photos": [],
      "signature": null,
      "collectorName": null,
      "geolocation": null,
      "repartidorId": "9c386191-79cb-4494-8de7-0cf828394d7e",
      "deliveryRepartidorId": null,
      "partialDeliveryPercentage": null,
      "price": null,
      "pickupTimeSlot": "9:00 - 11:00",
      "customerNotes": null,
      "internalNotes": null,
      "labelingPhotos": [],
      "deliveryPhotos": [],
      "deliveredBagCount": null,
      "remainingBags": null,
      "createdAt": "2025-05-30T23:13:49.388Z",
      "updatedAt": "2025-05-30T23:13:49.388Z",
      "hotel": {
        "name": "efefefefef",
        "zone": "NORTE"
      },
      "repartidor": {
        "name": "Repartidor NORTE"
      }
    },
    {
      "id": "224115bb-dcc5-48c9-b964-3d1f1e996104",
      "guestName": "williams parra3",
      "roomNumber": "304",
      "hotelId": "0634d6be-3394-4de8-882a-69c7307bfa57",
      "bagCount": 1,
      "weight": null,
      "observations": "efgeGeG",
      "specialInstructions": "",
      "priority": "ALTA",
      "pickupDate": null,
      "estimatedPickupDate": "2025-05-31T01:13:35.201Z",
      "labeledDate": null,
      "deliveryDate": null,
      "estimatedDeliveryDate": "2025-05-31T23:13:35.201Z",
      "status": "PENDING_PICKUP",
      "photos": [],
      "signature": null,
      "collectorName": null,
      "geolocation": null,
      "repartidorId": "9c386191-79cb-4494-8de7-0cf828394d7e",
      "deliveryRepartidorId": null,
      "partialDeliveryPercentage": null,
      "price": null,
      "pickupTimeSlot": "9:00 - 11:00",
      "customerNotes": null,
      "internalNotes": null,
      "labelingPhotos": [],
      "deliveryPhotos": [],
      "deliveredBagCount": null,
      "remainingBags": null,
      "createdAt": "2025-05-30T23:13:35.202Z",
      "updatedAt": "2025-05-30T23:13:35.202Z",
      "hotel": {
        "name": "efefefefef",
        "zone": "NORTE"
      },
      "repartidor": {
        "name": "Repartidor NORTE"
      }
    },
    {
      "id": "a366d2dd-3ca5-4ec3-a720-4e70000524e2",
      "guestName": "williams parra",
      "roomNumber": "101",
      "hotelId": "1905e98d-e42e-4f35-8ee7-fbe14516e210",
      "bagCount": 1,
      "weight": null,
      "observations": "jonorgnr",
      "specialInstructions": "",
      "priority": "MEDIA",
      "pickupDate": null,
      "estimatedPickupDate": "2025-05-31T00:07:12.992Z",
      "labeledDate": null,
      "deliveryDate": null,
      "estimatedDeliveryDate": "2025-06-01T22:07:12.992Z",
      "status": "PENDING_PICKUP",
      "photos": [],
      "signature": null,
      "collectorName": null,
      "geolocation": null,
      "repartidorId": "d5e3aa5d-b418-416c-b802-1a1f65363573",
      "deliveryRepartidorId": null,
      "partialDeliveryPercentage": null,
      "price": null,
      "pickupTimeSlot": "9:00 - 11:00",
      "customerNotes": null,
      "internalNotes": null,
      "labelingPhotos": [],
      "deliveryPhotos": [],
      "deliveredBagCount": null,
      "remainingBags": null,
      "createdAt": "2025-05-30T22:07:12.994Z",
      "updatedAt": "2025-05-30T22:07:12.994Z",
      "hotel": {
        "name": "williams parra",
        "zone": "CENTRO"
      },
      "repartidor": {
        "name": "Repartidor CENTRO"
      }
    }
  ];

  // Agregar los servicios al almacenamiento local
  serviceStorage.setServices(mockServices);
  
  console.log(`📦 Datos de prueba cargados: ${mockServices.length} servicios`);
  return mockServices;
};

/**
 * Agrega la información de zona (hotelZone) a cada servicio para facilitar el filtrado
 */
export const addZoneInfoToServices = () => {
  const services = serviceStorage.getServices();
  
  const updatedServices = services.map(service => {
    // Si ya tiene hotelZone, no hacemos nada
    if (service.hotelZone) return service;
    
    // Extraer la zona del hotel si está disponible
    const hotelZone = service.hotel?.zone || null;
    
    return {
      ...service,
      hotelZone: hotelZone // Agregar la zona como propiedad directa
    };
  });
  
  serviceStorage.setServices(updatedServices);
  console.log(`🔄 Información de zona agregada a ${updatedServices.length} servicios`);
  return updatedServices;
};

/**
 * Carga datos de hoteles de prueba en el almacenamiento local
 */
export const loadMockHotels = () => {
  const mockHotels = [
    {
      "id": "57b95f4e-abfc-4a31-a6db-bdb6bfee4f39",
      "name": "jstrjsjstj",
      "address": "Calle Test 123, ESTE",
      "zone": "ESTE",
      "bagInventory": 100,
      "phone": "555-123-4567",
      "contactPerson": "Juan Pérez"
    },
    {
      "id": "1905e98d-e42e-4f35-8ee7-fbe14516e210", 
      "name": "williams parra",
      "address": "Avenida Central 456, CENTRO",
      "zone": "CENTRO",
      "bagInventory": 200,
      "phone": "555-987-6543",
      "contactPerson": "María González"
    },
    {
      "id": "0634d6be-3394-4de8-882a-69c7307bfa57",
      "name": "efefefefef",
      "address": "Boulevard Norte 789, NORTE",
      "zone": "NORTE",
      "bagInventory": 339,
      "phone": "555-456-7890",
      "contactPerson": "Roberto Sánchez"
    }
  ];
  
  // Guardar hoteles en almacenamiento local
  import('./storage').then(({ storage }) => {
    storage.set('hotels', mockHotels);
    console.log(`🏨 Datos de prueba de hoteles cargados: ${mockHotels.length} hoteles`);
  });
  
  return mockHotels;
};

/**
 * Carga datos de repartidores de prueba en el almacenamiento local
 */
export const loadMockRepartidores = () => {
  const mockRepartidores = [
    {
      "id": "1dadd5b3-006c-4776-9dfb-ca687698e6a5",
      "name": "Repartidor ESTE",
      "zone": "ESTE",
      "role": "REPARTIDOR",
      "active": true,
      "phone": "1234567890"
    },
    {
      "id": "d5e3aa5d-b418-416c-b802-1a1f65363573",
      "name": "Repartidor CENTRO",
      "zone": "CENTRO",
      "role": "REPARTIDOR",
      "active": true,
      "phone": "0987654321"
    },
    {
      "id": "9c386191-79cb-4494-8de7-0cf828394d7e",
      "name": "Repartidor NORTE",
      "zone": "NORTE",
      "role": "REPARTIDOR",
      "active": true,
      "phone": "5555555555"
    }
  ];
  
  // Guardar repartidores en almacenamiento local
  import('./storage').then(({ storage }) => {
    storage.set('users', mockRepartidores);
    storage.set('repartidores', mockRepartidores);
    console.log(`👷 Datos de prueba de repartidores cargados: ${mockRepartidores.length} repartidores`);
  });
  
  return mockRepartidores;
};

/**
 * Elimina los repartidores asignados de todos los servicios
 * para usar el nuevo modelo basado en zonas
 */
export const removeRepartidoresFromServices = () => {
  const services = serviceStorage.getServices();
  
  // Recorrer todos los servicios y quitar las asignaciones a repartidores
  const updatedServices = services.map(service => ({
    ...service,
    repartidorId: null,  // Eliminar asignación específica a repartidor
    repartidor: null     // Eliminar referencia al objeto repartidor
  }));
  
  // Guardar los servicios actualizados
  serviceStorage.setServices(updatedServices);
  
  console.log(`🔄 Repartidores eliminados de ${updatedServices.length} servicios para usar modelo por zonas`);
  return updatedServices;
};

/**
 * Inicializa todos los datos de prueba de una vez
 */
export const initMockData = () => {
  loadMockServices();
  loadMockHotels();
  loadMockRepartidores();
  addZoneInfoToServices();
  removeRepartidoresFromServices(); // Eliminar repartidores asignados para usar modelo por zonas
  
  console.log('✅ Todos los datos de prueba han sido inicializados');
};