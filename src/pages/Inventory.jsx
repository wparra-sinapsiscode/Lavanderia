import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import { hotelStorage, auditStorage } from '../utils/storage';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Package, Plus, Minus, AlertTriangle, Building } from 'lucide-react';

const Inventory = () => {
  const { user, isAdmin } = useAuth();
  const { success, warning } = useNotifications();
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = () => {
    const hotelData = hotelStorage.getHotels();
    setHotels(hotelData);
  };

  const updateBagInventory = async (hotelId, operation, quantity = 1) => {
    setLoading(true);
    
    try {
      const hotel = hotels.find(h => h.id === hotelId);
      if (!hotel) return;

      let newInventory = hotel.bagInventory;
      
      if (operation === 'add') {
        newInventory += quantity;
      } else if (operation === 'subtract') {
        newInventory = Math.max(0, newInventory - quantity);
      }

      // Update hotel inventory
      const updateResult = hotelStorage.updateHotel(hotelId, { bagInventory: newInventory });
      
      if (updateResult) {
        // Update local state
        setHotels(prev => prev.map(h => 
          h.id === hotelId ? { ...h, bagInventory: newInventory } : h
        ));

        // Add audit log
        auditStorage.addAuditEntry({
          action: 'INVENTORY_UPDATE',
          user: user.name,
          details: `${operation === 'add' ? 'Agregó' : 'Descontó'} ${quantity} bolsas del inventario de ${hotel.name}. Nuevo total: ${newInventory}`
        });

        // Only show warning if inventory is critically low (less than 10)
        if (newInventory < 10) {
          warning(
            'Inventario Crítico',
            `${hotel.name} tiene solo ${newInventory} bolsas disponibles`
          );
        }
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
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
      </div>

      {/* Inventory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bolsas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {hotels.reduce((sum, h) => sum + h.bagInventory, 0)}
                </p>
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
                <p className="text-2xl font-bold text-gray-900">{hotels.length}</p>
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
                <p className="text-2xl font-bold text-gray-900">
                  {hotels.filter(h => h.bagInventory < 20).length}
                </p>
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
                <p className="text-2xl font-bold text-gray-900">
                  {hotels.filter(h => h.bagInventory === 0).length}
                </p>
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
                    Habitaciones
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {hotels.map((hotel) => {
                  const status = getInventoryStatus(hotel.bagInventory);
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
                        {hotel.rooms}
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
                            disabled={loading || hotel.bagInventory === 0}
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