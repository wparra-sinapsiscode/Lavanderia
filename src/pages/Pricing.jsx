import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import { hotelStorage, auditStorage } from '../utils/storage';
import { formatCurrency } from '../utils';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { DollarSign, Edit, Save, X, Building } from 'lucide-react';

const Pricing = () => {
  const { user, isAdmin } = useAuth();
  const { success, error } = useNotifications();
  const [hotels, setHotels] = useState([]);
  const [editingHotel, setEditingHotel] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    loadHotels();
  }, []);

  const loadHotels = () => {
    const hotelData = hotelStorage.getHotels();
    setHotels(hotelData);
  };

  const startEditing = (hotel) => {
    setEditingHotel(hotel);
    reset({
      pricePerKg: hotel.pricePerKg
    });
  };

  const cancelEditing = () => {
    setEditingHotel(null);
    reset();
  };

  const onSubmit = async (data) => {
    try {
      const updateResult = hotelStorage.updateHotel(editingHotel.id, {
        pricePerKg: parseFloat(data.pricePerKg)
      });

      if (updateResult) {
        // Update local state
        setHotels(prev => prev.map(h => 
          h.id === editingHotel.id 
            ? { ...h, pricePerKg: parseFloat(data.pricePerKg) }
            : h
        ));

        // Add audit log
        auditStorage.addAuditEntry({
          action: 'PRICING_UPDATE',
          user: user.name,
          details: `Actualizó precio de ${editingHotel.name}: S/${data.pricePerKg}/kg`
        });

        success(
          'Precio Actualizado',
          `Precio de ${editingHotel.name} actualizado correctamente`
        );

        setEditingHotel(null);
        reset();
        loadHotels();
      } else {
        error('Error', 'No se pudo actualizar el precio');
      }
    } catch (err) {
      console.error('Error updating pricing:', err);
      error('Error', 'Ocurrió un error al actualizar el precio');
    }
  };

  const PricingCard = ({ hotel }) => {
    const isEditing = editingHotel?.id === hotel.id;

    return (
      <Card key={hotel.id}>
        <Card.Header>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{hotel.name}</h3>
              <p className="text-sm text-gray-600">{hotel.contactPerson}</p>
              <p className="text-sm text-gray-500">{hotel.zone}</p>
            </div>
            {isAdmin && !isEditing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => startEditing(hotel)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card.Header>
        <Card.Content>
          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                required
              />

              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> El precio se calcula únicamente por peso (kg). 
                  Las bolsas son solo para control y medición.
                </p>
              </div>

              <div className="flex space-x-2">
                <Button type="submit" size="sm" className="flex-1">
                  <Save className="h-4 w-4 mr-1" />
                  Guardar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={cancelEditing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 p-6 rounded-lg text-center">
                <div className="flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Precio por Kilogramo
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(hotel.pricePerKg)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing Examples */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Ejemplos de Precio (Solo por Peso)
                </p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>• 5kg = {formatCurrency(5 * hotel.pricePerKg)}</p>
                  <p>• 10kg = {formatCurrency(10 * hotel.pricePerKg)}</p>
                  <p>• 15kg = {formatCurrency(15 * hotel.pricePerKg)}</p>
                  <p>• 20kg = {formatCurrency(20 * hotel.pricePerKg)}</p>
                </div>
                <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
                  <strong>Nota:</strong> Las bolsas son solo para control y no afectan el precio
                </div>
              </div>

              {/* Contact Info */}
              <div className="text-sm text-gray-600">
                <p><strong>Teléfono:</strong> {hotel.phone}</p>
                <p><strong>Email:</strong> {hotel.email}</p>
              </div>
            </div>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (!isAdmin) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Precios por Hotel
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Consulta los precios configurados para cada hotel
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.map((hotel) => (
            <PricingCard key={hotel.id} hotel={hotel} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Gestión de Precios por Peso
        </h1>
        <p className="text-gray-600 text-lg mt-2">
          Configurar precios por kilogramo específicos para cada hotel
        </p>
      </div>

      {/* Pricing Overview */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900">
            Resumen de Precios
          </h3>
        </Card.Header>
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <Building className="h-8 w-8 text-blue-600 mb-2" />
              <p className="text-sm font-medium text-blue-800">Total Hoteles</p>
              <p className="text-2xl font-bold text-blue-900">{hotels.length}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600 mb-2" />
              <p className="text-sm font-medium text-green-800">Precio Promedio/kg</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(hotels.reduce((sum, h) => sum + h.pricePerKg, 0) / hotels.length || 0)}
              </p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <DollarSign className="h-8 w-8 text-yellow-600 mb-2" />
              <p className="text-sm font-medium text-yellow-800">Precio Mínimo/kg</p>
              <p className="text-2xl font-bold text-yellow-900">
                {hotels.length > 0 ? formatCurrency(Math.min(...hotels.map(h => h.pricePerKg))) : formatCurrency(0)}
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <DollarSign className="h-8 w-8 text-purple-600 mb-2" />
              <p className="text-sm font-medium text-purple-800">Precio Máximo/kg</p>
              <p className="text-2xl font-bold text-purple-900">
                {hotels.length > 0 ? formatCurrency(Math.max(...hotels.map(h => h.pricePerKg))) : formatCurrency(0)}
              </p>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Hotels Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotels.map((hotel) => (
          <PricingCard key={hotel.id} hotel={hotel} />
        ))}
      </div>

      {/* Pricing Guide */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900">
            Guía de Precios
          </h3>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Factores a Considerar</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Volumen de servicios:</strong> Hoteles con mayor volumen pueden tener precios preferenciales</li>
                <li>• <strong>Tipo de cliente:</strong> Hoteles premium vs. económicos</li>
                <li>• <strong>Ubicación:</strong> Distancia desde la planta de lavado</li>
                <li>• <strong>Frecuencia:</strong> Servicios diarios vs. ocasionales</li>
                <li>• <strong>Tipo de ropa:</strong> Ropa delicada requiere cuidado especial</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Estructura de Precios</h4>
              <div className="text-sm text-gray-600">
                <p><strong>Precio por Kilogramo:</strong> Único factor que determina el costo del servicio</p>
                <p><strong>Bolsas:</strong> Solo para control operativo y medición, no afectan el precio</p>
                <p className="mt-2"><strong>Precio Final = Peso (kg) × Precio por Kilogramo</strong></p>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <p className="text-blue-800 font-medium">💡 Ventajas del sistema por peso:</p>
                  <ul className="mt-1 list-disc list-inside text-blue-700">
                    <li>Pricing justo y transparente</li>
                    <li>No depende del número de bolsas</li>
                    <li>Fácil de entender para clientes</li>
                    <li>Medición objetiva</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};

export default Pricing;