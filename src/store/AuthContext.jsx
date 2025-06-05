import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/auth.service';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState(Math.random().toString(36).substring(2, 10));

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        
        if (authService.isLoggedIn()) {
          const profileResponse = await authService.getProfile();
          if (profileResponse.success && profileResponse.data) {
            setUser(profileResponse.data);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      if (response.success && response.user) {
        setUser(response.user);
        sessionStorage.setItem('sessionId', sessionId);
        return { success: true, user: response.user };
      }
      throw new Error('Credenciales inválidas');
    } catch (error) {
      return { success: false, error: error.message || 'Error de autenticación' };
    }
  };

  const logout = async () => {
    try {
      if (user) {
        await authService.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setSessionId(Math.random().toString(36).substring(2, 10));
    }
  };

  const value = {
    user,
    login,
    logout,
    loading,
    sessionId,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN' || user?.role === 'admin',
    isRepartidor: user?.role === 'REPARTIDOR' || user?.role === 'repartidor',
    getProfile: authService.getProfile,
    updateProfile: authService.updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};