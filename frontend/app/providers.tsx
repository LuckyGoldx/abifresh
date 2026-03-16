'use client';

import React, { useEffect } from 'react';
import { useThemeStore } from '@/store/auth';
import { NotificationProvider } from '@/context/NotificationContext';
import { ToastProvider } from '@/context/ToastContext';
import ToastContainer from '@/components/ToastContainer';
import SplashScreen from '@/components/SplashScreen';
import PWAPrompt from '@/components/PWAPrompt';

export default function Providers({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    // Also update class for Tailwind dark mode
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Register service worker globally
  useEffect(() => {
    const registerServiceWorker = async () => {
      try {
        if ('serviceWorker' in navigator) {
          console.log('[PWA SW] Attempting to register service worker at /sw.js...');
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          console.log('[PWA SW] ✅ Service worker registered successfully');
          console.log('[PWA SW] Registration details:', {
            scope: registration.scope,
            active: !!registration.active,
            installing: !!registration.installing,
            waiting: !!registration.waiting,
          });
          
          // Listen for controller change
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[PWA SW] ✅ Service worker is now controlling the page');
          });
        } else {
          console.warn('[PWA SW] Service Worker API not supported in this browser');
        }
      } catch (error) {
        console.error('[PWA SW] ❌ Service worker registration failed:', error);
      }
    };

    // Register SW after a small delay to ensure DOM is ready
    setTimeout(registerServiceWorker, 500);
  }, []);

  return (
    <ToastProvider>
      <NotificationProvider>
        <SplashScreen />
        <ToastContainer />
        <PWAPrompt />
        {children}
      </NotificationProvider>
    </ToastProvider>
  );
}
