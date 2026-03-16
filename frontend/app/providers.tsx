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
