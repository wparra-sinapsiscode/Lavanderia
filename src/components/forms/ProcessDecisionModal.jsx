import React, { useState, useEffect } from 'react';
import { serviceStorage } from '../../utils/storage';
import { SERVICE_STATUS } from '../../types';
import { useNotifications } from '../../store/NotificationContext';
import { getStatusText } from '../../utils';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CheckCircle, Package, X } from 'lucide-react';

const ProcessDecisionModal = ({ service, onClose, onStatusUpdated }) => {
  const { success } = useNotifications();
  const [selectedBags, setSelectedBags] = useState([]);
  const [bagsToDeliver, setBagsToDeliver] = useState(Math.ceil(service.bagCount / 2));
  const [partialPercentage, setPartialPercentage] = useState(50);

  // Initialize bags array when component mounts
  useEffect(() => {
    if (service && service.bagCount > 0) {
      const bags = Array.from({ length: service.bagCount }, (_, index) => ({
        id: index + 1,
        number: `Bolsa ${index + 1}`,
        delivered: index < bagsToDeliver // Pre-select first half
      }));
      setSelectedBags(bags);
    }
  }, [service, bagsToDeliver]);

  // Update percentage when bags selection changes
  useEffect(() => {
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

  const handleComplete = () => {
    updateServiceStatus(SERVICE_STATUS.COMPLETED);
  };

  const handlePartial = () => {
    if (bagsToDeliver === 0) {
      alert('Debes seleccionar al menos una bolsa para entrega parcial');
      return;
    }
    updateServiceStatus(SERVICE_STATUS.PARTIAL_DELIVERY);
  };

  const updateServiceStatus = (newStatus) => {
    const services = serviceStorage.getServices();
    const updatedServices = services.map(s => {
      if (s.id === service.id) {
        const updatedService = {
          ...s,
          status: newStatus,
          internalNotes: (s.internalNotes || '') + 
            ` | Estado actualizado a ${getStatusText(newStatus)} - ${new Date().toLocaleString('es-PE')}`
        };

        // Handle partial delivery with bag details
        if (newStatus === SERVICE_STATUS.PARTIAL_DELIVERY) {
          const deliveredBags = selectedBags.filter(bag => bag.delivered);
          updatedService.partialDeliveryPercentage = partialPercentage;
          updatedService.deliveredBags = deliveredBags.map(bag => bag.number);
          updatedService.remainingBags = selectedBags.filter(bag => !bag.delivered).map(bag => bag.number);
          updatedService.internalNotes += ` | Entrega parcial: ${bagsToDeliver}/${service.bagCount} bolsas (${partialPercentage}%) | Entregadas: ${deliveredBags.map(b => b.number).join(', ')}`;
        }

        // Add timestamps for specific statuses
        const now = new Date().toISOString();
        if (newStatus === SERVICE_STATUS.COMPLETED) {
          updatedService.deliveryDate = now;
        }

        return updatedService;
      }
      return s;
    });

    serviceStorage.setServices(updatedServices);
    
    success(
      'Estado Actualizado',
      `Servicio actualizado a: ${getStatusText(newStatus)}`
    );
    
    onStatusUpdated();
    onClose();
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
                      Entrega Parcial
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
                          max={service.bagCount}
                          value={bagsToDeliver}
                          onChange={(e) => handleBagsToDeliverChange(parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
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
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3">
                        {selectedBags.map((bag) => (
                          <div
                            key={bag.id}
                            className={`
                              flex items-center justify-center p-2 rounded-md border-2 cursor-pointer transition-all text-xs font-medium
                              ${bag.delivered 
                                ? 'bg-orange-100 border-orange-500 text-orange-700' 
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
                    <div className="bg-orange-50 p-3 rounded-md">
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