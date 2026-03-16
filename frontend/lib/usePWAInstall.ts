import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  canInstall: boolean;
}

export const usePWAInstall = () => {
  const [state, setState] = useState<PWAInstallState>({
    deferredPrompt: null,
    isInstalled: false,
    canInstall: false,
  });

  const handleBeforeInstallPrompt = useCallback((e: Event) => {
    e.preventDefault();
    setState(prev => ({
      ...prev,
      deferredPrompt: e as BeforeInstallPromptEvent,
      canInstall: true,
    }));
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!state.deferredPrompt) return false;

    try {
      await state.deferredPrompt.prompt();
      const { outcome } = await state.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setState(prev => ({
          ...prev,
          deferredPrompt: null,
          isInstalled: true,
          canInstall: false,
        }));
        return true;
      }
    } catch (error) {
      console.error('PWA install error:', error);
    }
    
    return false;
  }, [state.deferredPrompt]);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
      }));
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
      }));
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [handleBeforeInstallPrompt]);

  return {
    ...state,
    install,
  };
};

export const trackDownload = async (platform?: string): Promise<void> => {
  try {
    await fetch('/api/download/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: platform || 'web',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error('Failed to track download:', error);
  }
};
