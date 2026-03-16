'use client';

import Link from 'next/link';
import { Download, X } from 'lucide-react';
import { useState } from 'react';

interface DownloadBannerProps {
  position?: 'top' | 'bottom';
  dismissible?: boolean;
}

export default function DownloadBanner({
  position = 'top',
  dismissible = true,
}: DownloadBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div
      className={`fixed left-0 right-0 z-50 ${
        position === 'top' ? 'top-0' : 'bottom-0'
      }`}
    >
      <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-opacity-90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Download className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0 text-white" />
            <span className="text-white text-sm md:text-base font-medium truncate">
              Install ABIFRESH for the best experience
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/download"
              className="bg-white text-pink-600 hover:bg-slate-100 px-4 py-1.5 rounded-lg font-bold text-sm transition-colors whitespace-nowrap"
            >
              Download
            </Link>
            {dismissible && (
              <button
                onClick={() => setIsDismissed(true)}
                className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
