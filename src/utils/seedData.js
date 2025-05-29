import { generateId } from './index';
import { USER_ROLES, SERVICE_STATUS } from '../types';
import { hotelStorage, serviceStorage, storage, financeStorage, bagLabelStorage, auditStorage } from './storage';
import { APP_CONFIG } from '../constants';

// Updated hotels with realistic data for current system
export const SEED_HOTELS = [
  {
    id: generateId(),
    name: 'Hotel Los Delfines',
    address: 'Malecón de la Reserva 555, Miraflores',
    zone: 'Sur',
    contactPerson: 'Carmen Ruiz',
    phone: '987654321',
    email: 'carmen@delfines.com',
    bagInventory: 85,
    pricePerKg: 12.50
  },
  {
    id: generateId(),
    name: 'Hotel Country Club',
    address: 'Los Eucaliptos 590, San Isidro',
    zone: 'Centro',
    contactPerson: 'Roberto Silva',
    phone: '987654322',
    email: 'roberto@countryclub.com',
    bagInventory: 160,
    pricePerKg: 14.00
  },
  {
    id: generateId(),
    name: 'Hotel Sheraton',
    address: 'Paseo de la República 170, Lima Centro',
    zone: 'Centro',
    contactPerson: 'Ana García',
    phone: '987654323',
    email: 'ana@sheraton.com',
    bagInventory: 220,
    pricePerKg: 16.00
  },
  {
    id: generateId(),
    name: 'Hotel Marriott',
    address: 'Malecón de la Reserva 615, Miraflores',
    zone: 'Sur',
    contactPerson: 'Luis Mendoza',
    phone: '987654324',
    email: 'luis@marriott.com',
    bagInventory: 240,
    pricePerKg: 18.00
  },
  {
    id: generateId(),
    name: 'Hotel Hilton',
    address: 'Av. Malecón Balta 1301, Miraflores',
    zone: 'Sur',
    contactPerson: 'Patricia Vega',
    phone: '987654325',
    email: 'patricia@hilton.com',
    bagInventory: 200,
    pricePerKg: 15.50
  },
  {
    id: generateId(),
    name: 'Hotel Casa Andina',
    address: 'Av. Universitaria 1250, Los Olivos',
    zone: 'Norte',
    contactPerson: 'Miguel Ramírez',
    phone: '987654326',
    email: 'miguel@casaandina.com',
    bagInventory: 140,
    pricePerKg: 11.00
  },
  {
    id: generateId(),
    name: 'Hotel JW Marriott',
    address: 'Av. Larco 1550, Miraflores',
    zone: 'Sur',
    contactPerson: 'Sofia Mendoza',
    phone: '987654327',
    email: 'sofia@jwmarriott.com',
    bagInventory: 180,
    pricePerKg: 20.00
  },
  {
    id: generateId(),
    name: 'Hotel Westin',
    address: 'Calle Las Begonias 450, San Isidro',
    zone: 'Centro',
    contactPerson: 'Carlos Vargas',
    phone: '987654328',
    email: 'carlos@westin.com',
    bagInventory: 170,
    pricePerKg: 17.50
  }
];

// Updated users following current system logic
export const SEED_USERS = [
  {
    id: generateId(),
    name: 'María González',
    email: 'maria@fumylimp.com',
    role: USER_ROLES.ADMIN,
    zone: 'Administración',
    phone: '987654300',
    password: 'admin123'
  },
  {
    id: generateId(),
    name: 'Carlos Mendoza',
    email: 'carlos@fumylimp.com',
    role: USER_ROLES.REPARTIDOR,
    zone: 'Norte',
    phone: '987654301',
    password: 'repartidor123'
  },
  {
    id: generateId(),
    name: 'Ana Torres',
    email: 'ana@fumylimp.com',
    role: USER_ROLES.REPARTIDOR,
    zone: 'Sur',
    phone: '987654302',
    password: 'repartidor123'
  },
  {
    id: generateId(),
    name: 'José Ramírez',
    email: 'jose@fumylimp.com',
    role: USER_ROLES.REPARTIDOR,
    zone: 'Centro',
    phone: '987654303',
    password: 'repartidor123'
  },
  {
    id: generateId(),
    name: 'Diego Santos',
    email: 'diego@fumylimp.com',
    role: USER_ROLES.REPARTIDOR,
    zone: 'Este',
    phone: '987654304',
    password: 'repartidor123'
  }
];

