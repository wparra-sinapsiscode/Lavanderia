import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useNotifications } from '../store/NotificationContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin, isRepartidor } = useAuth();
  const { showNotification } = useNotifications();
  
  useEffect(() => {
    // Redirect to dashboard if already logged in
    if (isAuthenticated) {
      redirectBasedOnRole();
    }
  }, [isAuthenticated]);
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const redirectBasedOnRole = () => {
    if (isAdmin) {
      navigate('/dashboard');
    } else if (isRepartidor) {
      navigate('/repartidor-dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        showNotification({
          type: 'success',
          message: `Bienvenido, ${result.user.name}!`
        });
        
        // Redirect based on role
        redirectBasedOnRole();
      } else {
        showNotification({
          type: 'error',
          message: result.error || 'Error de autenticación'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      showNotification({
        type: 'error',
        message: error.message || 'Error de conexión al servidor'
      });
    } finally {
      setLoading(false);
    }
  };

  const demoCredentials = [
    { role: 'Administrador', email: 'admin@fumylimp.com', password: 'admin123' },
    { role: 'Repartidor Norte', email: 'repartidor.norte@fumylimp.com', password: 'repartidor123' },
    { role: 'Repartidor Sur', email: 'repartidor.sur@fumylimp.com', password: 'repartidor123' },
    { role: 'Repartidor Centro', email: 'repartidor.centro@fumylimp.com', password: 'repartidor123' }
  ];

  const fillCredentials = (email, password) => {
    setFormData({ email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/Logo.jfif"
              alt="Fumy Limp Logo"
              className="h-16 w-auto mr-4"
            />
            <h2 className="text-4xl font-bold text-primary-600">Fumy Limp</h2>
          </div>
          <p className="text-gray-600">Sistema de Gestión de Lavandería</p>
        </div>

        {/* Login Form */}
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Correo Electrónico"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="tu@email.com"
            />

            <div className="relative">
              <Input
                label="Contraseña"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={!formData.email || !formData.password}
            >
              Iniciar Sesión
            </Button>
          </form>
        </Card>

        {/* Demo Credentials */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Credenciales de Demostración</h3>
          <div className="space-y-3">
            {demoCredentials.map((cred, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-800">{cred.role}</p>
                  <p className="text-sm text-gray-600">{cred.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fillCredentials(cred.email, cred.password)}
                >
                  Usar
                </Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>© 2024 Fumy Limp. Todos los derechos reservados.</p>
          <p className="mt-1">Sistema de gestión de lavandería para hoteles</p>
        </div>
      </div>
    </div>
  );
};

export default Login;