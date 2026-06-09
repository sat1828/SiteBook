import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore, useThemeStore, useOfflineStore } from '../../store/store';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getSocket, disconnectSocket } from '../../utils/socket';
import toast from 'react-hot-toast';

export const AppLayout = ({ allowedRoles }) => {
  const { user, isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { isOnline } = useOfflineStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useOnlineStatus();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const socket = getSocket();
    socket.emit('subscribe:site', user.assignedSites?.[0]);

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          isOnline={isOnline}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