// Generate services following current workflow logic
export const generateModernServices = (hotels, users) => {
  const services = [];
  const guestNames = [
    'Juan Carlos Pérez', 'María Elena García', 'Carlos Alberto López', 'Ana Sofía Martínez', 
    'Pedro Antonio Rodríguez', 'Laura Isabel Fernández', 'Miguel Ángel Torres', 'Carmen Rosa Ruiz',
    'David Francisco Silva', 'Elena Victoria Vega', 'Roberto Carlos Mendoza', 'Patricia Luz Santos',
    'Fernando José Castro', 'Isabel María Morales', 'Andrés Felipe Herrera', 'Sofia Alejandra Jiménez',
    'Raúl Eduardo Vargas', 'Claudia Mercedes Ramos', 'Jorge Luis Navarro', 'Cristina Beatriz Iglesias',
    'Gabriel Santiago Herrera', 'Marina Soledad Silva', 'Alejandro Miguel Castro', 'Valentina Nicole López',
    'Diego Sebastián Morales', 'Camila Andrea Guerrero', 'Leonardo Daniel Rojas', 'Antonella Paola Díaz'
  ];

  const observations = [
    'Ropa delicada, tratamiento especial requerido',
    'Incluye trajes formales para evento empresarial',
    'Solo ropa de cama premium del hotel',
    'Ropa deportiva de huéspedes corporativos',
    'Prendas de seda, requiere lavado en seco',
    'Ropa casual, lavado estándar',
    'Incluye uniformes ejecutivos',
    'Ropa infantil, detergente hipoalergénico',
    'Solo camisas blancas ejecutivas',
    'Ropa de colores oscuros, lavado separado',
    'Incluye vestido de gala para evento',
    'Ropa manchada con vino, tratamiento especial',
    'Solo toallas de baño de suite presidencial',
    'Ropa de ejercicio de gimnasio del hotel',
    'Prendas con bordados exclusivos'
  ];

  const specialInstructions = [
    'Cliente VIP - entrega prioritaria mañana temprano',
    'Dejar en recepción suite presidencial si no está presente',
    'Cliente empresarial muy exigente con tiempos',
    'Ropa vintage, manejar con extremo cuidado',
    'Urgente para evento de negocios esta tarde',
    'Cliente frecuente VIP, servicio premium',
    'Revisar minuciosamente todas las manchas',
    'Empacar por separado ropa blanca y de color',
    'Cliente solicita servicio express',
    'Coordinar entrega directa con concierge del hotel',
    null, null, null, null, null // Algunos sin instrucciones especiales
  ];

  const repartidores = users.filter(u => u.role === USER_ROLES.REPARTIDOR);

  // Generate services with realistic distribution following current workflow
  for (let i = 0; i < 120; i++) {
    const hotel = hotels[Math.floor(Math.random() * hotels.length)];
    const repartidor = repartidores[Math.floor(Math.random() * repartidores.length)];
    const bagCount = Math.floor(Math.random() * 15) + 1; // 1-15 bolsas
    const weight = parseFloat((Math.random() * 25 + 2).toFixed(1)); // 2-27 kg
    
    // Realistic status distribution following current workflow (only valid states)
    let status;
    const rand = Math.random();
    if (rand < 0.20) status = SERVICE_STATUS.PENDING_PICKUP; // 20% - Servicios pendientes
    else if (rand < 0.35) status = SERVICE_STATUS.PICKED_UP; // 15% - Recién recogidos
    else if (rand < 0.45) status = SERVICE_STATUS.LABELED; // 10% - Rotulados
    else if (rand < 0.60) status = SERVICE_STATUS.IN_PROCESS; // 15% - En proceso
    else if (rand < 0.75) status = SERVICE_STATUS.PARTIAL_DELIVERY; // 15% - Entrega parcial
    else if (rand < 0.95) status = SERVICE_STATUS.COMPLETED; // 20% - Completados
    else status = SERVICE_STATUS.CANCELLED; // 5% - Cancelados
    
    const baseDate = new Date();
    const daysAgo = Math.floor(Math.random() * 30); // Últimos 30 días
    baseDate.setDate(baseDate.getDate() - daysAgo);
    
    // Realistic pickup times
    const pickupHour = Math.floor(Math.random() * 4) + 8; // 8-12 AM
    const pickupMinutes = Math.floor(Math.random() * 60);
    baseDate.setHours(pickupHour, pickupMinutes, 0, 0);

    // Calculate dates based on current workflow logic
    let deliveryDate = null;
    let labeledDate = null;
    let estimatedDeliveryDate = null;
    
    if (status === SERVICE_STATUS.COMPLETED) {
      labeledDate = new Date(baseDate.getTime() + (4 * 60 * 60 * 1000)); // 4 hours after pickup
      deliveryDate = new Date(baseDate.getTime() + (48 * 60 * 60 * 1000)); // 2 days later
      deliveryDate.setHours(Math.floor(Math.random() * 6) + 14, Math.floor(Math.random() * 60));
    } else if ([SERVICE_STATUS.LABELED, SERVICE_STATUS.IN_PROCESS, 
                SERVICE_STATUS.PARTIAL_DELIVERY].includes(status)) {
      labeledDate = new Date(baseDate.getTime() + (4 * 60 * 60 * 1000));
      if (status !== SERVICE_STATUS.LABELED) {
        estimatedDeliveryDate = new Date(baseDate.getTime() + (48 * 60 * 60 * 1000));
      }
    }

    const priority = Math.random() < 0.25 ? 'alta' : Math.random() < 0.6 ? 'media' : 'normal';
    const assignedRepartidor = Math.random() < 0.9 ? repartidor : null;

    const service = {
      id: generateId(),
      guestName: guestNames[Math.floor(Math.random() * guestNames.length)],
      roomNumber: Math.floor(Math.random() * 500) + 101,
      hotel: hotel.name,
      hotelId: hotel.id,
      hotelName: hotel.name,
      bagCount,
      weight: status === SERVICE_STATUS.PENDING_PICKUP ? null : weight,
      observations: observations[Math.floor(Math.random() * observations.length)],
      specialInstructions: specialInstructions[Math.floor(Math.random() * specialInstructions.length)],
      priority,
      pickupDate: status !== SERVICE_STATUS.PENDING_PICKUP ? baseDate.toISOString() : null,
      estimatedPickupDate: status === SERVICE_STATUS.PENDING_PICKUP ? baseDate.toISOString() : null,
      labeledDate: labeledDate ? labeledDate.toISOString() : null,
      deliveryDate: deliveryDate ? deliveryDate.toISOString() : null,
      estimatedDeliveryDate: estimatedDeliveryDate ? estimatedDeliveryDate.toISOString() : null,
      status,
      photos: status !== SERVICE_STATUS.PENDING_PICKUP ? 
        [`data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=`] : [],
      signature: [SERVICE_STATUS.COMPLETED, SERVICE_STATUS.PARTIAL_DELIVERY].includes(status) ? 
        `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE1MCI+PGcgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik01MCA3NUwxMDAgNTBMMTUwIDc1TDIwMCA1MEwyNTAgNzUiLz48L2c+PC9zdmc+` : '',
      collectorName: status !== SERVICE_STATUS.PENDING_PICKUP ? (assignedRepartidor?.name || 'Usuario Sistema') : '',
      geolocation: { 
        lat: -12.1167 + (Math.random() - 0.5) * 0.2, 
        lng: -77.0278 + (Math.random() - 0.5) * 0.2 
      },
      repartidor: assignedRepartidor?.name || null,
      repartidorId: assignedRepartidor?.id || null,
      partialDeliveryPercentage: status === SERVICE_STATUS.PARTIAL_DELIVERY ? 
        Math.floor(Math.random() * 40) + 50 : null,
      price: status !== SERVICE_STATUS.PENDING_PICKUP ? weight * hotel.pricePerKg : 0,
      pickupTimeSlot: `${pickupHour}:00 - ${pickupHour + 2}:00`,
      customerNotes: Math.random() < 0.3 ? 'Cliente solicita llamar antes de llegar' : null,
      internalNotes: status !== SERVICE_STATUS.PENDING_PICKUP ? 
        `Servicio procesado por ${assignedRepartidor?.name || 'Sistema'} - ${new Date().toLocaleString('es-PE')}` : '',
      timestamp: baseDate.toISOString(),
      // New fields for current workflow
      labelingPhotos: labeledDate && Math.random() < 0.8 ? [
        `data:image/jpeg;base64,labeling_photo_${generateId()}`,
        `data:image/jpeg;base64,labeling_photo_${generateId()}`
      ] : [],
      deliveryPhotos: deliveryDate && Math.random() < 0.7 ? [
        `data:image/jpeg;base64,delivery_photo_${generateId()}`
      ] : [],
      deliveredBagCount: status === SERVICE_STATUS.PARTIAL_DELIVERY ? 
        Math.floor(bagCount * (Math.random() * 0.4 + 0.5)) : 
        (status === SERVICE_STATUS.COMPLETED ? bagCount : null),
      remainingBags: status === SERVICE_STATUS.PARTIAL_DELIVERY ? 
        bagCount - Math.floor(bagCount * (Math.random() * 0.4 + 0.5)) : null
    };

    services.push(service);
  }

  return services;
};

