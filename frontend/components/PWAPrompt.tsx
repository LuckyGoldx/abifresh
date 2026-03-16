'use client';

import { usePWAInstall, trackDownload } from '@/lib/usePWAInstall';
import { Download, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function PWAPrompt() {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    // Show prompt after 3 seconds if user can install and hasn't dismissed it
    const timer = setTimeout(() => {
      if (canInstall && !isInstalled && !sessionStorage.getItem('pwa-prompt-dismissed')) {
        setIsVisible(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [canInstall, isInstalled]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setIsAtBottom(scrollY > maxScroll * 0.8);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleInstall = async () => {
    await trackDownload('pwa-prompt');
    const success = await install();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!isVisible || isInstalled) return null;

  return (
    <div
      className={`fixed z-40 transition-all duration-300 ${
        isAtBottom ? 'bottom-24' : 'bottom-4'
      } right-4 md:right-8 max-w-sm`}
    >
      <div className="bg-gradient-to-r from-pink-500 to-blue-500 rounded-2xl shadow-2xl p-4 md:p-6 backdrop-blur text-white space-y-4 animate-bounce-in">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg">Get ABIFRESH</h3>
              <p className="text-xs md:text-sm text-white/80">Install app on your device</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleInstall}
            className="w-full bg-white text-pink-600 font-bold py-2 px-4 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Install Now
          </button>
          <button
            onClick={handleDismiss}
            className="w-full text-white/80 hover:text-white font-semibold py-2 px-4 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
