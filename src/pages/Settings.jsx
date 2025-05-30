import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import { storage, serviceStorage } from '../utils/storage';
import { APP_CONFIG } from '../constants';
// Mock data import removed
import { cleanAllLocalData } from '../utils/cleanData';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { 
  Settings as SettingsIcon,
  Building2,
  DollarSign,
  Bell,
  Shield,
  Database,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  Save,
  RotateCcw,
  RefreshCcw,
  FileX,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

const Settings = () => {
  const { user, isAdmin } = useAuth();
  const { success, error } = useNotifications();
  const [activeTab, setActiveTab] = useState('general');
  const [dataStats, setDataStats] = useState({
    hotels: 0,
    services: 0,
    bagLabels: 0,
    transactions: 0,
    users: 0
  });
  // Estado para controlar si los datos simulados están habilitados
  // Demo data state removed

  const [settings, setSettings] = useState({
    company: {
      name: 'Fumy Limp Lavandería',
      address: 'Av. Principal 123, Lima, Perú',
      phone: '+51 999 888 777',
      email: 'contacto@fumylimp.com',
      ruc: '20123456789'
    },
    pricing: {
      defaultPricePerKg: 8.50,
      defaultPricePerBag: 2.00,
      expressMultiplier: 1.5,
      premiumMultiplier: 2.0,
      minimumOrderAmount: 15.00
    },
    notifications: {
      pushNotifications: true,
      lowInventoryAlert: true,
      newOrderAlert: true,
      completedOrderAlert: true
    },
    system: {
      autoBackup: true,
      backupFrequency: 'daily',
      maxStorageDays: 365,
      debugMode: false,
      maintenanceMode: false
    }
  });

  useEffect(() => {
    loadSettings();
    updateDataStats();
  }, []);

  // Función para actualizar estadísticas de datos
  const updateDataStats = useCallback(() => {
    setDataStats({
      hotels: (storage.get(APP_CONFIG.STORAGE_KEYS.HOTELS) || []).length,
      services: (storage.get(APP_CONFIG.STORAGE_KEYS.SERVICES) || []).length,
      bagLabels: (storage.get(APP_CONFIG.STORAGE_KEYS.BAG_LABELS) || []).length,
      transactions: (storage.get(APP_CONFIG.STORAGE_KEYS.TRANSACTIONS) || []).length,
      users: (storage.get(APP_CONFIG.STORAGE_KEYS.USERS) || []).length
    });
  }, []);

  // Función para actualizar estado de datos demo
  const updateDemoState = useCallback(() => {
    setDemoDataEnabled(localStorage.getItem('fumy_limp_disable_demo') !== 'true');
  }, []);
  
  const loadSettings = () => {
    const savedSettings = storage.get('APP_SETTINGS');
    if (savedSettings) {
      setSettings({ ...settings, ...savedSettings });
    }
  };

  const saveSettings = () => {
    storage.set('APP_SETTINGS', settings);
    success('Configuración Guardada', 'Los cambios han sido guardados exitosamente');
  };

  const resetSettings = () => {
    if (window.confirm('¿Estás seguro de restablecer toda la configuración? Esta acción no se puede deshacer.')) {
      storage.remove('APP_SETTINGS');
      loadSettings();
      success('Configuración Restablecida', 'Se ha restablecido la configuración por defecto');
    }
  };

  const exportData = () => {
    const allData = {
      settings,
      users: storage.get(APP_CONFIG.STORAGE_KEYS.USERS) || [],
      services: storage.get(APP_CONFIG.STORAGE_KEYS.SERVICES) || [],
      hotels: storage.get(APP_CONFIG.STORAGE_KEYS.HOTELS) || [],
      bagLabels: storage.get(APP_CONFIG.STORAGE_KEYS.BAG_LABELS) || [],
      routes: storage.get('PICKUP_ROUTES') || [],
      exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(allData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `fumylimp_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    success('Datos Exportados', 'El respaldo ha sido descargado exitosamente');
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        if (window.confirm('¿Estás seguro de importar estos datos? Esto sobrescribirá todos los datos actuales.')) {
          // Import all data
          if (importedData.settings) storage.set('APP_SETTINGS', importedData.settings);
          if (importedData.users) storage.set(APP_CONFIG.STORAGE_KEYS.USERS, importedData.users);
          if (importedData.services) storage.set(APP_CONFIG.STORAGE_KEYS.SERVICES, importedData.services);
          if (importedData.hotels) storage.set(APP_CONFIG.STORAGE_KEYS.HOTELS, importedData.hotels);
          if (importedData.bagLabels) storage.set(APP_CONFIG.STORAGE_KEYS.BAG_LABELS, importedData.bagLabels);
          if (importedData.routes) storage.set('PICKUP_ROUTES', importedData.routes);
          
          loadSettings();
          success('Datos Importados', 'Los datos han sido importados exitosamente');
        }
      } catch (err) {
        error('Error de Importación', 'El archivo no tiene un formato válido');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

  const generateMixedServices = () => {
    try {
      // Clear existing data and regenerate with modern data
      localStorage.clear();
      // Asegurar que los datos demo están habilitados
      localStorage.removeItem('fumy_limp_disable_demo');
      const result = initializeModernData();
      
      if (result.services === 0) {
        error('Error', 'No se pudieron generar servicios modernos.');
        return;
      }
      
      updateDataStats();
      updateDemoState();
      
      success(
        'Datos Modernos Generados', 
        `Sistema regenerado: ${result.services} servicios, ${result.transactions} transacciones, ${result.bagLabels} rótulos`
      );
    } catch (err) {
      console.error('Error generating mixed services:', err);
      error('Error', 'No se pudieron generar los servicios de prueba.');
    }
  };

  const clearAllData = () => {
    if (window.confirm('¿ESTÁS SEGURO? Esta acción eliminará TODOS los datos del sistema y no se puede deshacer.')) {
      if (window.confirm('CONFIRMACIÓN FINAL: ¿Realmente quieres eliminar todos los datos? Esta acción es IRREVERSIBLE.')) {
        // Clear all data except users (keep current session)
        storage.remove(APP_CONFIG.STORAGE_KEYS.SERVICES);
        storage.remove(APP_CONFIG.STORAGE_KEYS.HOTELS);
        storage.remove(APP_CONFIG.STORAGE_KEYS.BAG_LABELS);
        storage.remove(APP_CONFIG.STORAGE_KEYS.TRANSACTIONS);
        storage.remove(APP_CONFIG.STORAGE_KEYS.GUESTS);
        storage.remove(APP_CONFIG.STORAGE_KEYS.AUDIT_LOG);
        storage.remove('PICKUP_ROUTES');
        storage.remove('APP_SETTINGS');
        
        updateDataStats();
        loadSettings();
        success('Datos Eliminados', 'Todos los datos han sido eliminados del sistema');
      }
    }
  };
  
  // Función para limpiar datos por categoría
  const cleanDataByCategory = (category) => {
    const categories = {
      services: APP_CONFIG.STORAGE_KEYS.SERVICES,
      hotels: APP_CONFIG.STORAGE_KEYS.HOTELS,
      bagLabels: APP_CONFIG.STORAGE_KEYS.BAG_LABELS,
      transactions: APP_CONFIG.STORAGE_KEYS.TRANSACTIONS,
      guests: APP_CONFIG.STORAGE_KEYS.GUESTS,
    };
    
    const categoryLabels = {
      services: "Servicios",
      hotels: "Hoteles",
      bagLabels: "Rótulos",
      transactions: "Transacciones",
      guests: "Huéspedes",
    };
    
    if (window.confirm(`¿Estás seguro de eliminar todos los datos de ${categoryLabels[category]}?`)) {
      storage.remove(categories[category]);
      
      // En caso de limpiar hoteles, también limpiar los huéspedes asociados
      if (category === 'hotels') {
        storage.remove(APP_CONFIG.STORAGE_KEYS.GUESTS);
      }
      
      // En caso de limpiar servicios, también limpiar los rótulos asociados
      if (category === 'services') {
        storage.remove(APP_CONFIG.STORAGE_KEYS.BAG_LABELS);
      }
      
      updateDataStats();
      success('Categoría Limpiada', `Los datos de ${categoryLabels[category]} han sido eliminados`);
    }
  };
  
  // Función para alternar datos de demostración
  const toggleDemoData = () => {
    if (demoDataEnabled) {
      if (window.confirm('¿Estás seguro de desactivar los datos de demostración? Esto limpiará los datos actuales.')) {
        disableAutoDemoData();
        cleanAllLocalData();
        updateDataStats();
        setDemoDataEnabled(false);
        success('Datos de Demo Desactivados', 'Los datos de demostración han sido desactivados');
        
        // Forzar actualización después de desactivar
        setTimeout(() => {
          updateDataStats();
          window.location.reload();
        }, 500);
      }
    } else {
      if (window.confirm('¿Estás seguro de activar los datos de demostración?')) {
        enableAutoDemoData();
        setDemoDataEnabled(true);
        success('Datos de Demo Activados', 'Los datos de demostración serán cargados al reiniciar');
        
        // Forzar actualización después de activar
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Restringido</h2>
          <p className="text-gray-600">Solo los administradores pueden acceder a la configuración</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'company', name: 'Empresa', icon: Building2 },
    { id: 'pricing', name: 'Precios', icon: DollarSign },
    { id: 'notifications', name: 'Notificaciones', icon: Bell },
    { id: 'system', name: 'Sistema', icon: Database }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Configuración del Sistema
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Gestionar configuración y preferencias
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={resetSettings}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restablecer
          </Button>
          <Button
            onClick={saveSettings}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </div>

      <div className="flex space-x-8">
        {/* Sidebar */}
        <div className="w-64 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Configuración General</h3>
              </Card.Header>
              <Card.Content className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Información del Usuario</h4>
                    <div className="space-y-4">
                      <Input
                        label="Nombre"
                        value={user.name}
                        disabled
                      />
                      <Input
                        label="Email"
                        value={user.email}
                        disabled
                      />
                      <Input
                        label="Rol"
                        value={user.role === 'admin' ? 'Administrador' : 'Repartidor'}
                        disabled
                      />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Respaldo de Datos</h4>
                    <div className="space-y-4">
                      <Button
                        variant="outline"
                        onClick={exportData}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Datos
                      </Button>
                      
                      <div>
                        <label className="block">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => document.getElementById('import-file').click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Importar Datos
                          </Button>
                          <input
                            id="import-file"
                            type="file"
                            accept=".json"
                            onChange={importData}
                            className="hidden"
                          />
                        </label>
                      </div>
                      
                      {/* Generate mixed services button removed */}
                      
                      <Button
                        variant="outline"
                        onClick={clearAllData}
                        className="w-full text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Limpiar Datos
                      </Button>
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>
          )}

          {activeTab === 'company' && (
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Información de la Empresa</h3>
              </Card.Header>
              <Card.Content className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Nombre de la Empresa"
                    value={settings.company.name}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, name: e.target.value }
                    })}
                  />
                  
                  <Input
                    label="RUC"
                    value={settings.company.ruc}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, ruc: e.target.value }
                    })}
                  />
                  
                  <div className="md:col-span-2">
                    <Input
                      label="Dirección"
                      value={settings.company.address}
                      onChange={(e) => setSettings({
                        ...settings,
                        company: { ...settings.company, address: e.target.value }
                      })}
                    />
                  </div>
                  
                  <Input
                    label="Teléfono"
                    value={settings.company.phone}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, phone: e.target.value }
                    })}
                  />
                  
                  <Input
                    label="Email"
                    type="email"
                    value={settings.company.email}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, email: e.target.value }
                    })}
                  />
                </div>
              </Card.Content>
            </Card>
          )}

          {activeTab === 'pricing' && (
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Configuración de Precios</h3>
              </Card.Header>
              <Card.Content className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Precio por Kg (S/)"
                    type="number"
                    step="0.01"
                    value={settings.pricing.defaultPricePerKg}
                    onChange={(e) => setSettings({
                      ...settings,
                      pricing: { ...settings.pricing, defaultPricePerKg: parseFloat(e.target.value) }
                    })}
                  />
                  
                  <Input
                    label="Precio por Bolsa (S/)"
                    type="number"
                    step="0.01"
                    value={settings.pricing.defaultPricePerBag}
                    onChange={(e) => setSettings({
                      ...settings,
                      pricing: { ...settings.pricing, defaultPricePerBag: parseFloat(e.target.value) }
                    })}
                  />
                  
                  <Input
                    label="Multiplicador Express"
                    type="number"
                    step="0.1"
                    value={settings.pricing.expressMultiplier}
                    onChange={(e) => setSettings({
                      ...settings,
                      pricing: { ...settings.pricing, expressMultiplier: parseFloat(e.target.value) }
                    })}
                  />
                  
                  <Input
                    label="Multiplicador Premium"
                    type="number"
                    step="0.1"
                    value={settings.pricing.premiumMultiplier}
                    onChange={(e) => setSettings({
                      ...settings,
                      pricing: { ...settings.pricing, premiumMultiplier: parseFloat(e.target.value) }
                    })}
                  />
                  
                  <div className="md:col-span-2">
                    <Input
                      label="Monto Mínimo de Orden (S/)"
                      type="number"
                      step="0.01"
                      value={settings.pricing.minimumOrderAmount}
                      onChange={(e) => setSettings({
                        ...settings,
                        pricing: { ...settings.pricing, minimumOrderAmount: parseFloat(e.target.value) }
                      })}
                    />
                  </div>
                </div>
              </Card.Content>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <Card.Header>
                <h3 className="text-lg font-semibold text-gray-900">Configuración de Notificaciones</h3>
              </Card.Header>
              <Card.Content className="space-y-6">
                <div className="space-y-4">
                  {[
                    { key: 'pushNotifications', label: 'Notificaciones Push' },
                    { key: 'lowInventoryAlert', label: 'Alerta de Inventario Bajo' },
                    { key: 'newOrderAlert', label: 'Alerta de Nueva Orden' },
                    { key: 'completedOrderAlert', label: 'Alerta de Orden Completada' }
                  ].map((notification) => (
                    <div key={notification.key} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{notification.label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications[notification.key]}
                          onChange={(e) => setSettings({
                            ...settings,
                            notifications: { 
                              ...settings.notifications, 
                              [notification.key]: e.target.checked 
                            }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              {/* Configuración del Sistema */}
              <Card>
                <Card.Header>
                  <h3 className="text-lg font-semibold text-gray-900">Configuración del Sistema</h3>
                </Card.Header>
                <Card.Content className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Respaldo Automático</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.system.autoBackup}
                            onChange={(e) => setSettings({
                              ...settings,
                              system: { ...settings.system, autoBackup: e.target.checked }
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Frecuencia de Respaldo
                        </label>
                        <select
                          value={settings.system.backupFrequency}
                          onChange={(e) => setSettings({
                            ...settings,
                            system: { ...settings.system, backupFrequency: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="daily">Diario</option>
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensual</option>
                        </select>
                      </div>

                      <Input
                        label="Días Máximos de Almacenamiento"
                        type="number"
                        value={settings.system.maxStorageDays}
                        onChange={(e) => setSettings({
                          ...settings,
                          system: { ...settings.system, maxStorageDays: parseInt(e.target.value) }
                        })}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Modo Debug</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.system.debugMode}
                            onChange={(e) => setSettings({
                              ...settings,
                              system: { ...settings.system, debugMode: e.target.checked }
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Modo Mantenimiento</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.system.maintenanceMode}
                            onChange={(e) => setSettings({
                              ...settings,
                              system: { ...settings.system, maintenanceMode: e.target.checked }
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {settings.system.maintenanceMode && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" />
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">
                                Modo Mantenimiento Activo
                              </h3>
                              <p className="text-sm text-yellow-700 mt-1">
                                Los usuarios no podrán acceder al sistema mientras esté activo.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card.Content>
              </Card>
              
              {/* Demo data management section removed */}
                  
              {/* Data statistics and management card removed */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;