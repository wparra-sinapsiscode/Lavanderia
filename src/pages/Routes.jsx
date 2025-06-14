import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import { formatDate, formatLocalDate, getPriorityColor, sortServicesByPriority, getPickupStats, getServiceTypeColor, getServiceTypeText, isPickupService, isDeliveryService, isStatusMatch, isPendingPickup } from '../utils';
import { SERVICE_STATUS, USER_ROLES } from '../types';
import { SERVICE_STATUS_CONFIG } from '../constants';
import routeService from '../services/route.service';
import serviceService from '../services/service.service';
import hotelService from '../services/hotel.service';
import { hotelHasValidCoordinates, extractHotelCoordinates } from '../utils/coordinates';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Package, 
  Route,
  Building2,
  User,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Flag,
  Truck
} from 'lucide-react';

const Routes = () => {
  const { user, isAdmin } = useAuth();
  const { success, error } = useNotifications();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [services, setServices] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [activeRoute, setActiveRoute] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Usar fecha local para inicializar el selector de fecha
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    loadRoutesData();
  }, [selectedDate, user?.id]);

  useEffect(() => {
    const handleRoutesUpdate = () => {
      loadRoutesData();
    };

    window.addEventListener('routesUpdated', handleRoutesUpdate);
    return () => window.removeEventListener('routesUpdated', handleRoutesUpdate);
  }, [selectedDate]);

  // Función para detectar si una ruta está completada
  const isRouteCompleted = (route) => {
    if (!route.hotels || route.hotels.length === 0) return false;
    
    // Verificar cada hotel en la ruta
    return route.hotels.every(hotel => {
      if (!hotel.services || hotel.services.length === 0) return true;
      
      // Si todos los servicios del hotel están recogidos o en proceso superior
      return hotel.services.every(service => 
        ['PICKED_UP', 'LABELED', 'IN_PROCESS', 'PARTIAL_DELIVERY', 'COMPLETED'].includes(service.status)
      );
    });
  };

  // Función para obtener el estado correcto de la ruta
  const getRouteStatus = (route) => {
    if (isRouteCompleted(route)) {
      return {
        status: 'completada',
        displayText: 'Completada',
        color: 'green',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        message: 'Todos los recojos finalizados'
      };
    } else if (route.status === 'en_progreso') {
      return {
        status: 'en_progreso', 
        displayText: 'En Progreso',
        color: 'blue',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        message: 'Ruta activa'
      };
    } else {
      return {
        status: route.status,
        displayText: route.status === 'planificada' ? 'Planificada' : route.status,
        color: 'gray',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        message: ''
      };
    }
  };

  // Calcular progreso real basado en servicios completados
  const getHotelProgress = (route) => {
    let completedHotels = 0;
    
    route.hotels?.forEach(hotel => {
      // Hotel completado = todos sus servicios recogidos
      const allServicesPickedUp = hotel.services?.every(service =>
        ['PICKED_UP', 'LABELED', 'IN_PROCESS', 'PARTIAL_DELIVERY', 'COMPLETED'].includes(service.status)
      ) || true; // true si no hay servicios
      
      if (allServicesPickedUp) {
        completedHotels++;
      }
    });
    
    return {
      completed: completedHotels,
      total: route.hotels?.length || 0,
      percentage: Math.round((completedHotels / (route.hotels?.length || 1)) * 100)
    };
  };

  // Obtener resumen de servicios del hotel
  const getHotelServicesSummary = (hotel) => {
    if (!hotel.services || hotel.services.length === 0) {
      return "Sin servicios asignados";
    }
    
    const pendingPickups = hotel.services.filter(s => isPendingPickup(s)).length;
    
    const pickedUp = hotel.services.filter(s => 
      isStatusMatch(s, ['PICKED_UP', 'LABELED', 'IN_PROCESS'])
    ).length;
    
    const completed = hotel.services.filter(s => 
      isStatusMatch(s, ['PARTIAL_DELIVERY', 'COMPLETED'])
    ).length;
    
    if (pendingPickups > 0) {
      return `${pendingPickups} recojos pendientes`;
    } else if (pickedUp > 0) {
      return `✅ ${pickedUp} servicios recogidos - En lavandería`;
    } else if (completed > 0) {
      return `✅ ${completed} servicios listos para entrega`;
    }
    
    return "Estado desconocido";
  };

  const loadRoutesData = async () => {
    try {
      setLoading(true);
      
      // Load services and hotels from API
      const [servicesResponse, hotelsResponse, routesResponse] = await Promise.all([
        isAdmin ? serviceService.getAllServices() : serviceService.getMyServices(),
        hotelService.getAllHotels(),
        routeService.getAllRoutes({ date: selectedDate, repartidorId: isAdmin ? undefined : user?.id })
      ]);
      
      const validServices = Array.isArray(servicesResponse) ? servicesResponse : [];
      const validHotels = Array.isArray(hotelsResponse) ? hotelsResponse : [];
      
      setServices(validServices);
      setHotels(validHotels);
      
      // Process and set routes
      const routesData = routesResponse.data || routesResponse || [];
      
      // Sort routes by creation date to ensure consistent numbering
      const sortedRoutes = Array.isArray(routesData) ? [...routesData].sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      ) : [];
      
      const routesWithNumbers = sortedRoutes.map((route, index) => {
        if (!route.routeNumber) {
          return { ...route, routeNumber: index + 1 };
        }
        return route;
      });
      
      // Filter out duplicates by ID
      const uniqueRoutes = routesWithNumbers.filter((route, index, array) => 
        array.findIndex(r => r.id === route.id) === index
      );
      
      // Process routes to ensure hotel data is properly grouped
      const processedRoutes = uniqueRoutes.map(route => {
        // Debug log
        console.log(`Route ${route.id} has ${route.hotels?.length} hotels:`, route.hotels);
        
        // Group hotels by hotelId to avoid duplicates
        if (route.hotels && route.hotels.length > 0) {
          const hotelMap = new Map();
          
          route.hotels.forEach(hotel => {
            const hotelId = hotel.hotelId;
            if (!hotelMap.has(hotelId)) {
              hotelMap.set(hotelId, {
                ...hotel,
                pickups: [...(hotel.pickups || [])],
                deliveries: [...(hotel.deliveries || [])],
                services: [...(hotel.services || [])]
              });
            } else {
              // Merge services if hotel is duplicated
              const existing = hotelMap.get(hotelId);
              existing.pickups = [...existing.pickups, ...(hotel.pickups || [])];
              existing.deliveries = [...existing.deliveries, ...(hotel.deliveries || [])];
              existing.services = [...existing.services, ...(hotel.services || [])];
            }
          });
          
          // Replace hotels array with deduplicated version
          route.hotels = Array.from(hotelMap.values());
        }
        
        return route;
      });
      
      setRoutes(processedRoutes);
      
      // Set active route if exists (prefer in_progress over en_progreso)
      const active = processedRoutes.find(r => r.status === 'en_progreso' || r.status === 'IN_PROGRESS');
      setActiveRoute(active || null);
    } catch (err) {
      console.error('Error loading routes data:', err);
      error('Error', 'No se pudo cargar los datos de rutas: ' + (err.message || 'Error desconocido'));
      
      // Reset states to empty arrays rather than using potentially stale data
      setServices([]);
      setHotels([]);
      setRoutes([]);
      setActiveRoute(null);
    } finally {
      setLoading(false);
    }
  };

  // Validate hotel coordinates using our utility function
  const validateHotelCoordinates = (hotel) => {
    return hotelHasValidCoordinates(hotel);
  };
  
  // Get missing coordinates details for error messages
  const getMissingCoordinatesDetails = (hotel) => {
    if (!hotel) return 'Hotel no encontrado';
    
    const coordinates = extractHotelCoordinates(hotel);
    if (!coordinates) {
      return `${hotel.name || 'Hotel sin nombre'} no tiene coordenadas`;
    }
    
    return null;
  };

  const generateOptimizedRoute = async () => {
    setLoading(true);
    
    try {
      // Check if routes already exist for today via API
      const existingRoutesResponse = await routeService.getAllRoutes({ date: selectedDate });
      const existingRoutes = existingRoutesResponse.data || [];
      
      if (existingRoutes.length > 0) {
        error('Rutas Existentes', `Ya existen ${existingRoutes.length} rutas para la fecha ${selectedDate}. Usa el botón "Limpiar Rutas del Día" si quieres regenerar.`);
        return;
      }
      
      // Validate that hotels have coordinates before generating routes
      const hotelsWithoutCoordinates = hotels.filter(hotel => !validateHotelCoordinates(hotel));
      
      if (hotelsWithoutCoordinates.length > 0) {
        // Get detailed missing coordinates information
        const missingCoordinatesDetails = hotelsWithoutCoordinates
          .map(hotel => getMissingCoordinatesDetails(hotel))
          .filter(detail => detail !== null);
        
        // Format the error message with details
        const errorMessage = [
          `${hotelsWithoutCoordinates.length} hoteles no tienen coordenadas válidas:`,
          ...missingCoordinatesDetails.map(detail => `- ${detail}`)
        ].join('\n');
        
        error('Coordenadas Faltantes', errorMessage + '\n\nPor favor actualice la información de estos hoteles antes de generar rutas.');
        return;
      }
      
      // Generate optimized route via API
      const response = await routeService.generateOptimizedRoute(selectedDate);
      const generatedRoutes = response.data || [];
      
      if (!generatedRoutes || generatedRoutes.length === 0) {
        error('Sin Rutas', 'No se pudieron crear rutas. Verifica que existan servicios pendientes asignados a repartidores.');
        return;
      }

      // Refresh routes from API
      await loadRoutesData();
      
      // Verificar que generatedRoutes es un array antes de usar reduce
      if (Array.isArray(generatedRoutes)) {
        // Count metrics for success message
        const totalPickupsGenerated = generatedRoutes.reduce((sum, route) => sum + (route.totalPickups || 0), 0);
        const totalDeliveriesGenerated = generatedRoutes.reduce((sum, route) => sum + (route.totalDeliveries || 0), 0);
        
        success('Rutas Mixtas Generadas', `${generatedRoutes.length} rutas optimizadas: ${totalPickupsGenerated} recojos + ${totalDeliveriesGenerated} entregas`);
      } else {
        // Si generatedRoutes no es un array, mostrar un mensaje genérico
        success('Operación Completada', 'Se ha procesado la solicitud de generación de rutas');
      }
      
    } catch (err) {
      console.error('Error generating route:', err);
      error('Error', `No se pudo generar la ruta optimizada: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const clearTodayRoutes = async () => {
    setLoading(true);
    try {
      // Delete routes for today using API
      await routeService.deleteRoutesByDate(selectedDate);
      
      // Refresh routes from API
      await loadRoutesData();
      
      success('Rutas Eliminadas', `Se eliminaron todas las rutas del ${selectedDate}`);
    } catch (err) {
      console.error('Error clearing routes:', err);
      error('Error', `No se pudieron eliminar las rutas: ${err.message || 'Error desconocido'}`);
      
      // Don't attempt to use localStorage as fallback, just report the error
    } finally {
      setLoading(false);
    }
  };

  const startRoute = async (routeId) => {
    setLoading(true);
    
    try {
      // Start route using API
      const updatedRoute = await routeService.startRoute(routeId);
      
      // Process the updated route to ensure proper data structure
      const processedUpdatedRoute = {
        ...updatedRoute,
        status: 'en_progreso',
        startTime: updatedRoute.startTime || new Date().toISOString()
      };
      
      // Update local state immediately to prevent duplicate calls
      setRoutes(prevRoutes => {
        return prevRoutes.map(route => {
          if (route.id === routeId) {
            return processedUpdatedRoute;
          }
          return route;
        });
      });
      
      // Set as active route with proper structure
      setActiveRoute(processedUpdatedRoute);
      
      // ✨ NUEVO: Actualizar estado de servicios a ASSIGNED_TO_ROUTE (en segundo plano)
      updateRouteServicesStatus(routeId, updatedRoute);
      
      success('Ruta Iniciada', 'La ruta ha sido iniciada exitosamente');
    } catch (err) {
      console.error('Error starting route:', err);
      error('Error', `No se pudo iniciar la ruta: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // ✨ NUEVA FUNCIÓN: Actualizar estado de servicios cuando se inicia ruta
  const updateRouteServicesStatus = async (routeId, routeData) => {
    // Ejecutar en segundo plano para no bloquear la UI
    setTimeout(async () => {
      try {
        // Usar los datos de la ruta proporcionada o buscarla en el estado actual
        const route = routeData || routes.find(r => r.id === routeId);
        if (!route || !route.hotels) {
          console.warn('No se encontró información de la ruta para actualizar servicios');
          return;
        }
        
        // Extraer todos los servicios de la ruta
        const serviceIds = new Set(); // Usar Set para evitar duplicados
        
        route.hotels.forEach(hotel => {
          // Revisar en services
          if (hotel.services && Array.isArray(hotel.services)) {
            hotel.services.forEach(service => {
              if (service.id && isStatusMatch(service, 'PENDING_PICKUP')) {
                serviceIds.add(service.id);
              }
            });
          }
          
          // También revisar en pickups por compatibilidad
          if (hotel.pickups && Array.isArray(hotel.pickups)) {
            hotel.pickups.forEach(service => {
              if (service.id && isStatusMatch(service, 'PENDING_PICKUP')) {
                serviceIds.add(service.id);
              }
            });
          }
        });
        
        const uniqueServiceIds = Array.from(serviceIds);
        console.log(`🚀 Actualizando ${uniqueServiceIds.length} servicios a estado ASSIGNED_TO_ROUTE`);
        
        // Actualizar servicios con menor agresividad para evitar errores 500
        const updatePromises = uniqueServiceIds.map(async (serviceId) => {
          try {
            const result = await serviceService.updateServiceStatus(serviceId, {
              status: 'ASSIGNED_TO_ROUTE',
              internalNotes: `Ruta iniciada por ${user.name} - ${new Date().toLocaleString()}`
            });
            console.log(`✅ Servicio ${serviceId} actualizado correctamente`);
            return result;
          } catch (serviceError) {
            console.warn(`⚠️ Error actualizando servicio ${serviceId}:`, serviceError.message);
            // No fallar todo el proceso por un servicio
            return null;
          }
        });
        
        // Esperar a que todas las actualizaciones terminen
        const results = await Promise.allSettled(updatePromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
        
        console.log(`✅ ${successful}/${uniqueServiceIds.length} servicios actualizados exitosamente`);
        
        // Notificar actualización para que otros componentes se refresquen
        window.dispatchEvent(new CustomEvent('serviceUpdated', { 
          detail: { 
            type: 'route_started', 
            routeId,
            serviceIds: uniqueServiceIds,
            successful
          } 
        }));
        
      } catch (error) {
        console.error('Error actualizando estado de servicios:', error);
        // No interrumpir el flujo principal
      }
    }, 1000); // Esperar 1 segundo para que la ruta se complete primero
  };

  const handleGenerateAutomaticRoutes = async () => {
    try {
      setLoading(true);
      
      // Llamar al servicio para generar rutas automáticas
      const result = await routeService.generateAutomaticRoutes({
        date: selectedDate,
        zones: [] // Vacío significa todas las zonas para admin
      });
      
      if (result.success) {
        success('Rutas Generadas', result.message);
        // Recargar las rutas para mostrar las nuevas
        await loadRoutesData();
        
        // Mostrar resumen si existe
        if (result.summary) {
          const { totalRoutes, totalServices, zones } = result.summary;
          success(
            'Resumen de Generación',
            `${totalRoutes} rutas creadas para ${totalServices} servicios en zonas: ${zones.join(', ')}`
          );
        }
      } else {
        error('Error', result.message || 'No se pudieron generar las rutas');
      }
    } catch (err) {
      console.error('Error generando rutas automáticas:', err);
      error('Error', err.message || 'Error al generar rutas automáticas');
    } finally {
      setLoading(false);
    }
  };

  const redirectToServiceForm = (routeId, hotelIndex, serviceId, serviceType) => {
    const route = routes.find(r => r.id === routeId);
    const hotel = route?.hotels[hotelIndex];
    
    if (!hotel) {
      error('Hotel no encontrado', 'No se pudo encontrar el hotel en la ruta especificada.');
      return;
    }

    // Find the specific service
    const service = hotel.services?.find(s => s.id === serviceId) || 
                   hotel.pickups?.find(s => s.id === serviceId) || 
                   hotel.deliveries?.find(s => s.id === serviceId);

    if (!service) {
      error('Servicio no encontrado', 'No se pudo encontrar el servicio especificado.');
      return;
    }

    if (serviceType === 'pickup') {
      // Navigate to pickup page
      navigate('/pickup', {
        state: {
          selectedServiceId: serviceId,
          returnTo: '/routes',
          routeId: routeId,
          hotelIndex: hotelIndex,
          useApi: true // Flag to indicate using API instead of localStorage
        }
      });
    } else if (serviceType === 'delivery') {
      // Navigate to delivery page
      navigate('/delivery', {
        state: {
          selectedServiceId: serviceId,
          returnTo: '/routes',
          routeId: routeId,
          hotelIndex: hotelIndex,
          useApi: true // Flag to indicate using API instead of localStorage
        }
      });
    }
  };


  const RouteCard = ({ route }) => {
    const isActive = activeRoute?.id === route.id;
    const canManageRoute = isAdmin || route.repartidorId === user.id;
    // Calculate completion stats using new logic
    const hotelProgress = getHotelProgress(route);
    const completedStops = hotelProgress.completed;
    const progress = hotelProgress.percentage;
    const routeType = route.type === 'delivery' ? 'Entrega' : 'Recojo';
    
    return (
      <Card className={isActive ? 'ring-2 ring-blue-500' : ''}>
        <Card.Header>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center flex-wrap">
                <Route className="h-5 w-5 mr-2 text-blue-600" />
                <span>Ruta #{route.routeNumber}</span>
                <span className="ml-2 px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                  {routeType}
                </span>
              </h3>
              <p className="text-sm text-gray-600">
                {route.repartidorName} • {formatDate(route.createdAt)}
              </p>
              {route.totalDistance && (
                <p className="text-xs text-gray-500">
                  {route.totalDistance} km • {route.weatherConditions || 'Clima normal'}
                </p>
              )}
            </div>
            {(() => {
              const routeStatus = getRouteStatus(route);
              return (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${routeStatus.bgColor} ${routeStatus.textColor}`}>
                  {routeStatus.displayText}
                </span>
              );
            })()}
          </div>
        </Card.Header>
        
        <Card.Content>
          <div className="space-y-4">
            {/* Route Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">
                  {route.hotels.reduce((sum, h) => sum + (h.services?.filter(s => s.status === 'ASSIGNED_TO_ROUTE').length || 0), 0)}
                  {route.status !== 'en_progreso' && (
                    <span className="text-orange-600">
                      +{route.hotels.reduce((sum, h) => sum + (h.services?.filter(s => s.status === 'PENDING_PICKUP').length || 0), 0)}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-600">
                  {route.status === 'en_progreso' ? 'Listos' : 'Recojos'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">{route.totalDeliveries || 0}</p>
                <p className="text-xs text-gray-600">Entregas</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-purple-600">{route.hotels.length}</p>
                <p className="text-xs text-gray-600">Hoteles</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-orange-600">{route.estimatedDuration}min</p>
                <p className="text-xs text-gray-600">Duración</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Progreso</span>
                <span>{completedStops}/{route.hotels.length} hoteles</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Hotel Stops */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Paradas:</h4>
              {route.hotels.map((hotel, index) => {
                console.log(`Hotel ${hotel.hotelName}:`, hotel); // Debug log
                console.log(`Hotel ${hotel.hotelName} services:`, hotel.services); // Debug services
                hotel.services?.forEach((service, i) => {
                  console.log(`Service ${i + 1}:`, service.guestName, service.status);
                });
                return (
                  (() => {
                  // Determinar si el hotel está completado usando nueva lógica
                  const hotelCompleted = hotel.services?.every(service =>
                    ['PICKED_UP', 'LABELED', 'IN_PROCESS', 'PARTIAL_DELIVERY', 'COMPLETED'].includes(service.status)
                  ) || !hotel.services || hotel.services.length === 0;
                  
                  return (
                    <div key={`${route.id}-hotel-${hotel.hotelId}-${index}`} className={`flex items-center justify-between p-2 rounded border ${
                      hotelCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center">
                        {hotelCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        )}
                    <div>
                      <p className="text-sm font-medium">{hotel.hotelName}</p>
                      <p className="text-xs text-gray-600">
                        {getHotelServicesSummary(hotel)} • 
                        {hotel.estimatedTimeMinutes ? ` ${hotel.estimatedTimeMinutes} min` : hotel.estimatedTime}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {hotel.services?.filter(s => s.status === 'PENDING_PICKUP').length > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-800 rounded border-orange-200">
                            {hotel.services.filter(s => s.status === 'PENDING_PICKUP').length} Pendientes
                          </span>
                        )}
                        {hotel.services?.filter(s => s.status === 'ASSIGNED_TO_ROUTE').length > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded border-blue-200">
                            {hotel.services.filter(s => s.status === 'ASSIGNED_TO_ROUTE').length} Listos
                          </span>
                        )}
                        {hotel.deliveries?.length > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded border-green-200">
                            {hotel.deliveries.length} Entregas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isAdmin && route.repartidorId === user.id && route.status === 'en_progreso' && (
                    <div className="space-y-1 mt-2">
                      {/* Individual service buttons */}
                      {hotel.services?.map((service, serviceIndex) => {
                        console.log(`Checking service ${service.guestName}:`, {
                          status: service.status,
                          shouldShow: service.status === 'ASSIGNED_TO_ROUTE' // Solo mostrar si ruta está iniciada
                        });
                        return (
                        service.status === 'ASSIGNED_TO_ROUTE' && (
                          <div key={`service-${service.id}`} className="flex items-center gap-3 p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {service.guestName} - Hab. {service.roomNumber}
                              </p>
                              <p className="text-xs text-gray-600">
                                {service.bagCount} bolsas • {service.weight || 0}kg
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => redirectToServiceForm(route.id, index, service.id, 'pickup')}
                            >
                              Recoger
                            </Button>
                          </div>
                        )
                        );
                      })}
                      {hotel.deliveries?.map((delivery, deliveryIndex) => (
                        (delivery.status === 'PARTIAL_DELIVERY' || 
                         delivery.status === 'COMPLETED' ||
                         delivery.status === 'READY_FOR_DELIVERY') && (
                          <Button
                            key={`delivery-${delivery.id}`}
                            size="sm"
                            onClick={() => redirectToServiceForm(route.id, index, delivery.id, 'delivery')}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            Entregar: {delivery.guestName}
                          </Button>
                        )
                      ))}
                    </div>
                  )}
                    </div>
                  );
                })()
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSelectedRoute(route)}
                className="flex-1"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Ver Detalle
              </Button>
              
              {(() => {
                const routeStatus = getRouteStatus(route);
                
                if (routeStatus.status === 'completada') {
                  // Para administradores, mostrar opción de rotular
                  if (isAdmin || user.role === USER_ROLES.ADMIN) {
                    return (
                      <Button
                        onClick={() => navigate('/bag-labels', { 
                          state: { 
                            fromRoute: true,
                            routeId: route.id,
                            services: route.hotels.flatMap(h => h.services || []).filter(s => 
                              ['PICKED_UP'].includes(s.status)
                            )
                          }
                        })}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Siguiente: Rotular →
                      </Button>
                    );
                  } else {
                    // Para repartidores, mostrar ruta completada
                    return (
                      <Button
                        variant="outline"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Completado ✓
                      </Button>
                    );
                  }
                } else if (route.status === 'pendiente' && !isAdmin && route.repartidorId === user.id) {
                  return (
                    <Button
                      onClick={() => startRoute(route.id)}
                      disabled={loading}
                      className="flex-1"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar Ruta
                    </Button>
                  );
                } else if (route.status === 'en_progreso') {
                  return (
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      {routeStatus.displayText}
                    </Button>
                  );
                } else {
                  return (
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      {routeStatus.displayText}
                    </Button>
                  );
                }
              })()}
            </div>
          </div>
        </Card.Content>
      </Card>
    );
  };

  const stats = getPickupStats(services, isAdmin ? null : user.id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Rutas
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Optimización y seguimiento de rutas de recojo
          </p>
        </div>
        
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recojos Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Entregas Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.deliveries}</p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Route className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rutas Activas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {routes.filter(r => r.status === 'en_progreso').length}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completadas Hoy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {routes.filter(r => r.status === 'completada' && r.date === selectedDate).length}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hoteles Hoy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(services.filter(s => 
                    s.status === SERVICE_STATUS.PENDING_PICKUP ||
                    s.status === SERVICE_STATUS.PARTIAL_DELIVERY ||
                    s.status === SERVICE_STATUS.COMPLETED ||
                    s.status === SERVICE_STATUS.READY_FOR_DELIVERY
                  ).map(s => s.hotelId)).size}
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Urgentes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.urgent}</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Additional Performance Stats for Selected Date */}
      {routes.length > 0 && (
        <Card>
          <Card.Header>
            <h3 className="text-lg font-semibold text-gray-900">
              Resumen del {formatLocalDate(selectedDate)}
            </h3>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {routes.filter(r => r.date === selectedDate).length}
                </p>
                <p className="text-sm text-gray-600">Rutas Totales</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {routes.filter(r => r.date === selectedDate && r.efficiency)
                    .reduce((avg, r, _, arr) => avg + r.efficiency / (arr.length || 1), 0).toFixed(0)}%
                </p>
                <p className="text-sm text-gray-600">Eficiencia Promedio</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {routes.filter(r => r.date === selectedDate && r.totalDistance)
                    .reduce((sum, r) => sum + (parseFloat(r.totalDistance) || 0), 0).toFixed(1)} km
                </p>
                <p className="text-sm text-gray-600">Distancia Total</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {routes.filter(r => r.date === selectedDate && r.issues?.length > 0).length}
                </p>
                <p className="text-sm text-gray-600">Rutas con Incidencias</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}


      {/* Active Route */}
      {activeRoute && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Ruta Activa</h2>
          <RouteCard route={activeRoute} />
        </div>
      )}

      {/* All Routes */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Rutas del {formatLocalDate(selectedDate)}
        </h2>
        
        {routes.length === 0 ? (
          <Card>
            <Card.Content className="p-8 text-center">
              <Route className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay rutas para esta fecha
              </h3>
              {isAdmin && (
                <>
                  <p className="text-gray-600 mb-4">
                    Genera rutas automáticas optimizadas para organizar los recojos del día
                  </p>
                  <Button 
                    onClick={handleGenerateAutomaticRoutes} 
                    disabled={loading}
                    variant="primary"
                  >
                    <Route className="h-4 w-4 mr-2" />
                    Generar Rutas Automáticas
                  </Button>
                </>
              )}
            </Card.Content>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {routes
              .filter(route => !activeRoute || route.id !== activeRoute.id) // Filtrar la ruta activa
              .map(route => (
                <RouteCard key={route.id} route={route} />
              ))}
          </div>
        )}
      </div>

      {/* Route Details Modal */}
      {selectedRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Detalles - Ruta #{selectedRoute.routeNumber}
                </h2>
                <Button
                  variant="outline"
                  onClick={() => setSelectedRoute(null)}
                >
                  Cerrar
                </Button>
              </div>
              
              {/* Route Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <Card.Header>
                    <h3 className="text-lg font-semibold">Información General</h3>
                  </Card.Header>
                  <Card.Content>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Repartidor:</span>
                        <span className="font-medium">{selectedRoute.repartidorName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fecha:</span>
                        <span className="font-medium">{formatLocalDate(selectedRoute.date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estado:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          selectedRoute.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                          selectedRoute.status === 'en_progreso' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {selectedRoute.status === 'pendiente' ? 'Pendiente' :
                           selectedRoute.status === 'en_progreso' ? 'En Progreso' : 'Completada'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Recojos:</span>
                        <span className="font-medium">{selectedRoute.totalPickups}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duración Estimada:</span>
                        <span className="font-medium">{selectedRoute.estimatedDuration} min</span>
                      </div>
                      {selectedRoute.startTime && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hora Inicio:</span>
                          <span className="font-medium">{new Date(selectedRoute.startTime).toLocaleTimeString('es-PE')}</span>
                        </div>
                      )}
                      {selectedRoute.endTime && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hora Fin:</span>
                          <span className="font-medium">{new Date(selectedRoute.endTime).toLocaleTimeString('es-PE')}</span>
                        </div>
                      )}
                    </div>
                  </Card.Content>
                </Card>

                <Card>
                  <Card.Header>
                    <h3 className="text-lg font-semibold">Progreso</h3>
                  </Card.Header>
                  <Card.Content>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Hoteles Completados</span>
                          <span>{selectedRoute.hotels.filter(h => h.completed).length}/{selectedRoute.hotels.length}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${(selectedRoute.hotels.filter(h => h.completed).length / selectedRoute.hotels.length) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-green-600">
                            {selectedRoute.hotels.filter(h => h.completed).length}
                          </p>
                          <p className="text-xs text-gray-600">Completados</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-yellow-600">
                            {selectedRoute.hotels.filter(h => !h.completed).length}
                          </p>
                          <p className="text-xs text-gray-600">Pendientes</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {selectedRoute.hotels.length}
                          </p>
                          <p className="text-xs text-gray-600">Total</p>
                        </div>
                      </div>
                    </div>
                  </Card.Content>
                </Card>
              </div>

              {/* Hotels List */}
              <Card>
                <Card.Header>
                  <h3 className="text-lg font-semibold">Hoteles en la Ruta</h3>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-4">
                    {selectedRoute.hotels.map((hotel, index) => (
                      <div key={`selected-${selectedRoute.id}-hotel-${hotel.hotelId}-${index}`} className={`p-4 rounded-lg border ${
                        hotel.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              {hotel.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                              ) : (
                                <Clock className="h-5 w-5 text-gray-400 mr-2" />
                              )}
                              <h4 className="font-semibold text-gray-900">{hotel.hotelName}</h4>
                              <span className="ml-2 text-sm text-gray-500">#{index + 1}</span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{hotel.hotelAddress}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Hora estimada:</span>
                                <span className="ml-1 font-medium">{hotel.estimatedTime}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Recojos:</span>
                                <span className="ml-1 font-medium">{hotel.pickups.length}</span>
                              </div>
                            </div>
                            {hotel.completed && hotel.completedAt && (
                              <p className="text-sm text-green-600 mt-2">
                                Completado: {new Date(hotel.completedAt).toLocaleTimeString('es-PE')}
                              </p>
                            )}
                          </div>
                          <div className="ml-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              hotel.priority === 3 ? 'bg-red-100 text-red-800' :
                              hotel.priority === 2 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {hotel.priority === 3 ? 'Alta' : hotel.priority === 2 ? 'Media' : 'Baja'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Individual Services */}
                        <div className="mt-3 border-t pt-3 space-y-3">
                          {hotel.services && hotel.services.length > 0 ? (
                            hotel.services
                              .filter(service => {
                                // Para repartidores, solo mostrar servicios de recojo (no entregas)
                                if (!isAdmin && user.role !== USER_ROLES.ADMIN) {
                                  return service.status === SERVICE_STATUS.PENDING_PICKUP || 
                                         service.status === SERVICE_STATUS.ASSIGNED_TO_ROUTE ||
                                         service.status === SERVICE_STATUS.PICKED_UP;
                                }
                                // Para admin, mostrar todo
                                return true;
                              })
                              .map((service, serviceIndex) => {
                                const isPickup = service.status === SERVICE_STATUS.PENDING_PICKUP || 
                                                service.status === SERVICE_STATUS.ASSIGNED_TO_ROUTE;
                                const isDelivery = service.status === SERVICE_STATUS.PARTIAL_DELIVERY || 
                                                 service.status === SERVICE_STATUS.COMPLETED ||
                                                 service.status === SERVICE_STATUS.READY_FOR_DELIVERY;
                                const isCompleted = service.status === SERVICE_STATUS.PICKED_UP || 
                                                   service.status === SERVICE_STATUS.DELIVERED;
                                
                                // Determinar color según prioridad
                                const getPriorityClasses = () => {
                                  if (isCompleted) return 'bg-gray-50 border-gray-300';
                                  
                                  if (service.priority === 'alta' || service.priority === 'ALTA') {
                                    return 'bg-red-50 border-red-300';
                                  } else if (service.priority === 'media' || service.priority === 'MEDIA') {
                                    return 'bg-yellow-50 border-yellow-300';
                                  } else {
                                    return 'bg-green-50 border-green-300';
                                  }
                                };
                                
                                return (
                                  <div 
                                    key={service.id} 
                                    className={`p-3 rounded border ${getPriorityClasses()}`}
                                  >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      <h6 className="font-medium text-sm">
                                        {service.guestName} - Hab. {service.roomNumber}
                                      </h6>
                                      <p className="text-xs text-gray-600">
                                        {service.bagCount} bolsas • {service.weight || 'Por pesar'}kg
                                      </p>
                                      {service.deliveredBagCount && service.deliveredBagCount > 0 && (
                                        <p className="text-xs text-orange-600">
                                          Entregadas: {service.deliveredBagCount}/{service.bagCount} ({service.deliveryPercentage}%)
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex gap-1 flex-wrap">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        isCompleted ? 'bg-gray-100 text-gray-700' :
                                        isPickup ? 'bg-blue-100 text-blue-800' : 
                                        'bg-green-100 text-green-800'
                                      }`}>
                                        {isCompleted ? 'RECOGIDO' :
                                         isPickup ? 'RECOJO' : 'ENTREGA'}
                                      </span>
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        service.priority === 'alta' ? 'bg-red-100 text-red-700' :
                                        service.priority === 'media' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-green-100 text-green-700'
                                      }`}>
                                        {service.priority?.toUpperCase() || 'NORMAL'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Action button for individual services */}
                                  {!isAdmin && selectedRoute.repartidorId === user.id && selectedRoute.status === 'en_progreso' && !isCompleted && (
                                    <Button
                                      size="xs"
                                      onClick={() => {
                                        const serviceType = isPickup ? 'pickup' : 'delivery';
                                        redirectToServiceForm(selectedRoute.id, index, service.id, serviceType);
                                      }}
                                      className={`w-full mt-2 ${
                                        isPickup ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                                      }`}
                                    >
                                      {isPickup ? `Recoger de ${service.guestName}` : `Entregar a ${service.guestName}`}
                                    </Button>
                                  )}
                                  
                                  {service.observations && (
                                    <p className="text-xs text-gray-500 mt-2 italic">
                                      "{service.observations}"
                                    </p>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No hay servicios asignados a este hotel
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Content>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Routes;