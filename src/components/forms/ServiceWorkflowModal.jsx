import React, { useState } from 'react';
import { serviceStorage, bagLabelStorage } from '../../utils/storage';
import { SERVICE_STATUS } from '../../types';
import { useNotifications } from '../../store/NotificationContext';
import { formatDate, getStatusColor, getStatusText } from '../../utils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import RotuladoForm from './RotuladoForm';
import { Clock, CheckCircle, Package, Truck, Star, X, ArrowRight, Tag } from 'lucide-react';

const ServiceWorkflowModal = ({ service, onClose, onStatusUpdated }) => {
  const { success, error } = useNotifications();
  const [selectedStatus, setSelectedStatus] = useState(service.status);
  const [notes, setNotes] = useState('');
  const [partialPercentage, setPartialPercentage] = useState(service.partialDeliveryPercentage || 50);
  const [selectedBags, setSelectedBags] = useState([]);
  const [bagsToDeliver, setBagsToDeliver] = useState(Math.ceil(service.bagCount / 2));
  const [showRotuladoForm, setShowRotuladoForm] = useState(false);

  const workflowSteps = [
    {
      status: SERVICE_STATUS.PENDING_PICKUP,
      title: 'Pendiente de Recojo',
      description: 'Servicio registrado, esperando recojo',
      icon: Clock,
      color: 'yellow'
    },
    {
      status: SERVICE_STATUS.PICKED_UP,
      title: 'Recogido',
      description: 'Bolsas recogidas del hotel',
      icon: Package,
      color: 'blue'
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
      status: SERVICE_STATUS.PARTIAL_DELIVERY,
      title: 'Entrega Parcial',
      description: 'Entrega parcial realizada',
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
    return workflowSteps.findIndex(step => step.status === service.status);
  };

  const getSelectedStepIndex = () => {
    return workflowSteps.findIndex(step => step.status === selectedStatus);
  };

  // Validation functions for each status transition
  const validateStatusRequirements = (targetStatus) => {
    switch (targetStatus) {
      case SERVICE_STATUS.PICKED_UP:
        // To mark as picked up, service must have been processed through pickup form
        return service.weight && service.photos && service.signature && service.collectorName;
      
      case SERVICE_STATUS.LABELED:
        // To mark as labeled, service must be picked up first
        return service.status === SERVICE_STATUS.PICKED_UP;
      
      case SERVICE_STATUS.IN_PROCESS:
        // To mark as in process, service must have labels
        const serviceLabels = bagLabelStorage.getBagLabelsByService(service.id);
        return service.status === SERVICE_STATUS.LABELED && 
               serviceLabels.length === service.bagCount &&
               serviceLabels.every(label => label.label && label.label.trim() !== '');
      
      default:
        return true;
    }
  };

  const getStatusRequirementMessage = (targetStatus) => {
    switch (targetStatus) {
      case SERVICE_STATUS.PICKED_UP:
        return 'Para marcar como recogido se requiere: peso, fotos, firma y nombre del recolector';
      
      case SERVICE_STATUS.LABELED:
        return 'Para marcar como rotulado, el servicio debe estar en estado "Recogido"';
      
      case SERVICE_STATUS.IN_PROCESS:
        const serviceLabels = bagLabelStorage.getBagLabelsByService(service.id);
        if (service.status !== SERVICE_STATUS.LABELED) {
          return 'Para marcar como "En Proceso", el servicio debe estar rotulado';
        }
        if (serviceLabels.length !== service.bagCount) {
          return `Para marcar como "En Proceso" se requieren ${service.bagCount} rótulos (actualmente: ${serviceLabels.length})`;
        }
        if (serviceLabels.some(label => !label.label || label.label.trim() === '')) {
          return 'Para marcar como "En Proceso" todos los rótulos deben tener contenido';
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
    
    // Special logic for bifurcation from "En Proceso"
    if (service.status === SERVICE_STATUS.IN_PROCESS) {
      // From "En Proceso" can go to either "Entrega Parcial" or "Completado"
      return targetStatus === SERVICE_STATUS.PARTIAL_DELIVERY || targetStatus === SERVICE_STATUS.COMPLETED;
    }
    
    // From "Entrega Parcial" can only go to "Completado"
    if (service.status === SERVICE_STATUS.PARTIAL_DELIVERY) {
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

  const StatusStep = ({ step, index, isActive, isCompleted, isSelected }) => {
    const IconComponent = step.icon;
    const canProgress = canProgressTo(step.status);
    const requiresValidation = !validateStatusRequirements(step.status);
    const requirementMessage = getStatusRequirementMessage(step.status);
    
    return (
      <div className="flex items-center">
        <div className="flex flex-col items-center relative">
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center border-2 cursor-pointer transition-all relative
              ${isSelected ? `bg-${step.color}-600 border-${step.color}-600 text-white` : 
                isCompleted ? `bg-${step.color}-100 border-${step.color}-500 text-${step.color}-600` :
                isActive ? `bg-${step.color}-50 border-${step.color}-400 text-${step.color}-600` :
                'bg-gray-100 border-gray-300 text-gray-400'}
              ${canProgress ? 'hover:scale-105' : 'opacity-50 cursor-not-allowed'}
              ${requiresValidation && !isCompleted && !isActive ? 'border-red-300 bg-red-50' : ''}
            `}
            onClick={() => canProgress && setSelectedStatus(step.status)}
            title={requiresValidation && !isCompleted && !isActive ? requirementMessage : ''}
          >
            <IconComponent className="h-6 w-6" />
            {requiresValidation && !isCompleted && !isActive && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            )}
          </div>
          <div className="mt-2 text-center min-w-[120px]">
            <p className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
              {step.title}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {step.description}
            </p>
            {requiresValidation && !isCompleted && !isActive && (
              <p className="text-xs text-red-500 mt-1 font-medium">
                Requisitos faltantes
              </p>
            )}
          </div>
        </div>
        
        {index < workflowSteps.length - 1 && (
          <ArrowRight className="h-6 w-6 text-gray-300 mx-4 mt-[-24px]" />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
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
                  <strong>Hotel:</strong> {service.hotel}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Registrado:</strong> {formatDate(service.timestamp)}
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
              <div className="flex items-center space-x-3">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(service.status)}`}>
                  {getStatusText(service.status)}
                </span>
                <span className="text-sm text-gray-500">
                  Estado actual del servicio
                </span>
              </div>
            </Card.Content>
          </Card>

          {/* Workflow Steps */}
          <div className="mb-8">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Flujo de Trabajo
            </h4>
            <div className="flex items-start justify-center overflow-x-auto pb-4">
              <div className="flex items-center space-x-0 min-w-max">
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

          {/* Selected Status Info */}
          {selectedStatus && selectedStatus !== service.status && (
            <Card className="mb-6">
              <Card.Content className="p-4">
                <h5 className="font-medium text-gray-900 mb-2">
                  Cambiar estado a: {getStatusText(selectedStatus)}
                </h5>
                
                {/* Requirements Validation */}
                {!validateStatusRequirements(selectedStatus) && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center mr-2">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                      <h6 className="text-sm font-medium text-red-800">Requisitos Faltantes</h6>
                    </div>
                    <p className="text-sm text-red-700 mt-1">
                      {getStatusRequirementMessage(selectedStatus)}
                    </p>
                  </div>
                )}
                
                {/* Partial Delivery Options */}
                {selectedStatus === SERVICE_STATUS.PARTIAL_DELIVERY && (
                  <div className="mb-6">
                    <h6 className="text-md font-medium text-gray-900 mb-4">
                      Configuración de Entrega Parcial
                    </h6>
                    
                    {/* Quick Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cantidad de Bolsas a Entregar
                      </label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="number"
                          min="1"
                          max={service.bagCount}
                          value={bagsToDeliver}
                          onChange={(e) => handleBagsToDeliverChange(parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                        <span className="text-sm text-gray-600">
                          de {service.bagCount} bolsas totales ({partialPercentage}%)
                        </span>
                      </div>
                    </div>

                    {/* Individual Bag Selection */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selección Individual de Bolsas
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                        {selectedBags.map((bag) => (
                          <div
                            key={bag.id}
                            className={`
                              flex items-center justify-center p-2 rounded-md border-2 cursor-pointer transition-all text-xs font-medium
                              ${bag.delivered 
                                ? 'bg-green-100 border-green-500 text-green-700' 
                                : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                              }
                            `}
                            onClick={() => handleBagToggle(bag.id)}
                          >
                            <Package className="h-3 w-3 mr-1" />
                            {bag.id}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Haz clic en las bolsas para seleccionar/deseleccionar las que se van a entregar
                      </p>
                    </div>

                    {/* Summary */}
                    <div className="bg-blue-50 p-3 rounded-md">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">
                          <strong>Para entregar:</strong> {selectedBags.filter(b => b.delivered).map(b => `Bolsa ${b.id}`).join(', ') || 'Ninguna'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-gray-700">
                          <strong>Pendientes:</strong> {selectedBags.filter(b => !b.delivered).map(b => `Bolsa ${b.id}`).join(', ') || 'Ninguna'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas adicionales (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Agregar observaciones sobre el cambio de estado..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    rows="3"
                  />
                </div>
              </Card.Content>
            </Card>
          )}

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
                  <p className="font-medium">{service.repartidor || 'Sin asignar'}</p>
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

              {service.internalNotes && (
                <div className="mt-4">
                  <p className="text-gray-500 text-sm">Historial de Cambios</p>
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

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              onClick={handleStatusUpdate}
              disabled={
                !selectedStatus || 
                selectedStatus === service.status || 
                !canProgressTo(selectedStatus) ||
                (selectedStatus === SERVICE_STATUS.PARTIAL_DELIVERY && bagsToDeliver === 0)
              }
              className="flex-1"
            >
              Actualizar Estado
              {selectedStatus === SERVICE_STATUS.PARTIAL_DELIVERY && ` (${bagsToDeliver}/${service.bagCount} bolsas)`}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>

      {/* Rotulado Form Modal */}
      {showRotuladoForm && (
        <RotuladoForm
          service={service}
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
    </div>
  );
};

export default ServiceWorkflowModal;