import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useNotifications } from '../../store/NotificationContext';
import { serviceStorage, hotelStorage, auditStorage } from '../../utils/storage';
import { calculateServicePrice, convertToBase64 } from '../../utils';
import { SIMULATION_LOCATIONS } from '../../constants';
import serviceService from '../../services/service.service';
import hotelService from '../../services/hotel.service';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import SignatureCanvas from '../ui/SignatureCanvas';
import { Camera, MapPin, Package, Scale } from 'lucide-react';

const PickupForm = ({ serviceId, onClose, onPickupCompleted }) => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [signature, setSignature] = useState('');
  const [location, setLocation] = useState(null);
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
      simulateGeolocation();
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
          } else {
            // Fallback to local storage
            fallbackToLocalStorage(foundService);
          }
        } else {
          // Fallback to local storage if no hotelId
          fallbackToLocalStorage(foundService);
        }
      } else {
        // Fallback to local storage
        fallbackToLocalStorage();
      }
    } catch (error) {
      console.error('Error loading service data:', error);
      showNotification({
        type: 'error',
        message: 'Error al cargar datos del servicio. Usando datos locales.'
      });
      fallbackToLocalStorage();
    } finally {
      setLoading(false);
    }
  };
  
  const fallbackToLocalStorage = (foundService = null) => {
    if (!foundService) {
      const services = serviceStorage.getServices();
      foundService = services.find(s => s.id === serviceId);
      if (foundService) {
        setService(foundService);
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
      }
      
      setHotel(serviceHotel);
    }
  };

  const simulateGeolocation = () => {
    // Simulate getting current location (in real app would use navigator.geolocation)
    const locations = Object.values(SIMULATION_LOCATIONS);
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    setLocation(randomLocation);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    try {
      // Store the original files for API upload
      const newPhotos = files.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        file: file,  // Store the original file for API upload
        previewUrl: URL.createObjectURL(file),
        timestamp: new Date().toISOString()
      }));
      
      setPhotos(prev => [...prev, ...newPhotos]);
    } catch (err) {
      showNotification({
        type: 'error',
        message: 'No se pudieron procesar las fotos'
      });
    }
  };

  const removePhoto = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const onSubmit = async (data) => {
    setLoading(true);

    try {
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

      const weight = parseFloat(data.weight);
      const finalBagCount = parseInt(data.bagCount) || service.bagCount;
      
      // Calculate price via API if possible
      let price = 0;
      try {
        const priceResponse = await serviceService.calculatePrice(weight, {
          hotelId: hotel.id,
          serviceType: 'STANDARD'
        });
        if (priceResponse.success && priceResponse.data) {
          price = priceResponse.data.price;
        } else {
          // Fallback to local calculation
          price = calculateServicePrice(weight, hotel.pricePerKg);
        }
      } catch (err) {
        // Fallback to local calculation
        price = calculateServicePrice(weight, hotel.pricePerKg);
      }

      // Prepare pickup data
      const pickupData = {
        weight,
        bagCount: finalBagCount,
        observations: data.observations,
        collectorName: data.collectorName,
        geolocation: location ? {
          latitude: location.lat,
          longitude: location.lng,
          locationName: location.name
        } : null
      };

      // Try to update service with API
      let updateSuccess = false;
      let updatedService = null;

      try {
        // First register pickup with API
        const pickupResponse = await serviceService.registerPickup(serviceId, pickupData);
        
        if (pickupResponse.success && pickupResponse.data) {
          updatedService = pickupResponse.data;
          
          // Then upload photos
          if (photos.length > 0) {
            await serviceService.uploadServicePhotos(serviceId, photos.map(p => p.file), 'pickup');
          }
          
          // Then upload signature
          if (signature) {
            // Convert signature from base64 to blob
            const signatureBlob = await (async () => {
              const res = await fetch(signature);
              return res.blob();
            })();
            
            await serviceService.uploadSignature(serviceId, signatureBlob, 'pickup');
          }
          
          updateSuccess = true;
        }
      } catch (apiError) {
        console.error('API error updating service:', apiError);
        // Fall back to local storage
        updateSuccess = false;
      }
      
      // If API update failed, fall back to local storage
      if (!updateSuccess) {
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
          geolocation: location,
          repartidor: user.name,
          repartidorId: user.id,
          price,
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
            details: `Recojo completado para ${service.guestName} - ${hotel.name}. Peso: ${weight}kg, Precio: S/${price.toFixed(2)}`
          });
        }
      }

      if (updateSuccess) {
        showNotification({
          type: 'success',
          message: `Servicio de ${service.guestName} recogido exitosamente. ${finalBagCount} bolsas, ${weight}kg. Precio: S/${price.toFixed(2)}`
        });

        // Show redirect to labels option
        setShowRedirectToLabels(true);

        if (onPickupCompleted) {
          onPickupCompleted(updatedService);
        }
      } else {
        showNotification({
          type: 'error',
          message: 'No se pudo completar el recojo'
        });
      }
    } catch (err) {
      console.error('Error completing pickup:', err);
      showNotification({
        type: 'error',
        message: 'Ocurrió un error al completar el recojo'
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
          <p>{hotel.name}</p>
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
                <p className="text-blue-900">{hotel.name}</p>
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
              <div>
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
            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <img
                      src={photo.previewUrl || photo.data}
                      alt={photo.name}
                      className="w-full h-32 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Location Display */}
          {location && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-gray-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Ubicación Actual
                  </p>
                  <p className="text-sm text-gray-600">
                    {location.name} ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                  </p>
                </div>
              </div>
            </div>
          )}

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