import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import { formatDate, getStatusColor, getStatusText } from '../utils';
import { SERVICE_STATUS, USER_ROLES } from '../types';
import serviceService from '../services/service.service';
import hotelService from '../services/hotel.service';
import userService from '../services/user.service';
import PickupForm from '../components/forms/PickupForm';
import GuestRegistrationForm from '../components/forms/GuestRegistrationForm';
import ServiceWorkflowModal from '../components/forms/ServiceWorkflowModal';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Truck, Clock, Package, MapPin, Plus, RefreshCw, UserCheck, GitBranch } from 'lucide-react';

const Pickup = () => {
  const { user, isAdmin, isRepartidor } = useAuth();
  const { showNotification } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingServices, setPendingServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showReassignForm, setShowReassignForm] = useState(false);
  const [serviceToReassign, setServiceToReassign] = useState(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [serviceForWorkflow, setServiceForWorkflow] = useState(null);
  const [repartidores, setRepartidores] = useState([]);
  const [stats, setStats] = useState({
    pendingPickups: 0,
    myPickups: 0,
    todayPickups: 0
  });

  useEffect(() => {
    if (user) {
      loadPickupData();
    }
  }, [user]);

  // Auto-refresh pickup data every 30 seconds to sync with route updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadPickupData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Handle navigation from Routes page
  useEffect(() => {
    async function loadSelectedService() {
      if (location.state?.selectedServiceId) {
        try {
          // Cargar el servicio específico desde la API
          const serviceResponse = await serviceService.getServiceById(location.state.selectedServiceId);
          
          if (serviceResponse.success && serviceResponse.data) {
            const preSelectedService = serviceResponse.data;
            setSelectedService(preSelectedService);
            
            // Determinar el nombre del hotel (puede venir como objeto o como nombre directo)
            const hotelName = typeof preSelectedService.hotel === 'object' 
              ? preSelectedService.hotel.name 
              : preSelectedService.hotel;
            
            showNotification({
              type: 'success',
              message: `Recojo para ${preSelectedService.guestName} en ${hotelName}`
            });
          } else {
            showNotification({
              type: 'error',
              message: 'No se pudo cargar el servicio seleccionado'
            });
          }
        } catch (error) {
          console.error('Error al cargar el servicio seleccionado:', error);
          showNotification({
            type: 'error',
            message: 'Error al cargar el servicio seleccionado'
          });
        }
      }
    }
    
    loadSelectedService();
  }, [location.state]);

  const loadPickupData = async () => {
    try {
      // Cargar servicios desde la API
      let services = [];
      let pending = [];
      
      if (isAdmin) {
        // Admin puede ver todos los servicios
        const servicesResponse = await serviceService.getAllServices();
        if (servicesResponse.success && servicesResponse.data) {
          services = servicesResponse.data;
        } else {
          throw new Error('No se pudieron obtener los servicios del administrador');
        }
      } else if (isRepartidor) {
        // Repartidor solo ve sus servicios asignados
        const myServicesResponse = await serviceService.getMyServices();
        if (myServicesResponse.success && myServicesResponse.data) {
          services = myServicesResponse.data;
        } else {
          throw new Error('No se pudieron obtener los servicios del repartidor');
        }
      }
      
      // Filtrar servicios cancelados
      pending = services.filter(s => s.status !== SERVICE_STATUS.CANCELLED);
      
      // Cargar repartidores para reasignación desde la API
      try {
        const repartidoresResponse = await userService.getRepartidores({ active: true });
        if (repartidoresResponse.success && repartidoresResponse.data) {
          setRepartidores(repartidoresResponse.data);
        } else {
          throw new Error('No se pudieron obtener los repartidores');
        }
      } catch (repartidoresError) {
        console.error('Error al cargar repartidores:', repartidoresError);
        setRepartidores([]);
      }
      
      // Ordenar servicios por fecha de creación (más reciente primero)
      setPendingServices(pending.sort((a, b) => 
        new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)
      ));
      
      // Calcular estadísticas
      const pendingPickups = pending.filter(s => s.status === SERVICE_STATUS.PENDING_PICKUP).length;
      
      // Total de servicios - lógica diferente para admin vs repartidor
      const myPickups = user.role === USER_ROLES.ADMIN 
        ? services.length // Admin ve todos los servicios
        : services.filter(s => 
            s.repartidorId === user.id && 
            (s.status === SERVICE_STATUS.PENDING_PICKUP || s.status === SERVICE_STATUS.PICKED_UP)
          ).length; // Repartidor solo ve sus servicios de recogida
      
      // Servicios de hoy (usando fecha del servidor, no local)
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const todayPickups = services.filter(s => {
        const pickupDate = s.pickupDate || s.createdAt || s.timestamp;
        return pickupDate && pickupDate.startsWith(today);
      }).length;
      
      setStats({
        pendingPickups,
        myPickups,
        todayPickups
      });
    } catch (error) {
      console.error('Error al cargar datos de servicios:', error);
      setPendingServices([]);
      setRepartidores([]);
      setStats({
        pendingPickups: 0,
        myPickups: 0,
        todayPickups: 0
      });
      showNotification({
        type: 'error',
        message: 'Error al cargar datos de servicios: ' + (error.message || 'Error desconocido')
      });
    }
  };

  const handlePickupCompleted = () => {
    loadPickupData();
    setSelectedService(null);
    
    // Si venimos de la página de Rutas, volver a ella
    if (location.state?.returnTo === '/routes') {
      showNotification({
        type: 'success',
        message: 'Recojo Completado. Regresando a rutas...'
      });
      
      // Notificar a otros componentes sobre la actualización
      window.dispatchEvent(new CustomEvent('serviceUpdated', { 
        detail: { 
          type: 'pickup_completion', 
          serviceId: selectedService?.id 
        } 
      }));
      
      // Navegar de regreso después de un breve retraso para mostrar el mensaje
      setTimeout(() => {
        navigate('/routes');
      }, 1500);
    }
  };

  const handleServiceCreated = () => {
    loadPickupData();
    setShowCreateForm(false);
    
    // Notificar a otros componentes sobre la creación de un nuevo servicio
    window.dispatchEvent(new CustomEvent('serviceUpdated', { 
      detail: { type: 'service_created' } 
    }));
  };

  // Función de actualización manual para mejor experiencia de usuario
  const handleManualRefresh = () => {
    loadPickupData();
  };

  const handleReassignService = (service) => {
    setServiceToReassign(service);
    setShowReassignForm(true);
  };

  const handleReassignSubmit = async (newRepartidorId) => {
    if (!serviceToReassign || !newRepartidorId) return;

    const selectedRepartidor = repartidores.find(r => r.id === newRepartidorId);
    if (!selectedRepartidor) return;
    
    try {
      // Actualizar el servicio mediante la API
      const updateSuccess = await serviceService.updateServiceStatus(serviceToReassign.id, {
        status: serviceToReassign.status, // Mantener el mismo estado
        repartidorId: newRepartidorId,
        internalNotes: `Reasignado a ${selectedRepartidor.name} (${selectedRepartidor.zone})`
      });
      
      if (!updateSuccess || !updateSuccess.success) {
        throw new Error('Error al actualizar el servicio en la API');
      }
      
      // Actualizar la UI
      showNotification({
        type: 'success',
        message: `Servicio reasignado a ${selectedRepartidor.name}`
      });
      
      // Notificar a otros componentes sobre la reasignación
      window.dispatchEvent(new CustomEvent('serviceUpdated', { 
        detail: { 
          type: 'reassignment', 
          serviceId: serviceToReassign.id 
        } 
      }));
      
      // Recargar datos y cerrar el formulario
      loadPickupData();
      setShowReassignForm(false);
      setServiceToReassign(null);
      
    } catch (error) {
      console.error('Error al reasignar el servicio:', error);
      showNotification({
        type: 'error',
        message: `Error al reasignar: ${error.message || 'Error desconocido'}`
      });
    }
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
    loadPickupData();
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
            Gestión de servicios
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            {isAdmin ? 'Administrar todos los servicios de recojo y entrega' : 'Servicios de recojo y entrega asignados a tu zona'}
          </p>
        </div>
        
        <div className="flex space-x-3">
          {isAdmin && (
            <Button
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Servicio
            </Button>
          )}
          
          <Button
            variant="outline"
            onClick={handleManualRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Pendientes de Recojo"
          value={stats.pendingPickups}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title={isAdmin ? "Total Servicios" : "Mis Servicios"}
          value={stats.myPickups}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Servicios Hoy"
          value={stats.todayPickups}
          icon={Truck}
          color="green"
        />
      </div>

      {/* Create Service Form */}
      {showCreateForm && (
        <GuestRegistrationForm
          onClose={() => setShowCreateForm(false)}
          onServiceCreated={handleServiceCreated}
        />
      )}

      {/* Pickup Form */}
      {selectedService && (
        <PickupForm
          serviceId={selectedService.id}
          onClose={() => setSelectedService(null)}
          onPickupCompleted={handlePickupCompleted}
        />
      )}

      {/* Pending Pickups List */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900">
            Servicios Activos - Seguimiento
          </h3>
        </Card.Header>
        <Card.Content className="p-0">
          {pendingServices.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay servicios activos</p>
              <p className="text-sm">Todos los servicios están completados</p>
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
                      Registro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Repartidor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingServices.map((service) => (
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
                        {typeof service.hotel === 'object' ? service.hotel.name : service.hotel}
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
                        {formatDate(service.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {service.repartidor ? (
                          <div className="flex items-center space-x-2">
                            <span>{typeof service.repartidor === 'object' ? service.repartidor.name : service.repartidor}</span>
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
                              Asignar repartidor
                            </Button>
                          ) : (
                            <span className="text-gray-400 italic">Sin asignar</span>
                          )
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {service.status === SERVICE_STATUS.PENDING_PICKUP ? (
                          isRepartidor ? (
                            <Button
                              size="sm"
                              onClick={() => setSelectedService(service)}
                            >
                              <Truck className="h-4 w-4 mr-1" />
                              Recoger
                            </Button>
                          ) : (
                            <span className="text-gray-400 italic">Solo repartidor</span>
                          )
                        ) : (
                          <div className="flex items-center text-green-600">
                            <Package className="h-4 w-4 mr-1" />
                            <span>Recogido</span>
                          </div>
                        )}
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
              Instrucciones para Servicios
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Verificar la identidad del huésped antes del recojo</li>
              <li>• Pesar las bolsas y registrar el peso exacto</li>
              <li>• Tomar fotos de las bolsas antes del recojo</li>
              <li>• Obtener la firma digital del cliente</li>
              <li>• Verificar que la ubicación sea correcta</li>
              <li>• Agregar observaciones si hay algo especial</li>
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
                {serviceToReassign.repartidorId ? 'Reasignar' : 'Asignar'} Recojo
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Hotel:</strong> {typeof serviceToReassign.hotel === 'object' ? serviceToReassign.hotel.name : serviceToReassign.hotel}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Contacto:</strong> {serviceToReassign.guestName}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Bolsas:</strong> {serviceToReassign.bagCount}
                </p>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Repartidor
                </label>
                <select
                  id="reassign-repartidor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  defaultValue={serviceToReassign.repartidorId || ''}
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
                    const select = document.getElementById('reassign-repartidor');
                    handleReassignSubmit(select.value);
                  }}
                  className="flex-1"
                >
                  {serviceToReassign.repartidorId ? 'Reasignar' : 'Asignar'}
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

export default Pickup;