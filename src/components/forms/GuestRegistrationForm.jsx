import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../store/AuthContext';
import { useNotifications } from '../../store/NotificationContext';
import { calculateServicePrice, getAutomaticPriority } from '../../utils';
import { SERVICE_STATUS } from '../../types';
import { ZONES } from '../../constants';
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
  const [suggestedRepartidor, setSuggestedRepartidor] = useState(null);
  // Estado para controlar si el campo de contacto debe bloquearse
  const [contactFieldLocked, setContactFieldLocked] = useState(false);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      guestName: '',
      hotelId: '',
      repartidorId: '',
      bagCount: 1,
      roomNumber: '', // Nuevo campo para número de habitación
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

  // Estado para evitar mostrar la notificación en el primer renderizado
  const [initialRender, setInitialRender] = useState(true);
  
  // Efecto separado para cuando cambie el hotel
  useEffect(() => {
    if (watchedFields.hotelId) {
      const hotel = hotels.find(h => h.id === watchedFields.hotelId);
      setSelectedHotel(hotel);
      
      // Auto-complete guest name with hotel contact person
      if (hotel && hotel.contactPerson) {
        setValue('guestName', hotel.contactPerson);
        
        // Bloquear el campo de contacto cuando se autocompleta, pero solo si no estaba bloqueado antes
        if (!contactFieldLocked) {
          setContactFieldLocked(true);
        }
      }
      
      // Ya no auto-seleccionamos un repartidor específico, ahora dejamos
      // que el servicio se asigne a la zona del hotel y cualquier repartidor
      // de esa zona podrá tomar el servicio.
      if (hotel && hotel.zone) {
        // Limpiar cualquier repartidor que pudiera estar seleccionado
        setValue('repartidorId', '');
        setSuggestedRepartidor(null);
        
        // Mostrar notificación sobre la zona a la que se asignará el servicio
        if (!initialRender) {
          setTimeout(() => {
            showNotification({
              type: 'info',
              message: `El servicio se asignará a la zona ${hotel.zone}. Cualquier repartidor de esta zona podrá tomarlo.`
            });
          }, 0);
        }
      }
    }
    
    // Después del primer efecto, ya no estamos en el renderizado inicial
    if (initialRender) {
      setInitialRender(false);
    }
  }, [watchedFields.hotelId, hotels, repartidores, setValue, contactFieldLocked, initialRender]);
  
  // Efecto separado para cálculo de precio cuando cambie bagCount
  useEffect(() => {
    if (selectedHotel && watchedFields.bagCount) {
      // Estimate price based on average weight per bag (5kg) and bag count
      const estimatedWeight = watchedFields.bagCount * 5;
      const price = calculateServicePrice(
        estimatedWeight,
        selectedHotel.pricePerKg
      );
      setEstimatedPrice(price);
    }
  }, [watchedFields.bagCount, selectedHotel]);

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
      // Asegurar que bagCount sea un número entero válido
      const bagCount = parseInt(data.bagCount, 10);
      if (isNaN(bagCount) || bagCount <= 0) {
        showNotification({
          type: 'error',
          message: 'La cantidad de bolsas debe ser un número válido mayor a 0'
        });
        return;
      }
      
      // Asegurar que el hotelId sea un string
      const hotelId = String(selectedHotel.id).trim();
      console.log('Datos para validación de inventario:', {
        hotelId: hotelId,
        bagCount: bagCount,
        hotelSeleccionado: selectedHotel
      });
      
      const inventoryResponse = await guestService.validateInventory(hotelId, bagCount);
      console.log('Respuesta completa de validación:', inventoryResponse);
      
      // Verificar la respuesta correctamente
      if (!inventoryResponse.success) {
        showNotification({
          type: 'error',
          message: inventoryResponse.message || `Error al validar inventario: ${inventoryResponse.error || 'Error desconocido'}`
        });
        return;
      }
      
      // Verificar que hay suficiente inventario
      const hasEnoughInventory = inventoryResponse.data?.inventory?.hasEnoughInventory;
      if (!hasEnoughInventory) {
        const available = inventoryResponse.data?.inventory?.available || 0;
        showNotification({
          type: 'error',
          message: `Inventario insuficiente. Disponible: ${available} bolsas, Solicitado: ${bagCount} bolsas`
        });
        return;
      }

      // Ya no requerimos un repartidor asignado, solo la zona del hotel
      // Los repartidores verán y podrán tomar servicios de su zona
      
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
        roomNumber: data.roomNumber || 'N/A', // Ahora usamos el valor ingresado
        hotelId: String(selectedHotel.id).trim(),
        bagCount: parseInt(data.bagCount),
        observations: data.observations || '',
        // Enviar la prioridad tal como está (ya está en mayúsculas)
        priority: finalPriority,
        estimatedPickupDate: estimatedPickupDate.toISOString(),
        // Ya no enviamos repartidorId, el servicio quedará asignado a la zona
        repartidorId: null,
        pickupTimeSlot: '9:00 - 11:00', // Horario fijo para evitar datos aleatorios
        specialInstructions: ''
      };

      // Log para diagnóstico
      console.log('Datos a enviar para registro de servicio:', serviceData);

      // Crear servicio mediante API
      const guestResponse = await guestService.registerGuestWithService(serviceData);
      console.log('🆕 DEBUG - Respuesta completa de registro de servicio:', guestResponse);
      
      if (guestResponse.success && guestResponse.data && guestResponse.data.service) {
        console.log('🆕 DEBUG - Nuevo servicio creado:', {
          id: guestResponse.data.service.id,
          guestName: guestResponse.data.service.guestName,
          status: guestResponse.data.service.status,
          hasWeight: !!guestResponse.data.service.weight,
          hasPhotos: !!guestResponse.data.service.photos,
          hasSignature: !!guestResponse.data.service.signature
        });
      }
      
      if (!guestResponse.success) {
        const errorMsg = guestResponse.message || 
                        (guestResponse.error ? `Error: ${guestResponse.error}` : 
                        'Error al registrar el servicio');
        throw new Error(errorMsg);
      }
      
      // Verificar que se recibieron datos válidos
      if (!guestResponse.data || !guestResponse.data.service) {
        throw new Error('No se recibieron datos válidos del servicio');
      }
      
      const newService = guestResponse.data.service;
      
      // Mostrar notificación de éxito
      const zoneInfo = `Disponible para repartidores de la zona ${selectedHotel.zone}.`;
      const roomInfo = data.roomNumber ? `Habitación: ${data.roomNumber}.` : '';
      
      showNotification({
        type: 'success',
        message: `Orden para ${data.guestName} creada exitosamente. ${roomInfo} ${data.bagCount} bolsas para recoger. ${zoneInfo}`
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
          <div className="relative">
            <Input
              label={<>Contacto del Hotel <span className="text-red-500">*</span> {contactFieldLocked && <span className="ml-2 text-blue-600 text-xs">(Bloqueado)</span>}</>}
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
              disabled={contactFieldLocked}
              className={contactFieldLocked ? 'bg-gray-100' : ''}
            />
          </div>
          
          {/* Room Number */}
          <div className="relative">
            <Input
              label={<>Número de Habitación <span className="text-red-500">*</span></>}
              {...register('roomNumber', {
                required: 'El número de habitación es requerido'
              })}
              error={errors.roomNumber?.message}
              placeholder="Ej: 101, Suite 3, etc."
              required
            />
          </div>
          
          {/* Botón para desbloquear campo de contacto si está bloqueado */}
          {contactFieldLocked && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setContactFieldLocked(false)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Desbloquear campo de contacto
              </button>
            </div>
          )}

          {/* Campo oculto para el repartidor (ya no es requerido) */}
          <input
            type="hidden"
            {...register('repartidorId')}
          />
          
          {/* Información sobre la asignación por zona */}
          {selectedHotel && selectedHotel.zone && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Asignación por Zona</h4>
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-blue-100 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-blue-800">Zona: {selectedHotel.zone}</p>
                  <p className="text-sm text-blue-600">Este servicio estará disponible para cualquier repartidor de esta zona</p>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-2">Los repartidores de la zona {selectedHotel.zone} podrán ver y tomar este servicio</p>
            </div>
          )}

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
              <option value="ALTA">🔴 Alta - Urgente</option>
              <option value="MEDIA">🟡 Media - Normal</option>
              <option value="NORMAL">🟢 Normal - Sin prisa</option>
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