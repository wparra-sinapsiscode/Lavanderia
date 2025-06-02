import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../store/AuthContext';
import { useLocation } from 'react-router-dom';
import { useNotifications } from '../../store/NotificationContext';
import { serviceStorage, hotelStorage, auditStorage } from '../../utils/storage';
import { convertToBase64 } from '../../utils';
import { SIMULATION_LOCATIONS } from '../../constants';
import serviceService from '../../services/service.service';
import hotelService from '../../services/hotel.service';
import routeService from '../../services/route.service';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import SignatureCanvas from '../ui/SignatureCanvas';
import { Camera, MapPin, Package, Truck } from 'lucide-react';

const DeliveryForm = ({ serviceId, onClose, onDeliveryCompleted }) => {
  const { user } = useAuth();
  const { success, error } = useNotifications();
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

  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm({
    defaultValues: {
      deliveredBagCount: '',
      receiverName: '',
      receiverDocument: '',
      observations: '',
      deliveryPersonName: user?.name || ''
    }
  });

  const watchedBagCount = watch('deliveredBagCount');

  useEffect(() => {
    loadServiceData();
    simulateGeolocation();
  }, [serviceId]);

  // Calculate available bags for delivery
  const getAvailableBags = () => {
    if (!service) return 0;
    const alreadyDelivered = service.deliveredBagCount || 0;
    return service.bagCount - alreadyDelivered;
  };

  // Update bag count default when service loads
  useEffect(() => {
    if (service) {
      const availableBags = getAvailableBags();
      setValue('deliveredBagCount', availableBags.toString());
    }
  }, [service, setValue]);

  const loadServiceData = async () => {
    try {
      setLoading(true);
      
      // Try loading from API if useApi flag is true
      if (useApi) {
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
                setLoading(false);
                return;
              }
            }
          }
          // If we get here, something failed
          throw new Error('Could not load data from API');
        } catch (apiError) {
          console.warn('Falling back to localStorage:', apiError);
          // Fall back to localStorage
        }
      }
      
      // Fallback to localStorage
      const services = serviceStorage.getServices();
      const foundService = services.find(s => s.id === serviceId);
      
      if (foundService) {
        setService(foundService);
        
        // Load hotel data
        const hotels = hotelStorage.getHotels();
        let serviceHotel = null;
        
        if (foundService.hotelId) {
          serviceHotel = hotels.find(h => h.id === foundService.hotelId);
        }
        
        if (!serviceHotel && foundService.hotel) {
          serviceHotel = hotels.find(h => h.name === foundService.hotel);
        }
        
        if (!serviceHotel && hotels.length > 0) {
          serviceHotel = hotels[0];
        }
        
        setHotel(serviceHotel);
      } else {
        console.error(`Service with ID ${serviceId} not found.`);
        error('Error', `No se encontró el servicio con ID ${serviceId}`);
      }
    } catch (err) {
      console.error('Error loading service data:', err);
      error('Error', 'No se pudo cargar la información del servicio');
    } finally {
      setLoading(false);
    }
  };

  const simulateGeolocation = () => {
    const locations = Object.values(SIMULATION_LOCATIONS);
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    setGeoLocation(randomLocation);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    try {
      const photoPromises = files.map(async (file) => {
        const base64 = await convertToBase64(file);
        return {
          id: Date.now() + Math.random(),
          name: file.name,
          data: base64,
          file: file, // Keep the original file for API upload
          timestamp: new Date().toISOString()
        };
      });

      const newPhotos = await Promise.all(photoPromises);
      setPhotos(prev => [...prev, ...newPhotos]);
    } catch (err) {
      error('Error', 'No se pudieron procesar las fotos');
    }
  };

  const removePhoto = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const onSubmit = async (data) => {
    setLoading(true);

    try {
      if (!signature) {
        error('Firma Requerida', 'Debe capturar la firma del receptor');
        setLoading(false);
        return;
      }

      if (photos.length === 0) {
        error('Fotos Requeridas', 'Debe tomar al menos una foto de la entrega');
        setLoading(false);
        return;
      }

      const bagsDeliveredNow = parseInt(data.deliveredBagCount) || getAvailableBags();
      const previouslyDelivered = service.deliveredBagCount || 0;
      const totalDeliveredAfterThis = previouslyDelivered + bagsDeliveredNow;
      const deliveryPercentage = Math.round((totalDeliveredAfterThis / service.bagCount) * 100);
      const isCompleteDelivery = totalDeliveredAfterThis >= service.bagCount;
      
      let updateSuccess = false;
      let updatedService = null;
      
      // Try API first if useApi flag is true
      if (useApi && routeId && hotelIndex !== undefined) {
        try {
          console.log(`Actualizando entrega en ruta ${routeId}, hotel ${hotelIndex}...`);
          
          // Prepare delivery data for API
          const deliveryData = {
            deliveredBagCount: bagsDeliveredNow,
            receiverName: data.receiverName,
            receiverDocument: data.receiverDocument,
            observations: data.observations,
            deliveryPersonName: data.deliveryPersonName || user.name,
            isFullDelivery: isCompleteDelivery,
            serviceStatus: isCompleteDelivery ? 'entregado' : 'entrega_parcial',
            deliveryPercentage,
            routeId,
            hotelIndex,
            geolocation: geoLocation
          };
          
          // If we have photos, prepare them for upload
          if (photos.length > 0) {
            deliveryData.photos = photos.map(p => p.file || p);
          }
          
          // If we have signature, prepare it for upload
          if (signature) {
            deliveryData.signature = await (async () => {
              const res = await fetch(signature);
              return res.blob();
            })();
          }
          
          // Update service in route
          const routeUpdateResponse = await serviceService.updateServiceInRoute(
            serviceId, routeId, hotelIndex, deliveryData
          );
          
          if (routeUpdateResponse.success) {
            updatedService = routeUpdateResponse.data.service;
            updateSuccess = true;
            console.log('Entrega actualizada en ruta exitosamente');
          } else {
            throw new Error('Error al actualizar entrega en ruta: ' + routeUpdateResponse.message);
          }
        } catch (apiError) {
          console.error('Error updating delivery in route:', apiError);
          // Fall back to localStorage
        }
      }
      
      // If API update failed or was not attempted, use localStorage
      if (!updateSuccess) {
        // Update service with delivery data
        updatedService = {
          ...service,
          deliveredBagCount: totalDeliveredAfterThis,
          deliveryPercentage,
          lastReceiverName: data.receiverName,
          lastReceiverDocument: data.receiverDocument,
          lastDeliveryObservations: data.observations,
          deliveryDate: new Date().toISOString(),
          deliveryPersonName: data.deliveryPersonName,
          status: isCompleteDelivery ? 'entregado' : 'entrega_parcial',
          deliveryPhotos: [...(service.deliveryPhotos || []), ...photos],
          deliverySignature: signature,
          deliveryGeolocation: geoLocation,
          deliveryRepartidorId: user.id
        };
        
        // Update storage
        if (serviceStorage.updateService(serviceId, updatedService)) {
          // Add to audit log
          auditStorage.addAuditEntry({
            action: 'SERVICE_DELIVERED',
            targetId: serviceId,
            details: `Servicio entregado a ${data.receiverName}. ${bagsDeliveredNow} bolsas entregadas. ${isCompleteDelivery ? 'Entrega completa' : 'Entrega parcial'}.`,
            timestamp: new Date().toISOString(),
            userId: user.id,
            userName: user.name
          });
          
          updateSuccess = true;
          console.log('Entrega guardada exitosamente en almacenamiento local');
        } else {
          error('Error', 'No se pudo actualizar el servicio en almacenamiento local');
        }
      }
      
      if (updateSuccess) {
        success('Entrega Registrada', `Se entregaron ${bagsDeliveredNow} bolsas a ${data.receiverName} (${deliveryPercentage}% completado)`);
        
        if (onDeliveryCompleted) {
          onDeliveryCompleted(updatedService);
        }
      } else {
        error('Error', 'No se pudo completar la entrega. Verifique su conexión e intente nuevamente.');
      }
    } catch (err) {
      console.error('Error processing delivery:', err);
      error('Error', `Error al procesar la entrega: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!service) {
    return (
      <Card>
        <Card.Content className="p-6 text-center">
          <p className="text-gray-600">Cargando información del servicio...</p>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <h3 className="text-lg font-semibold text-gray-900">
          Entrega de Servicio
        </h3>
        <div className="text-sm text-gray-600">
          <p>{service.guestName} - Hab. {service.roomNumber}</p>
          <p>{typeof hotel === 'object' ? hotel?.name : hotel || service.hotel}</p>
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
                <p className="text-blue-900">{typeof hotel === 'object' ? hotel?.name : hotel || service.hotel}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Habitación:</p>
                <p className="text-blue-900">{service.roomNumber}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Fecha Recojo:</p>
                <p className="text-blue-900">{service.pickupDate ? new Date(service.pickupDate).toLocaleDateString('es-PE') : 'N/A'}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Peso:</p>
                <p className="text-blue-900">{service.weight}kg</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Bolsas Totales:</p>
                <p className="text-blue-900">{service.bagCount}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-blue-700 font-medium">Observaciones de Recojo:</p>
                <p className="text-blue-900">{service.observations || 'Ninguna'}</p>
              </div>
            </div>
          </div>

          {/* Delivery Person */}
          <Input
            label="Nombre del Repartidor"
            type="text"
            {...register('deliveryPersonName', {
              required: 'El nombre del repartidor es requerido'
            })}
            error={errors.deliveryPersonName?.message}
            placeholder="Nombre completo del repartidor"
            required
          />

          {/* Receiver Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre del Receptor"
              type="text"
              {...register('receiverName', {
                required: 'El nombre del receptor es requerido'
              })}
              error={errors.receiverName?.message}
              placeholder="Nombre completo"
              required
            />
            <Input
              label="Documento del Receptor"
              type="text"
              {...register('receiverDocument', {
                required: 'El documento del receptor es requerido'
              })}
              error={errors.receiverDocument?.message}
              placeholder="DNI, Pasaporte, etc."
              required
            />
          </div>

          {/* Delivered Bag Count with Percentage */}
          <div>
            <Input
              label="Cantidad de Bolsas a Entregar Ahora"
              type="number"
              min="1"
              max={getAvailableBags()}
              {...register('deliveredBagCount', {
                required: 'La cantidad de bolsas entregadas es requerida',
                min: {
                  value: 1,
                  message: 'Debe entregar al menos 1 bolsa'
                },
                max: {
                  value: getAvailableBags(),
                  message: `No puede entregar más de ${getAvailableBags()} bolsas disponibles`
                }
              })}
              error={errors.deliveredBagCount?.message}
              placeholder={`Máximo: ${getAvailableBags()}`}
              required
            />
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-blue-700 font-medium">Total Original:</p>
                  <p className="text-blue-900 text-lg font-bold">{service?.bagCount || 0}</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Ya Entregadas:</p>
                  <p className="text-blue-900 text-lg font-bold">{service?.deliveredBagCount || 0}</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Disponibles:</p>
                  <p className="text-blue-900 text-lg font-bold">{getAvailableBags()}</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Entregando Ahora:</p>
                  <p className="text-blue-900 text-lg font-bold">{watchedBagCount || getAvailableBags()}</p>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-blue-700 mb-1">
                  <span>Progreso de Entrega</span>
                  <span>
                    {Math.round(((service?.deliveredBagCount || 0) + parseInt(watchedBagCount || getAvailableBags())) / service?.bagCount * 100)}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.round(((service?.deliveredBagCount || 0) + parseInt(watchedBagCount || getAvailableBags())) / service?.bagCount * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              {watchedBagCount && parseInt(watchedBagCount) < getAvailableBags() && (
                <div className="mt-3 p-2 bg-orange-100 rounded border border-orange-300">
                  <div className="flex items-center">
                    <span className="text-orange-700 text-sm font-medium">
                      ⚠️ Entrega Parcial: Quedarán {getAvailableBags() - parseInt(watchedBagCount)} bolsas sin entregar
                    </span>
                  </div>
                  <p className="text-orange-600 text-xs mt-1">
                    Las bolsas restantes deberán ser entregadas en otra oportunidad
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto de Entrega <span className="text-red-500">*</span>
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
                  Tomar Foto de la Entrega
                </p>
                <p className="text-sm text-gray-500 text-center">
                  Capture una foto del cliente recibiendo sus prendas
                </p>
              </label>
            </div>
            
            {/* Photo Preview */}
            <div className="mt-4">
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <div className="aspect-square overflow-hidden rounded-lg border border-gray-300">
                        <img
                          src={photo.data}
                          alt={photo.name}
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-gray-500">
                    No hay fotos. Capture al menos una foto de la entrega.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Location Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ubicación de Entrega <span className="text-red-500">*</span>
            </label>
            
            {geoLocation ? (
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
            ) : (
              <div className="bg-amber-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-amber-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Ubicación no registrada
                    </p>
                    <p className="text-sm text-amber-700">
                      Se utilizará la ubicación del hotel
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Observations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones de la Entrega
            </label>
            <textarea
              {...register('observations')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Comentarios adicionales sobre la entrega"
            />
          </div>

          {/* Signature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Firma del Receptor <span className="text-red-500">*</span>
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
              <Truck className="h-4 w-4 mr-2" />
              Completar Entrega
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
  );
};

export default DeliveryForm;