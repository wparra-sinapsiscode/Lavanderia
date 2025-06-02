import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    // Prevenir renderizaciones infinitas o llamadas redundantes
    // comprobando si ya existe una notificación idéntica recientemente
    const isDuplicate = notifications.some(n => 
      n.message === notification.message && 
      n.type === (notification.type || 'info') &&
      (Date.now() - new Date(n.timestamp).getTime()) < 1000 // Si es igual y hace menos de 1 segundo
    );

    if (isDuplicate) {
      console.log('Prevented duplicate notification:', notification.message);
      return null; // No añadir notificaciones duplicadas en corto período
    }

    // Usar una combinación de timestamp y número aleatorio para crear IDs realmente únicos
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification = {
      id,
      type: 'info', // info, success, warning, error
      ...notification,
      timestamp: new Date().toISOString()
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Auto remove after timeout for non-persistent notifications
    if (!notification.persistent) {
      const timeout = notification.type === 'error' ? 8000 : 5000; // Errors stay longer
      // Usar un ID para el timeout que podamos limpiar si es necesario
      const timeoutId = setTimeout(() => {
        removeNotification(id);
      }, timeout);
      
      // Guardar el ID del timeout en una propiedad del contexto
      return { id, timeoutId };
    }

    return { id };
  };

  const removeNotification = (id) => {
    // Prevenir actualizaciones infinitas verificando si la notificación existe
    const notificationExists = notifications.some(n => n.id === id);
    
    if (notificationExists) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Helper methods for different notification types
  const success = (title, message, options = {}) => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    });
  };

  const error = (title, message, options = {}) => {
    return addNotification({
      type: 'error',
      title,
      message,
      persistent: false, // Error notifications auto-dismiss after 5 seconds
      ...options
    });
  };

  const warning = (title, message, options = {}) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      ...options
    });
  };

  const info = (title, message, options = {}) => {
    return addNotification({
      type: 'info',
      title,
      message,
      ...options
    });
  };

  // Alias for addNotification to match usage in components
  const showNotification = (notification) => {
    return addNotification(notification);
  };

  const value = {
    notifications,
    addNotification,
    showNotification, // Added alias for existing components
    removeNotification,
    clearAllNotifications,
    success,
    error,
    warning,
    info
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};