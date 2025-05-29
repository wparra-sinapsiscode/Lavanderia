import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import {
  Home,
  Package,
  Users,
  Truck,
  BarChart3,
  Settings,
  ClipboardList,
  DollarSign,
  QrCode,
  Route,
  UserPlus,
  Building,
  PackageCheck,
  Calculator
} from 'lucide-react';

const Sidebar = () => {
  const { user, isAdmin, isRepartidor } = useAuth();

  const adminNavItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/hotels', icon: Building, label: 'Hoteles' },
    { to: '/pickup', icon: Truck, label: 'Gestión de servicios' },
    { to: '/inventory', icon: ClipboardList, label: 'Inventario' },
    { to: '/delivery', icon: PackageCheck, label: 'Entregas' },
    { to: '/routes', icon: Route, label: 'Rutas' },
    { to: '/bag-labels', icon: QrCode, label: 'Rótulos' },
    { to: '/pricing', icon: DollarSign, label: 'Precios' },
    { to: '/finance', icon: Calculator, label: 'Finanzas' },
    { to: '/users', icon: Users, label: 'Usuarios' },
    { to: '/reports', icon: BarChart3, label: 'Reportes' },
    { to: '/settings', icon: Settings, label: 'Configuración' }
  ];

  const repartidorNavItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/pickup', icon: Truck, label: 'Gestión de servicios' },
    { to: '/delivery', icon: PackageCheck, label: 'Entregas' },
    { to: '/routes', icon: Route, label: 'Rutas' },
    { to: '/inventory', icon: ClipboardList, label: 'Inventario' }
  ];

  const navItems = isAdmin ? adminNavItems : repartidorNavItems;

  return (
    <div className="fixed inset-y-0 left-0 z-20 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0">
      <div className="flex flex-col h-full pt-16">
        {/* User Zone Info */}
        <div className="px-6 py-3 bg-primary-50 border-b">
          <div className="text-sm text-gray-600">
            <p className="font-medium">{user?.name}</p>
            <p className="text-primary-600">{user?.zone}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 border-r-4 border-primary-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            <div className="flex items-center justify-center mb-1">
              <img
                src="/Logo.jfif"
                alt="Fumy Limp Logo"
                className="h-5 w-auto mr-2"
              />
              <span className="font-medium">Fumy Limp</span>
            </div>
            <p>© 2024</p>
          </div>
        </div>
      </div>
    </div>
  );
};


export default Sidebar;