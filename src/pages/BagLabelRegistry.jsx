import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import { serviceStorage, bagLabelStorage } from '../utils/storage';
import { formatDate, getStatusColor, getStatusText } from '../utils';
import { SERVICE_STATUS } from '../types';
import bagLabelService from '../services/bagLabel.service';
import serviceService from '../services/service.service';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { 
  QrCode, 
  Search, 
  Package, 
  CheckCircle, 
  AlertCircle, 
  Camera, 
  X, 
  Eye, 
  Grid, 
  ChevronLeft, 
  ChevronRight, 
  Tag,
  Calendar,
  User,
  Building,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

const BagLabelRegistry = () => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const [services, setServices] = useState([]);
  const [bagLabels, setBagLabels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [galleryMode, setGalleryMode] = useState(false);
  const [galleryService, setGalleryService] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [stats, setStats] = useState({
    totalLabeled: 0,
    totalPhotos: 0,
    totalBags: 0,
    recentActivity: 0
  });

  useEffect(() => {
    loadHistoryData();
  }, []);
  
  const [loading, setLoading] = useState(false);

  // Keyboard navigation for gallery
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!galleryMode) return;
      
      switch (e.key) {
        case 'Escape':
          closeGallery();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigatePhoto('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigatePhoto('next');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [galleryMode]);

  const loadHistoryData = async () => {
    setLoading(true);
    try {
      // Try to get data from API
      let labeledServices = [];
      let allLabels = [];
      
      try {
        // First try to get services that have been labeled
        const servicesResponse = await serviceService.getAllServices({
          status: ['LABELED', 'IN_PROCESS', 'PARTIAL_DELIVERY', 'COMPLETED']
        });
        
        if (servicesResponse.success && servicesResponse.data) {
          // Filter to include services with labeledDate OR status LABELED with labeling photos
          labeledServices = servicesResponse.data.filter(s => 
            s.labeledDate || 
            (s.status === 'LABELED' && s.labelingPhotos && s.labelingPhotos.length > 0)
          );
          
          // Then get all bag labels
          let labelPromises = [];
          for (const service of labeledServices) {
            labelPromises.push(bagLabelService.getServiceLabels(service.id));
          }
          
          const labelResponses = await Promise.all(labelPromises);
          for (const response of labelResponses) {
            if (response.success && response.data) {
              allLabels = [...allLabels, ...response.data];
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data from API:', error);
        // Fall back to local storage
        throw new Error('API fetch failed');
      }
      
      // If we don't have data from API, fall back to local storage
      if (labeledServices.length === 0) {
        // Get all services that have been labeled from local storage
        const allServices = serviceStorage.getServices() || [];
        labeledServices = allServices.filter(s => 
          s && (s.status === SERVICE_STATUS.LABELED || 
                s.status === SERVICE_STATUS.IN_PROCESS || 
                s.status === SERVICE_STATUS.PARTIAL_DELIVERY ||
                s.status === SERVICE_STATUS.COMPLETED) &&
          s.labeledDate // Only services that have gone through labeling process
        );
        
        // Get all bag labels from local storage
        allLabels = bagLabelStorage.getBagLabels() || [];
      }
      
      setServices(labeledServices);
      setBagLabels(allLabels);

      // Calculate statistics
      const totalPhotos = allLabels.filter(label => label.photo).length;
      const totalBags = allLabels.length;
      
      // Recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentActivity = labeledServices.filter(s => 
        s.labeledDate && new Date(s.labeledDate) >= sevenDaysAgo
      ).length;
      
      setStats({
        totalLabeled: labeledServices.length,
        totalPhotos,
        totalBags,
        recentActivity
      });
    } catch (error) {
      console.error('Error loading labeling history:', error);
      showNotification({
        type: 'error',
        message: 'Error al cargar historial de rotulado. Usando datos locales.'
      });
      
      // Fall back to entirely local data
      try {
        // Get all services that have been labeled
        const allServices = serviceStorage.getServices() || [];
        const labeledServices = allServices.filter(s => 
          s && (s.status === SERVICE_STATUS.LABELED || 
                s.status === SERVICE_STATUS.IN_PROCESS || 
                s.status === SERVICE_STATUS.PARTIAL_DELIVERY ||
                s.status === SERVICE_STATUS.COMPLETED) &&
          s.labeledDate // Only services that have gone through labeling process
        );
        
        setServices(labeledServices);
  
        // Get all bag labels
        const allLabels = bagLabelStorage.getBagLabels() || [];
        setBagLabels(allLabels);
  
        // Calculate statistics
        const totalPhotos = allLabels.filter(label => label.photo).length;
        const totalBags = allLabels.length;
        
        // Recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentActivity = labeledServices.filter(s => 
          s.labeledDate && new Date(s.labeledDate) >= sevenDaysAgo
        ).length;
        
        setStats({
          totalLabeled: labeledServices.length,
          totalPhotos,
          totalBags,
          recentActivity
        });
      } catch (secondError) {
        console.error('Error loading from local storage:', secondError);
        setServices([]);
        setBagLabels([]);
        setStats({
          totalLabeled: 0,
          totalPhotos: 0,
          totalBags: 0,
          recentActivity: 0
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getServiceLabels = (serviceId) => {
    if (!serviceId || !Array.isArray(bagLabels)) return [];
    const dbLabels = bagLabels.filter(label => label && label.serviceId === serviceId);
    
    // Si no hay rótulos en la base de datos, crear rótulos simulados basados en labelingPhotos
    if (dbLabels.length === 0) {
      const service = services.find(s => s.id === serviceId);
      if (service && service.labelingPhotos && service.labelingPhotos.length > 0) {
        return service.labelingPhotos.map((photo, index) => ({
          id: `virtual-${serviceId}-${index}`,
          serviceId: serviceId,
          label: `${service.hotel?.name || 'ROT'}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${(index + 1).toString().padStart(2, '0')}`,
          bagNumber: index + 1,
          photo: photo,
          timestamp: service.updatedAt || service.createdAt,
          status: 'LABELED',
          registeredByName: service.repartidor?.name || 'Sistema'
        }));
      }
    }
    
    return dbLabels;
  };
  
  // Function to get labels by service from API (for future use)
  const getServiceLabelsFromApi = async (serviceId) => {
    try {
      const response = await bagLabelService.getServiceLabels(serviceId);
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error(`Error fetching labels for service ${serviceId}:`, error);
      // Fall back to local labels
      return getServiceLabels(serviceId);
    }
  };

  const getFilteredServices = () => {
    let filtered = services.filter(service => {
      if (!service) return false;
      
      const term = (searchTerm || '').toLowerCase();
      const hotelName = (service.hotelName || service.hotel?.name || service.hotel || '').toLowerCase();
      const guestName = (service.guestName || '').toLowerCase();
      const serviceId = (service.id || '').toLowerCase();
      
      const matchesSearch = hotelName.includes(term) || 
                           guestName.includes(term) || 
                           serviceId.includes(term);

      if (!matchesSearch) return false;

      // Status filter
      if (filterStatus !== 'all') {
        if (filterStatus === 'labeled' && service.status !== SERVICE_STATUS.LABELED) return false;
        if (filterStatus === 'in_process' && service.status !== SERVICE_STATUS.IN_PROCESS) return false;
        if (filterStatus === 'completed' && service.status !== SERVICE_STATUS.COMPLETED) return false;
      }

      // Date range filter
      if (filterDateRange !== 'all' && service.labeledDate) {
        const labeledDate = new Date(service.labeledDate);
        const now = new Date();
        
        switch (filterDateRange) {
          case 'today':
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (labeledDate < today) return false;
            break;
          case 'week':
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            if (labeledDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            if (labeledDate < monthAgo) return false;
            break;
        }
      }

      return true;
    });

    // Sort by labeled date (most recent first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.labeledDate || a.timestamp);
      const dateB = new Date(b.labeledDate || b.timestamp);
      return dateB - dateA;
    });
  };

  const openGallery = (service) => {
    const serviceLabels = getServiceLabels(service.id);
    const labelsWithPhotos = serviceLabels.filter(label => label.photo);
    
    if (labelsWithPhotos.length === 0) {
      alert('No hay fotos para mostrar en este servicio');
      return;
    }
    
    setGalleryService(service);
    setGalleryMode(true);
    setCurrentPhotoIndex(0);
  };

  const closeGallery = () => {
    setGalleryMode(false);
    setGalleryService(null);
    setCurrentPhotoIndex(0);
  };

  const navigatePhoto = (direction) => {
    if (!galleryService) return;
    
    const serviceLabels = getServiceLabels(galleryService.id);
    const labelsWithPhotos = serviceLabels.filter(label => label.photo);
    
    if (direction === 'prev') {
      setCurrentPhotoIndex(prev => 
        prev > 0 ? prev - 1 : labelsWithPhotos.length - 1
      );
    } else {
      setCurrentPhotoIndex(prev => 
        prev < labelsWithPhotos.length - 1 ? prev + 1 : 0
      );
    }
  };

  const handleViewPhoto = (photo) => {
    setViewingPhoto(photo);
  };

  const exportData = () => {
    const exportData = {
      export_date: new Date().toISOString(),
      services: getFilteredServices().map(service => ({
        id: service.id,
        hotel: service.hotelName || service.hotel?.name || service.hotel,
        guest: service.guestName,
        room: service.roomNumber,
        bags: service.bagCount,
        weight: service.weight,
        status: service.status,
        labeled_date: service.labeledDate,
        labels: getServiceLabels(service.id).map(label => ({
          id: label.id,
          label: label.label,
          has_photo: !!label.photo,
          registered_by: label.registeredByName,
          timestamp: label.timestamp
        }))
      })),
      statistics: stats
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial_rotulado_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredServices = getFilteredServices();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historial de Rotulado</h1>
          <p className="mt-2 text-gray-600">
            Registro completo de todos los servicios que han pasado por el proceso de rotulado
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <Button 
            onClick={loadHistoryData} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </Button>
          <Button onClick={exportData} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <Tag className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Servicios Rotulados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalLabeled}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Rótulos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBags}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <Camera className="h-8 w-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Fotos Capturadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPhotos}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-orange-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Actividad (7 días)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.recentActivity}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por hotel, huésped o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 border-0 p-0 text-gray-900 focus:ring-0"
            >
              <option value="all">Todos los estados</option>
              <option value="labeled">Solo Rotulado</option>
              <option value="in_process">En Proceso</option>
              <option value="completed">Completado</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              className="flex-1 border-0 p-0 text-gray-900 focus:ring-0"
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Services History */}
      <div className="space-y-4">
        {filteredServices.map((service) => {
          if (!service || !service.id) return null;
          
          const serviceLabels = getServiceLabels(service.id);
          const labelsWithPhotos = serviceLabels.filter(label => label.photo);
          
          return (
            <Card key={service.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Service Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center">
                        <Building className="h-4 w-4 mr-2 text-gray-500" />
                        {service.hotelName || service.hotel?.name || service.hotel || 'Hotel no especificado'}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        {service.guestName || 'Huésped no especificado'} - Hab. {service.roomNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                        {getStatusText(service.status)}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        ID: {service.id}
                      </p>
                    </div>
                  </div>

                  {/* Service Details */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-500">Bolsas</p>
                      <p className="font-medium">{service.bagCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Peso</p>
                      <p className="font-medium">{service.weight || 'N/A'} kg</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Rótulos</p>
                      <p className="font-medium">{serviceLabels.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Fotos</p>
                      <p className="font-medium">{labelsWithPhotos.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Rotulado</p>
                      <p className="font-medium">{service.labeledDate ? formatDate(service.labeledDate) : formatDate(service.updatedAt)}</p>
                    </div>
                  </div>

                  {/* Labels Display */}
                  {serviceLabels.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-sm font-medium text-gray-700">
                          Rótulos registrados ({serviceLabels.length}):
                        </p>
                        {labelsWithPhotos.length > 0 && (
                          <Button
                            onClick={() => openGallery(service)}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            <Grid className="h-3 w-3 mr-1" />
                            Ver Galería ({labelsWithPhotos.length})
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {serviceLabels.map((label) => (
                          <div
                            key={label.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {label.label}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(label.timestamp)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              {label.photo && (
                                <button
                                  onClick={() => handleViewPhoto(label.photo)}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  title="Ver foto"
                                >
                                  <Eye className="h-3 w-3 text-blue-600" />
                                </button>
                              )}
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                label.photo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {label.photo ? 'Con foto' : 'Sin foto'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Service History Notes */}
                  {service.internalNotes && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Historial de cambios:</p>
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                        {service.internalNotes.split('|').slice(-3).map((note, index) => (
                          <div key={index} className="mb-1">
                            {note.trim()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        
        {filteredServices.length === 0 && (
          <Card className="p-8 text-center">
            <QrCode className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron registros</h3>
            <p className="mt-1 text-sm text-gray-500">
              {services.length === 0 
                ? 'Aún no hay servicios que hayan pasado por el proceso de rotulado.'
                : 'No hay registros que coincidan con los filtros aplicados.'
              }
            </p>
          </Card>
        )}
      </div>

      {/* Gallery Modal */}
      {galleryMode && galleryService && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative w-full h-full flex flex-col">
            {/* Gallery Header */}
            <div className="bg-black bg-opacity-75 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">
                  Galería de Rótulos - {galleryService.hotelName || galleryService.hotel?.name || galleryService.hotel}
                </h3>
                <p className="text-sm text-gray-300">
                  {galleryService.guestName} | Servicio: {galleryService.id} | Rotulado: {formatDate(galleryService.labeledDate || galleryService.updatedAt)}
                </p>
              </div>
              <Button
                onClick={closeGallery}
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Gallery Content */}
            <div className="flex-1 flex">
              {(() => {
                const serviceLabels = getServiceLabels(galleryService.id);
                const labelsWithPhotos = serviceLabels.filter(label => label.photo);
                const currentLabel = labelsWithPhotos[currentPhotoIndex];

                if (!currentLabel) return null;

                return (
                  <>
                    {/* Navigation Arrows */}
                    {labelsWithPhotos.length > 1 && (
                      <>
                        <button
                          onClick={() => navigatePhoto('prev')}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full z-10 transition-colors"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                          onClick={() => navigatePhoto('next')}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full z-10 transition-colors"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </button>
                      </>
                    )}

                    {/* Main Photo Display */}
                    <div className="flex-1 flex items-center justify-center p-8">
                      <div className="relative max-w-4xl max-h-full">
                        <img
                          src={currentLabel.photo.startsWith('http') ? currentLabel.photo : `http://localhost:3001${currentLabel.photo}`}
                          alt={`Rótulo ${currentLabel.label}`}
                          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                        
                        {/* Photo Counter */}
                        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                          {currentPhotoIndex + 1} de {labelsWithPhotos.length}
                        </div>
                      </div>
                    </div>

                    {/* Right Panel - Label Info */}
                    <div className="w-80 bg-white p-6 overflow-y-auto">
                      <div className="space-y-4">
                        {/* Current Label Info */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Información del Rótulo</h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-600">Rótulo:</span>
                              <span className="ml-2 font-medium">{currentLabel.label}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Registrado:</span>
                              <span className="ml-2">{formatDate(currentLabel.timestamp)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Por:</span>
                              <span className="ml-2">{currentLabel.registeredByName}</span>
                            </div>
                            {currentLabel.updatedAt && (
                              <div>
                                <span className="text-gray-600">Actualizado:</span>
                                <span className="ml-2">{formatDate(currentLabel.updatedAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* All Labels in Service */}
                        <div className="border-t pt-4">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Todos los Rótulos ({serviceLabels.length})
                          </h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {serviceLabels.map((label, index) => (
                              <div
                                key={label.id}
                                className={`flex items-center justify-between p-2 rounded text-sm ${
                                  label.id === currentLabel.id
                                    ? 'bg-blue-100 border border-blue-200'
                                    : 'bg-gray-50'
                                }`}
                              >
                                <span className="font-medium">{label.label}</span>
                                <div className="flex items-center space-x-1">
                                  {label.photo && (
                                    <Camera className="h-3 w-3 text-blue-600" />
                                  )}
                                  {label.photo && label.id !== currentLabel.id && (
                                    <button
                                      onClick={() => {
                                        const photoIndex = labelsWithPhotos.findIndex(l => l.id === label.id);
                                        if (photoIndex !== -1) {
                                          setCurrentPhotoIndex(photoIndex);
                                        }
                                      }}
                                      className="text-blue-600 hover:text-blue-800 text-xs"
                                    >
                                      Ver
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Keyboard Shortcuts */}
                        <div className="border-t pt-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Atajos de Teclado</h4>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>← → : Navegar fotos</div>
                            <div>Esc : Cerrar galería</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <div 
            className="relative max-w-4xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewingPhoto.startsWith('http') ? viewingPhoto : `http://localhost:3001${viewingPhoto}`}
              alt="Foto del rótulo"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <Button
              onClick={() => setViewingPhoto(null)}
              variant="outline"
              size="sm"
              className="absolute top-4 right-4 bg-white hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded text-sm">
              Foto del Rótulo - Click fuera para cerrar
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BagLabelRegistry;