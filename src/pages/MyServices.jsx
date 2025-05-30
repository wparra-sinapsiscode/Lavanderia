import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useNotification } from '../store/NotificationContext';
import serviceService from '../services/service.service';
import hotelService from '../services/hotel.service';
import Layout from '../components/shared/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import HotelServiceForm from '../components/forms/HotelServiceForm';
import { 
  Package, 
  FileText, 
  Filter, 
  Truck, 
  Search, 
  ArrowUp, 
  ArrowDown,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';

const MyServices = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [showHotelServiceForm, setShowHotelServiceForm] = useState(false);
  
  const [filters, setFilters] = useState({
    status: '',
    hotelId: '',
    isHotelService: '',
    searchTerm: ''
  });
  
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });
  
  // Status options for filtering
  const statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'PENDING_PICKUP', label: 'Pendiente de recogida' },
    { value: 'PICKED_UP', label: 'Recogido' },
    { value: 'LABELED', label: 'Rotulado' },
    { value: 'IN_PROCESS', label: 'En proceso' },
    { value: 'READY_FOR_DELIVERY', label: 'Listo para entrega' },
    { value: 'PARTIAL_DELIVERY', label: 'Entrega parcial' },
    { value: 'COMPLETED', label: 'Completado' },
    { value: 'CANCELLED', label: 'Cancelado' }
  ];
  
  const serviceTypeOptions = [
    { value: '', label: 'Todos los tipos' },
    { value: 'true', label: 'Servicios de hotel' },
    { value: 'false', label: 'Servicios de huésped' }
  ];
  
  useEffect(() => {
    loadServices();
    loadHotels();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [services, filters, sortConfig]);
  
  const loadServices = async () => {
    setLoading(true);
    try {
      const response = await serviceService.getMyServices();
      
      if (response.success && response.data) {
        setServices(response.data);
        setFilteredServices(response.data);
      } else {
        throw new Error(response.message || 'Error al cargar servicios');
      }
    } catch (error) {
      console.error('Error al cargar servicios:', error);
      showNotification({
        type: 'error',
        message: `Error al cargar servicios: ${error.message}`
      });
      setServices([]);
      setFilteredServices([]);
    } finally {
      setLoading(false);
    }
  };
  
  const loadHotels = async () => {
    try {
      const response = await hotelService.getAllHotels();
      if (response.success && response.data) {
        setHotels(response.data);
      }
    } catch (error) {
      console.error('Error al cargar hoteles:', error);
      setHotels([]);
    }
  };
  
  const applyFilters = () => {
    let result = [...services];
    
    // Apply status filter
    if (filters.status) {
      result = result.filter(service => service.status === filters.status);
    }
    
    // Apply hotel filter
    if (filters.hotelId) {
      result = result.filter(service => service.hotelId === filters.hotelId);
    }
    
    // Apply service type filter
    if (filters.isHotelService) {
      const isHotelService = filters.isHotelService === 'true';
      result = result.filter(service => service.isHotelService === isHotelService);
    }
    
    // Apply search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      result = result.filter(service => 
        (service.guestName && service.guestName.toLowerCase().includes(searchLower)) ||
        (service.hotel?.name && service.hotel.name.toLowerCase().includes(searchLower)) ||
        (service.roomNumber && service.roomNumber.toString().includes(searchLower))
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      // Handle nested properties
      if (sortConfig.key === 'hotel.name') {
        aValue = a.hotel?.name || '';
        bValue = b.hotel?.name || '';
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredServices(result);
  };
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const resetFilters = () => {
    setFilters({
      status: '',
      hotelId: '',
      isHotelService: '',
      searchTerm: ''
    });
  };
  
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const renderSortArrow = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };
  
  const getStatusBadgeClass = (status) => {
    const statusInfo = serviceService.getStatusInfo(status);
    
    const colorClasses = {
      'blue': 'bg-blue-100 text-blue-800',
      'purple': 'bg-purple-100 text-purple-800',
      'indigo': 'bg-indigo-100 text-indigo-800',
      'orange': 'bg-orange-100 text-orange-800',
      'teal': 'bg-teal-100 text-teal-800',
      'green': 'bg-green-100 text-green-800',
      'red': 'bg-red-100 text-red-800',
      'gray': 'bg-gray-100 text-gray-800'
    };
    
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[statusInfo.color] || 'bg-gray-100 text-gray-800'}`;
  };
  
  const getPriorityBadgeClass = (priority) => {
    const priorityInfo = serviceService.getPriorityInfo(priority);
    
    const colorClasses = {
      'red': 'bg-red-100 text-red-800',
      'orange': 'bg-orange-100 text-orange-800',
      'blue': 'bg-blue-100 text-blue-800'
    };
    
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[priorityInfo.color] || 'bg-gray-100 text-gray-800'}`;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const handleServiceClick = (serviceId) => {
    navigate(`/servicios/${serviceId}`);
  };
  
  // Stats summary for dashboard view
  const renderStatsSummary = () => {
    const totalServices = services.length;
    const pendingServices = services.filter(s => 
      s.status === 'PENDING_PICKUP' || 
      s.status === 'PICKED_UP' || 
      s.status === 'LABELED' || 
      s.status === 'IN_PROCESS'
    ).length;
    const completedServices = services.filter(s => s.status === 'COMPLETED').length;
    
    // Count today's services
    const today = new Date().toDateString();
    const todayServices = services.filter(s => {
      const serviceDate = new Date(s.createdAt).toDateString();
      return serviceDate === today;
    }).length;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-xl font-bold">{totalServices}</p>
              </div>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-xl font-bold">{pendingServices}</p>
              </div>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completados</p>
                <p className="text-xl font-bold">{completedServices}</p>
              </div>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Truck className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Hoy</p>
                <p className="text-xl font-bold">{todayServices}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };
  
  // Services table content
  const renderServices = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      );
    }
    
    if (filteredServices.length === 0) {
      return (
        <div className="flex flex-col items-center py-10">
          <Package className="h-16 w-16 text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No hay servicios que mostrar</p>
          {(filters.status || filters.hotelId || filters.isHotelService || filters.searchTerm) && (
            <Button 
              variant="outline" 
              onClick={resetFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Quitar filtros
            </Button>
          )}
          {(user.role === 'ADMIN' || user.role === 'RECEPCION') && (
            <div className="mt-4 space-x-2">
              <Button 
                variant="primary" 
                onClick={() => navigate('/servicios/nuevo')}
              >
                Crear Servicio de Huésped
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setShowHotelServiceForm(true)}
              >
                Crear Servicio de Hotel
              </Button>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('guestName')}
              >
                <div className="flex items-center gap-1">
                  <span>Cliente</span>
                  {renderSortArrow('guestName')}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('hotel.name')}
              >
                <div className="flex items-center gap-1">
                  <span>Hotel</span>
                  {renderSortArrow('hotel.name')}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Habitación
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('bagCount')}
              >
                <div className="flex items-center gap-1">
                  <span>Bolsas</span>
                  {renderSortArrow('bagCount')}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prioridad
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Repartidor
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center gap-1">
                  <span>Fecha</span>
                  {renderSortArrow('createdAt')}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredServices.map(service => (
              <tr 
                key={service.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleServiceClick(service.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{service.guestName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{service.hotel?.name || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{service.roomNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{service.bagCount}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getPriorityBadgeClass(service.priority)}>
                    {serviceService.getPriorityInfo(service.priority).label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getStatusBadgeClass(service.status)}>
                    {serviceService.getStatusInfo(service.status).label}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {service.repartidor?.name || 'Sin asignar'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(service.createdAt)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {service.isHotelService ? 'Hotel' : 'Huésped'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleServiceClick(service.id);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Detalles
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  if (showHotelServiceForm) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-4 flex items-center">
            <Button 
              variant="secondary" 
              className="mr-2"
              onClick={() => setShowHotelServiceForm(false)}
            >
              Volver
            </Button>
            <h1 className="text-2xl font-bold">Crear Servicio de Hotel</h1>
          </div>
          <HotelServiceForm />
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Mis Servicios</h1>
          {(user.role === 'ADMIN' || user.role === 'RECEPCION') && (
            <div className="space-x-2">
              <Button 
                variant="primary" 
                onClick={() => navigate('/servicios/nuevo')}
              >
                Crear Servicio de Huésped
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setShowHotelServiceForm(true)}
              >
                Crear Servicio de Hotel
              </Button>
            </div>
          )}
        </div>
        
        {/* Stats summary */}
        {renderStatsSummary()}
        
        <Card title="Filtros">
          <form onSubmit={(e) => { e.preventDefault(); applyFilters(); }} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="searchTerm"
                    placeholder="Buscar por nombre, hotel..."
                    value={filters.searchTerm}
                    onChange={handleFilterChange}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              {/* Status filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Hotel filter */}
              {(user.role === 'ADMIN' || user.role === 'RECEPCION') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hotel
                  </label>
                  <select
                    name="hotelId"
                    value={filters.hotelId}
                    onChange={handleFilterChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Todos los hoteles</option>
                    {hotels.map(hotel => (
                      <option key={hotel.id} value={hotel.id}>
                        {hotel.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Service type filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Servicio
                </label>
                <select
                  name="isHotelService"
                  value={filters.isHotelService}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {serviceTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <Button
                type="button"
                variant="secondary"
                onClick={resetFilters}
              >
                Restablecer
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={loadServices}
              >
                Actualizar
              </Button>
            </div>
          </form>
        </Card>
        
        <Card title="Lista de Servicios" className="mt-6">
          {renderServices()}
        </Card>
      </div>
    </Layout>
  );
};

export default MyServices;