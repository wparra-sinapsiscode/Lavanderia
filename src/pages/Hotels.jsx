import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import { hotelStorage, auditStorage, serviceStorage } from '../utils/storage';
import { formatCurrency, generateId, validateEmail, validatePhone } from '../utils';
import { determinarZona } from '../constants/zonas-lima';
import { SERVICE_STATUS } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import DireccionConGPS from '../components/ui/DireccionConGPS';
import hotelService from '../services/hotel.service';
import { 
  Building, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Phone, 
  Mail, 
  MapPin,
  Package,
  DollarSign,
  Save,
  X,
  Activity,
  Loader,
  RefreshCw
} from 'lucide-react';

const Hotels = () => {
  const { user, isAdmin } = useAuth();
  const { success, error, warning } = useNotifications();
  const [hotels, setHotels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [addressCoordinates, setAddressCoordinates] = useState({ lat: null, lng: null });
  const [addressValid, setAddressValid] = useState(false);
  const [stats, setStats] = useState({
    totalHotels: 0,
    activeServices: 0,
    totalBags: 0,
    averagePrice: 0
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      contactPerson: '',
      phone: '',
      email: '',
      bagInventory: '',
      pricePerKg: ''
    }
  });

  useEffect(() => {
    if (!isAdmin) return;
    loadHotels();
  }, [isAdmin]);

  const loadHotels = async () => {
    try {
      setLoading(true);
      setApiError(null);
      
      // Intentar obtener datos de la API
      const response = await hotelService.getAllHotels();
      const hotelData = response.data;
      
      setHotels(hotelData);
      calculateStats(hotelData);
    } catch (err) {
      console.error('Error cargando hoteles desde API:', err);
      setApiError('No se pudieron cargar los hoteles. Intente nuevamente.');
      error('Error de conexión', 'No se pudieron cargar los datos de hoteles del servidor');
      
      // Fallback a datos locales si hay un error
      const localHotels = hotelStorage.getHotels();
      if (localHotels && localHotels.length > 0) {
        setHotels(localHotels);
        calculateStats(localHotels);
        warning('Usando datos locales', 'Mostrando datos almacenados localmente');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (hotelsData) => {
    try {
      const services = serviceStorage.getServices() || [];
      
      // Count active services (not completed, cancelled, or delivered)
      const activeStatuses = [
        SERVICE_STATUS.PENDING_PICKUP,
        SERVICE_STATUS.PICKED_UP,
        SERVICE_STATUS.LABELED,
        SERVICE_STATUS.IN_PROCESS,
        SERVICE_STATUS.WASHED,
        SERVICE_STATUS.IRONED,
        SERVICE_STATUS.READY,
        SERVICE_STATUS.PARTIAL_DELIVERY
      ];
      
      const activeServices = services.filter(service => 
        service && service.status && activeStatuses.includes(service.status)
      ).length;

      const totalBags = hotelsData.reduce((sum, hotel) => {
        const bags = Number(hotel?.bagInventory) || 0;
        return sum + bags;
      }, 0);
      
      const totalPrice = hotelsData.reduce((sum, hotel) => {
        const price = Number(hotel?.pricePerKg) || 0;
        return sum + price;
      }, 0);
      
      const averagePrice = hotelsData.length > 0 ? totalPrice / hotelsData.length : 0;

      setStats({
        totalHotels: hotelsData.length,
        activeServices,
        totalBags,
        averagePrice
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
      setStats({
        totalHotels: 0,
        activeServices: 0,
        totalBags: 0,
        averagePrice: 0
      });
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Si tenemos coordenadas válidas del componente DireccionConGPS, las incluimos
      if (addressCoordinates.lat && addressCoordinates.lng) {
        data.latitude = addressCoordinates.lat;
        data.longitude = addressCoordinates.lng;
      }
      
      const hotelData = {
        ...data,
        bagInventory: parseInt(data.bagInventory),
        pricePerKg: parseFloat(data.pricePerKg)
        // Ya no necesitamos añadir zone manualmente, ya viene en data del formulario
      };
      
      // Log para depuración
      console.log('Datos enviados al backend:', hotelData);

      if (editingHotel) {
        // Update existing hotel using API
        try {
          const response = await hotelService.updateHotel(editingHotel.id, hotelData);
          
          if (response.success) {
            // Registrar en el log de auditoría
            auditStorage.addAuditEntry({
              action: 'HOTEL_UPDATED',
              user: user.name,
              details: `Hotel ${data.name} actualizado`
            });

            success('Hotel Actualizado', `${data.name} ha sido actualizado correctamente`);
            setEditingHotel(null);
          }
        } catch (apiError) {
          console.error('Error actualizando hotel en API:', apiError);
          error('Error', apiError.message || 'No se pudo actualizar el hotel');
          
          // Fallback a actualización local
          const updateSuccess = hotelStorage.updateHotel(editingHotel.id, hotelData);
          
          if (updateSuccess) {
            warning('Guardado localmente', 'El hotel se ha actualizado solo localmente');
            auditStorage.addAuditEntry({
              action: 'HOTEL_UPDATED_LOCALLY',
              user: user.name,
              details: `Hotel ${data.name} actualizado localmente (sin conexión)`
            });
          }
        }
      } else {
        // Create new hotel using API
        try {
          const response = await hotelService.createHotel(hotelData);
          
          if (response.success) {
            // Registrar en el log de auditoría
            auditStorage.addAuditEntry({
              action: 'HOTEL_CREATED',
              user: user.name,
              details: `Nuevo hotel ${data.name} creado`
            });

            success('Hotel Creado', `${data.name} ha sido registrado exitosamente`);
          }
        } catch (apiError) {
          console.error('Error creando hotel en API:', apiError);
          error('Error', apiError.message || 'No se pudo crear el hotel');
          
          // Fallback a creación local
          const newHotel = {
            id: generateId(),
            ...hotelData
          };

          const hotels = hotelStorage.getHotels();
          hotels.push(newHotel);
          const saveResult = hotelStorage.setHotels(hotels);

          if (saveResult) {
            warning('Guardado localmente', 'El hotel se ha creado solo localmente');
            auditStorage.addAuditEntry({
              action: 'HOTEL_CREATED_LOCALLY',
              user: user.name,
              details: `Nuevo hotel ${data.name} creado localmente (sin conexión)`
            });
          }
        }
      }

      setShowForm(false);
      reset();
      setAddressCoordinates({ lat: null, lng: null });
      setAddressValid(false);
      loadHotels();
    } catch (err) {
      console.error('Error saving hotel:', err);
      error('Error', 'No se pudo guardar el hotel');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (hotel) => {
    setEditingHotel(hotel);
    setValue('name', hotel.name);
    setValue('address', hotel.address);
    setValue('contactPerson', hotel.contactPerson);
    setValue('phone', hotel.phone);
    setValue('email', hotel.email);
    setValue('bagInventory', hotel.bagInventory);
    setValue('pricePerKg', hotel.pricePerKg);
    
    // Establecer la zona
    const zona = hotel.zone || 'SUR';
    setValue('zone', zona);
    console.log(`Estableciendo zona para hotel en edición: ${zona}`);
    
    // Establecer coordenadas si existen
    if (hotel.latitude && hotel.longitude) {
      setAddressCoordinates({ lat: hotel.latitude, lng: hotel.longitude });
      setAddressValid(true);
      setValue('latitude', hotel.latitude);
      setValue('longitude', hotel.longitude);
      
      // Intentar determinar la zona a partir de la dirección
      if (hotel.address) {
        const zonaDetectada = determinarZona(hotel.address, zona);
        setValue('zone', zonaDetectada);
        console.log(`Zona detectada para dirección existente: ${zonaDetectada}`);
      }
    } else {
      setAddressCoordinates({ lat: null, lng: null });
      setAddressValid(false);
    }
    
    setShowForm(true);
  };

  const handleDelete = async (hotel) => {
    if (window.confirm(`¿Estás seguro de eliminar el hotel ${hotel.name}?`)) {
      try {
        setLoading(true);
        
        // Primero verificamos si el hotel tiene dependencias
        try {
          const dependenciesResponse = await hotelService.checkHotelDependencies(hotel.id);
          
          if (!dependenciesResponse.data.canDelete) {
            const deps = dependenciesResponse.data.dependencies;
            let mensaje = 'No se puede eliminar este hotel porque tiene registros relacionados:\n';
            
            if (deps.services > 0) {
              mensaje += `- Servicios: ${deps.services}\n`;
            }
            if (deps.bagLabels > 0) {
              mensaje += `- Etiquetas de bolsas: ${deps.bagLabels}\n`;
            }
            if (deps.transactions > 0) {
              mensaje += `- Transacciones: ${deps.transactions}\n`;
            }
            
            warning('No se puede eliminar', mensaje);
            return;
          }
          
          // Si no tiene dependencias, procedemos con la eliminación
          const response = await hotelService.deleteHotel(hotel.id);
          
          if (response.success) {
            success('Hotel Eliminado', `${hotel.name} ha sido eliminado exitosamente`);
            loadHotels();
            return;
          }
        } catch (apiError) {
          console.error('Error verificando dependencias o eliminando hotel:', apiError);
          
          // Si hay un error de API, intentamos con la versión local como fallback
          error('Error de conexión', 'No se pudo contactar al servidor');
        }
        
        // Fallback: eliminar localmente si la API falla
        const hotels = hotelStorage.getHotels();
        const updatedHotels = hotels.filter(h => h.id !== hotel.id);
        
        const successLocal = hotelStorage.setHotels(updatedHotels);
        
        if (successLocal) {
          auditStorage.addAuditEntry({
            action: 'HOTEL_DELETED_LOCALLY',
            user: user.name,
            details: `Hotel ${hotel.name} eliminado localmente (sin conexión)`
          });

          warning('Hotel Eliminado Localmente', `${hotel.name} ha sido eliminado solo en este dispositivo`);
          loadHotels();
        }
      } catch (err) {
        console.error('Error eliminando hotel:', err);
        error('Error', 'No se pudo eliminar el hotel');
      } finally {
        setLoading(false);
      }
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingHotel(null);
    setAddressCoordinates({ lat: null, lng: null });
    setAddressValid(false);
    reset();
  };
  
  const handleAddressChange = (addressData) => {
    setValue('address', addressData.direccion);
    setAddressCoordinates(addressData.coordenadas);
    
    if (addressData.coordenadas.lat && addressData.coordenadas.lng) {
      setValue('latitude', addressData.coordenadas.lat);
      setValue('longitude', addressData.coordenadas.lng);
    }
  };
  
  const handleAddressValidChange = (isValid) => {
    setAddressValid(isValid);
  };


  const HotelDetailModal = ({ hotel, onClose }) => {
    if (!hotel) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Detalles del Hotel
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Información General</h4>
                <div>
                  <p className="text-sm font-medium text-gray-500">Nombre</p>
                  <p className="text-lg font-semibold text-gray-900">{hotel.name}</p>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-500">Dirección</p>
                  <p className="text-gray-900">{hotel.address}</p>
                  {hotel.latitude && hotel.longitude && (
                    <p className="text-xs text-gray-500 mt-1">
                      Coordenadas GPS: {hotel.latitude.toFixed(6)}, {hotel.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Información de Contacto</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Persona de Contacto</p>
                    <p className="text-gray-900">{hotel.contactPerson}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Teléfono</p>
                      <p className="text-gray-900">{hotel.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-gray-900">{hotel.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Info */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Información Comercial</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">Inventario de Bolsas</p>
                    <p className="text-2xl font-bold text-blue-900">{hotel.bagInventory}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-green-800">Precio por Kilogramo</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(hotel.pricePerKg)}</p>
                    <p className="text-xs text-green-700 mt-1">Único factor de precio</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4 border-t">
                <Button onClick={() => { onClose(); handleEdit(hotel); }} className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Hotel
                </Button>
                <Button 
                  variant="danger" 
                  onClick={() => { onClose(); handleDelete(hotel); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const HotelCard = ({ hotel }) => (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <Card.Header>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{hotel.name}</h3>
            <p className="text-gray-600 flex items-center mt-1">
              <MapPin className={`h-4 w-4 mr-1 ${hotel.latitude && hotel.longitude ? 'text-green-500' : ''}`} />
              {hotel.address}
              {hotel.latitude && hotel.longitude && (
                <span className="ml-1 text-xs text-green-500">(GPS)</span>
              )}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedHotel(hotel)}>
              Ver
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleEdit(hotel)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        <div className="flex items-center mb-4">
          <Package className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <p className="text-sm text-gray-600">Bolsas Disponibles</p>
            <p className="font-semibold">{hotel.bagInventory}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Contacto</p>
              <p className="font-medium">{hotel.contactPerson}</p>
              <p className="text-sm text-gray-500">{hotel.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Precio</p>
              <p className="font-medium">{formatCurrency(hotel.pricePerKg)}/kg</p>
              <p className="text-xs text-gray-500">Solo por peso</p>
            </div>
          </div>
        </div>
      </Card.Content>
    </Card>
  );

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Acceso Restringido</h2>
        <p className="text-gray-600">Solo los administradores pueden gestionar hoteles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Hoteles
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Administrar hoteles y clientes
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {!loading && (
            <button
              onClick={loadHotels}
              className="p-2 rounded-full hover:bg-gray-100"
              title="Actualizar datos"
            >
              <RefreshCw className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <Button onClick={() => setShowForm(true)} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Hotel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Hoteles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalHotels}</p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Servicios Activos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeServices}</p>
                <p className="text-xs text-gray-500">En proceso</p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bolsas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBags}</p>
                <p className="text-xs text-gray-500">Inventario disponible</p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Precio Promedio</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.averagePrice)}</p>
                <p className="text-xs text-gray-500">Ver detalles en Precios</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Hotel Form */}
      {showForm && (
        <Card>
          <Card.Header>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingHotel ? 'Editar Hotel' : 'Nuevo Hotel'}
              </h3>
              <Button variant="outline" onClick={cancelForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card.Header>
          <Card.Content>
            <form onSubmit={(e) => {
              // Validar que la dirección haya sido geocodificada
              if (!addressValid && !editingHotel) {
                e.preventDefault();
                error('Dirección inválida', 'Por favor seleccione o valide una dirección válida antes de continuar');
                return;
              }
              
              // Asegurar que la zona viene de la detección automática
              // Si estamos editando un hotel y no se ha cambiado la dirección, permitimos usar la zona existente
              if (!addressValid && editingHotel) {
                // Mantener la zona existente para hoteles en edición
                setValue('zone', editingHotel.zone || 'SUR');
              }
              
              handleSubmit(onSubmit)(e);
            }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-1">
                  <Input
                    label="Nombre del Hotel"
                    {...register('name', {
                      required: 'El nombre es requerido',
                      minLength: {
                        value: 2,
                        message: 'El nombre debe tener al menos 2 caracteres'
                      }
                    })}
                    error={errors.name?.message}
                    placeholder="Ej: Hotel Los Delfines"
                    required
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zona <span className="text-red-500">*</span>
                    <span className="text-xs text-blue-600 ml-2">
                      (Se completa automáticamente)
                    </span>
                  </label>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                    <select
                      {...register('zone', {
                        required: 'La zona es requerida'
                      })}
                      className={`block w-full rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                        addressValid ? 'border-green-500 bg-green-50' : 'bg-gray-50'
                      } border-gray-300 cursor-not-allowed`}
                      defaultValue="SUR"
                      disabled
                    >
                      <option value="NORTE">Norte</option>
                      <option value="SUR">Sur</option>
                      <option value="CENTRO">Centro</option>
                      <option value="ESTE">Este</option>
                      <option value="OESTE">Oeste</option>
                    </select>
                  </div>
                  {errors.zone && (
                    <p className="mt-1 text-sm text-red-600">{errors.zone.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    La zona se detecta automáticamente según la dirección y no puede modificarse manualmente.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <DireccionConGPS
                    initialValue={editingHotel?.address || ''}
                    onChange={handleAddressChange}
                    onValidChange={handleAddressValidChange}
                    onZoneChange={(zona) => {
                      setValue('zone', zona);
                      console.log(`Zona detectada automáticamente: ${zona}`);
                    }}
                    required={true}
                    label="Dirección"
                    placeholder="Ej: Malecón de la Reserva 555, Miraflores"
                    defaultZone={editingHotel?.zone || 'SUR'}
                  />
                  {!addressValid && (
                    <p className="mt-1 text-sm text-amber-600">
                      Por favor seleccione una dirección válida del listado de sugerencias o valide manualmente
                    </p>
                  )}
                  <input type="hidden" {...register('address')} />
                  <input type="hidden" {...register('latitude')} />
                  <input type="hidden" {...register('longitude')} />
                </div>

                <Input
                  label="Persona de Contacto"
                  {...register('contactPerson', {
                    required: 'La persona de contacto es requerida'
                  })}
                  error={errors.contactPerson?.message}
                  placeholder="Ej: Carmen Ruiz"
                  required
                />

                <Input
                  label="Teléfono"
                  {...register('phone', {
                    required: 'El teléfono es requerido',
                    validate: validatePhone
                  })}
                  error={errors.phone?.message}
                  placeholder="Ej: 987654321"
                  required
                />

                <Input
                  label="Email"
                  type="email"
                  {...register('email', {
                    required: 'El email es requerido',
                    validate: validateEmail
                  })}
                  error={errors.email?.message}
                  placeholder="Ej: contacto@hotel.com"
                  required
                />

                <Input
                  label="Inventario de Bolsas"
                  type="number"
                  min="0"
                  {...register('bagInventory', {
                    required: 'El inventario de bolsas es requerido',
                    min: {
                      value: 0,
                      message: 'El inventario no puede ser negativo'
                    }
                  })}
                  error={errors.bagInventory?.message}
                  placeholder="Ej: 100"
                  required
                />

                <Input
                  label="Precio por Kilogramo (S/)"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('pricePerKg', {
                    required: 'El precio por kg es requerido',
                    min: {
                      value: 0,
                      message: 'El precio debe ser mayor a 0'
                    }
                  })}
                  error={errors.pricePerKg?.message}
                  placeholder="Ej: 8.50"
                  required
                />

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center">
                    <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Sistema de Precios por Peso</p>
                      <p className="text-xs text-blue-700">
                        El precio se calcula únicamente por kilogramos. Las bolsas son solo para control operativo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button type="submit" className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {editingHotel ? 'Actualizar Hotel' : 'Crear Hotel'}
                </Button>
                <Button type="button" variant="outline" onClick={cancelForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card.Content>
        </Card>
      )}

      {/* Loading and Error States */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader className="h-6 w-6 text-blue-500 animate-spin" />
            <span className="text-gray-600">Cargando hoteles...</span>
          </div>
        </div>
      )}
      
      {apiError && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{apiError}</p>
              <button 
                onClick={loadHotels} 
                className="text-sm font-medium underline mt-1 text-red-600 hover:text-red-800"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hotels Grid */}
      {!loading && hotels.length === 0 ? (
        <Card>
          <Card.Content className="p-12 text-center">
            <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay hoteles registrados</h3>
            <p className="text-gray-600 mb-4">Comienza agregando tu primer hotel</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer Hotel
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} />
          ))}
        </div>
      )}

      {/* Hotel Detail Modal */}
      {selectedHotel && (
        <HotelDetailModal
          hotel={selectedHotel}
          onClose={() => setSelectedHotel(null)}
        />
      )}
    </div>
  );
};

export default Hotels;