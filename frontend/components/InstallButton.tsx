'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    // Check if in development/localhost mode
    const isDev = typeof window !== 'undefined' && 
                  (window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1');
    setIsDevMode(isDev);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Hide button if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
      return;
    }

    // Show button in dev mode if no deferredPrompt received after delay
    if (isDev) {
      const timer = setTimeout(() => {
        setShowInstallButton(true);
      }, 1000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setIsLoading(true);
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setShowInstallButton(false);
          setDeferredPrompt(null);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Installation prompt error:', error);
        setIsLoading(false);
      }
    } else if (isDevMode) {
      // In dev mode on localhost, show instructions
      alert('📱 Mobile Install Instructions:\n\n' +
            'Since you\'re on localhost, the browser\'s install prompt won\'t work.\n\n' +
            '✅ To test on mobile:\n' +
            '1. Deploy to HTTPS (Vercel, Netlify, etc.)\n' +
            '2. Open on your phone\n' +
            '3. iOS: Tap Share > Add to Home Screen\n' +
            '4. Android: Browser menu > Install app\n\n' +
            '💻 Desktop: The app can be installed directly');
    }
  };

  if (!showInstallButton) return null;

  return (
    <button
      onClick={handleInstallClick}
      disabled={isLoading}
      className="p-2 text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 hover:bg-pink-50 dark:hover:bg-slate-700 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
      title="Install app to home screen"
      aria-label="Install app"
      style={{
        animation: 'blinkingColor 1.5s infinite, bounce 1s infinite',
      }}
    >
      <style>{`
        @keyframes blinkingColor {
          0% { color: #ec4899; }
          12% { color: #3b82f6; }
          24% { color: #fbbf24; }
          36% { color: #10b981; }
          48% { color: #8b5cf6; }
          60% { color: #f97316; }
          72% { color: #0ea5e9; }
          84% { color: #ef4444; }
          100% { color: #ec4899; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
      <Download className="w-6 h-6" />
    </button>
  );
}
