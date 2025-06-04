import React, { useState, useEffect } from 'react';
import { serviceStorage, storage } from '../../utils/storage';
import { SERVICE_STATUS } from '../../types';
import { APP_CONFIG } from '../../constants';
import { useNotifications } from '../../store/NotificationContext';
import { getStatusText, assignRepartidorByZone } from '../../utils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CheckCircle, Package, X } from 'lucide-react';

const ProcessDecisionModal = ({ service, onClose, onStatusUpdated }) => {
  const { success, error } = useNotifications();
  const [selectedBags, setSelectedBags] = useState([]);
  const [bagsToDeliver, setBagsToDeliver] = useState(Math.ceil(service.bagCount / 2));
  const [partialPercentage, setPartialPercentage] = useState(50);

  // Initialize bags array when component mounts
  useEffect(() => {
    if (service && service.bagCount > 0) {
      // 🔍 CALCULAR BOLSAS YA ENTREGADAS DESDE SERVICIOS HIJOS
      const services = serviceStorage.getServices();
      const existingDeliveries = services.filter(s => 
        s.originalServiceId === service.id && 
        s.isDeliveryService === true
      );
      
      // Obtener todas las bolsas ya entregadas de servicios hijos
      const alreadyDeliveredFromChildren = existingDeliveries.flatMap(delivery => 
        delivery.deliveryBags || []
      );
      
      // Combinar con bolsas del servicio original (si las tiene)
      const serviceDeliveredBags = service.deliveredBags || [];
      const allDeliveredBags = [...new Set([...serviceDeliveredBags, ...alreadyDeliveredFromChildren])];
      
      console.log('📦 Calculando bolsas entregadas:', {
        serviceId: service.id,
        fromService: serviceDeliveredBags,
        fromChildren: alreadyDeliveredFromChildren,
        totalDelivered: allDeliveredBags,
        existingDeliveries: existingDeliveries.length
      });
      
      const bags = Array.from({ length: service.bagCount }, (_, index) => {
        const bagName = `Bolsa ${index + 1}`;
        const isAlreadyDelivered = allDeliveredBags.includes(bagName);
        
        return {
          id: index + 1,
          number: bagName,
          delivered: false, // No pre-seleccionar ninguna
          isBlocked: isAlreadyDelivered, // Bloquear las ya entregadas
          alreadyDelivered: isAlreadyDelivered
        };
      });
      setSelectedBags(bags);
      
      // Ajustar bagsToDeliver para no incluir bolsas ya entregadas
      const availableBags = bags.filter(bag => !bag.isBlocked);
      const newBagsToDeliver = Math.min(Math.ceil(availableBags.length / 2), availableBags.length);
      setBagsToDeliver(newBagsToDeliver);
    }
  }, [service, service.deliveredBags]);

  // Update percentage when bags selection changes
  useEffect(() => {
    if (selectedBags.length > 0) {
      const deliveredCount = selectedBags.filter(bag => bag.delivered && !bag.isBlocked).length;
      const alreadyDeliveredCount = selectedBags.filter(bag => bag.isBlocked).length;
      const totalDeliveredCount = deliveredCount + alreadyDeliveredCount;
      const percentage = Math.round((totalDeliveredCount / selectedBags.length) * 100);
      setPartialPercentage(percentage);
      setBagsToDeliver(deliveredCount);
    }
  }, [selectedBags]);

  const handleBagToggle = (bagId) => {
    setSelectedBags(prev => 
      prev.map(bag => 
        bag.id === bagId && !bag.isBlocked // Solo permitir toggle si no está bloqueada
          ? { ...bag, delivered: !bag.delivered }
          : bag
      )
    );
  };

  const handleBagsToDeliverChange = (newCount) => {
    const availableBags = selectedBags.filter(bag => !bag.isBlocked);
    const count = Math.min(Math.max(0, newCount), availableBags.length);
    setBagsToDeliver(count);
    
    // Update selected bags based on count, but only for available bags
    setSelectedBags(prev => {
      let deliveredSoFar = 0;
      return prev.map((bag) => {
        if (bag.isBlocked) {
          return bag; // No cambiar bolsas bloqueadas
        }
        if (deliveredSoFar < count) {
          deliveredSoFar++;
          return { ...bag, delivered: true };
        } else {
          return { ...bag, delivered: false };
        }
      });
    });
  };

  const handleComplete = () => {
    console.log('🎯 Procesando entrega completa para:', service.id);
    
    // Crear servicio de entrega y completar el actual
    createDeliveryService(service.bagCount, 'COMPLETE');
    updateServiceStatus(SERVICE_STATUS.COMPLETED);
    
    success(
      'Entrega Completa Procesada',
      `Servicio completado. Se creó automáticamente el servicio de entrega para ${service.bagCount} bolsa${service.bagCount !== 1 ? 's' : ''}.`
    );
    
    onStatusUpdated();
    onClose();
  };

  const handlePartial = () => {
    if (bagsToDeliver === 0) {
      error('Error', 'Debes seleccionar al menos una bolsa para entrega parcial');
      return;
    }
    
    console.log('🎯 Procesando entrega parcial para:', service.id, 'Bolsas:', bagsToDeliver);
    
    // Crear servicio de entrega para las bolsas entregadas
    const deliveredBags = selectedBags.filter(bag => bag.delivered && !bag.isBlocked);
    const remainingBags = selectedBags.filter(bag => !bag.delivered && !bag.isBlocked);
    const alreadyDelivered = selectedBags.filter(bag => bag.isBlocked);
    
    // Crear el servicio de entrega con las bolsas seleccionadas
    createDeliveryService(deliveredBags.length, 'PARTIAL', deliveredBags);
    
    // Verificar si todas las bolsas han sido entregadas después de esta entrega
    const totalDeliveredAfterThis = alreadyDelivered.length + deliveredBags.length;
    const willBeCompleted = totalDeliveredAfterThis >= service.bagCount;
    
    if (willBeCompleted) {
      // Si todas las bolsas ya fueron entregadas, marcar como completado
      updateServiceStatus(SERVICE_STATUS.COMPLETED, {
        deliveredBags: [...alreadyDelivered.map(bag => bag.number), ...deliveredBags.map(bag => bag.number)],
        remainingBags: [],
        partialDeliveryPercentage: 100
      });
      
      success(
        'Servicio Completado',
        `Se creó la última entrega para ${bagsToDeliver} bolsas. ¡Todas las ${service.bagCount} bolsas han sido entregadas! El servicio está completado.`
      );
    } else {
      // Actualizar el servicio original con información de entrega parcial
      const statusUpdated = updateServiceStatus(SERVICE_STATUS.PARTIAL_DELIVERY, {
        deliveredBags: [...alreadyDelivered.map(bag => bag.number), ...deliveredBags.map(bag => bag.number)],
        remainingBags: remainingBags.map(bag => bag.number),
        partialDeliveryPercentage: Math.round((totalDeliveredAfterThis / service.bagCount) * 100)
      });
      
      if (statusUpdated) {
        success(
          'Entrega Parcial Procesada',
          `Se creó servicio de entrega para ${bagsToDeliver} bolsas. El servicio cambió a estado ENTREGA PARCIAL. Quedan ${remainingBags.length} bolsas pendientes.`
        );
      } else {
        error('Error', 'No se pudo actualizar el estado del servicio');
        return;
      }
    }
    
    // Llamar onStatusUpdated inmediatamente, luego cerrar
    console.log('🔄 Notificando actualización de estado inmediatamente...');
    onStatusUpdated();
    
    // Pequeño delay antes de cerrar para que el componente padre pueda actualizar
    setTimeout(() => {
      console.log('🔄 Cerrando ProcessDecisionModal...');
      onClose();
    }, 100); // Delay mínimo solo para el cierre
  };

  const createDeliveryService = (bagCount, deliveryType, selectedBagsData = []) => {
    const services = serviceStorage.getServices();
    const users = storage.get(APP_CONFIG.STORAGE_KEYS.USERS) || [];
    
    // 🔍 VALIDAR SERVICIOS DE ENTREGA EXISTENTES
    const existingDeliveries = services.filter(s => 
      s.originalServiceId === service.id && 
      s.isDeliveryService === true
    );
    
    console.log('🔍 Validando servicios de entrega existentes:', {
      serviceId: service.id,
      existingDeliveries: existingDeliveries.length,
      deliveries: existingDeliveries.map(d => ({
        id: d.id,
        bagCount: d.bagCount,
        deliveryBags: d.deliveryBags,
        status: d.status
      }))
    });
    
    // Asignar repartidor automáticamente por zona del hotel
    const assignedRepartidor = assignRepartidorByZone(service.hotel, users);
    
    // Generar ID único para el servicio de entrega
    const deliveryServiceId = `delivery-${service.id}-${Date.now()}`;
    
    console.log('🚛 Creando servicio de entrega:', {
      originalServiceId: service.id,
      deliveryServiceId,
      bagCount,
      deliveryType,
      selectedBags: selectedBagsData.map(b => b.number),
      assignedRepartidor: assignedRepartidor?.name
    });
    
    // Calcular peso proporcional para entrega parcial
    const proportionalWeight = deliveryType === 'COMPLETE' 
      ? service.weight 
      : service.weight ? (parseFloat(service.weight) * (bagCount / service.bagCount)).toFixed(1) : null;
    
    // Extraer fecha de lavado del historial del servicio original
    const extractWashDate = (service) => {
      // Prioridad 1: processStartDate directo
      if (service.processStartDate) {
        return service.processStartDate;
      }
      
      // Prioridad 2: buscar en internalNotes formato [PROCESS_START_DATE:...]
      if (service.internalNotes && service.internalNotes.includes('[PROCESS_START_DATE:')) {
        const match = service.internalNotes.match(/\[PROCESS_START_DATE:([^\]]+)\]/);
        if (match && match[1]) {
          return match[1];
        }
      }
      
      // Prioridad 3: buscar "Estado actualizado a En Proceso" en internalNotes
      if (service.internalNotes && service.internalNotes.includes('Estado actualizado a En Proceso')) {
        const notes = service.internalNotes.split('|');
        const processNote = notes.find(note => note.includes('Estado actualizado a En Proceso'));
        if (processNote) {
          const match = processNote.match(/(\d{1,2}\/\d{1,2}\/\d{4},?\s*\d{1,2}:\d{2}:\d{2}\s*[ap]\.?\s*m\.?)/i);
          if (match) {
            return new Date(match[1]).toISOString();
          }
        }
      }
      
      // Fallback: usar fecha de creación del servicio
      return service.createdAt || service.timestamp || new Date().toISOString();
    };
    
    const washDate = extractWashDate(service);
    
    // Crear el nuevo servicio de entrega
    const deliveryService = {
      id: deliveryServiceId,
      // Información del cliente (igual que el servicio original)
      guestName: service.guestName,
      roomNumber: service.roomNumber,
      hotel: service.hotel,
      hotelId: service.hotelId,
      
      // Información de entrega
      bagCount: bagCount,
      weight: proportionalWeight,
      
      // Información de proceso
      observations: `Servicio de entrega - ${deliveryType === 'COMPLETE' ? 'Completa' : 'Parcial'} | Servicio origen: ${service.id}`,
      specialInstructions: service.specialInstructions || '',
      priority: service.priority || 'NORMAL',
      
      // Fechas
      pickupDate: new Date().toISOString(), // Fecha de "recogida" desde lavandería
      estimatedPickupDate: new Date().toISOString(),
      labeledDate: new Date().toISOString(), // Ya está procesado
      deliveryDate: null,
      estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // +2 días
      
      // Estado inicial del servicio de entrega
      status: 'READY_FOR_DELIVERY',
      
      // Datos del servicio de entrega
      photos: service.labelingPhotos || service.photos || [], // Fotos de los rótulos como referencia
      labelingPhotos: service.labelingPhotos || [], // Fotos específicas de rotulado
      signature: null,
      collectorName: null, // Se llenará cuando alguien recoja
      geolocation: null,
      repartidorId: assignedRepartidor?.id || null,
      deliveryRepartidorId: assignedRepartidor?.id || null,
      deliveryRepartidor: assignedRepartidor?.name || null,
      
      // Información adicional
      partialDeliveryPercentage: deliveryType === 'PARTIAL' ? partialPercentage : 100,
      price: service.price || null,
      pickupTimeSlot: null,
      customerNotes: `Entrega de servicio de lavandería procesado`,
      
      // Notas internas detalladas
      internalNotes: [
        `[${new Date().toLocaleString('es-PE')}] Servicio de entrega creado automáticamente`,
        `Servicio origen: ${service.id}`,
        `Tipo: ${deliveryType} (${bagCount}/${service.bagCount} bolsas)`,
        deliveryType === 'PARTIAL' ? `Bolsas para entregar: ${selectedBagsData.map(b => b.number).join(', ')}` : '',
        `Cliente: ${service.guestName} - Hab. ${service.roomNumber}`,
        `Hotel: ${typeof service.hotel === 'object' ? service.hotel.name : service.hotel}`,
        assignedRepartidor ? `Repartidor asignado: ${assignedRepartidor.name}` : 'Sin repartidor asignado'
      ].filter(Boolean).join(' | '),
      
      // Campos específicos de entrega
      originalServiceId: service.id, // Referencia al servicio original
      serviceType: 'DELIVERY', // Tipo de servicio
      isDeliveryService: true, // Flag para identificar servicios de entrega
      deliveryBags: selectedBagsData.map(b => b.number), // Bolsas específicas para entregar
      washDate: washDate, // Fecha de inicio del proceso de lavandería
      
      // Metadatos
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };
    
    // Agregar el servicio de entrega a la lista
    const updatedServices = [...services, deliveryService];
    serviceStorage.setServices(updatedServices);
    
    console.log(`✅ Servicio de entrega creado:`, {
      id: deliveryServiceId,
      bagCount,
      deliveryType,
      bags: selectedBagsData.map(b => b.number),
      status: 'READY_FOR_DELIVERY'
    });
    
    return deliveryService;
  };

  const updateServiceStatus = (newStatus, additionalData = {}) => {
    console.log('🔄 Actualizando estado del servicio:', {
      serviceId: service.id,
      fromStatus: service.status,
      toStatus: newStatus,
      additionalData
    });

    const services = serviceStorage.getServices();
    
    // Verificar si el servicio existe en localStorage
    const serviceExists = services.find(s => s.id === service.id);
    if (!serviceExists) {
      console.warn('⚠️ Servicio no encontrado en localStorage, agregándolo:', service.id);
      // Agregar el servicio si no existe
      services.push(service);
    }
    
    const updatedServices = services.map(s => {
      if (s.id === service.id) {
        const updatedService = {
          ...s,
          status: newStatus,
          updatedAt: new Date().toISOString(),
          internalNotes: (s.internalNotes || '') + 
            ` | Estado actualizado a ${getStatusText(newStatus)} - ${new Date().toLocaleString('es-PE')}`
        };
        
        console.log('🔧 Actualizando servicio individual:', {
          serviceId: s.id,
          oldStatus: s.status,
          newStatus: newStatus,
          statusString: typeof newStatus
        });

        // Handle partial delivery with bag details
        if (newStatus === SERVICE_STATUS.PARTIAL_DELIVERY) {
          const deliveredBags = additionalData.deliveredBags || selectedBags.filter(bag => bag.delivered).map(bag => bag.number);
          const remainingBags = additionalData.remainingBags || selectedBags.filter(bag => !bag.delivered).map(bag => bag.number);
          
          // Usar directamente las bolsas proporcionadas (ya incluyen todas las entregadas hasta ahora)
          updatedService.partialDeliveryPercentage = additionalData.partialDeliveryPercentage || Math.round((deliveredBags.length / service.bagCount) * 100);
          updatedService.deliveredBags = deliveredBags;
          updatedService.remainingBags = remainingBags;
          
          // Calcular qué bolsas se están entregando AHORA (no todas las entregadas)
          const previouslyDelivered = s.deliveredBags || [];
          const newlyDeliveredBags = deliveredBags.filter(bag => !previouslyDelivered.includes(bag));
          
          // Agregar registro de esta entrega parcial específica al historial  
          const deliveryRecord = `Entrega parcial generada: ${newlyDeliveredBags.join(', ')} - ${new Date().toLocaleString('es-PE')}`;
          updatedService.internalNotes += ` | ${deliveryRecord}`;
          
          console.log('📦 Entrega parcial procesada:', {
            previouslyDelivered,
            newlyDelivered: newlyDeliveredBags,
            allDelivered: deliveredBags,
            remaining: remainingBags,
            percentage: updatedService.partialDeliveryPercentage
          });
        }

        // Add timestamps for specific statuses
        const now = new Date().toISOString();
        if (newStatus === SERVICE_STATUS.COMPLETED) {
          updatedService.deliveryDate = now;
          updatedService.internalNotes += ` | Servicio completado - todas las bolsas entregadas`;
        } else if (newStatus === SERVICE_STATUS.PARTIAL_DELIVERY) {
          if (!updatedService.partialDeliveryDate) {
            updatedService.partialDeliveryDate = now; // Solo la primera vez
          }
          console.log('📅 Agregando fecha de entrega parcial:', now);
        }
        
        console.log('💾 Servicio antes de guardar:', {
          id: updatedService.id,
          status: updatedService.status,
          partialDeliveryDate: updatedService.partialDeliveryDate,
          deliveredBags: updatedService.deliveredBags,
          internalNotes: updatedService.internalNotes
        });

        console.log('✅ Servicio actualizado:', {
          id: updatedService.id,
          status: updatedService.status,
          deliveredBags: updatedService.deliveredBags,
          remainingBags: updatedService.remainingBags
        });

        return updatedService;
      }
      return s;
    });

    serviceStorage.setServices(updatedServices);
    
    const verifyUpdate = updatedServices.find(s => s.id === service.id);
    console.log('✅ Estado actualizado en localStorage:', {
      totalServices: updatedServices.length,
      serviceFound: !!verifyUpdate,
      updatedService: verifyUpdate?.status,
      updatedServiceId: verifyUpdate?.id,
      deliveredBags: verifyUpdate?.deliveredBags,
      partialDeliveryPercentage: verifyUpdate?.partialDeliveryPercentage,
      partialDeliveryDate: verifyUpdate?.partialDeliveryDate,
      savedSuccessfully: true
    });
    
    // Verificar que el estado realmente se guardó
    setTimeout(() => {
      const freshServices = serviceStorage.getServices();
      const freshService = freshServices.find(s => s.id === service.id);
      console.log('🔍 Verificación post-guardado:', {
        serviceId: service.id,
        statusInStorage: freshService?.status,
        expectedStatus: newStatus,
        statusMatches: freshService?.status === newStatus,
        deliveredBagsInStorage: freshService?.deliveredBags,
        timestamp: new Date().toISOString()
      });
    }, 50);
    
    // También actualizar en la API si es posible
    try {
      if (window.serviceService && window.serviceService.updateServiceStatus) {
        window.serviceService.updateServiceStatus(service.id, {
          status: newStatus,
          internalNotes: verifyUpdate?.internalNotes
        }).then(response => {
          console.log('🌐 Estado también actualizado en API:', response);
        }).catch(err => {
          console.warn('⚠️ No se pudo actualizar en API:', err);
        });
      }
    } catch (e) {
      console.warn('⚠️ API no disponible:', e);
    }
    
    // Retornar éxito
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Finalizar Proceso de Lavandería
              </h3>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  <strong>Cliente:</strong> {service.guestName} - Hab. {service.roomNumber}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Hotel:</strong> {typeof service.hotel === 'object' && service.hotel?.name 
                    ? service.hotel.name 
                    : (service.hotel || 'No especificado')}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Service Info */}
          <Card className="mb-6">
            <Card.Content className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{service.bagCount}</p>
                  <p className="text-sm text-gray-600">Total Bolsas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{service.weight || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Peso (kg)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{service.priority || 'Normal'}</p>
                  <p className="text-sm text-gray-600">Prioridad</p>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Decision Options */}
          <div className="space-y-4 mb-6">
            <h4 className="text-lg font-medium text-gray-900">
              ¿Cómo deseas finalizar este servicio?
            </h4>
            
            {/* Complete Option */}
            <Card className="border-green-200 hover:border-green-300 transition-colors">
              <Card.Content className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                    <div>
                      <h5 className="font-medium text-gray-900">Terminado Completo</h5>
                      <p className="text-sm text-gray-600">
                        Todas las {service.bagCount} bolsas están listas para entrega
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleComplete}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Marcar Completado
                  </Button>
                </div>
              </Card.Content>
            </Card>

            {/* Partial Option */}
            <Card className="border-orange-200 hover:border-orange-300 transition-colors">
              <Card.Content className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Package className="h-8 w-8 text-orange-600 mr-3" />
                      <div>
                        <h5 className="font-medium text-gray-900">Entrega Parcial</h5>
                        <p className="text-sm text-gray-600">
                          Solo algunas bolsas están listas
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handlePartial}
                      disabled={bagsToDeliver === 0}
                      className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                    >
                      {selectedBags.some(b => b.isBlocked) ? 'Continuar Entrega Parcial' : 'Entrega Parcial'}
                    </Button>
                  </div>

                  {/* Bag Selection */}
                  <div className="border-t pt-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cantidad de Bolsas a Entregar
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="number"
                          min="0"
                          max={selectedBags.filter(b => !b.isBlocked).length}
                          value={bagsToDeliver}
                          onChange={(e) => handleBagsToDeliverChange(parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        />
                        <span className="text-sm text-gray-600">
                          de {selectedBags.filter(b => !b.isBlocked).length} bolsas disponibles
                        </span>
                        {selectedBags.some(b => b.isBlocked) && (
                          <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                            {selectedBags.filter(b => b.isBlocked).length} ya entregadas
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Individual Bag Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selección Individual de Bolsas
                      </label>
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3">
                        {selectedBags.map((bag) => (
                          <div
                            key={bag.id}
                            className={`
                              flex items-center justify-center p-2 rounded-md border-2 transition-all text-xs font-medium relative
                              ${bag.isBlocked 
                                ? 'bg-red-100 border-red-400 text-red-700 cursor-not-allowed opacity-75' // Bolsas ya entregadas
                                : bag.delivered 
                                  ? 'bg-orange-100 border-orange-500 text-orange-700 cursor-pointer' // Bolsas seleccionadas para entregar
                                  : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100 cursor-pointer' // Bolsas disponibles
                              }
                            `}
                            onClick={() => !bag.isBlocked && handleBagToggle(bag.id)}
                            title={bag.isBlocked ? 'Esta bolsa ya fue entregada anteriormente' : 'Clic para seleccionar/deseleccionar'}
                          >
                            <Package className="h-3 w-3 mr-1" />
                            {bag.id}
                            {bag.isBlocked && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">✓</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-2 space-y-1">
                        <p>🟠 Naranja: Seleccionadas para entregar ahora</p>
                        <p>🔴 Rojo: Ya entregadas anteriormente (bloqueadas)</p>
                        <p>⚪ Gris: Disponibles para seleccionar</p>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-orange-50 p-3 rounded-md space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-700">
                          <strong>Para entregar ahora:</strong> {selectedBags.filter(b => b.delivered && !b.isBlocked).map(b => `Bolsa ${b.id}`).join(', ') || 'Ninguna'}
                        </span>
                      </div>
                      {selectedBags.some(b => b.isBlocked) && (
                        <div className="text-sm">
                          <span className="text-red-700">
                            <strong>Ya entregadas:</strong> {selectedBags.filter(b => b.isBlocked).map(b => `Bolsa ${b.id}`).join(', ')}
                          </span>
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="text-gray-700">
                          <strong>Disponibles:</strong> {selectedBags.filter(b => !b.delivered && !b.isBlocked).map(b => `Bolsa ${b.id}`).join(', ') || 'Ninguna'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 bg-white p-2 rounded border-l-4 border-orange-400">
                        <strong>Progreso total:</strong> {selectedBags.filter(b => b.isBlocked).length + selectedBags.filter(b => b.delivered && !b.isBlocked).length} de {service.bagCount} bolsas ({partialPercentage}%)
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessDecisionModal;