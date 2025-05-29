import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import serviceService from '../services/service.service';
import { formatCurrency, formatDate, getStatusColor, getStatusText, getServiceTypeColor, getServiceTypeText } from '../utils';
import { SERVICE_STATUS } from '../types';
import Layout from '../components/shared/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
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
  const { showNotification } = useNotifications();
  const navigate = useNavigate();
  
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'timestamp',
    direction: 'desc'
  });
  
  // Fetch services on component mount
  useEffect(() => {
    loadServices();
  }, []);
  
  // Apply filters when services, statusFilter, or searchTerm changes
  useEffect(() => {
    applyFilters();
  }, [services, statusFilter, searchTerm]);
  
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
      console.error('Error loading services:', error);
      showNotification({
        type: 'error',
        message: 'Error al cargar servicios: ' + (error.message || 'Error desconocido')
      });
      setServices([]);
      setFilteredServices([]);
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    let result = [...services];
    
    // Apply status filter
    if (statusFilter) {
      result = result.filter(service => service.status === statusFilter);
    }
    
    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(service => 
        (service.guestName && service.guestName.toLowerCase().includes(searchLower)) ||
        (service.hotel && service.hotel.toLowerCase().includes(searchLower)) ||
        (service.roomNumber && service.roomNumber.toString().includes(searchLower))
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredServices(result);
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
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };
  
  const navigateToService = (serviceId) => {
    // Navigate to service detail page
    navigate(`/services/${serviceId}`);
  };
  
  const navigateToAction = (serviceId, status) => {
    // Navigate to appropriate action page based on service status
    switch(status) {
      case SERVICE_STATUS.PENDING_PICKUP:
        navigate(`/pickup?serviceId=${serviceId}`);
        break;
      case SERVICE_STATUS.IN_PROCESS:
      case SERVICE_STATUS.READY_FOR_DELIVERY:
      case SERVICE_STATUS.LABELED:
        navigate(`/delivery?serviceId=${serviceId}`);
        break;
      default:
        navigate(`/services/${serviceId}`);
    }
  };
  
  // Get appropriate action button based on service status
  const getActionButton = (service) => {
    switch(service.status) {
      case SERVICE_STATUS.PENDING_PICKUP:
        return (
          <Button 
            size="sm" 
            onClick={() => navigateToAction(service.id, service.status)}
            className="flex items-center gap-1"
          >
            <Truck className="h-4 w-4" />
            <span>Recoger</span>
          </Button>
        );
      
      case SERVICE_STATUS.PICKED_UP:
      case SERVICE_STATUS.LABELED:
        return (
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => navigateToService(service.id)}
            className="flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            <span>Detalles</span>
          </Button>
        );
      
      case SERVICE_STATUS.IN_PROCESS:
      case SERVICE_STATUS.READY_FOR_DELIVERY:
        return (
          <Button 
            size="sm" 
            onClick={() => navigateToAction(service.id, service.status)}
            className="flex items-center gap-1"
          >
            <Package className="h-4 w-4" />
            <span>Entregar</span>
          </Button>
        );
      
      case SERVICE_STATUS.PARTIAL_DELIVERY:
        return (
          <Button 
            size="sm" 
            variant="accent"
            onClick={() => navigateToAction(service.id, service.status)}
            className="flex items-center gap-1"
          >
            <Package className="h-4 w-4" />
            <span>Completar</span>
          </Button>
        );
      
      case SERVICE_STATUS.COMPLETED:
        return (
          <Button 
            size="sm" 
            variant="success"
            onClick={() => navigateToService(service.id)}
            className="flex items-center gap-1"
          >
            <CheckCircle className="h-4 w-4" />
            <span>Completado</span>
          </Button>
        );
      
      default:
        return (
          <Button 
            size="sm" 
            variant="secondary"
            onClick={() => navigateToService(service.id)}
            className="flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            <span>Detalles</span>
          </Button>
        );
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">
            Mis Servicios
          </h1>
          
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            
            {/* Filter dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
              >
                <option value="">Todos los estados</option>
                <option value={SERVICE_STATUS.PENDING_PICKUP}>Pendiente Recojo</option>
                <option value={SERVICE_STATUS.PICKED_UP}>Recogido</option>
                <option value={SERVICE_STATUS.LABELED}>Rotulado</option>
                <option value={SERVICE_STATUS.IN_PROCESS}>En Proceso</option>
                <option value={SERVICE_STATUS.PARTIAL_DELIVERY}>Entrega Parcial</option>
                <option value={SERVICE_STATUS.COMPLETED}>Completado</option>
              </select>
              <Filter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            
            {/* Refresh button */}
            <Button
              variant="outline"
              onClick={loadServices}
              disabled={loading}
            >
              Actualizar
            </Button>
          </div>
        </div>
        
        {/* Stats summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <Card.Content className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-bold">{services.length}</p>
                </div>
              </div>
            </Card.Content>
          </Card>
          
          <Card>
            <Card.Content className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pendientes</p>
                  <p className="text-xl font-bold">
                    {services.filter(s => 
                      s.status === SERVICE_STATUS.PENDING_PICKUP || 
                      s.status === SERVICE_STATUS.PICKED_UP || 
                      s.status === SERVICE_STATUS.LABELED || 
                      s.status === SERVICE_STATUS.IN_PROCESS).length}
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>
          
          <Card>
            <Card.Content className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completados</p>
                  <p className="text-xl font-bold">
                    {services.filter(s => s.status === SERVICE_STATUS.COMPLETED).length}
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>
          
          <Card>
            <Card.Content className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Truck className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Hoy</p>
                  <p className="text-xl font-bold">
                    {services.filter(s => {
                      const today = new Date().toDateString();
                      const serviceDate = new Date(s.timestamp).toDateString();
                      return serviceDate === today;
                    }).length}
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
        
        {/* Services table */}
        <Card>
          <Card.Content className="p-0">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Package className="h-16 w-16 text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg mb-2">No hay servicios</p>
                <p className="text-gray-400 text-sm mb-6">
                  {statusFilter ? 'No hay servicios con el filtro seleccionado' : 'No tienes servicios asignados'}
                </p>
                {statusFilter && (
                  <Button variant="outline" onClick={() => setStatusFilter('')}>
                    <X className="h-4 w-4 mr-2" />
                    Quitar filtro
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('guestName')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Huésped</span>
                          {renderSortArrow('guestName')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('hotel')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Hotel</span>
                          {renderSortArrow('hotel')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('timestamp')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Fecha</span>
                          {renderSortArrow('timestamp')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Estado
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('price')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Monto</span>
                          {renderSortArrow('price')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredServices.map(service => (
                      <tr 
                        key={service.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigateToService(service.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{service.guestName}</div>
                          <div className="text-sm text-gray-500">Hab. {service.roomNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{service.hotel}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(service.timestamp)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(service.status)}`}>
                            {getStatusText(service.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {formatCurrency(service.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                          {getActionButton(service)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card.Content>
        </Card>
      </div>
    </Layout>
  );
};

export default MyServices;