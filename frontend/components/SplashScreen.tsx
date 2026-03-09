'use client';

import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Show splash screen for 2.5 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (!showSplash) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100 overflow-hidden">
      {/* Blinking Logo */}
      <div className="animate-pulse mb-8">
        <svg
          className="w-40 h-20"
          viewBox="10 28 240 55"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ribbon background */}
          <path
            d="M20 35h220l-10 12 10 12H20l10-12z"
            fill="#fce7f3"
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
            fill="#ec4899"
            textAnchor="middle"
            letterSpacing="3"
          >
            &amp; KIDDIES VENTURES
          </text>

          {/* Decorative circles */}
          <circle cx="56" cy="47" r="2" fill="#ec4899" />
        </svg>
      </div>

      {/* Loading Text with Animated Dots */}
      <div className="flex flex-col items-center gap-4">
        <p className="text-lg font-semibold text-pink-600 tracking-wider">
          Loading
          <span className="inline-block ml-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink-600 align-middle animate-bounce" style={{ animationDelay: '0s' }}></span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink-600 align-middle animate-bounce ml-1" style={{ animationDelay: '0.2s' }}></span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink-600 align-middle animate-bounce ml-1" style={{ animationDelay: '0.4s' }}></span>
          </span>
        </p>

        {/* Spinner */}
        <div className="w-10 h-10 border-3 border-yellow-400 border-t-pink-600 rounded-full animate-spin"></div>
      </div>
    </div>
  );
}