// Generate bag labels following current rotulado logic
export const generateBagLabels = (services) => {
  const bagLabels = [];
  
  services.forEach(service => {
    if ([SERVICE_STATUS.LABELED, SERVICE_STATUS.IN_PROCESS, SERVICE_STATUS.WASHED, 
         SERVICE_STATUS.IRONED, SERVICE_STATUS.READY_FOR_DELIVERY, 
         SERVICE_STATUS.PARTIAL_DELIVERY, SERVICE_STATUS.COMPLETED].includes(service.status)) {
      
      for (let i = 0; i < service.bagCount; i++) {
        const today = new Date(service.labeledDate || service.timestamp);
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = today.toTimeString().slice(0, 5).replace(':', '');
        const hotelCode = service.hotel.substring(0, 3).toUpperCase();
        const bagNumber = (i + 1).toString().padStart(2, '0');
        const serviceCode = service.id.slice(-4).toUpperCase();
        
        // Generate realistic individual photo data for each bag
        const photoData = Math.random() < 0.9 ? 
          `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAAgACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD8/qKKKACiiigAooooAKKKKACiiigD//2Q==` : null;
        
        const observations = [
          '',
          'Bolsa principal con documentos',
          'Ropa delicada',
          'Manchas pre-existentes',
          'Lavado en seco solamente',
          'Planchar con cuidado',
          'Revisar botones',
          'Artículos de cuero'
        ];

        const label = {
          id: generateId(),
          serviceId: service.id,
          hotelId: service.hotelId,
          hotelName: service.hotel,
          label: `${hotelCode}-${dateStr}-${timeStr}-${bagNumber}-${serviceCode}`,
          bagNumber: i + 1,
          photo: photoData,
          registeredBy: 'system_user',
          registeredByName: service.repartidor || 'Usuario Sistema',
          timestamp: service.labeledDate || service.timestamp,
          status: 'labeled',
          generatedAt: 'lavanderia',
          observations: i === 0 && Math.random() < 0.4 ? 
            observations[Math.floor(Math.random() * observations.length)] : 
            (Math.random() < 0.2 ? observations[Math.floor(Math.random() * observations.length)] : ''),
          labeledAt: service.labeledDate || service.timestamp,
          updatedAt: null,
          updatedBy: null,
          updatedByName: null
        };
        
        bagLabels.push(label);
      }
    }
  });
  
  return bagLabels;
};

