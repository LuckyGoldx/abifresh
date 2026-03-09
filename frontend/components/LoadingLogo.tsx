'use client';

import { useThemeStore } from '@/store/auth';

interface LoadingLogoProps {
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingLogo({ text, fullScreen = false }: LoadingLogoProps) {
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
        {text && (
          <p className="text-sm text-gray-500 dark:text-gray-400 tracking-wide">{text}</p>
        )}
      </div>
    </div>
  );
}
