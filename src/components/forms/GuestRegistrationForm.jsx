import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../store/AuthContext';
import { useNotifications } from '../../store/NotificationContext';
import { hotelStorage, serviceStorage, auditStorage, bagLabelStorage, storage } from '../../utils/storage';
import { generateId, calculateServicePrice, assignRepartidorByZone, getAutomaticPriority } from '../../utils';
import { SERVICE_STATUS } from '../../types';
import { APP_CONFIG } from '../../constants';
import guestService from '../../services/guest.service';
import hotelService from '../../services/hotel.service';
import serviceService from '../../services/service.service';
import bagLabelService from '../../services/bagLabel.service';
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
      // Try to load hotels from API
      const hotelsResponse = await hotelService.getAllHotels();
      if (hotelsResponse.success && hotelsResponse.data) {
        setHotels(hotelsResponse.data);
      } else {
        // Fallback to local storage
        const hotelData = hotelStorage.getHotels();
        setHotels(hotelData);
      }
      
      // Try to load repartidores from API - will need userService but using storage for now
      try {
        // In future will be: const usersResponse = await userService.getUsersByRole('REPARTIDOR');
        // For now, use local storage
        const allUsers = storage.get(APP_CONFIG.STORAGE_KEYS.USERS) || [];
        const repartidoresList = allUsers.filter(user => user.role === 'repartidor');
        setRepartidores(repartidoresList);
      } catch (error) {
        console.error('Error loading repartidores:', error);
        // Fallback to local storage
        const allUsers = storage.get(APP_CONFIG.STORAGE_KEYS.USERS) || [];
        const repartidoresList = allUsers.filter(user => user.role === 'repartidor');
        setRepartidores(repartidoresList);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      showNotification({
        type: 'error',
        message: 'Error al cargar datos iniciales. Usando datos locales.'
      });
      
      // Fallback to local storage
      const hotelData = hotelStorage.getHotels();
      setHotels(hotelData);
      
      const allUsers = storage.get(APP_CONFIG.STORAGE_KEYS.USERS) || [];
      const repartidoresList = allUsers.filter(user => user.role === 'repartidor');
      setRepartidores(repartidoresList);
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

  const generateBagLabels = (hotelName, serviceId, bagCount) => {
    const labels = [];
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const hotelCode = hotelName.substring(0, 3).toUpperCase();
    
    for (let i = 1; i <= bagCount; i++) {
      const timeStr = today.toTimeString().slice(0, 5).replace(':', '');
      const bagNumber = i.toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      
      const label = `${hotelCode}-${dateStr}-${timeStr}-${bagNumber}-${random}`;
      
      labels.push({
        id: generateId(),
        serviceId: serviceId,
        hotelId: null, // Will be set when service is created
        hotelName: hotelName,
        label: label,
        bagNumber: i,
        registeredBy: user.id,
        registeredByName: user.name,
        timestamp: new Date().toISOString(),
        status: 'generated',
        generatedAt: 'hotel'
      });
    }
    
    return labels;
  };

  const onSubmit = async (data) => {
    try {
      if (!selectedHotel) {
        showNotification({
          type: 'error',
          message: 'Debe seleccionar un hotel'
        });
        return;
      }

      // Validate inventory via API if possible
      let inventoryValid = false;
      try {
        const inventoryResponse = await guestService.validateInventory(
          selectedHotel.id, 
          parseInt(data.bagCount)
        );
        
        inventoryValid = inventoryResponse.success && inventoryResponse.data?.valid;
        if (!inventoryValid && inventoryResponse.data?.message) {
          showNotification({
            type: 'error',
            message: inventoryResponse.data.message
          });
          return;
        }
      } catch (error) {
        // If API validation fails, fallback to local validation
        console.error('Error validating inventory via API:', error);
        inventoryValid = selectedHotel.bagInventory >= parseInt(data.bagCount);
        
        if (!inventoryValid) {
          showNotification({
            type: 'error',
            message: `${selectedHotel.name} solo tiene ${selectedHotel.bagInventory} bolsas disponibles`
          });
          return;
        }
      }

      // Get manually selected repartidor
      const assignedRepartidor = repartidores.find(r => r.id === data.repartidorId);
      
      // Determine final priority (manual or automatic)
      let finalPriority;
      if (data.priority === 'auto') {
        finalPriority = getAutomaticPriority(data.observations);
      } else {
        finalPriority = data.priority;
      }

      // Generate estimated pickup date (next day between 9-11 AM)
      const estimatedPickupDate = new Date();
      estimatedPickupDate.setDate(estimatedPickupDate.getDate() + 1);
      estimatedPickupDate.setHours(9 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0);

      // Prepare service data
      const serviceData = {
        guestName: data.guestName,
        roomNumber: 'N/A', // Hotel pickup, no specific room
        hotelId: selectedHotel.id,
        bagCount: parseInt(data.bagCount),
        observations: data.observations || '',
        priority: finalPriority,
        estimatedPickupDate: estimatedPickupDate.toISOString(),
        repartidorId: assignedRepartidor ? assignedRepartidor.id : null,
        pickupTimeSlot: `${9 + Math.floor(Math.random() * 3)}:00 - ${11 + Math.floor(Math.random() * 3)}:00`,
        specialInstructions: ''
      };

      // Try to create service with API
      let newService = null;
      let serviceCreated = false;
      let serviceBagLabels = [];
      
      try {
        // Register guest with service in one call
        const guestResponse = await guestService.registerGuestWithService(serviceData);
        
        if (guestResponse.success && guestResponse.data) {
          newService = guestResponse.data.service;
          serviceCreated = true;
          
          // Get any bag labels that were created by the API
          if (guestResponse.data.labels && guestResponse.data.labels.length > 0) {
            serviceBagLabels = guestResponse.data.labels;
          }
        }
      } catch (apiError) {
        console.error('Error creating service via API:', apiError);
        serviceCreated = false;
      }
      
      // If API call failed, fallback to local storage
      if (!serviceCreated) {
        // Create new service with automatic assignments (for local storage)
        newService = {
          id: generateId(),
          guestName: data.guestName,
          roomNumber: 'N/A', // Hotel pickup, no specific room
          hotel: selectedHotel.name,
          hotelId: selectedHotel.id,
          bagCount: parseInt(data.bagCount),
          weight: null, // Will be filled during pickup
          observations: data.observations || '',
          specialInstructions: '',
          priority: finalPriority,
          pickupDate: null,
          estimatedPickupDate: estimatedPickupDate.toISOString(),
          deliveryDate: null,
          estimatedDeliveryDate: null,
          status: SERVICE_STATUS.PENDING_PICKUP,
          photos: [],
          signature: '',
          collectorName: '',
          geolocation: { lat: 0, lng: 0 },
          repartidor: assignedRepartidor ? assignedRepartidor.name : '',
          repartidorId: assignedRepartidor ? assignedRepartidor.id : '',
          partialDeliveryPercentage: null,
          price: 0, // Will be calculated during pickup
          pickupTimeSlot: `${9 + Math.floor(Math.random() * 3)}:00 - ${11 + Math.floor(Math.random() * 3)}:00`,
          customerNotes: '',
          internalNotes: assignedRepartidor ? 
            `Asignado manualmente a ${assignedRepartidor.name} (Zona ${assignedRepartidor.zone})` : 
            'Sin repartidor asignado',
          timestamp: new Date().toISOString()
        };

        // Generate bag labels for this service
        const bagLabels = generateBagLabels(selectedHotel.name, newService.id, parseInt(data.bagCount));
        
        // Update labels with hotelId
        bagLabels.forEach(label => {
          label.hotelId = selectedHotel.id;
        });

        // Save service locally
        const serviceSuccess = serviceStorage.addService(newService);
        
        // Save bag labels locally
        let labelsSuccess = true;
        if (serviceSuccess) {
          bagLabels.forEach(label => {
            const labelSaved = bagLabelStorage.addBagLabel(label);
            if (!labelSaved) {
              labelsSuccess = false;
            }
          });
          
          // Set for display
          serviceBagLabels = bagLabels;
        }
        
        serviceCreated = serviceSuccess && labelsSuccess;
        
        if (serviceCreated) {
          // Update hotel inventory (subtract bags given to guest)
          const updatedInventory = selectedHotel.bagInventory - parseInt(data.bagCount);
          hotelStorage.updateHotel(selectedHotel.id, { bagInventory: updatedInventory });

          // Add local audit log
          const priorityText = finalPriority === 'high' ? ' [URGENTE]' : 
                             finalPriority === 'medium' ? ' [NORMAL]' : 
                             finalPriority === 'low' ? ' [BAJA PRIORIDAD]' : '';
          
          auditStorage.addAuditEntry({
            action: 'PICKUP_ORDER_CREATED',
            user: user.name,
            details: `Creó orden de recojo para ${data.guestName} en ${selectedHotel.name}. ${data.bagCount} bolsas para recoger.${priorityText}`
          });
        }
      }
      
      // Handle success (both API and local storage paths)
      if (serviceCreated) {
        const repartidorInfo = assignedRepartidor 
          ? `Asignado a ${assignedRepartidor.name} (Zona ${assignedRepartidor.zone}).`
          : 'Sin repartidor asignado.';
        
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
      } else {
        showNotification({
          type: 'error',
          message: 'No se pudo crear la orden de recojo'
        });
      }
    } catch (err) {
      console.error('Error creating pickup order:', err);
      showNotification({
        type: 'error',
        message: 'Ocurrió un error al crear la orden de recojo'
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