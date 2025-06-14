import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import { formatDate, getStatusColor, getStatusText } from '../utils';
import { SERVICE_STATUS, USER_ROLES } from '../types';
import { APP_CONFIG, SERVICE_STATUS_CONFIG } from '../constants';
import serviceService from '../services/service.service';
import hotelService from '../services/hotel.service';
import userService from '../services/user.service';
import { serviceStorage, storage } from '../utils/storage';
import PickupForm from '../components/forms/PickupForm';
import GuestRegistrationForm from '../components/forms/GuestRegistrationForm';
import ServiceWorkflowModal from '../components/forms/ServiceWorkflowModal';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Truck, Clock, Package, MapPin, Plus, RefreshCw, UserCheck, GitBranch, Tag, Star, CheckCircle } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
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

  // Event listener para actualizar servicios cuando cambien estados
  useEffect(() => {
    const handleServiceStatusUpdate = (event) => {
      const { serviceId, newStatus, updatedService, source } = event.detail;
      
      console.log('📡 Pickup.jsx recibió evento serviceStatusUpdated:', {
        serviceId,
        newStatus,
        source,
        currentServiceForWorkflow: serviceForWorkflow?.id
      });
      
      // Actualizar la lista de servicios INMEDIATAMENTE
      console.log('🔄 Forzando recarga inmediata de datos...');
      loadPickupData();
      
      // Actualizar serviceForWorkflow si está abierto y es el mismo servicio
      if (serviceForWorkflow && serviceForWorkflow.id === serviceId) {
        console.log('🔄 Actualizando serviceForWorkflow desde evento:', {
          oldStatus: serviceForWorkflow.status,
          newStatus: newStatus
        });
        
        const refreshedService = { 
          ...serviceForWorkflow, 
          status: newStatus,
          ...(updatedService || {})
        };
        
        setServiceForWorkflow(refreshedService);
      }
    };

    // Agregar event listener
    window.addEventListener('serviceStatusUpdated', handleServiceStatusUpdate);
    
    // Cleanup
    return () => {
      window.removeEventListener('serviceStatusUpdated', handleServiceStatusUpdate);
    };
  }, [serviceForWorkflow]);

  // Auto-refresh pickup data periodically to sync with route updates
  useEffect(() => {
    // En modo producción actualizaríamos cada 30 segundos
    // Pero para evitar demasiados errores en la consola durante desarrollo,
    // usamos un intervalo más largo (2 minutos)
    const interval = setInterval(() => {
      // Solo refrescar si el componente está visible
      if (document.visibilityState === 'visible') {
        loadPickupData();
      }
    }, 120000); // 2 minutos

    // También actualizar cuando la pestaña vuelva a estar visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadPickupData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
    setLoading(true);
    let services = [];
    let pending = [];
    let onlineMode = true;
    
    try {
      // Primero intentamos cargar desde la API
      if (isAdmin) {
        // 🆕 Admin puede ver solo servicios PICKUP (no servicios de entrega)
        const servicesResponse = await serviceService.getServicesByType('PICKUP');
        if (servicesResponse.success && servicesResponse.data) {
          services = servicesResponse.data;
          console.log('🔍 DEBUG - Servicios PICKUP cargados por admin:', services.length);
          services.forEach((service, index) => {
            console.log(`🔍 Servicio ${index + 1}:`, {
              id: service.id,
              guestName: service.guestName,
              status: service.status,
              serviceType: service.serviceType,
              hasWeight: !!service.weight,
              hasPhotos: !!service.photos && service.photos.length > 0,
              hasSignature: !!service.signature
            });
          });
        } else {
          throw new Error('No se pudieron obtener los servicios PICKUP del administrador');
        }
      } else if (isRepartidor) {
        // Repartidor usa su endpoint específico
        const servicesResponse = await serviceService.getMyServices();
        if (servicesResponse.success && servicesResponse.data) {
          services = servicesResponse.data;
          console.log(`Repartidor: ${services.length} servicios cargados desde API`);
        } else {
          throw new Error('No se pudieron obtener los servicios del repartidor desde API');
        }
      }
      
      // Cargar repartidores para reasignación desde la API (solo si llegamos hasta aquí)
      try {
        const repartidoresResponse = await userService.getRepartidores({ active: true });
        if (repartidoresResponse.success && repartidoresResponse.data) {
          setRepartidores(repartidoresResponse.data);
        } else {
          console.warn('No se pudieron obtener los repartidores de la API');
        }
      } catch (repartidoresError) {
        console.error('Error al cargar repartidores:', repartidoresError);
      }
    } catch (error) {
      console.log('Cambiando a modo offline:', error.message);
      onlineMode = false;
      
      // Modo Offline: cargar desde almacenamiento local
      if (isAdmin) {
        // Admin ve todos los servicios locales
        services = serviceStorage.getServices();
        console.log(`Admin: ${services.length} servicios cargados desde almacenamiento local`);
      } else if (isRepartidor) {
        console.log(`Cargando servicios en modo offline para ${user.name} (Zona: ${user.zone})`);
        
        // Obtener servicios por repartidor y por zona
        const myAssignedServices = serviceStorage.getServicesByRepartidor(user.id);
        const myZoneServices = serviceStorage.getServicesByZone(user.zone);
        
        // Combinar servicios (asignados + pendientes de la zona)
        services = [...myAssignedServices];
        
        // Añadir servicios pendientes de la zona que no estén asignados
        myZoneServices.forEach(zoneService => {
          if (!zoneService.repartidorId && zoneService.status === 'PENDING_PICKUP') {
            // Solo añadir si no existe ya en la lista
            if (!services.some(s => s.id === zoneService.id)) {
              services.push(zoneService);
            }
          }
        });
        
        console.log(`Repartidor: ${services.length} servicios cargados (${myAssignedServices.length} asignados, ${myZoneServices.length} en zona)`);
        
        // Intentar cargar repartidores desde local si está disponible
        try {
          // Intentar usar la clave de almacenamiento más común para usuarios
          const userList = storage.get('users') || storage.get('repartidores') || 
                          storage.get(APP_CONFIG?.STORAGE_KEYS?.USERS) || [];
          
          // Filtrar por repartidores activos
          const localRepartidores = userList.filter(u => 
            (u.role === USER_ROLES.REPARTIDOR || u.role === 'REPARTIDOR') && 
            (u.active === true || u.active === undefined)
          );
          
          if (localRepartidores.length > 0) {
            console.log(`${localRepartidores.length} repartidores cargados desde almacenamiento local`);
            setRepartidores(localRepartidores);
          } else {
            // Si no hay repartidores en el almacenamiento, al menos agregamos al usuario actual
            // esto permite que un repartidor pueda autorreasignarse servicios
            if (user && user.role === USER_ROLES.REPARTIDOR) {
              setRepartidores([user]);
            }
          }
        } catch (localUserError) {
          console.error('Error al cargar repartidores locales:', localUserError);
          // Agregar al usuario actual como fallback
          if (user && user.role === USER_ROLES.REPARTIDOR) {
            setRepartidores([user]);
          }
        }
      }
      
      // Si estamos en modo offline, mostramos notificación
      if (!onlineMode) {
        showNotification({
          type: 'warning',
          message: 'Trabajando en modo offline. Sincronización automática cuando haya conexión.'
        });
      }
      
      // Sincronización en segundo plano para repartidores (no bloquea UI)
      if (isRepartidor) {
        serviceService.getMyServices().then(response => {
          if (response.success && response.data && response.data.length > 0) {
            console.log('Sincronización en segundo plano completada:', response.data.length, 'servicios');
          }
        }).catch(err => console.error('Error en sincronización en segundo plano:', err));
      }
    }
    
    // A partir de aquí, procesamos los datos sin importar de dónde vengan (API o local)
    
    // Filtrar servicios cancelados
    pending = services.filter(s => s.status !== 'CANCELLED');
    
    // Ordenar servicios por fecha de creación (más reciente primero)
    const sortedServices = pending.sort((a, b) => 
      new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)
    );
    
    setPendingServices(sortedServices);
    
    // Calcular estadísticas
    const pendingPickups = pending.filter(s => s.status === 'PENDING_PICKUP' || s.status === 'ASSIGNED_TO_ROUTE').length;
    
    // Total de servicios - lógica diferente para admin vs repartidor
    const myPickups = isAdmin 
      ? pending.length 
      : pending.filter(s => 
          s.repartidorId === user.id && 
          (s.status === 'PENDING_PICKUP' || s.status === 'ASSIGNED_TO_ROUTE' || s.status === 'PICKED_UP')
        ).length;
    
    // Servicios de hoy (usando fecha del servidor o local)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const todayPickups = pending.filter(s => {
      const pickupDate = s.pickupDate || s.createdAt || s.timestamp;
      return pickupDate && pickupDate.startsWith(today);
    }).length;
    
    setStats({
      pendingPickups,
      myPickups,
      todayPickups
    });
    
    // Si no hay servicios y estamos en modo offline, mostrar mensaje
    if (pending.length === 0) {
      showNotification({
        type: 'info',
        message: onlineMode 
          ? 'No hay servicios activos en este momento' 
          : 'No hay servicios disponibles en modo offline'
      });
    }
    
    setLoading(false);
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
    // Cargar los datos
    loadPickupData();
    
    showNotification({
      type: 'success',
      message: 'Datos actualizados correctamente'
    });
  };

  // Confirmar recogida de un servicio que ya tiene datos pero está pendiente
  const handleConfirmPickup = async (service) => {
    try {
      console.log('Confirmando recogida para servicio:', service.id);
      
      const updateData = {
        status: 'PICKED_UP',
        pickupDate: new Date().toISOString(),
        internalNotes: (service.internalNotes || '') + 
          `\n[${new Date().toLocaleString()}] Recogida confirmada por ${user.name}`
      };
      
      // Intentar actualizar en la API
      try {
        const apiResponse = await serviceService.updateServiceStatus(service.id, updateData);
        
        if (apiResponse && apiResponse.success) {
          console.log('Recogida confirmada en la API');
        } else {
          throw new Error('Error al confirmar en API');
        }
      } catch (apiError) {
        console.warn('Error al confirmar en API, actualizando localmente:', apiError);
        
        // Actualizar en almacenamiento local
        const localSuccess = serviceStorage.updateService(service.id, updateData);
        
        if (!localSuccess) {
          throw new Error('Error al actualizar servicio en almacenamiento local');
        }
      }
      
      showNotification({
        type: 'success',
        message: `Recogida confirmada para ${service.guestName}`
      });
      
      // Recargar datos
      loadPickupData();
      
      // Notificar a otros componentes
      window.dispatchEvent(new CustomEvent('serviceUpdated', { 
        detail: { 
          type: 'pickup_confirmed', 
          serviceId: service.id 
        } 
      }));
      
    } catch (error) {
      console.error('Error al confirmar recogida:', error);
      showNotification({
        type: 'error',
        message: `Error al confirmar recogida: ${error.message}`
      });
    }
  };

  // Ya no necesitamos reasignar servicios, ahora se asignan a la zona
  // Esta función se mantiene solo para compatibilidad con servicios ya asignados anteriormente
  const handleReassignService = (service) => {
    setServiceToReassign(service);
    setShowReassignForm(true);
  };

  const handleReassignSubmit = async (newRepartidorId) => {
    if (!serviceToReassign) return;

    // Si newRepartidorId está vacío, significa que estamos desasignando el repartidor
    const isDesassigning = !newRepartidorId;
    const selectedRepartidor = isDesassigning ? null : repartidores.find(r => r.id === newRepartidorId);
    
    if (!isDesassigning && !selectedRepartidor) return;
    
    try {
      // Preparar datos de actualización según si estamos asignando o desasignando
      let updateData;
      let notesText;
      
      if (isDesassigning) {
        // Desasignar repartidor (volver al modelo basado en zonas)
        updateData = {
          repartidorId: null,
          repartidor: null,
          lastUpdated: new Date().toISOString(),
          internalNotes: (serviceToReassign.internalNotes || '') + 
            `\n[${new Date().toLocaleString()}] Desasignado de repartidor específico. Disponible para cualquier repartidor de la zona.`
        };
        notesText = "Desasignado de repartidor específico";
      } else {
        // Asignar a un repartidor específico
        updateData = {
          repartidorId: newRepartidorId,
          repartidor: {
            id: selectedRepartidor.id,
            name: selectedRepartidor.name,
            zone: selectedRepartidor.zone
          },
          lastUpdated: new Date().toISOString(),
          internalNotes: (serviceToReassign.internalNotes || '') + 
            `\n[${new Date().toLocaleString()}] Reasignado a ${selectedRepartidor.name} (${selectedRepartidor.zone})`
        };
        notesText = `Reasignado a ${selectedRepartidor.name} (${selectedRepartidor.zone})`;
      }
      
      // Primero actualizar en almacenamiento local
      const localSuccess = serviceStorage.updateService(serviceToReassign.id, updateData);
      
      if (!localSuccess) {
        throw new Error('Error al actualizar servicio en almacenamiento local');
      }
      
      // Intentar actualizar en la API (pero no bloquear si falla)
      try {
        const apiResponse = await serviceService.updateServiceStatus(serviceToReassign.id, {
          status: serviceToReassign.status, // Mantener el mismo estado
          repartidorId: isDesassigning ? null : newRepartidorId,
          internalNotes: notesText
        });
        
        if (!apiResponse || !apiResponse.success) {
          console.warn('No se pudo actualizar el servicio en la API, pero se guardó localmente');
        }
      } catch (apiError) {
        console.warn('Error al actualizar servicio en API (funcionando en modo offline):', apiError.message);
      }
      
      // Actualizar la UI
      showNotification({
        type: 'success',
        message: isDesassigning ? 
          "Servicio desasignado. Disponible para cualquier repartidor de la zona." : 
          `Servicio asignado a ${selectedRepartidor.name}`
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
      console.error('Error al gestionar la asignación del servicio:', error);
      showNotification({
        type: 'error',
        message: `Error: ${error.message || 'Error desconocido'}`
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
    
    // 🔧 FIX: Actualizar también serviceForWorkflow si está abierto el modal
    if (serviceForWorkflow) {
      const services = serviceStorage.getServices();
      const updatedService = services.find(s => s.id === serviceForWorkflow.id);
      if (updatedService) {
        console.log('🔄 Actualizando serviceForWorkflow con datos más recientes:', {
          serviceId: serviceForWorkflow.id,
          oldStatus: serviceForWorkflow.status,
          newStatus: updatedService.status
        });
        setServiceForWorkflow(updatedService);
      }
    }
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

  // Mostrar loading state
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando servicios...</p>
          </div>
        </div>
      </div>
    );
  }

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
            Servicios Activos - Lista Detallada
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
                      Zona
                    </th>
                    {/* Solo mostrar columna de acciones si hay servicios que permiten acciones */}
                    {(isAdmin || pendingServices.some(s => s.status === 'ASSIGNED_TO_ROUTE' || (s.status === 'PENDING_PICKUP' && s.weight && s.photos && s.signature))) && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingServices.map((service) => (
                    <tr key={service.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <button
                            onClick={() => setSelectedService(service)}
                            className="text-left hover:bg-gray-50 p-1 rounded transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-900 hover:text-blue-600">
                              {service.guestName}
                            </p>
                            <p className="text-sm text-gray-500">
                              Hab. {service.roomNumber}
                            </p>
                          </button>
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
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            service.status === 'PENDING_PICKUP' && service.weight && service.photos && service.signature
                              ? 'bg-yellow-100 text-yellow-800' 
                              : SERVICE_STATUS_CONFIG[service.status]?.badgeClasses || getStatusColor(service.status)
                          }`}>
                            {service.status === 'PENDING_PICKUP' && service.weight && service.photos && service.signature
                              ? 'Listo para confirmar'
                              : SERVICE_STATUS_CONFIG[service.status]?.label || getStatusText(service.status)
                            }
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
                        {formatDate(service.timestamp || service.createdAt || service.pickupDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {typeof service.hotel === 'object' ? 
                              service.hotel.zone : 
                              (service.hotelZone || "No disponible")}
                          </span>
                        </div>
                      </td>
                      {/* Solo mostrar celda de acciones si la columna está visible */}
                      {(isAdmin || pendingServices.some(s => s.status === 'ASSIGNED_TO_ROUTE' || (s.status === 'PENDING_PICKUP' && s.weight && s.photos && s.signature))) && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {/* Botones de acción originales */}
                            {service.status === 'PENDING_PICKUP' || service.status === 'ASSIGNED_TO_ROUTE' ? (
                              // Servicios en estado PENDING_PICKUP
                              service.weight && service.photos && service.signature ? (
                                // Tiene datos pero no confirmado
                                isRepartidor ? (
                                  <Button
                                    size="sm"
                                    className="bg-yellow-600 hover:bg-yellow-700"
                                    onClick={() => handleConfirmPickup(service)}
                                  >
                                    <UserCheck className="h-4 w-4 mr-1" />
                                    Confirmar Recogida
                                  </Button>
                                ) : (
                                  <div className="flex items-center text-yellow-600">
                                    <Clock className="h-4 w-4 mr-1" />
                                    <span>Listo para confirmar</span>
                                  </div>
                                )
                              ) : (
                                // Sin datos de recogida
                                isRepartidor ? (
                                  service.status === 'PENDING_PICKUP' ? (
                                    // Servicio pendiente - no mostrar nada ya que no hay columna de acciones
                                    <span className="text-gray-400 text-xs">-</span>
                                  ) : (
                                    // Servicio con ruta iniciada (ASSIGNED_TO_ROUTE) - puede recoger
                                    <Button
                                      size="sm"
                                      onClick={() => setSelectedService(service)}
                                    >
                                      <Truck className="h-4 w-4 mr-1" />
                                      Recoger
                                    </Button>
                                  )
                                ) : (
                                  <div className={`flex items-center ${SERVICE_STATUS_CONFIG[service.status]?.textColor || 'text-red-600'}`}>
                                    <Clock className="h-4 w-4 mr-1" />
                                    <span>{SERVICE_STATUS_CONFIG[service.status]?.action || 'Pendiente'}</span>
                                  </div>
                                )
                              )
                            ) : service.status === 'PICKED_UP' ? (
                              <div className="flex items-center text-green-600">
                                <Package className="h-4 w-4 mr-1" />
                                <span>Recogido</span>
                              </div>
                            ) : service.status === 'LABELED' ? (
                              <div className="flex items-center text-indigo-600">
                                <Tag className="h-4 w-4 mr-1" />
                                <span>Rotulado</span>
                              </div>
                            ) : service.status === 'IN_PROCESS' ? (
                              <div className="flex items-center text-purple-600">
                                <Star className="h-4 w-4 mr-1" />
                                <span>En proceso</span>
                              </div>
                            ) : service.status === 'PARTIAL_DELIVERY' ? (
                              <div className="flex items-center text-orange-600">
                                <Package className="h-4 w-4 mr-1" />
                                <span>Entrega parcial</span>
                              </div>
                            ) : service.status === 'COMPLETED' ? (
                              <div className="flex items-center text-green-600">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                <span>Completado</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-600">
                                <Clock className="h-4 w-4 mr-1" />
                                <span>Estado desconocido</span>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
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
              <li>• Verificar que la ubicación sea correcta</li>
              <li>• Agregar observaciones si hay algo especial</li>
              <li>• Registrar el nombre del responsable que entrega</li>
            </ul>
          </Card.Content>
        </Card>
      )}

      {/* Reassignment Modal - Solo para compatibilidad con servicios ya asignados anteriormente */}
      {showReassignForm && serviceToReassign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Gestionar Asignación
              </h3>
              <div className="mb-4">
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-blue-800 font-medium mb-1">Información de Zona</p>
                  <p className="text-sm text-blue-600">
                    Este servicio pertenece a la zona <strong>{typeof serviceToReassign.hotel === 'object' ? serviceToReassign.hotel.zone : serviceToReassign.hotelZone}</strong>. 
                    Cualquier repartidor de esta zona puede tomarlo.
                  </p>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Hotel:</strong> {typeof serviceToReassign.hotel === 'object' ? serviceToReassign.hotel.name : serviceToReassign.hotel}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Teléfono Hotel:</strong> {
                    typeof serviceToReassign.hotel === 'object' ? 
                      (serviceToReassign.hotel.phone || "No disponible") : 
                      "No disponible"
                  }
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Contacto:</strong> {serviceToReassign.guestName}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Bolsas:</strong> {serviceToReassign.bagCount}
                </p>
                
                {serviceToReassign.repartidorId && (
                  <>
                    <p className="text-sm text-gray-700 font-medium mb-2">
                      Este servicio ya tiene un repartidor asignado específicamente. 
                      Puede desasignarlo o cambiarlo a otro repartidor.
                    </p>
                    
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleccionar Repartidor
                    </label>
                    <select
                      id="reassign-repartidor"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      defaultValue={serviceToReassign.repartidorId || ''}
                    >
                      <option value="">Desasignar repartidor específico</option>
                      {repartidores
                        .filter(r => r.zone === (typeof serviceToReassign.hotel === 'object' ? serviceToReassign.hotel.zone : serviceToReassign.hotelZone))
                        .map((repartidor) => (
                          <option key={repartidor.id} value={repartidor.id}>
                            {repartidor.name} - Zona {repartidor.zone}
                          </option>
                        ))
                      }
                    </select>
                  </>
                )}
              </div>
              
              <div className="flex space-x-4">
                {serviceToReassign.repartidorId && (
                  <Button
                    onClick={() => {
                      const select = document.getElementById('reassign-repartidor');
                      handleReassignSubmit(select.value);
                    }}
                    className="flex-1"
                  >
                    Actualizar Asignación
                  </Button>
                )}
                <Button
                  variant={serviceToReassign.repartidorId ? "outline" : "primary"}
                  onClick={() => {
                    setShowReassignForm(false);
                    setServiceToReassign(null);
                  }}
                  className={!serviceToReassign.repartidorId ? "flex-1" : ""}
                >
                  {!serviceToReassign.repartidorId ? "Entendido" : "Cancelar"}
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