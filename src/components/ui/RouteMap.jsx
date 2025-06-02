import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Clock, AlertTriangle } from 'lucide-react';
import routeService from '../../services/route.service';
import Card from './Card';

const RouteMap = ({ route: initialRoute, routeId, hotels }) => {
  const [route, setRoute] = useState(initialRoute);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // If route is already provided, use it
    if (initialRoute && initialRoute.hotels) {
      setRoute(initialRoute);
      return;
    }
    
    // If routeId is provided but no route, fetch it
    if (routeId && !initialRoute) {
      fetchRouteById(routeId);
    }
  }, [initialRoute, routeId]);
  
  const fetchRouteById = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedRoute = await routeService.getRouteById(id);
      setRoute(fetchedRoute);
    } catch (err) {
      console.error('Error fetching route:', err);
      setError('No se pudo cargar la ruta. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Card>
        <Card.Content className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando ruta...</p>
        </Card.Content>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <Card.Content className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
        </Card.Content>
      </Card>
    );
  }
  
  if (!route || !route.hotels) return null;

  const getStatusColor = (completed) => {
    return completed ? 'text-green-600 bg-green-100' : 'text-blue-600 bg-blue-100';
  };

  const totalDistance = route.hotels.length * 5.2; // Simulate ~5.2km average between hotels
  const totalTime = route.hotels.reduce((sum, hotel) => sum + (hotel.timeSpent || 45), 0);

  return (
    <Card>
      <Card.Header>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Navigation className="h-5 w-5 mr-2 text-blue-600" />
          Mapa de Ruta
        </h3>
      </Card.Header>
      <Card.Content>
        <div className="space-y-6">
          {/* Route Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600">Distancia Total</p>
              <p className="text-lg font-bold text-blue-600">
                {route.totalDistance || totalDistance.toFixed(1)} km
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Tiempo Total</p>
              <p className="text-lg font-bold text-green-600">
                {route.actualDuration ? 
                  `${Math.floor(route.actualDuration / 60)}h ${route.actualDuration % 60}m` :
                  `${Math.floor(totalTime / 60)}h ${totalTime % 60}m`
                }
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Paradas</p>
              <p className="text-lg font-bold text-purple-600">{route.hotels.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Eficiencia</p>
              <p className="text-lg font-bold text-orange-600">
                {route.efficiency ? `${route.efficiency}%` : 'N/A'}
              </p>
            </div>
          </div>

          {/* Additional Route Info */}
          {(route.weatherConditions || route.trafficConditions || route.fuelCost) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
              {route.weatherConditions && (
                <div className="text-center">
                  <p className="text-sm text-blue-600">Clima</p>
                  <p className="font-medium text-blue-900">{route.weatherConditions}</p>
                </div>
              )}
              {route.trafficConditions && (
                <div className="text-center">
                  <p className="text-sm text-blue-600">Tráfico</p>
                  <p className="font-medium text-blue-900">{route.trafficConditions}</p>
                </div>
              )}
              {route.fuelCost && (
                <div className="text-center">
                  <p className="text-sm text-blue-600">Combustible</p>
                  <p className="font-medium text-blue-900">S/ {route.fuelCost}</p>
                </div>
              )}
            </div>
          )}

          {/* Simulated Map */}
          <div className="relative bg-gray-100 rounded-lg p-6 min-h-[300px]">
            <div className="absolute inset-4 bg-blue-50 rounded border-2 border-dashed border-blue-200 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-blue-400 mx-auto mb-2" />
                <p className="text-blue-600 font-medium">Mapa Interactivo</p>
                <p className="text-blue-500 text-sm">Vista de ruta optimizada</p>
              </div>
            </div>

            {/* Route Points Simulation */}
            <div className="absolute top-8 left-8">
              <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Inicio</span>
              </div>
            </div>

            <div className="absolute bottom-8 right-8">
              <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium">Fin</span>
              </div>
            </div>

            {/* Intermediate points */}
            {route.hotels.slice(0, 3).map((hotel, index) => (
              <div
                key={index}
                className={`absolute bg-white px-2 py-1 rounded shadow-sm text-xs ${
                  index === 0 ? 'top-16 left-20' :
                  index === 1 ? 'top-24 right-20' :
                  'bottom-16 left-16'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    hotel.completed ? 'bg-green-500' : 'bg-blue-500'
                  }`}></div>
                  <span>{hotel.hotelName.substring(0, 15)}...</span>
                </div>
              </div>
            ))}
          </div>

          {/* Route Timeline */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Cronograma de Ruta</h4>
            <div className="space-y-2">
              {route.hotels.map((hotel, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                    hotel.completed ? 'bg-green-500' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{hotel.hotelName}</p>
                        <p className="text-sm text-gray-600">{hotel.hotelAddress}</p>
                        <p className="text-xs text-gray-500">
                          {hotel.pickups.length} recojo{hotel.pickups.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>{hotel.estimatedTime}</span>
                        </div>
                        {hotel.completed && hotel.completedAt && (
                          <div className="text-xs text-green-600 mt-1">
                            <p>Completado: {new Date(hotel.completedAt).toLocaleTimeString('es-PE', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</p>
                            {hotel.timeSpent && (
                              <p>Duración: {hotel.timeSpent} min</p>
                            )}
                          </div>
                        )}
                        {hotel.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            "{hotel.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(hotel.completed)}`}>
                    {hotel.completed ? 'Completado' : 'Pendiente'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Route Issues */}
          {route.issues && route.issues.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
              <h4 className="font-medium text-red-900 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Incidencias de la Ruta
              </h4>
              <ul className="text-sm text-red-800 space-y-2">
                {route.issues.map((issue, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Performance Metrics */}
          {route.status === 'completada' && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-3">Métricas de Rendimiento</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {route.efficiency && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{route.efficiency}%</p>
                    <p className="text-xs text-green-700">Eficiencia</p>
                  </div>
                )}
                {route.customerSatisfaction && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{route.customerSatisfaction}%</p>
                    <p className="text-xs text-blue-700">Satisfacción</p>
                  </div>
                )}
                {route.actualDuration && route.estimatedDuration && (
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${
                      route.actualDuration <= route.estimatedDuration ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {route.actualDuration <= route.estimatedDuration ? '✓' : '⚠'}
                    </p>
                    <p className="text-xs text-gray-700">Tiempo</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Route Notes */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Notas de la Ruta</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Ruta optimizada por proximidad geográfica</li>
              <li>• Prioridad alta marcada para atención inmediata</li>
              <li>• Tiempo estimado incluye recojo y documentación</li>
              <li>• Contactar con recepción en caso de demoras</li>
              {route.type === 'delivery' && (
                <li>• Ruta de entrega - horario vespertino</li>
              )}
            </ul>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
};

export default RouteMap;