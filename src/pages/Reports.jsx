import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import { serviceStorage, hotelStorage, storage } from '../utils/storage';
import { formatDate } from '../utils';
import { SERVICE_STATUS } from '../types';
import { APP_CONFIG } from '../constants';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  Calendar,
  FileText,
  Download,
  Filter,
  Users,
  Building2,
  Clock,
  Truck,
  MapPin,
  CheckCircle,
  AlertCircle,
  Route as RouteIcon,
  Timer,
  Scale
} from 'lucide-react';

const Reports = () => {
  const { user, isAdmin } = useAuth();
  const { success } = useNotifications();
  const [services, setServices] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedTab, setSelectedTab] = useState('operations');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const loadReportData = () => {
    const allServices = serviceStorage.getServices();
    const allHotels = hotelStorage.getHotels();
    const allRoutes = storage.get('PICKUP_ROUTES') || [];
    
    // Filter by date range
    const filteredServices = allServices.filter(service => {
      const serviceDate = new Date(service.pickupDate || service.timestamp);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      return serviceDate >= startDate && serviceDate <= endDate;
    });
    
    const filteredRoutes = allRoutes.filter(route => {
      const routeDate = new Date(route.date);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      return routeDate >= startDate && routeDate <= endDate;
    });
    
    setServices(filteredServices);
    setHotels(allHotels);
    setRoutes(filteredRoutes);
  };

  // Calculate operational metrics
  const metrics = {
    // Service Operations
    totalOrders: services.length,
    pendingPickups: services.filter(s => s.status === SERVICE_STATUS.PENDING_PICKUP).length,
    inProgress: services.filter(s => s.status === SERVICE_STATUS.PICKED_UP || s.status === SERVICE_STATUS.IN_PROCESS).length,
    completed: services.filter(s => s.status === SERVICE_STATUS.COMPLETED).length,
    
    // Weight and Volume
    totalWeight: services.reduce((sum, s) => sum + (s.weight || 0), 0),
    totalBags: services.reduce((sum, s) => sum + (s.bagCount || 0), 0),
    averageWeight: services.length > 0 ? 
      services.reduce((sum, s) => sum + (s.weight || 0), 0) / services.length : 0,
    
    // Routes and Logistics
    totalRoutes: routes.length,
    activeRoutes: routes.filter(r => r.status === 'en_progreso').length,
    completedRoutes: routes.filter(r => r.status === 'completada').length,
    
    // Performance Metrics
    averagePickupTime: calculateAveragePickupTime(services),
    averageProcessTime: calculateAverageProcessTime(services),
    onTimeDeliveryRate: calculateOnTimeRate(services),
    
    // Hotel Operations
    activeHotels: getActiveHotels(services, hotels),
    hotelPickupStats: getHotelPickupStats(services, hotels),
    
    // Repartidor Performance
    repartidorStats: getRepartidorStats(services, routes),
    
    // Daily Operations
    dailyOperations: getDailyOperations(services, routes),
    
    // Status Distribution
    servicesByStatus: getServicesByStatus(services),
    routesByStatus: getRoutesByStatus(routes)
  };

  function calculateAveragePickupTime(services) {
    const pickedServices = services.filter(s => s.pickupDate && s.timestamp);
    if (pickedServices.length === 0) return 0;
    
    const totalTime = pickedServices.reduce((sum, service) => {
      const orderTime = new Date(service.timestamp);
      const pickupTime = new Date(service.pickupDate);
      return sum + (pickupTime - orderTime);
    }, 0);
    
    return Math.round(totalTime / pickedServices.length / (1000 * 60 * 60));
  }

  function calculateAverageProcessTime(services) {
    const completedServices = services.filter(s => 
      s.pickupDate && s.deliveryDate && s.status === SERVICE_STATUS.COMPLETED
    );
    if (completedServices.length === 0) return 0;
    
    const totalTime = completedServices.reduce((sum, service) => {
      const pickupTime = new Date(service.pickupDate);
      const deliveryTime = new Date(service.deliveryDate);
      return sum + (deliveryTime - pickupTime);
    }, 0);
    
    return Math.round(totalTime / completedServices.length / (1000 * 60 * 60));
  }

  function calculateOnTimeRate(services) {
    const completedServices = services.filter(s => s.status === SERVICE_STATUS.COMPLETED);
    if (completedServices.length === 0) return 0;
    
    const onTimeServices = completedServices.filter(s => {
      if (!s.estimatedDeliveryDate || !s.deliveryDate) return false;
      const estimated = new Date(s.estimatedDeliveryDate);
      const actual = new Date(s.deliveryDate);
      return actual <= estimated;
    });
    
    return Math.round((onTimeServices.length / completedServices.length) * 100);
  }

  function getActiveHotels(services, hotels) {
    const activeHotelIds = new Set(services.map(s => s.hotelId));
    return activeHotelIds.size;
  }

  function getHotelPickupStats(services, hotels) {
    const hotelStats = {};
    
    services.forEach(service => {
      if (!hotelStats[service.hotelId]) {
        const hotel = hotels.find(h => h.id === service.hotelId);
        hotelStats[service.hotelId] = {
          name: hotel?.name || service.hotel,
          totalOrders: 0,
          pendingPickups: 0,
          completedOrders: 0,
          totalWeight: 0,
          totalBags: 0
        };
      }
      
      const stats = hotelStats[service.hotelId];
      stats.totalOrders++;
      stats.totalWeight += service.weight || 0;
      stats.totalBags += service.bagCount || 0;
      
      if (service.status === SERVICE_STATUS.PENDING_PICKUP) {
        stats.pendingPickups++;
      } else if (service.status === SERVICE_STATUS.COMPLETED) {
        stats.completedOrders++;
      }
    });
    
    return Object.values(hotelStats)
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 5);
  }

  function getRepartidorStats(services, routes) {
    const repartidorStats = {};
    
    services.forEach(service => {
      if (service.repartidor) {
        if (!repartidorStats[service.repartidor]) {
          repartidorStats[service.repartidor] = {
            name: service.repartidor,
            totalAssigned: 0,
            completed: 0,
            pending: 0,
            totalWeight: 0,
            routesAssigned: 0,
            routesCompleted: 0
          };
        }
        
        const stats = repartidorStats[service.repartidor];
        stats.totalAssigned++;
        stats.totalWeight += service.weight || 0;
        
        if (service.status === SERVICE_STATUS.COMPLETED) {
          stats.completed++;
        } else if (service.status === SERVICE_STATUS.PENDING_PICKUP) {
          stats.pending++;
        }
      }
    });
    
    routes.forEach(route => {
      if (route.repartidorName && repartidorStats[route.repartidorName]) {
        repartidorStats[route.repartidorName].routesAssigned++;
        if (route.status === 'completada') {
          repartidorStats[route.repartidorName].routesCompleted++;
        }
      }
    });
    
    return Object.values(repartidorStats)
      .sort((a, b) => b.totalAssigned - a.totalAssigned);
  }

  function getDailyOperations(services, routes) {
    const dailyStats = {};
    
    services.forEach(service => {
      const date = new Date(service.timestamp).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { orders: 0, pickups: 0, completions: 0, routes: 0 };
      }
      
      dailyStats[date].orders++;
      if (service.pickupDate) dailyStats[date].pickups++;
      if (service.status === SERVICE_STATUS.COMPLETED) dailyStats[date].completions++;
    });
    
    routes.forEach(route => {
      const date = route.date;
      if (!dailyStats[date]) {
        dailyStats[date] = { orders: 0, pickups: 0, completions: 0, routes: 0 };
      }
      dailyStats[date].routes++;
    });
    
    return Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7);
  }

  function getServicesByStatus(services) {
    const statusCounts = {
      [SERVICE_STATUS.PENDING_PICKUP]: 0,
      [SERVICE_STATUS.PICKED_UP]: 0,
      [SERVICE_STATUS.LABELED]: 0,
      [SERVICE_STATUS.IN_PROCESS]: 0,
      [SERVICE_STATUS.READY_FOR_DELIVERY]: 0,
      [SERVICE_STATUS.COMPLETED]: 0,
      [SERVICE_STATUS.CANCELLED]: 0
    };
    
    services.forEach(service => {
      // Only count if the status exists in our predefined statuses
      if (statusCounts.hasOwnProperty(service.status)) {
        statusCounts[service.status]++;
      }
    });
    
    return statusCounts;
  }

  function getRoutesByStatus(routes) {
    const statusCounts = {
      pendiente: 0,
      en_progreso: 0,
      completada: 0
    };
    
    routes.forEach(route => {
      statusCounts[route.status]++;
    });
    
    return statusCounts;
  }

  const exportReport = () => {
    const reportData = {
      period: `${dateRange.startDate} al ${dateRange.endDate}`,
      operationalMetrics: metrics,
      services: services.map(s => ({
        id: s.id,
        hotel: s.hotel,
        contacto: s.guestName,
        estado: s.status,
        peso: s.weight,
        bolsas: s.bagCount,
        fechaOrden: s.timestamp,
        fechaRecojo: s.pickupDate,
        fechaEntrega: s.deliveryDate,
        repartidor: s.repartidor,
        prioridad: s.priority
      })),
      routes: routes.map(r => ({
        id: r.id,
        fecha: r.date,
        repartidor: r.repartidorName,
        estado: r.status,
        hoteles: r.hotels?.length || 0,
        recojosTotales: r.totalPickups,
        horaInicio: r.startTime,
        horaFin: r.endTime
      }))
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte_operaciones_${dateRange.startDate}_${dateRange.endDate}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    success('Reporte Exportado', 'El reporte operacional ha sido descargado exitosamente');
  };

  const tabs = [
    { id: 'operations', name: 'Operaciones', icon: Package },
    { id: 'logistics', name: 'Logística', icon: Truck },
    { id: 'performance', name: 'Rendimiento', icon: BarChart3 }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Reportes Operacionales
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Análisis de operaciones y logística
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={exportReport}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Datos
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <Card.Content className="p-6">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => setDateRange({
                    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0]
                  })}
                >
                  Última Semana
                </Button>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Operations Tab */}
      {selectedTab === 'operations' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Órdenes Totales</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.totalOrders}</p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pendientes Recojo</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.pendingPickups}</p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">En Proceso</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.inProgress}</p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completados</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.completed}</p>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Services by Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Estado de Servicios</h3>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  {Object.entries(metrics.servicesByStatus)
                    .filter(([status, count]) => count > 0) // Only show statuses with actual counts
                    .map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 capitalize">
                        {status === SERVICE_STATUS.PENDING_PICKUP ? 'Pendiente Recojo' :
                         status === SERVICE_STATUS.PICKED_UP ? 'Recogido' :
                         status === SERVICE_STATUS.IN_PROCESS ? 'En Proceso' :
                         status === SERVICE_STATUS.READY_FOR_DELIVERY ? 'Listo Entrega' :
                         status === SERVICE_STATUS.COMPLETED ? 'Completado' : 
                         status === SERVICE_STATUS.CANCELLED ? 'Cancelado' : 'Otro'}
                      </span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ 
                              width: `${metrics.totalOrders > 0 && count > 0 ? (count / metrics.totalOrders) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{count || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Volumen y Peso</h3>
              </Card.Header>
              <Card.Content>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Bolsas</span>
                    <span className="text-2xl font-bold text-blue-600">{metrics.totalBags}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Peso Total</span>
                    <span className="text-2xl font-bold text-green-600">{metrics.totalWeight.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Peso Promedio</span>
                    <span className="text-lg font-medium text-gray-900">{metrics.averageWeight.toFixed(1)} kg</span>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>
        </div>
      )}

      {/* Logistics Tab */}
      {selectedTab === 'logistics' && (
        <div className="space-y-6">
          {/* Route Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <RouteIcon className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Rutas Totales</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.totalRoutes}</p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <Truck className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Rutas Activas</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.activeRoutes}</p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Rutas Completadas</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.completedRoutes}</p>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Hotel Operations */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900">Operaciones por Hotel</h3>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                {metrics.hotelPickupStats.map((hotel, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{hotel.name}</p>
                      <p className="text-xs text-gray-500">
                        {hotel.pendingPickups} pendientes • {hotel.completedOrders} completados
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">{hotel.totalOrders} órdenes</p>
                      <p className="text-xs text-gray-500">
                        {hotel.totalBags} bolsas • {hotel.totalWeight.toFixed(1)} kg
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>

          {/* Daily Operations */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900">Operaciones Diarias (Últimos 7 días)</h3>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                {metrics.dailyOperations.map(([date, data]) => (
                  <div key={date} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {new Date(date).toLocaleDateString('es-PE')}
                    </span>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="text-blue-600">{data.orders} órdenes</span>
                      <span className="text-green-600">{data.pickups} recojos</span>
                      <span className="text-purple-600">{data.routes} rutas</span>
                      <span className="text-orange-600">{data.completions} entregas</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </div>
      )}

      {/* Performance Tab */}
      {selectedTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <Timer className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Tiempo Promedio Recojo</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.averagePickupTime}h</p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Tiempo Promedio Proceso</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.averageProcessTime}h</p>
                  </div>
                </div>
              </Card.Content>
            </Card>

            <Card>
              <Card.Content className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Entregas a Tiempo</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.onTimeDeliveryRate}%</p>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Repartidor Performance */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-semibold text-gray-900">Rendimiento de Repartidores</h3>
            </Card.Header>
            <Card.Content className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Repartidor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Órdenes Asignadas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completadas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pendientes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rutas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peso Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Eficiencia
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {metrics.repartidorStats.map((rep, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Users className="h-5 w-5 text-gray-400 mr-3" />
                            <span className="text-sm font-medium text-gray-900">{rep.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rep.totalAssigned}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rep.completed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rep.pending}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rep.routesCompleted}/{rep.routesAssigned}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rep.totalWeight.toFixed(1)} kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            (rep.completed / rep.totalAssigned) >= 0.8 
                              ? 'bg-green-100 text-green-800'
                              : (rep.completed / rep.totalAssigned) >= 0.6 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {rep.totalAssigned > 0 ? ((rep.completed / rep.totalAssigned) * 100).toFixed(1) : 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Reports;