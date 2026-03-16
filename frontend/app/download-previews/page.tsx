'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function DownloadPreviews() {
  const designs = [
    {
      id: 1,
      name: 'Modern Gradient',
      description: 'Bold gradients with glassmorphism',
      theme: 'dark',
    },
    {
      id: 2,
      name: 'Classic Minimalist',
      description: 'Clean and professional',
      theme: 'light',
    },
    {
      id: 3,
      name: 'Dark Neon',
      description: 'Modern with neon accents',
      theme: 'dark',
    },
    {
      id: 4,
      name: 'Corporate Professional',
      description: 'Business-focused blue theme',
      theme: 'light',
    },
    {
      id: 5,
      name: 'Playful Colorful',
      description: 'Vibrant and engaging',
      theme: 'light',
    },
    {
      id: 6,
      name: 'Luxury Premium',
      description: 'Elegant with gold accents',
      theme: 'dark',
    },
    {
      id: 7,
      name: 'Tech Forward',
      description: 'Cutting-edge aesthetics',
      theme: 'dark',
    },
    {
      id: 8,
      name: 'Retro Vintage',
      description: 'Nostalgic 80s/90s vibes',
      theme: 'light',
    },
    {
      id: 9,
      name: 'Neumorphism',
      description: 'Soft 3D-like design',
      theme: 'light',
    },
    {
      id: 10,
      name: 'Clean Flat Design',
      description: 'Simple flat colors',
      theme: 'light',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Download Page Designs</h1>
          <p className="text-xl text-gray-600">Choose your favorite design style and preview it</p>
        </div>

        {/* Design Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {designs.map((design) => (
            <Link
              key={design.id}
              href={`/download-designs/${design.id}`}
            >
              <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer h-full hover:scale-105 transform">
                {/* Design Preview Thumbnail */}
                <div
                  className={`h-48 ${
                    design.theme === 'dark'
                      ? 'bg-gradient-to-br from-slate-900 to-slate-800'
                      : 'bg-gradient-to-br from-blue-50 to-white'
                  } flex items-center justify-center relative`}
                >
                  <img
                    src="/favicon.svg"
                    alt={design.name}
                    className="w-20 h-20 opacity-80"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                    <span className="text-white text-sm font-bold bg-blue-600 px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      View Design
                    </span>
                  </div>
                </div>

                {/* Design Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{design.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{design.description}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      design.theme === 'dark'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {design.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                    </span>
                    <span className="text-blue-600 font-semibold text-sm group-hover:translate-x-2 transition-transform">
                      →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Features */}
        <div className="mt-20 bg-white rounded-2xl shadow-lg p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Features of Each Design</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-3">📱</div>
              <h3 className="font-bold text-gray-900 mb-2">Mobile Friendly</h3>
              <p className="text-gray-600 text-sm">Fully responsive on all devices</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="font-bold text-gray-900 mb-2">Lightning Fast</h3>
              <p className="text-gray-600 text-sm">Optimized performance</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🎨</div>
              <h3 className="font-bold text-gray-900 mb-2">Beautiful Design</h3>
              <p className="text-gray-600 text-sm">Modern & elegant layouts</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">✨</div>
              <h3 className="font-bold text-gray-900 mb-2">Easy to Use</h3>
              <p className="text-gray-600 text-sm">One-click selection</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-blue-50 border-2 border-blue-200 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">How to Use</h3>
          <ol className="space-y-3 text-gray-700">
            <li className="flex gap-4">
              <span className="font-bold text-blue-600 flex-shrink-0">1.</span>
              <span>Click on any design card above to preview it in full screen</span>
            </li>
            <li className="flex gap-4">
              <span className="font-bold text-blue-600 flex-shrink-0">2.</span>
              <span>Use navigation arrows or click cards to browse between designs</span>
            </li>
            <li className="flex gap-4">
              <span className="font-bold text-blue-600 flex-shrink-0">3.</span>
              <span>Click "Use This Design" button to make it your download page</span>
            </li>
            <li className="flex gap-4">
              <span className="font-bold text-blue-600 flex-shrink-0">4.</span>
              <span>Your selected design will be saved and applied immediately</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
