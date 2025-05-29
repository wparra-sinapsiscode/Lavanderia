import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../store/AuthContext';
import { useNotifications } from '../../store/NotificationContext';
import { serviceStorage, hotelStorage, auditStorage } from '../../utils/storage';
import { convertToBase64 } from '../../utils';
import { SIMULATION_LOCATIONS } from '../../constants';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import SignatureCanvas from '../ui/SignatureCanvas';
import { Camera, MapPin, Package, Truck } from 'lucide-react';

const DeliveryForm = ({ serviceId, onClose, onDeliveryCompleted }) => {
  const { user } = useAuth();
  const { success, error } = useNotifications();
  const [service, setService] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [signature, setSignature] = useState('');
  const [location, setLocation] = useState(null);
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

  const loadServiceData = () => {
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
    }
  };

  const simulateGeolocation = () => {
    const locations = Object.values(SIMULATION_LOCATIONS);
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    setLocation(randomLocation);
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

      // Update service with delivery data
      const updatedService = {
        ...service,
        deliveredBagCount: totalDeliveredAfterThis,
        deliveryPercentage,
        lastReceiverName: data.receiverName,
        lastReceiverDocument: data.receiverDocument,
        lastDeliveryObservations: data.observations,
        deliveryDate: new Date().toISOString(),
        deliveryPersonName: data.deliveryPersonName,
        status: 'entregado',
        deliveryPhotos: [...(service.deliveryPhotos || []), ...photos],
        deliverySignature: signature,
        deliveryGeolocation: location,
        deliveryRepartidor: user.name,
        deliveryRepartidorId: user.id,
        isPartialDelivery: !isCompleteDelivery,
        remainingBags: service.bagCount - totalDeliveredAfterThis,
        bagsDeliveredThisTime: bagsDeliveredNow,
        internalNotes: (service.internalNotes || '') + 
          ` | Entrega ${isCompleteDelivery ? 'FINAL' : 'PARCIAL'}: +${bagsDeliveredNow} bolsas (Total: ${totalDeliveredAfterThis}/${service.bagCount} = ${deliveryPercentage}%)` +
          ` | Entregado a ${data.receiverName} (${data.receiverDocument})` +
          (!isCompleteDelivery ? ` | Faltan ${service.bagCount - totalDeliveredAfterThis} bolsas por entregar` : ' | SERVICIO COMPLETADO')
      };

      const updateSuccess = serviceStorage.updateService(serviceId, updatedService);

      if (updateSuccess) {
        // Add audit log
        auditStorage.addAuditEntry({
          action: isCompleteDelivery ? 'DELIVERY_COMPLETED' : 'PARTIAL_DELIVERY_COMPLETED',
          user: user.name,
          details: `Entrega ${isCompleteDelivery ? 'FINAL' : 'parcial'} para ${service.guestName} - ${hotel.name}. +${bagsDeliveredNow} bolsas (Total: ${totalDeliveredAfterThis}/${service.bagCount} = ${deliveryPercentage}%). Recibido por: ${data.receiverName} (${data.receiverDocument})`
        });

        success(
          isCompleteDelivery ? 'Entrega Final Completada' : 'Entrega Parcial Completada',
          `${service.guestName}: +${bagsDeliveredNow} bolsas entregadas a ${data.receiverName}. Total: ${totalDeliveredAfterThis}/${service.bagCount} (${deliveryPercentage}%)${!isCompleteDelivery ? `. Faltan ${service.bagCount - totalDeliveredAfterThis} bolsas.` : '. ¡SERVICIO COMPLETADO!'}`
        );

        if (onDeliveryCompleted) {
          onDeliveryCompleted(updatedService);
        }

        if (onClose) {
          onClose();
        }
      } else {
        error('Error', 'No se pudo completar la entrega');
      }
    } catch (err) {
      console.error('Error completing delivery:', err);
      error('Error', 'Ocurrió un error al completar la entrega');
    } finally {
      setLoading(false);
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

  return (
    <Card>
      <Card.Header>
        <h3 className="text-lg font-semibold text-gray-900">
          Entrega de Bolsas Lavadas
        </h3>
        <div className="text-sm text-gray-600">
          <p>{service.guestName} - Hab. {service.roomNumber}</p>
          <p>{hotel.name}</p>
        </div>
      </Card.Header>
      <Card.Content>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Service Info */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-3">Información del Servicio</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-green-700 font-medium">Cliente:</p>
                <p className="text-green-900">{service.guestName}</p>
              </div>
              <div>
                <p className="text-green-700 font-medium">Hotel:</p>
                <p className="text-green-900">{hotel.name}</p>
              </div>
              <div>
                <p className="text-green-700 font-medium">Habitación:</p>
                <p className="text-green-900">{service.roomNumber}</p>
              </div>
              <div>
                <p className="text-green-700 font-medium">Fecha Entrega:</p>
                <p className="text-green-900">{new Date().toLocaleDateString('es-PE')}</p>
              </div>
              <div>
                <p className="text-green-700 font-medium">Bolsas Lavadas:</p>
                <p className="text-green-900">{service.bagCount}</p>
              </div>
              {service.deliveredBagCount && service.deliveredBagCount > 0 && (
                <div>
                  <p className="text-green-700 font-medium">Entregadas Antes:</p>
                  <p className="text-green-900">{service.deliveredBagCount} ({service.deliveryPercentage || 0}%)</p>
                </div>
              )}
              {service.remainingBags && service.remainingBags > 0 && (
                <div>
                  <p className="text-orange-700 font-medium">Pendientes:</p>
                  <p className="text-orange-900">{service.remainingBags} bolsas</p>
                </div>
              )}
              <div>
                <p className="text-green-700 font-medium">Peso Original:</p>
                <p className="text-green-900">{service.weight} kg</p>
              </div>
              <div>
                <p className="text-green-700 font-medium">Precio:</p>
                <p className="text-green-900">S/ {service.price?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-green-700 font-medium">Estado:</p>
                <p className="text-green-900">{service.status}</p>
              </div>
            </div>
          </div>

          {/* Delivery Person Name */}
          <Input
            label="Nombre del Entregador"
            type="text"
            {...register('deliveryPersonName', {
              required: 'El nombre del entregador es requerido'
            })}
            error={errors.deliveryPersonName?.message}
            placeholder="Nombre completo del repartidor"
            required
          />

          {/* Receiver Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre de quien Recibe"
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
                id="delivery-photo-upload"
              />
              <label
                htmlFor="delivery-photo-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Camera className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-base font-medium text-gray-700 mb-1">
                  Tomar Foto de la Entrega
                </p>
                <p className="text-sm text-gray-500 text-center">
                  Capture una foto clara de las bolsas entregadas y el receptor
                </p>
              </label>
            </div>
            
            {/* Photo Preview */}
            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <img
                      src={photo.data}
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
                    Ubicación de Entrega
                  </p>
                  <p className="text-sm text-gray-600">
                    {location.name} ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery Observations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones de la Entrega <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('observations', {
                required: 'Las observaciones son requeridas'
              })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Describa el estado de las bolsas entregadas, condiciones de la entrega, etc."
            />
            {errors.observations && (
              <p className="mt-1 text-sm text-red-600">{errors.observations.message}</p>
            )}
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