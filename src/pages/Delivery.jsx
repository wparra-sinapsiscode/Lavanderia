import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import { serviceStorage, hotelStorage, storage } from '../utils/storage';
import { formatDate, getStatusColor, getStatusText } from '../utils';
import { SERVICE_STATUS } from '../types';
import { APP_CONFIG } from '../constants';
import DeliveryForm from '../components/forms/DeliveryForm';
import ServiceWorkflowModal from '../components/forms/ServiceWorkflowModal';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Truck, Clock, Package, MapPin, RefreshCw, UserCheck, GitBranch, CheckCircle } from 'lucide-react';

const Delivery = () => {
  const { user, isAdmin, isRepartidor } = useAuth();
  const { success, error } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [readyServices, setReadyServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [showReassignForm, setShowReassignForm] = useState(false);
  const [serviceToReassign, setServiceToReassign] = useState(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [serviceForWorkflow, setServiceForWorkflow] = useState(null);
  const [repartidores, setRepartidores] = useState([]);
  const [stats, setStats] = useState({
    readyForDelivery: 0,
    myDeliveries: 0,
    todayDeliveries: 0
  });

  useEffect(() => {
    loadDeliveryData();
  }, [user]);

  // Auto-refresh delivery data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadDeliveryData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Handle navigation from Routes page
  useEffect(() => {
    if (location.state?.selectedServiceId) {
      const services = serviceStorage.getServices();
      const preSelectedService = services.find(s => s.id === location.state.selectedServiceId);
      
      if (preSelectedService) {
        setSelectedService(preSelectedService);
        success('Servicio Pre-seleccionado', `Entrega para ${preSelectedService.guestName} en ${preSelectedService.hotel}`);
      }
    }
  }, [location.state]);

  const loadDeliveryData = () => {
    const services = serviceStorage.getServices();
    const allUsers = storage.get(APP_CONFIG.STORAGE_KEYS.USERS) || [];
    const hotels = hotelStorage.getHotels();
    
    // Load repartidores for reassignment
    const repartidoresList = allUsers.filter(u => u.role === 'repartidor');
    setRepartidores(repartidoresList);
    
    // Filter services ready for delivery (solo entrega parcial y completado)
    let ready = services.filter(s => 
      s.status === SERVICE_STATUS.PARTIAL_DELIVERY ||
      s.status === SERVICE_STATUS.COMPLETED
    );

    // For repartidores, show only their assigned deliveries
    if (isRepartidor) {
      ready = ready.filter(s => 
        !s.deliveryRepartidorId || s.deliveryRepartidorId === user.id
      );
    }

    setReadyServices(ready.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    ));

    // Calculate stats
    const readyForDelivery = ready.filter(s => 
      s.status === SERVICE_STATUS.PARTIAL_DELIVERY ||
      s.status === SERVICE_STATUS.COMPLETED
    ).length;
    const myDeliveries = services.filter(s => s.deliveryRepartidorId === user.id).length;
    const today = new Date().toDateString();
    const todayDeliveries = services.filter(s => 
      s.deliveryDate && new Date(s.deliveryDate).toDateString() === today
    ).length;

    setStats({
      readyForDelivery,
      myDeliveries,
      todayDeliveries
    });
  };

  const handleDeliveryCompleted = () => {
    loadDeliveryData();
    setSelectedService(null);
    
    // If we came from Routes, navigate back and update route status
    if (location.state?.returnTo === '/routes') {
      success('Entrega Completada', 'Regresando a rutas...');
      
      // Update route status if needed
      if (location.state?.routeId && location.state?.hotelIndex !== undefined) {
        updateRouteAfterDelivery(location.state.routeId, location.state.hotelIndex);
      }
      
      // Navigate back after a short delay to show the success message
      setTimeout(() => {
        navigate('/routes');
      }, 1500);
    }
  };

  const updateRouteAfterDelivery = (routeId, hotelIndex) => {
    try {
      const allRoutes = storage.get('PICKUP_ROUTES') || [];
      const routeToUpdate = allRoutes.find(r => r.id === routeId);
      
      if (!routeToUpdate) return;

      // Mark the hotel as completed if all services are done
      const updatedRoutes = allRoutes.map(route => {
        if (route.id === routeId) {
          const updatedHotels = route.hotels.map((hotel, index) => {
            if (index === hotelIndex) {
              // Check if all services in this hotel are completed
              const allServicesCompleted = hotel.services?.every(service => 
                service.status === SERVICE_STATUS.COMPLETED
              ) || false;

              return { 
                ...hotel, 
                completed: allServicesCompleted, 
                completedAt: allServicesCompleted ? new Date().toISOString() : hotel.completedAt,
                timeSpent: allServicesCompleted ? Math.floor(Math.random() * 30) + 30 : hotel.timeSpent
              };
            }
            return hotel;
          });
          
          const allCompleted = updatedHotels.every(h => h.completed);
          
          return {
            ...route,
            hotels: updatedHotels,
            status: allCompleted ? 'completada' : 'en_progreso',
            endTime: allCompleted ? new Date().toISOString() : route.endTime
          };
        }
        return route;
      });

      // Save updated routes
      storage.set('PICKUP_ROUTES', updatedRoutes);
      
      // Notify other pages about route changes
      window.dispatchEvent(new CustomEvent('routesUpdated', { 
        detail: { type: 'delivery_completion', routeId } 
      }));
      
      console.log('Route updated after delivery completion:', routeId);
    } catch (error) {
      console.error('Error updating route after delivery:', error);
    }
  };

  // Add manual refresh function for better UX
  const handleManualRefresh = () => {
    loadDeliveryData();
  };

  const handleReassignService = (service) => {
    setServiceToReassign(service);
    setShowReassignForm(true);
  };

  const handleReassignSubmit = (newRepartidorId) => {
    if (!serviceToReassign || !newRepartidorId) return;

    const selectedRepartidor = repartidores.find(r => r.id === newRepartidorId);
    if (!selectedRepartidor) return;

    const services = serviceStorage.getServices();
    const updatedServices = services.map(service => {
      if (service.id === serviceToReassign.id) {
        return {
          ...service,
          deliveryRepartidor: selectedRepartidor.name,
          deliveryRepartidorId: selectedRepartidor.id,
          internalNotes: (service.internalNotes || '') + 
            ` | Entrega asignada a ${selectedRepartidor.name} (${selectedRepartidor.zone}) - ${new Date().toLocaleString('es-PE')}`
        };
      }
      return service;
    });

    serviceStorage.setServices(updatedServices);
    
    // Note: Services will be automatically added to routes when "Generar Ruta" is pressed
    
    loadDeliveryData();
    setShowReassignForm(false);
    setServiceToReassign(null);
    
    success(
      'Entrega Asignada',
      `Entrega asignada a ${selectedRepartidor.name} (Zona ${selectedRepartidor.zone}). Aparecerá en rutas al generar ruta.`
    );
  };

  const handleWorkflowOpen = (service) => {
    setServiceForWorkflow(service);
    setShowWorkflowModal(true);
  };

  const handleWorkflowClose = () => {
    setShowWorkflowModal(false);
    setServiceForWorkflow(null);
  };

  const handleStatusUpdated = () => {
    loadDeliveryData();
  };


  const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => (
    <Card>
      <Card.Content className="p-6">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg bg-${color}-100`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </Card.Content>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Entregas
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            {isAdmin ? 'Administrar entregas de ropa lavada' : 'Entregas asignadas a tu zona'}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleManualRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => {
                console.log('=== DELIVERY DEBUG INFO ===');
                console.log('All services:', serviceStorage.getServices());
                console.log('Ready services:', readyServices);
                console.log('Current user:', user);
              }}
            >
              Debug Info
            </Button>
          )}
        </div>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Listos para Entrega"
          value={stats.readyForDelivery}
          icon={Package}
          color="green"
        />
        <StatCard
          title={isAdmin ? "Total Entregas" : "Mis Entregas"}
          value={stats.myDeliveries}
          icon={Truck}
          color="blue"
        />
        <StatCard
          title="Entregas Hoy"
          value={stats.todayDeliveries}
          icon={CheckCircle}
          color="purple"
        />
      </div>

      {/* Delivery Form */}
      {selectedService && (
        <DeliveryForm
          serviceId={selectedService.id}
          onClose={() => setSelectedService(null)}
          onDeliveryCompleted={handleDeliveryCompleted}
        />
      )}

      {/* Ready Services List */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900">
            Servicios para Entrega
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Incluye servicios listos, en entrega parcial y completados que requieren entrega
          </p>
        </Card.Header>
        <Card.Content className="p-0">
          {readyServices.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay servicios listos para entrega</p>
              <p className="text-sm">Todos los servicios están en proceso o entregados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hotel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bolsas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lavado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entregador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {readyServices.map((service) => (
                    <tr key={service.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {service.guestName}
                          </p>
                          <p className="text-sm text-gray-500">
                            Hab. {service.roomNumber}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {service.hotel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-900">
                            {service.bagCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(service.status)}`}>
                            {getStatusText(service.status)}
                          </span>
                          {isAdmin && (
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleWorkflowOpen(service)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-primary-600"
                              title="Seguimiento de Estado"
                            >
                              <GitBranch className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {service.pickupDate ? formatDate(service.pickupDate) : 'No recogido'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {service.deliveryRepartidor ? (
                          <div className="flex items-center space-x-2">
                            <span>{service.deliveryRepartidor}</span>
                            {isAdmin && (
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => handleReassignService(service)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                title="Reasignar"
                              >
                                <UserCheck className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          isAdmin ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReassignService(service)}
                              className="text-xs"
                            >
                              Asignar entregador
                            </Button>
                          ) : (
                            <span className="text-gray-400 italic">Sin asignar</span>
                          )
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {service.status === SERVICE_STATUS.PARTIAL_DELIVERY ? (
                            isRepartidor && service.deliveryRepartidorId === user.id ? (
                              <Button
                                size="sm"
                                onClick={() => setSelectedService(service)}
                                variant="outline"
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                Continuar Entrega
                              </Button>
                            ) : (
                              <div className="flex items-center text-orange-600">
                                <Package className="h-4 w-4 mr-1" />
                                <span>Entrega Parcial</span>
                              </div>
                            )
                          ) : service.status === SERVICE_STATUS.COMPLETED ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              <span>Completado</span>
                            </div>
                          ) : null}
                          {isAdmin && (service.status === SERVICE_STATUS.PARTIAL_DELIVERY || service.status === SERVICE_STATUS.COMPLETED) && !service.deliveryRepartidorId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReassignService(service)}
                              className="text-xs"
                            >
                              Asignar para entrega
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Instructions for Repartidores */}
      {isRepartidor && (
        <Card>
          <Card.Content className="p-6">
            <h4 className="font-medium text-gray-900 mb-2">
              Instrucciones para Entregas
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Verificar la identidad del receptor antes de la entrega</li>
              <li>• Confirmar que las bolsas corresponden al cliente</li>
              <li>• Contar las bolsas y verificar que coincida con el registro</li>
              <li>• Tomar fotos de la entrega y del receptor</li>
              <li>• Obtener la firma digital del receptor</li>
              <li>• Registrar el documento de identidad del receptor</li>
              <li>• Agregar observaciones sobre el estado de la ropa entregada</li>
            </ul>
          </Card.Content>
        </Card>
      )}

      {/* Reassignment Modal */}
      {showReassignForm && serviceToReassign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {serviceToReassign.deliveryRepartidorId ? 'Reasignar' : 'Asignar'} Entrega
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Hotel:</strong> {serviceToReassign.hotel}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Cliente:</strong> {serviceToReassign.guestName}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Bolsas:</strong> {serviceToReassign.bagCount}
                </p>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Entregador
                </label>
                <select
                  id="reassign-delivery-repartidor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  defaultValue={serviceToReassign.deliveryRepartidorId || ''}
                >
                  <option value="">Sin asignar</option>
                  {repartidores.map((repartidor) => (
                    <option key={repartidor.id} value={repartidor.id}>
                      {repartidor.name} - Zona {repartidor.zone}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex space-x-4">
                <Button
                  onClick={() => {
                    const select = document.getElementById('reassign-delivery-repartidor');
                    handleReassignSubmit(select.value);
                  }}
                  className="flex-1"
                >
                  {serviceToReassign.deliveryRepartidorId ? 'Reasignar' : 'Asignar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReassignForm(false);
                    setServiceToReassign(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Modal */}
      {showWorkflowModal && serviceForWorkflow && (
        <ServiceWorkflowModal
          service={serviceForWorkflow}
          onClose={handleWorkflowClose}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
};

export default Delivery;