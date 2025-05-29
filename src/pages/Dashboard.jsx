import React from 'react';
import { useAuth } from '../store/AuthContext';
import AdminDashboard from '../components/dashboards/AdminDashboard';
import RepartidorDashboard from '../components/dashboards/RepartidorDashboard';

const Dashboard = () => {
  const { isAdmin } = useAuth();

  return isAdmin ? <AdminDashboard /> : <RepartidorDashboard />;
};

export default Dashboard;