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
        if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
          console.log('[PWA] Registering service worker from providers...');
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          console.log('[PWA] Service worker registered:', registration);
        } else if ('serviceWorker' in navigator) {
          console.log('[PWA] In development mode, SW registration handled by next-pwa');
        }
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
      }
    };

    registerServiceWorker();
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
