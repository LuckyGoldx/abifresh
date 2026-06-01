'use client';

import { useState } from 'react';
import { useAuthStore, useThemeStore } from '@/store/auth';
import { useNotifications } from '@/context/NotificationContext';
import NotificationsDrawer from './NotificationsDrawer';
import UserProfileDropdown from './UserProfileDropdown';
import Logo from './Logo';
import { Sun, Moon, Bell } from 'lucide-react';

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const { unreadCount } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-800 shadow flex-shrink-0">
        <div className="pl-16 md:pl-14 pr-4 md:pr-8 py-3 md:py-4 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0 flex items-center overflow-hidden">
            {/* Logo on mobile only */}
            <div className="md:hidden">
              <Logo context="header" />
            </div>
            
            {/* Text on tablet and desktop */}
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold text-pink-600">ABIFRESH & KIDDIES VENTURES</h1>
            </div>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
            {/* Notifications */}
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2 mr-1 md:mr-0 text-gray-600 dark:text-gray-400 hover:text-pink-500 transition"
              title="View notifications"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Theme Toggle - hidden on mobile (moved to sidebar) */}
            <button
              onClick={toggleTheme}
              className="hidden md:block p-2 text-gray-600 dark:text-gray-400 hover:text-pink-500 transition"
            >
              {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </button>

            {/* User Profile Dropdown - hidden on mobile/tablet, shown in sidebar */}
            <div className="hidden md:block">
              <UserProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      <NotificationsDrawer isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </>
  );
}
