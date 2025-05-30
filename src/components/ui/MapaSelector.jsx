import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Navigation } from 'lucide-react';

/**
 * MapaSelector - Componente que muestra un mapa para seleccionar una ubicación manualmente
 * 
 * @param {Object} props
 * @param {function} props.onSelectLocation - Función a llamar cuando se selecciona una ubicación
 * @param {function} props.onClose - Función a llamar cuando se cierra el mapa
 * @param {Object} props.initialCoordinates - Coordenadas iniciales para centrar el mapa (opcional)
 */
const MapaSelector = ({ onSelectLocation, onClose, initialCoordinates }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [direccion, setDireccion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  
  // Coordenadas iniciales centradas en Lima, Perú
  const initialCenter = initialCoordinates || { lat: -12.0464, lng: -77.0428 };
  
  // Cargar el script de Leaflet
  useEffect(() => {
    // Verificar si ya está cargado
    if (document.getElementById('leaflet-css') && document.getElementById('leaflet-js')) {
      initializeMap();
      return;
    }
    
    // Cargar CSS de Leaflet
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);
    
    // Cargar JS de Leaflet
    const script = document.createElement('script');
    script.id = 'leaflet-js';
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = initializeMap;
    document.body.appendChild(script);
    
    return () => {
      // No eliminamos los scripts porque otros componentes podrían necesitarlos
    };
  }, []);
  
  // Inicializar el mapa
  const initializeMap = () => {
    if (!mapRef.current || mapLoaded) return;
    
    try {
      // Esperar a que Leaflet esté disponible
      if (!window.L) {
        setTimeout(initializeMap, 100);
        return;
      }
      
      const L = window.L;
      
      // Inicializar mapa
      const map = L.map(mapRef.current).setView([initialCenter.lat, initialCenter.lng], 13);
      
      // Añadir capa de OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      // Añadir marcador inicial si hay coordenadas iniciales
      if (initialCenter.lat && initialCenter.lng) {
        markerRef.current = L.marker([initialCenter.lat, initialCenter.lng]).addTo(map);
        setSelectedLocation({
          lat: initialCenter.lat,
          lng: initialCenter.lng
        });
        obtenerDireccionDesdeCoords(initialCenter.lat, initialCenter.lng);
      }
      
      // Manejar clics en el mapa
      map.on('click', function(e) {
        const { lat, lng } = e.latlng;
        
        // Actualizar o crear marcador
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng]).addTo(map);
        }
        
        setSelectedLocation({ lat, lng });
        obtenerDireccionDesdeCoords(lat, lng);
      });
      
      setMapLoaded(true);
    } catch (err) {
      console.error("Error al inicializar el mapa:", err);
      setError("No se pudo cargar el mapa. Intente nuevamente.");
    }
  };
  
  // Obtener dirección desde coordenadas usando Nominatim (geocodificación inversa)
  const obtenerDireccionDesdeCoords = async (lat, lng) => {
    setCargando(true);
    setError('');
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'es',
            'User-Agent': 'FumyLimp-LavanderiaCApp'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener la dirección');
      }
      
      const data = await response.json();
      
      if (data && data.display_name) {
        // Verificar si está en Lima
        const isInLima = data.display_name.toLowerCase().includes('lima');
        
        if (isInLima) {
          setDireccion(data.display_name);
          setError('');
        } else {
          setDireccion(data.display_name);
          setError('Advertencia: Esta ubicación parece estar fuera de Lima Metropolitana');
        }
      } else {
        setDireccion('Dirección desconocida');
        setError('No se pudo determinar la dirección para esta ubicación');
      }
    } catch (err) {
      console.error('Error al obtener dirección:', err);
      setDireccion('Dirección desconocida');
      setError('Error al obtener la dirección. Intente seleccionar otro punto.');
    } finally {
      setCargando(false);
    }
  };
  
  // Manejar confirmación de ubicación
  const handleConfirmarUbicacion = () => {
    if (!selectedLocation) {
      setError('Por favor seleccione una ubicación en el mapa');
      return;
    }
    
    // Registrar las coordenadas en la consola pero no mostrarlas en la UI
    console.log(`Coordenadas GPS seleccionadas en mapa: ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`);
    
    onSelectLocation({
      direccion,
      coordenadas: selectedLocation
    });
    
    onClose();
  };
  
  // Usar mi ubicación actual
  const handleUbicacionActual = () => {
    if (!navigator.geolocation) {
      setError('Su navegador no soporta geolocalización');
      return;
    }
    
    setCargando(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Centrar el mapa en la ubicación actual
        if (window.L && mapRef.current) {
          const map = window.L.map(mapRef.current);
          map.setView([latitude, longitude], 16);
          
          // Actualizar o crear marcador
          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
          } else {
            markerRef.current = window.L.marker([latitude, longitude]).addTo(map);
          }
        }
        
        setSelectedLocation({ lat: latitude, lng: longitude });
        obtenerDireccionDesdeCoords(latitude, longitude);
        setCargando(false);
      },
      (err) => {
        console.error('Error al obtener ubicación:', err);
        setError('No se pudo obtener su ubicación actual. ' + err.message);
        setCargando(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Seleccionar ubicación en el mapa
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 flex-grow overflow-hidden">
          <div className="bg-gray-100 rounded-lg mb-4 flex items-center p-2">
            <Navigation className="h-5 w-5 text-gray-500 mr-2" />
            <p className="text-sm text-gray-600">
              Haga clic en el mapa para seleccionar una ubicación o use el botón "Mi ubicación actual"
            </p>
          </div>
          
          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
              <p className="text-amber-800 text-sm">{error}</p>
            </div>
          )}
          
          <div className="h-64 md:h-80 relative mb-4">
            <div 
              ref={mapRef} 
              className="absolute inset-0 rounded-md border border-gray-300"
              style={{ zIndex: 0 }}
            ></div>
            
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 rounded-md">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
                  <p className="mt-2 text-gray-700">Cargando mapa...</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 p-3 rounded-md mb-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Dirección seleccionada:</p>
            <p className="text-gray-900">{cargando ? 'Obteniendo dirección...' : (direccion || 'Ninguna ubicación seleccionada')}</p>
            
            {selectedLocation && (
              <p className="text-xs text-gray-500 mt-1">
                Ubicación registrada en el sistema
              </p>
            )}
          </div>
        </div>
        
        <div className="border-t p-4 flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={handleUbicacionActual}
            disabled={cargando}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Mi ubicación actual
          </button>
          
          <button
            type="button"
            onClick={handleConfirmarUbicacion}
            disabled={!selectedLocation || cargando}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Confirmar ubicación
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapaSelector;