'use client';
import { Download, Smartphone, Zap, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Design10() {
  const currentDesign = 10;
  const prevDesign = currentDesign === 1 ? 10 : currentDesign - 1;
  const nextDesign = currentDesign === 10 ? 1 : currentDesign + 1;

  return (
    <div className="w-full min-h-screen bg-white text-gray-900 overflow-auto flex flex-col">
      {/* Navigation Bar */}
      <div className="border-b border-gray-200 sticky top-0 z-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/download-previews" className="flex items-center gap-3 hover:opacity-80 transition">
            <img src="/favicon.svg" alt="ABIFRESH" className="w-8 h-8" />
            <span className="font-bold text-xl">Design 10/10</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/download-designs/${prevDesign}`} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="text-sm text-gray-600">Clean Flat</span>
            <Link href={`/download-designs/${nextDesign}`} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Design Selector */}
      <nav className="border-b border-gray-200 sticky top-16 z-19 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
            <Link
              key={d}
              href={`/download-designs/${d}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                d === currentDesign
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Design {d}
            </Link>
          ))}
        </div>
      </nav>

      <section className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-20 flex items-center">
        <div className="grid md:grid-cols-2 gap-16 w-full items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
                Download ABIFRESH
              </h1>
              <p className="text-xl text-gray-600">
                Simple. Powerful. Beautiful.
              </p>
            </div>

            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-lg flex items-center justify-center gap-3 transition text-lg">
              <Download className="w-6 h-6" /> Download & Install
            </button>

            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">Download Stats</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { metric: '1.2K', label: 'Downloads' },
                  { metric: '328', label: 'Today' },
                  { metric: '5.6K', label: 'Last Week' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                    <div className="text-2xl font-bold text-blue-600">{s.metric}</div>
                    <div className="text-xs text-gray-600 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 flex items-center justify-center aspect-square border border-blue-200">
            <img src="/favicon.svg" alt="ABIFRESH" className="w-48 h-48" />
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Features</h2>
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {[
              { icon: <Zap />, name: 'Fast' },
              { icon: <Lock />, name: 'Secure' },
              { icon: <Smartphone />, name: 'Mobile' },
              { icon: <Download />, name: 'Easy' },
            ].map((f, i) => (
              <div key={i} className="text-center">
                <div className="text-blue-600 mb-3 text-5xl flex justify-center">{f.icon}</div>
                <p className="font-bold text-gray-900">{f.name}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="max-w-2xl mx-auto flex gap-4">
            <button
              onClick={() => {
                localStorage.setItem('selectedDownloadDesign', '9');
                alert('Design 10 selected! Going to download page...');
                setTimeout(() => (window.location.href = '/download'), 500);
              }}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-lg transition"
            >
              ✓ Use This Design
            </button>
            <Link
              href="/download-previews"
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-4 rounded-lg transition text-center"
            >
              Back to Gallery
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
