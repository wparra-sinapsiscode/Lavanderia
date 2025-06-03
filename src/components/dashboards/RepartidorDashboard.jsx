import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { serviceStorage } from '../../utils/storage';
import dashboardService from '../../services/dashboard.service';
import routeService from '../../services/route.service';
import { useNotifications } from '../../store/NotificationContext';
import { formatCurrency, formatDate, getStatusColor, getStatusText, getServiceTypeColor, getServiceTypeText, isPickupService, isDeliveryService } from '../../utils';
import { SERVICE_STATUS } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Package, Clock, CheckCircle, Truck, MapPin, Camera, User } from 'lucide-react';

const RepartidorDashboard = () => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const [stats, setStats] = useState({
    myServices: 0,
    pendingPickups: 0,
    pendingDeliveries: 0,
    completedToday: 0,
    totalEarnings: 0,
    thisWeekServices: 0,
    activeRoutes: 0,
    completedRoutes: 0
  });
  const [myServices, setMyServices] = useState([]);
  const [urgentPickups, setUrgentPickups] = useState([]);
  const [todayRoutes, setTodayRoutes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('week');

  useEffect(() => {
    if (user) {
      loadRepartidorData();
    }
  }, [user, timePeriod]);

  const loadRepartidorData = async () => {
    setLoading(true);
    try {
      // Try to fetch data from backend API
      const [repartidorMetrics, todayRoutesResponse] = await Promise.all([
        dashboardService.getRepartidorStats(timePeriod, user.id),
        routeService.getAllRoutes({ date: new Date().toISOString().split('T')[0], repartidorId: user.id })
      ]);
      
      // Process routes data - handle response format
      const todayRoutesData = todayRoutesResponse.data || todayRoutesResponse || [];
      const activeRoutes = todayRoutesData.filter(r => r.status === 'en_progreso').length;
      const completedRoutes = todayRoutesData.filter(r => r.status === 'completada').length;
      setTodayRoutes(todayRoutesData);
      
      // Update stats from backend data
      setStats({
        myServices: repartidorMetrics.assignedServices || 0,
        pendingPickups: repartidorMetrics.pendingPickupInZone || 0,
        pendingDeliveries: repartidorMetrics.pendingDelivery || 0,
        completedToday: repartidorMetrics.deliveredToday || 0,
        totalEarnings: repartidorMetrics.totalEarnings || 0,
        thisWeekServices: repartidorMetrics.performance?.weeklyCompleted || 0,
        activeRoutes,
        completedRoutes
      });
      
      // Set recent services from API
      if (repartidorMetrics.recentServices && repartidorMetrics.recentServices.length > 0) {
        setMyServices(repartidorMetrics.recentServices);
      }
      
      // Set urgent pickups from API
      if (repartidorMetrics.urgentPickups && repartidorMetrics.urgentPickups.length > 0) {
        setUrgentPickups(repartidorMetrics.urgentPickups);
      }
      
    } catch (error) {
      console.error('Error loading repartidor data from API:', error);
      showNotification({
        type: 'error',
        message: 'Error al cargar datos del repartidor. Usando datos locales.'
      });
      
      // Fallback to local storage if API fails
      loadLocalRepartidorData();
    } finally {
      setLoading(false);
    }
  };
  
  const loadLocalRepartidorData = () => {
    const allServices = serviceStorage.getServices();
    
    // Filter services for this repartidor - updated to support zone-based assignment
    // 1. Services specifically assigned to this repartidor
    const assignedServices = allServices.filter(s => s.repartidorId === user.id);
    
    // 2. Services from the repartidor's zone that have no repartidor assigned and are pending pickup
    const zoneServices = serviceStorage.getServicesByZone(user.zone);
    const unassignedZoneServices = zoneServices.filter(s => 
      !s.repartidorId && s.status === SERVICE_STATUS.PENDING_PICKUP
    );
    
    // Combine both sets for a complete view of the repartidor's responsibilities
    const userServices = [...assignedServices];
    const uniqueUnassignedServices = unassignedZoneServices.filter(
      zoneService => !assignedServices.some(assigned => assigned.id === zoneService.id)
    );
    
    // Calculate stats
    const today = new Date().toDateString();
    const completedToday = userServices.filter(s => 
      s.status === 'completado' && 
      s.deliveryDate && new Date(s.deliveryDate).toDateString() === today
    ).length;

    // Now pendingPickups includes both assigned to this repartidor and unassigned in their zone
    const pendingPickups = userServices.filter(s => 
      s.status === SERVICE_STATUS.PENDING_PICKUP
    ).length + uniqueUnassignedServices.length;

    const pendingDeliveries = userServices.filter(s => 
      s.status === SERVICE_STATUS.READY_FOR_DELIVERY
    ).length;

    const totalEarnings = userServices.reduce((sum, s) => sum + (s.price || 0), 0);

    // This week services
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekServices = userServices.filter(s => 
      new Date(s.timestamp || s.createdAt) >= oneWeekAgo
    ).length;

    setStats({
      myServices: userServices.length + uniqueUnassignedServices.length,
      pendingPickups,
      pendingDeliveries,
      completedToday,
      totalEarnings,
      thisWeekServices
    });

    // Set recent services (last 8) - include both assigned and zone services
    const combinedServices = [...userServices, ...uniqueUnassignedServices];
    const recentServices = combinedServices
      .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
      .slice(0, 8);
    setMyServices(recentServices);

    // Set urgent pickups with zone-based prioritization
    // First, get unassigned services from the repartidor's zone
    const zoneUrgentPickups = uniqueUnassignedServices
      .filter(s => s.status === SERVICE_STATUS.PENDING_PICKUP)
      .sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt))
      .slice(0, 3);
    
    // Then add the repartidor's assigned pickups
    const assignedUrgentPickups = userServices
      .filter(s => s.status === SERVICE_STATUS.PENDING_PICKUP)
      .sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt))
      .slice(0, 2);
      
    // Combine and sort by timestamp
    const urgent = [...zoneUrgentPickups, ...assignedUrgentPickups]
      .sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));
    
    setUrgentPickups(urgent);
    
    console.log(`Dashboard cargado para zona ${user.zone}: ${userServices.length} servicios asignados, ${uniqueUnassignedServices.length} no asignados en la zona`);
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle, action }) => (
    <Card>
      <Card.Content className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg bg-${color}-100`}>
              <Icon className={`h-6 w-6 text-${color}-600`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          {action && (
            <div>
              {action}
            </div>
          )}
        </div>
      </Card.Content>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white shadow-lg relative">
        {loading && <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>}
        <div className="flex items-center">
          <img
            src="/Logo.jfif"
            alt="Fumy Limp Logo"
            className="h-16 w-auto mr-6 rounded-lg"
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">
              Hola, {user?.name}
            </h1>
            <p className="text-blue-100 text-lg">
              Repartidor - Zona {user?.zone}
            </p>
            <p className="text-blue-200 text-base mt-1">
              ¡Tienes {stats.pendingPickups} recojos ({stats.pendingPickups > 0 ? 'incluyendo servicios de tu zona' : ''}) + {stats.pendingDeliveries} entregas pendientes!
            </p>
          </div>
          <User className="h-16 w-16" />
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Mis Servicios"
          value={stats.myServices}
          icon={Package}
          color="blue"
          subtitle="Total asignados"
        />
        <StatCard
          title="Recojos Pendientes"
          value={stats.pendingPickups}
          icon={Truck}
          color="blue"
          action={
            stats.pendingPickups > 0 && (
              <Button size="sm" onClick={() => window.location.href = '/pickup'}>
                Ver
              </Button>
            )
          }
        />
        <StatCard
          title="Entregas Pendientes"
          value={stats.pendingDeliveries}
          icon={Package}
          color="green"
          action={
            stats.pendingDeliveries > 0 && (
              <Button size="sm" onClick={() => window.location.href = '/delivery'}>
                Ver
              </Button>
            )
          }
        />
        <StatCard
          title="Completados Hoy"
          value={stats.completedToday}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Esta Semana"
          value={stats.thisWeekServices}
          icon={Truck}
          color="purple"
          subtitle="Servicios"
        />
      </div>

      {/* Urgent Pickups and My Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Pickups */}
        <Card>
          <Card.Header>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Servicios Urgentes
              </h3>
              <Button size="sm" onClick={() => window.location.href = '/pickup'}>
                Ver Todos
              </Button>
            </div>
          </Card.Header>
          <Card.Content className="p-0">
            {urgentPickups.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                <p>¡Excelente! No hay recojos urgentes</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {urgentPickups.map((service) => (
                  <div key={service.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {service.guestName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {service.hotel} - Hab. {service.roomNumber}
                          {!service.repartidorId && (
                            <span className="inline-flex ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              Zona {typeof service.hotel === 'object' ? service.hotel.zone : service.hotelZone || user.zone}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(service.timestamp || service.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">
                          {service.bagCount} bolsas
                        </span>
                        {!service.repartidorId ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            title="Tomar servicio" 
                            onClick={() => window.location.href = '/pickup'}
                            className="border-blue-400 text-blue-600 hover:bg-blue-50"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => window.location.href = '/pickup'}
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>

        {/* My Recent Services */}
        <Card>
          <Card.Header>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Mis Servicios Recientes
              </h3>
              <select 
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                {dashboardService.getTimePeriodOptions().map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <Button size="sm" onClick={() => window.location.href = '/my-services'}>
                Ver Todos
              </Button>
            </div>
          </Card.Header>
          <Card.Content className="p-0">
            {myServices.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No tienes servicios asignados aún</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {myServices.map((service) => (
                  <div key={service.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {service.guestName}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center">
                          {service.hotel} - Hab. {service.roomNumber}
                          {!service.repartidorId && service.status === SERVICE_STATUS.PENDING_PICKUP && (
                            <span className="inline-flex ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              De tu zona
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(service.timestamp || service.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(service.status)}`}>
                            {getStatusText(service.status)}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${getServiceTypeColor(service)}`}>
                            {getServiceTypeText(service)}
                          </span>
                          {!service.repartidorId && service.status === SERVICE_STATUS.PENDING_PICKUP && (
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded border border-blue-300 text-blue-700 bg-blue-50">
                              No asignado
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {formatCurrency(service.price)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900">
            Acciones Rápidas
          </h3>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              className="h-16 flex items-center justify-center space-x-3"
              onClick={() => window.location.href = '/pickup'}
            >
              <Truck className="h-6 w-6" />
              <div className="text-left">
                <p className="font-medium">Gestión de entregas</p>
                <p className="text-sm opacity-90">{stats.pendingPickups + stats.pendingDeliveries} servicios</p>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="h-16 flex items-center justify-center space-x-3"
              onClick={() => window.location.href = '/routes'}
            >
              <MapPin className="h-6 w-6" />
              <div className="text-left">
                <p className="font-medium">Ver Rutas</p>
                <p className="text-sm opacity-70">
                  {stats.activeRoutes > 0 ? `${stats.activeRoutes} activas` : 'Rutas mixtas'}
                </p>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="h-16 flex items-center justify-center space-x-3"
              onClick={() => window.location.href = '/inventory'}
            >
              <Package className="h-6 w-6" />
              <div className="text-left">
                <p className="font-medium">Inventario</p>
                <p className="text-sm opacity-70">Revisar bolsas</p>
              </div>
            </Button>
          </div>
        </Card.Content>
      </Card>

      {/* Daily Tips */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900">
            Consejos del Día
          </h3>
        </Card.Header>
        <Card.Content>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start">
              <Camera className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Recuerda tomar fotos de calidad
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Asegúrate de que las fotos de las bolsas sean claras y muestren el estado de la ropa antes del recojo.
                </p>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Performance Summary */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900">
            Resumen de Rendimiento
          </h3>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.myServices}</div>
              <p className="text-sm text-gray-600">Servicios Totales</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.myServices > 0 ? Math.round((stats.myServices - stats.pendingPickups) / stats.myServices * 100) : 0}%
              </div>
              <p className="text-sm text-gray-600">Tasa de Completado</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {formatCurrency(stats.totalEarnings)}
              </div>
              <p className="text-sm text-gray-600">Ingresos Generados</p>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default RepartidorDashboard;