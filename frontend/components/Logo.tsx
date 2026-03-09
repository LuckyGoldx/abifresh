'use client';

import { useThemeStore } from '@/store/auth';

/**
 * Logo component used in header
 * Displays the ABIFRESH & KIDDIES VENTURES ribbon logo
 */
export default function Logo() {
  const theme = useThemeStore((state) => state.theme);
  const isDarkMode = theme === 'dark';

  return (
    <svg
      className="w-32 h-16 md:w-40 md:h-20"
      viewBox="10 28 240 55"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ribbon background */}
      <path
        d="M20 35h220l-10 12 10 12H20l10-12z"
        fill={isDarkMode ? '#1e293b' : '#fce7f3'}
        stroke="#ec4899"
        strokeWidth="1.5"
      />

      {/* ABIFRESH text */}
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

      {/* & KIDDIES VENTURES text */}
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

      {/* Decorative circles */}
      <circle cx="56" cy="47" r="2" fill="#f472b6" />
      <circle cx="204" cy="47" r="2" fill="#f472b6" />
    </svg>
  );
}
