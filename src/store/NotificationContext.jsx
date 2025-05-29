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
    const id = Date.now().toString();
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
      setTimeout(() => {
        removeNotification(id);
      }, timeout);
    }

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
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