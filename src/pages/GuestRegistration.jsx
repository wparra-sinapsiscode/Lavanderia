import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { serviceStorage } from '../utils/storage';
import { formatDate, getStatusColor, getStatusText } from '../utils';
import GuestRegistrationForm from '../components/forms/GuestRegistrationForm';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Plus, Users, Package, Clock } from 'lucide-react';

const GuestRegistration = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [stats, setStats] = useState({
    todayRegistrations: 0,
    pendingPickups: 0,
    totalBagsDelivered: 0
  });

  useEffect(() => {
    loadRegistrationData();
  }, []);

  const loadRegistrationData = () => {
    const services = serviceStorage.getServices();
    
    // Get recent registrations
    const recent = services
      .filter(s => s.status === 'pendiente_recojo' || new Date(s.timestamp).toDateString() === new Date().toDateString())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
    
    setRecentRegistrations(recent);

    // Calculate stats
    const today = new Date().toDateString();
    const todayRegistrations = services.filter(s => 
      new Date(s.timestamp).toDateString() === today
    ).length;

    const pendingPickups = services.filter(s => 
      s.status === 'pendiente_recojo'
    ).length;

    const totalBagsDelivered = services.reduce((sum, s) => sum + s.bagCount, 0);

    setStats({
      todayRegistrations,
      pendingPickups,
      totalBagsDelivered
    });
  };

  const handleServiceCreated = () => {
    loadRegistrationData();
    setShowForm(false);
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => (
    <Card>
      <Card.Content className="p-6">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg bg-${color}-100`}>
            <Icon className={`h-6 w-6 text-${color}-600`} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>
      </Card.Content>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Registro de Huéspedes
          </h1>
          <p className="text-gray-600 text-lg mt-2">
            Registrar nuevos huéspedes y entregar bolsas
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          {showForm ? 'Cancelar' : 'Nuevo Registro'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Registros Hoy"
          value={stats.todayRegistrations}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Pendientes de Recojo"
          value={stats.pendingPickups}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Bolsas Entregadas"
          value={stats.totalBagsDelivered}
          icon={Package}
          color="green"
        />
      </div>

      {/* Registration Form */}
      {showForm && (
        <GuestRegistrationForm
          onClose={() => setShowForm(false)}
          onServiceCreated={handleServiceCreated}
        />
      )}

      {/* Recent Registrations */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-semibold text-gray-900">
            Registros Recientes
          </h3>
        </Card.Header>
        <Card.Content className="p-0">
          {recentRegistrations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay registros recientes</p>
              <p className="text-sm">Registra el primer huésped para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Huésped
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hotel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bolsas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registro
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentRegistrations.map((service) => (
                    <tr key={service.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {service.guestName}
                          </p>
                          <p className="text-sm text-gray-500">
                            Hab. {service.roomNumber}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {service.hotel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {service.bagCount} bolsas
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(service.status)}`}>
                          {service.status === 'pendiente_recojo' ? 'Pendiente Recojo' : getStatusText(service.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(service.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  );
};

export default GuestRegistration;