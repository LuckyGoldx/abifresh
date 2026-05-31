'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, PanelLeftClose, PanelLeftOpen, SwitchCamera, Sun, Moon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { useThemeStore } from '@/store/auth';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  menuItems: MenuItem[];
  creditMenuItems?: MenuItem[];
  role: string;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  creditMode?: boolean;
  onToggleCreditMode?: () => void;
  mainBadge?: number;
  creditBadge?: number;
}

export default function Sidebar({ 
  menuItems, 
  creditMenuItems, 
  role, 
  isOpen = true, 
  setIsOpen, 
  creditMode = false, 
  onToggleCreditMode,
  mainBadge = 0,
  creditBadge = 0
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { unreadCount } = useNotifications();
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const items = creditMode && creditMenuItems ? creditMenuItems : menuItems;
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = 0;
    }
  }, [creditMode]);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Flash scrollbar for 2.5s when sidebar opens
  useEffect(() => {
    if (isOpen || mobileOpen) {
      flashScrollbar();
    }
  }, [isOpen, mobileOpen]);

  const flashScrollbar = () => {
    setShowScrollbar(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setShowScrollbar(false);
    }, 2500);
  };

  const handleScroll = () => {
    flashScrollbar();
  };

  const toggleDesktop = () => {
    if (setIsOpen) setIsOpen(!isOpen);
  };

  const desktopStyles: React.CSSProperties = isDesktop
    ? { 
        transform: 'translateX(0)', 
        position: 'static', 
        width: isOpen ? '18rem' : '0rem', 
        minWidth: isOpen ? '18rem' : '0rem' 
      }
    : {};

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className={`md:hidden fixed top-4 left-4 z-50 p-2 bg-pink-500 text-white rounded-lg ${mobileOpen ? 'hidden' : ''}`}
      >
        <Menu />
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
        className={`fixed inset-y-0 left-0 bg-white dark:bg-slate-800 shadow-lg z-40 transition-all duration-300 flex overflow-hidden ${
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'
        }`}
        style={desktopStyles}
      >
        {/* MAIN SIDEBAR CONTENT */}
        <div className={`flex-1 flex flex-col transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none md:hidden'}`}>
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

          {/* Mobile top bar: theme toggle + portal title + close button */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
            <button
              onClick={toggleTheme}
              className="p-1 text-gray-600 dark:text-gray-400 hover:text-pink-500 transition"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {role === 'superadmin' ? 'Superadmin Portal' :
               role === 'admin' ? 'Admin Portal' :
               role === 'sales' || role === 'sales_staff' ? 'Sales Portal' :
               role === 'commission_staff' || role === 'staff_commission' ? 'Commission Portal' :
               role === 'non_commission_staff' || role === 'staff_non_commission' ? 'Non-Commission Portal' :
               'Portal'}
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 text-gray-600 dark:text-gray-400 hover:text-pink-500 transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="hidden md:flex p-6 border-b border-gray-200 dark:border-slate-700 mt-2 md:mt-0 items-center space-x-3">
            <div className="w-10 h-10 bg-pink-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-pink-200 dark:shadow-none flex-shrink-0">
               A
            </div>
            <div>
              <h1 className="text-xl font-bold text-pink-600 whitespace-nowrap">ABIFRESH</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {role === 'superadmin' ? 'Superadmin Portal' :
                 role === 'admin' ? 'Admin Portal' :
                 role === 'sales' || role === 'sales_staff' ? 'Sales Portal' :
                 role === 'commission_staff' || role === 'staff_commission' ? 'Commission Portal' :
                 role === 'non_commission_staff' || role === 'staff_non_commission' ? 'Non-Commission Portal' :
                 'Portal'}
              </p>
            </div>
          </div>

          <nav 
            ref={navRef}
            onScroll={handleScroll}
            className={`flex-1 mt-2 pt-2 pb-6 px-4 space-y-2 overflow-y-auto min-h-0 scroll-smooth custom-scrollbar ${showScrollbar ? 'show-scroll' : 'hide-scroll'}`}
            style={{
              scrollbarWidth: showScrollbar ? 'thin' : 'none',
              scrollbarColor: showScrollbar ? '#db2777 transparent' : 'transparent transparent'
            }}
          >
            <style jsx>{`
              .custom-scrollbar::-webkit-scrollbar {
                width: 4px;
                display: ${showScrollbar ? 'block' : 'none'};
              }
              .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
              .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: #db2777;
                border-radius: 20px;
                opacity: ${showScrollbar ? 1 : 0};
                transition: opacity 0.3s ease;
              }
              .hide-scroll::-webkit-scrollbar {
                display: none;
              }
              .show-scroll::-webkit-scrollbar {
                display: block;
              }
            `}</style>
            {items.map((item) => {
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
                  {!isNotifications && (item.badge ?? 0) > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {(item.badge ?? 0) > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {creditMenuItems && onToggleCreditMode && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 mt-auto">
              <button
                onClick={onToggleCreditMode}
                className={`flex items-center justify-center w-full px-4 py-3 rounded-lg transition whitespace-nowrap text-sm font-bold ${
                  creditMode
                    ? 'bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 relative">
                  <SwitchCamera className="w-5 h-5" />
                  <div className="relative">
                    <span>{creditMode ? 'Main Menu' : 'Credit System'}</span>
                    
                    {/* Badge for the OTHER system - Superscript style */}
                    {((creditMode ? mainBadge : creditBadge) ?? 0) > 0 && (
                      <span className="absolute -top-2 -right-5 flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full shadow-sm ring-1 ring-white dark:ring-slate-800">
                        {((creditMode ? mainBadge : creditBadge) ?? 0) > 99 ? '99+' : (creditMode ? mainBadge : creditBadge)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>
          )}

        </div>
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
