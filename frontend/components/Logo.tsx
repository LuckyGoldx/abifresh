'use client';

import { useThemeStore } from '@/store/auth';
import { useEffect, useState } from 'react';

/**
 * Logo component used in header and sidebar
 * Displays the ABIFRESH & KIDDIES VENTURES ribbon logo
 */
interface LogoProps {
  context?: 'header' | 'sidebar';
}

export default function Logo({ context = 'sidebar' }: LogoProps) {
  const theme = useThemeStore((state) => state.theme);
  const isDarkMode = theme === 'dark';
  const [isDesktop, setIsDesktop] = useState(false);
  
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768); // md breakpoint
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  
  // In desktop view, use pink for & KIDDIES VENTURES in light mode
  const subtextColor = isDesktop && !isDarkMode ? '#ec4899' : (isDarkMode ? '#ffffff' : '#fbbf24');

  return (
    <svg
      className="w-40 h-20 sm:w-48 sm:h-24 md:w-56 md:h-28 lg:w-64 lg:h-32"
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
        fill={subtextColor}
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
