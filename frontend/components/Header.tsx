'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useThemeStore } from '@/store/auth';
import { useNotifications } from '@/context/NotificationContext';
import NotificationsDrawer from './NotificationsDrawer';
import { LogOut, Sun, Moon, Bell } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const { unreadCount } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      <header className="bg-white dark:bg-slate-800 shadow">
        <div className="px-4 md:px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-pink-600">ABIFRESH & KIDDIES VENTURES</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {user?.role ? user.role.replace(/_/g, ' ').toUpperCase() : 'User'}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-pink-500 transition"
              title="View notifications"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-pink-500 transition"
            >
              {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </button>

            {/* User Info */}
            <div className="hidden md:block text-right">
              <p className="font-semibold text-gray-800 dark:text-white">{user?.full_name}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{user?.email}</p>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-500 transition"
              title="Logout"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </>
  );
}
