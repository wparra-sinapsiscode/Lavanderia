import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import userService from '../services/user.service';
import { ZONES } from '../constants';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Users as UsersIcon, UserPlus, Edit3, Trash2, Shield, User, Eye, EyeOff } from 'lucide-react';

const Users = () => {
  const { user, isAdmin } = useAuth();
  const { success, error } = useNotifications();
  const [users, setUsers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    admins: 0,
    repartidores: 0,
    activeUsers: 0
  });

  useEffect(() => {
    if (!isAdmin) {
      error('Acceso Denegado', 'No tienes permisos para acceder a esta sección');
      return;
    }
    loadUsers();
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const response = await userService.getUsers();
      console.log('Respuesta completa de loadUsers:', response);
      
      if (response && response.success) {
        const allUsers = response.data || [];
        setUsers(allUsers);
        
        setStats({
          totalUsers: response.total || allUsers.length,
          admins: allUsers.filter(u => u.role === 'ADMIN').length,
          repartidores: allUsers.filter(u => u.role === 'REPARTIDOR').length,
          activeUsers: allUsers.filter(u => u.active).length
        });
      } else {
        error('Error', response?.message || 'No se pudieron cargar los usuarios');
      }
    } catch (err) {
      console.error('Error loading users:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Error desconocido';
      error('Error', 'Error al cargar los usuarios: ' + errorMessage);
      
      // Si es un error de autenticación, podemos intentar refrescar el token manualmente
      if (err.response?.status === 401) {
        console.log('Error de autenticación. Intentando renovar sesión...');
        // Aquí se podría implementar un intento manual de refresh token
      }
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      // Adaptar datos a formato de API
      const apiUserData = {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role.toUpperCase(),
        zone: userData.zone,
        phone: userData.phone || null
      };
      
      const response = await userService.createUser(apiUserData);
      
      if (response.success) {
        loadUsers();
        setShowCreateForm(false);
        success('Usuario Creado', `${userData.name} ha sido agregado al sistema`);
      } else {
        error('Error', response.message || 'Error al crear el usuario');
      }
    } catch (err) {
      console.error('Error creating user:', err);
      
      // Manejar errores comunes
      if (err.message && err.message.includes('duplicate key')) {
        error('Error', 'Ya existe un usuario con este email');
      } else {
        error('Error', 'Error al crear el usuario: ' + (err.message || 'Error desconocido'));
      }
    }
  };

  const handleUpdateUser = async (userId, userData) => {
    try {
      // Adaptar datos a formato de API
      const apiUserData = {
        name: userData.name,
        email: userData.email,
        role: userData.role.toUpperCase(),
        zone: userData.zone,
        phone: userData.phone || null
      };
      
      // Solo incluir password si se proporcionó
      if (userData.password) {
        apiUserData.password = userData.password;
      }
      
      const response = await userService.updateUser(userId, apiUserData);
      
      if (response.success) {
        loadUsers();
        setEditingUser(null);
        success('Usuario Actualizado', 'Los datos del usuario han sido actualizados');
      } else {
        error('Error', response.message || 'Error al actualizar el usuario');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      error('Error', 'Error al actualizar el usuario: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === user.id) {
      error('Error', 'No puedes eliminar tu propio usuario');
      return;
    }

    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        const response = await userService.deleteUser(userId);
        
        if (response.success) {
          loadUsers();
          success('Usuario Eliminado', 'El usuario ha sido desactivado en el sistema');
        } else {
          error('Error', response.message || 'Error al eliminar el usuario');
        }
      } catch (err) {
        console.error('Error deleting user:', err);
        error('Error', 'Error al eliminar el usuario: ' + (err.message || 'Error desconocido'));
      }
    }
  };

  const toggleUserStatus = async (userId) => {
    try {
      // Primero obtenemos el usuario actual para conocer su estado
      const userResponse = await userService.getUserById(userId);
      
      if (userResponse.success && userResponse.data) {
        const currentUser = userResponse.data;
        
        // Enviar el estado contrario al actual
        const response = await userService.updateUser(userId, {
          active: !currentUser.active
        });
        
        if (response.success) {
          loadUsers();
          success('Estado Actualizado', `El usuario ha sido ${currentUser.active ? 'desactivado' : 'activado'}`);
        } else {
          error('Error', response.message || 'Error al cambiar el estado del usuario');
        }
      } else {
        error('Error', 'No se pudo obtener la información del usuario');
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
      error('Error', 'Error al cambiar el estado del usuario: ' + (err.message || 'Error desconocido'));
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Restringido</h2>
          <p className="text-gray-600">Solo los administradores pueden acceder a esta sección</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Administrar usuarios del sistema
          </p>
        </div>
        
        <Button
          onClick={() => setShowCreateForm(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Administradores</p>
                <p className="text-2xl font-bold text-gray-900">{stats.admins}</p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Repartidores</p>
                <p className="text-2xl font-bold text-gray-900">{stats.repartidores}</p>
              </div>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="p-6">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900">
            Lista de Usuarios
          </h3>
        </Card.Header>
        <Card.Content className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zona
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Acceso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userData) => (
                  <tr key={userData.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {userData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{userData.name}</div>
                          <div className="text-sm text-gray-500">{userData.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        userData.role === 'ADMIN' || userData.role === 'admin'
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {userData.role === 'ADMIN' || userData.role === 'admin' ? 'Administrador' : 'Repartidor'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {userData.zone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleUserStatus(userData.id)}
                        className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          userData.active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {userData.active ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Activo
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Inactivo
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userData.updatedAt ? new Date(userData.updatedAt).toLocaleDateString('es-PE') : 'No disponible'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUser(userData)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {userData.id !== user.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteUser(userData.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      {/* Create/Edit User Modal */}
      {(showCreateForm || editingUser) && (
        <UserForm
          user={editingUser}
          onClose={() => {
            setShowCreateForm(false);
            setEditingUser(null);
          }}
          onSubmit={editingUser ? 
            (data) => handleUpdateUser(editingUser.id, data) : 
            handleCreateUser
          }
        />
      )}
    </div>
  );
};

// User Form Component
const UserForm = ({ user, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'REPARTIDOR',
    zone: user?.zone || '',
    phone: user?.phone || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || (!user && !formData.password)) {
      return;
    }

    const submitData = { ...formData };
    if (user && !formData.password) {
      delete submitData.password; // Don't update password if empty
    }

    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {user ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre Completo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            
            <Input
              label={user ? "Nueva Contraseña (opcional)" : "Contraseña"}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="REPARTIDOR">Repartidor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            
            {formData.role === 'REPARTIDOR' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zona
                </label>
                <select
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="">Seleccionar zona...</option>
                  {Object.values(ZONES).map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>
            )}
            
            <Input
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            
            <div className="flex space-x-4 pt-4">
              <Button type="submit" className="flex-1">
                {user ? 'Actualizar' : 'Crear'} Usuario
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Users;