import React, { useState } from 'react';
import { Check, Clock, Truck, Package, Tag, Cog, PackageCheck, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { SERVICE_STATUS, SERVICE_STATUS_CONFIG } from '../../constants';
import { formatDate } from '../../utils';
import Button from './Button';
import Card from './Card';

const ServiceDetailedTracker = ({ service, onStatusUpdate, onClose, className = "" }) => {
  const [selectedNewStatus, setSelectedNewStatus] = useState('');

  const steps = [
    {
      id: 'PENDING_PICKUP',
      label: 'Pendiente de Recojo',
      icon: Clock,
      description: 'Servicio registrado, esperando asignación',
      requirements: []
    },
    {
      id: 'ASSIGNED_TO_ROUTE',
      label: 'Repartidor en Camino',
      icon: Truck,
      description: 'Ruta iniciada, repartidor dirigiéndose al hotel',
      requirements: []
    },
    {
      id: 'PICKED_UP',
      label: 'Recogido',
      icon: Package,
      description: 'Bolsas recogidas físicamente del hotel',
      requirements: [
        { key: 'weight', label: 'Peso registrado', check: !!service?.weight },
        { key: 'photos', label: 'Fotos tomadas', check: !!service?.photos && service.photos.length > 0 },
        { key: 'signature', label: 'Firma del cliente', check: !!service?.signature },
        { key: 'collectorName', label: 'Nombre del recolector', check: !!service?.collectorName }
      ]
    },
    {
      id: 'LABELED',
      label: 'Rotulado',
      icon: Tag,
      description: 'Rótulos colocados y fotos tomadas',
      requirements: [
        { key: 'picked_up', label: 'Servicio recogido', check: service?.status === 'PICKED_UP' || getCurrentStepIndex() > 2 }
      ]
    },
    {
      id: 'IN_PROCESS',
      label: 'En Proceso',
      icon: Cog,
      description: 'Lavandería en proceso',
      requirements: [
        { key: 'labeled', label: 'Servicio rotulado', check: service?.status === 'LABELED' || getCurrentStepIndex() > 3 },
        { key: 'labels', label: 'Todas las bolsas etiquetadas', check: true } // This would need to be checked against actual labels
      ]
    },
    {
      id: 'PARTIAL_DELIVERY',
      label: 'Entrega Parcial',
      icon: PackageCheck,
      description: 'Entrega parcial realizada',
      requirements: [
        { key: 'in_process', label: 'Servicio en proceso', check: service?.status === 'IN_PROCESS' || getCurrentStepIndex() > 4 }
      ]
    },
    {
      id: 'COMPLETED',
      label: 'Completado',
      icon: CheckCircle,
      description: 'Servicio finalizado exitosamente',
      requirements: []
    }
  ];

  function getCurrentStepIndex() {
    return steps.findIndex(step => step.id === service?.status);
  }

  const currentStepIndex = getCurrentStepIndex();

  const getStepState = (stepIndex) => {
    if (service?.status === 'CANCELLED') {
      return 'cancelled';
    }
    
    if (stepIndex < currentStepIndex) {
      return 'completed';
    } else if (stepIndex === currentStepIndex) {
      return 'active';
    } else {
      return 'inactive';
    }
  };

  const getRequirementsMet = (step) => {
    if (!step.requirements || step.requirements.length === 0) return { met: 0, total: 0, allMet: true };
    
    const met = step.requirements.filter(req => req.check).length;
    const total = step.requirements.length;
    return { met, total, allMet: met === total };
  };

  const canAdvanceToStatus = (statusId) => {
    const stepIndex = steps.findIndex(s => s.id === statusId);
    if (stepIndex <= currentStepIndex) return true; // Can go back or stay
    if (stepIndex > currentStepIndex + 1) return false; // Can't skip steps
    
    // Check if current step requirements are met
    const currentStep = steps[currentStepIndex];
    if (currentStep) {
      const { allMet } = getRequirementsMet(currentStep);
      return allMet;
    }
    return true;
  };

  const handleStatusUpdate = () => {
    if (selectedNewStatus && onStatusUpdate) {
      onStatusUpdate(selectedNewStatus);
      setSelectedNewStatus('');
    }
  };

  const priorityColors = {
    'ALTA': 'text-red-600 bg-red-100',
    'MEDIA': 'text-yellow-600 bg-yellow-100',
    'BAJA': 'text-green-600 bg-green-100'
  };

  const shouldShowPartialDelivery = service?.status === 'PARTIAL_DELIVERY' || 
    (service && service.hasPartialDelivery);

  const visibleSteps = steps.filter(step => {
    if (step.id === 'PARTIAL_DELIVERY') {
      return shouldShowPartialDelivery;
    }
    return true;
  });

  return (
    <div className={`w-full ${className}`}>
      <Card>
        <Card.Header>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Seguimiento de Servicio</h2>
              <div className="mt-2 space-y-1">
                <p className="text-lg font-medium text-gray-800">
                  Cliente: {service?.guestName} - Hab. {service?.roomNumber}
                </p>
                <p className="text-gray-600">
                  Hotel: {typeof service?.hotel === 'object' ? service.hotel.name : service?.hotel}
                </p>
                <p className="text-gray-500 text-sm">
                  Registrado: {service?.createdAt ? formatDate(service.createdAt) : 'Sin fecha'}
                </p>
              </div>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card.Header>

        <Card.Content className="p-6">
          {/* Estado Actual */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-1">
              {SERVICE_STATUS_CONFIG[service?.status]?.label || service?.status}
            </h3>
            <p className="text-blue-700 text-sm">Estado actual del servicio</p>
          </div>

          {/* Flujo de Trabajo */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Flujo de Trabajo</h3>
            
            <div className="space-y-4">
              {visibleSteps.map((step, index) => {
                const state = getStepState(index);
                const requirements = getRequirementsMet(step);
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="flex items-start space-x-4 p-4 rounded-lg border transition-all duration-200 hover:shadow-sm">
                    {/* Icono */}
                    <div className={`
                      flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                      ${state === 'completed' ? 'bg-green-100 border-2 border-green-300' : 
                        state === 'active' ? 'bg-blue-100 border-2 border-blue-300' : 
                        'bg-gray-100 border-2 border-gray-300'}
                    `}>
                      {state === 'completed' ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Icon className={`w-5 h-5 ${
                          state === 'active' ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-medium ${
                          state === 'completed' ? 'text-green-800' :
                          state === 'active' ? 'text-blue-800' : 'text-gray-600'
                        }`}>
                          {step.label}
                        </h4>
                        
                        {/* Indicador de requisitos */}
                        {step.requirements.length > 0 && (
                          <div className="flex items-center space-x-2">
                            {requirements.allMet ? (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                ✓ Completo
                              </span>
                            ) : (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Faltan requisitos
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <p className={`text-sm mb-2 ${
                        state === 'active' ? 'text-gray-700' : 'text-gray-500'
                      }`}>
                        {step.description}
                      </p>

                      {/* Lista de requisitos */}
                      {step.requirements.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {step.requirements.map((req, reqIndex) => (
                            <div key={reqIndex} className="flex items-center text-sm">
                              <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                                req.check ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                              }`}>
                                {req.check ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                              </div>
                              <span className={req.check ? 'text-green-700' : 'text-red-700'}>
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detalles del Servicio */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles del Servicio</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Bolsas</p>
                <p className="text-xl font-bold text-gray-900">{service?.bagCount || 0}</p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Peso</p>
                <p className="text-xl font-bold text-gray-900">
                  {service?.weight ? `${service.weight} kg` : 'No registrado'}
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Repartidor</p>
                <p className="text-sm font-medium text-gray-900">
                  {service?.repartidor?.name || service?.repartidorName || 'No asignado'}
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600">Prioridad</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  priorityColors[service?.priority] || 'text-gray-600 bg-gray-100'
                }`}>
                  {service?.priority || 'MEDIA'}
                </span>
              </div>
            </div>

            {/* Observaciones */}
            {service?.observations && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-1">Observaciones</p>
                <p className="text-sm text-gray-800">{service.observations}</p>
              </div>
            )}
          </div>

          {/* Actualizar Estado */}
          {onStatusUpdate && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actualizar Estado</h3>
              
              <div className="flex items-center space-x-4">
                <select
                  value={selectedNewStatus}
                  onChange={(e) => setSelectedNewStatus(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Seleccionar nuevo estado</option>
                  {steps.map(step => (
                    <option 
                      key={step.id} 
                      value={step.id}
                      disabled={!canAdvanceToStatus(step.id)}
                    >
                      {step.label} {!canAdvanceToStatus(step.id) ? '(Requisitos no cumplidos)' : ''}
                    </option>
                  ))}
                </select>
                
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!selectedNewStatus}
                  className="px-6"
                >
                  Actualizar
                </Button>
              </div>
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default ServiceDetailedTracker;