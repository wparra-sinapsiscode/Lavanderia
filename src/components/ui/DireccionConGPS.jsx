import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '../../store/NotificationContext';
import { MapPin, Search, X } from 'lucide-react';
import MapaSelector from './MapaSelector';
import geocodeService from '../../services/geocode.service';

/**
 * DireccionConGPS - Componente para autocompletar direcciones y obtener coordenadas GPS
 * 
 * @param {Object} props
 * @param {string} props.initialValue - Valor inicial del campo de dirección
 * @param {function} props.onChange - Función a llamar cuando cambia la dirección o las coordenadas
 * @param {function} props.onValidChange - Función a llamar cuando la validación cambia
 * @param {function} props.onZoneChange - Función a llamar cuando se detecta la zona
 * @param {boolean} props.required - Indica si el campo es obligatorio
 * @param {string} props.label - Etiqueta para el campo
 * @param {string} props.placeholder - Placeholder para el campo
 * @param {string} props.className - Clases adicionales para el componente
 * @param {string} props.defaultZone - Zona por defecto si no se puede determinar
 */
const DireccionConGPS = ({
  initialValue = '',
  onChange,
  onValidChange,
  onZoneChange,
  required = false,
  label = 'Dirección',
  placeholder = 'Ingrese la dirección',
  className = '',
  defaultZone = 'CENTRO',
}) => {
  const [direccion, setDireccion] = useState(initialValue);
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [coordenadas, setCoordenadas] = useState({ lat: null, lng: null });
  const [direccionValida, setDireccionValida] = useState(!!initialValue);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  
  const timeoutRef = useRef(null);
  const sugerenciasRef = useRef(null);
  const { showNotification } = useNotifications();

  // Efecto para manejar clics fuera del componente de sugerencias
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sugerenciasRef.current && !sugerenciasRef.current.contains(event.target)) {
        setMostrarSugerencias(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Efecto para notificar cambios en coordenadas y validez
  useEffect(() => {
    if (onChange) {
      onChange({
        direccion,
        coordenadas,
      });
    }
    
    if (onValidChange) {
      onValidChange(direccionValida);
    }
    
    // Registrar coordenadas en consola pero no mostrarlas en UI
    if (direccionValida && coordenadas.lat && coordenadas.lng) {
      console.log(`Coordenadas GPS: ${coordenadas.lat.toFixed(6)}, ${coordenadas.lng.toFixed(6)}`);
    }
  }, [direccion, coordenadas, direccionValida, onChange, onValidChange]);

  // Función para buscar sugerencias de direcciones usando nuestro servicio
  const buscarSugerencias = async (texto) => {
    if (!texto || texto.length < 3) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      return;
    }

    setCargando(true);
    setError('');
    
    try {
      // Usamos nuestro servicio de geocodificación
      const data = await geocodeService.searchAddresses(texto, 5);
      
      setSugerencias(data);
      setMostrarSugerencias(true);
    } catch (err) {
      console.error('Error al buscar direcciones:', err);
      setError('Error al buscar direcciones. Intente nuevamente.');
      showNotification('Error al buscar direcciones. Intente nuevamente.', 'error');
    } finally {
      setCargando(false);
    }
  };

  // Manejador para cambios en el campo de dirección
  const handleDireccionChange = (e) => {
    const valor = e.target.value;
    setDireccion(valor);
    
    // Limpiar timeout anterior para evitar múltiples llamadas
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Si el campo está vacío, restablecer todo
    if (!valor) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      setCoordenadas({ lat: null, lng: null });
      setDireccionValida(false);
      return;
    }
    
    // Si el usuario modifica una dirección que ya estaba validada, 
    // invalidarla para que deba validarse nuevamente
    if (direccionValida && valor !== direccion) {
      setDireccionValida(false);
      setCoordenadas({ lat: null, lng: null });
    }
    
    // Esperar 500ms después del último keypress para buscar
    timeoutRef.current = setTimeout(() => {
      buscarSugerencias(valor);
    }, 500);
  };

  // Manejador para selección de una sugerencia
  const handleSeleccionarSugerencia = (sugerencia) => {
    // Verificar que la dirección está realmente en Lima
    const isInLima = sugerencia.display_name.toLowerCase().includes('lima');
    
    if (!isInLima) {
      setError('La dirección debe estar en Lima Metropolitana.');
      showNotification('La dirección debe estar en Lima Metropolitana.', 'warning');
      return;
    }
    
    const direccionCompleta = sugerencia.display_name;
    
    // Determinar la zona de Lima
    const zona = geocodeService.determinarZona(direccionCompleta);
    
    setDireccion(direccionCompleta);
    setCoordenadas({
      lat: parseFloat(sugerencia.lat),
      lng: parseFloat(sugerencia.lon)
    });
    setMostrarSugerencias(false);
    setDireccionValida(true);
    
    // Notificar la zona detectada
    if (onZoneChange) {
      onZoneChange(zona);
    }
  };

  // Validar manualmente la dirección actual (si se escribe manualmente)
  const validarDireccion = async () => {
    if (!direccion) {
      setDireccionValida(false);
      return;
    }
    
    setCargando(true);
    setError('');
    
    try {
      // Usar nuestro servicio de geocodificación
      const data = await geocodeService.searchAddresses(direccion, 1);
      
      if (data && data.length > 0) {
        // Verificar que la dirección está realmente en Lima
        const isInLima = data[0].display_name.toLowerCase().includes('lima');
        
        if (isInLima) {
          const direccionCompleta = data[0].display_name;
          
          // Determinar la zona de Lima
          const zona = geocodeService.determinarZona(direccionCompleta);
          
          // Actualizar coordenadas
          setCoordenadas({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
          });
          
          setDireccionValida(true);
          showNotification('Dirección validada correctamente', 'success');
          
          // Notificar la zona detectada
          if (onZoneChange) {
            onZoneChange(zona);
          }
        } else {
          setCoordenadas({ lat: null, lng: null });
          setDireccionValida(false);
          setError('La dirección debe estar en Lima Metropolitana.');
          showNotification('La dirección debe estar en Lima Metropolitana.', 'warning');
        }
      } else {
        setCoordenadas({ lat: null, lng: null });
        setDireccionValida(false);
        setError('No se pudo validar la dirección. Intente ser más específico.');
        showNotification('No se pudo validar la dirección. Intente ser más específico.', 'warning');
      }
    } catch (err) {
      console.error('Error al validar dirección:', err);
      setError('Error al validar la dirección. Intente nuevamente.');
      showNotification('Error al validar la dirección. Intente nuevamente.', 'error');
      setDireccionValida(false);
    } finally {
      setCargando(false);
    }
  };
  
  // Manejar selección de ubicación desde el mapa
  const handleSeleccionUbicacionMapa = (ubicacion) => {
    if (ubicacion && ubicacion.direccion && ubicacion.coordenadas) {
      const direccionCompleta = ubicacion.direccion;
      
      // Determinar la zona de Lima
      const zona = geocodeService.determinarZona(direccionCompleta);
      
      setDireccion(direccionCompleta);
      setCoordenadas(ubicacion.coordenadas);
      setDireccionValida(true);
      showNotification('Ubicación seleccionada correctamente', 'success');
      
      // Notificar el cambio
      if (onChange) {
        onChange({
          direccion: direccionCompleta,
          coordenadas: ubicacion.coordenadas
        });
      }
      
      // Notificar la zona detectada
      if (onZoneChange) {
        onZoneChange(zona);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="flex flex-col space-y-2">
        <div className="flex">
          <div className="relative w-full">
            <input
              type="text"
              value={direccion}
              onChange={handleDireccionChange}
              onBlur={() => {
                // Dar tiempo para que se pueda hacer clic en una sugerencia
                setTimeout(() => {
                  if (mostrarSugerencias) {
                    setMostrarSugerencias(false);
                  }
                }, 200);
              }}
              onFocus={() => {
                if (sugerencias.length > 0) {
                  setMostrarSugerencias(true);
                }
              }}
              placeholder={placeholder}
              readOnly={direccionValida}
              className={`block w-full px-3 py-2 border ${
                error ? 'border-red-500' : direccionValida ? 'border-green-500' : 'border-gray-300'
              } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                direccionValida ? 'bg-gray-50' : ''
              }`}
            />
            {direccionValida && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button 
                  type="button"
                  onClick={() => {
                    setDireccion('');
                    setCoordenadas({ lat: null, lng: null });
                    setDireccionValida(false);
                    
                    if (onChange) {
                      onChange({
                        direccion: '',
                        coordenadas: { lat: null, lng: null }
                      });
                    }
                    
                    if (onZoneChange) {
                      onZoneChange(defaultZone);
                    }
                  }}
                  className="text-gray-400 hover:text-red-500 focus:outline-none"
                  title="Borrar y empezar de nuevo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={validarDireccion}
            disabled={cargando || !direccion || direccionValida}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            title={direccionValida ? "La dirección ya está validada" : "Validar esta dirección"}
          >
            <Search className="h-4 w-4 mr-2" />
            Validar dirección
          </button>
          
          <button
            type="button"
            onClick={() => setMostrarMapa(true)}
            disabled={cargando}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Seleccionar en mapa
          </button>
        </div>
      </div>
      
      {/* Selector de mapa */}
      {mostrarMapa && (
        <MapaSelector
          onSelectLocation={handleSeleccionUbicacionMapa}
          onClose={() => setMostrarMapa(false)}
          initialCoordinates={coordenadas.lat && coordenadas.lng ? coordenadas : null}
        />
      )}
      
      {mostrarSugerencias && sugerencias.length > 0 && (
        <div
          ref={sugerenciasRef}
          className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
        >
          {sugerencias.map((sugerencia) => (
            <div
              key={sugerencia.place_id}
              onClick={() => handleSeleccionarSugerencia(sugerencia)}
              className="cursor-pointer hover:bg-gray-100 px-4 py-2"
            >
              {sugerencia.display_name}
            </div>
          ))}
        </div>
      )}
      
      {cargando && <p className="mt-1 text-sm text-gray-500">Buscando...</p>}
      
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      
      {direccionValida && coordenadas.lat && coordenadas.lng && (
        <div className="mt-1">
          <p className="text-sm text-green-600">
            <span className="font-medium">✓ Dirección validada.</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            (Si necesita cambiar la dirección, borre el texto completamente o use el selector de mapa)
          </p>
        </div>
      )}
    </div>
  );
};

export default DireccionConGPS;