// Generate financial transactions following current finance module
export const generateFinancialTransactions = (services, hotels) => {
  const transactions = [];
  const currentDate = new Date();
  
  // Income categories and amounts
  const incomeCategories = [
    { category: 'servicio_lavanderia', description: 'Servicio estándar de lavandería', min: 50, max: 300 },
    { category: 'pago_hotel', description: 'Pago directo de hotel', min: 200, max: 800 },
    { category: 'servicio_premium', description: 'Servicio premium express', min: 100, max: 500 },
    { category: 'recargo_urgente', description: 'Recargo por servicio urgente', min: 30, max: 150 }
  ];
  
  // Expense categories and amounts
  const expenseCategories = [
    { category: 'suministros_lavanderia', description: 'Detergentes y suministros', min: 80, max: 350 },
    { category: 'combustible_transporte', description: 'Combustible para vehículos', min: 60, max: 200 },
    { category: 'mantenimiento_equipos', description: 'Mantenimiento de equipos', min: 150, max: 600 },
    { category: 'salarios_personal', description: 'Salarios del personal', min: 800, max: 1500 },
    { category: 'servicios_publicos', description: 'Luz, agua y gas', min: 200, max: 500 },
    { category: 'marketing_publicidad', description: 'Marketing y publicidad', min: 100, max: 400 }
  ];
  
  const paymentMethods = ['efectivo', 'transferencia_bancaria', 'yape', 'plin', 'tarjeta_credito', 'tarjeta_debito'];
  
  // Generate income transactions based on completed services
  services.forEach(service => {
    if (service.status === SERVICE_STATUS.COMPLETED && service.price > 0) {
      const incomeCategory = incomeCategories[Math.floor(Math.random() * incomeCategories.length)];
      const serviceDate = new Date(service.deliveryDate || service.timestamp);
      
      transactions.push({
        id: generateId(),
        type: 'income',
        amount: service.price,
        category: incomeCategory.category,
        description: `${incomeCategory.description} - ${service.hotel} - ${service.guestName}`,
        date: serviceDate.toISOString().split('T')[0],
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        hotelId: service.hotelId,
        hotelName: service.hotel,
        serviceId: service.id,
        notes: `Servicio completado: ${service.bagCount} bolsas, ${service.weight}kg`,
        registeredBy: 'system_user',
        registeredByName: 'Usuario Sistema',
        timestamp: serviceDate.toISOString()
      });
    }
  });
  
  // Generate additional income transactions
  for (let i = 0; i < 45; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const transactionDate = new Date(currentDate);
    transactionDate.setDate(transactionDate.getDate() - daysAgo);
    
    const incomeCategory = incomeCategories[Math.floor(Math.random() * incomeCategories.length)];
    const hotel = hotels[Math.floor(Math.random() * hotels.length)];
    const amount = Math.floor(Math.random() * (incomeCategory.max - incomeCategory.min + 1)) + incomeCategory.min;
    
    transactions.push({
      id: generateId(),
      type: 'income',
      amount: amount,
      category: incomeCategory.category,
      description: `${incomeCategory.description} - ${hotel.name}`,
      date: transactionDate.toISOString().split('T')[0],
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      hotelId: hotel.id,
      hotelName: hotel.name,
      serviceId: null,
      notes: `Transacción registrada - ${Math.floor(Math.random() * 8) + 1} servicios procesados`,
      registeredBy: 'admin_user',
      registeredByName: 'María González',
      timestamp: transactionDate.toISOString()
    });
  }
  
  // Generate expense transactions
  for (let i = 0; i < 35; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const transactionDate = new Date(currentDate);
    transactionDate.setDate(transactionDate.getDate() - daysAgo);
    
    const expenseCategory = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
    const amount = Math.floor(Math.random() * (expenseCategory.max - expenseCategory.min + 1)) + expenseCategory.min;
    
    transactions.push({
      id: generateId(),
      type: 'expense',
      amount: amount,
      category: expenseCategory.category,
      description: expenseCategory.description,
      date: transactionDate.toISOString().split('T')[0],
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      hotelId: null,
      hotelName: null,
      serviceId: null,
      notes: `Gasto operacional - ${expenseCategory.description.toLowerCase()}`,
      registeredBy: 'admin_user',
      registeredByName: 'María González',
      timestamp: transactionDate.toISOString()
    });
  }
  
  return transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Generate audit logs for current system
export const generateAuditLogs = (services, transactions, bagLabels) => {
  const auditLogs = [];
  const actions = [
    'service_created', 'service_updated', 'service_status_changed',
    'bag_label_registered', 'bag_label_updated', 'bag_label_deleted',
    'transaction_recorded', 'transaction_updated', 'transaction_deleted',
    'user_login', 'user_logout', 'hotel_updated', 'report_generated'
  ];
  
  // Generate audit for services
  services.forEach(service => {
    if (service.status !== SERVICE_STATUS.PENDING_PICKUP) {
      auditLogs.push({
        id: generateId(),
        action: 'service_created',
        entity: 'service',
        entityId: service.id,
        details: `Servicio creado para ${service.guestName} en ${service.hotel}`,
        userId: service.repartidorId || 'admin_user',
        userName: service.repartidor || 'María González',
        timestamp: service.timestamp
      });
      
      if (service.status !== SERVICE_STATUS.PICKED_UP) {
        auditLogs.push({
          id: generateId(),
          action: 'service_status_changed',
          entity: 'service',
          entityId: service.id,
          details: `Estado cambiado a ${service.status}`,
          userId: service.repartidorId || 'admin_user',
          userName: service.repartidor || 'María González',
          timestamp: service.labeledDate || new Date(new Date(service.timestamp).getTime() + 2 * 60 * 60 * 1000).toISOString()
        });
      }
    }
  });
  
  // Generate audit for bag labels
  bagLabels.forEach(label => {
    auditLogs.push({
      id: generateId(),
      action: 'bag_label_registered',
      entity: 'bag_label',
      entityId: label.id,
      details: `Rótulo ${label.label} registrado para servicio ${label.serviceId}`,
      userId: 'system_user',
      userName: label.registeredByName,
      timestamp: label.timestamp
    });
  });
  
  // Generate audit for transactions
  transactions.forEach(transaction => {
    auditLogs.push({
      id: generateId(),
      action: 'transaction_recorded',
      entity: 'transaction',
      entityId: transaction.id,
      details: `${transaction.type === 'income' ? 'Ingreso' : 'Gasto'} registrado: S/ ${transaction.amount} - ${transaction.category}`,
      userId: transaction.registeredBy,
      userName: transaction.registeredByName,
      timestamp: transaction.timestamp
    });
  });
  
  // Generate additional system activities
  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 15);
    const activityDate = new Date();
    activityDate.setDate(activityDate.getDate() - daysAgo);
    
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    auditLogs.push({
      id: generateId(),
      action: action,
      entity: action.split('_')[0],
      entityId: generateId(),
      details: `Actividad del sistema: ${action.replace('_', ' ')}`,
      userId: 'admin_user',
      userName: 'María González',
      timestamp: activityDate.toISOString()
    });
  }
  
  return auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Initialize complete modern data
export const initializeModernData = () => {
  console.log('🚀 Inicializando datos modernos siguiendo lógica actual...');
  
  // Clear existing data
  localStorage.clear();
  
  // Initialize hotels
  hotelStorage.setHotels(SEED_HOTELS);
  console.log('✅ Hoteles inicializados:', SEED_HOTELS.length);
  
  // Initialize users
  storage.set(APP_CONFIG.STORAGE_KEYS.USERS, SEED_USERS);
  console.log('✅ Usuarios inicializados:', SEED_USERS.length);
  
  // Generate and initialize services
  const services = generateModernServices(SEED_HOTELS, SEED_USERS);
  serviceStorage.setServices(services);
  console.log('✅ Servicios generados:', services.length);
  
  // Generate and initialize bag labels
  const bagLabels = generateBagLabels(services);
  bagLabelStorage.setBagLabels(bagLabels);
  console.log('✅ Rótulos de bolsas generados:', bagLabels.length);
  
  // Generate and initialize financial transactions
  const transactions = generateFinancialTransactions(services, SEED_HOTELS);
  financeStorage.setTransactions(transactions);
  console.log('✅ Transacciones financieras generadas:', transactions.length);
  
  // Generate and initialize audit logs
  const auditLogs = generateAuditLogs(services, transactions, bagLabels);
  auditStorage.addAuditEntry({
    action: 'system_initialization',
    entity: 'system',
    entityId: 'seed_data',
    details: 'Sistema inicializado con datos modernos completos',
    userId: 'admin_user',
    userName: 'María González'
  });
  
  // Store additional audit logs
  const existingLogs = auditStorage.getAuditLog();
  auditLogs.forEach(log => {
    existingLogs.push(log);
  });
  storage.set(APP_CONFIG.STORAGE_KEYS.AUDIT_LOG, existingLogs);
  console.log('✅ Logs de auditoría generados:', auditLogs.length);
  
  // Generate distribution summary
  const statusDistribution = services.reduce((acc, service) => {
    acc[service.status] = (acc[service.status] || 0) + 1;
    return acc;
  }, {});
  
  const financialSummary = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'income') {
      acc.totalIncome += transaction.amount;
    } else {
      acc.totalExpenses += transaction.amount;
    }
    return acc;
  }, { totalIncome: 0, totalExpenses: 0 });
  
  console.log('📊 Distribución de estados de servicios:', statusDistribution);
  console.log('💰 Resumen financiero:', {
    ingresos: `S/ ${financialSummary.totalIncome.toFixed(2)}`,
    gastos: `S/ ${financialSummary.totalExpenses.toFixed(2)}`,
    utilidad: `S/ ${(financialSummary.totalIncome - financialSummary.totalExpenses).toFixed(2)}`
  });
  
  console.log('🎉 Datos modernos inicializados exitosamente');
  console.log('🔧 Sistema listo con lógica actual completa');
  
  return {
    hotels: SEED_HOTELS.length,
    users: SEED_USERS.length,
    services: services.length,
    bagLabels: bagLabels.length,
    transactions: transactions.length,
    auditLogs: auditLogs.length + 1,
    statusDistribution,
    financialSummary
  };
};

