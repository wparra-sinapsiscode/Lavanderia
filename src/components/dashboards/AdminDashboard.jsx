import React, { useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import { formatCurrency, formatDate } from '../../utils';
import dashboardService from '../../services/dashboard.service';
import { useNotifications } from '../../store/NotificationContext';
import Card from '../ui/Card';
import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  Building, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Truck
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    totalServices: 0,
    totalHotels: 0,
    totalRepartidores: 0,
    averageServiceValue: 0,
    completionRate: 0,
    todayServices: 0,
    pendingServices: 0
  });

  const [chartData, setChartData] = useState({
    revenueChart: [],
    servicesChart: [],
    statusChart: [],
    hotelChart: []
  });

  const [recentActivities, setRecentActivities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('month');

  useEffect(() => {
    loadDashboardData();
  }, [timePeriod]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const adminMetrics = await dashboardService.getDashboardSummary(timePeriod);
      const serviceStats = await dashboardService.getServiceStats(timePeriod);
      const financialStats = await dashboardService.getFinancialStats(timePeriod);
      const hotelStats = await dashboardService.getHotelStats(timePeriod);
      
      const hasFinancialStats = financialStats && typeof financialStats === 'object';
      const hasAdminMetrics = adminMetrics && typeof adminMetrics === 'object';
      
      if (!hasFinancialStats && !hasAdminMetrics) {
        showNotification({
          type: 'warning',
          message: 'Algunos datos del dashboard no están disponibles.'
        });
      }
      
      const financialSummary = hasFinancialStats && financialStats.summary ? financialStats.summary : {
        revenue: 0,
        expenses: 0,
        profit: 0
      };
      
      const serviceStatusData = hasAdminMetrics && adminMetrics.servicesByStatus ? adminMetrics.servicesByStatus : {
        PENDING_PICKUP: 0,
        PICKED_UP: 0,
        LABELED: 0,
        IN_PROCESS: 0,
        PARTIAL_DELIVERY: 0,
        COMPLETED: 0,
        CANCELLED: 0
      };
      
      setStats({
        totalRevenue: financialSummary.revenue || 0,
        totalExpenses: financialSummary.expenses || 0,
        netIncome: financialSummary.profit || 0,
        totalServices: hasAdminMetrics ? adminMetrics.totalServices || 0 : 0,
        totalHotels: hasAdminMetrics && adminMetrics.topHotels ? adminMetrics.topHotels.length || 0 : 0,
        totalRepartidores: hasAdminMetrics ? adminMetrics.repartidores || 0 : 0,
        averageServiceValue: serviceStats && serviceStats.avgServiceValue ? serviceStats.avgServiceValue : 0,
        completionRate: 
          serviceStatusData.COMPLETED > 0 && 
          hasAdminMetrics && 
          adminMetrics.totalServices > 0 ? 
            (serviceStatusData.COMPLETED / adminMetrics.totalServices) * 100 : 0,
        todayServices: hasAdminMetrics ? adminMetrics.completedToday || 0 : 0,
        pendingServices: hasAdminMetrics ? adminMetrics.pendingPickup || 0 : 0
      });
      
      prepareApiChartData(adminMetrics, serviceStats, financialStats, hotelStats);
      loadApiRecentActivities();
    } catch (error) {
      console.error('Error loading dashboard data from API:', error);
      showNotification({
        type: 'error',
        message: 'Error al cargar datos del dashboard.'
      });
    } finally {
      setLoading(false);
    }
  };
  

  const prepareApiChartData = (adminMetrics, serviceStats, financialStats, hotelStats) => {
    try {
      // Verificar la existencia y validez de los datos con mayor tolerancia
      const hasFinancialData = financialStats && typeof financialStats === 'object';
      const hasValidFinancialData = hasFinancialData && financialStats.dailyRevenue && Array.isArray(financialStats.dailyRevenue);
      
      const hasAdminMetricsData = adminMetrics && typeof adminMetrics === 'object';
      const hasValidStatusData = hasAdminMetricsData && adminMetrics.servicesByStatus && typeof adminMetrics.servicesByStatus === 'object';
      const hasValidHotelData = hasAdminMetricsData && adminMetrics.topHotels && Array.isArray(adminMetrics.topHotels);
      
      // Referencia segura a servicesByStatus
      const servicesByStatus = hasValidStatusData ? adminMetrics.servicesByStatus : {
        PENDING_PICKUP: 0,
        PICKED_UP: 0,
        LABELED: 0,
        IN_PROCESS: 0,
        PARTIAL_DELIVERY: 0,
        COMPLETED: 0
      };
      
      // Format daily revenue and expenses data con manejo de valores faltantes
      const revenueChart = hasValidFinancialData ? financialStats.dailyRevenue.map((day, index) => {
        // Validación segura para datos de gastos
        const expenseData = hasFinancialData && 
                           financialStats.dailyExpenses && 
                           Array.isArray(financialStats.dailyExpenses) && 
                           financialStats.dailyExpenses[index] || { expenses: 0 };
        
        // Validación segura para servicios diarios
        const dailyServiceCount = serviceStats && 
                                 serviceStats.dailyServices && 
                                 Array.isArray(serviceStats.dailyServices) && 
                                 serviceStats.dailyServices[index] ? 
                                   serviceStats.dailyServices[index].count || 0 : 0;
        
        // Formato de fecha seguro
        let formattedDate;
        try {
          formattedDate = new Date(day.day).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' });
        } catch (e) {
          formattedDate = 'Fecha inválida';
        }
        
        return {
          date: formattedDate,
          revenue: day.revenue || 0,
          expenses: expenseData.expenses || 0,
          services: dailyServiceCount
        };
      }).slice(-7) : []; // Últimos 7 días
      
      // Services by status con validación
      const statusChart = hasValidStatusData ? [
        { name: 'Pendientes', value: servicesByStatus.PENDING_PICKUP || 0, color: '#f59e0b' },
        { name: 'Recogidos', value: servicesByStatus.PICKED_UP || 0, color: '#3b82f6' },
        { name: 'Rotulados', value: servicesByStatus.LABELED || 0, color: '#6366f1' },
        { name: 'En Proceso', value: servicesByStatus.IN_PROCESS || 0, color: '#8b5cf6' },
        { name: 'Entrega Parcial', value: servicesByStatus.PARTIAL_DELIVERY || 0, color: '#f97316' },
        { name: 'Completados', value: servicesByStatus.COMPLETED || 0, color: '#10b981' }
      ].filter(item => item.value > 0) : [];
      
      // Services by hotel con validación
      const hotelChart = hasValidHotelData ? adminMetrics.topHotels.map(hotel => {
        if (!hotel) return null;
        
        return {
          name: hotel.name ? hotel.name.replace('Hotel ', '') : 'Hotel Desconocido',
          services: hotel.services || 0,
          revenue: hotel.revenue || 0
        };
      }).filter(Boolean) : []; // Filtrar entradas nulas
      
      setChartData({
        revenueChart: revenueChart.length > 0 ? revenueChart : [],
        servicesChart: revenueChart.length > 0 ? revenueChart : [],
        statusChart: statusChart.length > 0 ? statusChart : [],
        hotelChart: hotelChart.length > 0 ? hotelChart : []
      });
    } catch (error) {
      console.error('Error preparing API chart data:', error);
      // Si hay algún error en el procesamiento de datos, usar gráficos vacíos
      setChartData({
        revenueChart: [],
        servicesChart: [],
        statusChart: [],
        hotelChart: []
      });
    }
  };
  
  const loadApiRecentActivities = async () => {
    try {
      // Intentar obtener los logs de auditoría de la API con manejo más robusto de errores
      const response = await dashboardService.getAuditLogs();
      
      // Verificar de manera segura la estructura de la respuesta
      if (response && response.data && Array.isArray(response.data)) {
        // Filtrar posibles entradas nulas o inválidas y limitar a 10 items
        const validLogs = response.data
          .filter(log => log && typeof log === 'object')
          .slice(0, 10);
        
        setRecentActivities(validLogs);
      } else if (response && response.logs && Array.isArray(response.logs)) {
        // Mantener compatibilidad con el formato anterior
        const validLogs = response.logs
          .filter(log => log && typeof log === 'object')
          .slice(0, 10);
        
        setRecentActivities(validLogs);
      } else {
        console.warn('Formato de respuesta de logs de auditoría inesperado:', response);
        // Intentar extraer logs si están en un formato diferente
        if (response && typeof response === 'object') {
          // Buscar cualquier array en la respuesta que pueda contener los logs
          const possibleLogs = Object.values(response).find(value => Array.isArray(value));
          
          if (possibleLogs && possibleLogs.length > 0) {
            setRecentActivities(possibleLogs.slice(0, 10));
            return;
          }
        }
        
        // Si no encontramos logs, mostrar array vacío
        setRecentActivities([]);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setRecentActivities([]);
    }
  };
  

  const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle, trend }) => (
    <Card>
      <Card.Content className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center">
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">{trend}</span>
          </div>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-8 text-white shadow-lg">
        {loading && <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>}
        <div className="flex items-center">
          <img
            src="/Logo.jfif"
            alt="Fumy Limp Logo"
            className="h-16 w-auto mr-6 rounded-lg"
          />
          <div>
            <h1 className="text-3xl font-bold mb-3">
              Bienvenido, {user?.name}
            </h1>
            <p className="text-primary-100 text-lg">
              Dashboard Administrativo - Gestión Completa de Fumy Limp
            </p>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ingresos Totales"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          color="green"
          trend="+12% vs mes anterior"
        />
        <StatCard
          title="Servicios Totales"
          value={stats.totalServices}
          icon={Package}
          color="blue"
          subtitle={`${stats.todayServices} hoy`}
        />
        <StatCard
          title="Hoteles Activos"
          value={stats.totalHotels}
          icon={Building}
          color="purple"
        />
        <StatCard
          title="Repartidores"
          value={stats.totalRepartidores}
          icon={Users}
          color="indigo"
        />
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Gastos Totales"
          value={formatCurrency(stats.totalExpenses)}
          icon={TrendingUp}
          color="red"
          subtitle="Egresos registrados"
        />
        <StatCard
          title="Utilidad Neta"
          value={formatCurrency(stats.netIncome)}
          icon={DollarSign}
          color={stats.netIncome >= 0 ? "green" : "red"}
          subtitle="Ingresos - Gastos"
        />
        <StatCard
          title="Valor Promedio"
          value={formatCurrency(stats.averageServiceValue)}
          icon={TrendingUp}
          color="blue"
          subtitle="Por transacción de ingreso"
        />
      </div>

      {/* Operational Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Tasa de Completado"
          value={`${stats.completionRate.toFixed(1)}%`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Servicios Pendientes"
          value={stats.pendingServices}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Servicios Hoy"
          value={stats.todayServices}
          icon={Truck}
          color="blue"
        />
        <StatCard
          title="Promedio Diario"
          value={Math.round(stats.totalServices / 7)}
          icon={Package}
          color="purple"
          subtitle="Servicios por día"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Chart */}
        <Card>
          <Card.Header>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Ingresos vs Gastos - Últimos 7 Días
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
            </div>
          </Card.Header>
          <Card.Content>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [
                    formatCurrency(value), 
                    name === 'revenue' ? 'Ingresos' : 'Gastos'
                  ]} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    name="Ingresos"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    name="Gastos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card.Content>
        </Card>

        {/* Services by Status */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900">
              Servicios por Estado
            </h3>
          </Card.Header>
          <Card.Content>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.statusChart}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.statusChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Hotels Performance and Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Hotels */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900">
              Top 5 Hoteles por Servicios
            </h3>
          </Card.Header>
          <Card.Content>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.hotelChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="services" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card.Content>
        </Card>

        {/* Recent Activities */}
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900">
              Actividad Reciente
            </h3>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="max-h-80 overflow-y-auto">
              {recentActivities.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No hay actividad reciente</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="p-4">
                      <div className="flex items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.action.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {activity.details}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {activity.user && typeof activity.user === 'object' ? activity.user.name : activity.userName || 'Usuario'} - {formatDate(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/guest-registration"
              className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-blue-900">Nuevo Huésped</p>
                <p className="text-sm text-blue-600">Registrar</p>
              </div>
            </a>
            
            <a
              href="/pickup"
              className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <Truck className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-green-900">Recojos</p>
                <p className="text-sm text-green-600">Gestionar</p>
              </div>
            </a>
            
            <a
              href="/inventory"
              className="flex items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <Package className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <p className="font-medium text-yellow-900">Inventario</p>
                <p className="text-sm text-yellow-600">Revisar</p>
              </div>
            </a>
            
            <a
              href="/reports"
              className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="font-medium text-purple-900">Reportes</p>
                <p className="text-sm text-purple-600">Ver</p>
              </div>
            </a>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default AdminDashboard;