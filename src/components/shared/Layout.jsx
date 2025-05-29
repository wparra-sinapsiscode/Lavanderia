import React from 'react';
import { useAuth } from '../../store/AuthContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return children;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex pt-16"> {/* Add top padding for fixed navbar */}
        <Sidebar />
        <main className="flex-1 p-4 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            <div className="py-2"> {/* Add internal padding */}
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;