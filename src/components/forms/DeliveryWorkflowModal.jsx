import React, { useState, useEffect } from 'react';
import { serviceStorage } from '../../utils/storage';
import { useNotifications } from '../../store/NotificationContext';
import { formatDate, getStatusColor, getStatusText } from '../../utils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Clock, Truck, CheckCircle, X, ArrowRight } from 'lucide-react';

const DeliveryWorkflowModal = ({ service, onClose, onStatusUpdated }) => {
  const { success } = useNotifications();
  const [currentService, setCurrentService] = useState(service);

  // Estados específicos para entrega (solo informativos)
  const DELIVERY_STATUS = {
    READY_FOR_DELIVERY: 'READY_FOR_DELIVERY',
    ASSIGNED_TO_ROUTE: 'ASSIGNED_TO_ROUTE',
    COMPLETED: 'COMPLETED'
  };

  // Pasos del workflow de entrega (solo lectura)
  const deliverySteps = [
    {
      status: DELIVERY_STATUS.READY_FOR_DELIVERY,
      title: 'Esperando',
      description: 'Listo para ser asignado',
      icon: Clock,
      color: 'amber'
    },
    {
      status: DELIVERY_STATUS.ASSIGNED_TO_ROUTE,
      title: 'Ruta Asignada',
      description: 'Repartidor en camino',
      icon: Truck,
      color: 'blue'
    },
    {
      status: DELIVERY_STATUS.COMPLETED,
      title: 'Completado',
      description: 'Entrega finalizada',
      icon: CheckCircle,
      color: 'green'
    }
  ];

  // Escuchar eventos de actualización de estado
  useEffect(() => {
    const handleServiceStatusUpdate = (event) => {
      const { serviceId, newStatus, updatedService } = event.detail;
      
      console.log('📡 DeliveryWorkflowModal recibió evento serviceStatusUpdated:', {
        serviceId,
        currentServiceId: currentService.id,
        newStatus
      });
      
      // Solo actualizar si es el mismo servicio
      if (serviceId === currentService.id) {
        console.log('🔄 Actualizando servicio en DeliveryWorkflowModal:', {
          oldStatus: currentService.status,
          newStatus: newStatus
        });
        
        const refreshedService = { 
          ...currentService, 
          status: newStatus,
          ...(updatedService || {})
        };
        
        setCurrentService(refreshedService);
        
        if (onStatusUpdated) {
          onStatusUpdated(refreshedService);
        }
      }
    };

    window.addEventListener('serviceStatusUpdated', handleServiceStatusUpdate);
    
    return () => {
      window.removeEventListener('serviceStatusUpdated', handleServiceStatusUpdate);
    };
  }, [currentService.id, onStatusUpdated]);

  // Actualizar cuando el prop service cambie
  useEffect(() => {
    if (service.id === currentService.id && service.status !== currentService.status) {
      console.log('🔄 Prop service cambió, actualizando currentService:', {
        oldStatus: currentService.status,
        newStatus: service.status
      });
      setCurrentService(service);
    }
  }, [service]);

  // Polling para detectar cambios en localStorage
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentService?.id) {
        const services = serviceStorage.getServices();
        const currentServiceInStorage = services.find(s => s.id === currentService.id);
        
        if (currentServiceInStorage && currentServiceInStorage.status !== currentService.status) {
          console.log('🔍 DeliveryWorkflowModal: Detectado cambio de estado en localStorage:', {
            serviceId: currentService.id,
            modalStatus: currentService.status,
            storageStatus: currentServiceInStorage.status
          });
          
          setCurrentService(currentServiceInStorage);
        }
      }
    }, 2000); // Verificar cada 2 segundos
    
    return () => clearInterval(interval);
  }, [currentService]);

  const getCurrentStepIndex = () => {
    return deliverySteps.findIndex(step => step.status === currentService.status);
  };

  // Helper function to get hotel name
  const getHotelName = (hotel) => {
    if (typeof hotel === 'object' && hotel?.name) {
      return hotel.name;
    }
    return hotel || 'No especificado';
  };

  // StatusStep - Solo informativo, sin interacción
  const StatusStep = ({ step, index, isActive, isCompleted }) => {
    const IconComponent = step.icon;
    
    return (
      <div className="flex flex-col items-center relative flex-1">
        <div className="flex flex-col items-center">
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
              ${isActive ? 'animate-pulse' : ''}
              ${isActive && step.color === 'amber' ? 'bg-amber-600 border-amber-600 text-white' :
                isActive && step.color === 'blue' ? 'bg-blue-600 border-blue-600 text-white' :
                isActive && step.color === 'green' ? 'bg-green-600 border-green-600 text-white' :
                isCompleted && step.color === 'amber' ? 'bg-amber-100 border-amber-500 text-amber-600' :
                isCompleted && step.color === 'blue' ? 'bg-blue-100 border-blue-500 text-blue-600' :
                isCompleted && step.color === 'green' ? 'bg-green-100 border-green-500 text-green-600' :
                'bg-gray-100 border-gray-300 text-gray-400'}
            `}
          >
            <IconComponent className="h-6 w-6" />
          </div>
          
          <div className="mt-3 text-center max-w-[120px]">
            <p className="text-sm font-medium text-gray-900 leading-tight">
              {step.title}
            </p>
            <p className="text-xs text-gray-500 mt-1 leading-tight">
              {step.description}
            </p>
            {isActive && (
              <p className="text-xs text-blue-600 mt-1 font-medium">
                Estado actual
              </p>
            )}
          </div>
        </div>
        
        {index < deliverySteps.length - 1 && (
          <div className="absolute top-6 left-full w-full flex justify-center pointer-events-none">
            <ArrowRight className="h-5 w-5 text-gray-300" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Seguimiento de Entrega
              </h3>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  <strong>Cliente:</strong> {currentService.guestName} - Hab. {currentService.roomNumber}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Hotel:</strong> {getHotelName(currentService.hotel)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Bolsas:</strong> {currentService.bagCount || currentService.deliveryBags?.length || 'No especificado'}
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

          {/* Estado Actual */}
          <Card className="mb-6">
            <Card.Content className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(currentService.status)}`}>
                    {getStatusText(currentService.status)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Estado actual de la entrega
                  </span>
                </div>
                
                {/* Estado informativo adicional */}
                {currentService.status === 'READY_FOR_DELIVERY' && currentService.deliveryRepartidor && (
                  <div className="text-sm">
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                      Asignado a: {currentService.deliveryRepartidor}
                    </div>
                  </div>
                )}
                
                {currentService.status === 'ASSIGNED_TO_ROUTE' && (
                  <div className="text-sm">
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium animate-pulse">
                      🚛 En ruta con {currentService.deliveryRepartidor}
                    </div>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>

          {/* Workflow Steps - Solo lectura */}
          <div className="mb-8">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Flujo de Entrega
            </h4>
            <div className="overflow-x-auto pb-4">
              <div className="flex items-center justify-between min-w-max px-4" style={{ minWidth: '600px' }}>
                {deliverySteps.map((step, index) => {
                  const currentIndex = getCurrentStepIndex();
                  
                  return (
                    <StatusStep
                      key={step.status}
                      step={step}
                      index={index}
                      isActive={index === currentIndex}
                      isCompleted={index < currentIndex}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Información de Entrega */}
          <Card className="mb-6">
            <Card.Header>
              <h5 className="font-medium text-gray-900">Información de Entrega</h5>
            </Card.Header>
            <Card.Content className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Fecha de Lavado</p>
                  <p className="font-medium">
                    {(() => {
                      if (currentService.washDate) {
                        return formatDate(currentService.washDate);
                      }
                      if (currentService.processStartDate) {
                        return formatDate(currentService.processStartDate);
                      }
                      if (currentService.internalNotes && currentService.internalNotes.includes('[PROCESS_START_DATE:')) {
                        const match = currentService.internalNotes.match(/\[PROCESS_START_DATE:([^\]]+)\]/);
                        if (match && match[1]) {
                          return formatDate(match[1]);
                        }
                      }
                      return formatDate(currentService.createdAt || currentService.timestamp);
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Repartidor Asignado</p>
                  <p className="font-medium">{currentService.deliveryRepartidor || 'Sin asignar'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Zona</p>
                  <p className="font-medium">
                    {(() => {
                      if (typeof currentService.hotel === 'object' && currentService.hotel.zone) {
                        return currentService.hotel.zone;
                      }
                      if (currentService.hotelZone) {
                        return currentService.hotelZone;
                      }
                      return 'No especificada';
                    })()}
                  </p>
                </div>
              </div>

              {/* Bolsas específicas si es servicio de entrega */}
              {currentService.deliveryBags && currentService.deliveryBags.length > 0 && (
                <div className="mt-4">
                  <p className="text-gray-500 text-sm">Bolsas para Entrega</p>
                  <p className="text-sm font-medium">{currentService.deliveryBags.join(', ')}</p>
                </div>
              )}

              {/* Observaciones */}
              {currentService.observations && (
                <div className="mt-4">
                  <p className="text-gray-500 text-sm">Observaciones</p>
                  <p className="text-sm">{currentService.observations}</p>
                </div>
              )}

              {/* Timeline simplificado para entregas */}
              <div className="mt-4">
                <p className="text-gray-500 text-sm mb-2">Historial de Entrega</p>
                <div className="space-y-2">
                  {/* Servicio listo */}
                  {currentService.createdAt && (
                    <div className="flex items-start space-x-2 text-xs">
                      <span className="text-sm">📅</span>
                      <div className="flex-1">
                        <span className="text-gray-500">
                          {formatDate(currentService.createdAt)}
                        </span>
                        <span className="text-gray-700 ml-2">
                          Servicio listo para entrega
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Asignación de repartidor */}
                  {currentService.deliveryRepartidor && (
                    <div className="flex items-start space-x-2 text-xs">
                      <span className="text-sm">👤</span>
                      <div className="flex-1">
                        <span className="text-gray-500">
                          {formatDate(currentService.updatedAt || currentService.createdAt)}
                        </span>
                        <span className="text-gray-700 ml-2">
                          Asignado a {currentService.deliveryRepartidor}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Ruta iniciada */}
                  {currentService.routeStartTime && (
                    <div className="flex items-start space-x-2 text-xs">
                      <span className="text-sm">🚛</span>
                      <div className="flex-1">
                        <span className="text-gray-500">
                          {formatDate(currentService.routeStartTime)}
                        </span>
                        <span className="text-gray-700 ml-2">
                          Ruta iniciada por {currentService.deliveryRepartidor}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Entrega completada */}
                  {currentService.deliveryDate && currentService.status === 'COMPLETED' && (
                    <div className="flex items-start space-x-2 text-xs">
                      <span className="text-sm">✅</span>
                      <div className="flex-1">
                        <span className="text-gray-500">
                          {formatDate(currentService.deliveryDate)}
                        </span>
                        <span className="text-gray-700 ml-2">
                          Entrega completada exitosamente
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notas técnicas si existen */}
              {currentService.internalNotes && (
                <div className="mt-4">
                  <p className="text-gray-500 text-sm">Notas Técnicas</p>
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1 max-h-32 overflow-y-auto">
                    {currentService.internalNotes.split('|').map((note, index) => (
                      <div key={index} className="mb-1">
                        {note.trim()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card.Content>
          </Card>

          {/* Botón Cerrar */}
          <div className="flex justify-end">
            <Button variant="primary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryWorkflowModal;