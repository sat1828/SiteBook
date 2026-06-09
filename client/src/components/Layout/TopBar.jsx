import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, Sun, Moon, Wifi, WifiOff, Bell, HardHat } from 'lucide-react';
import { useAuthStore, useThemeStore, useOfflineStore } from '../../store/store';
import { useSocketNotifications } from '../../hooks/useSocketNotifications';

export const TopBar = ({ onMenuClick, isOnline, theme, onToggleTheme }) => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { unreadCount } = useSocketNotifications();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-10 glass border-b px-4 md:px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden btn-ghost p-2 rounded-xl">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <HardHat className="w-5 h-5 text-primary-400 hidden sm:block" />
          <span className="text-sm font-semibold hidden sm:block">
            <span className="text-gradient">Site</span>Book
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs">
          {isOnline ? (
            <><Wifi className="w-3.5 h-3.5 text-accent-500" /><span className="text-accent-400 hidden sm:inline">Online</span></>
          ) : (
            <><WifiOff className="w-3.5 h-3.5 text-yellow-400" /><span className="text-yellow-400 hidden sm:inline">Offline</span></>
          )}
        </div>

        <button onClick={onToggleTheme} className="btn-ghost p-2 rounded-xl">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button className="btn-ghost p-2 rounded-xl relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <button onClick={handleLogout} className="btn-ghost p-2 rounded-xl">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
