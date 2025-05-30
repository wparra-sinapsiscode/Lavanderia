import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../store/AuthContext';
import { useNotifications } from '../../store/NotificationContext';
import { calculateServicePrice, getAutomaticPriority } from '../../utils';
import { SERVICE_STATUS } from '../../types';
import guestService from '../../services/guest.service';
import hotelService from '../../services/hotel.service';
import serviceService from '../../services/service.service';
import userService from '../../services/user.service';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';

const GuestRegistrationForm = ({ onClose, onServiceCreated }) => {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [repartidores, setRepartidores] = useState([]);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      guestName: '',
      hotelId: '',
      repartidorId: '',
      bagCount: 1,
      observations: '',
      priority: 'auto'
    }
  });

  const watchedFields = watch();

  useEffect(() => {
    fetchInitialData();
  }, []);
  
  const fetchInitialData = async () => {
    try {
      // Cargar hoteles desde la API
      const hotelsResponse = await hotelService.getAllHotels();
      if (hotelsResponse.success && hotelsResponse.data) {
        setHotels(hotelsResponse.data);
      } else {
        throw new Error('No se pudieron cargar los hoteles');
      }
      
      // Cargar repartidores desde la API
      const repartidoresResponse = await userService.getRepartidores({ active: true });
      if (repartidoresResponse.success && repartidoresResponse.data) {
        console.log('Repartidores cargados de la API:', repartidoresResponse.data);
        setRepartidores(repartidoresResponse.data);
      } else {
        throw new Error('No se pudieron cargar los repartidores');
      }
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      
      // Mostrar error específico
      showNotification({
        type: 'error',
        message: `Error al cargar datos: ${error.message || 'Error desconocido'}`
      });
      
      // Inicializar con arrays vacíos en caso de error
      setHotels([]);
      setRepartidores([]);
    }
  };

  useEffect(() => {
    if (watchedFields.hotelId) {
      const hotel = hotels.find(h => h.id === watchedFields.hotelId);
      setSelectedHotel(hotel);
      
      // Auto-complete guest name with hotel contact person
      if (hotel && hotel.contactPerson) {
        setValue('guestName', hotel.contactPerson);
      }
      
      if (hotel && watchedFields.bagCount) {
        // Estimate price based on average weight per bag (5kg) and bag count
        const estimatedWeight = watchedFields.bagCount * 5;
        const price = calculateServicePrice(
          estimatedWeight,
          hotel.pricePerKg
        );
        setEstimatedPrice(price);
      }
    }
  }, [watchedFields.hotelId, watchedFields.bagCount, hotels, setValue]);

  // Las etiquetas ahora serán generadas por el backend

  const onSubmit = async (data) => {
    try {
      if (!selectedHotel) {
        showNotification({
          type: 'error',
          message: 'Debe seleccionar un hotel'
        });
        return;
      }

      // Validar inventario mediante API
      const inventoryResponse = await guestService.validateInventory(
        selectedHotel.id, 
        parseInt(data.bagCount)
      );
      
      const inventoryValid = inventoryResponse.success && inventoryResponse.data?.valid;
      if (!inventoryValid) {
        showNotification({
          type: 'error',
          message: inventoryResponse.data?.message || `Inventario insuficiente para ${data.bagCount} bolsas`
        });
        return;
      }

      // Obtener repartidor seleccionado
      const assignedRepartidor = repartidores.find(r => r.id === data.repartidorId);
      if (!assignedRepartidor) {
        showNotification({
          type: 'error',
          message: 'Debe seleccionar un repartidor válido'
        });
        return;
      }
      
      // Determinar prioridad final (manual o automática)
      let finalPriority;
      if (data.priority === 'auto') {
        finalPriority = getAutomaticPriority(data.observations);
      } else {
        finalPriority = data.priority;
      }

      // Generar hora estimada de recogida (día siguiente entre 9-11 AM)
      const estimatedPickupDate = new Date();
      estimatedPickupDate.setDate(estimatedPickupDate.getDate() + 1);
      estimatedPickupDate.setHours(9, 0, 0, 0); // 9:00 AM fijo para evitar datos aleatorios

      // Preparar datos del servicio
      const serviceData = {
        guestName: data.guestName,
        roomNumber: 'N/A', // Recogida en hotel, sin habitación específica
        hotelId: selectedHotel.id,
        bagCount: parseInt(data.bagCount),
        observations: data.observations || '',
        priority: finalPriority,
        estimatedPickupDate: estimatedPickupDate.toISOString(),
        repartidorId: assignedRepartidor.id,
        pickupTimeSlot: '9:00 - 11:00', // Horario fijo para evitar datos aleatorios
        specialInstructions: ''
      };

      // Crear servicio mediante API
      const guestResponse = await guestService.registerGuestWithService(serviceData);
      
      if (!guestResponse.success) {
        throw new Error(guestResponse.message || 'Error al registrar el servicio');
      }
      
      const newService = guestResponse.data.service;
      
      // Mostrar notificación de éxito
      const repartidorInfo = `Asignado a ${assignedRepartidor.name} (Zona ${assignedRepartidor.zone}).`;
      
      showNotification({
        type: 'success',
        message: `Orden para ${data.guestName} creada exitosamente. ${data.bagCount} bolsas para recoger. ${repartidorInfo}`
      });

      if (onServiceCreated) {
        onServiceCreated(newService);
      }

      reset();
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Error al crear orden de recojo:', err);
      showNotification({
        type: 'error',
        message: `Error al crear orden: ${err.message || 'Error desconocido'}`
      });
    }
  };

  return (
    <Card>
      <Card.Header>
        <h3 className="text-lg font-semibold text-gray-900">
          Crear Orden de Recojo
        </h3>
        <p className="text-sm text-gray-600">
          Crear nueva orden de recojo para hotel
        </p>
      </Card.Header>
      <Card.Content>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Hotel Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hotel <span className="text-red-500">*</span>
            </label>
            <select
              {...register('hotelId', {
                required: 'Debe seleccionar un hotel'
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Seleccionar hotel...</option>
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {typeof hotel === 'object' && hotel.name ? `${hotel.name} - ${hotel.bagInventory} bolsas disponibles` : hotel}
                </option>
              ))}
            </select>
            {errors.hotelId && (
              <p className="text-sm text-red-600 mt-1">{errors.hotelId.message}</p>
            )}
          </div>

          {/* Contact Name */}
          <Input
            label="Contacto del Hotel"
            {...register('guestName', {
              required: 'El nombre del contacto es requerido',
              minLength: {
                value: 2,
                message: 'El nombre debe tener al menos 2 caracteres'
              }
            })}
            error={errors.guestName?.message}
            placeholder="Se autocompletará con el contacto del hotel"
            required
          />

          {/* Repartidor Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asignar a Repartidor <span className="text-red-500">*</span>
            </label>
            <select
              {...register('repartidorId', {
                required: 'Debe asignar un repartidor'
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Seleccionar repartidor...</option>
              {repartidores.map((repartidor) => (
                <option key={repartidor.id} value={repartidor.id}>
                  {repartidor.name} - Zona {repartidor.zone}
                </option>
              ))}
            </select>
            {errors.repartidorId && (
              <p className="text-sm text-red-600 mt-1">{errors.repartidorId.message}</p>
            )}
          </div>

          {/* Bag Count and Price Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bag Count */}
            <div>
              <Input
                label="Cantidad de Bolsas (Estimada)"
                type="number"
                min="1"
                max={selectedHotel?.bagInventory || 999}
                {...register('bagCount', {
                  required: 'La cantidad de bolsas es requerida',
                  min: {
                    value: 1,
                    message: 'Debe entregar al menos 1 bolsa'
                  },
                  max: {
                    value: selectedHotel?.bagInventory || 999,
                    message: `No hay suficientes bolsas en inventario (máx: ${selectedHotel?.bagInventory || 0})`
                  }
                })}
                error={errors.bagCount?.message}
                required
              />
              <p className="text-xs text-gray-600 mt-1">
                💡 <strong>Nota:</strong> El repartidor puede ajustar esta cantidad al momento del recojo
              </p>
            </div>

            {/* Price Estimation */}
            {selectedHotel && estimatedPrice > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Precio Estimado
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Basado en {watchedFields.bagCount * 5} kg estimados
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    S/ {estimatedPrice.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>


          {/* Priority Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prioridad <span className="text-red-500">*</span>
            </label>
            <select
              {...register('priority', {
                required: 'Debe seleccionar una prioridad'
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="auto">Automática (basada en observaciones)</option>
              <option value="high">🔴 Alta - Urgente</option>
              <option value="medium">🟡 Media - Normal</option>
              <option value="low">🟢 Baja - Sin prisa</option>
            </select>
            {errors.priority && (
              <p className="text-sm text-red-600 mt-1">{errors.priority.message}</p>
            )}
            <p className="text-xs text-gray-600 mt-1">
              💡 Si selecciona "Automática", el sistema detectará urgencia en las observaciones
            </p>
          </div>

          {/* Observations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              {...register('observations')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Instrucciones especiales, tipo de ropa, urgencia, etc."
            />
          </div>

          {/* Hotel Info Display */}
          {selectedHotel && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Información del Hotel</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Contacto:</p>
                  <p className="font-medium">{typeof selectedHotel === 'object' ? selectedHotel.contactPerson : ''}</p>
                </div>
                <div>
                  <p className="text-gray-600">Teléfono:</p>
                  <p className="font-medium">{typeof selectedHotel === 'object' ? selectedHotel.phone : ''}</p>
                </div>
                <div>
                  <p className="text-gray-600">Zona:</p>
                  <p className="font-medium">{typeof selectedHotel === 'object' ? selectedHotel.zone : ''}</p>
                </div>
                <div>
                  <p className="text-gray-600">Precio por kg:</p>
                  <p className="font-medium">S/ {typeof selectedHotel === 'object' ? selectedHotel.pricePerKg : ''}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex space-x-4">
            <Button type="submit" className="flex-1">
              Crear Orden de Recojo
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

export default GuestRegistrationForm;