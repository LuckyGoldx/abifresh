'use client';

import { useThemeStore } from '@/store/auth';

interface LoadingLogoProps {
  text?: string;
  fullScreen?: boolean;
  progress?: number; // 0-100, shows progress bar when provided
}

export default function LoadingLogo({ text, fullScreen = false, progress }: LoadingLogoProps) {
  const theme = useThemeStore((state) => state.theme);
  const isDarkMode = theme === 'dark';

  const containerClass = fullScreen
    ? 'flex items-center justify-center min-h-screen'
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-3">
        <div className="animate-blink">
          <svg
            className="w-36 h-[72px]"
            viewBox="10 28 240 55"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 35h220l-10 12 10 12H20l10-12z"
              fill={isDarkMode ? '#1e293b' : '#fce7f3'}
              stroke="#ec4899"
              strokeWidth="1.5"
            />
            <text
              x="130"
              y="52"
              fontFamily="'Cinzel', serif"
              fontWeight="800"
              fontSize="17"
              fill="#be185d"
              textAnchor="middle"
              letterSpacing="3"
            >
              ABIFRESH
            </text>
            <text
              x="130"
              y="75"
              fontFamily="'Plus Jakarta Sans', sans-serif"
              fontWeight="600"
              fontSize="10"
              fill={isDarkMode ? '#ffffff' : '#fbbf24'}
              textAnchor="middle"
              letterSpacing="3"
            >
              &amp; KIDDIES VENTURES
            </text>
            <circle cx="56" cy="47" r="2" fill="#f472b6" />
            <circle cx="204" cy="47" r="2" fill="#f472b6" />
          </svg>
        </div>
        {progress !== undefined && (
          <div className="w-48 flex flex-col items-center gap-1">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-pink-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-pink-600 dark:text-pink-400">
              {Math.round(progress)}%
            </span>
          </div>
        )}
        {text && (
          <p className="text-sm text-gray-500 dark:text-gray-400 tracking-wide">{text}</p>
        )}
      </div>
    </div>
  );
}
