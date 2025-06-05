import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { NotificationProvider } from './store/NotificationContext';
import Layout from './components/shared/Layout';
import NotificationToast from './components/ui/NotificationToast';
import { APP_CONFIG } from './constants';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Pickup from './pages/Pickup';
import Delivery from './pages/Delivery';
import Pricing from './pages/Pricing';
import Hotels from './pages/Hotels';
import BagLabelRegistry from './pages/BagLabelRegistry';
import RoutesPage from './pages/Routes';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Finance from './pages/Finance';
// Mock data import removed
import { cleanAllLocalData } from './utils/cleanData';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Main App Component
const AppContent = () => {
  const { isAuthenticated } = useAuth();

  const [dataInitialized, setDataInitialized] = useState(false);
  
  // Demo data disabled - using database only
  useEffect(() => {
    // No need to store demo preference locally
  }, []);
  
  // Simulated data event handling removed

  // Initialize app state
  useEffect(() => {
    // Clear any existing mock data
    cleanAllLocalData();
    setDataInitialized(true);
  }, []);

  return (
    <div className="App">
      <Layout>
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : <Login />
            } 
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
          />
          {/* Core Routes */}
          <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/pickup" element={<ProtectedRoute><Pickup /></ProtectedRoute>} />
          <Route path="/delivery" element={<ProtectedRoute><Delivery /></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
          <Route path="/hotels" element={<ProtectedRoute><Hotels /></ProtectedRoute>} />
          <Route path="/bag-labels" element={<ProtectedRoute><BagLabelRegistry /></ProtectedRoute>} />
          <Route path="/routes" element={<ProtectedRoute><RoutesPage /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
          {/* Management Routes */}
          <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </Layout>
      <NotificationToast />
    </div>
  );
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;