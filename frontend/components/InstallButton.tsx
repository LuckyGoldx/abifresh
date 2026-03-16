'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';

export default function InstallButton() {
  const router = useRouter();
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // Show the button by default
    setShowInstallButton(true);
  }, []);

  const handleDownloadClick = () => {
    router.push('/download');
  };

  if (!showInstallButton) return null;

  return (
    <button
      onClick={handleDownloadClick}
      className="p-2 text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 hover:bg-pink-50 dark:hover:bg-slate-700 rounded transition"
      title="Download ABIFRESH app"
      aria-label="Download app"
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
