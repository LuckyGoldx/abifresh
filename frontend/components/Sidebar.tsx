'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNotifications } from '@/context/NotificationContext';

interface MenuItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

interface SidebarProps {
  menuItems: MenuItem[];
  role: string;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

export default function Sidebar({ menuItems, role, isOpen = true, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const toggleDesktop = () => {
    if (setIsOpen) setIsOpen(!isOpen);
  };

  const desktopStyles: React.CSSProperties = isDesktop
    ? { transform: 'translateX(0)', position: 'static', width: isOpen ? '16rem' : '0px', minWidth: isOpen ? '16rem' : '0px' }
    : {};

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-pink-500 text-white rounded-lg"
      >
        {mobileOpen ? <X /> : <Menu />}
      </button>

      {isDesktop && !isOpen && (
        <button
          onClick={toggleDesktop}
          className="hidden md:flex fixed top-4 left-4 z-50 p-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
          title="Show sidebar"
        >
          <PanelLeftOpen size={20} />
        </button>
      )}

      <aside
        className={`fixed inset-y-0 left-0 bg-white dark:bg-slate-800 shadow-lg z-40 transition-all duration-300 overflow-hidden ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'
        }`}
        style={desktopStyles}
      >
        {isDesktop && isOpen && (
          <div className="hidden md:flex absolute top-4 right-2 z-10">
            <button
              onClick={toggleDesktop}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
              title="Hide sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
        )}

        <div className="p-6 border-b border-gray-200 dark:border-slate-700 mt-12 md:mt-0">
          <h1 className="text-xl font-bold text-pink-600 whitespace-nowrap">ABI VENTURES</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 capitalize whitespace-nowrap">{role} Portal</p>
        </div>

        <nav className="py-6 px-4 space-y-2 h-[calc(100vh-180px)] overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const isNotifications = item.label === 'Notifications';
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                prefetch={true}
                className={`flex items-center justify-between px-4 py-3 rounded-lg transition whitespace-nowrap ${
                  isActive
                    ? 'bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {isNotifications && unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {!isNotifications && item.badge && item.badge > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
