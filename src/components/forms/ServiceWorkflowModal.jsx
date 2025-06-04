import React, { useState } from 'react';
import { serviceStorage, bagLabelStorage } from '../../utils/storage';
import { SERVICE_STATUS } from '../../types';
import { SERVICE_STATUS_CONFIG } from '../../constants';
import { useNotifications } from '../../store/NotificationContext';
import { formatDate, getStatusColor, getStatusText } from '../../utils';
import serviceService from '../../services/service.service';
import Button from '../ui/Button';
import Card from '../ui/Card';
import RotuladoForm from './RotuladoForm';
import ProcessDecisionModal from './ProcessDecisionModal';
import { Clock, CheckCircle, Package, Truck, Star, X, ArrowRight, Tag } from 'lucide-react';

const ServiceWorkflowModal = ({ service, onClose, onStatusUpdated }) => {
  const { success, error } = useNotifications();
  const [selectedStatus, setSelectedStatus] = useState(service.status);
  const [notes, setNotes] = useState('');
  const [partialPercentage, setPartialPercentage] = useState(service.partialDeliveryPercentage || 50);
  const [selectedBags, setSelectedBags] = useState([]);
  const [bagsToDeliver, setBagsToDeliver] = useState(Math.ceil(service.bagCount / 2));
  const [showRotuladoForm, setShowRotuladoForm] = useState(false);
  const [showProcessDecision, setShowProcessDecision] = useState(false);
  const [existingLabels, setExistingLabels] = useState([]);

  // Debug log al abrir el modal (removido para producción)

  // Mapeo de estados para manejar ambos formatos
  const statusMapping = {
    'PENDING_PICKUP': SERVICE_STATUS.PENDING_PICKUP,
    'pendiente_recojo': SERVICE_STATUS.PENDING_PICKUP,
    'ASSIGNED_TO_ROUTE': SERVICE_STATUS.ASSIGNED_TO_ROUTE,
    'asignado_ruta': SERVICE_STATUS.ASSIGNED_TO_ROUTE,
    'PICKED_UP': SERVICE_STATUS.PICKED_UP,
    'recogido': SERVICE_STATUS.PICKED_UP,
    'LABELED': SERVICE_STATUS.LABELED,
    'rotulado': SERVICE_STATUS.LABELED,
    'IN_PROCESS': SERVICE_STATUS.IN_PROCESS,
    'en_proceso': SERVICE_STATUS.IN_PROCESS,
    'PARTIAL_DELIVERY': SERVICE_STATUS.PARTIAL_DELIVERY,
    'entrega_parcial': SERVICE_STATUS.PARTIAL_DELIVERY,
    'COMPLETED': SERVICE_STATUS.COMPLETED,
    'completado': SERVICE_STATUS.COMPLETED
  };

  // Normalizar el estado del servicio
  const normalizedServiceStatus = statusMapping[service.status] || service.status;

  // Detectar estado de entregas parciales
  const hasPartialDeliveries = service.deliveredBags && service.deliveredBags.length > 0;
  const totalBags = service.bagCount || 0;
  const deliveredCount = service.deliveredBags?.length || 0;
  const remainingBags = totalBags - deliveredCount;
  const isPartialInProgress = normalizedServiceStatus === SERVICE_STATUS.PARTIAL_DELIVERY && remainingBags > 0;
  const hasAllBagsDelivered = deliveredCount >= totalBags;
  
  // Debug logs para entender el estado
  console.log('🔍 Estado de entregas:', {
    serviceId: service.id,
    normalizedServiceStatus,
    hasPartialDeliveries,
    totalBags,
    deliveredCount,
    remainingBags,
    deliveredBags: service.deliveredBags,
    isPartialInProgress
  });

  // AHORA sí podemos definir workflowSteps con las variables calculadas
  const workflowSteps = [
    {
      status: SERVICE_STATUS.PENDING_PICKUP,
      title: 'Pendiente de Recojo',
      description: 'Servicio registrado, esperando asignación',
      icon: Clock,
      color: 'red'
    },
    {
      status: SERVICE_STATUS.ASSIGNED_TO_ROUTE,
      title: 'Repartidor en Camino',
      description: 'Ruta iniciada, repartidor dirigiéndose al hotel',
      icon: Truck,
      color: 'blue'
    },
    {
      status: SERVICE_STATUS.PICKED_UP,
      title: 'Recogido',
      description: 'Bolsas recogidas físicamente del hotel',
      icon: Package,
      color: 'yellow'
    },
    {
      status: SERVICE_STATUS.LABELED,
      title: 'Rotulado',
      description: 'Rótulos colocados y fotos tomadas',
      icon: Tag,
      color: 'indigo'
    },
    {
      status: SERVICE_STATUS.IN_PROCESS,
      title: 'En Proceso',
      description: 'Lavandería en proceso',
      icon: Star,
      color: 'purple'
    },
    {
      status: SERVICE_STATUS.DELIVERY,
      title: 'Entrega',
      description: 'Decisión de entrega',
      icon: Truck,
      color: 'indigo'
    },
    {
      status: SERVICE_STATUS.PARTIAL_DELIVERY,
      title: 'Entrega Parcial',
      description: hasPartialDeliveries 
        ? `${deliveredCount}/${totalBags} bolsas entregadas` 
        : 'Entrega parcial de bolsas',
      icon: Package,
      color: 'orange'
    },
    {
      status: SERVICE_STATUS.COMPLETED,
      title: 'Completado',
      description: 'Servicio finalizado exitosamente',
      icon: CheckCircle,
      color: 'green'
    }
  ];

  const getCurrentStepIndex = () => {
    return workflowSteps.findIndex(step => step.status === normalizedServiceStatus);
  };

  const getSelectedStepIndex = () => {
    return workflowSteps.findIndex(step => step.status === selectedStatus);
  };

  // Validation functions for each status transition
  const validateStatusRequirements = (targetStatus) => {
    switch (targetStatus) {
      case SERVICE_STATUS.PICKED_UP:
        // To mark as picked up, service must have been processed through pickup form
        return service.weight && service.photos && service.collectorName;
      
      case SERVICE_STATUS.LABELED:
        // To mark as labeled, service must be picked up first
        return normalizedServiceStatus === SERVICE_STATUS.PICKED_UP || normalizedServiceStatus === SERVICE_STATUS.IN_PROCESS;
      
      case SERVICE_STATUS.IN_PROCESS:
        // To mark as in process, service must be picked up (parallel with labeling)
        return normalizedServiceStatus === SERVICE_STATUS.PICKED_UP || normalizedServiceStatus === SERVICE_STATUS.LABELED;
      
      default:
        return true;
    }
  };

  const getStatusRequirementMessage = (targetStatus) => {
    switch (targetStatus) {
      case SERVICE_STATUS.PICKED_UP:
        return 'Para marcar como recogido se requiere: peso, fotos y nombre del recolector';
      
      case SERVICE_STATUS.LABELED:
        return 'Para rotular, el servicio debe estar en estado "Recogido"';
      
      case SERVICE_STATUS.IN_PROCESS:
        if (normalizedServiceStatus !== SERVICE_STATUS.PICKED_UP && normalizedServiceStatus !== SERVICE_STATUS.LABELED) {
          return 'Para marcar como "En Proceso", el servicio debe estar recogido';
        }
        return '';
      
      default:
        return '';
    }
  };

  const canProgressTo = (targetStatus) => {
    const currentIndex = getCurrentStepIndex();
    const targetIndex = workflowSteps.findIndex(step => step.status === targetStatus);
    
    // Can always go back to previous steps
    if (targetIndex <= currentIndex) return true;
    
    // Check if requirements are met for this status
    if (!validateStatusRequirements(targetStatus)) return false;
    
    // Special logic for new flow
    if (normalizedServiceStatus === SERVICE_STATUS.IN_PROCESS) {
      // From "En Proceso" can only go to "Entrega"
      return targetStatus === SERVICE_STATUS.DELIVERY;
    }
    
    // From "Entrega" can go to "Entrega Parcial" or "Completado"
    if (normalizedServiceStatus === SERVICE_STATUS.DELIVERY) {
      return targetStatus === SERVICE_STATUS.PARTIAL_DELIVERY || targetStatus === SERVICE_STATUS.COMPLETED;
    }
    
    // From "Entrega Parcial" can only go to "Completado"
    if (normalizedServiceStatus === SERVICE_STATUS.PARTIAL_DELIVERY) {
      return targetStatus === SERVICE_STATUS.COMPLETED;
    }
    
    // Otherwise, can only advance one step at a time
    return targetIndex === currentIndex + 1;
  };

  // Initialize bags array when component mounts or service changes
  React.useEffect(() => {
    if (service && service.bagCount > 0) {
      const bags = Array.from({ length: service.bagCount }, (_, index) => ({
        id: index + 1,
        number: `Bolsa ${index + 1}`,
        delivered: false
      }));
      setSelectedBags(bags);
    }
    
    // Cargar rótulos existentes si los hay
    const labels = bagLabelStorage.getBagLabelsByService(service.id);
    setExistingLabels(labels);
    
    // Note: Auto-transition now happens in RotuladoForm when photos are added
  }, [service, normalizedServiceStatus]);

  // 🔧 FIX: Detectar si el estado del servicio en localStorage es diferente al que tenemos
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (service?.id) {
        const services = serviceStorage.getServices();
        const currentServiceInStorage = services.find(s => s.id === service.id);
        
        if (currentServiceInStorage && currentServiceInStorage.status !== service.status) {
          console.log('🔍 ServiceWorkflowModal: Detectado cambio de estado en localStorage:', {
            serviceId: service.id,
            modalStatus: service.status,
            storageStatus: currentServiceInStorage.status,
            modalUpdatedAt: service.updatedAt,
            storageUpdatedAt: currentServiceInStorage.updatedAt
          });
          
          // El componente padre debería manejar esta actualización
          // Pero podemos detectar la discrepancia y loggear para debugging
        }
      }
    }, 1000); // Verificar cada segundo
    
    return () => clearInterval(interval);
  }, [service]);

  // Update percentage when bags selection changes
  React.useEffect(() => {
    if (selectedBags.length > 0) {
      const deliveredCount = selectedBags.filter(bag => bag.delivered).length;
      const percentage = Math.round((deliveredCount / selectedBags.length) * 100);
      setPartialPercentage(percentage);
      setBagsToDeliver(deliveredCount);
    }
  }, [selectedBags]);

  const handleBagToggle = (bagId) => {
    setSelectedBags(prev => 
      prev.map(bag => 
        bag.id === bagId 
          ? { ...bag, delivered: !bag.delivered }
          : bag
      )
    );
  };

  const handleBagsToDeliverChange = (newCount) => {
    const count = Math.min(Math.max(0, newCount), service.bagCount);
    setBagsToDeliver(count);
    
    // Update selected bags based on count
    setSelectedBags(prev => 
      prev.map((bag, index) => ({
        ...bag,
        delivered: index < count
      }))
    );
  };

  const handleStatusUpdate = () => {
    if (!selectedStatus || selectedStatus === service.status) {
      error('Selecciona un estado diferente');
      return;
    }

    // Check requirements first
    if (!validateStatusRequirements(selectedStatus)) {
      const requirementMessage = getStatusRequirementMessage(selectedStatus);
      error('Requisitos No Cumplidos', requirementMessage);
      return;
    }

    if (!canProgressTo(selectedStatus)) {
      error('No puedes saltar pasos en el flujo de trabajo');
      return;
    }

    // Special handling for LABELED status - show labeling form instead of direct update
    if (selectedStatus === SERVICE_STATUS.LABELED) {
      setShowRotuladoForm(true);
      return;
    }

    // Validate partial delivery
    if (selectedStatus === SERVICE_STATUS.PARTIAL_DELIVERY && bagsToDeliver === 0) {
      error('Debes seleccionar al menos una bolsa para entrega parcial');
      return;
    }

    const services = serviceStorage.getServices();
    const updatedServices = services.map(s => {
      if (s.id === service.id) {
        const updatedService = {
          ...s,
          status: selectedStatus,
          internalNotes: (s.internalNotes || '') + 
            ` | Estado actualizado a ${getStatusText(selectedStatus)} - ${new Date().toLocaleString('es-PE')}`
        };

        // Add notes if provided
        if (notes.trim()) {
          updatedService.internalNotes += ` | Notas: ${notes.trim()}`;
        }

        // Handle partial delivery with bag details
        if (selectedStatus === SERVICE_STATUS.PARTIAL_DELIVERY) {
          const deliveredBags = selectedBags.filter(bag => bag.delivered);
          updatedService.partialDeliveryPercentage = partialPercentage;
          updatedService.deliveredBags = deliveredBags.map(bag => bag.number);
          updatedService.remainingBags = selectedBags.filter(bag => !bag.delivered).map(bag => bag.number);
          updatedService.internalNotes += ` | Entrega parcial: ${bagsToDeliver}/${service.bagCount} bolsas (${partialPercentage}%) | Entregadas: ${deliveredBags.map(b => b.number).join(', ')}`;
        }

        // Add timestamps for specific statuses
        const now = new Date().toISOString();
        switch (selectedStatus) {
          case SERVICE_STATUS.PICKED_UP:
            updatedService.pickupDate = now;
            break;
          case SERVICE_STATUS.LABELED:
            updatedService.labeledDate = now;
            break;
          case SERVICE_STATUS.COMPLETED:
            updatedService.deliveryDate = now;
            break;
        }

        return updatedService;
      }
      return s;
    });

    serviceStorage.setServices(updatedServices);
    
    success(
      'Estado Actualizado',
      `Servicio actualizado a: ${getStatusText(selectedStatus)}`
    );
    
    onStatusUpdated();
    onClose();
  };

  // Auto status update function (similar to handleStatusUpdate but without UI interaction)
  const handleAutoStatusUpdate = (newStatus, autoNote = '') => {
    const services = serviceStorage.getServices();
    const updatedServices = services.map(s => {
      if (s.id === service.id) {
        const updatedService = {
          ...s,
          status: newStatus,
          internalNotes: (s.internalNotes || '') + 
            ` | ${autoNote} - ${new Date().toLocaleString('es-PE')}`
        };

        // Add timestamps for specific statuses
        const now = new Date().toISOString();
        switch (newStatus) {
          case SERVICE_STATUS.IN_PROCESS:
            updatedService.processStartDate = now;
            break;
          case SERVICE_STATUS.COMPLETED:
            updatedService.deliveryDate = now;
            break;
        }

        return updatedService;
      }
      return s;
    });

    serviceStorage.setServices(updatedServices);
    
    success(
      'Estado Actualizado Automáticamente',
      `Servicio progresó automáticamente a: ${getStatusText(newStatus)}`
    );
    
    onStatusUpdated();
  };

  // Function for handling final delivery when partial deliveries exist
  const handleFinalDelivery = async () => {
    try {
      // Pre-seleccionar bolsas restantes para la entrega final
      const remainingBagNumbers = service.remainingBags || [];
      const deliveredBagNumbers = service.deliveredBags || [];
      
      console.log('🚚 Iniciando entrega final:', {
        totalBags,
        deliveredCount,
        remainingBags,
        remainingBagNumbers,
        deliveredBagNumbers
      });
      
      // Si hay bolsas restantes por entregar O si ya todas están entregadas pero el estado no es COMPLETED
      if (remainingBags > 0 || (remainingBags === 0 && normalizedServiceStatus !== SERVICE_STATUS.COMPLETED)) {
        // Actualizar el servicio a COMPLETED
        const services = serviceStorage.getServices();
        const updatedServices = services.map(s => {
          if (s.id === service.id) {
            const now = new Date().toISOString();
            const updatedService = {
              ...s,
              status: SERVICE_STATUS.COMPLETED,
              deliveryDate: now,
              updatedAt: now,
              // Marcar todas las bolsas restantes como entregadas
              deliveredBags: [...(s.deliveredBags || []), ...remainingBagNumbers],
              remainingBags: [],
              partialDeliveryPercentage: 100,
              internalNotes: (s.internalNotes || '') + 
                (remainingBags > 0 
                  ? ` | Entrega final completada: ${remainingBagNumbers.join(', ')} - ${new Date().toLocaleString('es-PE')} | Todas las bolsas entregadas | Servicio completado al 100%`
                  : ` | Servicio marcado como completado - ${new Date().toLocaleString('es-PE')} | Todas las bolsas previamente entregadas | Servicio completado al 100%`)
            };
            
            console.log('✅ Servicio completado:', {
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
        
        success(
          'Entrega Completada',
          remainingBags > 0 
            ? `¡Servicio completado! Se entregaron las ${remainingBags} bolsa${remainingBags !== 1 ? 's' : ''} restante${remainingBags !== 1 ? 's' : ''}`
            : '¡Servicio completado! Todas las bolsas fueron entregadas'
        );
        
        onStatusUpdated();
        onClose();
      } else {
        // No hay bolsas restantes, mostrar mensaje
        error('Sin bolsas pendientes', 'Todas las bolsas ya han sido entregadas');
      }
    } catch (error) {
      console.error('Error en entrega final:', error);
      error('Error en Entrega', 'No se pudo completar la entrega final');
    }
  };

  // Function for complete delivery from DELIVERY state (skip partial)
  const handleCompleteDeliveryFromDelivery = async () => {
    console.log('🔧 DEBUG: Iniciando entrega completa desde DELIVERY', {
      serviceId: service.id,
      currentStatus: service.status,
      totalBags: service.bagCount
    });
    
    try {
      // Crear servicio de entrega completa
      const services = serviceStorage.getServices();
      const users = storage.get('USERS') || [];
      
      // Extraer fecha de lavado
      const extractWashDate = (service) => {
        if (service.processStartDate) return service.processStartDate;
        if (service.internalNotes && service.internalNotes.includes('[PROCESS_START_DATE:')) {
          const match = service.internalNotes.match(/\[PROCESS_START_DATE:([^\]]+)\]/);
          if (match && match[1]) return match[1];
        }
        return service.createdAt || service.timestamp || new Date().toISOString();
      };
      
      // Crear servicio de entrega
      const deliveryServiceId = `delivery-${service.id}-${Date.now()}`;
      const washDate = extractWashDate(service);
      const assignedRepartidor = users.find(u => u.role === 'repartidor' && u.zone === (typeof service.hotel === 'object' ? service.hotel.zone : 'CENTRO'));
      
      const deliveryService = {
        id: deliveryServiceId,
        guestName: service.guestName,
        roomNumber: service.roomNumber,
        hotel: service.hotel,
        hotelId: service.hotelId,
        bagCount: service.bagCount,
        weight: service.weight,
        observations: `Servicio de entrega completa | Servicio origen: ${service.id}`,
        specialInstructions: service.specialInstructions || '',
        priority: service.priority || 'NORMAL',
        pickupDate: new Date().toISOString(),
        estimatedPickupDate: new Date().toISOString(),
        labeledDate: new Date().toISOString(),
        deliveryDate: null,
        estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'READY_FOR_DELIVERY',
        photos: service.labelingPhotos || service.photos || [],
        labelingPhotos: service.labelingPhotos || [],
        signature: null,
        collectorName: null,
        geolocation: null,
        repartidorId: assignedRepartidor?.id || null,
        deliveryRepartidorId: assignedRepartidor?.id || null,
        deliveryRepartidor: assignedRepartidor?.name || null,
        partialDeliveryPercentage: 100,
        price: service.price || null,
        pickupTimeSlot: null,
        customerNotes: `Entrega completa de servicio de lavandería`,
        internalNotes: [
          `[${new Date().toLocaleString('es-PE')}] Servicio de entrega completa creado`,
          `Servicio origen: ${service.id}`,
          `Tipo: COMPLETE (${service.bagCount}/${service.bagCount} bolsas)`,
          `Cliente: ${service.guestName} - Hab. ${service.roomNumber}`,
          `Hotel: ${typeof service.hotel === 'object' ? service.hotel.name : service.hotel}`,
          assignedRepartidor ? `Repartidor asignado: ${assignedRepartidor.name}` : 'Sin repartidor asignado'
        ].join(' | '),
        originalServiceId: service.id,
        serviceType: 'DELIVERY',
        isDeliveryService: true,
        deliveryBags: Array.from({ length: service.bagCount }, (_, i) => `Bolsa ${i + 1}`),
        washDate: washDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };
      
      // Actualizar servicio original a COMPLETED
      const updatedServices = services.map(s => {
        if (s.id === service.id) {
          const now = new Date().toISOString();
          return {
            ...s,
            status: SERVICE_STATUS.COMPLETED,
            deliveryDate: now,
            updatedAt: now,
            partialDeliveryPercentage: 100,
            internalNotes: (s.internalNotes || '') + 
              ` | Entrega completa procesada - ${new Date().toLocaleString('es-PE')} | Servicio de entrega creado: ${deliveryServiceId} | Servicio completado`
          };
        }
        return s;
      });
      
      // Agregar servicio de entrega a la lista
      updatedServices.push(deliveryService);
      serviceStorage.setServices(updatedServices);
      
      console.log('✅ Servicio de entrega completa creado:', {
        originalId: service.id,
        deliveryId: deliveryServiceId,
        bagCount: service.bagCount,
        washDate
      });
      
      success(
        'Entrega Completa Procesada',
        `¡Servicio completado! Se creó servicio de entrega para todas las ${service.bagCount} bolsas`
      );
      
      onStatusUpdated();
      
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error) {
      console.error('Error en entrega completa:', error);
      error('Error', 'No se pudo completar la entrega');
    }
  };

  // Function specifically for transitioning to DELIVERY
  const handleStatusUpdateToDelivery = async () => {
    console.log('🔧 DEBUG: Iniciando handleStatusUpdateToDelivery', {
      serviceId: service.id,
      currentStatus: service.status,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Actualizar en localStorage
      const services = serviceStorage.getServices();
      const updatedServices = services.map(s => {
        if (s.id === service.id) {
          const now = new Date().toISOString();
          const updatedService = {
            ...s,
            status: SERVICE_STATUS.DELIVERY,
            updatedAt: now,
            internalNotes: (s.internalNotes || '') + 
              ` | Estado actualizado a Entrega - ${new Date().toLocaleString('es-PE')} | Listo para tomar decisión de entrega`
          };

          console.log('🔧 DEBUG: Guardando en localStorage estado DELIVERY:', {
            serviceId: updatedService.id,
            status: updatedService.status,
            now: now,
            internalNotes: updatedService.internalNotes
          });

          return updatedService;
        }
        return s;
      });

      console.log('🔧 DEBUG: Guardando servicios actualizados en localStorage');
      serviceStorage.setServices(updatedServices);
      
      success(
        'Estado Actualizado',
        'El servicio ha pasado a estado "Entrega" - Puedes decidir entre entrega completa o parcial'
      );
      
      // IMPORTANTE: Notificar al componente padre para que recargue el servicio
      console.log('🔧 DEBUG: Notificando actualización de estado al componente padre');
      onStatusUpdated();
      
      // Pequeño delay para asegurar que el padre actualice antes de cerrar
      setTimeout(() => {
        console.log('🔧 DEBUG: Cerrando modal después de actualización');
        onClose();
      }, 100);
    } catch (error) {
      console.error('Error actualizando a DELIVERY:', error);
      error('Error', 'No se pudo actualizar el estado del servicio');
    }
  };

  // Function specifically for transitioning to IN_PROCESS
  const handleStatusUpdateToInProcess = async () => {
    console.log('🔧 DEBUG: Iniciando handleStatusUpdateToInProcess', {
      serviceId: service.id,
      currentStatus: service.status,
      currentProcessStartDate: service.processStartDate,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Intentar actualizar primero en la API
      const apiResponse = await serviceService.updateServiceStatus(service.id, {
        status: 'IN_PROCESS',
        internalNotes: `Proceso de lavandería iniciado - ${new Date().toLocaleString('es-PE')}`
      });

      console.log('🔧 DEBUG: Respuesta de API:', {
        success: apiResponse?.success,
        data: apiResponse?.data,
        error: apiResponse?.error
      });

      if (apiResponse && apiResponse.success) {
        console.log('Estado actualizado exitosamente en la API');
        
        // IMPORTANTE: El backend NO guarda processStartDate, así que SIEMPRE actualizamos localStorage
        console.log('🔧 DEBUG: Forzando actualización de localStorage porque backend no guarda processStartDate');
        
        // TAMBIÉN actualizar en localStorage para mantener sincronización
        const services = serviceStorage.getServices();
        const updatedServices = services.map(s => {
          if (s.id === service.id) {
            const now = new Date().toISOString();
            const updatedService = {
              ...s,
              status: SERVICE_STATUS.IN_PROCESS,
              processStartDate: now,
              updatedAt: now,
              internalNotes: (s.internalNotes || '') + 
                ` | Estado actualizado a En Proceso - ${new Date().toLocaleString('es-PE')} | Proceso de lavandería iniciado`
            };

            console.log('🔧 DEBUG: Guardando en localStorage con processStartDate:', {
              serviceId: updatedService.id,
              status: updatedService.status,
              processStartDate: updatedService.processStartDate,
              now: now,
              internalNotes: updatedService.internalNotes
            });

            return updatedService;
          }
          return s;
        });

        console.log('🔧 DEBUG: Guardando servicios actualizados en localStorage');
        serviceStorage.setServices(updatedServices);
        
        // Verificar que se guardó correctamente
        const verifyServices = serviceStorage.getServices();
        const verifiedService = verifyServices.find(s => s.id === service.id);
        console.log('🔧 DEBUG: Verificación después de guardar:', {
          serviceId: service.id,
          savedProcessStartDate: verifiedService?.processStartDate,
          savedStatus: verifiedService?.status
        });
      } else {
        throw new Error('Error al actualizar en la API');
      }
    } catch (apiError) {
      console.warn('Error en API, actualizando localmente:', apiError);
      
      // Fallback: actualizar en almacenamiento local
      const services = serviceStorage.getServices();
      const updatedServices = services.map(s => {
        if (s.id === service.id) {
          const now = new Date().toISOString();
          const updatedService = {
            ...s,
            status: SERVICE_STATUS.IN_PROCESS,
            processStartDate: now,
            updatedAt: now,
            internalNotes: (s.internalNotes || '') + 
              ` | Estado actualizado a En Proceso - ${new Date().toLocaleString('es-PE')} | Proceso de lavandería iniciado`
          };

          console.log('🔧 DEBUG: Fallback - Servicio actualizado localmente:', {
            serviceId: updatedService.id,
            status: updatedService.status,
            processStartDate: updatedService.processStartDate,
            now: now,
            notes: updatedService.internalNotes
          });

          return updatedService;
        }
        return s;
      });

      serviceStorage.setServices(updatedServices);
    }
    
    success(
      'Proceso Iniciado',
      'El servicio ha pasado a estado "En Proceso" - La lavandería puede comenzar el procesamiento'
    );
    
    // IMPORTANTE: Notificar al componente padre para que recargue el servicio
    console.log('🔧 DEBUG: Notificando actualización de estado al componente padre');
    onStatusUpdated();
    
    // Pequeño delay para asegurar que el padre actualice antes de cerrar
    setTimeout(() => {
      console.log('🔧 DEBUG: Cerrando modal después de actualización');
      onClose();
    }, 100);
  };

  const StatusStep = ({ step, index, isActive, isCompleted, isSelected }) => {
    const IconComponent = step.icon;
    const canProgress = canProgressTo(step.status);
    const requiresValidation = !validateStatusRequirements(step.status);
    const requirementMessage = getStatusRequirementMessage(step.status);
    
    // Check if this is the next available step
    const isNextAvailable = step.status === SERVICE_STATUS.LABELED && (normalizedServiceStatus === SERVICE_STATUS.PICKED_UP || normalizedServiceStatus === SERVICE_STATUS.IN_PROCESS);
    
    // Check if IN_PROCESS should be available (when service has rotulado data with photos)
    const serviceLabels = bagLabelStorage.getBagLabelsByService(service.id);
    const hasLabelData = serviceLabels.length > 0 && serviceLabels.some(label => label.label && label.label.trim() !== '');
    const hasPhotoDataFromLabels = serviceLabels.length > 0 && serviceLabels.some(label => label.photo && label.photo.trim() !== '');
    
    // También verificar fotos directamente del servicio (para servicios que vienen del backend)
    const hasPhotosFromService = service.labelingPhotos && service.labelingPhotos.length > 0;
    const hasPhotosFromPickup = service.photos && service.photos.length > 0;
    
    const isInProcessAvailable = step.status === SERVICE_STATUS.IN_PROCESS && 
      normalizedServiceStatus === SERVICE_STATUS.LABELED &&
      (hasLabelData || hasPhotoDataFromLabels || hasPhotosFromService || hasPhotosFromPickup);
    
    // Check if ENTREGA (DELIVERY) should be available when service is IN_PROCESS
    const isDeliveryAvailable = step.status === SERVICE_STATUS.DELIVERY && 
      normalizedServiceStatus === SERVICE_STATUS.IN_PROCESS;
    
    // Check if ENTREGA PARCIAL should be available when service is DELIVERY or already in PARTIAL_DELIVERY
    const isPartialDeliveryAvailable = step.status === SERVICE_STATUS.PARTIAL_DELIVERY && 
      (normalizedServiceStatus === SERVICE_STATUS.DELIVERY || 
       (normalizedServiceStatus === SERVICE_STATUS.PARTIAL_DELIVERY && remainingBags > 0));
    
    // Check if COMPLETED should be available when service is DELIVERY or PARTIAL_DELIVERY
    const isCompletedAvailable = step.status === SERVICE_STATUS.COMPLETED && 
      (normalizedServiceStatus === SERVICE_STATUS.DELIVERY || 
       (normalizedServiceStatus === SERVICE_STATUS.PARTIAL_DELIVERY && remainingBags === 0));
    
    // Handler para clicks en los estados
    const handleStepClick = () => {
      console.log('🎯 Step clicked:', {
        stepStatus: step.status,
        normalizedServiceStatus,
        hasLabelData,
        hasPhotoDataFromLabels,
        hasPhotosFromService,
        hasPhotosFromPickup,
        isInProcessAvailable,
        servicePhotos: service.photos,
        serviceLabelingPhotos: service.labelingPhotos
      });
      
      // Click en ROTULADO - mostrar formulario o vista de solo lectura (disponible desde PICKED_UP)
      if (step.status === SERVICE_STATUS.LABELED && (normalizedServiceStatus === SERVICE_STATUS.PICKED_UP || normalizedServiceStatus === SERVICE_STATUS.LABELED || normalizedServiceStatus === SERVICE_STATUS.IN_PROCESS)) {
        setShowRotuladoForm(true);
      }
      // Click en EN PROCESO - actualizar directamente el estado si tiene datos de rotulado
      else if (step.status === SERVICE_STATUS.IN_PROCESS && 
        normalizedServiceStatus === SERVICE_STATUS.LABELED &&
        (hasLabelData || hasPhotoDataFromLabels || hasPhotosFromService || hasPhotosFromPickup)) {
        console.log('✅ Calling handleStatusUpdateToInProcess');
        handleStatusUpdateToInProcess();
      }
      // Click en ENTREGA - abrir modal directamente (sin cambiar estado)
      else if (step.status === SERVICE_STATUS.DELIVERY) {
        console.log('🔍 Click en ENTREGA desde IN_PROCESS - abriendo ProcessDecisionModal');
        if (normalizedServiceStatus === SERVICE_STATUS.IN_PROCESS) {
          console.log('✅ Abriendo ProcessDecisionModal directamente desde IN_PROCESS');
          setShowProcessDecision(true);
        }
      }
      // Click en ENTREGA PARCIAL
      else if (step.status === SERVICE_STATUS.PARTIAL_DELIVERY) {
        console.log('🔍 Evaluando entrega parcial:', {
          normalizedServiceStatus,
          hasPartialDeliveries,
          deliveredCount,
          remainingBags,
          serviceDeliveredBags: service.deliveredBags
        });
        
        // Si estamos en DELIVERY, abrir el modal para hacer entrega parcial
        if (normalizedServiceStatus === SERVICE_STATUS.DELIVERY) {
          console.log('✅ Opening delivery decision modal from DELIVERY');
          setShowProcessDecision(true);
        }
        // Si estamos en PARTIAL_DELIVERY, abrir el modal para continuar entregando
        else if (normalizedServiceStatus === SERVICE_STATUS.PARTIAL_DELIVERY && remainingBags > 0) {
          console.log('✅ Opening delivery decision modal for remaining bags');
          setShowProcessDecision(true);
        }
        // Si estamos en PARTIAL_DELIVERY pero no hay bolsas restantes
        else if (normalizedServiceStatus === SERVICE_STATUS.PARTIAL_DELIVERY && remainingBags === 0) {
          console.log('✅ All bags delivered, completing service');
          // Completar servicio automáticamente
          handleFinalDelivery();
        } else {
          console.log('❌ No action available for delivery step');
        }
      }
      // Click en COMPLETADO
      else if (step.status === SERVICE_STATUS.COMPLETED) {
        console.log('🔍 Click en COMPLETADO');
        // Si estamos en DELIVERY, crear servicio de entrega completa y completar
        if (normalizedServiceStatus === SERVICE_STATUS.DELIVERY) {
          console.log('✅ Complete delivery from DELIVERY state');
          handleCompleteDeliveryFromDelivery();
        }
        // Si estamos en PARTIAL_DELIVERY sin bolsas restantes, completar
        else if (normalizedServiceStatus === SERVICE_STATUS.PARTIAL_DELIVERY && remainingBags === 0) {
          console.log('✅ Complete service from PARTIAL_DELIVERY');
          handleFinalDelivery();
        }
      } else {
        console.log('❌ Conditions not met for transition');
      }
    };
    
    return (
      <div className="flex flex-col items-center relative flex-1">
        <div className="flex flex-col items-center">
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all relative
              ${isActive ? 'animate-pulse' : ''}
              ${isActive && step.color === 'red' ? 'bg-red-600 border-red-600 text-white' :
                isActive && step.color === 'blue' ? 'bg-blue-600 border-blue-600 text-white' :
                isActive && step.color === 'yellow' ? 'bg-yellow-600 border-yellow-600 text-white' :
                isActive && step.color === 'indigo' ? 'bg-indigo-600 border-indigo-600 text-white' :
                isActive && step.color === 'purple' ? 'bg-purple-600 border-purple-600 text-white' :
                isActive && step.color === 'orange' ? 'bg-orange-600 border-orange-600 text-white' :
                isActive && step.color === 'green' ? 'bg-green-600 border-green-600 text-white' :
                isCompleted && step.color === 'red' ? 'bg-red-100 border-red-500 text-red-600' :
                isCompleted && step.color === 'blue' ? 'bg-blue-100 border-blue-500 text-blue-600' :
                isCompleted && step.color === 'yellow' ? 'bg-yellow-100 border-yellow-500 text-yellow-600' :
                isCompleted && step.color === 'indigo' ? 'bg-indigo-100 border-indigo-500 text-indigo-600' :
                isCompleted && step.color === 'purple' ? 'bg-purple-100 border-purple-500 text-purple-600' :
                isCompleted && step.color === 'orange' ? 'bg-orange-100 border-orange-500 text-orange-600' :
                isCompleted && step.color === 'green' ? 'bg-green-100 border-green-500 text-green-600' :
                isNextAvailable && step.color === 'indigo' ? 'bg-indigo-500 border-indigo-500 text-white hover:bg-indigo-600' :
                isInProcessAvailable && step.color === 'purple' ? 'bg-purple-500 border-purple-500 text-white hover:bg-purple-600' :
                isDeliveryAvailable && step.color === 'indigo' ? 'bg-indigo-500 border-indigo-500 text-white hover:bg-indigo-600' :
                isPartialDeliveryAvailable && step.color === 'orange' ? 'bg-orange-500 border-orange-500 text-white hover:bg-orange-600' :
                isCompletedAvailable && step.color === 'green' ? 'bg-green-500 border-green-500 text-white hover:bg-green-600' :
                'bg-gray-100 border-gray-300 text-gray-400'}
              ${isActive || isCompleted || isNextAvailable || isInProcessAvailable || isDeliveryAvailable || isPartialDeliveryAvailable || isCompletedAvailable ? '' : 'opacity-50'}
              ${(step.status === SERVICE_STATUS.LABELED && (normalizedServiceStatus === SERVICE_STATUS.PICKED_UP || normalizedServiceStatus === SERVICE_STATUS.LABELED || normalizedServiceStatus === SERVICE_STATUS.IN_PROCESS)) ||
                (step.status === SERVICE_STATUS.IN_PROCESS && normalizedServiceStatus === SERVICE_STATUS.LABELED && (hasLabelData || hasPhotoDataFromLabels || hasPhotosFromService || hasPhotosFromPickup)) ||
                (step.status === SERVICE_STATUS.DELIVERY && normalizedServiceStatus === SERVICE_STATUS.IN_PROCESS) ||
                (step.status === SERVICE_STATUS.PARTIAL_DELIVERY && (normalizedServiceStatus === SERVICE_STATUS.DELIVERY || normalizedServiceStatus === SERVICE_STATUS.PARTIAL_DELIVERY)) ||
                (step.status === SERVICE_STATUS.COMPLETED && (normalizedServiceStatus === SERVICE_STATUS.DELIVERY || (normalizedServiceStatus === SERVICE_STATUS.PARTIAL_DELIVERY && remainingBags === 0))) ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
            `}
            onClick={handleStepClick}
            title={requiresValidation && !isCompleted && !isActive ? requirementMessage : ''}
          >
            <IconComponent className="h-6 w-6" />
            {requiresValidation && !isCompleted && !isActive && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            )}
          </div>
          <div className="mt-3 text-center max-w-[120px]">
            <p className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-600'} leading-tight`}>
              {step.title}
            </p>
            <p className="text-xs text-gray-500 mt-1 leading-tight">
              {step.description}
            </p>
            {requiresValidation && !isCompleted && !isActive && (
              <p className="text-xs text-red-500 mt-1 font-medium">
                Faltan requisitos
              </p>
            )}
            {isInProcessAvailable && !isActive && !isCompleted && (
              <p className="text-xs text-purple-600 mt-1 font-medium animate-pulse">
                ¡Hacer clic para continuar!
              </p>
            )}
            {isDeliveryAvailable && !isActive && !isCompleted && (
              <p className="text-xs text-indigo-600 mt-1 font-medium animate-pulse">
                ¡Hacer clic para decidir!
              </p>
            )}
            {isPartialDeliveryAvailable && !isActive && !isCompleted && (
              <p className="text-xs text-orange-600 mt-1 font-medium animate-pulse">
                {normalizedServiceStatus === SERVICE_STATUS.DELIVERY ? '¡Hacer entrega parcial!' : '¡Continuar entrega!'}
              </p>
            )}
            {isCompletedAvailable && !isActive && !isCompleted && (
              <p className="text-xs text-green-600 mt-1 font-medium animate-pulse">
                {normalizedServiceStatus === SERVICE_STATUS.DELIVERY ? '¡Entrega completa!' : '¡Completar servicio!'}
              </p>
            )}
          </div>
        </div>
        
        {index < workflowSteps.length - 1 && (
          <div className="absolute top-6 left-full w-full flex justify-center pointer-events-none">
            <ArrowRight className="h-5 w-5 text-gray-300" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Seguimiento de Servicio
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
                <p className="text-sm text-gray-600">
                  <strong>Registrado:</strong> {service.createdAt || service.timestamp ? formatDate(service.createdAt || service.timestamp) : 'Fecha no disponible'}
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

          {/* Current Status */}
          <Card className="mb-6">
            <Card.Content className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${SERVICE_STATUS_CONFIG[service.status]?.badgeClasses || SERVICE_STATUS_CONFIG[normalizedServiceStatus]?.badgeClasses || getStatusColor(service.status)}`}>
                    {SERVICE_STATUS_CONFIG[service.status]?.label || SERVICE_STATUS_CONFIG[normalizedServiceStatus]?.label || getStatusText(service.status)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Estado actual del servicio
                  </span>
                </div>
                
                {/* Next Step Available Notification */}
                {(() => {
                  const serviceLabels = bagLabelStorage.getBagLabelsByService(service.id);
                  const hasPhotoData = serviceLabels.length > 0 && serviceLabels.some(label => label.photo && label.photo.trim() !== '');
                  
                  if (normalizedServiceStatus === SERVICE_STATUS.LABELED && hasPhotoData) {
                    return (
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                          ✓ Rotulado completo
                        </div>
                        <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium animate-pulse">
                          → Listo para "En Proceso"
                        </div>
                      </div>
                    );
                  }
                  
                  if (normalizedServiceStatus === SERVICE_STATUS.IN_PROCESS) {
                    return (
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">
                          ✓ En proceso
                        </div>
                        <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium animate-pulse">
                          → Hacer clic en "Entrega" para decidir
                        </div>
                      </div>
                    );
                  }
                  
                  if (normalizedServiceStatus === SERVICE_STATUS.PARTIAL_DELIVERY && remainingBags > 0) {
                    return (
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
                          ✓ {deliveredCount}/{totalBags} entregadas
                        </div>
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium animate-pulse">
                          → Completar entrega ({remainingBags} restante${remainingBags !== 1 ? 's' : ''})
                        </div>
                      </div>
                    );
                  }
                  
                  if (normalizedServiceStatus === SERVICE_STATUS.PARTIAL_DELIVERY && remainingBags === 0) {
                    return (
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                          ✓ Todas las bolsas entregadas
                        </div>
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                          Listo para completar
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
              </div>
            </Card.Content>
          </Card>

          {/* Workflow Steps */}
          <div className="mb-8">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Flujo de Trabajo
            </h4>
            <div className="overflow-x-auto pb-4">
              <div className="flex items-center justify-between min-w-max px-4" style={{ minWidth: '800px' }}>
                {workflowSteps.map((step, index) => {
                  const currentIndex = getCurrentStepIndex();
                  const selectedIndex = getSelectedStepIndex();
                  
                  return (
                    <StatusStep
                      key={step.status}
                      step={step}
                      index={index}
                      isActive={index === currentIndex}
                      isCompleted={index < currentIndex}
                      isSelected={index === selectedIndex}
                    />
                  );
                })}
              </div>
            </div>
          </div>


          {/* Service Details */}
          <Card className="mb-6">
            <Card.Header>
              <h5 className="font-medium text-gray-900">Detalles del Servicio</h5>
            </Card.Header>
            <Card.Content className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Bolsas</p>
                  <p className="font-medium">{service.bagCount}</p>
                </div>
                <div>
                  <p className="text-gray-500">Peso</p>
                  <p className="font-medium">{service.weight || 'No registrado'} kg</p>
                </div>
                <div>
                  <p className="text-gray-500">Repartidor</p>
                  <p className="font-medium">
                    {typeof service.repartidor === 'object' && service.repartidor?.name 
                      ? service.repartidor.name 
                      : (service.repartidor || 'Sin asignar')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Prioridad</p>
                  <p className="font-medium capitalize">{service.priority || 'Normal'}</p>
                </div>
              </div>
              
              {service.observations && (
                <div className="mt-4">
                  <p className="text-gray-500 text-sm">Observaciones</p>
                  <p className="text-sm">{service.observations}</p>
                </div>
              )}

              {/* Service Timeline/History */}
              <div className="mt-4">
                <p className="text-gray-500 text-sm mb-2">Historial del Servicio</p>
                <div className="space-y-2">
                  {(() => {
                    const timeline = [];
                    
                    // 1. Creación del servicio
                    if (service.createdAt || service.timestamp) {
                      timeline.push({
                        date: service.createdAt || service.timestamp,
                        icon: '📅',
                        text: `Servicio registrado para ${service.guestName} - Hab. ${service.roomNumber}`
                      });
                    }
                    
                    // 2. Asignación a repartidor (si existe)
                    if (service.repartidorId && service.repartidor) {
                      const repartidorName = typeof service.repartidor === 'object' ? service.repartidor.name : service.repartidor;
                      timeline.push({
                        date: service.assignedDate || service.createdAt,
                        icon: '🚛',
                        text: `Asignado a ${repartidorName}`
                      });
                    }
                    
                    // 3. Recogida
                    if (service.pickupDate && service.status !== 'PENDING_PICKUP' && service.status !== 'ASSIGNED_TO_ROUTE') {
                      const weightText = service.weight ? ` - ${service.weight}kg` : '';
                      const repartidorName = typeof service.repartidor === 'object' ? service.repartidor.name : (service.repartidor || 'Repartidor');
                      timeline.push({
                        date: service.pickupDate,
                        icon: '📦',
                        text: `Recogido por ${repartidorName}${weightText}, ${service.bagCount} bolsa${service.bagCount !== 1 ? 's' : ''}`
                      });
                    }
                    
                    // 4. Rotulado
                    if (service.labeledDate && (service.status === 'LABELED' || service.status === 'IN_PROCESS' || service.status === 'PARTIAL_DELIVERY' || service.status === 'COMPLETED')) {
                      const photoCount = service.labelingPhotos?.length || service.photos?.length || 0;
                      const photoText = photoCount > 0 ? ` con ${photoCount} foto${photoCount !== 1 ? 's' : ''}` : '';
                      timeline.push({
                        date: service.labeledDate,
                        icon: '🏷️',
                        text: `Rotulado completado${photoText}`
                      });
                    }
                    
                    // 5. En proceso
                    if ((service.status === 'IN_PROCESS' || service.status === 'PARTIAL_DELIVERY' || service.status === 'COMPLETED') && service.processStartDate) {
                      timeline.push({
                        date: service.processStartDate,
                        icon: '⚙️',
                        text: 'Proceso de lavandería iniciado'
                      });
                    }
                    
                    // 6. Entregas parciales (extraer del internalNotes)
                    if (service.internalNotes) {
                      const notes = service.internalNotes.split('|');
                      notes.forEach(note => {
                        const trimmedNote = note.trim();
                        // Buscar entregas parciales generadas
                        if (trimmedNote.includes('Entrega parcial generada:')) {
                          // Extraer información de la entrega parcial
                          const match = trimmedNote.match(/Entrega parcial generada: (.+?) - (.+)/);
                          if (match) {
                            const bags = match[1];
                            const dateStr = match[2];
                            try {
                              // Intentar parsear la fecha
                              const date = new Date(dateStr);
                              if (!isNaN(date.getTime())) {
                                timeline.push({
                                  date: date.toISOString(),
                                  icon: '📦',
                                  text: `Entrega parcial generada: ${bags}`
                                });
                              }
                            } catch (e) {
                              console.warn('Error parsing date from note:', dateStr);
                            }
                          }
                        }
                      });
                    }
                    
                    // 7. Entrega final/completado
                    if (service.deliveryDate && service.status === 'COMPLETED') {
                      timeline.push({
                        date: service.deliveryDate,
                        icon: '✅',
                        text: 'Servicio completado - todas las bolsas entregadas'
                      });
                    }
                    
                    // 8. Fecha de entrega parcial (primera)
                    if (service.partialDeliveryDate && service.status === 'PARTIAL_DELIVERY') {
                      const deliveredCount = service.deliveredBags ? service.deliveredBags.length : 0;
                      const percentage = service.partialDeliveryPercentage || 0;
                      timeline.push({
                        date: service.partialDeliveryDate,
                        icon: '🚚',
                        text: `Estado: Entrega parcial (${deliveredCount}/${service.bagCount} bolsas - ${percentage}%)`
                      });
                    }
                    
                    // Ordenar por fecha
                    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
                    
                    return timeline.map((item, index) => (
                      <div key={index} className="flex items-start space-x-2 text-xs">
                        <span className="text-sm">{item.icon}</span>
                        <div className="flex-1">
                          <span className="text-gray-500">
                            {formatDate(item.date)}
                          </span>
                          <span className="text-gray-700 ml-2">
                            {item.text}
                          </span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {service.internalNotes && (
                <div className="mt-4">
                  <p className="text-gray-500 text-sm">Notas Técnicas</p>
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1 max-h-32 overflow-y-auto">
                    {service.internalNotes.split('|').map((note, index) => (
                      <div key={index} className="mb-1">
                        {note.trim()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>

      {/* Rotulado Form Modal */}
      {showRotuladoForm && (
        <RotuladoForm
          service={service}
          viewMode={normalizedServiceStatus === SERVICE_STATUS.LABELED && existingLabels.length === service.bagCount}
          existingLabels={existingLabels}
          onClose={() => {
            setShowRotuladoForm(false);
            setSelectedStatus(service.status); // Reset selected status
          }}
          onStatusUpdated={() => {
            setShowRotuladoForm(false);
            onStatusUpdated();
            onClose();
          }}
        />
      )}

      {/* Process Decision Modal */}
      {showProcessDecision && (
        <ProcessDecisionModal
          service={service}
          onClose={() => {
            setShowProcessDecision(false);
          }}
          onStatusUpdated={() => {
            setShowProcessDecision(false);
            onStatusUpdated();
            onClose();
          }}
        />
      )}
    </div>
  );
};

export default ServiceWorkflowModal;