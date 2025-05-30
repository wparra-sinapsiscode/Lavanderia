import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import { hotelStorage, auditStorage } from '../utils/storage';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Package, Plus, Minus, AlertTriangle, Building, Loader, RefreshCw } from 'lucide-react';
import hotelService from '../services/hotel.service';

const Inventory = () => {
  const { user, isAdmin } = useAuth();
  const { success, warning, error } = useNotifications();
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    setLoading(true);
    setApiError(null);
    
    try {
      // Intentar obtener datos de la API
      const response = await hotelService.getAllHotels();
      if (response && response.data) {
        setHotels(response.data);
      } else {
        throw new Error('Respuesta incompleta de la API');
      }
    } catch (err) {
      console.error('Error cargando datos de inventario:', err);
      setApiError('No se pudieron cargar los datos de inventario del servidor');
      
      // Fallback a datos locales
      const hotelData = hotelStorage.getHotels();
      if (hotelData && hotelData.length > 0) {
        setHotels(hotelData);
        warning('Usando datos locales', 'Los datos de inventario se están cargando desde el almacenamiento local');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateBagInventory = async (hotelId, operation, quantity = 1) => {
    setLoading(true);
    
    try {
      const hotel = hotels.find(h => h.id === hotelId);
      if (!hotel) return;
      
      // Asegurarse de que bagInventory sea un número
      let currentInventory = parseInt(hotel.bagInventory) || 0;
      let newInventory = currentInventory;
      
      // Convertir quantity a número para asegurar cálculo correcto
      const numQuantity = parseInt(quantity) || 1;
      
      console.log(`Operación de inventario - Hotel: ${hotel.name}, Inventario actual: ${currentInventory}, Operación: ${operation}, Cantidad: ${numQuantity}`);
      
      if (operation === 'add') {
        newInventory += numQuantity;
        console.log(`Agregar ${numQuantity} bolsas → Nuevo inventario: ${newInventory}`);
      } else if (operation === 'subtract') {
        // Asegurar que no quede negativo
        newInventory = Math.max(0, currentInventory - numQuantity);
        console.log(`Restar ${numQuantity} bolsas → Nuevo inventario: ${newInventory}`);
        
        // Si el inventario no cambió porque ya estaba en 0, notificar al usuario
        if (newInventory === currentInventory && currentInventory === 0) {
          warning(
            'Inventario en cero',
            `El inventario de ${hotel.name} ya está en cero, no se puede reducir más.`
          );
          setLoading(false);
          return;
        }
      }
      
      // Si no hay cambio, no hacer nada
      if (newInventory === currentInventory) {
        setLoading(false);
        return;
      }

      try {
        // El backend espera directamente el valor de bagInventory
        console.log(`Actualizando inventario: Hotel ${hotelId}, Operación: ${operation}, Cantidad: ${numQuantity}, Nuevo total: ${newInventory}`);
        
        // Intentar usar el método específico de inventario
        let response;
        try {
          // El método updateInventory espera directamente bagInventory, no quantity
          response = await hotelService.updateInventory(hotelId, { 
            bagInventory: newInventory,
            notes: `${operation === 'add' ? 'Agregado' : 'Descontado'} ${numQuantity} manualmente por ${user.name}`
          });
          
          console.log("Respuesta de updateInventory:", response);
        } catch (inventoryMethodError) {
          console.warn("Método updateInventory falló, intentando con updateHotel:", inventoryMethodError);
          
          // Intentar directamente con bagInventory en el método updateHotel
          try {
            response = await hotelService.updateHotel(hotelId, { 
              bagInventory: newInventory 
            });
            console.log("Respuesta de updateHotel:", response);
          } catch (hotelUpdateError) {
            console.error("Método updateHotel también falló:", hotelUpdateError);
            throw hotelUpdateError;
          }
        }
        
        if (response && response.success) {
          console.log("Actualización exitosa vía API:", response);
          
          console.log(`Actualizando estado de UI para hotel ${hotelId}, nuevo inventario: ${newInventory}`);
          
          // Actualizar el estado local inmediatamente para reflejar el cambio en la UI
          setHotels(prevHotels => {
            const updatedHotels = prevHotels.map(h => 
              h.id === hotelId ? { ...h, bagInventory: newInventory } : h
            );
            console.log("Estado actualizado de hoteles:", updatedHotels);
            return updatedHotels;
          });
          
          // Agregar entrada de auditoría
          auditStorage.addAuditEntry({
            action: 'INVENTORY_UPDATE',
            user: user.name,
            details: `${operation === 'add' ? 'Agregó' : 'Descontó'} ${numQuantity} bolsas del inventario de ${hotel.name}. Nuevo total: ${newInventory}`
          });
          
          success(
            'Inventario Actualizado',
            `Inventario de ${hotel.name} actualizado correctamente`
          );
          
          // Mostrar advertencia solo si el inventario es críticamente bajo (menos de 10)
          if (newInventory < 10) {
            warning(
              'Inventario Crítico',
              `${hotel.name} tiene solo ${newInventory} bolsas disponibles`
            );
          }
        } else {
          throw new Error("La respuesta de la API no indicó éxito");
        }
      } catch (apiError) {
        console.error('Error actualizando inventario en API:', apiError);
        error('Error', 'No se pudo actualizar el inventario en el servidor');
        
        // Fallback a actualización local
        console.log("Intentando actualización local:", hotelId, { bagInventory: newInventory });
        const updateResult = hotelStorage.updateHotel(hotelId, { bagInventory: newInventory });
        
        if (updateResult) {
          console.log("Actualización local exitosa");
          
          // Actualizar explícitamente el estado local para reflejar el cambio en la UI
          setHotels(prevHotels => {
            const updatedHotels = prevHotels.map(h => 
              h.id === hotelId ? { ...h, bagInventory: newInventory } : h
            );
            console.log("Estado de hoteles actualizado:", updatedHotels);
            return updatedHotels;
          });
          
          // Agregar entrada de auditoría
          auditStorage.addAuditEntry({
            action: 'INVENTORY_UPDATE_LOCAL',
            user: user.name,
            details: `${operation === 'add' ? 'Agregó' : 'Descontó'} ${numQuantity} bolsas del inventario de ${hotel.name} (local). Nuevo total: ${newInventory}`
          });
          
          warning(
            'Actualización Local',
            'El inventario se actualizó localmente, pero no se pudo sincronizar con el servidor'
          );
        } else {
          throw new Error("No se pudo actualizar el inventario localmente");
        }
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      error('Error', 'Ocurrió un error al actualizar el inventario');
    } finally {
      setLoading(false);
    }
  };

  const getInventoryStatus = (count) => {
    if (count === 0) return { color: 'text-red-600', bg: 'bg-red-100', text: 'Sin Stock' };
    if (count < 20) return { color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Stock Bajo' };
    if (count < 50) return { color: 'text-blue-600', bg: 'bg-blue-100', text: 'Stock Normal' };
    return { color: 'text-green-600', bg: 'bg-green-100', text: 'Stock Alto' };
  };

  const BulkInventoryModal = ({ hotel, onClose, onUpdate }) => {
    const [quantity, setQuantity] = useState(10);
    const [operation, setOperation] = useState('add');

    const handleSubmit = (e) => {
      e.preventDefault();
      onUpdate(hotel.id, operation, parseInt(quantity));
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">
            Actualizar Inventario - {hotel.name}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operación
              </label>
              <select
                value={operation}
                onChange={(e) => setOperation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="add">Agregar Bolsas</option>
                <option value="subtract">Descontar Bolsas</option>
              </select>
            </div>
            
            <Input
              label="Cantidad"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            
            <div className="flex space-x-3">
              <Button type="submit" className="flex-1">
                Actualizar
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Inventario de Bolsas
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Control de bolsas disponibles por hotel
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadInventoryData}
            className="p-2 rounded-full hover:bg-gray-100"
            title="Actualizar datos"
            disabled={loading}
          >
            {loading ? (
              <Loader className="h-5 w-5 text-gray-600 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>
      
      {/* Error message */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{apiError}</p>
              <button 
                onClick={loadInventoryData} 
                className="text-sm font-medium underline mt-1 text-red-600 hover:text-red-800"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bolsas</p>
                {loading ? (
                  <div className="flex items-center h-9">
                    <Loader className="h-5 w-5 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {hotels.reduce((sum, h) => sum + (parseInt(h.bagInventory) || 0), 0)}
                  </p>
                )}
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hoteles</p>
                {loading ? (
                  <div className="flex items-center h-9">
                    <Loader className="h-5 w-5 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{hotels.length}</p>
                )}
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
                {loading ? (
                  <div className="flex items-center h-9">
                    <Loader className="h-5 w-5 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {hotels.filter(h => parseInt(h.bagInventory) > 0 && parseInt(h.bagInventory) < 20).length}
                  </p>
                )}
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sin Stock</p>
                {loading ? (
                  <div className="flex items-center h-9">
                    <Loader className="h-5 w-5 text-gray-400 animate-spin" />
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {hotels.filter(h => parseInt(h.bagInventory) === 0).length}
                  </p>
                )}
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Hotel Inventory List */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900">
            Inventario por Hotel
          </h3>
        </Card.Header>
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hotel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bolsas Disponibles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zona
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center space-x-2">
                        <Loader className="h-5 w-5 text-blue-500 animate-spin" />
                        <span className="text-gray-500">Cargando datos de inventario...</span>
                      </div>
                    </td>
                  </tr>
                )}
                
                {!loading && hotels.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="px-6 py-4 text-center">
                      <div className="text-gray-500">
                        No hay datos de hoteles disponibles
                      </div>
                    </td>
                  </tr>
                )}
                
                {!loading && hotels.map((hotel) => {
                  const status = getInventoryStatus(parseInt(hotel.bagInventory) || 0);
                  return (
                    <tr key={hotel.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {hotel.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {hotel.contactPerson}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-2xl font-bold text-gray-900">
                          {hotel.bagInventory}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.bg} ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hotel.zone || 'No especificada'}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateBagInventory(hotel.id, 'add', 1)}
                            disabled={loading}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateBagInventory(hotel.id, 'subtract', 1)}
                            disabled={loading || parseInt(hotel.bagInventory) === 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setSelectedHotel(hotel)}
                          >
                            Editar
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      {/* Bulk Update Modal */}
      {selectedHotel && (
        <BulkInventoryModal
          hotel={selectedHotel}
          onClose={() => setSelectedHotel(null)}
          onUpdate={updateBagInventory}
        />
      )}
    </div>
  );
};

export default Inventory;