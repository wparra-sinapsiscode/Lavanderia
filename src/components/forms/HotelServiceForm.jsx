import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../store/NotificationContext';
import hotelService from '../../services/hotel.service';
import userService from '../../services/user.service';
import serviceService from '../../services/service.service';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

const HotelServiceForm = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [repartidores, setRepartidores] = useState([]);
  const [filteredRepartidores, setFilteredRepartidores] = useState([]);
  
  const [formData, setFormData] = useState({
    hotelId: '',
    contactPerson: '',
    roomNumber: '', // Nuevo campo para número de habitación
    repartidorId: '',
    bagCount: 1,
    priority: 'NORMAL',
    observations: '' // Cambiado de specialInstructions a observations
  });
  
  const priorities = [
    { value: 'ALTA', label: 'Alta' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'BAJA', label: 'Baja' }
  ];
  
  // Cargar datos iniciales
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  // Filtrar repartidores por zona cuando se selecciona un hotel
  useEffect(() => {
    if (formData.hotelId && hotels.length > 0 && repartidores.length > 0) {
      const selectedHotel = hotels.find(hotel => hotel.id === formData.hotelId);
      if (selectedHotel) {
        // Actualizar persona de contacto
        setFormData(prev => ({
          ...prev,
          contactPerson: selectedHotel.contactPerson || 'Sin contacto asignado'
        }));
        
        // Filtrar repartidores por zona
        const hotelZone = selectedHotel.zone;
        const matchingRepartidores = repartidores.filter(r => r.zone === hotelZone);
        setFilteredRepartidores(matchingRepartidores);
        
        // Limpiar repartidor seleccionado si no está en la zona
        if (formData.repartidorId) {
          const isInZone = matchingRepartidores.some(r => r.id === formData.repartidorId);
          if (!isInZone) {
            setFormData(prev => ({
              ...prev,
              repartidorId: ''
            }));
          }
        }
      }
    } else {
      setFilteredRepartidores([]);
      setFormData(prev => ({
        ...prev,
        contactPerson: '',
        repartidorId: ''
      }));
    }
  }, [formData.hotelId, hotels, repartidores]);
  
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Cargar hoteles
      const hotelsResponse = await hotelService.getAllHotels();
      if (hotelsResponse.success && hotelsResponse.data) {
        setHotels(hotelsResponse.data);
      } else {
        throw new Error('No se pudieron cargar los hoteles');
      }
      
      // Cargar repartidores activos
      const repartidoresResponse = await userService.getRepartidores({ active: true });
      if (repartidoresResponse.success && repartidoresResponse.data) {
        setRepartidores(repartidoresResponse.data);
      } else {
        throw new Error('No se pudieron cargar los repartidores');
      }
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      showNotification({
        type: 'error',
        message: `Error al cargar datos: ${error.message || 'Error desconocido'}`
      });
      
      // Inicializar con arrays vacíos en caso de error
      setHotels([]);
      setRepartidores([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Para bagCount, convertir a entero
    if (name === 'bagCount') {
      const numValue = parseInt(value, 10);
      setFormData(prev => ({
        ...prev,
        [name]: isNaN(numValue) ? '' : numValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const validateForm = () => {
    if (!formData.hotelId) {
      showNotification({
        type: 'error',
        message: 'Debe seleccionar un hotel'
      });
      return false;
    }
    
    if (!formData.roomNumber || formData.roomNumber.trim() === '') {
      showNotification({
        type: 'error',
        message: 'Debe ingresar un número de habitación'
      });
      return false;
    }
    
    // Repartidor es opcional - se asignará cuando se genere la ruta
    // if (!formData.repartidorId) {
    //   showNotification({
    //     type: 'error',
    //     message: 'Debe seleccionar un repartidor'
    //   });
    //   return false;
    // }
    
    const bagCount = parseInt(formData.bagCount, 10);
    if (isNaN(bagCount) || bagCount <= 0) {
      showNotification({
        type: 'error',
        message: 'La cantidad de bolsas debe ser un número válido mayor a 0'
      });
      return false;
    }
    
    if (!formData.observations || formData.observations.trim() === '') {
      showNotification({
        type: 'error',
        message: 'Las observaciones son requeridas'
      });
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Normalizar datos para el backend
      const serviceData = {
        hotelId: formData.hotelId,
        roomNumber: formData.roomNumber,
        repartidorId: formData.repartidorId,
        bagCount: parseInt(formData.bagCount, 10),
        priority: formData.priority,
        observations: formData.observations,
        isHotelService: true // Indicar que es un servicio para hotel sin huésped específico
      };
      
      // Validar disponibilidad de inventario
      const inventoryResponse = await hotelService.validateInventory(
        formData.hotelId, 
        serviceData.bagCount
      );
      
      if (!inventoryResponse.success) {
        throw new Error(inventoryResponse.message || 'Error al validar inventario');
      }
      
      // Crear el servicio
      const response = await serviceService.createHotelService(serviceData);
      
      if (response.success) {
        showNotification({
          type: 'success',
          message: 'Servicio de hotel creado exitosamente'
        });
        
        // Redireccionar a la página de servicios
        navigate('/servicios');
      } else {
        throw new Error(response.message || 'Error al crear el servicio');
      }
    } catch (error) {
      console.error('Error al crear servicio de hotel:', error);
      showNotification({
        type: 'error',
        message: `Error: ${error.message || 'Error desconocido al crear el servicio'}`
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Card title="Creando Servicio para Hotel">
        <div className="flex justify-center p-6">
          <p>Cargando datos...</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card title="Crear Servicio para Hotel">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Selección de Hotel */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hotel *
          </label>
          <select
            name="hotelId"
            value={formData.hotelId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            <option value="">Seleccionar Hotel</option>
            {hotels.map(hotel => (
              <option key={hotel.id} value={hotel.id}>
                {hotel.name} ({hotel.zone})
              </option>
            ))}
          </select>
        </div>
        
        {/* Persona de Contacto (solo lectura) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Persona de Contacto *
          </label>
          <Input
            type="text"
            name="contactPerson"
            value={formData.contactPerson}
            readOnly
            placeholder="Se mostrará al seleccionar un hotel"
          />
        </div>
        
        {/* Número de Habitación */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de Habitación *
          </label>
          <Input
            type="text"
            name="roomNumber"
            value={formData.roomNumber}
            onChange={handleChange}
            placeholder="Ingrese el número de habitación"
            required
          />
        </div>
        
        {/* Selección de Repartidor */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Repartidor *
          </label>
          <select
            name="repartidorId"
            value={formData.repartidorId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            <option value="">Seleccionar Repartidor</option>
            {filteredRepartidores.map(repartidor => (
              <option key={repartidor.id} value={repartidor.id}>
                {repartidor.name} ({repartidor.zone})
              </option>
            ))}
          </select>
          {formData.hotelId && filteredRepartidores.length === 0 && (
            <p className="text-sm text-orange-600 mt-1">
              No hay repartidores disponibles en la zona del hotel seleccionado
            </p>
          )}
        </div>
        
        {/* Cantidad de Bolsas */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad de Bolsas *
          </label>
          <Input
            type="number"
            name="bagCount"
            value={formData.bagCount}
            onChange={handleChange}
            min="1"
            required
          />
        </div>
        
        {/* Prioridad */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prioridad *
          </label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            {priorities.map(priority => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Observaciones */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones *
          </label>
          <textarea
            name="observations"
            value={formData.observations}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows="3"
            required
          />
        </div>
        
        {/* Botones */}
        <div className="flex justify-end space-x-2 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/servicios')}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            isLoading={submitting}
          >
            {submitting ? 'Creando...' : 'Crear Servicio'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default HotelServiceForm;