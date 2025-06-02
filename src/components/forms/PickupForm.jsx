import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useNotifications } from '../../store/NotificationContext';
import { serviceStorage, hotelStorage, auditStorage } from '../../utils/storage';
import { calculateServicePrice, convertToBase64 } from '../../utils';
import serviceService from '../../services/service.service';
import hotelService from '../../services/hotel.service';
import routeService from '../../services/route.service';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import SignatureCanvas from '../ui/SignatureCanvas';
import DireccionConGPS from '../ui/DireccionConGPS';
import { Camera, MapPin, Package, Scale } from 'lucide-react';

const PickupForm = ({ serviceId, onClose, onPickupCompleted }) => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get route information from location state if available
  const routeId = location.state?.routeId;
  const hotelIndex = location.state?.hotelIndex;
  const useApi = location.state?.useApi;
  const [service, setService] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [signature, setSignature] = useState('');
  const [geoLocation, setGeoLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showRedirectToLabels, setShowRedirectToLabels] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      weight: '',
      bagCount: service?.bagCount || '',
      observations: '',
      collectorName: user?.name || ''
    }
  });

  const watchedWeight = watch('weight');
  const watchedBagCount = watch('bagCount');

  useEffect(() => {
    if (serviceId) {
      loadServiceData();
    }
  }, [serviceId]);

  // Update bag count default when service loads
  useEffect(() => {
    if (service && service.bagCount) {
      // Set the default value only once when service loads
      const bagCountInput = document.querySelector('input[name="bagCount"]');
      if (bagCountInput && !bagCountInput.value) {
        bagCountInput.value = service.bagCount;
      }
    }
  }, [service]);

  useEffect(() => {
    // Calculate price when weight changes
    if (watchedWeight && hotel) {
      const price = calculateServicePrice(
        parseFloat(watchedWeight),
        hotel.pricePerKg
      );
      // Update price display (handled in render)
    }
  }, [watchedWeight, hotel, service]);

  const loadServiceData = async () => {
    try {
      setLoading(true);
      
      // Intenta cargar datos desde la API
      try {
        // Fetch service from API
        const serviceResponse = await serviceService.getServiceById(serviceId);
        if (serviceResponse.success && serviceResponse.data) {
          const foundService = serviceResponse.data;
          setService(foundService);
          
          // Fetch hotel data
          if (foundService.hotelId) {
            const hotelResponse = await hotelService.getHotelById(foundService.hotelId);
            if (hotelResponse.success && hotelResponse.data) {
              setHotel(hotelResponse.data);
              showNotification({
                type: 'success',
                message: 'Datos del servicio cargados correctamente'
              });
              setLoading(false);
              return; // Terminamos con éxito
            }
          }
        }
        // Si llegamos aquí, algo falló y necesitamos usar el fallback
        throw new Error('Datos incompletos desde la API');
      } catch (apiError) {
        console.warn('Fallback a almacenamiento local:', apiError);
        showNotification({
          type: 'warning',
          message: 'Usando datos almacenados localmente (modo offline)'
        });
        fallbackToLocalStorage();
      }
    } catch (error) {
      console.error('Error crítico al cargar datos:', error);
      showNotification({
        type: 'error',
        message: 'Error grave al cargar datos del servicio'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fallbackToLocalStorage = (foundService = null) => {
    try {
      if (!foundService) {
        const services = serviceStorage.getServices();
        foundService = services.find(s => s.id === serviceId);
        if (foundService) {
          setService(foundService);
        } else {
          throw new Error(`No se encontró el servicio con ID ${serviceId} en almacenamiento local`);
        }
      }
      
      if (foundService) {
        // Load hotel data from local storage
        const hotels = hotelStorage.getHotels();
        let serviceHotel = null;
        
        // Try to find hotel by ID first
        if (foundService.hotelId) {
          serviceHotel = hotels.find(h => h.id === foundService.hotelId);
        }
        
        // Fallback: try to find hotel by name if ID doesn't match
        if (!serviceHotel && foundService.hotel) {
          serviceHotel = hotels.find(h => h.name === foundService.hotel);
        }
        
        // Last resort: use first hotel as fallback
        if (!serviceHotel && hotels.length > 0) {
          serviceHotel = hotels[0];
          // Update the service with the correct hotel data
          foundService.hotelId = serviceHotel.id;
          foundService.hotel = serviceHotel.name;
          
          console.warn(`Usando hotel de respaldo: ${serviceHotel.name} para servicio ${serviceId}`);
        }
        
        if (!serviceHotel) {
          throw new Error('No se encontraron hoteles en almacenamiento local');
        }
        
        setHotel(serviceHotel);
        console.log(`Datos cargados desde almacenamiento local: ${foundService.guestName} - ${serviceHotel.name}`);
      }
    } catch (error) {
      console.error('Error en fallback a almacenamiento local:', error);
      showNotification({
        type: 'error',
        message: error.message || 'Error al cargar datos locales'
      });
    }
  };

  const obtenerUbicacionActual = () => {
    if (!navigator.geolocation) {
      showNotification({
        type: 'error',
        message: 'Su navegador no soporta geolocalización'
      });
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Intentar obtener el nombre de la ubicación a través de geocodificación inversa
          const geocodeService = (await import('../../services/geocode.service')).default;
          const addressData = await geocodeService.reverseGeocode(latitude, longitude);
          
          setGeoLocation({
            lat: latitude,
            lng: longitude,
            name: addressData.display_name || 'Ubicación actual'
          });
          
          showNotification({
            type: 'success',
            message: 'Ubicación capturada correctamente'
          });
        } catch (error) {
          console.error('Error al obtener nombre de ubicación:', error);
          
          // Usar coordenadas sin nombre específico
          setGeoLocation({
            lat: latitude,
            lng: longitude,
            name: `Ubicación (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
          });
        }
      },
      (error) => {
        console.error('Error al obtener ubicación:', error);
        showNotification({
          type: 'error',
          message: `No se pudo obtener su ubicación: ${error.message}`
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    try {
      if (files.length > 5) {
        showNotification({
          type: 'warning',
          message: 'Solo se permite un máximo de 5 fotos por servicio'
        });
        return;
      }
      
      // Store the original files for API upload
      const newPhotos = await Promise.all(files.map(async (file) => {
        // Validar tamaño y tipo
        if (file.size > 5 * 1024 * 1024) { // 5MB max
          throw new Error(`La imagen ${file.name} excede el tamaño máximo permitido (5MB)`);
        }
        
        if (!file.type.startsWith('image/')) {
          throw new Error(`El archivo ${file.name} no es una imagen válida`);
        }
        
        // Crear el objeto de foto
        return {
          id: Date.now() + Math.random(),
          name: file.name,
          file: file,  // Store the original file for API upload
          previewUrl: URL.createObjectURL(file),
          timestamp: new Date().toISOString(),
          size: (file.size / 1024).toFixed(1) + ' KB' // Tamaño en KB
        };
      }));
      
      // Verificar que no se exceda el límite total
      if (photos.length + newPhotos.length > 5) {
        showNotification({
          type: 'warning',
          message: `Solo se permite un máximo de 5 fotos (ya tiene ${photos.length})`
        });
        return;
      }
      
      setPhotos(prev => [...prev, ...newPhotos]);
      showNotification({
        type: 'success',
        message: `${newPhotos.length} foto${newPhotos.length !== 1 ? 's' : ''} añadida${newPhotos.length !== 1 ? 's' : ''} correctamente`
      });
    } catch (err) {
      showNotification({
        type: 'error',
        message: err.message || 'No se pudieron procesar las fotos'
      });
    }
  };

  const removePhoto = (photoId) => {
    const photoToRemove = photos.find(p => p.id === photoId);
    if (photoToRemove && photoToRemove.previewUrl) {
      URL.revokeObjectURL(photoToRemove.previewUrl); // Liberar recursos
    }
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const onSubmit = async (data) => {
    setLoading(true);

    try {
      // Validaciones
      if (!signature) {
        showNotification({
          type: 'error',
          message: 'Debe capturar la firma del cliente'
        });
        setLoading(false);
        return;
      }

      if (photos.length === 0) {
        showNotification({
          type: 'error',
          message: 'Debe tomar al menos una foto de las bolsas'
        });
        setLoading(false);
        return;
      }
      
      if (!geoLocation) {
        showNotification({
          type: 'error',
          message: 'Debe registrar la ubicación de recojo'
        });
        setLoading(false);
        return;
      }

      // Procesar datos del formulario
      const weight = parseFloat(data.weight);
      const finalBagCount = parseInt(data.bagCount) || service.bagCount;
      
      // Mostrar indicador de progreso
      showNotification({
        type: 'info',
        message: 'Procesando recojo, por favor espere...'
      });
      
      // Calculate price via API if possible
      let price = 0;
      try {
        const priceResponse = await serviceService.calculatePrice(weight, {
          hotelId: hotel.id,
          serviceType: 'STANDARD'
        });
        if (priceResponse.success && priceResponse.data) {
          price = priceResponse.data.price;
          console.log(`Precio calculado por API: S/${price.toFixed(2)}`);
        } else {
          // Fallback to local calculation
          price = calculateServicePrice(weight, hotel.pricePerKg);
          console.log(`Precio calculado localmente: S/${price.toFixed(2)}`);
        }
      } catch (err) {
        console.warn('Error al calcular precio por API, usando cálculo local:', err);
        // Fallback to local calculation
        price = calculateServicePrice(weight, hotel.pricePerKg);
      }

      // Prepare pickup data
      const pickupData = {
        weight,
        bagCount: finalBagCount,
        observations: data.observations,
        collectorName: data.collectorName,
        geolocation: geoLocation ? {
          latitude: geoLocation.lat,
          longitude: geoLocation.lng,
          locationName: geoLocation.name
        } : null
      };

      // Intenta guardar en la API o usa almacenamiento local como respaldo
      let updateSuccess = false;
      let updatedService = null;
      let usedLocalStorage = false;

      try {
        console.log('Intentando guardar recojo en la API...');
        
        // Check if we need to update a route
        if (useApi && routeId && hotelIndex !== undefined) {
          console.log(`Actualizando servicio en ruta ${routeId}, hotel ${hotelIndex}...`);
          
          // Update service in route
          const routeUpdateData = {
            ...pickupData,
            serviceId,
            photos: photos.map(p => p.file),
            signature: await (async () => {
              const res = await fetch(signature);
              return res.blob();
            })(),
            serviceStatus: 'PICKED_UP',
            price
          };
          
          const routeUpdateResponse = await serviceService.updateServiceInRoute(
            serviceId, routeId, hotelIndex, routeUpdateData
          );
          
          if (routeUpdateResponse.success) {
            updatedService = routeUpdateResponse.data.service;
            updateSuccess = true;
            console.log('Servicio actualizado en ruta exitosamente');
          } else {
            throw new Error('Error al actualizar servicio en ruta: ' + routeUpdateResponse.message);
          }
        } else {
          // Regular pickup without route
          // First register pickup with API
          const pickupResponse = await serviceService.registerPickup(serviceId, pickupData);
          
          if (pickupResponse.success && pickupResponse.data) {
            updatedService = pickupResponse.data;
            
            // Then upload photos
            if (photos.length > 0) {
              console.log(`Subiendo ${photos.length} fotos a la API...`);
              await serviceService.uploadServicePhotos(serviceId, photos.map(p => p.file), 'pickup');
            }
            
            // Then upload signature
            if (signature) {
              console.log('Subiendo firma a la API...');
              // Convert signature from base64 to blob
              const signatureBlob = await (async () => {
                const res = await fetch(signature);
                return res.blob();
              })();
              
              await serviceService.uploadSignature(serviceId, signatureBlob, 'pickup');
            }
            
            updateSuccess = true;
            console.log('Recojo guardado exitosamente en la API');
          }
        }
      } catch (apiError) {
        console.error('Error al guardar en API, usando almacenamiento local:', apiError);
        usedLocalStorage = true;
      }
      
      // Si la actualización en la API falló, usar almacenamiento local
      if (!updateSuccess) {
        console.log('Guardando recojo en almacenamiento local...');
        // Create updated service object for local storage
        updatedService = {
          ...service,
          weight,
          bagCount: finalBagCount,
          observations: data.observations,
          pickupDate: new Date().toISOString(),
          collectorName: data.collectorName,
          status: 'PICKED_UP',
          photos,
          signature,
          geolocation: geoLocation,
          repartidor: user.name,
          repartidorId: user.id,
          price,
          syncPending: true, // Marcar para sincronización futura
          internalNotes: (service.internalNotes || '') + 
            (finalBagCount !== service.bagCount ? 
              ` | Bolsas actualizadas: ${service.bagCount} → ${finalBagCount} por repartidor` : 
              ''
            )
        };

        // Update in local storage
        updateSuccess = serviceStorage.updateService(serviceId, updatedService);
        
        // Add local audit log
        if (updateSuccess) {
          auditStorage.addAuditEntry({
            action: 'PICKUP_COMPLETED',
            user: user.name,
            timestamp: new Date().toISOString(),
            details: `Recojo completado para ${service.guestName} - ${typeof hotel === 'object' ? hotel.name : hotel}. Peso: ${weight}kg, Precio: S/${price.toFixed(2)}`,
            syncPending: true
          });
          console.log('Recojo guardado exitosamente en almacenamiento local');
        }
      }

      if (updateSuccess) {
        showNotification({
          type: 'success',
          message: `Servicio de ${service.guestName} recogido exitosamente. ${finalBagCount} bolsas, ${weight}kg. Precio: S/${price.toFixed(2)}${usedLocalStorage ? ' (guardado localmente)' : ''}`
        });

        // Show redirect to labels option
        setShowRedirectToLabels(true);

        if (onPickupCompleted) {
          onPickupCompleted(updatedService);
        }
      } else {
        showNotification({
          type: 'error',
          message: 'No se pudo completar el recojo. Verifique su conexión e intente nuevamente.'
        });
      }
    } catch (err) {
      console.error('Error crítico al completar recojo:', err);
      showNotification({
        type: 'error',
        message: `Error al completar el recojo: ${err.message || 'Error desconocido'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRedirectToLabels = () => {
    navigate('/bag-labels', { 
      state: { 
        preSelectedServiceId: serviceId,
        fromPickup: true 
      } 
    });
  };

  const handleStayHere = () => {
    setShowRedirectToLabels(false);
    if (onClose) {
      onClose();
    }
  };

  if (!service) {
    return (
      <Card>
        <Card.Content className="p-6 text-center">
          <p>Cargando información del servicio...</p>
          <p className="text-sm text-gray-500 mt-2">ID: {serviceId}</p>
        </Card.Content>
      </Card>
    );
  }

  if (!hotel) {
    return (
      <Card>
        <Card.Content className="p-6 text-center">
          <p>Error: No se pudo cargar información del hotel</p>
          <p className="text-sm text-gray-500 mt-2">Servicio: {service.guestName}</p>
          <Button onClick={onClose} className="mt-4">
            Cerrar
          </Button>
        </Card.Content>
      </Card>
    );
  }

  const estimatedPrice = watchedWeight ? calculateServicePrice(
    parseFloat(watchedWeight),
    hotel.pricePerKg
  ) : 0;

  return (
    <>
      <Card>
      <Card.Header>
        <h3 className="text-lg font-semibold text-gray-900">
          Recojo de Bolsas
        </h3>
        <div className="text-sm text-gray-600">
          <p>{service.guestName} - Hab. {service.roomNumber}</p>
          <p>{typeof hotel === 'object' ? hotel.name : hotel}</p>
        </div>
      </Card.Header>
      <Card.Content>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Service Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3">Información del Servicio</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700 font-medium">Cliente:</p>
                <p className="text-blue-900">{service.guestName}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Hotel:</p>
                <p className="text-blue-900">{typeof hotel === 'object' ? hotel.name : hotel}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Teléfono Hotel:</p>
                <p className="text-blue-900 font-medium">
                  {typeof hotel === 'object' ? 
                    (hotel.phone || "No disponible") : 
                    "No disponible"}
                </p>
                {typeof hotel === 'object' && hotel.contactPerson && (
                  <p className="text-xs text-blue-600">Contacto: {hotel.contactPerson}</p>
                )}
              </div>
              <div>
                <p className="text-blue-700 font-medium">Habitación:</p>
                <p className="text-blue-900">{service.roomNumber}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Fecha:</p>
                <p className="text-blue-900">{new Date().toLocaleDateString('es-PE')}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Cantidad de Bolsas (Estimada):</p>
                <p className="text-blue-900">{service.bagCount}</p>
                <p className="text-xs text-blue-600">Se puede ajustar abajo</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-blue-700 font-medium">Observaciones Iniciales:</p>
                <p className="text-blue-900">{service.observations || 'Ninguna'}</p>
              </div>
            </div>
          </div>

          {/* Collector Name */}
          <Input
            label="Nombre del que Recoge"
            type="text"
            {...register('collectorName', {
              required: 'El nombre del recolector es requerido'
            })}
            error={errors.collectorName?.message}
            placeholder="Nombre completo del repartidor"
            required
          />

          {/* Bag Count Input */}
          <div>
            <Input
              label="Cantidad de Bolsas (Real)"
              type="number"
              min="1"
              {...register('bagCount', {
                required: 'La cantidad de bolsas es requerida',
                min: {
                  value: 1,
                  message: 'Debe tener al menos 1 bolsa'
                }
              })}
              error={errors.bagCount?.message}
              placeholder="Ej: 3"
              defaultValue={service?.bagCount}
              required
            />
            <div className="mt-2 flex items-center space-x-4 text-sm">
              <span className="text-gray-600">
                Estimado inicialmente: <strong>{service?.bagCount || 0}</strong>
              </span>
              {watchedBagCount && parseInt(watchedBagCount) !== service?.bagCount && (
                <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  ⚠️ Cantidad modificada: {watchedBagCount}
                </span>
              )}
            </div>
          </div>

          {/* Weight Input */}
          <Input
            label="Peso Total (kg)"
            type="number"
            step="0.1"
            min="0.1"
            {...register('weight', {
              required: 'El peso es requerido',
              min: {
                value: 0.1,
                message: 'El peso debe ser mayor a 0'
              }
            })}
            error={errors.weight?.message}
            placeholder="Ej: 5.5"
            required
          />

          {/* Price Display */}
          {estimatedPrice > 0 && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Scale className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Precio Calculado
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    S/ {estimatedPrice.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto de Campo (Bolsas Recogidas) <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Camera className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-base font-medium text-gray-700 mb-1">
                  Tomar Foto de las Bolsas
                </p>
                <p className="text-sm text-gray-500 text-center">
                  Capture una foto clara de las bolsas recogidas para documentar el estado
                </p>
              </label>
            </div>
            
            {/* Photo Preview */}
            <div className="mt-4">
              {photos.length > 0 ? (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-700 font-medium">
                      {photos.length} {photos.length === 1 ? 'foto' : 'fotos'} agregada{photos.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      {5 - photos.length} espacio{5 - photos.length !== 1 ? 's' : ''} disponible{5 - photos.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative group">
                        <div className="aspect-square overflow-hidden rounded-lg border border-gray-300">
                          <img
                            src={photo.previewUrl || photo.data}
                            alt={photo.name}
                            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                          />
                        </div>
                        <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="self-end bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                          <div className="bg-black bg-opacity-60 text-white text-xs p-1 rounded-sm">
                            <p className="truncate">{photo.name}</p>
                            <p>{photo.size}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center p-4 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-gray-500">
                    No hay fotos. Capture al menos una foto de las bolsas recogidas.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Location Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Ubicación de Recojo <span className="text-red-500">*</span>
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex-1">
                <button
                  type="button"
                  onClick={obtenerUbicacionActual}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Capturar ubicación actual
                </button>
              </div>
              
              <div className="flex-1">
                <DireccionConGPS
                  placeholder="Seleccione la ubicación en mapa"
                  label="O seleccione manualmente"
                  onChange={({ direccion, coordenadas }) => {
                    if (coordenadas && coordenadas.lat && coordenadas.lng) {
                      setGeoLocation({
                        lat: coordenadas.lat,
                        lng: coordenadas.lng,
                        name: direccion || 'Ubicación seleccionada'
                      });
                    }
                  }}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Location Display */}
            {geoLocation && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Ubicación Registrada
                    </p>
                    <p className="text-sm text-green-700">
                      {geoLocation.name}
                    </p>
                    <p className="text-xs text-green-600">
                      Coordenadas: {geoLocation.lat.toFixed(6)}, {geoLocation.lng.toFixed(6)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {!geoLocation && (
              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-amber-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Ubicación no registrada
                    </p>
                    <p className="text-sm text-amber-700">
                      Por favor capture su ubicación actual o seleccione manualmente
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Observations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones del Recojo <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('observations', {
                required: 'Las observaciones son requeridas'
              })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Describa el estado de las bolsas, condiciones especiales, tipo de ropa, etc."
            />
            {errors.observations && (
              <p className="mt-1 text-sm text-red-600">{errors.observations.message}</p>
            )}
          </div>

          {/* Signature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Firma del Cliente <span className="text-red-500">*</span>
            </label>
            <SignatureCanvas
              onSignatureChange={setSignature}
              width={400}
              height={150}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-4">
            <Button type="submit" className="flex-1" loading={loading}>
              <Package className="h-4 w-4 mr-2" />
              Completar Recojo
            </Button>
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card.Content>
    </Card>

    {/* Redirect to Labels Modal */}
    {showRedirectToLabels && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ¡Recojo Completado!
          </h3>
          <p className="text-gray-600 mb-6">
            El servicio ha sido recogido exitosamente. ¿Deseas registrar las etiquetas de las bolsas ahora?
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleRedirectToLabels}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Ir a Rótulos
            </Button>
            <Button
              onClick={handleStayHere}
              variant="secondary"
              className="flex-1"
            >
              Ahora No
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default PickupForm;