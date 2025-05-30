import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import { serviceStorage, hotelStorage, storage } from '../utils/storage';
import { formatDate, getPriorityColor, sortServicesByPriority, getPickupStats, getServiceTypeColor, getServiceTypeText, isPickupService, isDeliveryService } from '../utils';
import { SERVICE_STATUS, USER_ROLES } from '../types';
// Mock data import removed
import { APP_CONFIG } from '../constants';
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadRoutesData();
  }, [selectedDate]);

  useEffect(() => {
    const handleRoutesUpdate = () => {
      loadRoutesData();
    };

    window.addEventListener('routesUpdated', handleRoutesUpdate);
    return () => window.removeEventListener('routesUpdated', handleRoutesUpdate);
  }, [selectedDate]);

  const loadRoutesData = () => {
    const allServices = serviceStorage.getServices();
    const allHotels = hotelStorage.getHotels();
    const existingRoutes = storage.get('PICKUP_ROUTES') || [];
    
    setServices(allServices);
    setHotels(allHotels);
    
    // Filter routes for selected date and user
    const filteredRoutes = existingRoutes.filter(route => {
      const routeDate = route.date;
      const matchesDate = routeDate === selectedDate;
      const matchesUser = isAdmin || route.repartidorId === user.id;
      return matchesDate && matchesUser;
    });

    // Assign route numbers to existing routes that don't have them
    const routesWithNumbers = filteredRoutes.map((route, index) => {
      if (!route.routeNumber) {
        return { ...route, routeNumber: index + 1 };
      }
      return route;
    });
    
    setRoutes(routesWithNumbers);
    
    // Set active route if exists
    const active = routesWithNumbers.find(r => r.status === 'en_progreso');
    setActiveRoute(active);
  };

  // Función para generar servicios adicionales
  const generateAdditionalPendingPickups = (hotels, repartidores) => {
    if (!hotels || !hotels.length || !repartidores || !repartidores.length) {
      return [];
    }
    
    const newServices = [];
    const today = new Date();
    
    // Crear 2-3 servicios por cada hotel
    hotels.forEach(hotel => {
      // Encontrar repartidores para esta zona
      const zoneRepartidores = repartidores.filter(rep => rep.zone === hotel.zone);
      
      // Si no hay repartidores para esta zona, usar el primer repartidor
      const availableRepartidores = zoneRepartidores.length > 0 ? zoneRepartidores : [repartidores[0]];
      
      // Crear 2-3 servicios para este hotel
      const numServices = Math.floor(Math.random() * 2) + 2; // 2-3 servicios
      
      for (let i = 1; i <= numServices; i++) {
        const randomRepartidor = availableRepartidores[Math.floor(Math.random() * availableRepartidores.length)];
        
        newServices.push({
          id: Date.now() + Math.floor(Math.random() * 1000) + i,
          hotelId: hotel.id,
          hotel: hotel.name,
          hotelZone: hotel.zone,
          guestName: `Cliente ${hotel.name} ${i}`,
          roomNumber: `${100 + i}`,
          status: SERVICE_STATUS.PENDING_PICKUP,
          bagCount: Math.floor(Math.random() * 3) + 1,
          weight: null, // Se llenará durante el recojo
          priority: Math.random() > 0.8 ? 'alta' : (Math.random() > 0.5 ? 'media' : 'normal'),
          timestamp: new Date(today.getTime() - Math.random() * 86400000).toISOString(),
          repartidorId: randomRepartidor.id,
          price: null // Se calculará después
        });
      }
    });
    
    return newServices;
  };
  
  // Función para inicializar datos modernos
  const initializeModernData = () => {
    try {
      // Limpiar datos existentes
      localStorage.clear();
      
      // Crear usuarios
      const users = [
        {
          id: "1",
          name: "Admin",
          email: "admin@fumylimp.com",
          password: "admin123",
          role: USER_ROLES.ADMIN,
          active: true
        },
        {
          id: "2",
          name: "Juan Repartidor",
          email: "juan@fumylimp.com",
          password: "repartidor123",
          role: USER_ROLES.REPARTIDOR,
          zone: "NORTE",
          active: true
        },
        {
          id: "3",
          name: "María Repartidor",
          email: "maria@fumylimp.com",
          password: "repartidor123",
          role: USER_ROLES.REPARTIDOR,
          zone: "SUR",
          active: true
        },
        {
          id: "4",
          name: "Carlos Repartidor",
          email: "carlos@fumylimp.com",
          password: "repartidor123",
          role: USER_ROLES.REPARTIDOR,
          zone: "ESTE",
          active: true
        }
      ];
      
      // Guardar usuarios
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.USERS, JSON.stringify(users));
      
      // Crear hoteles
      const hotels = [
        {
          id: "1",
          name: "Hotel Miraflores",
          address: "Av. Larco 345, Miraflores",
          zone: "SUR",
          contactPerson: "Jorge Mendoza",
          phone: "+51 987654321",
          email: "reservas@hotelmiraflores.com",
          bagInventory: 25,
          pricePerKg: 8.5
        },
        {
          id: "2",
          name: "Hotel San Isidro",
          address: "Calle Las Flores 123, San Isidro",
          zone: "SUR",
          contactPerson: "Ana Rodríguez",
          phone: "+51 987654322",
          email: "reservas@hotelsanisidro.com",
          bagInventory: 30,
          pricePerKg: 9.0
        },
        {
          id: "3",
          name: "Hotel Los Olivos",
          address: "Av. Universitaria 789, Los Olivos",
          zone: "NORTE",
          contactPerson: "Pedro Suárez",
          phone: "+51 987654323",
          email: "reservas@hotellosolivos.com",
          bagInventory: 20,
          pricePerKg: 7.5
        },
        {
          id: "4",
          name: "Hotel San Miguel",
          address: "Av. La Marina 456, San Miguel",
          zone: "OESTE",
          contactPerson: "Lucía Torres",
          phone: "+51 987654324",
          email: "reservas@hotelsanmiguel.com",
          bagInventory: 15,
          pricePerKg: 8.0
        }
      ];
      
      // Guardar hoteles
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.HOTELS, JSON.stringify(hotels));
      
      // Crear servicios
      const services = [];
      const today = new Date();
      
      // Función para crear un servicio
      const createService = (hotelId, guestName, roomNumber, status, repartidorId = null) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        return {
          id: id.toString(),
          hotelId: hotelId,
          hotel: hotels.find(h => h.id === hotelId).name,
          hotelZone: hotels.find(h => h.id === hotelId).zone,
          guestName: guestName,
          roomNumber: roomNumber,
          status: status,
          bagCount: Math.floor(Math.random() * 3) + 1,
          weight: ((Math.random() * 5) + 1).toFixed(1),
          priority: Math.random() > 0.8 ? 'alta' : (Math.random() > 0.5 ? 'media' : 'normal'),
          timestamp: new Date(today.getTime() - Math.random() * 86400000 * 3).toISOString(),
          repartidorId: repartidorId,
          price: Math.floor(Math.random() * 100) + 50
        };
      };
      
      // Crear servicios pendientes para cada zona
      // Norte (Los Olivos)
      for (let i = 1; i <= 5; i++) {
        services.push(createService("3", `Cliente Norte ${i}`, `${100 + i}`, SERVICE_STATUS.PENDING_PICKUP, "2"));
      }
      
      // Sur (Miraflores y San Isidro)
      for (let i = 1; i <= 3; i++) {
        services.push(createService("1", `Cliente Sur ${i}`, `${200 + i}`, SERVICE_STATUS.PENDING_PICKUP, "3"));
      }
      for (let i = 1; i <= 2; i++) {
        services.push(createService("2", `Cliente Sur B ${i}`, `${300 + i}`, SERVICE_STATUS.PENDING_PICKUP, "3"));
      }
      
      // Oeste (San Miguel)
      for (let i = 1; i <= 4; i++) {
        services.push(createService("4", `Cliente Oeste ${i}`, `${400 + i}`, SERVICE_STATUS.PENDING_PICKUP, "4"));
      }
      
      // Guardar servicios
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.SERVICES, JSON.stringify(services));
      
      // Crear etiquetas de bolsa
      const bagLabels = [];
      
      // Contar servicios creados y etiquetas
      return {
        services: services.length,
        bagLabels: bagLabels.length,
        transactions: 0
      };
    } catch (error) {
      console.error("Error al inicializar datos modernos:", error);
      return {
        services: 0,
        bagLabels: 0,
        transactions: 0
      };
    }
  };
  
  const generateOptimizedRoute = async () => {
    setLoading(true);
    
    try {
      // Check if routes already exist for today
      const existingRoutes = storage.get('PICKUP_ROUTES') || [];
      const routesForToday = existingRoutes.filter(r => r.date === selectedDate);
      
      if (routesForToday.length > 0) {
        error('Rutas Existentes', `Ya existen ${routesForToday.length} rutas para la fecha ${selectedDate}. Usa el botón "Limpiar Rutas del Día" si quieres regenerar.`);
        setLoading(false);
        return;
      }
      
      // Get services for mixed routes - pickups and deliveries
      const servicesForRoutes = services.filter(s => 
        (s.status === SERVICE_STATUS.PENDING_PICKUP || 
         s.status === SERVICE_STATUS.READY_FOR_DELIVERY ||
         s.status === SERVICE_STATUS.PARTIAL_DELIVERY ||
         s.status === SERVICE_STATUS.COMPLETED) && 
        (s.repartidorId || s.deliveryRepartidorId) // Services assigned to a repartidor for pickup or delivery
      );

      // Validate hotel IDs in services for routes
      const invalidServices = servicesForRoutes.filter(service => {
        return !hotels.find(h => h.id === service.hotelId);
      });
      
      console.log('Debug route generation:', {
        totalServices: services.length,
        pendingServices: services.filter(s => s.status === SERVICE_STATUS.PENDING_PICKUP).length,
        deliveryServices: services.filter(s => s.status === SERVICE_STATUS.READY_FOR_DELIVERY).length,
        assignedServices: servicesForRoutes.length,
        invalidServices: invalidServices.length,
        availableHotels: hotels.map(h => ({ id: h.id, name: h.name })),
        servicesForRoutes: servicesForRoutes.map(p => ({ id: p.id, repartidorId: p.repartidorId, hotel: p.hotel, hotelId: p.hotelId, status: p.status, hotelExists: !!hotels.find(h => h.id === p.hotelId) }))
      });
      
      // If there are invalid services, regenerate
      if (invalidServices.length > 0) {
        console.warn(`Found ${invalidServices.length} services with invalid hotel IDs. Regenerating...`);
        // Clear and regenerate
        serviceStorage.setServices([]);
        
        const allRepartidores = isAdmin ? 
          JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USERS) || '[]').filter(u => u.role === USER_ROLES.REPARTIDOR) :
          [user];
        
        const newPendingPickups = generateAdditionalPendingPickups(hotels, allRepartidores);
        
        if (newPendingPickups.length > 0) {
          serviceStorage.setServices(newPendingPickups);
          loadRoutesData();
          success('Datos Corregidos', `Se corrigieron servicios con hoteles inválidos y se regeneraron ${newPendingPickups.length} nuevos`);
          setLoading(false);
          return;
        }
      }

      if (servicesForRoutes.length === 0) {
        // Reset corrupted data and regenerate everything fresh
        console.log('No valid services for routes found. Resetting and regenerating data...');
        
        // Clear existing services with hotel ID mismatches
        serviceStorage.setServices([]);
        
        console.log('No valid services for routes found. Regenerating with modern data...');
        
        // Clear all data and regenerate with modern system
        localStorage.clear();
        const result = initializeModernData();
        
        if (result.services > 0) {
          // Reload data and try again
          loadRoutesData();
          success('Sistema Regenerado', `Datos modernos: ${result.services} servicios, ${result.bagLabels} rótulos, ${result.transactions} transacciones`);
          setLoading(false);
          return;
        }
        
        error('Sin Hoteles', 'No se pudieron generar servicios. Verifica que existan hoteles.', { persistent: false });
        setLoading(false);
        return;
      }

      // Group by repartidor (what matters for route generation)
      const repartidorGroups = {};
      servicesForRoutes.forEach(service => {
        // Use pickup repartidor for pickups, delivery repartidor for deliveries
        const repartidorId = service.repartidorId || service.deliveryRepartidorId;
        if (!repartidorGroups[repartidorId]) {
          repartidorGroups[repartidorId] = [];
        }
        repartidorGroups[repartidorId].push(service);
      });

      console.log('Repartidor groups:', repartidorGroups);

      if (Object.keys(repartidorGroups).length === 0) {
        throw new Error('No repartidor groups found');
      }

      // Create routes per repartidor
      const newRoutes = [];
      const allStoredRoutes = storage.get('PICKUP_ROUTES') || [];
      const existingRoutesForDate = allStoredRoutes.filter(r => r.date === selectedDate);
      let routeCounter = existingRoutesForDate.length + 1;

      // Get all users for repartidor name lookup
      const allUsers = JSON.parse(localStorage.getItem(APP_CONFIG.STORAGE_KEYS.USERS) || '[]');

      Object.entries(repartidorGroups).forEach(([repartidorId, repartidorServices]) => {
        const repartidor = allUsers.find(u => u.id === repartidorId);
        
        // Group this repartidor's services by hotel for optimization
        const hotelGroups = {};
        repartidorServices.forEach(service => {
          const hotelId = service.hotelId;
          if (!hotelGroups[hotelId]) {
            hotelGroups[hotelId] = {
              pickups: [],
              deliveries: []
            };
          }
          
          // Separate pickups and deliveries based on status
          if (service.status === SERVICE_STATUS.PENDING_PICKUP) {
            hotelGroups[hotelId].pickups.push(service);
          } else if (service.status === SERVICE_STATUS.READY_FOR_DELIVERY ||
                     service.status === SERVICE_STATUS.PARTIAL_DELIVERY ||
                     service.status === SERVICE_STATUS.COMPLETED) {
            hotelGroups[hotelId].deliveries.push(service);
          }
        });

        // Sort hotels by priority (highest priority first)
        const optimizedHotels = Object.entries(hotelGroups)
          .map(([hotelId, services]) => {
            const hotel = hotels.find(h => h.id === hotelId);
            
            // Skip if hotel not found
            if (!hotel) {
              console.warn(`Hotel with id ${hotelId} not found. Skipping services:`, services);
              return null;
            }
            
            const sortedPickups = sortServicesByPriority(services.pickups);
            const sortedDeliveries = sortServicesByPriority(services.deliveries);
            const allServices = [...services.pickups, ...services.deliveries];
            const maxPriority = allServices.length > 0 ? Math.max(...allServices.map(p => 
              p.priority === 'alta' ? 3 : p.priority === 'media' ? 2 : 1
            )) : 1;
            
            return {
              hotel,
              pickups: sortedPickups,
              deliveries: sortedDeliveries,
              priority: maxPriority,
              estimatedTime: 45 // minutes per hotel
            };
          })
          .filter(item => item !== null) // Remove null entries
          .sort((a, b) => b.priority - a.priority);

        // Skip this repartidor if no valid hotels found
        if (optimizedHotels.length === 0) {
          console.warn(`No valid hotels found for repartidor ${repartidor?.name}. Skipping route creation.`);
          return;
        }

        // Generate route ID
        const routeId = `${selectedDate.replace(/-/g, '')}${routeCounter.toString().padStart(2, '0')}`;

        // Create route for this repartidor
        const totalServices = repartidorServices.length;
        const totalPickups = repartidorServices.filter(s => s.status === SERVICE_STATUS.PENDING_PICKUP).length;
        const totalDeliveries = repartidorServices.filter(s => 
          s.status === SERVICE_STATUS.READY_FOR_DELIVERY ||
          s.status === SERVICE_STATUS.PARTIAL_DELIVERY ||
          s.status === SERVICE_STATUS.COMPLETED
        ).length;
        
        const newRoute = {
          id: routeId,
          routeNumber: routeCounter,
          repartidorId: repartidorId,
          repartidorName: repartidor?.name || 'Repartidor Desconocido',
          date: selectedDate,
          status: 'pendiente',
          estimatedDuration: optimizedHotels.length * 45,
          totalServices: totalServices,
          totalPickups: totalPickups,
          totalDeliveries: totalDeliveries,
          hotels: optimizedHotels.map((item, index) => ({
            hotelId: item.hotel.id,
            hotelName: item.hotel.name,
            hotelAddress: item.hotel.address,
            pickups: item.pickups,
            deliveries: item.deliveries,
            services: [...item.pickups, ...item.deliveries], // Combined for compatibility
            estimatedTime: `${9 + index}:00`, // Starting at 9 AM
            priority: item.priority,
            completed: false,
            timeSpent: 0
          })),
          createdAt: new Date().toISOString(),
          startTime: null,
          endTime: null
        };

        newRoutes.push(newRoute);
        routeCounter++;
      });

      if (newRoutes.length === 0) {
        error('Sin Rutas', 'No se pudieron crear rutas. Verifica que existan hoteles válidos para los servicios pendientes.');
        return;
      }

      // Save all new routes
      const updatedRoutes = [...allStoredRoutes, ...newRoutes];
      storage.set('PICKUP_ROUTES', updatedRoutes);
      
      setRoutes(prev => [...prev, ...newRoutes]);
      console.log('Generated routes:', newRoutes);
      const totalPickupsGenerated = servicesForRoutes.filter(s => s.status === SERVICE_STATUS.PENDING_PICKUP).length;
      const totalDeliveriesGenerated = servicesForRoutes.filter(s => 
        s.status === SERVICE_STATUS.READY_FOR_DELIVERY ||
        s.status === SERVICE_STATUS.PARTIAL_DELIVERY ||
        s.status === SERVICE_STATUS.COMPLETED
      ).length;
      success('Rutas Mixtas Generadas', `${newRoutes.length} rutas optimizadas: ${totalPickupsGenerated} recojos + ${totalDeliveriesGenerated} entregas`);
      
    } catch (err) {
      console.error('Error generating route:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        pendingPickupsLength: services.filter(s => s.status === SERVICE_STATUS.PENDING_PICKUP).length,
        servicesLength: services.length,
        hotelsLength: hotels.length
      });
      error('Error', `No se pudo generar la ruta optimizada: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearTodayRoutes = () => {
    const existingRoutes = storage.get('PICKUP_ROUTES') || [];
    const routesNotToday = existingRoutes.filter(r => r.date !== selectedDate);
    
    storage.set('PICKUP_ROUTES', routesNotToday);
    setRoutes([]);
    
    success('Rutas Eliminadas', `Se eliminaron todas las rutas del ${selectedDate}`);
  };

  const startRoute = (routeId) => {
    setLoading(true);
    
    const updatedRoutes = routes.map(route => {
      if (route.id === routeId) {
        return {
          ...route,
          status: 'en_progreso',
          startTime: new Date().toISOString()
        };
      }
      return route;
    });
    
    setRoutes(updatedRoutes);
    setActiveRoute(updatedRoutes.find(r => r.id === routeId));
    
    // Update storage
    const allRoutes = storage.get('PICKUP_ROUTES') || [];
    const updated = allRoutes.map(r => 
      r.id === routeId ? updatedRoutes.find(ur => ur.id === routeId) : r
    );
    storage.set('PICKUP_ROUTES', updated);
    
    success('Ruta Iniciada', 'La ruta ha sido iniciada correctamente');
    setLoading(false);
  };

  const redirectToServiceForm = (routeId, hotelIndex, serviceId, serviceType) => {
    const route = routes.find(r => r.id === routeId);
    const hotel = route?.hotels[hotelIndex];
    
    if (!hotel) return;

    // Find the specific service
    const service = hotel.services?.find(s => s.id === serviceId);

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
          hotelIndex: hotelIndex
        }
      });
    } else if (serviceType === 'delivery') {
      // Navigate to delivery page
      navigate('/delivery', {
        state: {
          selectedServiceId: serviceId,
          returnTo: '/routes',
          routeId: routeId,
          hotelIndex: hotelIndex
        }
      });
    }
  };

  const resetDemoDataSafely = () => {
    const confirmed = window.confirm(
      '⚠️ ADVERTENCIA: Esto eliminará TODOS los servicios y rutas.\n\n' +
      'Se regenerarán datos de demostración automáticamente.\n\n' +
      '¿Estás seguro de continuar?'
    );

    if (!confirmed) return;

    try {
      // Clear all data
      serviceStorage.setServices([]);
      storage.remove('PICKUP_ROUTES');
      storage.remove('DELIVERY_METRICS');
      
      // Clear audit log as well
      storage.remove(APP_CONFIG.STORAGE_KEYS.AUDIT_LOG);
      
      // Regenerate demo data automatically
      initializeModernData();

      // Reload local state without page refresh
      loadRoutesData();

      success(
        'Demo Reseteado',
        'Todos los datos fueron eliminados y regenerados exitosamente'
      );

    } catch (error) {
      console.error('Error resetting demo data:', error);
      error('Error', 'No se pudo resetear los datos. Intenta recargar la página.');
    }
  };

  const RouteCard = ({ route }) => {
    const isActive = activeRoute?.id === route.id;
    const canManageRoute = isAdmin || route.repartidorId === user.id;
    const completedStops = route.hotels.filter(h => h.completed).length;
    const progress = (completedStops / route.hotels.length) * 100;
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
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              route.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
              route.status === 'en_progreso' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {route.status === 'pendiente' ? 'Pendiente' :
               route.status === 'en_progreso' ? 'En Progreso' : 'Completada'}
            </span>
          </div>
        </Card.Header>
        
        <Card.Content>
          <div className="space-y-4">
            {/* Route Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">{route.totalPickups || 0}</p>
                <p className="text-xs text-gray-600">Recojos</p>
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
              {route.hotels.map((hotel, index) => (
                <div key={`${route.id}-hotel-${hotel.hotelId}-${index}`} className={`flex items-center justify-between p-2 rounded border ${
                  hotel.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center">
                    {hotel.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{hotel.hotelName}</p>
                      <p className="text-xs text-gray-600">
                        {hotel.pickups?.length || 0} recojos • {hotel.deliveries?.length || 0} entregas • {hotel.estimatedTime}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {hotel.pickups?.length > 0 && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded border-blue-200">
                            {hotel.pickups.length} Recojos
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
                  {!isAdmin && route.repartidorId === user.id && route.status === 'en_progreso' && !hotel.completed && (
                    <div className="space-y-2">
                      {/* Individual service buttons */}
                      {hotel.pickups?.map((pickup, pickupIndex) => (
                        pickup.status === SERVICE_STATUS.PENDING_PICKUP && (
                          <Button
                            key={`pickup-${pickup.id}`}
                            size="sm"
                            onClick={() => redirectToServiceForm(route.id, index, pickup.id, 'pickup')}
                            className="w-full"
                          >
                            Recoger: {pickup.guestName}
                          </Button>
                        )
                      ))}
                      {hotel.deliveries?.map((delivery, deliveryIndex) => (
                        (delivery.status === SERVICE_STATUS.PARTIAL_DELIVERY || 
                         delivery.status === SERVICE_STATUS.COMPLETED ||
                         delivery.status === SERVICE_STATUS.READY_FOR_DELIVERY) && (
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
              ))}
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
              
              {route.status === 'pendiente' && !isAdmin && route.repartidorId === user.id && (
                <Button
                  onClick={() => startRoute(route.id)}
                  disabled={loading}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Ruta
                </Button>
              )}
              
              {route.status === 'en_progreso' && (
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled
                >
                  <Pause className="h-4 w-4 mr-2" />
                  En Progreso
                </Button>
              )}
              
              {route.status === 'completada' && (
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Completada
                </Button>
              )}
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
          <Button
            onClick={generateOptimizedRoute}
            disabled={loading}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Generar Ruta
          </Button>
          
          {routes.length > 0 && (
            <Button
              variant="outline"
              size="xs"
              onClick={clearTodayRoutes}
              className="text-red-600 border-red-600 hover:bg-red-50 px-2 py-1 text-sm leading-tight"
            >
              <span className="text-center">
                Limpiar Rutas<br />del Día
              </span>
            </Button>
          )}
          
          {/* Reset demo button removed */}
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
              Resumen del {new Date(selectedDate).toLocaleDateString('es-PE')}
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
                    .reduce((avg, r, _, arr) => avg + r.efficiency / arr.length, 0).toFixed(0)}%
                </p>
                <p className="text-sm text-gray-600">Eficiencia Promedio</p>
              </div>
              
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {routes.filter(r => r.date === selectedDate && r.totalDistance)
                    .reduce((sum, r) => sum + parseFloat(r.totalDistance), 0).toFixed(1)} km
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
          Rutas del {new Date(selectedDate).toLocaleDateString('es-PE')}
        </h2>
        
        {routes.length === 0 ? (
          <Card>
            <Card.Content className="p-8 text-center">
              <Route className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay rutas para esta fecha
              </h3>
              <p className="text-gray-600 mb-4">
                Genera una ruta optimizada para organizar los recojos del día
              </p>
              <Button onClick={generateOptimizedRoute} disabled={loading}>
                <Navigation className="h-4 w-4 mr-2" />
                Generar Primera Ruta
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {routes.map(route => (
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
                        <span className="font-medium">{new Date(selectedRoute.date).toLocaleDateString('es-PE')}</span>
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
                            hotel.services.map((service, serviceIndex) => {
                              const isPickup = service.status === SERVICE_STATUS.PENDING_PICKUP;
                              const isDelivery = service.status === SERVICE_STATUS.PARTIAL_DELIVERY || 
                                               service.status === SERVICE_STATUS.COMPLETED ||
                                               service.status === SERVICE_STATUS.READY_FOR_DELIVERY;
                              const isCompleted = service.status === SERVICE_STATUS.PICKED_UP || 
                                                 service.status === SERVICE_STATUS.DELIVERED;
                              
                              return (
                                <div 
                                  key={service.id} 
                                  className={`p-3 rounded border ${
                                    isCompleted ? 'bg-gray-50 border-gray-300' :
                                    isPickup ? 'bg-blue-50 border-blue-200' : 
                                    'bg-green-50 border-green-200'
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      <h6 className="font-medium text-sm">
                                        {service.guestName} - Hab. {service.roomNumber}
                                      </h6>
                                      <p className="text-xs text-gray-600">
                                        {service.bagCount} bolsas • {service.weight}kg
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
                                        {isCompleted ? 'COMPLETADO' :
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