// Legacy function for compatibility
export const generateAdditionalPendingPickups = (hotels, repartidores) => {
  const pendingServices = [];
  const today = new Date();
  
  const guestNames = [
    'Carlos Mendoza', 'Ana García', 'Luis Rodríguez', 'María Flores', 'Pedro Castillo',
    'Carmen Vargas', 'Jorge Morales', 'Lucia Torres', 'Ricardo Peña', 'Isabel Vega'
  ];

  const observations = [
    'Ropa delicada, manejar con cuidado',
    'Urgente para evento de negocios',
    'Solo prendas formales',
    'Incluye ropa de ejercicio',
    'Prendas con manchas difíciles'
  ];

  // Generate 3-5 pending pickups per repartidor
  repartidores.forEach(repartidor => {
    const numPickups = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < numPickups; i++) {
      const hotel = hotels[Math.floor(Math.random() * hotels.length)];
      const bagCount = Math.floor(Math.random() * 8) + 1;
      
      const estimatedPickupDate = new Date(today);
      estimatedPickupDate.setHours(9 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);
      
      const service = {
        id: generateId(),
        guestName: guestNames[Math.floor(Math.random() * guestNames.length)],
        roomNumber: Math.floor(Math.random() * 400) + 101,
        hotel: hotel.name,
        hotelId: hotel.id,
        hotelName: hotel.name,
        bagCount,
        weight: null,
        observations: observations[Math.floor(Math.random() * observations.length)],
        specialInstructions: Math.random() < 0.4 ? 'Cliente solicita llamar antes de llegar' : null,
        priority: Math.random() < 0.3 ? 'alta' : Math.random() < 0.6 ? 'media' : 'normal',
        pickupDate: null,
        estimatedPickupDate: estimatedPickupDate.toISOString(),
        deliveryDate: null,
        estimatedDeliveryDate: null,
        status: SERVICE_STATUS.PENDING_PICKUP,
        photos: [],
        signature: '',
        collectorName: '',
        geolocation: { 
          lat: -12.1167 + (Math.random() - 0.5) * 0.1, 
          lng: -77.0278 + (Math.random() - 0.5) * 0.1 
        },
        repartidor: repartidor.name,
        repartidorId: repartidor.id,
        partialDeliveryPercentage: null,
        price: 0,
        pickupTimeSlot: `${9 + i}:00 - ${11 + i}:00`,
        customerNotes: Math.random() < 0.3 ? 'Habitación en el piso 3' : null,
        internalNotes: '',
        timestamp: today.toISOString(),
        labelingPhotos: [],
        deliveryPhotos: [],
        deliveredBagCount: null,
        remainingBags: null
      };

      pendingServices.push(service);
    }
  });
  
  return pendingServices;
};

// Export the initialization function as default
export default initializeModernData;