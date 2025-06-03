import React from 'react';
import { Check, Clock, Truck, Package, Tag, Cog, PackageCheck, CheckCircle } from 'lucide-react';
import { SERVICE_STATUS, SERVICE_STATUS_CONFIG } from '../../constants';

const ServiceProgressTracker = ({ currentStatus, service, className = "" }) => {
  
  const steps = [
    {
      id: 'PENDING_PICKUP',
      label: 'Pendiente',
      icon: Clock,
      description: 'Servicio registrado'
    },
    {
      id: 'ASSIGNED_TO_ROUTE',
      label: 'Repartidor en Camino',
      icon: Truck,
      description: 'En ruta al hotel'
    },
    {
      id: 'PICKED_UP',
      label: 'Recogido',
      icon: Package,
      description: 'Bolsas recogidas'
    },
    {
      id: 'LABELED',
      label: 'Rotulado',
      icon: Tag,
      description: 'Bolsas etiquetadas'
    },
    {
      id: 'IN_PROCESS',
      label: 'En Proceso',
      icon: Cog,
      description: 'En lavandería'
    },
    {
      id: 'PARTIAL_DELIVERY',
      label: 'Entrega Parcial',
      icon: PackageCheck,
      description: 'Entrega parcial'
    },
    {
      id: 'COMPLETED',
      label: 'Completado',
      icon: CheckCircle,
      description: 'Servicio finalizado'
    }
  ];

  // Obtener el índice del estado actual
  const currentStepIndex = steps.findIndex(step => step.id === currentStatus);

  // Determinar el estado visual de cada paso
  const getStepState = (stepIndex) => {
    if (currentStatus === 'CANCELLED') {
      return 'cancelled';
    }
    
    if (stepIndex < currentStepIndex) {
      return 'completed'; // Ya pasó este paso
    } else if (stepIndex === currentStepIndex) {
      return 'active'; // Paso actual
    } else {
      return 'inactive'; // Aún no llega a este paso
    }
  };

  // Verificar si debe mostrar el paso de entrega parcial
  const shouldShowPartialDelivery = currentStatus === 'PARTIAL_DELIVERY' || 
    (service && service.hasPartialDelivery);

  // Filtrar pasos según el flujo actual
  const visibleSteps = steps.filter(step => {
    if (step.id === 'PARTIAL_DELIVERY') {
      return shouldShowPartialDelivery;
    }
    return true;
  });

  // Estilos para cada estado
  const getStepStyles = (state) => {
    switch (state) {
      case 'completed':
        return {
          container: 'bg-green-100 border-green-200',
          icon: 'text-green-600 bg-green-100',
          label: 'text-green-800 font-medium',
          description: 'text-green-600',
          connector: 'bg-green-300'
        };
      case 'active':
        return {
          container: 'bg-blue-100 border-blue-300 shadow-md',
          icon: 'text-blue-600 bg-blue-100',
          label: 'text-blue-800 font-semibold',
          description: 'text-blue-700',
          connector: 'bg-gray-300'
        };
      case 'inactive':
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-400 bg-gray-100',
          label: 'text-gray-500',
          description: 'text-gray-400',
          connector: 'bg-gray-300'
        };
      case 'cancelled':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-400 bg-red-100',
          label: 'text-red-500',
          description: 'text-red-400',
          connector: 'bg-red-300'
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-400 bg-gray-100',
          label: 'text-gray-500',
          description: 'text-gray-400',
          connector: 'bg-gray-300'
        };
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="relative">
        <div className="flex items-center justify-between">
          {visibleSteps.map((step, index) => {
            const state = getStepState(index);
            const styles = getStepStyles(state);
            const Icon = step.icon;
            const isLast = index === visibleSteps.length - 1;

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Paso */}
                <div className="flex flex-col items-center relative">
                  {/* Icono del paso */}
                  <div className={`
                    relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 ${styles.container}
                    flex items-center justify-center transition-all duration-300
                  `}>
                    {state === 'completed' ? (
                      <Check className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                    ) : (
                      <Icon className={`w-4 h-4 sm:w-6 sm:h-6 ${styles.icon.split(' ')[0]}`} />
                    )}
                  </div>
                  
                  {/* Etiqueta y descripción */}
                  <div className="mt-2 text-center min-w-0 max-w-24">
                    <div className={`text-xs sm:text-sm ${styles.label} leading-tight`}>
                      {step.label}
                    </div>
                    <div className={`text-xs ${styles.description} mt-1 leading-tight hidden sm:block`}>
                      {step.description}
                    </div>
                  </div>
                </div>

                {/* Conector */}
                {!isLast && (
                  <div className="flex-1 mx-2">
                    <div className={`h-1 ${styles.connector} transition-all duration-300`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Información adicional del servicio si está cancelado */}
        {currentStatus === 'CANCELLED' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-700">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm font-medium">Servicio Cancelado</span>
            </div>
          </div>
        )}

        {/* Información del estado actual */}
        {currentStatus !== 'CANCELLED' && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-blue-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm font-medium">
                  Estado Actual: {SERVICE_STATUS_CONFIG[currentStatus]?.label || currentStatus}
                </span>
              </div>
              
              {/* Información adicional según el estado */}
              {currentStatus === 'PICKED_UP' && service?.weight && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  Peso: {service.weight}kg
                </span>
              )}
              
              {currentStatus === 'PARTIAL_DELIVERY' && service?.deliveryPercentage && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  Entregado: {service.deliveryPercentage}%
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceProgressTracker;