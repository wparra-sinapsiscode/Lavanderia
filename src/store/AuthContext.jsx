import React, { createContext, useContext, useState, useEffect } from 'react';
import { userStorage, storage } from '../utils/storage';
import { APP_CONFIG } from '../constants';
import { auditStorage } from '../utils/storage';
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

  useEffect(() => {
    // Check for existing user session
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // First check if user is logged in via API
        if (authService.isLoggedIn()) {
          try {
            // Try to get user profile from API
            const profileResponse = await authService.getProfile();
            if (profileResponse.success && profileResponse.data) {
              setUser(profileResponse.data);
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error('Error getting user profile:', error);
            // If API fails, continue to local storage fallback
          }
        }
        
        // Fallback to local storage
        const savedUser = userStorage.getUser();
        if (savedUser) {
          setUser(savedUser);
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
      // Try to login via API
      try {
        const response = await authService.login(email, password);
        if (response.success && response.user) {
          setUser(response.user);
          
          // Add audit log entry locally too
          auditStorage.addAuditEntry({
            action: 'LOGIN',
            user: response.user.name,
            details: `Usuario ${response.user.name} inició sesión`
          });
          
          return { success: true, user: response.user };
        }
      } catch (apiError) {
        console.error('API login error:', apiError);
        // Fallback to local storage if API fails
      }
      
      // Fallback to localStorage login
      const users = storage.get(APP_CONFIG.STORAGE_KEYS.USERS) || [];
      
      // Find user with matching credentials
      const foundUser = users.find(u => u.email === email && u.password === password);
      
      if (!foundUser) {
        throw new Error('Credenciales inválidas');
      }

      // Remove password from user object before storing
      const { password: _, ...userWithoutPassword } = foundUser;
      
      setUser(userWithoutPassword);
      userStorage.setUser(userWithoutPassword);
      
      // Add audit log entry
      auditStorage.addAuditEntry({
        action: 'LOGIN',
        user: userWithoutPassword.name,
        details: `Usuario ${userWithoutPassword.name} inició sesión`
      });

      return { success: true, user: userWithoutPassword };
    } catch (error) {
      return { success: false, error: error.message || 'Error de autenticación' };
    }
  };

  const logout = async () => {
    try {
      if (user) {
        // Add audit log entry
        auditStorage.addAuditEntry({
          action: 'LOGOUT',
          user: user.name,
          details: `Usuario ${user.name} cerró sesión`
        });
        
        // Try to logout via API
        try {
          await authService.logout();
        } catch (apiError) {
          console.error('API logout error:', apiError);
          // Continue with local logout even if API fails
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear user state and local storage
      setUser(null);
      userStorage.removeUser();
    }
  };

  const value = {
    user,
    login,
    logout,
    loading,
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